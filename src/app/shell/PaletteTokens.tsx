import { useEffect } from 'react';
import { mapPaletteToTokens } from '../../catalogue/palette/mapPaletteToTokens';
import { useNowPlayingPalette } from './useNowPlayingTheme';

/**
 * Applies the now-playing album's palette to the document as the small set of
 * --active* / --cover-shadow tokens. The Now Playing screen additionally takes
 * the full album-coloured surface (see useStageTheme in AppShell).
 */
export function PaletteTokens() {
  const palette = useNowPlayingPalette();

  useEffect(() => {
    const tokens = mapPaletteToTokens(palette);
    const root = document.documentElement;
    for (const [property, value] of Object.entries(tokens)) root.style.setProperty(property, value);
  }, [palette]);

  return null;
}
