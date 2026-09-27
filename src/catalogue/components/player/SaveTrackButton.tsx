import type { TrackIdentity } from '../../../domain/types';
import { useSavedState, useToggleSaved } from '../../data/queries';
import { IconButton } from '../Button';
import styles from './PlaybackControls.module.css';

/** Like / unlike via PUT|DELETE /me/library (user-library-read + user-library-modify). */
export function SaveTrackButton({ track }: { track: TrackIdentity | null }) {
  const saved = useSavedState(track?.uri);
  const toggle = useToggleSaved();
  const isSaved = saved.data === true;
  const unknown = !track || saved.isPending || saved.isError;

  return (
    <IconButton
      className={isSaved ? styles.saved : undefined}
      label={isSaved ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      icon={isSaved ? 'heart-filled' : 'heart'}
      pressed={isSaved}
      disabled={unknown || toggle.isPending}
      onClick={() => {
        if (track) toggle.mutate({ uri: track.uri, saved: !isSaved });
      }}
    />
  );
}
