import { ensureContrast, parseHex, readableOn, rgbToHsl, withAlpha } from './contrast';
import type { AlbumPalette } from './types';

/**
 * The neutral editorial base. Must match the values in src/styles/tokens.css.
 * Album colour never replaces these: page surface, body text, lyric text and
 * separators always stay neutral.
 */
export const NEUTRAL_BASE = {
  bg: '#f1eee6',
  paper: '#f8f5ee',
  ink: '#171917',
} as const;

/**
 * Which palette role drives which UI region. This is the single place to
 * change album-colour usage — pages only read the resulting CSS variables.
 * `secondary`, `accent`, `light` and `dark` are extracted and cached but
 * deliberately unused by default (reserved for future album-specific overrides).
 */
export const PALETTE_ROLE_MAP = {
  /** Progress fill, active navigation marker, current-track marker, small selected states. */
  active: 'dominant',
  /** Soft shadow behind album art. */
  coverShadow: 'dominant',
} as const satisfies Record<string, keyof AlbumPalette>;

export interface PaletteTokens {
  '--active': string;
  '--active-text': string;
  '--on-active': string;
  '--active-soft': string;
  '--cover-shadow': string;
}

export const NEUTRAL_TOKENS: PaletteTokens = {
  '--active': NEUTRAL_BASE.ink,
  '--active-text': NEUTRAL_BASE.ink,
  '--on-active': NEUTRAL_BASE.paper,
  '--active-soft': 'rgba(23, 25, 23, 0.07)',
  '--cover-shadow': 'rgba(23, 25, 23, 0.16)',
};

/** Below this saturation a colour reads as grey; the neutral ink accent is used instead. */
const MIN_ACCENT_SATURATION = 0.14;

/**
 * Maps a palette to CSS tokens with contrast guarantees: `--active` reaches
 * 3:1 (WCAG 1.4.11, non-text UI) and `--active-text` 4.5:1 against the page
 * background; otherwise the neutral tokens are used.
 */
export function mapPaletteToTokens(palette: AlbumPalette | null): PaletteTokens {
  if (!palette) return NEUTRAL_TOKENS;
  const activeSource = palette[PALETTE_ROLE_MAP.active];
  const shadowSource = palette[PALETTE_ROLE_MAP.coverShadow];
  const rgb = parseHex(activeSource);
  if (!rgb) return NEUTRAL_TOKENS;

  const coverShadow = parseHex(shadowSource) ? withAlpha(shadowSource, 0.3) : NEUTRAL_TOKENS['--cover-shadow'];
  if (rgbToHsl(rgb).s < MIN_ACCENT_SATURATION) return { ...NEUTRAL_TOKENS, '--cover-shadow': coverShadow };

  const active = ensureContrast(activeSource, NEUTRAL_BASE.bg, 3);
  const activeText = ensureContrast(activeSource, NEUTRAL_BASE.bg, 4.5);
  if (!active || !activeText) return { ...NEUTRAL_TOKENS, '--cover-shadow': coverShadow };

  return {
    '--active': active,
    '--active-text': activeText,
    '--on-active': readableOn(active, NEUTRAL_BASE.paper, NEUTRAL_BASE.ink),
    '--active-soft': withAlpha(active, 0.12),
    '--cover-shadow': coverShadow,
  };
}
