import { SpotifyAuthError } from '../auth/authService';
import type { DeviceInfo, TrackIdentity } from '../domain/types';
import { readJson, writeJson } from '../lib/storage';
import { parseSpotifyUri } from '../lib/spotifyUri';
import type { SpotifyClient } from '../spotify/client';
import * as api from '../spotify/endpoints';
import { isSpotifyApiError } from '../spotify/errors';
import { mapDevice, mapTrackIdentity } from '../spotify/mappers';
import type { PlaybackEngine } from './engine';
import { monotonicNow, positionAt, remainingAt } from './playbackClock';
import type { PlayerAction } from './playerReducer';
import type { PlayerStore } from './playerStore';
import {
  createWebPlaybackAdapter,
  isPlaybackSupported,
  type WebPlaybackCallbacks,
  type WebPlaybackDevice,
  type WebPlaybackFactory,
} from './spotifyPlaybackSdk';
import { BROWSER_DEVICE_NAME, browserDevice, mapRemotePlayback, mapSdkState } from './stateMapping';
import type { PlayerSnapshot, PlayRequest, PlaybackIssue, QueueSnapshot, SdkErrorReason } from './types';

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface VisibilitySource {
  isVisible(): boolean;
  subscribe(listener: () => void): () => void;
}

const browserTimers: Timers = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
};

const documentVisibility: VisibilitySource = {
  isVisible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  subscribe: (listener) => {
    if (typeof document === 'undefined') return () => undefined;
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  },
};

/** Polling cadence. Remote devices emit no events, so their state must be read. */
export const POLL_INTERVALS = {
  /** A remote device is playing. */
  remotePlaying: 5_000,
  /** Nothing is playing / paused / no device. */
  idle: 10_000,
  /** This browser is the active device: SDK events drive state; poll only as a safety net. */
  sdkActive: 30_000,
  /** Re-reads after a Web API command (Spotify does not guarantee ordering). */
  afterCommand: [700, 2_000] as const,
};

const REANCHOR_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 5;
const VOLUME_KEY = 'arc.player.volume.v1';

export interface SpotifyEngineOptions {
  store: PlayerStore;
  client: SpotifyClient;
  getAccessToken(): Promise<string>;
  refreshAccessToken(): Promise<string | null>;
  createDevice?: WebPlaybackFactory;
  isPlaybackSupported?: () => boolean;
  now?: () => number;
  timers?: Timers;
  visibility?: VisibilitySource;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Drives real Spotify playback. When this browser is the active device the
 * Web Playback SDK is used for transport commands and its events are the
 * source of truth; otherwise commands go through the Web API and state is
 * read from GET /me/player. It never advances playback on its own.
 */
export class SpotifyPlaybackEngine implements PlaybackEngine {
  readonly kind = 'spotify' as const;

  private readonly store: PlayerStore;
  private readonly client: SpotifyClient;
  private readonly createDevice: WebPlaybackFactory;
  private readonly supported: () => boolean;
  private readonly now: () => number;
  private readonly timers: Timers;
  private readonly visibility: VisibilitySource;

  private device: WebPlaybackDevice | null = null;
  private deviceId: string | null = null;
  private volume: number;
  private running = false;
  private generation = 0;
  private pollTimer: unknown = null;
  private reanchorTimer: unknown = null;
  private reconnectTimer: unknown = null;
  private followUpTimers: unknown[] = [];
  private reconnectAttempts = 0;
  private authRetried = false;
  private rateLimitedUntil = 0;
  private syncInFlight: Promise<void> | null = null;
  private unsubscribeVisibility: (() => void) | null = null;

  constructor(private readonly options: SpotifyEngineOptions) {
    this.store = options.store;
    this.client = options.client;
    this.createDevice = options.createDevice ?? createWebPlaybackAdapter;
    this.supported = options.isPlaybackSupported ?? isPlaybackSupported;
    this.now = options.now ?? monotonicNow;
    this.timers = options.timers ?? browserTimers;
    this.visibility = options.visibility ?? documentVisibility;
    const storedVolume = readJson<number>(VOLUME_KEY);
    this.volume = typeof storedVolume === 'number' ? clamp01(storedVolume) : 0.6;
  }

  /* ── Lifecycle ───────────────────────────────────────────────────────── */

  start(): void {
    if (this.running) return;
    this.running = true;
    this.generation += 1;
    this.unsubscribeVisibility = this.visibility.subscribe(() => this.onVisibilityChange());
    void this.connectDevice();
    void this.resync();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.generation += 1;
    this.clearTimer('pollTimer');
    this.clearTimer('reanchorTimer');
    this.clearTimer('reconnectTimer');
    for (const timer of this.followUpTimers) this.timers.clearTimeout(timer);
    this.followUpTimers = [];
    this.unsubscribeVisibility?.();
    this.unsubscribeVisibility = null;
    this.device?.disconnect();
    this.device = null;
    this.deviceId = null;
  }

  /* ── Web Playback SDK ────────────────────────────────────────────────── */

  private async connectDevice(): Promise<void> {
    const generation = this.generation;
    if (!this.supported()) {
      this.setSdkError(
        'unsupported',
        'This browser cannot play Spotify audio (Encrypted Media Extensions are unavailable). Use another Spotify device.',
      );
      return;
    }
    this.dispatch({ type: 'sdk/status', status: { kind: 'loading' } });
    const device = this.createDevice({
      name: BROWSER_DEVICE_NAME,
      initialVolume: this.volume,
      getOAuthToken: () => this.options.getAccessToken(),
      callbacks: this.sdkCallbacks(generation),
    });
    this.device = device;
    try {
      const connected = await device.connect();
      if (generation !== this.generation) return;
      if (!connected) this.setSdkError('initialization', 'Spotify did not accept the browser player connection.');
    } catch (error) {
      if (generation !== this.generation) return;
      this.setSdkError('load', error instanceof Error ? error.message : 'Could not load the Spotify Web Playback SDK.');
    }
  }

  private sdkCallbacks(generation: number): WebPlaybackCallbacks {
    const live = () => this.running && generation === this.generation;
    return {
      onReady: (deviceId) => {
        if (!live()) return;
        this.deviceId = deviceId;
        this.reconnectAttempts = 0;
        this.authRetried = false;
        this.dispatch({ type: 'sdk/status', status: { kind: 'ready', deviceId } });
        void this.resync();
      },
      onNotReady: (deviceId) => {
        if (!live()) return;
        this.dispatch({
          type: 'sdk/status',
          status: { kind: 'reconnecting', deviceId, attempt: this.reconnectAttempts + 1 },
        });
        this.scheduleReconnect();
      },
      onState: (state) => {
        if (live()) this.handleSdkState(state);
      },
      onError: (reason, message) => {
        if (live()) void this.handleSdkError(reason, message);
      },
      onAutoplayFailed: () => {
        if (!live()) return;
        this.setIssue('autoplay-blocked', 'Your browser blocked audio from starting automatically. Press play to start.');
      },
    };
  }

  private handleSdkState(state: Spotify.PlaybackState | null): void {
    if (!state) {
      // Playback was transferred to another device (or stopped).
      this.dispatch({ type: 'sdk/inactive', now: this.now() });
      this.clearTimer('reanchorTimer');
      void this.resync();
      return;
    }
    if (!this.deviceId) return;
    this.dispatch({ type: 'sdk/state', snapshot: mapSdkState(state, this.deviceId, this.volume, this.now()) });
    if (state.paused) this.clearTimer('reanchorTimer');
    else this.scheduleReanchor();
    this.schedulePoll();
  }

  /** Re-anchors the interpolated position against the SDK's own reading while playing. */
  private scheduleReanchor(): void {
    if (this.reanchorTimer !== null) return;
    this.reanchorTimer = this.timers.setTimeout(() => {
      this.reanchorTimer = null;
      const device = this.device;
      const deviceId = this.deviceId;
      if (!device || !deviceId || !this.running) return;
      void device
        .getCurrentState()
        .catch(() => null)
        .then((state) => {
          if (!this.running || !state || this.store.getState().snapshot.source !== 'sdk') return;
          this.dispatch({ type: 'sdk/state', snapshot: mapSdkState(state, deviceId, this.volume, this.now()) });
          if (!state.paused) this.scheduleReanchor();
        });
    }, REANCHOR_MS);
  }

  private async handleSdkError(reason: SdkErrorReason, message: string): Promise<void> {
    if (reason === 'authentication' && !this.authRetried) {
      this.authRetried = true;
      const token = await this.options.refreshAccessToken();
      if (token && this.running) {
        this.reconnectNow();
        return;
      }
    }
    if (reason === 'playback') {
      this.setIssue('command-failed', `Spotify could not play this item: ${message}`);
      return;
    }
    const friendly: Partial<Record<SdkErrorReason, string>> = {
      account: 'Browser playback requires Spotify Premium.',
      authentication: 'Spotify rejected the browser player’s credentials. Reconnect Spotify.',
      initialization: 'This browser could not start Spotify playback. Use another Spotify device.',
    };
    this.setSdkError(reason, friendly[reason] ?? message);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setSdkError('initialization', 'Lost the connection to Spotify’s browser player.');
      return;
    }
    const delay = Math.min(30_000, 2_000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = this.timers.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.running) this.reconnectNow();
    }, delay);
  }

  private reconnectNow(): void {
    this.device?.disconnect();
    this.device = null;
    this.deviceId = null;
    this.generation += 1;
    void this.connectDevice();
  }

  /* ── Web API state ───────────────────────────────────────────────────── */

  resync(): Promise<void> {
    if (this.syncInFlight) return this.syncInFlight;
    const run = async (): Promise<void> => {
      const requestedAt = this.now();
      try {
        const state = await api.getPlaybackState(this.client);
        if (!this.running) return;
        this.dispatch({
          type: 'remote/state',
          snapshot: state ? mapRemotePlayback(state, this.deviceId, this.now()) : null,
          requestedAt,
        });
      } catch (error) {
        if (!this.running) return;
        this.reportError(error);
        this.dispatch({ type: 'hydrated' });
      } finally {
        this.syncInFlight = null;
        this.schedulePoll();
      }
    };
    this.syncInFlight = run();
    return this.syncInFlight;
  }

  private schedulePoll(): void {
    this.clearTimer('pollTimer');
    if (!this.running || !this.visibility.isVisible()) return;
    const { snapshot, sdk } = this.store.getState();
    const now = this.now();
    let delay: number;
    if (snapshot.source === 'sdk' && sdk.kind === 'ready') {
      delay = POLL_INTERVALS.sdkActive;
    } else if (snapshot.track && !snapshot.paused) {
      // Read again just after the track should end so the next track appears promptly.
      delay = Math.min(POLL_INTERVALS.remotePlaying, remainingAt(snapshot, now) + 600);
    } else {
      delay = POLL_INTERVALS.idle;
    }
    delay = Math.max(delay, this.rateLimitedUntil - now, 250);
    this.pollTimer = this.timers.setTimeout(() => {
      this.pollTimer = null;
      void this.resync();
    }, delay);
  }

  private onVisibilityChange(): void {
    if (!this.running) return;
    if (this.visibility.isVisible()) {
      void this.resync();
      if (this.store.getState().snapshot.source === 'sdk') this.scheduleReanchor();
    } else {
      this.clearTimer('pollTimer');
    }
  }

  /* ── Commands ────────────────────────────────────────────────────────── */

  activateAudio(): void {
    void this.device?.activateElement().catch(() => undefined);
  }

  private sdkIsActive(): boolean {
    const { snapshot, sdk } = this.store.getState();
    return snapshot.source === 'sdk' && sdk.kind === 'ready' && this.device !== null;
  }

  private positionPatch(paused: boolean): Partial<PlayerSnapshot> {
    const { snapshot } = this.store.getState();
    const now = this.now();
    return { paused, positionMs: positionAt(snapshot, now), sampledAt: now };
  }

  async play(request: PlayRequest): Promise<void> {
    const { snapshot, sdk } = this.store.getState();
    const remoteActive = snapshot.source === 'remote' && snapshot.device?.isActive && !snapshot.device.isRestricted;
    let deviceId: string | undefined;

    if (!remoteActive) {
      if (sdk.kind === 'ready') {
        deviceId = sdk.deviceId;
      } else {
        // Spotify needs a target when no device is active: use any controllable device.
        const devices = await api.getDevices(this.client).catch(() => []);
        const candidate = devices.find((d) => d.id && !d.is_restricted);
        if (!candidate?.id) {
          this.setIssue(
            'no-active-device',
            'No Spotify device is available. Open Spotify on a phone or computer, or enable browser playback.',
          );
          return;
        }
        deviceId = candidate.id;
      }
    }

    const contextType = parseSpotifyUri(request.contextUri)?.type;
    const offsetAllowed = contextType === 'album' || contextType === 'playlist';
    await this.command(
      undefined,
      () =>
        api.startPlayback(this.client, {
          deviceId,
          contextUri: request.contextUri,
          uris: request.contextUri ? undefined : request.uris,
          offset: offsetAllowed && request.offsetUri ? { uri: request.offsetUri } : undefined,
          positionMs: request.positionMs,
        }),
      true,
    );
  }

  togglePlay(): Promise<void> {
    return this.store.getState().snapshot.paused ? this.resume() : this.pause();
  }

  async pause(): Promise<void> {
    if (this.sdkIsActive()) return this.command(this.positionPatch(true), () => this.device!.pause(), false);
    return this.command(this.positionPatch(true), () => api.pausePlayback(this.client), true);
  }

  async resume(): Promise<void> {
    const { snapshot, sdk } = this.store.getState();
    if (this.sdkIsActive()) return this.command(this.positionPatch(false), () => this.device!.resume(), false);
    if (snapshot.source === 'remote' && snapshot.device?.isActive) {
      return this.command(this.positionPatch(false), () => api.startPlayback(this.client, {}), true);
    }
    if (sdk.kind === 'ready') return this.transferToBrowser(true);
    this.setIssue('no-active-device', 'No Spotify device is active. Choose a device to resume playback.');
  }

  async next(): Promise<void> {
    if (this.sdkIsActive()) return this.command(undefined, () => this.device!.nextTrack(), false);
    return this.command(undefined, () => api.skipToNext(this.client), true);
  }

  async previous(): Promise<void> {
    if (this.sdkIsActive()) return this.command(undefined, () => this.device!.previousTrack(), false);
    return this.command(undefined, () => api.skipToPrevious(this.client), true);
  }

  async seek(positionMs: number): Promise<void> {
    const { snapshot } = this.store.getState();
    const target = Math.max(0, Math.min(positionMs, snapshot.durationMs || positionMs));
    const patch: Partial<PlayerSnapshot> = { positionMs: target, sampledAt: this.now() };
    if (this.sdkIsActive()) return this.command(patch, () => this.device!.seek(target), false);
    return this.command(patch, () => api.seekTo(this.client, target), true);
  }

  async setVolume(volume: number): Promise<void> {
    const value = clamp01(volume);
    const { snapshot } = this.store.getState();
    if (this.sdkIsActive()) {
      this.volume = value;
      writeJson(VOLUME_KEY, value);
      return this.command({ volume: value }, () => this.device!.setVolume(value), false);
    }
    if (snapshot.device && !snapshot.device.supportsVolume) {
      this.setIssue('restricted', `${snapshot.device.name} does not allow remote volume control.`);
      return;
    }
    return this.command({ volume: value }, () => api.setVolume(this.client, value * 100), true);
  }

  async setShuffle(shuffle: boolean): Promise<void> {
    // The Web Playback SDK has no shuffle command; the Web API reaches the active device, this browser included.
    return this.command({ shuffle }, () => api.setShuffle(this.client, shuffle), true);
  }

  async transferToBrowser(play = true): Promise<void> {
    const { sdk } = this.store.getState();
    if (sdk.kind !== 'ready') {
      this.setIssue('no-active-device', 'Browser playback is not ready yet.');
      return;
    }
    await this.command(undefined, () => api.transferPlayback(this.client, sdk.deviceId, play), true);
  }

  async transferTo(deviceId: string, play = true): Promise<void> {
    if (deviceId === this.deviceId) return this.transferToBrowser(play);
    await this.command(undefined, () => api.transferPlayback(this.client, deviceId, play), true);
  }

  async getDevices(): Promise<DeviceInfo[]> {
    const devices = (await api.getDevices(this.client)).map((d) => mapDevice(d, this.deviceId));
    if (this.deviceId && !devices.some((d) => d.isThisBrowser)) {
      devices.unshift({ ...browserDevice(this.deviceId, this.volume), isActive: false });
    }
    return devices;
  }

  async getQueue(): Promise<QueueSnapshot> {
    const queue = await api.getQueue(this.client);
    return {
      currentlyPlaying: mapTrackIdentity(queue.currently_playing),
      upNext: queue.queue.map(mapTrackIdentity).filter((t): t is TrackIdentity => t !== null),
    };
  }

  /**
   * Applies an optimistic patch, runs the command and schedules follow-up
   * reads. On failure the issue is reported and the real state re-read, so the
   * UI never claims a change Spotify did not make.
   */
  private async command(
    patch: Partial<PlayerSnapshot> | undefined,
    action: () => Promise<void>,
    followUp: boolean,
  ): Promise<void> {
    this.dispatch({ type: 'command/issued', at: this.now(), patch });
    this.dispatch({ type: 'issue/clear', kinds: ['command-failed', 'restricted', 'autoplay-blocked', 'no-active-device'] });
    try {
      await action();
    } catch (error) {
      this.reportError(error);
      void this.resync();
      return;
    }
    if (followUp) this.scheduleFollowUps();
  }

  private scheduleFollowUps(): void {
    for (const timer of this.followUpTimers) this.timers.clearTimeout(timer);
    this.followUpTimers = POLL_INTERVALS.afterCommand.map((delay) =>
      this.timers.setTimeout(() => {
        if (this.running) void this.resync();
      }, delay),
    );
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  private reportError(error: unknown): void {
    if (error instanceof SpotifyAuthError) {
      this.setIssue('unauthorized', 'Spotify authorization expired. Reconnect to continue.');
      return;
    }
    if (!isSpotifyApiError(error)) {
      this.setIssue('command-failed', 'The playback command could not be completed.');
      return;
    }
    switch (error.kind) {
      case 'no-active-device':
        this.setIssue('no-active-device', 'No Spotify device is active. Choose a device or play in this browser.');
        break;
      case 'premium-required':
        this.setIssue('premium-required', 'Spotify Premium is required to control playback.');
        break;
      case 'forbidden':
        this.setIssue('restricted', error.message || 'Spotify did not allow this action right now.');
        break;
      case 'rate-limited':
        this.rateLimitedUntil = this.now() + (error.retryAfterMs ?? 10_000);
        this.setIssue('rate-limited', 'Spotify is rate limiting requests. Playback state will refresh shortly.', {
          retryAfterMs: error.retryAfterMs,
        });
        break;
      case 'unauthorized':
        this.setIssue('unauthorized', 'Spotify authorization expired. Reconnect to continue.');
        break;
      case 'network':
        this.setIssue('network', 'Spotify is unreachable. Retrying…');
        break;
      default:
        this.setIssue('command-failed', error.message || 'The playback command could not be completed.');
    }
  }

  private setIssue(kind: PlaybackIssue['kind'], message: string, extra: { retryAfterMs?: number } = {}): void {
    this.dispatch({ type: 'issue/set', issue: { kind, message, at: this.now(), ...extra } });
  }

  private setSdkError(reason: SdkErrorReason, message: string): void {
    this.dispatch({ type: 'sdk/status', status: { kind: 'error', reason, message } });
  }

  private clearTimer(key: 'pollTimer' | 'reanchorTimer' | 'reconnectTimer'): void {
    if (this[key] !== null) {
      this.timers.clearTimeout(this[key]);
      this[key] = null;
    }
  }

  private dispatch(action: PlayerAction): void {
    this.store.dispatch(action);
  }
}
