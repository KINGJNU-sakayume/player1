import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useAppServices, useAuthState } from '../app/appContext';
import { useSessionControls } from '../app/sessionControls';
import { Button } from '../catalogue/components/Button';
import { StatePanel } from '../catalogue/components/StatePanel';
import { SPOTIFY_SCOPES } from '../spotify/scopes';
import styles from './ConnectPage.module.css';

/**
 * Authorization-required state. Also covers "Spotify not configured",
 * "authorization expired" and opening the app on a different origin than the
 * registered redirect URI.
 */
export function ConnectPage() {
  const { config, auth } = useAppServices();
  const authState = useAuthState();
  const controls = useSessionControls();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Connect Spotify · ARC Music';
  }, []);

  const redirectOrigin = (() => {
    try {
      return new URL(config.redirectUri).origin;
    } catch {
      return null;
    }
  })();
  const wrongOrigin = Boolean(auth && redirectOrigin && redirectOrigin !== window.location.origin);
  const returnTo = `${location.pathname}${location.search}`;
  const expired = authState.status === 'expired';

  return (
    <div className={styles.page}>
      <div className={styles.rail}>
        <span className={styles.logo} aria-hidden="true">
          ARC
        </span>
      </div>

      <main className={styles.content} id="main">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{expired ? 'Authorization expired' : 'ARC Music'}</p>
          <h1 className={styles.title}>
            {!auth
              ? 'Spotify isn’t configured yet'
              : expired
                ? 'Reconnect your Spotify library'
                : 'Your Spotify library, set as a catalogue'}
          </h1>
          <p className={styles.lede}>
            {expired && authState.status === 'expired'
              ? authState.message
              : 'ARC Music reads your library and controls Spotify playback — in this browser or on any of your devices. Timed lyrics follow the real playback position.'}
          </p>

          {wrongOrigin && redirectOrigin && (
            <StatePanel size="compact" tone="alert" title="Open ARC Music at the registered address">
              <p>
                Spotify returns you to <span className={styles.code}>{redirectOrigin}</span>, and your session is stored
                per address. <a className="link" href={`${redirectOrigin}${config.basePath}`}>Open it there</a> before
                connecting.
              </p>
            </StatePanel>
          )}

          <div className={styles.actions}>
            {auth && (
              <Button variant="primary" icon="arrow-right" onClick={() => void auth.beginLogin(returnTo)}>
                {expired ? 'Reconnect Spotify' : 'Connect Spotify'}
              </Button>
            )}
            {config.previewEnabled && (
              <Button variant="secondary" onClick={controls.enterPreview}>
                Preview without Spotify
              </Button>
            )}
          </div>
        </div>

        <aside className={styles.aside} aria-label="Before you connect">
          {!auth ? (
            <div>
              <p className={styles.eyebrow}>Setup</p>
              <ol className={styles.steps}>
                <li>
                  Create an app at developer.spotify.com/dashboard and enable the Web API and Web Playback SDK.
                </li>
                <li>
                  Add this Redirect URI to the app: <span className={styles.code}>{config.redirectUri}</span>
                </li>
                <li>
                  Put its Client ID in <span className={styles.code}>.env.local</span> as{' '}
                  <span className={styles.code}>VITE_SPOTIFY_CLIENT_ID</span> and restart the dev server.
                </li>
              </ol>
            </div>
          ) : (
            <ul className={styles.facts}>
              <li className={styles.fact}>
                <span className={styles.factIndex}>01</span>
                <span>Browser playback needs Spotify Premium and a browser with protected-media support.</span>
              </li>
              <li className={styles.fact}>
                <span className={styles.factIndex}>02</span>
                <span>
                  Authorization uses PKCE; no client secret exists in this app. Tokens stay in this browser until you log
                  out.
                </span>
              </li>
              <li className={styles.fact}>
                <span className={styles.factIndex}>03</span>
                <span>
                  Redirect URI in use: <span className={styles.code}>{config.redirectUri}</span>
                </span>
              </li>
            </ul>
          )}

          <details className={styles.details}>
            <summary>Permissions requested ({SPOTIFY_SCOPES.length})</summary>
            <ul className={styles.scopes}>
              {SPOTIFY_SCOPES.map(({ scope, reason }) => (
                <li key={scope} className={styles.scope}>
                  <span className={styles.scopeName}>{scope}</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </main>
    </div>
  );
}
