import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../app/sessionContext';
import type { AlbumSummary, SearchResults, SearchType } from '../../domain/types';
import { isSpotifyId } from '../../lib/spotifyUri';
import type { ArtistEditorial } from '../editorial/types';
import { normaliseTitle } from './CatalogueSource';

const MINUTE = 60_000;

/* ── Library surfaces ──────────────────────────────────────────────────── */

export function useRecentlyPlayed() {
  const { catalogue } = useSession();
  return useQuery({
    queryKey: [catalogue.mode, 'recently-played'],
    queryFn: ({ signal }) => catalogue.getRecentlyPlayed(signal),
    staleTime: 30_000,
  });
}

export function useLikedTracks(pageSize = 20) {
  const { catalogue } = useSession();
  return useInfiniteQuery({
    queryKey: [catalogue.mode, 'liked-tracks', pageSize],
    queryFn: ({ pageParam, signal }) => catalogue.getLikedTracks({ offset: pageParam, limit: pageSize }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.items.length : undefined),
    staleTime: 2 * MINUTE,
  });
}

export function useFollowedArtists(pageSize = 24) {
  const { catalogue } = useSession();
  return useInfiniteQuery({
    queryKey: [catalogue.mode, 'followed-artists', pageSize],
    queryFn: ({ pageParam, signal }) => catalogue.getFollowedArtists(pageParam, pageSize, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 5 * MINUTE,
  });
}

export function useSavedAlbums(pageSize = 24) {
  const { catalogue } = useSession();
  return useInfiniteQuery({
    queryKey: [catalogue.mode, 'saved-albums', pageSize],
    queryFn: ({ pageParam, signal }) => catalogue.getSavedAlbums({ offset: pageParam, limit: pageSize }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.items.length : undefined),
    staleTime: 5 * MINUTE,
  });
}

export function usePlaylists(pageSize = 20) {
  const { catalogue } = useSession();
  return useInfiniteQuery({
    queryKey: [catalogue.mode, 'playlists', pageSize],
    queryFn: ({ pageParam, signal }) => catalogue.getPlaylists({ offset: pageParam, limit: pageSize }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.items.length : undefined),
    staleTime: 5 * MINUTE,
  });
}

/* ── Navigation data ───────────────────────────────────────────────────── */

export function useAlbum(albumId: string | undefined) {
  const { catalogue } = useSession();
  return useQuery({
    queryKey: [catalogue.mode, 'album', albumId],
    queryFn: ({ signal }) => catalogue.getAlbum(albumId!, signal),
    enabled: isSpotifyId(albumId),
    staleTime: 30 * MINUTE,
  });
}

export function useArtist(artistId: string | undefined) {
  const { catalogue } = useSession();
  return useQuery({
    queryKey: [catalogue.mode, 'artist', artistId],
    queryFn: ({ signal }) => catalogue.getArtist(artistId!, signal),
    enabled: isSpotifyId(artistId),
    staleTime: 30 * MINUTE,
  });
}

export function useArtistReleases(artistId: string | undefined, pageSize = 10) {
  const { catalogue } = useSession();
  return useInfiniteQuery({
    queryKey: [catalogue.mode, 'artist-releases', artistId, pageSize],
    queryFn: ({ pageParam, signal }) =>
      catalogue.getArtistReleases(artistId!, { offset: pageParam, limit: pageSize }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.items.length : undefined),
    enabled: isSpotifyId(artistId),
    staleTime: 30 * MINUTE,
  });
}

const MAX_FEATURED = 5;

/** Editorial "Selected releases": by ID first, then by title for anything unresolved. */
export function useFeaturedReleases(artistId: string | undefined, editorial: ArtistEditorial | null) {
  const { catalogue } = useSession();
  const ids = editorial?.featuredReleaseIds ?? [];
  const titles = editorial?.featuredReleaseTitles ?? [];
  return useQuery({
    queryKey: [catalogue.mode, 'featured-releases', artistId, ids, titles],
    enabled: isSpotifyId(artistId) && (ids.length > 0 || titles.length > 0),
    staleTime: 30 * MINUTE,
    queryFn: async ({ signal }): Promise<AlbumSummary[]> => {
      const byId = ids.length > 0 ? await catalogue.getAlbumSummaries(ids, signal) : [];
      const wanted = Math.max(ids.length, titles.length);
      if (byId.length >= wanted || titles.length === 0) return byId.slice(0, MAX_FEATURED);
      const known = new Set(byId.map((a) => normaliseTitle(a.name)));
      const missing = titles.filter((t) => !known.has(normaliseTitle(t)));
      const byTitle = missing.length > 0 ? await catalogue.findArtistReleasesByTitle(artistId!, missing, signal) : [];
      const merged = [...byId];
      for (const album of byTitle) if (!merged.some((a) => a.id === album.id)) merged.push(album);
      return merged.slice(0, MAX_FEATURED);
    },
  });
}

/* ── Search ────────────────────────────────────────────────────────────── */

export const ALL_SEARCH_TYPES: SearchType[] = ['track', 'artist', 'album', 'playlist'];

export function useCatalogueSearch(query: string, types: SearchType[], offset: number, limit: number) {
  const { catalogue } = useSession();
  const trimmed = query.trim();
  return useQuery({
    queryKey: [catalogue.mode, 'search', trimmed, types, offset, limit],
    // The signal aborts superseded requests; TanStack only exposes the latest key's data.
    queryFn: ({ signal }) => catalogue.search({ query: trimmed, types, offset, limit }, signal),
    enabled: trimmed.length > 0,
    staleTime: 5 * MINUTE,
    placeholderData: (previous, previousQuery) =>
      previousQuery && (previousQuery.queryKey[2] as string) === trimmed ? previous : undefined,
  });
}

const SEARCH_PAGE = 10;
/** The schema caps search offsets at 1000. */
const SEARCH_MAX_OFFSET = 1000;

function pageFor(results: SearchResults, type: SearchType) {
  switch (type) {
    case 'track':
      return results.tracks;
    case 'artist':
      return results.artists;
    case 'album':
      return results.albums;
    case 'playlist':
      return results.playlists;
  }
}

/** One result type, paged 10 at a time (Development Mode search limit). */
export function useCatalogueSearchPages(query: string, type: SearchType) {
  const { catalogue } = useSession();
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: [catalogue.mode, 'search-pages', trimmed, type],
    queryFn: ({ pageParam, signal }) =>
      catalogue.search({ query: trimmed, types: [type], offset: pageParam, limit: SEARCH_PAGE }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, lastOffset) => {
      const page = pageFor(last, type);
      if (!page?.hasMore) return undefined;
      const next = lastOffset + Math.max(page.items.length, 1);
      return next < SEARCH_MAX_OFFSET ? next : undefined;
    },
    enabled: trimmed.length > 0,
    staleTime: 5 * MINUTE,
  });
}

export { pageFor as searchPageFor };

/* ── Library state ─────────────────────────────────────────────────────── */

export function useSavedState(uri: string | null | undefined) {
  const { catalogue } = useSession();
  return useQuery({
    queryKey: [catalogue.mode, 'saved', uri],
    queryFn: async ({ signal }) => (await catalogue.checkSaved([uri!], signal))[0] ?? false,
    enabled: Boolean(uri),
    staleTime: 5 * MINUTE,
  });
}

export function useToggleSaved() {
  const { catalogue } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, saved }: { uri: string; saved: boolean }) => catalogue.setSaved([uri], saved),
    onMutate: async ({ uri, saved }) => {
      const key = [catalogue.mode, 'saved', uri];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<boolean>(key);
      queryClient.setQueryData(key, saved);
      return { key, previous };
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, { uri }) => {
      void queryClient.invalidateQueries({ queryKey: [catalogue.mode, 'saved', uri] });
      if (uri.startsWith('spotify:album:')) void queryClient.invalidateQueries({ queryKey: [catalogue.mode, 'saved-albums'] });
      if (uri.startsWith('spotify:track:')) void queryClient.invalidateQueries({ queryKey: [catalogue.mode, 'liked-tracks'] });
    },
  });
}
