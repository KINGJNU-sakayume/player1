import { albumEditorial } from './albums';
import { artistEditorial } from './artists';
import type { AlbumEditorial, ArtistEditorial } from './types';

function cleanParagraphs(paragraphs: readonly string[] | undefined): string[] {
  return (paragraphs ?? []).map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Returns the artist's editorial override, or null when none exists or the
 * entry has no usable content — callers then render Spotify metadata only.
 */
export function getArtistEditorial(
  artistId: string | null | undefined,
  source: Readonly<Record<string, ArtistEditorial>> = artistEditorial,
): ArtistEditorial | null {
  if (!artistId) return null;
  const entry = source[artistId];
  if (!entry) return null;
  const bio = cleanParagraphs(entry.bio);
  return bio.length > 0 ? { ...entry, bio } : null;
}

export function getAlbumEditorial(
  albumId: string | null | undefined,
  source: Readonly<Record<string, AlbumEditorial>> = albumEditorial,
): AlbumEditorial | null {
  if (!albumId) return null;
  const entry = source[albumId];
  if (!entry) return null;
  const description = cleanParagraphs(entry.description);
  return description.length > 0 ? { ...entry, description } : null;
}
