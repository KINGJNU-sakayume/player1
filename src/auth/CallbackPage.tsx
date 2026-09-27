import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAppServices } from '../app/appContext';
import { ButtonLink } from '../catalogue/components/Button';
import { LoadingLine, StatePanel } from '../catalogue/components/StatePanel';
import { SpotifyAuthError, type SpotifyAuth } from './authService';
import styles from './ConnectPage.module.css';

// The authorization code is single-use; React StrictMode runs effects twice.
const completions = new Map<string, Promise<{ returnTo: string }>>();

function completeOnce(auth: SpotifyAuth, search: string) {
  let pending = completions.get(search);
  if (!pending) {
    pending = auth.completeLogin(search);
    completions.set(search, pending);
  }
  return pending;
}

/** OAuth redirect target: exchanges the code (PKCE) and returns to where the user started. */
export function CallbackPage() {
  const { auth } = useAppServices();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<SpotifyAuthError | Error | null>(null);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    completeOnce(auth, location.search)
      .then(({ returnTo }) => {
        if (!cancelled) navigate(returnTo.startsWith('/') ? returnTo : '/', { replace: true });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason : new Error('Authorization failed.'));
      });
    return () => {
      cancelled = true;
    };
  }, [auth, location.search, navigate]);

  const cancelled = error instanceof SpotifyAuthError && error.kind === 'access-denied';

  return (
    <div className={styles.page}>
      <div className={styles.rail}>
        <span className={styles.logo} aria-hidden="true">
          ARC
        </span>
      </div>
      <main className={styles.content} id="main">
        <div className={styles.intro}>
          {!auth ? (
            <StatePanel eyebrow="Authorization" title="Spotify isn’t configured" actions={<ButtonLink to="/">Back</ButtonLink>}>
              <p>Set VITE_SPOTIFY_CLIENT_ID before connecting.</p>
            </StatePanel>
          ) : error ? (
            <StatePanel
              eyebrow="Authorization"
              tone={cancelled ? 'neutral' : 'alert'}
              title={cancelled ? 'Authorization was cancelled' : 'Spotify authorization failed'}
              actions={
                <ButtonLink to="/" variant="primary">
                  Back to ARC Music
                </ButtonLink>
              }
            >
              <p>{cancelled ? 'Nothing was shared with ARC Music.' : error.message}</p>
            </StatePanel>
          ) : (
            <LoadingLine label="Completing Spotify authorization…" />
          )}
        </div>
      </main>
    </div>
  );
}
