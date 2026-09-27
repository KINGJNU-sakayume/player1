import { useRef } from 'react';
import { useEngine, usePlayerSnapshot } from '../../../playback/hooks';
import { IconButton } from '../Button';
import { Slider } from '../Slider';
import styles from './PlaybackControls.module.css';

export function VolumeControl() {
  const snapshot = usePlayerSnapshot();
  const engine = useEngine();
  const restoreTo = useRef(0.6);
  const volume = snapshot.volume ?? 0;
  const supported = Boolean(snapshot.track) && snapshot.volume !== null && snapshot.device?.supportsVolume !== false;
  const muted = volume <= 0.001;

  return (
    <div className={styles.volume}>
      <IconButton
        label={muted ? 'Unmute' : 'Mute'}
        icon={muted ? 'volume-mute' : 'volume'}
        disabled={!supported}
        onClick={() => {
          if (muted) {
            void engine.setVolume(restoreTo.current || 0.6);
          } else {
            restoreTo.current = volume;
            void engine.setVolume(0);
          }
        }}
      />
      <Slider
        className={styles.volumeSlider}
        label="Volume"
        value={volume}
        disabled={!supported}
        step={0.05}
        bigStep={0.2}
        scale={100}
        valueText={(fraction) => `${Math.round(fraction * 100)} percent`}
        commitDelayMs={250}
        onCommit={(fraction) => void engine.setVolume(fraction)}
      />
    </div>
  );
}
