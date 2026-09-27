import { useSyncExternalStore } from 'react';
import { usePageTitle } from '../../app/pageTitle';
import { useSession } from '../../app/sessionContext';
import { formatRelativeTime, pluralise } from '../../lib/format';
import { usePlay } from '../../playback/hooks';
import { useCurrentTrackMatcher } from '../../playback/useCurrentTrack';
import { describeSpotifyError } from '../../spotify/errors';
import { usePlaylists, useRecentlyPlayed, useSavedAlbums } from '../data/queries';
import { Button } from '../components/Button';
import { AlbumTile } from '../components/lists/AlbumTile';
import styles from '../components/lists/Lists.module.css';
import { PlaylistRow } from '../components/lists/PlaylistRow';
import { TrackIndexRow } from '../components/lists/TrackIndexRow';
import { SectionHeader } from '../components/SectionHeader';
import { LoadingLine, StatePanel } from '../components/StatePanel';
import page from './Page.module.css';
import home from './HomePage.module.css';

const RECENT_LIMIT = 8;

// Relative times refresh once a minute without re-rendering on every frame.
const minuteClock = {
  subscribe(listener: () => void) {
    const timer = setInterval(listener, 60_000);
    return () => clearInterval(timer);
  },
  getSnapshot: () => Math.floor(Date.now() / 60_000) * 60_000,
};

function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  const { title, body } = describeSpotifyError(error);
  return (
    <StatePanel
      size="compact"
      tone="alert"
      title={title}
      actions={
        <Button variant="secondary" icon="refresh" onClick={retry}>
          Try again
        </Button>
      }
    >
      <p>{body}</p>
    </StatePanel>
  );
}

function RecentlyPlayed() {
  const recent = useRecentlyPlayed();
  const play = usePlay();
  const isCurrent = useCurrentTrackMatcher();
  const now = useSyncExternalStore(minuteClock.subscribe, minuteClock.getSnapshot);

  return (
    <section className={page.section} aria-labelledby="recent-title">
      <SectionHeader id="recent-title" title="Recently played" meta={recent.data ? pluralise(Math.min(recent.data.length, RECENT_LIMIT), 'track') : null} />
      {recent.isPending ? (
        <LoadingLine label="Loading your listening history…" />
      ) : recent.isError ? (
        <ErrorState error={recent.error} retry={() => void recent.refetch()} />
      ) : recent.data.length === 0 ? (
        <StatePanel size="compact" title="Nothing played yet">
          <p>Tracks you play on any Spotify device will be listed here.</p>
        </StatePanel>
      ) : (
        <ol className={styles.index}>
          {recent.data.slice(0, RECENT_LIMIT).map((item, index) => {
            const contextUri =
              item.context && (item.context.type === 'album' || item.context.type === 'playlist')
                ? item.context.uri
                : item.track.album.uri || undefined;
            return (
              <TrackIndexRow
                key={`${item.track.spotifyTrackId}-${item.playedAt}`}
                track={item.track}
                position={index + 1}
                current={isCurrent({ id: item.track.spotifyTrackId, uri: item.track.uri })}
                aside={<time dateTime={item.playedAt}>{formatRelativeTime(item.playedAt, now)}</time>}
                onPlay={() =>
                  play(
                    contextUri
                      ? { contextUri, offsetUri: item.track.uri }
                      : { uris: [item.track.uri] },
                    { openNowPlaying: true },
                  )
                }
              />
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Playlists() {
  const playlists = usePlaylists();
  const play = usePlay();
  const items = playlists.data?.pages.flatMap((p) => p.items) ?? [];
  const total = playlists.data?.pages[0]?.total;

  return (
    <section className={page.section} aria-labelledby="playlists-title">
      <SectionHeader id="playlists-title" title="Playlists" meta={total !== undefined ? total : null} />
      {playlists.isPending ? (
        <LoadingLine label="Loading playlists…" />
      ) : playlists.isError ? (
        <ErrorState error={playlists.error} retry={() => void playlists.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel size="compact" title="No playlists">
          <p>Playlists you create or follow on Spotify appear here.</p>
        </StatePanel>
      ) : (
        <>
          <ol className={styles.index}>
            {items.map((playlist, index) => (
              <PlaylistRow
                key={playlist.id}
                playlist={playlist}
                position={index + 1}
                onPlay={() => play({ contextUri: playlist.uri }, { openNowPlaying: true })}
              />
            ))}
          </ol>
          {playlists.hasNextPage && (
            <div className={page.more}>
              <Button onClick={() => void playlists.fetchNextPage()} disabled={playlists.isFetchingNextPage}>
                {playlists.isFetchingNextPage ? 'Loading…' : 'Show more playlists'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SavedAlbums() {
  const albums = useSavedAlbums();
  const play = usePlay();
  const items = albums.data?.pages.flatMap((p) => p.items) ?? [];
  const total = albums.data?.pages[0]?.total;

  return (
    <section className={page.section} aria-labelledby="albums-title">
      <SectionHeader id="albums-title" title="Saved albums" meta={total !== undefined ? total : null} />
      {albums.isPending ? (
        <LoadingLine label="Loading saved albums…" />
      ) : albums.isError ? (
        <ErrorState error={albums.error} retry={() => void albums.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel size="compact" title="No saved albums">
          <p>Albums you save on Spotify — or from an album page here — collect in this catalogue.</p>
        </StatePanel>
      ) : (
        <>
          <ul className={styles.grid}>
            {items.map((album) => (
              <AlbumTile key={album.id} album={album} onPlay={() => play({ contextUri: album.uri }, { openNowPlaying: true })} />
            ))}
          </ul>
          {albums.hasNextPage && (
            <div className={page.more}>
              <Button onClick={() => void albums.fetchNextPage()} disabled={albums.isFetchingNextPage}>
                {albums.isFetchingNextPage ? 'Loading…' : 'Show more albums'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function HomePage() {
  const { mode } = useSession();
  usePageTitle('Home');

  return (
    <div className={page.page}>
      <header className={page.pageHead}>
        <div>
          <p className={page.eyebrow}>{mode === 'preview' ? 'Preview catalogue' : 'Your Spotify library'}</p>
          <h1 className={page.pageTitle}>Library</h1>
          {mode === 'preview' && (
            <p className={home.lede}>
              A sample catalogue for exploring the interface without Spotify. Track lists and timings are sample data;
              lyric lines are original test lines.
            </p>
          )}
        </div>
      </header>

      <div className={page.stack}>
        <div className={home.band}>
          <RecentlyPlayed />
          <Playlists />
        </div>
        <SavedAlbums />
      </div>
    </div>
  );
}
