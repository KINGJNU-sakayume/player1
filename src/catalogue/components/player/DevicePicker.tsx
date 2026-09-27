import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { useSession } from '../../../app/sessionContext';
import { useEngine, usePlayerSelector } from '../../../playback/hooks';
import { describeSpotifyError } from '../../../spotify/errors';
import { Icon } from '../Icon';
import styles from './PlaybackControls.module.css';

/** Shows the active device and transfers playback to another Spotify Connect device. */
export function DevicePicker() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const engine = useEngine();
  const { mode } = useSession();
  const device = usePlayerSelector((s) => s.snapshot.device);
  const sdk = usePlayerSelector((s) => s.sdk);

  const devices = useQuery({
    queryKey: [mode, 'devices'],
    queryFn: () => engine.getDevices(),
    enabled: open,
    staleTime: 0,
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = device ? (device.isThisBrowser ? 'This browser' : device.name) : 'No device';

  return (
    <div className={styles.device} ref={rootRef}>
      <button
        type="button"
        className={styles.deviceButton}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Playback device: ${device ? device.name : 'none'}. Choose device`}
        title="Choose playback device"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="device" size={20} />
        <span className={styles.deviceName}>{label}</span>
      </button>

      {open && (
        <div id={panelId} className={styles.devicePanel} role="group" aria-label="Playback devices">
          <p className={styles.panelTitle}>Play on</p>
          {devices.isPending ? (
            <p className={styles.panelNote}>Looking for devices…</p>
          ) : devices.isError ? (
            <p className={styles.panelNote}>{describeSpotifyError(devices.error).body}</p>
          ) : devices.data.length === 0 ? (
            <p className={styles.panelNote}>
              No Spotify devices are online. Open Spotify on a phone, computer or speaker, then check again.
            </p>
          ) : (
            <ul className={styles.deviceList}>
              {devices.data.map((d) => (
                <li key={d.id ?? d.name}>
                  <button
                    type="button"
                    className={styles.deviceOption}
                    disabled={!d.id || d.isRestricted || d.isActive}
                    onClick={() => {
                      if (!d.id) return;
                      engine.activateAudio();
                      void engine.transferTo(d.id, true);
                      setOpen(false);
                    }}
                  >
                    <Icon name={d.isThisBrowser ? 'disc' : 'device'} size={18} />
                    <span>
                      {d.isThisBrowser ? 'This browser' : d.name}
                      <br />
                      <span className={styles.deviceMeta}>{d.isRestricted ? `${d.type} · not controllable` : d.type}</span>
                    </span>
                    {d.isActive && <span className={styles.deviceActive}>Playing</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {sdk.kind === 'error' && <p className={styles.panelNote}>Browser playback: {sdk.message}</p>}
          <p className={styles.panelNote}>
            <button type="button" className="link" onClick={() => void devices.refetch()}>
              Check again
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
