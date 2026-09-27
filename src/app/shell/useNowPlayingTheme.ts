import type { CSSProperties } from 'react';
import { mapPaletteToStageTheme, type StageTone } from '../../catalogue/palette/stageTheme';
import { useAlbumPalette } from '../../catalogue/palette/usePalette';
import { pickImageUrl } from '../../lib/images';
import { usePlayerSelector } from '../../playback/hooks';

/** Palette of the album that is playing (extracted once per album and cached). */
export function useNowPlayingPalette() {
  const track = usePlayerSelector((state) => state.snapshot.track);
  const albumId = track?.album.id || null;
  // A 64 px image is plenty for a 48 px sample and keeps extraction cheap.
  const imageUrl = track ? pickImageUrl(track.album.images, 64) : null;
  return useAlbumPalette(albumId, imageUrl);
}

/**
 * The album-coloured surface for the Now Playing screen: CSS variables that
 * re-theme everything beneath the element they are set on. Null (neutral
 * surface) when disabled or when the cover colour could not be read.
 */
export function useStageTheme(enabled: boolean): { tone: StageTone; style: CSSProperties } | null {
  const palette = useNowPlayingPalette();
  const theme = enabled ? mapPaletteToStageTheme(palette) : null;
  if (!theme) return null;
  return { tone: theme.tone, style: theme.tokens as CSSProperties };
}
