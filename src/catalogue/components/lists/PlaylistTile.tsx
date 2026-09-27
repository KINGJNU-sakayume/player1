import type { PlaylistSummary } from '../../../domain/types';
import { pluralise } from '../../../lib/format';
import { Cover } from '../Cover';
import { Icon } from '../Icon';
import styles from './Lists.module.css';

interface PlaylistTileProps {
  playlist: PlaylistSummary;
  onPlay: () => void;
}

/** Compact playlist object. Playlists play as a Spotify context (their items are only readable for playlists you own). */
export function PlaylistTile({ playlist, onPlay }: PlaylistTileProps) {
  const meta = playlist.itemCount !== null ? pluralise(playlist.itemCount, 'track') : playlist.ownerName;
  return (
    <li className={styles.tile} data-result>
      <div className={styles.tileArt}>
        <Cover images={playlist.images} displaySize={160} alt="" title={playlist.name} />
        <button type="button" className={styles.tilePlay} onClick={onPlay} aria-label={`Play playlist ${playlist.name}`}>
          <Icon name="play" size={18} />
        </button>
      </div>
      <div className={styles.tileText}>
        <p className={styles.tileTitle} title={playlist.name}>
          {playlist.name}
        </p>
        {meta && <p className={styles.tileMeta}>{meta}</p>}
      </div>
    </li>
  );
}
