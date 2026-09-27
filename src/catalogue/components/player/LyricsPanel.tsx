import { useMemo, type CSSProperties } from 'react';
import { useSession } from '../../../app/sessionContext';
import type { TrackIdentity } from '../../../domain/types';
import type { TimedLyricLine } from '../../../lyrics/types';
import { useTimedLyrics } from '../../../lyrics/useTimedLyrics';
import { useLyricCursor } from '../../../playback/hooks';
import { usePreferences } from '../../../preferences/preferences';
import { detectLineLanguages } from '../../../translation/languageDetect';
import type { TranslationState } from '../../../translation/useLyricTranslation';
import { useLyricTranslation } from '../../../translation/useLyricTranslation';
import { LoadingLine } from '../StatePanel';
import { Icon } from '../Icon';
import styles from './LyricsPanel.module.css';

const UPCOMING_LINES = 3;

const LANGUAGE_NAMES: Record<string, string> = { ko: 'Korean', ja: 'Japanese', en: 'English', zh: 'Chinese' };

function languageName(tag: string): string {
  return LANGUAGE_NAMES[tag.split('-')[0]!.toLowerCase()] ?? tag;
}

const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/u;

/**
 * Approximate rendered width of a line in ems (full-width characters ≈ 1em,
 * Latin ≈ 0.55em). The stylesheet divides the column width by this to size
 * the current line so it fills the column in about two lines.
 */
function lineUnits(text: string): number {
  let units = 0;
  for (const char of text) units += WIDE.test(char) ? 1 : 0.55;
  return Math.max(units, 1);
}

function TranslationStatus({
  state,
  target,
  prepare,
}: {
  state: TranslationState;
  target: string;
  prepare: (() => Promise<void>) | null;
}) {
  switch (state.status) {
    case 'loading':
      return <span className={styles.status}>Translating…</span>;
    case 'ready':
      return <span className={styles.status}>{languageName(target)}</span>;
    case 'not-needed':
      return <span className={styles.status}>Already in {languageName(target)}</span>;
    case 'needs-download':
      return prepare ? (
        <button type="button" className={styles.statusAction} onClick={() => void prepare()}>
          Download {languageName(target)} translation
        </button>
      ) : null;
    case 'unavailable':
    case 'unsupported':
      return (
        <span className={styles.status} title={state.status === 'unavailable' ? state.message : undefined}>
          Translation unavailable
        </span>
      );
    default:
      return null;
  }
}

/**
 * Synchronised lyrics: the current line is the dominant typographic element,
 * sized to fill the column; its translation sits directly beneath, the line
 * just sung fades above and the next three lines follow at reduced emphasis.
 * The active line comes from the central playback clock.
 */
export function LyricsPanel({ track }: { track: TrackIdentity }) {
  const lyricsState = useTimedLyrics(track);
  const { translation: provider, translationTarget } = useSession();
  const [preferences, setPreferences] = usePreferences();
  const lyrics = lyricsState.status === 'ready' ? lyricsState.lyrics : null;
  const lines: TimedLyricLine[] | null = lyrics?.lines ?? null;
  const { state: translation, prepare } = useLyricTranslation(
    track.spotifyTrackId,
    lyrics,
    preferences.translationEnabled,
  );
  const { activeIndex, nextIndex } = useLyricCursor(lines);

  const lineLanguages = useMemo(
    () => (lines ? detectLineLanguages(lines.map((l) => l.text), lyrics?.language) : []),
    [lines, lyrics?.language],
  );

  const source =
    lyricsState.status === 'ready' ? lyrics?.source : lyricsState.status === 'instrumental' ? lyricsState.source : null;
  const current = lines && activeIndex >= 0 ? lines[activeIndex]! : null;
  const upcoming = lines ? lines.slice(nextIndex, nextIndex + UPCOMING_LINES) : [];
  // The line just sung stays above the current one, faded, for continuity.
  const previousIndex = activeIndex >= 0 ? activeIndex - 1 : nextIndex - 1;
  const previous = lines && previousIndex >= 0 ? lines[previousIndex]! : null;
  const translated =
    translation.status === 'ready' && activeIndex >= 0 ? (translation.lines[activeIndex] ?? '').trim() : '';

  return (
    <section className={styles.panel} aria-labelledby="lyrics-label">
      <header className={styles.head}>
        <h2 id="lyrics-label" className={styles.label}>
          Lyrics
        </h2>
        {source && <span className={styles.source}>{source}</span>}
        {provider && (
          <div className={styles.headRight}>
            {preferences.translationEnabled && lines && (
              <TranslationStatus state={translation} target={translationTarget} prepare={prepare} />
            )}
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={preferences.translationEnabled}
              onClick={() => setPreferences({ translationEnabled: !preferences.translationEnabled })}
            >
              <Icon name="translate" size={18} />
              <span>Translation</span>
              <span className={styles.toggleState}>{preferences.translationEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        )}
      </header>

      <div className={styles.body} aria-live="off">
        {lyricsState.status === 'loading' && <LoadingLine label="Finding timed lyrics…" />}

        {lyricsState.status === 'disabled' && (
          <div className={styles.state}>
            <p className={styles.stateTitle}>Lyrics are turned off</p>
            <p className={styles.stateText}>No lyrics provider is configured for this app. Playback is unaffected.</p>
          </div>
        )}

        {lyricsState.status === 'unavailable' && (
          <div className={styles.state} role="status">
            <p className={styles.stateTitle}>
              {lyricsState.reason === 'error' ? 'Lyrics couldn’t be loaded' : 'Timed lyrics unavailable'}
            </p>
            <p className={styles.stateText}>
              {lyricsState.reason === 'error'
                ? 'The lyrics provider did not respond. Playback continues normally.'
                : 'No synchronised lyrics were found for this track. Playback continues normally.'}
            </p>
            {lyricsState.reason === 'error' && (
              <button type="button" className={styles.stateAction} onClick={lyricsState.retry}>
                Try again
              </button>
            )}
          </div>
        )}

        {lyricsState.status === 'instrumental' && (
          <div className={styles.state} role="status">
            <p className={styles.instrumental}>Instrumental</p>
            <p className={styles.stateText}>This track has no lyrics.</p>
          </div>
        )}

        {lines && (
          <>
            {previous && previous.text.trim() && (
              <p key={`prev-${previousIndex}`} className={styles.previous} lang={lineLanguages[previousIndex]} aria-hidden="true">
                {previous.text}
              </p>
            )}
            {current ? (
              <p
                key={`line-${activeIndex}`}
                className={styles.current}
                lang={lineLanguages[activeIndex]}
                style={{ '--units': lineUnits(current.text).toFixed(1) } as CSSProperties}
              >
                {current.text}
              </p>
            ) : (
              <p key={`gap-${nextIndex}`} className={styles.gap} aria-hidden="true">
                ···
              </p>
            )}
            {translated && (
              <p key={`tr-${activeIndex}`} className={styles.translation} lang={translationTarget}>
                {translated}
              </p>
            )}
            <ol className={styles.upcoming} aria-label="Next lines">
              {upcoming.map((line, offset) => (
                <li key={`next-${nextIndex + offset}`} lang={lineLanguages[nextIndex + offset]}>
                  {line.text}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
