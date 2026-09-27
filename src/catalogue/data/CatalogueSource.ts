import type {
  AlbumDetail,
  AlbumSummary,
  ArtistDetail,
  ArtistSummary,
  CursorPage,
  Page,
  PlaylistSummary,
  RecentlyPlayedItem,
  SearchResults,
  SearchType,
  TrackIdentity,
} from '../../domain/types';

export type SessionMode = 'spotify' | 'preview';

export interface PageRequest {
  offset: number;
  limit: number;
}

export interface SearchRequest {
  query: string;
  types: SearchType[];
  offset: number;
  limit: number;
}

/**
 * Navigation / library data for pages. Implemented by the Spotify Web API
 * (spotifySource.ts) and by the offline preview catalogue. Pages consume it
 * through the TanStack Query hooks in queries.ts, never directly.
 */
export interface CatalogueSource {
  readonly mode: SessionMode;
  getRecentlyPlayed(signal?: AbortSignal): Promise<RecentlyPlayedItem[]>;
  /** Liked Songs, most recently liked first. */
  getLikedTracks(page: PageRequest, signal?: AbortSignal): Promise<Page<TrackIdentity>>;
  getSavedAlbums(page: PageRequest, signal?: AbortSignal): Promise<Page<AlbumSummary>>;
  /** Followed artists; `after` is the cursor returned by the previous page. */
  getFollowedArtists(after: string | null, limit: number, signal?: AbortSignal): Promise<CursorPage<ArtistSummary>>;
  getPlaylists(page: PageRequest, signal?: AbortSignal): Promise<Page<PlaylistSummary>>;
  /** Album with its complete track sequence. */
  getAlbum(id: string, signal?: AbortSignal): Promise<AlbumDetail>;
  getArtist(id: string, signal?: AbortSignal): Promise<ArtistDetail>;
  getArtistReleases(artistId: string, page: PageRequest, signal?: AbortSignal): Promise<Page<AlbumSummary>>;
  /** Resolves album IDs; IDs that fail to resolve are skipped. */
  getAlbumSummaries(ids: string[], signal?: AbortSignal): Promise<AlbumSummary[]>;
  /** Finds releases in an artist's discography by title (editorial fallback). */
  findArtistReleasesByTitle(artistId: string, titles: string[], signal?: AbortSignal): Promise<AlbumSummary[]>;
  search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResults>;
  checkSaved(uris: string[], signal?: AbortSignal): Promise<boolean[]>;
  setSaved(uris: string[], saved: boolean): Promise<void>;
}

/** Title comparison used for editorial title fallbacks. */
export function normaliseTitle(title: string): string {
  return title.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Keeps the most recent play of each track, preserving order. */
export function dedupeRecentlyPlayed(items: RecentlyPlayedItem[]): RecentlyPlayedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.track.spotifyTrackId)) return false;
    seen.add(item.track.spotifyTrackId);
    return true;
  });
}
