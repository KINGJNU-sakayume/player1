import { Link } from 'react-router';
import type { AlbumSummary } from '../../../domain/types';
import { albumTypeLabel, joinArtistNames, releaseYear } from '../../../lib/format';
import { detectLineLanguage } from '../../../translation/languageDetect';
import { ArtistLinks } from '../ArtistLinks';
import { Cover } from '../Cover';
import { Icon } from '../Icon';
import styles from './Lists.module.css';

interface AlbumTileProps {
  album: AlbumSummary;
  onPlay: () => void;
  showType?: boolean;
}

/** Restrained album object: cover, title, artist, year. Hover reveals a small play control. */
export function AlbumTile({ album, onPlay, showType = false }: AlbumTileProps) {
  const year = releaseYear(album.releaseDate);
  return (
    <li className={styles.tile} data-result>
      <div className={styles.tileArt}>
        <Link to={`/album/${album.id}`} tabIndex={-1} aria-hidden="true">
          <Cover
            images={album.images}
            displaySize={200}
            alt=""
            title={album.name}
            subtitle={joinArtistNames(album.artists)}
            paletteKey={album.id}
          />
        </Link>
        <button type="button" className={styles.tilePlay} onClick={onPlay} aria-label={`Play ${album.name}`}>
          <Icon name="play" size={20} />
        </button>
      </div>
      <div className={styles.tileText}>
        <Link className={styles.tileTitle} to={`/album/${album.id}`} lang={detectLineLanguage(album.name)} data-primary>
          {album.name}
        </Link>
        {showType ? (
          <>
            <p className={styles.tileMeta}>
              <ArtistLinks artists={album.artists} quiet />
            </p>
            <p className={styles.tileMeta}>{[albumTypeLabel(album.albumType), year].filter(Boolean).join(' · ')}</p>
          </>
        ) : (
          <p className={styles.tileMeta}>
            <ArtistLinks artists={album.artists} quiet />
            {year && ` · ${year}`}
          </p>
        )}
      </div>
    </li>
  );
}
