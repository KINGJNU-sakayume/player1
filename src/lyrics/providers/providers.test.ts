import { describe, expect, it, vi } from 'vitest';
import type { TrackIdentity } from '../../domain/types';
import { BoundedCache } from '../../lib/boundedCache';
import { withLyricsCache } from '../lyricsCache';
import { LyricsProviderError, type TimedLyrics } from '../types';
import { LrclibLyricsProvider, cleanTrackTitle, recordToTimedLyrics } from './LrclibLyricsProvider';
import { MockLyricsProvider } from './MockLyricsProvider';
import { TEST_LINES_EN, buildTimedLines } from './testLines';

const track: TrackIdentity = {
  spotifyTrackId: 'trk1',
  uri: 'spotify:track:trk1',
  title: 'Song Title - Remastered 2011',
  artists: [{ id: 'a', name: 'Some Artist', uri: 'spotify:artist:a' }],
  album: { id: 'alb', name: 'Some Album', uri: 'spotify:album:alb', images: [] },
  durationMs: 187_400,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('LrclibLyricsProvider', () => {
  it('queries /api/get with the track signature and parses synced lyrics', async () => {
    const fetchMock = vi.fn(async () =>
      json({ id: 1, trackName: 'Song Title', artistName: 'Some Artist', duration: 187, instrumental: false, syncedLyrics: '[00:01.00]hello\n[00:03.00]world' }),
    );
    const provider = new LrclibLyricsProvider(fetchMock);
    const lyrics = await provider.getTimedLyrics(track);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/api/get');
    expect(parsed.searchParams.get('track_name')).toBe('Song Title - Remastered 2011');
    expect(parsed.searchParams.get('artist_name')).toBe('Some Artist');
    expect(parsed.searchParams.get('album_name')).toBe('Some Album');
    expect(parsed.searchParams.get('duration')).toBe('187');
    expect((init.headers as Record<string, string>)['Lrclib-Client']).toContain('ARC Music');
    expect(lyrics).toEqual({
      language: 'en',
      source: 'LRCLIB',
      lines: [
        { startMs: 1000, endMs: 3000, text: 'hello' },
        { startMs: 3000, text: 'world' },
      ],
    });
  });

  it('falls back to /api/search with a cleaned title and a duration check', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ code: 404, name: 'TrackNotFound', message: 'Failed to find specified track' }, 404))
      .mockResolvedValueOnce(
        json([
          { id: 2, duration: 240, syncedLyrics: '[00:01.00]wrong length' },
          { id: 3, duration: 188, plainLyrics: 'unsynced only' },
          { id: 4, duration: 186, syncedLyrics: '[00:02.00]right one' },
        ]),
      );
    const lyrics = await new LrclibLyricsProvider(fetchMock).getTimedLyrics(track);
    const searchUrl = new URL(fetchMock.mock.calls[1]![0] as string);
    expect(searchUrl.pathname).toBe('/api/search');
    expect(searchUrl.searchParams.get('track_name')).toBe('Song Title');
    expect(lyrics?.lines[0]?.text).toBe('right one');
  });

  it('returns null when nothing is found and throws retryable errors for outages', async () => {
    const notFound = vi.fn(async () => json({ code: 404 }, 404));
    await expect(new LrclibLyricsProvider(notFound).getTimedLyrics(track)).resolves.toBeNull();

    const outage = vi.fn(async () => json({ message: 'busy' }, 503));
    const error = await new LrclibLyricsProvider(outage).getTimedLyrics(track).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LyricsProviderError);
    expect((error as LyricsProviderError).retryable).toBe(true);
  });

  it('recognises instrumental records and plain-only records', () => {
    expect(recordToTimedLyrics({ id: 1, instrumental: true })).toEqual({ lines: [], instrumental: true, source: 'LRCLIB' });
    expect(recordToTimedLyrics({ id: 1, plainLyrics: 'no timing' })).toBeNull();
  });

  it('cleans common Spotify title suffixes', () => {
    expect(cleanTrackTitle('Song (feat. Someone)')).toBe('Song');
    expect(cleanTrackTitle('Song - 2011 Remaster')).toBe('Song');
    expect(cleanTrackTitle('Song - Radio Edit')).toBe('Song');
    expect(cleanTrackTitle('GONE, GONE / THANK YOU')).toBe('GONE, GONE / THANK YOU');
  });
});

describe('MockLyricsProvider', () => {
  it('serves fixed lyrics per track and generic test lines only when asked', async () => {
    const fixed: TimedLyrics = { language: 'ja', lines: [{ startMs: 0, text: 'テスト' }] };
    const strict = new MockLyricsProvider({ byTrackId: { trk1: fixed } });
    await expect(strict.getTimedLyrics(track)).resolves.toMatchObject({ source: 'Test lines', language: 'ja' });
    await expect(strict.getTimedLyrics({ ...track, spotifyTrackId: 'other' })).resolves.toBeNull();

    const generic = await new MockLyricsProvider({ generic: true }).getTimedLyrics(track);
    expect(generic?.lines.length).toBeGreaterThan(10);
    expect(generic?.lines.every((line) => TEST_LINES_EN.includes(line.text))).toBe(true);
  });

  it('lays test lines within the track with occasional instrumental gaps', () => {
    const lines = buildTimedLines(TEST_LINES_EN, 190_000);
    expect(lines[0]!.startMs).toBeGreaterThan(0);
    expect(lines[lines.length - 1]!.endMs!).toBeLessThanOrEqual(190_000);
    expect(lines.some((line, i) => i < lines.length - 1 && line.endMs! < lines[i + 1]!.startMs)).toBe(true);
  });
});

describe('withLyricsCache', () => {
  it('caches results (including "not found") per provider and track', async () => {
    const inner = { id: 'x', label: 'X', getTimedLyrics: vi.fn(async () => null) };
    const cached = withLyricsCache(inner, new BoundedCache({ prefix: 'test.lyrics:', maxEntries: 10 }));
    await cached.getTimedLyrics(track);
    await cached.getTimedLyrics(track);
    expect(inner.getTimedLyrics).toHaveBeenCalledTimes(1);
  });

  it('never caches transient failures', async () => {
    const inner = {
      id: 'y',
      label: 'Y',
      getTimedLyrics: vi.fn().mockRejectedValueOnce(new LyricsProviderError('down', true)).mockResolvedValueOnce(null),
    };
    const cached = withLyricsCache(inner, new BoundedCache({ prefix: 'test.lyrics2:', maxEntries: 10 }));
    await expect(cached.getTimedLyrics(track)).rejects.toThrow('down');
    await expect(cached.getTimedLyrics(track)).resolves.toBeNull();
    expect(inner.getTimedLyrics).toHaveBeenCalledTimes(2);
  });
});
