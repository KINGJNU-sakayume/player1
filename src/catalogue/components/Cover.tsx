import { useState, type CSSProperties } from 'react';
import type { ImageRef } from '../../domain/types';
import { cx } from '../../lib/cx';
import { pickImageUrl } from '../../lib/images';
import { readableOn } from '../palette/contrast';
import { NEUTRAL_BASE } from '../palette/mapPaletteToTokens';
import { useAlbumPalette } from '../palette/usePalette';
import styles from './Cover.module.css';

interface CoverProps {
  images: readonly ImageRef[];
  /** Rendered size in CSS px; used to choose a sharp but small image. */
  displaySize: number;
  /** Accessible description, e.g. "IGOR cover". */
  alt: string;
  /** Printed on the fallback plate when artwork is unavailable. */
  title: string;
  subtitle?: string;
  /** Album ID: lets the fallback plate use a known palette. */
  paletteKey?: string;
  shadow?: 'strong' | 'subtle' | 'none';
  priority?: boolean;
  className?: string;
}

/** Square album art. Missing or broken art becomes a designed catalogue plate. */
export function Cover({
  images,
  displaySize,
  alt,
  title,
  subtitle,
  paletteKey,
  shadow = 'none',
  priority = false,
  className,
}: CoverProps) {
  const url = pickImageUrl(images, displaySize * 2);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = url !== null && failedUrl !== url;

  return (
    <div
      className={cx(
        styles.cover,
        shadow === 'strong' && styles.shadow,
        shadow === 'subtle' && styles.subtleShadow,
        className,
      )}
    >
      {showImage ? (
        <img
          className={styles.image}
          src={url}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <ArtworkPlate
          title={title}
          subtitle={subtitle}
          paletteKey={paletteKey}
          label={alt ? `${alt} (artwork unavailable)` : null}
        />
      )}
    </div>
  );
}

function ArtworkPlate({
  title,
  subtitle,
  paletteKey,
  label,
}: {
  title: string;
  subtitle?: string;
  paletteKey?: string;
  /** Null when the cover is decorative (its label is provided elsewhere). */
  label: string | null;
}) {
  // Only palettes that are already known (cached or seeded); never extracts.
  const palette = useAlbumPalette(paletteKey, null);
  const style = palette
    ? ({
        '--plate-bg': palette.dominant,
        '--plate-ink': readableOn(palette.dominant, NEUTRAL_BASE.paper, NEUTRAL_BASE.ink),
      } as CSSProperties)
    : undefined;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <div className={styles.plate} style={style} {...a11y}>
      <span className={styles.plateMark} aria-hidden="true" />
      <span className={styles.plateTitle} aria-hidden="true">
        {title}
      </span>
      {subtitle ? (
        <span className={styles.plateSubtitle} aria-hidden="true">
          {subtitle}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

interface PortraitProps {
  images: readonly ImageRef[];
  displaySize: number;
  name: string;
  className?: string;
  priority?: boolean;
}

/** Artist photograph; a monogram plate when Spotify has no image. */
export function Portrait({ images, displaySize, name, className, priority = false }: PortraitProps) {
  const url = pickImageUrl(images, displaySize * 2);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = url !== null && failedUrl !== url;
  const initials = name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('');

  return (
    <div className={cx(styles.cover, styles.portrait, className)}>
      {showImage ? (
        <img
          className={styles.image}
          src={url}
          alt={`${name}, artist photograph`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <div className={styles.monogram} role="img" aria-label={`${name} (no artist image)`}>
          <span aria-hidden="true">{initials}</span>
        </div>
      )}
    </div>
  );
}
