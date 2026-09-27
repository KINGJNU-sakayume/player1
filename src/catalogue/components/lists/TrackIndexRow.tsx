import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { TrackIdentity } from '../../../domain/types';
import { formatDuration, formatTrackNumber, joinArtistNames } from '../../../lib/format';
import { detectLineLanguage } from '../../../translation/languageDetect';
import { ArtistLinks } from '../ArtistLinks';
import { Cover } from '../Cover';
import { Icon } from '../Icon';
import styles from './Lists.module.css';
import { PlayingMark } from './PlayingMark';

interface TrackIndexRowProps {
  track: TrackIdentity;
  position: number;
  onPlay: () => void;
  /** Right-hand column, e.g. "4 minutes ago". */
  aside?: ReactNode;
  current?: { playing: boolean } | null;
  typeLabel?: string;
}

/**
 * A catalogue index row for a track. The whole row starts playback; the
 * artist and album names remain separate links.
 */
export function TrackIndexRow({ track, position, onPlay, aside, current, typeLabel }: TrackIndexRowProps) {
  return (
    <li className={styles.row} aria-current={current ? 'true' : undefined} data-result>
      <span className={styles.rowIndex} aria-hidden="true">
        {current ? (
          <PlayingMark playing={current.playing} />
        ) : (
          <>
            <span className={styles.number}>{formatTrackNumber(position)}</span>
            <Icon className={styles.playHint} name="play" size={18} />
          </>
        )}
      </span>
      <Cover images={track.album.images} displaySize={52} alt="" title={track.album.name} paletteKey={track.album.id} />
      <span className={styles.rowText}>
        <button
          type="button"
          className={styles.stretch}
          onClick={onPlay}
          data-primary
          lang={detectLineLanguage(track.title)}
          aria-label={`Play ${track.title} by ${joinArtistNames(track.artists)}`}
        >
          {typeLabel && <span className={styles.typeLabel}>{typeLabel}</span>}
          {track.title}
        </button>
        <span className={styles.rowMeta}>
          <ArtistLinks artists={track.artists} quiet />
          {track.album.id && (
            <>
              {' · '}
              <Link className="link-quiet" to={`/album/${track.album.id}`}>
                {track.album.name}
              </Link>
            </>
          )}
        </span>
      </span>
      <span className={styles.rowAside}>{aside}</span>
      <span className={styles.rowAside}>{formatDuration(track.durationMs)}</span>
    </li>
  );
}
