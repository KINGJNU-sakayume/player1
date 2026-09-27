import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconButton } from '../../catalogue/components/Button';
import { Cover } from '../../catalogue/components/Cover';
import { LoadingLine, StatePanel } from '../../catalogue/components/StatePanel';
import type { TrackIdentity } from '../../domain/types';
import { cx } from '../../lib/cx';
import { formatDuration, joinArtistNames } from '../../lib/format';
import { useEngine, usePlayerSelector } from '../../playback/hooks';
import { describeSpotifyError } from '../../spotify/errors';
import { useSession } from '../sessionContext';
import styles from './QueueDrawer.module.css';
import { QueueDrawerContext } from './queueDrawerContext';

export function QueueDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const controls = useMemo(
    () => ({ isOpen, open: () => setOpen(true), close: () => setOpen(false) }),
    [isOpen],
  );
  return (
    <QueueDrawerContext.Provider value={controls}>
      {children}
      <QueueDrawer open={isOpen} onClose={() => setOpen(false)} />
    </QueueDrawerContext.Provider>
  );
}

function contextLabel(context: { type: string; name: string | null } | null, track: TrackIdentity | null): string | null {
  if (!context) return null;
  if (context.name) return context.name;
  if (context.type === 'album' && track) return `Album · ${track.album.name}`;
  if (context.type === 'playlist') return 'a playlist';
  if (context.type === 'artist' && track) return `Artist · ${joinArtistNames(track.artists)}`;
  return null;
}

function QueueRow({ track, index }: { track: TrackIdentity; index: number }) {
  return (
    <li className={styles.row}>
      <span className={styles.index}>{String(index).padStart(2, '0')}</span>
      <Cover images={track.album.images} displaySize={44} alt="" title={track.album.name} paletteKey={track.album.id} />
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{track.title}</span>
        <span className={styles.rowArtist}>{joinArtistNames(track.artists)}</span>
      </span>
      <span className={styles.duration}>{formatDuration(track.durationMs)}</span>
    </li>
  );
}

/** Right-hand drawer with the real Spotify queue. Informational: the API cannot reorder it. */
function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const engine = useEngine();
  const { mode } = useSession();
  const track = usePlayerSelector((s) => s.snapshot.track);
  const context = usePlayerSelector((s) => s.snapshot.context);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const queue = useQuery({
    queryKey: [mode, 'queue', track?.spotifyTrackId ?? null],
    queryFn: () => engine.getQueue(),
    enabled: open,
    staleTime: 5_000,
  });

  const from = contextLabel(context, track);

  return (
    <dialog
      ref={dialogRef}
      className={styles.drawer}
      aria-labelledby="queue-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id="queue-title" className={styles.title}>
            Queue
          </h2>
          <IconButton label="Close queue" icon="close" onClick={onClose} />
        </header>

        <section className={styles.current} aria-label="Now playing">
          <p className={styles.label}>Now playing</p>
          {track ? (
            <ul>
              <li className={cx(styles.row, styles.currentRow)}>
                <Cover images={track.album.images} displaySize={56} alt="" title={track.album.name} paletteKey={track.album.id} />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{track.title}</span>
                  <span className={styles.rowArtist}>{joinArtistNames(track.artists)}</span>
                </span>
                <span className={styles.duration}>{formatDuration(track.durationMs)}</span>
              </li>
            </ul>
          ) : (
            <p className={styles.context}>Nothing is playing.</p>
          )}
          {from && <p className={styles.context}>Playing from {from}</p>}
        </section>

        <section className={styles.list} aria-label="Next up">
          <p className={styles.label}>Next up</p>
          {queue.isPending && open ? (
            <LoadingLine label="Reading the queue from Spotify…" />
          ) : queue.isError ? (
            <StatePanel size="compact" title={describeSpotifyError(queue.error).title}>
              {describeSpotifyError(queue.error).body}
            </StatePanel>
          ) : queue.data && queue.data.upNext.length > 0 ? (
            <ol>
              {queue.data.upNext.slice(0, 40).map((item, index) => (
                <QueueRow key={`${item.uri}-${index}`} track={item} index={index + 1} />
              ))}
            </ol>
          ) : (
            <p className={styles.context}>The queue is empty.</p>
          )}
        </section>

        <p className={styles.note}>
          Spotify’s Web API can list the queue but not reorder or remove items. Changes made in other Spotify apps
          appear here.
        </p>
      </div>
    </dialog>
  );
}
