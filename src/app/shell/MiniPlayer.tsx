import { useRef } from 'react';
import { Link } from 'react-router';
import { IconButton } from '../../catalogue/components/Button';
import { Cover } from '../../catalogue/components/Cover';
import { Icon } from '../../catalogue/components/Icon';
import { joinArtistNames } from '../../lib/format';
import { useEngine, usePlayerSelector, useProgressProperty } from '../../playback/hooks';
import styles from './MiniPlayer.module.css';

/** Compact now-playing strip in the top bar (hidden on the Now Playing page). */
export function MiniPlayer() {
  const track = usePlayerSelector((s) => s.snapshot.track);
  const paused = usePlayerSelector((s) => s.snapshot.paused);
  const disallows = usePlayerSelector((s) => s.snapshot.disallows);
  const engine = useEngine();
  const progressRef = useRef<HTMLDivElement>(null);
  useProgressProperty(progressRef);

  if (!track) return null;
  const artists = joinArtistNames(track.artists);

  return (
    <div className={styles.mini} role="group" aria-label="Mini player">
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
      <div className={styles.transport}>
        <IconButton
          size="small"
          label="Previous track"
          icon="previous"
          disabled={disallows.skippingPrev}
          onClick={() => void engine.previous()}
        />
        <button
          type="button"
          className={styles.play}
          aria-label={paused ? 'Play' : 'Pause'}
          disabled={paused ? disallows.resuming : disallows.pausing}
          onClick={() => {
            engine.activateAudio();
            void engine.togglePlay();
          }}
        >
          <Icon name={paused ? 'play' : 'pause'} size={18} />
        </button>
        <IconButton
          size="small"
          label="Next track"
          icon="next"
          disabled={disallows.skippingNext}
          onClick={() => void engine.next()}
        />
      </div>
      <div ref={progressRef} className={styles.progress} aria-hidden="true" />
    </div>
  );
}
