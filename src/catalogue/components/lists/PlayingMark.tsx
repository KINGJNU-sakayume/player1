import styles from './Lists.module.css';

/** Small "currently playing" marker in the album accent colour. */
export function PlayingMark({ playing }: { playing: boolean }) {
  return (
    <span className={styles.bars} data-playing={playing || undefined} role="img" aria-label={playing ? 'Playing' : 'Paused'}>
      <span />
      <span />
      <span />
    </span>
  );
}
