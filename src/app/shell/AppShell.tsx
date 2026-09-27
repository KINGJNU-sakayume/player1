import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Button } from '../../catalogue/components/Button';
import { useAppServices, useAuthState } from '../appContext';
import { RouteErrorBoundary } from '../RouteErrorBoundary';
import { GlobalShortcuts } from './GlobalShortcuts';
import { PaletteTokens } from './PaletteTokens';
import { QueueDrawerProvider } from './QueueDrawer';
import { Rail } from './Rail';
import { TopBar } from './TopBar';
import { useStageTheme } from './useNowPlayingTheme';
import styles from './AppShell.module.css';

/** Shown when a stored authorization predates scopes the app now requires. */
function ScopeNotice() {
  const auth = useAuthState();
  const services = useAppServices();
  const { pathname } = useLocation();
  if (auth.status !== 'signed-in' || auth.missingScopes.length === 0 || !services.auth) return null;
  return (
    <div className={styles.notice} role="status">
      <span>ARC Music needs {auth.missingScopes.length} additional Spotify permission(s) for all features.</span>
      <Button variant="secondary" onClick={() => void services.auth?.beginLogin(pathname)}>
        Reconnect Spotify
      </Button>
    </div>
  );
}

/** Persistent shell: rail, top bar, routed page, queue drawer. Player state survives navigation. */
export function AppShell() {
  const { pathname } = useLocation();
  const fixedViewport = pathname === '/now-playing';
  // Now Playing takes on the colour of the album cover.
  const stage = useStageTheme(fixedViewport);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <QueueDrawerProvider>
      <div
        className={styles.app}
        data-fixed-viewport={fixedViewport || undefined}
        data-stage={stage?.tone}
        style={stage?.style}
      >
        <a href="#main" className={styles.skip}>
          Skip to content
        </a>
        <Rail />
        <div className={styles.column}>
          <TopBar />
          <main id="main" tabIndex={-1} className={styles.main}>
            <ScopeNotice />
            <div key={pathname} className={styles.routeFade}>
              <RouteErrorBoundary resetKey={pathname}>
                <Outlet />
              </RouteErrorBoundary>
            </div>
          </main>
        </div>
        <PaletteTokens />
        <GlobalShortcuts />
      </div>
    </QueueDrawerProvider>
  );
}
