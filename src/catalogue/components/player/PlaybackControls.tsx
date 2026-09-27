import { useQueueDrawer } from '../../../app/shell/queueDrawerContext';
import { useEngine, usePlayerSnapshot } from '../../../playback/hooks';
import { IconButton } from '../Button';
import { Icon } from '../Icon';
import { DevicePicker } from './DevicePicker';
import { PlaybackNotice } from './PlaybackNotice';
import styles from './PlaybackControls.module.css';
import { SaveTrackButton } from './SaveTrackButton';
import { ScrubBar } from './ScrubBar';
import { VolumeControl } from './VolumeControl';

/** Transport integrated into the lyric column — not a detached footer. */
export function PlaybackControls() {
  const snapshot = usePlayerSnapshot();
  const engine = useEngine();
  const queue = useQueueDrawer();
  const hasTrack = Boolean(snapshot.track);
  const paused = snapshot.paused;
  const playDisabled = !hasTrack || (paused ? snapshot.disallows.resuming : snapshot.disallows.pausing);

  return (
    <div className={styles.controls}>
      <ScrubBar />
      <div className={styles.transportRow}>
        <div className={styles.transport}>
          <IconButton
            label="Previous track"
            icon="previous"
            disabled={!hasTrack || snapshot.disallows.skippingPrev}
            onClick={() => void engine.previous()}
          />
          <button
            type="button"
            className={styles.play}
            aria-label={paused ? 'Play' : 'Pause'}
            title={paused ? 'Play (Space)' : 'Pause (Space)'}
            aria-keyshortcuts="Space"
            disabled={playDisabled}
            onClick={() => {
              engine.activateAudio();
              void engine.togglePlay();
            }}
          >
            <Icon name={paused ? 'play' : 'pause'} size={24} />
          </button>
          <IconButton
            label="Next track"
            icon="next"
            disabled={!hasTrack || snapshot.disallows.skippingNext}
            onClick={() => void engine.next()}
          />
        </div>
        <div className={styles.secondary}>
          <SaveTrackButton track={snapshot.track} />
          <IconButton label="Open queue" icon="queue" onClick={queue.open} />
          <DevicePicker />
          <VolumeControl />
        </div>
      </div>
      <PlaybackNotice />
    </div>
  );
}
