import type { PlaylistSummary } from '../../../domain/types';
import { pluralise } from '../../../lib/format';
import { Cover } from '../Cover';
import { Icon } from '../Icon';
import styles from './Lists.module.css';

interface PlaylistRowProps {
  playlist: PlaylistSummary;
  position: number;
  onPlay: () => void;
  typeLabel?: string;
}

/** Playlists are played as a Spotify context (their items are only readable for playlists you own). */
export function PlaylistRow({ playlist, position, onPlay, typeLabel }: PlaylistRowProps) {
  const meta = [playlist.ownerName && `By ${playlist.ownerName}`, playlist.itemCount !== null && pluralise(playlist.itemCount, 'track')]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={styles.row} data-result>
      <span className={styles.rowIndex} aria-hidden="true">
        <span className={styles.number}>{String(position).padStart(2, '0')}</span>
        <Icon className={styles.playHint} name="play" size={18} />
      </span>
      <Cover images={playlist.images} displaySize={52} alt="" title={playlist.name} />
      <span className={styles.rowText}>
        <button
          type="button"
          className={styles.stretch}
          onClick={onPlay}
          data-primary
          aria-label={`Play playlist ${playlist.name}`}
        >
          {typeLabel && <span className={styles.typeLabel}>{typeLabel}</span>}
          {playlist.name}
        </button>
        {meta && <span className={styles.rowMeta}>{meta}</span>}
      </span>
      <span className={styles.rowAside} />
      <span className={styles.rowAside} />
    </li>
  );
}
