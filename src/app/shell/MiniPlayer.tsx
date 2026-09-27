import { useRef } from 'react';
import { Link } from 'react-router';
import { IconButton } from '../../catalogue/components/Button';
import { Cover } from '../../catalogue/components/Cover';
import { joinArtistNames } from '../../lib/format';
import { useEngine, usePlayerSelector, useProgressProperty } from '../../playback/hooks';
import styles from './MiniPlayer.module.css';

/** Compact now-playing strip in the top bar (hidden on the Now Playing page). */
export function MiniPlayer() {
  const track = usePlayerSelector((s) => s.snapshot.track);
  const paused = usePlayerSelector((s) => s.snapshot.paused);
  const engine = useEngine();
  const progressRef = useRef<HTMLDivElement>(null);
  useProgressProperty(progressRef);

  if (!track) return null;
  const artists = joinArtistNames(track.artists);

  return (
    <div className={styles.mini}>
      <Link to="/now-playing" className={styles.link} aria-label={`Now playing: ${track.title} by ${artists}. Open Now Playing`}>
        <Cover
          className={styles.cover}
          images={track.album.images}
          displaySize={40}
          alt=""
          title={track.album.name}
          paletteKey={track.album.id}
        />
        <span className={styles.text} aria-hidden="true">
          <span className={styles.title}>{track.title}</span>
          <span className={styles.artist}>{artists}</span>
        </span>
      </Link>
      <IconButton
        label={paused ? 'Play' : 'Pause'}
        icon={paused ? 'play' : 'pause'}
        onClick={() => {
          engine.activateAudio();
          void engine.togglePlay();
        }}
      />
      <div ref={progressRef} className={styles.progress} aria-hidden="true" />
    </div>
  );
}
