import { useEffect, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router';
import { CallbackPage } from '../auth/CallbackPage';
import { ConnectPage } from '../auth/ConnectPage';
import type { SessionMode } from '../catalogue/data/CatalogueSource';
import { AlbumPage } from '../catalogue/pages/AlbumPage';
import { ArtistPage } from '../catalogue/pages/ArtistPage';
import { HomePage } from '../catalogue/pages/HomePage';
import { NotFoundPage } from '../catalogue/pages/NotFoundPage';
import { NowPlayingPage } from '../catalogue/pages/NowPlayingPage';
import { SearchPage } from '../search/SearchPage';
import { useAppServices, useAuthState } from './appContext';
import {
  createPreviewSession,
  createSpotifySession,
  isPreviewRequested,
  retainEngine,
  setPreviewRequested,
  type Session,
} from './session';
import { SessionControlsContext, type SessionControls } from './sessionControls';
import { SessionContext } from './sessionContext';
import { AppShell } from './shell/AppShell';

function SessionScope({ session }: { session: Session }) {
  return (
    <SessionContext.Provider value={session}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="now-playing" element={<NowPlayingPage />} />
          <Route path="album/:albumId" element={<AlbumPage />} />
          <Route path="artist/:artistId" element={<ArtistPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </SessionContext.Provider>
  );
}

/**
 * Chooses the session: Spotify when authorized, the offline preview when the
 * user asked for it, otherwise the connect screen. One PlayerStore per
 * session survives route changes.
 */
export function SessionRoot() {
  const services = useAppServices();
  const auth = useAuthState();
  const [previewRequested, setPreview] = useState(() => services.config.previewEnabled && isPreviewRequested());

  const mode: SessionMode | null = auth.status === 'signed-in' ? 'spotify' : previewRequested ? 'preview' : null;

  const session = useMemo(
    () => (mode === 'spotify' ? createSpotifySession(services) : mode === 'preview' ? createPreviewSession(services) : null),
    [mode, services],
  );

  useEffect(() => (session ? retainEngine(session.engine) : undefined), [session]);

  // `?preview` in the URL starts the preview; remember it for reloads in this tab.
  useEffect(() => {
    if (previewRequested) setPreviewRequested(true);
  }, [previewRequested]);

  const controls = useMemo<SessionControls>(
    () => ({
      enterPreview: () => {
        setPreviewRequested(true);
        setPreview(true);
      },
      exitPreview: () => {
        setPreviewRequested(false);
        setPreview(false);
        services.queryClient.removeQueries({ queryKey: ['preview'] });
      },
      signOut: () => {
        services.auth?.logout();
        services.queryClient.removeQueries({ queryKey: ['spotify'] });
      },
    }),
    [services],
  );

  return (
    <SessionControlsContext.Provider value={controls}>
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="*" element={session ? <SessionScope session={session} /> : <ConnectPage />} />
      </Routes>
    </SessionControlsContext.Provider>
  );
}
