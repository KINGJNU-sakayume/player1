import { useRef, useState } from 'react';
import { formatDuration, formatDurationForSpeech } from '../../../lib/format';
import { useEngine, usePlaybackPosition, usePlayerSnapshot, useProgressProperty } from '../../../playback/hooks';
import { Slider } from '../Slider';
import styles from './PlaybackControls.module.css';

/** Seek bar with elapsed / total time. The fill follows the central playback clock. */
export function ScrubBar() {
  const snapshot = usePlayerSnapshot();
  const position = usePlaybackPosition();
  const engine = useEngine();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [previewMs, setPreviewMs] = useState<number | null>(null);
  useProgressProperty(sliderRef);

  const duration = snapshot.durationMs;
  const disabled = !snapshot.track || duration <= 0 || snapshot.disallows.seeking;
  const shownMs = previewMs ?? position;

  return (
    <div className={styles.progressRow}>
      <span className={styles.time} aria-hidden="true">
        {formatDuration(shownMs)}
      </span>
      <Slider
        ref={sliderRef}
        live
        label="Seek"
        value={duration > 0 ? position / duration : 0}
        disabled={disabled}
        step={duration > 0 ? Math.min(1, 5000 / duration) : 0.05}
        bigStep={duration > 0 ? Math.min(1, 30000 / duration) : 0.2}
        scale={duration / 1000}
        valueText={(fraction) =>
          `${formatDurationForSpeech(fraction * duration)} of ${formatDurationForSpeech(duration)}`
        }
        onPreview={(fraction) => setPreviewMs(fraction === null ? null : fraction * duration)}
        onCommit={(fraction) => void engine.seek(Math.min(fraction * duration, Math.max(0, duration - 750)))}
      />
      <span className={styles.time} aria-hidden="true">
        {formatDuration(duration)}
      </span>
    </div>
  );
}
