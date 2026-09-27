import { describe, expect, it } from 'vitest';
import { normaliseBasePath, readConfig, routerBasename } from './config';

describe('readConfig', () => {
  it('uses safe defaults when nothing is configured', () => {
    const config = readConfig({ BASE_URL: '/' }, 'http://127.0.0.1:5173');
    expect(config).toEqual({
      spotifyClientId: null,
      redirectUri: 'http://127.0.0.1:5173/callback',
      basePath: '/',
      lyricsProvider: 'lrclib',
      translationProvider: 'browser',
      translationEndpoint: null,
      translationTarget: 'ko',
      previewEnabled: true,
    });
  });

  it('derives the redirect URI from a sub-path deployment', () => {
    const config = readConfig({ BASE_URL: '/player1/', VITE_SPOTIFY_CLIENT_ID: ' abc ' }, 'https://user.github.io');
    expect(config.spotifyClientId).toBe('abc');
    expect(config.redirectUri).toBe('https://user.github.io/player1/callback');
    expect(routerBasename(config.basePath)).toBe('/player1');
  });

  it('validates provider names and degrades an http translator without endpoint', () => {
    const config = readConfig(
      { VITE_LYRICS_PROVIDER: 'MOCK', VITE_TRANSLATION_PROVIDER: 'http', VITE_ENABLE_PREVIEW: 'false' },
      'http://x',
    );
    expect(config.lyricsProvider).toBe('mock');
    expect(config.translationProvider).toBe('none');
    expect(config.previewEnabled).toBe(false);
    expect(readConfig({ VITE_LYRICS_PROVIDER: 'genius' }, 'http://x').lyricsProvider).toBe('lrclib');
  });

  it('normalises base paths', () => {
    expect(normaliseBasePath('player1')).toBe('/player1/');
    expect(normaliseBasePath('/a/b/')).toBe('/a/b/');
    expect(normaliseBasePath('')).toBe('/');
  });
});
