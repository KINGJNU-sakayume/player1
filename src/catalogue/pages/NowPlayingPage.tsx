import { Link } from 'react-router';
import { usePageTitle } from '../../app/pageTitle';
import { useSession } from '../../app/sessionContext';
import { joinArtistNames } from '../../lib/format';
import { useEngine, usePlayerSelector, usePlayerSnapshot } from '../../playback/hooks';
import { detectLineLanguage } from '../../translation/languageDetect';
import { ArtistLinks } from '../components/ArtistLinks';
import { Button, ButtonLink } from '../components/Button';
import { Cover } from '../components/Cover';
import { LyricsPanel } from '../components/player/LyricsPanel';
import { PlaybackControls } from '../components/player/PlaybackControls';
import { PlaybackNotice } from '../components/player/PlaybackNotice';
import { LoadingLine, StatePanel } from '../components/StatePanel';
import styles from './NowPlayingPage.module.css';

/**
 * The primary screen. Exactly one viewport high on desktop: the album object
 * (cover, title, artist, album) on the left; synchronised lyrics with
 * integrated controls on the right.
 */
export function NowPlayingPage() {
  const snapshot = usePlayerSnapshot();
  const hydrated = usePlayerSelector((s) => s.hydrated);
  const track = snapshot.track;
  usePageTitle('Now Playing', track?.title ?? null);

  if (!hydrated) return <NowPlayingLoading />;
  if (!track) return <NothingPlaying />;

  const { album } = track;
  return (
    <div className={styles.stage} data-page="now-playing">
      <section className={styles.object} aria-label="Now playing">
        <figure className={styles.art}>
          <Cover
            images={album.images}
            displaySize={640}
            alt={`${album.name} cover`}
            title={album.name}
            subtitle={joinArtistNames(track.artists)}
            paletteKey={album.id}
            shadow="strong"
            priority
          />
          <figcaption className={styles.meta}>
            <h1 className={styles.title} lang={detectLineLanguage(track.title)} title={track.title}>
              {track.title}
            </h1>
            <p className={styles.byline}>
              <ArtistLinks artists={track.artists} />
              {album.id && (
                <>
                  <span className={styles.separator} aria-hidden="true">
                    ·
                  </span>
                  <Link className="link" to={`/album/${album.id}`} lang={detectLineLanguage(album.name)}>
                    {album.name}
                  </Link>
                </>
              )}
            </p>
          </figcaption>
        </figure>
      </section>

      <section className={styles.reading} aria-label="Lyrics and playback controls">
        <LyricsPanel key={track.spotifyTrackId} track={track} />
        <PlaybackControls />
      </section>
    </div>
  );
}

function NowPlayingLoading() {
  const { mode } = useSession();
  return (
    <div className={styles.stage} data-page="now-playing">
      <div className={styles.object}>
        <div className={styles.art}>
          <div className={styles.loadingPlate} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.emptyReading}>
        <LoadingLine label={mode === 'preview' ? 'Opening the preview…' : 'Reading playback state from Spotify…'} />
      </div>
    </div>
  );
}

function NothingPlaying() {
  const sdk = usePlayerSelector((s) => s.sdk);
  const engine = useEngine();

  let title = 'Nothing is playing';
  let body = 'Choose an album or playlist from your library, or resume your last Spotify session here.';
  if (sdk.kind === 'loading') {
    title = 'Starting browser playback…';
    body = 'Connecting this browser to Spotify as a playback device. Music started on another device will appear here.';
  } else if (sdk.kind === 'error') {
    title = 'Browser playback unavailable';
    body = `${sdk.message} Start music on another Spotify device and it will appear here.`;
  }

  return (
    <div className={styles.stage} data-page="now-playing">
      <div className={styles.object}>
        <div className={styles.art}>
          <div className={styles.emptyPlate} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.emptyReading}>
        <StatePanel
          eyebrow="Now Playing"
          title={title}
          actions={
            <>
              <ButtonLink to="/" variant="primary" icon="home">
                Browse your library
              </ButtonLink>
              {sdk.kind === 'ready' && (
                <Button
                  icon="play"
                  onClick={() => {
                    engine.activateAudio();
                    void engine.transferToBrowser(true);
                  }}
                >
                  Resume in this browser
                </Button>
              )}
              <Button variant="quiet" icon="refresh" onClick={() => void engine.resync()}>
                Check again
              </Button>
            </>
          }
        >
          <p>{body}</p>
        </StatePanel>
        <PlaybackNotice />
      </div>
    </div>
  );
}
