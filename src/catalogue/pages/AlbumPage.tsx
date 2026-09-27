import { useMemo, type CSSProperties } from 'react';
import { useParams } from 'react-router';
import { usePageTitle } from '../../app/pageTitle';
import type { AlbumDetail, AlbumTrack } from '../../domain/types';
import {
  albumTypeLabel,
  formatDuration,
  formatReleaseDate,
  formatRuntime,
  formatTrackNumber,
  joinArtistNames,
  pluralise,
} from '../../lib/format';
import { pickImageUrl } from '../../lib/images';
import { isSpotifyId } from '../../lib/spotifyUri';
import { usePlay } from '../../playback/hooks';
import { useCurrentTrackMatcher } from '../../playback/useCurrentTrack';
import { describeSpotifyError, isSpotifyApiError } from '../../spotify/errors';
import { detectLineLanguage } from '../../translation/languageDetect';
import { ArtistLinks } from '../components/ArtistLinks';
import { Button, ButtonLink } from '../components/Button';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { PlayingMark } from '../components/lists/PlayingMark';
import { LoadingLine, StatePanel } from '../components/StatePanel';
import { useAlbum, useSavedState, useToggleSaved } from '../data/queries';
import { getAlbumEditorial } from '../editorial/lookup';
import { mapPaletteToTokens } from '../palette/mapPaletteToTokens';
import { useAlbumPalette } from '../palette/usePalette';
import styles from './AlbumPage.module.css';
import page from './Page.module.css';

function titleLength(title: string): 'short' | 'medium' | 'long' {
  const length = Array.from(title).length;
  if (length <= 12) return 'short';
  if (length <= 22) return 'medium';
  return 'long';
}

function SaveAlbumButton({ uri }: { uri: string }) {
  const saved = useSavedState(uri);
  const toggle = useToggleSaved();
  const isSaved = saved.data === true;
  return (
    <Button
      icon={isSaved ? 'check' : 'plus'}
      aria-pressed={isSaved}
      disabled={saved.isPending || saved.isError || toggle.isPending}
      onClick={() => toggle.mutate({ uri, saved: !isSaved })}
    >
      {isSaved ? 'Saved' : 'Save album'}
    </Button>
  );
}

function sameArtists(track: AlbumTrack, album: AlbumDetail): boolean {
  const albumIds = new Set(album.artists.map((a) => a.id));
  return track.artists.length === album.artists.length && track.artists.every((a) => albumIds.has(a.id));
}

function TrackSequence({ album }: { album: AlbumDetail }) {
  const play = usePlay();
  const isCurrent = useCurrentTrackMatcher();

  const discs = new Map<number, AlbumTrack[]>();
  for (const track of album.tracks) discs.set(track.discNumber, [...(discs.get(track.discNumber) ?? []), track]);
  const multiDisc = discs.size > 1;

  const renderRow = (track: AlbumTrack) => {
    const current = isCurrent({ id: track.id, uri: track.uri, name: track.name, albumId: album.id });
    const guests = sameArtists(track, album) ? [] : track.artists.filter((a) => !album.artists.some((x) => x.id === a.id));
    return (
      <li
        key={track.id}
        className={styles.track}
        aria-current={current ? 'true' : undefined}
        data-unplayable={!track.isPlayable || undefined}
      >
          <span className={styles.number} aria-hidden="true">
            {current ? (
              <PlayingMark playing={current.playing} />
            ) : (
              <>
                <span className={styles.digits}>{formatTrackNumber(track.trackNumber)}</span>
                <Icon className={styles.hint} name="play" size={18} />
              </>
            )}
          </span>
          <span className={styles.trackText}>
            <button
              type="button"
              className={styles.trackTitle}
              lang={detectLineLanguage(track.name)}
              disabled={!track.isPlayable}
              title={track.isPlayable ? undefined : 'Not available in your market'}
              aria-label={`${formatTrackNumber(track.trackNumber)}. ${track.name}${current ? ', now playing' : ''}. Play`}
              onClick={() => play({ contextUri: album.uri, offsetUri: track.uri })}
            >
              {track.name}
            </button>
            {guests.length > 0 && (
              <span className={styles.featuring}>
                with <ArtistLinks artists={guests} />
              </span>
            )}
          </span>
          {track.explicit ? (
            <span className={styles.explicit} role="img" aria-label="Explicit" title="Explicit">
              E
            </span>
          ) : (
            <span />
          )}
          <span className={styles.duration}>{formatDuration(track.durationMs)}</span>
      </li>
    );
  };

  if (!multiDisc) return <ol aria-label="Tracks">{album.tracks.map(renderRow)}</ol>;
  return (
    <>
      {[...discs].map(([disc, tracks]) => (
        <section key={disc} aria-label={`Disc ${disc}`}>
          <h3 className={styles.disc}>Disc {disc}</h3>
          <ol>{tracks.map(renderRow)}</ol>
        </section>
      ))}
    </>
  );
}

export function AlbumPage() {
  const { albumId } = useParams();
  const album = useAlbum(albumId);
  const play = usePlay();
  const loaded = album.data;
  const editorial = getAlbumEditorial(albumId);
  const palette = useAlbumPalette(albumId, loaded ? pickImageUrl(loaded.images, 64) : null);
  const coverShadow = useMemo(() => mapPaletteToTokens(palette)['--cover-shadow'], [palette]);
  usePageTitle('Album', loaded?.name ?? null);

  if (!isSpotifyId(albumId)) {
    return (
      <div className={page.page}>
        <StatePanel eyebrow="Album" title="This isn’t a valid album address" actions={<ButtonLink to="/">Home</ButtonLink>} />
      </div>
    );
  }

  if (album.isPending) {
    return (
      <div className={page.page}>
        <div className={styles.layout}>
          <div className={styles.group}>
            <div className={styles.coverPlaceholder} aria-hidden="true" />
            <LoadingLine label="Loading album…" />
          </div>
        </div>
      </div>
    );
  }

  if (album.isError) {
    const { title, body } = describeSpotifyError(album.error);
    const notFound = isSpotifyApiError(album.error) && album.error.kind === 'not-found';
    return (
      <div className={page.page}>
        <StatePanel
          eyebrow="Album"
          tone={notFound ? 'neutral' : 'alert'}
          title={title}
          actions={
            <>
              {!notFound && (
                <Button variant="primary" icon="refresh" onClick={() => void album.refetch()}>
                  Try again
                </Button>
              )}
              <ButtonLink to="/">Home</ButtonLink>
            </>
          }
        >
          <p>{body}</p>
        </StatePanel>
      </div>
    );
  }

  const data = album.data;
  const facts = [
    formatReleaseDate(data.releaseDate, data.releaseDatePrecision),
    data.totalTracks !== null ? pluralise(data.totalTracks, 'track') : null,
    data.tracks.length > 0 ? formatRuntime(data.totalDurationMs) : null,
  ].filter(Boolean);
  const fineprint = [data.label, ...data.copyrights].filter(Boolean);

  return (
    <div className={page.page}>
      <article className={styles.layout} style={{ '--cover-shadow': coverShadow } as CSSProperties}>
        <aside className={styles.identity} aria-label="Album details">
          <div className={styles.group}>
            <Cover
              images={data.images}
              displaySize={280}
              alt={`${data.name} cover`}
              title={data.name}
              subtitle={joinArtistNames(data.artists)}
              paletteKey={data.id}
              shadow="subtle"
              priority
            />
            <div className={styles.heading}>
              <p className={styles.eyebrow}>{albumTypeLabel(data.albumType)}</p>
              <h1 className={styles.title} data-length={titleLength(data.name)} lang={detectLineLanguage(data.name)}>
                {data.name}
              </h1>
              <p className={styles.artists}>
                <ArtistLinks artists={data.artists} />
              </p>
              {facts.length > 0 && (
                <p className={styles.facts}>
                  {facts.map((fact, i) => (
                    <span key={fact}>
                      {i > 0 && ' · '}
                      <span className={styles.fact}>{fact}</span>
                    </span>
                  ))}
                </p>
              )}
              <div className={styles.actions}>
                <Button
                  variant="primary"
                  icon="play"
                  disabled={data.tracks.length === 0 && data.tracksComplete}
                  onClick={() => play({ contextUri: data.uri })}
                >
                  Play
                </Button>
                <SaveAlbumButton uri={data.uri} />
              </div>
            </div>
          </div>

          {editorial?.description && (
            <div className={styles.description} lang={editorial.language}>
              {editorial.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          )}

          {fineprint.length > 0 && <p className={styles.fineprint}>{fineprint.join(' · ')}</p>}
        </aside>

        <section className={styles.sequence} aria-labelledby="sequence-title">
          <header className={styles.sequenceHead}>
            <h2 id="sequence-title" className={styles.sequenceTitle}>
              Track sequence
            </h2>
            {data.tracks.length > 0 && (
              <span className={styles.sequenceMeta}>
                {pluralise(data.tracks.length, 'track')} · {formatRuntime(data.totalDurationMs)}
              </span>
            )}
          </header>
          {data.tracks.length > 0 ? (
            <TrackSequence album={data} />
          ) : (
            <StatePanel size="compact" title={data.tracksComplete ? 'No tracks' : 'Track sequence not included'}>
              <p>
                {data.tracksComplete
                  ? 'Spotify lists no tracks for this release.'
                  : 'The preview catalogue has this release’s details but not its track sequence. Connect Spotify to load the complete album.'}
              </p>
            </StatePanel>
          )}
        </section>
      </article>
    </div>
  );
}
