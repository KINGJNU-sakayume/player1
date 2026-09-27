import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { usePageTitle } from '../app/pageTitle';
import { Button, IconButton } from '../catalogue/components/Button';
import { Portrait } from '../catalogue/components/Cover';
import { Icon } from '../catalogue/components/Icon';
import { AlbumTile } from '../catalogue/components/lists/AlbumTile';
import listStyles from '../catalogue/components/lists/Lists.module.css';
import { PlaylistRow } from '../catalogue/components/lists/PlaylistRow';
import { TrackIndexRow } from '../catalogue/components/lists/TrackIndexRow';
import { SectionHeader } from '../catalogue/components/SectionHeader';
import { LoadingLine, StatePanel } from '../catalogue/components/StatePanel';
import {
  ALL_SEARCH_TYPES,
  searchPageFor,
  useCatalogueSearch,
  useCatalogueSearchPages,
} from '../catalogue/data/queries';
import page from '../catalogue/pages/Page.module.css';
import type { ArtistSummary, Page, SearchResults, SearchType } from '../domain/types';
import { usePlay } from '../playback/hooks';
import { useCurrentTrackMatcher } from '../playback/useCurrentTrack';
import { describeSpotifyError } from '../spotify/errors';
import styles from './SearchPage.module.css';

type Filter = 'all' | SearchType;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'track', label: 'Tracks' },
  { id: 'artist', label: 'Artists' },
  { id: 'album', label: 'Albums' },
  { id: 'playlist', label: 'Playlists' },
];

const DEBOUNCE_MS = 280;
const PRIMARY = '[data-primary]';

function isFilter(value: string | null): value is Filter {
  return FILTERS.some((f) => f.id === value);
}

function ArtistCard({ artist }: { artist: ArtistSummary }) {
  return (
    <li className={styles.artist}>
      <Link to={`/artist/${artist.id}`} tabIndex={-1} aria-hidden="true">
        <Portrait images={artist.images} displaySize={150} name={artist.name} />
      </Link>
      <Link className={styles.artistName} to={`/artist/${artist.id}`} data-primary>
        {artist.name}
      </Link>
      <span className={styles.artistType}>Artist</span>
    </li>
  );
}

function ResultSections({
  results,
  filter,
  onShowAll,
}: {
  results: SearchResults;
  filter: Filter;
  onShowAll: (type: SearchType) => void;
}) {
  const play = usePlay();
  const isCurrent = useCurrentTrackMatcher();
  const all = filter === 'all';
  const cap = (n: number) => (all ? n : Number.POSITIVE_INFINITY);
  const showAll = (type: SearchType, count: number, hasMore: boolean) =>
    all && (count > 0 || hasMore) ? (
      <Button variant="quiet" icon="arrow-right" onClick={() => onShowAll(type)}>
        All {FILTERS.find((f) => f.id === type)?.label.toLowerCase()}
      </Button>
    ) : null;

  const sections: ReactNode[] = [];

  if (results.tracks && results.tracks.items.length > 0) {
    const items = results.tracks.items.slice(0, cap(5));
    sections.push(
      <section key="tracks" aria-labelledby="result-tracks">
        <SectionHeader
          id="result-tracks"
          title="Tracks"
          action={showAll('track', results.tracks.items.length, results.tracks.hasMore)}
        />
        <ol className={listStyles.index}>
          {items.map((track, index) => (
            <TrackIndexRow
              key={`${track.uri}-${index}`}
              track={track}
              position={index + 1}
              current={isCurrent({ id: track.spotifyTrackId, uri: track.uri })}
              onPlay={() =>
                play(
                  track.album.uri ? { contextUri: track.album.uri, offsetUri: track.uri } : { uris: [track.uri] },
                  { openNowPlaying: true },
                )
              }
            />
          ))}
        </ol>
      </section>,
    );
  }

  if (results.artists && results.artists.items.length > 0) {
    sections.push(
      <section key="artists" aria-labelledby="result-artists">
        <SectionHeader
          id="result-artists"
          title="Artists"
          action={showAll('artist', results.artists.items.length, results.artists.hasMore)}
        />
        <ul className={styles.artists}>
          {results.artists.items.slice(0, cap(6)).map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </ul>
      </section>,
    );
  }

  if (results.albums && results.albums.items.length > 0) {
    sections.push(
      <section key="albums" aria-labelledby="result-albums">
        <SectionHeader
          id="result-albums"
          title="Albums"
          action={showAll('album', results.albums.items.length, results.albums.hasMore)}
        />
        <ul className={listStyles.grid}>
          {results.albums.items.slice(0, cap(6)).map((album) => (
            <AlbumTile
              key={album.id}
              album={album}
              showType
              onPlay={() => play({ contextUri: album.uri }, { openNowPlaying: true })}
            />
          ))}
        </ul>
      </section>,
    );
  }

  if (results.playlists && results.playlists.items.length > 0) {
    sections.push(
      <section key="playlists" aria-labelledby="result-playlists">
        <SectionHeader
          id="result-playlists"
          title="Playlists"
          action={showAll('playlist', results.playlists.items.length, results.playlists.hasMore)}
        />
        <ol className={listStyles.index}>
          {results.playlists.items.slice(0, cap(5)).map((playlist, index) => (
            <PlaylistRow
              key={playlist.id}
              playlist={playlist}
              position={index + 1}
              onPlay={() => play({ contextUri: playlist.uri }, { openNowPlaying: true })}
            />
          ))}
        </ol>
      </section>,
    );
  }

  return <>{sections}</>;
}

function combine<T>(parts: Array<Page<T> | null>): Page<T> | null {
  const present = parts.filter((part): part is Page<T> => part !== null);
  const last = present[present.length - 1];
  if (!last) return null;
  const items = present.flatMap((part) => part.items);
  return { items, offset: 0, limit: items.length, total: last.total, hasMore: last.hasMore };
}

/** Flattens the pages of a single-type infinite search into one result set. */
function mergePages(pages: SearchResults[] | undefined, type: SearchType): SearchResults {
  const all = pages ?? [];
  return {
    tracks: type === 'track' ? combine(all.map((p) => p.tracks)) : null,
    artists: type === 'artist' ? combine(all.map((p) => p.artists)) : null,
    albums: type === 'album' ? combine(all.map((p) => p.albums)) : null,
    playlists: type === 'playlist' ? combine(all.map((p) => p.playlists)) : null,
  };
}

function countResults(results: SearchResults | undefined): number {
  if (!results) return 0;
  return (
    (results.tracks?.items.length ?? 0) +
    (results.artists?.items.length ?? 0) +
    (results.albums?.items.length ?? 0) +
    (results.playlists?.items.length ?? 0)
  );
}

/**
 * Spotify search. The URL (?q=&type=) is the source of truth; typing updates
 * it after a short debounce. Superseded requests are aborted and never shown.
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const rawType = params.get('type');
  const filter: Filter = isFilter(rawType) ? rawType : 'all';
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const value = draft ?? query;
  usePageTitle('Search', query || null);

  const updateParams = useCallback(
    (next: { q?: string; type?: Filter }) => {
      setParams(
        (previous) => {
          const merged = new URLSearchParams(previous);
          const q = next.q ?? merged.get('q') ?? '';
          const type = next.type ?? (isFilter(merged.get('type')) ? (merged.get('type') as Filter) : 'all');
          if (q.trim()) merged.set('q', q.trim());
          else merged.delete('q');
          if (type === 'all') merged.delete('type');
          else merged.set('type', type);
          return merged;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Debounce: commit the draft to the URL after the user pauses typing.
  useEffect(() => {
    if (draft === null) return;
    const timer = setTimeout(() => {
      updateParams({ q: draft });
      setDraft(null);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, updateParams]);

  const combined = useCatalogueSearch(query, ALL_SEARCH_TYPES, 0, 10);
  const paged = useCatalogueSearchPages(filter === 'all' ? '' : query, filter === 'all' ? 'track' : filter);
  const active = filter === 'all' ? combined : paged;
  const results = filter === 'all' ? combined.data : mergePages(paged.data?.pages, filter as SearchType);
  const total = countResults(results);

  const focusResult = (direction: 1 | -1 | 'first' | 'last') => {
    const items = Array.from(resultsRef.current?.querySelectorAll<HTMLElement>(PRIMARY) ?? []);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let target = 0;
    if (direction === 'last') target = items.length - 1;
    else if (direction === 1) target = Math.min(items.length - 1, index + 1);
    else if (direction === -1) target = index - 1;
    if (target < 0) {
      inputRef.current?.focus();
      return;
    }
    items[target]?.focus();
  };

  const onResultsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') focusResult(1);
    else if (event.key === 'ArrowUp') focusResult(-1);
    else if (event.key === 'Home' && event.ctrlKey) focusResult('first');
    else if (event.key === 'End' && event.ctrlKey) focusResult('last');
    else if (event.key === 'Escape') inputRef.current?.focus();
    else return;
    event.preventDefault();
  };

  const typeLabel = FILTERS.find((f) => f.id === filter)?.label.toLowerCase() ?? 'results';
  const available = filter === 'all' || !results ? null : searchPageFor(results, filter)?.total ?? null;
  let status = '';
  if (query && active.isFetching && !results) status = 'Searching…';
  else if (query && active.isFetching) status = 'Updating…';
  else if (query && results && total > 0) {
    status =
      filter === 'all'
        ? `Top results for “${query}”`
        : `Showing ${total}${available !== null && available > total ? ` of ${available}` : ''} ${typeLabel} for “${query}”`;
  }

  return (
    <div className={page.page}>
      <header className={styles.head}>
        <h1 className="visually-hidden">Search</h1>
        <form
          role="search"
          className={styles.field}
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ q: value });
            setDraft(null);
            focusResult('first');
          }}
        >
          <Icon name="search" size={28} className={styles.fieldIcon} />
          <label htmlFor="search-input" className="visually-hidden">
            Search tracks, artists, albums and playlists
          </label>
          <input
            ref={inputRef}
            id="search-input"
            className={styles.input}
            type="search"
            value={value}
            placeholder="Tracks, artists, albums, playlists"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            aria-keyshortcuts="/"
            aria-describedby="search-status"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                focusResult('first');
              } else if (event.key === 'Escape' && value) {
                event.preventDefault();
                setDraft('');
              }
            }}
          />
          {value && (
            <IconButton
              className={styles.clear}
              label="Clear search"
              icon="close"
              onClick={() => {
                setDraft(null);
                updateParams({ q: '' });
                inputRef.current?.focus();
              }}
            />
          )}
        </form>

        <div className={styles.filters} role="group" aria-label="Result type">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={styles.filter}
              aria-pressed={filter === f.id}
              onClick={() => updateParams({ type: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p id="search-status" className={styles.status} role="status" aria-live="polite">
          {status}
        </p>
      </header>

      {!query ? (
        <div className={styles.hint}>
          <p>Search Spotify’s catalogue. Results open in the same player — nothing leaves the current playback.</p>
          <p className={styles.keys}>
            <kbd>/</kbd> focus search · <kbd>↓</kbd> <kbd>↑</kbd> move through results · <kbd>Enter</kbd> open or play ·{' '}
            <kbd>Esc</kbd> back to the field
          </p>
        </div>
      ) : active.isError && !results ? (
        <StatePanel tone="alert" title={describeSpotifyError(active.error).title}>
          <p>{describeSpotifyError(active.error).body}</p>
        </StatePanel>
      ) : !results ? (
        <LoadingLine label="Searching…" />
      ) : total === 0 ? (
        <StatePanel title={`No results for “${query}”`}>
          <p>Check the spelling, or try an artist, album or track name.</p>
        </StatePanel>
      ) : (
        <div ref={resultsRef} className={styles.results} onKeyDown={onResultsKeyDown}>
          <ResultSections results={results} filter={filter} onShowAll={(type) => updateParams({ type })} />
          {filter !== 'all' && paged.hasNextPage && (
            <div>
              <Button onClick={() => void paged.fetchNextPage()} disabled={paged.isFetchingNextPage}>
                {paged.isFetchingNextPage ? 'Loading…' : 'Show more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
