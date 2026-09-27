import { Link } from 'react-router';
import type { ArtistSummary } from '../../../domain/types';
import { detectLineLanguage } from '../../../translation/languageDetect';
import { Portrait } from '../Cover';
import { Icon } from '../Icon';
import styles from './Lists.module.css';

interface ArtistTileProps {
  artist: ArtistSummary;
  onPlay: () => void;
}

/** Followed artist: round portrait and name. Hover reveals a play control for the artist context. */
export function ArtistTile({ artist, onPlay }: ArtistTileProps) {
  return (
    <li className={styles.artistTile} data-result>
      <div className={styles.artistArt}>
        <Link to={`/artist/${artist.id}`} tabIndex={-1} aria-hidden="true">
          <Portrait className={styles.round} images={artist.images} displaySize={160} name={artist.name} />
        </Link>
        <button type="button" className={styles.tilePlay} onClick={onPlay} aria-label={`Play ${artist.name}`}>
          <Icon name="play" size={18} />
        </button>
      </div>
      <Link className={styles.artistName} to={`/artist/${artist.id}`} lang={detectLineLanguage(artist.name)} data-primary>
        {artist.name}
      </Link>
    </li>
  );
}
