import { Fragment } from 'react';
import { Link } from 'react-router';
import type { ArtistRef } from '../../domain/types';

interface ArtistLinksProps {
  artists: readonly ArtistRef[];
  className?: string;
  /** Rendered as plain text (e.g. inside another interactive element). */
  plain?: boolean;
  /** Underline only on hover — for dense index rows and tiles. */
  quiet?: boolean;
}

/** "Artist A, Artist B" with each name linking to its catalogue page. */
export function ArtistLinks({ artists, className, plain = false, quiet = false }: ArtistLinksProps) {
  return (
    <span className={className}>
      {artists.map((artist, index) => (
        <Fragment key={`${artist.id}-${index}`}>
          {index > 0 && ', '}
          {plain || !artist.id ? (
            artist.name
          ) : (
            <Link className={quiet ? 'link-quiet' : 'link'} to={`/artist/${artist.id}`}>
              {artist.name}
            </Link>
          )}
        </Fragment>
      ))}
    </span>
  );
}
