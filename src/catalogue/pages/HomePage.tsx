import { useSyncExternalStore } from 'react';
import { usePageTitle } from '../../app/pageTitle';
import { useSession } from '../../app/sessionContext';
import { formatRelativeTime } from '../../lib/format';
import { usePlay } from '../../playback/hooks';
import { useCurrentTrackMatcher } from '../../playback/useCurrentTrack';
import { describeSpotifyError } from '../../spotify/errors';
import {
  useFollowedArtists,
  useLikedTracks,
  usePlaylists,
  useRecentlyPlayed,
  useSavedAlbums,
} from '../data/queries';
import { Button } from '../components/Button';
import { AlbumTile } from '../components/lists/AlbumTile';
import { ArtistTile } from '../components/lists/ArtistTile';
import styles from '../components/lists/Lists.module.css';
import { PlaylistTile } from '../components/lists/PlaylistTile';
import { TrackIndexRow } from '../components/lists/TrackIndexRow';
import { SectionHeader } from '../components/SectionHeader';
import { LoadingLine, StatePanel } from '../components/StatePanel';
import page from './Page.module.css';
import home from './HomePage.module.css';

const RECENT_LIMIT = 5;

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

function LikedSongs() {
  const liked = useLikedTracks(10);
  const play = usePlay();
  const isCurrent = useCurrentTrackMatcher();
  const items = liked.data?.pages.flatMap((p) => p.items) ?? [];
  const total = liked.data?.pages[0]?.total;
  // Liked Songs has no public context URI; the loaded tracks play in order.
  const uris = items.map((track) => track.uri);

  return (
    <section className={page.section} aria-labelledby="liked-title">
      <SectionHeader
        id="liked-title"
        title="Liked songs"
        meta={total !== undefined ? total : null}
        action={
          items.length > 0 && (
            <Button icon="play" onClick={() => play({ uris }, { openNowPlaying: true })}>
              Play all
            </Button>
          )
        }
      />
      {liked.isPending ? (
        <LoadingLine label="Loading liked songs…" />
      ) : liked.isError ? (
        <ErrorState error={liked.error} retry={() => void liked.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel size="compact" title="No liked songs yet">
          <p>Tracks you like — on Spotify or with the heart in Now Playing — collect here.</p>
        </StatePanel>
      ) : (
        <>
          <ol className={styles.index}>
            {items.map((track, index) => (
              <TrackIndexRow
                key={`${track.spotifyTrackId}-${index}`}
                track={track}
                position={index + 1}
                current={isCurrent({ id: track.spotifyTrackId, uri: track.uri })}
                onPlay={() => play({ uris, offsetUri: track.uri }, { openNowPlaying: true })}
              />
            ))}
          </ol>
          {liked.hasNextPage && (
            <div className={page.more}>
              <Button onClick={() => void liked.fetchNextPage()} disabled={liked.isFetchingNextPage}>
                {liked.isFetchingNextPage ? 'Loading…' : 'Show more songs'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FollowedArtists() {
  const artists = useFollowedArtists();
  const play = usePlay();
  const items = artists.data?.pages.flatMap((p) => p.items) ?? [];
  const total = artists.data?.pages[0]?.total;

  return (
    <section className={page.section} aria-labelledby="artists-title">
      <SectionHeader id="artists-title" title="Artists" meta={total ?? (items.length > 0 ? items.length : null)} />
      {artists.isPending ? (
        <LoadingLine label="Loading artists…" />
      ) : artists.isError ? (
        <ErrorState error={artists.error} retry={() => void artists.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel size="compact" title="No followed artists">
          <p>Artists you follow on Spotify appear here.</p>
        </StatePanel>
      ) : (
        <>
          <ul className={styles.artists}>
            {items.map((artist) => (
              <ArtistTile
                key={artist.id}
                artist={artist}
                onPlay={() => play({ contextUri: artist.uri }, { openNowPlaying: true })}
              />
            ))}
          </ul>
          {artists.hasNextPage && (
            <div className={page.more}>
              <Button onClick={() => void artists.fetchNextPage()} disabled={artists.isFetchingNextPage}>
                {artists.isFetchingNextPage ? 'Loading…' : 'Show more artists'}
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
      <SectionHeader id="albums-title" title="Liked albums" meta={total !== undefined ? total : null} />
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

function Playlists() {
  const playlists = usePlaylists();
  const play = usePlay();
  const items = playlists.data?.pages.flatMap((p) => p.items) ?? [];
  const total = playlists.data?.pages[0]?.total;

  return (
    <section className={page.section} aria-labelledby="playlists-title">
      <SectionHeader id="playlists-title" title="Playlists" as="h3" meta={total !== undefined ? total : null} />
      {playlists.isPending ? (
        <LoadingLine label="Loading playlists…" />
      ) : playlists.isError ? (
        <ErrorState error={playlists.error} retry={() => void playlists.refetch()} />
      ) : items.length === 0 ? (
        <p className={home.quiet}>Playlists you create or follow on Spotify appear here.</p>
      ) : (
        <>
          <ul className={styles.gridCompact}>
            {items.map((playlist) => (
              <PlaylistTile
                key={playlist.id}
                playlist={playlist}
                onPlay={() => play({ contextUri: playlist.uri }, { openNowPlaying: true })}
              />
            ))}
          </ul>
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

function RecentlyPlayed() {
  const recent = useRecentlyPlayed();
  const play = usePlay();
  const isCurrent = useCurrentTrackMatcher();
  const now = useSyncExternalStore(minuteClock.subscribe, minuteClock.getSnapshot);

  return (
    <section className={page.section} aria-labelledby="recent-title">
      <SectionHeader id="recent-title" title="Recently played" as="h3" />
      {recent.isPending ? (
        <LoadingLine label="Loading your listening history…" />
      ) : recent.isError ? (
        <ErrorState error={recent.error} retry={() => void recent.refetch()} />
      ) : recent.data.length === 0 ? (
        <p className={home.quiet}>Tracks you play on any Spotify device will be listed here.</p>
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

/**
 * Home is ordered by what is listened to most: liked songs and followed
 * artists first, liked albums next, and playlists / history as a quiet
 * secondary band at the end.
 */
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
          <LikedSongs />
          <FollowedArtists />
        </div>
        <SavedAlbums />
        <div className={home.secondary}>
          <Playlists />
          <RecentlyPlayed />
        </div>
      </div>
    </div>
  );
}
