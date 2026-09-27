import { useLocation } from 'react-router';
import { useAppServices } from '../appContext';
import { useCurrentPageTitle } from '../pageTitle';
import { useSessionControls } from '../sessionControls';
import { useSession } from '../sessionContext';
import styles from './AppShell.module.css';
import { MiniPlayer } from './MiniPlayer';
import { SearchEntry } from './SearchEntry';

export function TopBar() {
  const { section, title } = useCurrentPageTitle();
  const { pathname } = useLocation();
  const { mode } = useSession();
  const { auth } = useAppServices();
  const controls = useSessionControls();

  return (
    <header className={styles.topbar}>
      <p className={styles.context}>
        <span>{section}</span>
        {title && (
          <>
            <span aria-hidden="true">/</span>
            <span className={styles.contextTitle}>{title}</span>
          </>
        )}
      </p>
      <div className={styles.topActions}>
        {mode === 'preview' && (
          <p className={styles.previewTag}>
            <strong>Preview</strong>
            <span className={styles.previewDetail}>Sample catalogue · no audio</span>
            {auth && (
              <button type="button" className="link" onClick={controls.exitPreview}>
                Connect Spotify
              </button>
            )}
          </p>
        )}
        {pathname !== '/search' && <SearchEntry />}
        {pathname !== '/now-playing' && <MiniPlayer />}
      </div>
    </header>
  );
}
