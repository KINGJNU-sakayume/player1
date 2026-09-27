import type { AlbumSummary, Page, SearchResults } from '../domain/types';
import { NOT_IN_PREVIEW, SpotifyApiError } from '../spotify/errors';
import { normaliseTitle, type CatalogueSource, type PageRequest } from '../catalogue/data/CatalogueSource';
import {
  PREVIEW_ALBUMS,
  PREVIEW_ARTISTS,
  PREVIEW_INITIALLY_SAVED_URIS,
  PREVIEW_PLAYLISTS,
  PREVIEW_RECENTLY_PLAYED,
  PREVIEW_SAVED_ALBUM_IDS,
  PREVIEW_TRACKS,
  previewAlbum,
  previewArtist,
} from './previewData';

const LATENCY_MS = 120;

function delay<T>(value: T, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(value), LATENCY_MS);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function page<T>(items: T[], request: PageRequest): Page<T> {
  const slice = items.slice(request.offset, request.offset + request.limit);
  return {
    items: slice,
    offset: request.offset,
    limit: request.limit,
    total: items.length,
    hasMore: request.offset + slice.length < items.length,
  };
}

function notInPreview(what: string, endpoint: string): SpotifyApiError {
  return new SpotifyApiError({
    kind: 'not-found',
    status: 404,
    message: `This ${what} is not part of the preview catalogue. Connect Spotify to open any ${what}.`,
    endpoint,
    reason: NOT_IN_PREVIEW,
  });
}

function summary(album: AlbumSummary): AlbumSummary {
  const { id, uri, name, artists, images, albumType, releaseDate, releaseDatePrecision, totalTracks } = album;
  return { id, uri, name, artists, images, albumType, releaseDate, releaseDatePrecision, totalTracks };
}

function matches(query: string, ...fields: string[]): boolean {
  const q = normaliseTitle(query);
  return fields.some((field) => normaliseTitle(field).includes(q));
}

/** Offline catalogue backed by previewData.ts (no network). */
export function createPreviewCatalogueSource(now: () => number = Date.now): CatalogueSource {
  const createdAt = now();
  const saved = new Set(PREVIEW_INITIALLY_SAVED_URIS.concat(PREVIEW_SAVED_ALBUM_IDS.map((id) => `spotify:album:${id}`)));

  return {
    mode: 'preview',

    getRecentlyPlayed(signal) {
      const items = PREVIEW_RECENTLY_PLAYED.flatMap(([id, minutesAgo]) => {
        const track = PREVIEW_TRACKS.find((t) => t.spotifyTrackId === id);
        if (!track) return [];
        return [
          {
            track,
            playedAt: new Date(createdAt - minutesAgo * 60_000).toISOString(),
            context: { uri: track.album.uri, type: 'album' },
          },
        ];
      });
      return delay(items, signal);
    },

    getSavedAlbums(request, signal) {
      const albums = PREVIEW_SAVED_ALBUM_IDS.flatMap((id) => {
        const album = previewAlbum(id);
        return album && saved.has(album.uri) ? [summary(album)] : [];
      });
      return delay(page(albums, request), signal);
    },

    getPlaylists(request, signal) {
      return delay(
        page(
          PREVIEW_PLAYLISTS.map(({ trackUris: _trackUris, ...rest }) => rest),
          request,
        ),
        signal,
      );
    },

    async getAlbum(id, signal) {
      const album = previewAlbum(id);
      if (!album) throw notInPreview('album', '/albums/{id}');
      return delay(album, signal);
    },

    async getArtist(id, signal) {
      const artist = previewArtist(id);
      if (!artist) throw notInPreview('artist', '/artists/{id}');
      return delay(artist, signal);
    },

    getArtistReleases(artistId, request, signal) {
      const albums = PREVIEW_ALBUMS.filter((a) => a.artists.some((artist) => artist.id === artistId))
        .map(summary)
        .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
      return delay(page(albums, request), signal);
    },

    getAlbumSummaries(ids, signal) {
      return delay(
        ids.flatMap((id) => {
          const album = previewAlbum(id);
          return album ? [summary(album)] : [];
        }),
        signal,
      );
    },

    findArtistReleasesByTitle(artistId, titles, signal) {
      const albums = PREVIEW_ALBUMS.filter((a) => a.artists.some((artist) => artist.id === artistId));
      return delay(
        titles.flatMap((title) => {
          const album = albums.find((a) => normaliseTitle(a.name) === normaliseTitle(title));
          return album ? [summary(album)] : [];
        }),
        signal,
      );
    },

    search(request, signal) {
      const { query, types } = request;
      const results: SearchResults = { tracks: null, artists: null, albums: null, playlists: null };
      if (types.includes('track')) {
        results.tracks = page(
          PREVIEW_TRACKS.filter((t) => matches(query, t.title, t.album.name, ...t.artists.map((a) => a.name))),
          request,
        );
      }
      if (types.includes('artist')) results.artists = page(PREVIEW_ARTISTS.filter((a) => matches(query, a.name)), request);
      if (types.includes('album')) {
        results.albums = page(
          PREVIEW_ALBUMS.filter((a) => matches(query, a.name, ...a.artists.map((x) => x.name))).map(summary),
          request,
        );
      }
      if (types.includes('playlist')) {
        results.playlists = page(
          PREVIEW_PLAYLISTS.filter((p) => matches(query, p.name)).map(({ trackUris: _trackUris, ...rest }) => rest),
          request,
        );
      }
      return delay(results, signal);
    },

    checkSaved(uris, signal) {
      return delay(
        uris.map((u) => saved.has(u)),
        signal,
      );
    },

    async setSaved(uris, value) {
      for (const u of uris) {
        if (value) saved.add(u);
        else saved.delete(u);
      }
      await delay(undefined);
    },
  };
}
