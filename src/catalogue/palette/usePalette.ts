import { useQuery } from '@tanstack/react-query';
import { paletteCache } from './paletteCache';
import type { AlbumPalette } from './types';

/**
 * Palette for an album, extracted once per album ID (or image URL) and cached.
 * Pass `imageUrl: null` to read only known palettes without extracting.
 */
export function useAlbumPalette(key: string | null | undefined, imageUrl: string | null): AlbumPalette | null {
  const { data } = useQuery({
    queryKey: ['palette', key, imageUrl],
    queryFn: () => paletteCache.load(key!, imageUrl),
    enabled: Boolean(key),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 60 * 60_000,
    initialData: () => (key ? (paletteCache.peek(key) ?? undefined) : undefined),
  });
  return data ?? null;
}
