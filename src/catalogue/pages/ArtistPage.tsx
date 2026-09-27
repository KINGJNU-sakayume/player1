import { Link, useParams } from 'react-router';
import { usePageTitle } from '../../app/pageTitle';
import { useSession } from '../../app/sessionContext';
import type { AlbumSummary } from '../../domain/types';
import { albumTypeLabel, joinArtistNames, pluralise, releaseYear } from '../../lib/format';
import { isSpotifyId } from '../../lib/spotifyUri';
import { usePlay } from '../../playback/hooks';
import { describeSpotifyError, isSpotifyApiError } from '../../spotify/errors';
import { detectLineLanguage } from '../../translation/languageDetect';
import { Button, ButtonLink } from '../components/Button';
import { Cover, Portrait } from '../components/Cover';
import { SectionHeader } from '../components/SectionHeader';
import { LoadingLine, StatePanel } from '../components/StatePanel';
import { useArtist, useArtistReleases, useFeaturedReleases } from '../data/queries';
import { getArtistEditorial } from '../editorial/lookup';
import styles from './ArtistPage.module.css';
import page from './Page.module.css';

const SELECTED_COUNT = 4;

/** Without an editorial selection, exhibit the most recent full albums, then other releases. */
function defaultSelection(releases: AlbumSummary[]): AlbumSummary[] {
  const byDate = [...releases].sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
  const albums = byDate.filter((r) => r.albumType === 'album');
  const others = byDate.filter((r) => r.albumType !== 'album');
  return [...albums, ...others].slice(0, SELECTED_COUNT);
}

function ReleaseObject({ release }: { release: AlbumSummary }) {
  const year = releaseYear(release.releaseDate);
  const meta = [year, albumTypeLabel(release.albumType), release.totalTracks !== null && pluralise(release.totalTracks, 'track')]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={styles.release}>
      <Link to={`/album/${release.id}`} className={styles.releaseArt} tabIndex={-1} aria-hidden="true">
        <Cover
          images={release.images}
          displaySize={120}
          alt=""
          title={release.name}
          subtitle={joinArtistNames(release.artists)}
          paletteKey={release.id}
        />
      </Link>
      <div className={styles.releaseText}>
        <Link to={`/album/${release.id}`} className={styles.releaseTitle} lang={detectLineLanguage(release.name)}>
          {release.name}
        </Link>
        <p className={styles.releaseMeta}>{meta}</p>
      </div>
    </li>
  );
}

function Discography({ artistId }: { artistId: string }) {
  const releases = useArtistReleases(artistId);
  const items = releases.data?.pages.flatMap((p) => p.items) ?? [];
  const total = releases.data?.pages[0]?.total;

  return (
    <section className={page.section} aria-labelledby="discography-title">
      <SectionHeader id="discography-title" title="Discography" meta={total !== undefined ? pluralise(total, 'release') : null} />
      {releases.isPending ? (
        <LoadingLine label="Loading releases…" />
      ) : releases.isError ? (
        <StatePanel size="compact" tone="alert" title={describeSpotifyError(releases.error).title}>
          <p>{describeSpotifyError(releases.error).body}</p>
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel size="compact" title="No releases listed">
          <p>Spotify lists no albums or singles for this artist.</p>
        </StatePanel>
      ) : (
        <>
          <div className={styles.columnLabels} aria-hidden="true">
            <span>Year</span>
            <span>Title</span>
            <span>Type</span>
            <span>Tracks</span>
          </div>
          <ol className={styles.table}>
            {items.map((release) => (
              <li key={release.id} className={styles.entry}>
                <span className={styles.entryYear}>{releaseYear(release.releaseDate) ?? '—'}</span>
                <Link className={styles.entryTitle} to={`/album/${release.id}`} lang={detectLineLanguage(release.name)}>
                  {release.name}
                </Link>
                <span className={styles.entryType}>{albumTypeLabel(release.albumType)}</span>
                <span className={styles.entryTracks}>{release.totalTracks ?? '—'}</span>
              </li>
            ))}
          </ol>
          {releases.hasNextPage && (
            <div className={page.more}>
              <Button onClick={() => void releases.fetchNextPage()} disabled={releases.isFetchingNextPage}>
                {releases.isFetchingNextPage ? 'Loading…' : 'Show more releases'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function ArtistPage() {
  const { artistId } = useParams();
  const artist = useArtist(artistId);
  const editorial = getArtistEditorial(artistId);
  const featured = useFeaturedReleases(artistId, editorial);
  const releases = useArtistReleases(artistId);
  const play = usePlay();
  const { mode } = useSession();
  usePageTitle('Artist', artist.data?.name ?? null);

  if (!isSpotifyId(artistId)) {
    return (
      <div className={page.page}>
        <StatePanel eyebrow="Artist" title="This isn’t a valid artist address" actions={<ButtonLink to="/">Home</ButtonLink>} />
      </div>
    );
  }

  if (artist.isPending) {
    return (
      <div className={page.page}>
        <div className={styles.head}>
          <div className={styles.portraitPlaceholder} aria-hidden="true" />
          <LoadingLine label="Loading artist…" />
        </div>
      </div>
    );
  }

  if (artist.isError) {
    const notFound = isSpotifyApiError(artist.error) && artist.error.kind === 'not-found';
    const { title, body } = describeSpotifyError(artist.error);
    return (
      <div className={page.page}>
        <StatePanel
          eyebrow="Artist"
          tone={notFound ? 'neutral' : 'alert'}
          title={title}
          actions={
            <>
              {!notFound && (
                <Button variant="primary" icon="refresh" onClick={() => void artist.refetch()}>
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

  const data = artist.data;
  const firstPage = releases.data?.pages[0];
  const hasEditorialSelection = Boolean(editorial?.featuredReleaseIds?.length || editorial?.featuredReleaseTitles?.length);
  const selection = hasEditorialSelection
    ? (featured.data ?? [])
    : defaultSelection(firstPage?.items ?? []);
  const selectionPending = hasEditorialSelection ? featured.isPending : releases.isPending;
  // Deprecated fields are shown only when Spotify still returns them.
  const facts = [
    firstPage ? pluralise(firstPage.total, 'release') : null,
    data.genres.length > 0 ? data.genres.slice(0, 3).join(', ') : null,
    data.followers !== null ? `${new Intl.NumberFormat('en').format(data.followers)} followers` : null,
  ].filter(Boolean);

  return (
    <div className={page.page}>
      <article className={page.stack}>
        <header className={styles.head}>
          <Portrait images={data.images} displaySize={380} name={data.name} priority />
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Artist</p>
            <h1 className={styles.name} lang={detectLineLanguage(data.name)}>
              {data.name}
            </h1>
            {editorial?.bio && editorial.bio.length > 0 && (
              <div className={styles.bio} lang={editorial.language}>
                {editorial.bio.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            )}
            {facts.length > 0 && <p className={styles.facts}>{facts.join(' · ')}</p>}
            <div className={styles.actions}>
              <Button variant="primary" icon="play" onClick={() => play({ contextUri: data.uri })}>
                Play artist
              </Button>
              {mode === 'spotify' && (
                <a
                  className="link"
                  href={`https://open.spotify.com/artist/${data.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ alignSelf: 'center', fontSize: 'var(--text-small)' }}
                >
                  Open in Spotify
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          </div>
        </header>

        <section className={page.section} aria-labelledby="selected-title">
          <SectionHeader id="selected-title" title="Selected releases" />
          {selectionPending ? (
            <LoadingLine label="Loading releases…" />
          ) : selection.length === 0 ? (
            <StatePanel size="compact" title="No releases to show">
              <p>Spotify returned no releases for this selection.</p>
            </StatePanel>
          ) : (
            <ul className={styles.releases}>
              {selection.map((release) => (
                <ReleaseObject key={release.id} release={release} />
              ))}
            </ul>
          )}
        </section>

        <Discography artistId={data.id} />
      </article>
    </div>
  );
}
