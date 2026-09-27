import { useEffect } from 'react';
import { mapPaletteToTokens } from '../../catalogue/palette/mapPaletteToTokens';
import { useAlbumPalette } from '../../catalogue/palette/usePalette';
import { pickImageUrl } from '../../lib/images';
import { usePlayerSelector } from '../../playback/hooks';

/**
 * Applies the now-playing album's palette to the document as the small set of
 * --active* / --cover-shadow tokens. Everything else stays neutral.
 */
export function PaletteTokens() {
  const track = usePlayerSelector((state) => state.snapshot.track);
  const albumId = track?.album.id || null;
  // A 64 px image is plenty for a 48 px sample and keeps extraction cheap.
  const imageUrl = track ? pickImageUrl(track.album.images, 64) : null;
  const palette = useAlbumPalette(albumId, imageUrl);

  useEffect(() => {
    const tokens = mapPaletteToTokens(palette);
    const root = document.documentElement;
    for (const [property, value] of Object.entries(tokens)) root.style.setProperty(property, value);
  }, [palette]);

  return null;
}
