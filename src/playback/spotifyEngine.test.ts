import { describe, expect, it, vi } from 'vitest';
import { SpotifyClient } from '../spotify/client';
import type { SpotifyPlaybackState, SpotifyTrack } from '../spotify/types';
import { PlayerStore } from './playerStore';
import { SKIP_LOOP, SpotifyPlaybackEngine, type Timers } from './spotifyEngine';
import type { WebPlaybackDevice, WebPlaybackOptions } from './spotifyPlaybackSdk';

const track: SpotifyTrack = {
  id: 'trk1',
  name: 'EARFQUAKE',
  uri: 'spotify:track:trk1',
  type: 'track',
  duration_ms: 190_000,
  track_number: 2,
  disc_number: 1,
  explicit: true,
  artists: [{ id: 'art1', name: 'Tyler, The Creator', uri: 'spotify:artist:art1', type: 'artist' }],
  album: {
    id: 'alb1',
    name: 'IGOR',
    uri: 'spotify:album:alb1',
    type: 'album',
    album_type: 'album',
    total_tracks: 12,
    images: [],
    release_date: '2019-05-17',
    release_date_precision: 'day',
    artists: [],
  },
};

function remoteState(patch: Partial<SpotifyPlaybackState> = {}): SpotifyPlaybackState {
  return {
    device: { id: 'phone', is_active: true, is_private_session: false, is_restricted: false, name: 'Pixel', type: 'Smartphone', volume_percent: 50 },
    repeat_state: 'off',
    shuffle_state: false,
    context: { type: 'album', uri: 'spotify:album:alb1' },
    timestamp: 0,
    progress_ms: 10_000,
    is_playing: true,
    item: track,
    currently_playing_type: 'track',
    ...patch,
  };
}

function sdkState(paused = false): Spotify.PlaybackState {
  const sdkTrack = {
    id: 'trk1',
    uri: 'spotify:track:trk1',
    name: 'EARFQUAKE',
    type: 'track',
    media_type: 'audio',
    track_type: 'audio',
    uid: 'u',
    is_playable: true,
    duration_ms: 190_000,
    artists: [{ name: 'Tyler, The Creator', uri: 'spotify:artist:art1', url: '' }],
    album: { name: 'IGOR', uri: 'spotify:album:alb1', images: [] },
    linked_from: { uri: null, id: null },
  } as Spotify.Track;
  return {
    context: { uri: 'spotify:album:alb1', metadata: null },
    disallows: {},
    duration: 190_000,
    paused,
    position: 42_000,
    loading: false,
    timestamp: 0,
    repeat_mode: 0,
    shuffle: false,
    restrictions: {},
    track_window: { current_track: sdkTrack, previous_tracks: [], next_tracks: [] },
    playback_id: 'p',
    playback_quality: 'HIGH',
    playback_features: { hifi_status: 'NONE' },
  } as Spotify.PlaybackState;
}

/** The SDK state for another track of the queue, at `position`. */
function sdkTrackState(id: string, position = 0, paused = false): Spotify.PlaybackState {
  const state = sdkState(paused);
  const current = { ...state.track_window.current_track, id, uri: `spotify:track:${id}` };
  return { ...state, position, track_window: { ...state.track_window, current_track: current } };
}

type Route = (method: string, path: string) => Response;

function harness(options: { route?: Route; supported?: boolean; protectedAudio?: boolean } = {}) {
  const store = new PlayerStore();
  const requests: Array<{ method: string; path: string; query: URLSearchParams; body: unknown }> = [];
  const route: Route =
    options.route ??
    ((method, path) =>
      method === 'GET' && path === '/me/player'
        ? new Response(JSON.stringify(remoteState()), { status: 200 })
        : new Response(null, { status: 204 }));
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/v1', '');
    requests.push({ method: init?.method ?? 'GET', path, query: url.searchParams, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return route(init?.method ?? 'GET', path);
  });
  const client = new SpotifyClient(
    { getAccessToken: async () => 'token', refreshAfterUnauthorized: async () => 'token' },
    { fetch: fetchMock },
  );

  let now = 1_000;
  let timerId = 0;
  const timers = new Map<number, () => void>();
  const fakeTimers: Timers = {
    setTimeout: (fn) => {
      timerId += 1;
      timers.set(timerId, fn);
      return timerId;
    },
    clearTimeout: (id) => {
      timers.delete(id as number);
    },
  };

  const created: WebPlaybackOptions[] = [];
  const device: WebPlaybackDevice = {
    connect: vi.fn(async () => true),
    disconnect: vi.fn(),
    getCurrentState: vi.fn(async () => null),
    togglePlay: vi.fn(async () => undefined),
    pause: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    nextTrack: vi.fn(async () => undefined),
    previousTrack: vi.fn(async () => undefined),
    seek: vi.fn(async () => undefined),
    setVolume: vi.fn(async () => undefined),
    activateElement: vi.fn(async () => undefined),
  };
  const refreshAccessToken = vi.fn(async () => 'token-2');

  const engine = new SpotifyPlaybackEngine({
    store,
    client,
    getAccessToken: async () => 'token',
    refreshAccessToken,
    createDevice: (opts) => {
      created.push(opts);
      return device;
    },
    isPlaybackSupported: () => options.supported ?? true,
    probeProtectedAudio: async () => options.protectedAudio ?? true,
    now: () => now,
    timers: fakeTimers,
    visibility: { isVisible: () => true, subscribe: () => () => undefined },
  });

  return {
    store,
    engine,
    device,
    requests,
    created,
    refreshAccessToken,
    callbacks: () => created[created.length - 1]!.callbacks,
    advance: (ms: number) => (now += ms),
    /** Runs every timer pending right now (polls, re-anchors, the skip-loop check). */
    runTimers: () => {
      const pending = [...timers.values()];
      timers.clear();
      for (const fn of pending) fn();
    },
    flush: () => new Promise((resolve) => setTimeout(resolve, 0)),
  };
}

describe('SpotifyPlaybackEngine', () => {
  it('connects the SDK device and hydrates from GET /me/player', async () => {
    const h = harness();
    h.engine.start();
    await h.flush();
    expect(h.created).toHaveLength(1);
    expect(h.device.connect).toHaveBeenCalled();
    const state = h.store.getState();
    expect(state.hydrated).toBe(true);
    expect(state.snapshot).toMatchObject({ source: 'remote', positionMs: 10_000, paused: false });
    expect(state.snapshot.device?.name).toBe('Pixel');
    h.engine.stop();
  });

  it('sends remote commands through the Web API with an optimistic update', async () => {
    const h = harness();
    h.engine.start();
    await h.flush();
    await h.engine.pause();
    expect(h.requests.some((r) => r.method === 'PUT' && r.path === '/me/player/pause')).toBe(true);
    expect(h.store.getState().snapshot.paused).toBe(true);
    h.engine.stop();
  });

  it('toggles shuffle through the Web API with an optimistic update', async () => {
    const h = harness();
    h.engine.start();
    await h.flush();
    expect(h.store.getState().snapshot.shuffle).toBe(false);
    await h.engine.setShuffle(true);
    const request = h.requests.find((r) => r.method === 'PUT' && r.path === '/me/player/shuffle');
    expect(request?.query.get('state')).toBe('true');
    expect(h.store.getState().snapshot.shuffle).toBe(true);
    h.engine.stop();
  });

  it('reads the shuffle state from SDK events', async () => {
    const h = harness();
    h.engine.start();
    await h.flush();
    h.callbacks().onReady('web-device');
    h.callbacks().onState({ ...sdkState(), shuffle: true });
    expect(h.store.getState().snapshot).toMatchObject({ source: 'sdk', shuffle: true });
    h.engine.stop();
  });

  it('uses SDK events as the source of truth once this browser is active', async () => {
    const h = harness();
    h.engine.start();
    await h.flush();
    h.callbacks().onReady('web-device');
    h.callbacks().onState(sdkState());
    expect(h.store.getState().snapshot).toMatchObject({ source: 'sdk', positionMs: 42_000 });
    h.requests.length = 0;
    await h.engine.pause();
    expect(h.device.pause).toHaveBeenCalled();
    expect(h.requests.filter((r) => r.method !== 'GET')).toHaveLength(0);

    // Playback transferred elsewhere: SDK reports null, the engine re-reads remote state.
    h.callbacks().onState(null);
    await h.flush();
    expect(h.requests.some((r) => r.method === 'GET' && r.path === '/me/player')).toBe(true);
    h.engine.stop();
  });

  it('starts playback on this browser when no device is active', async () => {
    const h = harness({
      route: (method, path) => (method === 'GET' && path === '/me/player' ? new Response(null, { status: 204 }) : new Response(null, { status: 204 })),
    });
    h.engine.start();
    await h.flush();
    h.callbacks().onReady('web-device');
    await h.engine.play({ contextUri: 'spotify:album:alb1', offsetUri: 'spotify:track:trk1' });
    const play = h.requests.find((r) => r.method === 'PUT' && r.path === '/me/player/play');
    expect(play?.query.get('device_id')).toBe('web-device');
    expect(play?.body).toEqual({ context_uri: 'spotify:album:alb1', offset: { uri: 'spotify:track:trk1' } });
    h.engine.stop();
  });

  it('reports a designed no-device issue instead of failing silently', async () => {
    const h = harness({
      supported: false,
      route: (_method, path) => {
        if (path === '/me/player/devices') return new Response(JSON.stringify({ devices: [] }), { status: 200 });
        return new Response(null, { status: 204 });
      },
    });
    h.engine.start();
    await h.flush();
    expect(h.store.getState().sdk).toMatchObject({ kind: 'error', reason: 'unsupported' });
    await h.engine.play({ contextUri: 'spotify:album:alb1' });
    expect(h.store.getState().issue?.kind).toBe('no-active-device');
    expect(h.requests.some((r) => r.path === '/me/player/play')).toBe(false);
    h.engine.stop();
  });

  it('turns a failed command into an issue and re-reads the real state', async () => {
    // The phone disconnects: the command fails with 404 and the next read is a 204.
    let deviceGone = false;
    const h = harness({
      route: (method, path) => {
        if (method === 'GET' && path === '/me/player') {
          return deviceGone ? new Response(null, { status: 204 }) : new Response(JSON.stringify(remoteState()), { status: 200 });
        }
        if (path === '/me/player/next') {
          deviceGone = true;
          return new Response(JSON.stringify({ error: { status: 404, message: 'No active device found' } }), { status: 404 });
        }
        return new Response(null, { status: 204 });
      },
    });
    h.engine.start();
    await h.flush();
    const reads = h.requests.filter((r) => r.path === '/me/player').length;
    await h.engine.next();
    await h.flush();
    expect(h.requests.filter((r) => r.path === '/me/player').length).toBeGreaterThan(reads);
    const state = h.store.getState();
    expect(state.issue?.kind).toBe('no-active-device');
    expect(state.snapshot.source).toBe('none');
    h.engine.stop();
  });

  it('refreshes the token and reconnects once after an SDK authentication error', async () => {
    const h = harness();
    h.engine.start();
    await h.flush();
    h.callbacks().onError('authentication', 'Invalid token scopes.');
    await h.flush();
    expect(h.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(h.created).toHaveLength(2);
    h.engine.stop();
  });

  it('shows a Premium requirement for SDK account errors', async () => {
    const h = harness();
    h.engine.start();
    await h.flush();
    h.callbacks().onError('account', 'This functionality is restricted to premium users only');
    await h.flush();
    expect(h.store.getState().sdk).toMatchObject({ kind: 'error', reason: 'account' });
    h.engine.stop();
  });

  describe('runaway skipping', () => {
    // Nothing plays anywhere else: the browser is the only device.
    const onlyThisBrowser: Route = () => new Response(null, { status: 204 });

    async function playingHere(options: { protectedAudio?: boolean } = {}) {
      const h = harness({ route: onlyThisBrowser, ...options });
      h.engine.start();
      await h.flush();
      h.callbacks().onReady('web-device');
      h.callbacks().onState(sdkTrackState('t0'));
      return h;
    }

    /** The SDK moves on from `count` tracks, a second apart, without playing them. */
    function skipUnplayed(h: Awaited<ReturnType<typeof playingHere>>, count: number) {
      for (let i = 1; i <= count; i += 1) {
        h.advance(1_000);
        h.callbacks().onState(sdkTrackState(`t${i}`));
      }
    }

    async function settle(h: Awaited<ReturnType<typeof playingHere>>) {
      for (let i = 0; i < 5; i += 1) await h.flush();
    }

    it('stops the SDK running through the queue in silence and explains why', async () => {
      const h = await playingHere({ protectedAudio: false });
      let call = 0;
      vi.mocked(h.device.getCurrentState).mockImplementation(async () => sdkTrackState(`t${10 + call++}`));
      skipUnplayed(h, SKIP_LOOP.unplayedTracks);
      h.runTimers();
      await settle(h);
      expect(h.device.pause).toHaveBeenCalled();
      const issue = h.store.getState().issue;
      expect(issue?.kind).toBe('playback-failed');
      expect(issue?.message).toMatch(/protected \(DRM\) audio/);
      expect(issue?.hints?.length).toBeGreaterThan(0);
      expect(h.store.getState().snapshot.paused).toBe(true);
      h.engine.stop();
    });

    it('leaves playback alone when the listener skipped on purpose and the next track plays', async () => {
      const h = await playingHere();
      let position = 0;
      vi.mocked(h.device.getCurrentState).mockImplementation(async () => sdkTrackState('t3', (position += 2_000)));
      skipUnplayed(h, SKIP_LOOP.unplayedTracks);
      h.runTimers();
      await settle(h);
      expect(h.device.pause).not.toHaveBeenCalled();
      expect(h.store.getState().issue).toBeNull();
      h.engine.stop();
    });

    it('does not count skips made with the app’s own controls', async () => {
      const h = await playingHere();
      for (let i = 1; i <= SKIP_LOOP.unplayedTracks + 1; i += 1) {
        h.advance(1_000);
        await h.engine.next();
        h.advance(300);
        h.callbacks().onState(sdkTrackState(`t${i}`));
      }
      expect(h.device.getCurrentState).not.toHaveBeenCalled();
      h.engine.stop();
    });

    it('treats repeated SDK playback errors as a failing player and reports the licence problem', async () => {
      const h = await playingHere({ protectedAudio: true });
      vi.mocked(h.device.getCurrentState).mockImplementation(async () => sdkTrackState('t0', 0, true));
      for (let i = 0; i < SKIP_LOOP.errors; i += 1) {
        h.advance(1_000);
        h.callbacks().onError('playback', 'Failed to play track');
      }
      h.runTimers();
      await settle(h);
      const issue = h.store.getState().issue;
      expect(issue?.kind).toBe('playback-failed');
      expect(issue?.message).toMatch(/licence/);
      expect(issue?.detail).toBe('Spotify reported: Failed to play track');
      // Trying again clears the notice until the player fails again.
      await h.engine.resume();
      expect(h.store.getState().issue).toBeNull();
      h.engine.stop();
    });
  });

  it('marks the device as reconnecting when it goes offline', async () => {
    const h = harness();
    h.engine.start();
    await h.flush();
    h.callbacks().onReady('web-device');
    h.callbacks().onNotReady('web-device');
    expect(h.store.getState().sdk).toMatchObject({ kind: 'reconnecting', deviceId: 'web-device' });
    h.engine.stop();
    expect(h.device.disconnect).toHaveBeenCalled();
  });
});
