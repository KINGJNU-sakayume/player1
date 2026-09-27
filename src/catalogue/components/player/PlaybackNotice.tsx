import { useSession } from '../../../app/sessionContext';
import { cx } from '../../../lib/cx';
import { useEngine, usePlayerSelector } from '../../../playback/hooks';
import styles from './PlaybackControls.module.css';

/**
 * One line of playback feedback under the controls: which device is playing,
 * and any problem with a way forward. Never a modal, never blocks playback.
 */
export function PlaybackNotice() {
  const engine = useEngine();
  const { mode } = useSession();
  const issue = usePlayerSelector((s) => s.issue);
  const device = usePlayerSelector((s) => s.snapshot.device);
  const source = usePlayerSelector((s) => s.snapshot.source);
  const sdk = usePlayerSelector((s) => s.sdk);
  const { store } = useSession();

  const playHere =
    sdk.kind === 'ready' ? (
      <button
        type="button"
        className={styles.noticeAction}
        onClick={() => {
          engine.activateAudio();
          void engine.transferToBrowser(true);
        }}
      >
        Play in this browser
      </button>
    ) : null;

  if (issue) {
    const alert = issue.kind !== 'autoplay-blocked';
    return (
      <div className={cx(styles.notice, alert && styles.noticeAlert)} role={alert ? 'alert' : 'status'}>
        <span>{issue.message}</span>
        {issue.kind === 'autoplay-blocked' && (
          <button
            type="button"
            className={styles.noticeAction}
            onClick={() => {
              engine.activateAudio();
              void engine.resume();
            }}
          >
            Start audio
          </button>
        )}
        {issue.kind === 'playback-failed' && (
          <button
            type="button"
            className={styles.noticeAction}
            onClick={() => {
              engine.activateAudio();
              void engine.resume();
            }}
          >
            Try again
          </button>
        )}
        {issue.kind === 'no-active-device' && playHere}
        <button
          type="button"
          className={styles.noticeAction}
          onClick={() => store.dispatch({ type: 'issue/clear' })}
        >
          Dismiss
        </button>
        {issue.hints && issue.hints.length > 0 && (
          <ul className={styles.noticeHints}>
            {issue.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        )}
        {issue.detail && <p className={styles.noticeDetail}>{issue.detail}</p>}
      </div>
    );
  }

  if (mode === 'preview') {
    return (
      <p className={styles.notice} role="status">
        Preview — timing is simulated and no audio plays.
      </p>
    );
  }

  if (source === 'remote' && device) {
    return (
      <p className={styles.notice} role="status">
        <span>
          Playing on <strong>{device.name}</strong>
        </span>
        {playHere}
      </p>
    );
  }

  if (source === 'sdk') {
    return (
      <p className={styles.notice} role="status">
        Playing in this browser
      </p>
    );
  }

  return <p className={styles.notice} aria-hidden="true" />;
}
