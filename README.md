# ARC Music — Catalogue

A personal Spotify player designed as an editorial record catalogue: a neutral paper page, large multilingual
type, and one album at a time. It implements the **Catalogue version** described in
[`docs/handoff/`](docs/handoff/) — no Specimen Book, no design or palette labs.

| Screen | What it does |
| --- | --- |
| **Now Playing** | One viewport, no page scroll. Cover with title, artist and album on the left; synced lyrics on the right with the current line, its translation and the next two lines. Controls sit in the composition: previous / play / next, seek, times, volume, queue, like, translation toggle and device picker. |
| **Home** | Recently played, saved albums and your playlists. |
| **Album** | Cover, title, artist, release facts and description on the left; the complete track sequence on the right. |
| **Artist** | Portrait and biography side by side, then selected releases and a compact discography. Editorial overrides for Vaundy, Tyler, The Creator and tripleS; every other artist renders cleanly from Spotify data alone. |
| **Search** | Tracks, artists, albums and playlists, driven by the URL and navigable from the keyboard. |
| **Queue** | A drawer with the current item and what plays next. |

**Contents** — [Quick start](#quick-start) · [Spotify app configuration](#spotify-app-configuration) ·
[Environment variables](#environment-variables) · [Commands](#commands) · [Build and deploy](#build-and-deploy) ·
[Lyrics and translation providers](#lyrics-and-translation-providers) · [Editorial overrides](#editorial-overrides) ·
[Album colour](#album-colour) · [Preview mode](#preview-mode) · [Architecture](#architecture) ·
[Known limitations](#known-limitations)

## Quick start

```bash
npm ci
cp .env.example .env.local   # then set VITE_SPOTIFY_CLIENT_ID (see below)
npm run dev                  # http://127.0.0.1:5173
```

- Open **http://127.0.0.1:5173**, not `localhost`. Spotify no longer accepts `localhost` redirect URIs, so the dev
  server binds to the loopback IP. If you open the app on another address, the connect screen links you to the
  right one.
- No Spotify app yet? Choose **Preview without Spotify** on the connect screen (or open `/?preview`) to explore
  every screen with a sample catalogue and a simulated clock — no Spotify account and no audio.

Requirements: Node.js 22.22 or newer, a desktop browser, and a Spotify account. Playback control needs Spotify
Premium, and audio in the browser also needs protected-media (EME) support — see
[Known limitations](#known-limitations).

## Spotify app configuration

1. Sign in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and choose **Create app**.
2. Under the APIs/SDKs the app will use, select **Web API** and **Web Playback SDK**.
3. Register every address the app runs from as a **Redirect URI**. Spotify compares them exactly (scheme, host,
   port and path):

   | Where the app runs | Redirect URI |
   | --- | --- |
   | `npm run dev` | `http://127.0.0.1:5173/callback` |
   | `npm run preview` (local production build) | `http://127.0.0.1:4173/callback` |
   | GitHub Pages | `https://<user>.github.io/player1/callback` |
   | Any other host | `https://<your-domain><base-path>callback` |

   Plain `http` is accepted only for loopback addresses; deployed sites must use `https`. When
   `VITE_SPOTIFY_REDIRECT_URI` is empty, the app uses the address it is served from (origin + base path +
   `callback`); `.env.example` pins the dev address, so change or clear it before building for another address.
4. Copy the **Client ID** into `.env.local` as `VITE_SPOTIFY_CLIENT_ID`. Do **not** copy the client secret anywhere:
   the app uses the Authorization Code flow with PKCE, which needs no secret, and every `VITE_*` value is published
   in the JavaScript bundle.
5. While the app is in **Development Mode**, add the Spotify account of everyone who will use it under
   **User Management**. Since Spotify's February 2026 platform changes, a Development Mode app works only while its
   owner has an active Premium subscription, and it is limited to five users.

### Scopes

The app requests exactly these scopes. They are declared, each with the feature that needs it, in
[`src/spotify/scopes.ts`](src/spotify/scopes.ts); remove a scope together with the feature that uses it.

| Scope | Used for |
| --- | --- |
| `streaming` | Playing audio in this browser (Web Playback SDK) |
| `user-read-email`, `user-read-private` | Required by the Web Playback SDK |
| `user-read-playback-state` | Playback state, devices and the queue |
| `user-modify-playback-state` | Play, pause, skip, seek, volume and device transfer |
| `user-read-currently-playing` | Reading the queue |
| `user-read-recently-played` | Home — recently played |
| `user-library-read` | Home — saved albums; liked / saved state |
| `user-library-modify` | Liking the current track, saving albums |
| `playlist-read-private` | Home — your private playlists |
| `playlist-read-collaborative` | Home — collaborative playlists you belong to |

If the granted scopes are missing any of these (for example after you add a scope), a banner asks the listener to
reconnect; everything that does not need the missing scope keeps working.

### Session handling

- Tokens live in `localStorage` (`arc.spotify.session.v1`) so a browser refresh keeps you signed in; the PKCE verifier
  and `state` live in `sessionStorage` only until the callback completes.
- Access tokens are refreshed 60 seconds before they expire and after any `401`. Concurrent refreshes are merged,
  including across tabs (Web Locks), because Spotify rotates refresh tokens.
- A revoked refresh token (`invalid_grant`) signs the listener out with a **Reconnect Spotify** screen that returns
  them to the page they were on. **Log out** (in the rail) clears the stored tokens and cached Spotify data.

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local` (git-ignored). Every value is compiled into the public bundle, so
none of them may be a secret.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_SPOTIFY_CLIENT_ID` | — | Client ID of your Spotify app. Without it the connect screen explains the setup and only the preview is available. |
| `VITE_SPOTIFY_REDIRECT_URI` | `<origin><base>callback` | Must equal a Redirect URI registered on the Spotify app. |
| `VITE_BASE_PATH` | `/` | Public base path of the build, e.g. `/player1/` for `https://<user>.github.io/player1/`. |
| `VITE_LYRICS_PROVIDER` | `lrclib` | `lrclib`, `mock` or `none` — see [providers](#lyrics-and-translation-providers). |
| `VITE_TRANSLATION_PROVIDER` | `browser` | `browser`, `http`, `mock` or `none`. |
| `VITE_TRANSLATION_ENDPOINT` | — | URL of your translation function; required by `http` (without it translation is off). |
| `VITE_TRANSLATION_TARGET` | `ko` | BCP 47 language that lyrics are translated into. |
| `VITE_ENABLE_PREVIEW` | `true` | Set to `false` to hide **Preview without Spotify**. |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on `http://127.0.0.1:5173` |
| `npm run build` | Type-check, production build into `dist/`, and `dist/404.html` for static hosts |
| `npm run preview` | Serve `dist/` on `http://127.0.0.1:4173` |
| `npm run typecheck` | TypeScript project build (`tsc -b`) |
| `npm run lint` | ESLint, including the React Hooks and React Compiler rules |
| `npm test` | Vitest unit and integration tests (`npm run test:watch` to watch) |
| `npm run check` | Typecheck, lint, tests and build — run this before pushing |

## Build and deploy

The app is a static single-page application: `dist/` can be served by any static host that falls back to
`index.html` for unknown paths (needed for deep links such as `/album/<id>` and for the OAuth `/callback`). The
build also writes `dist/404.html`, a copy of `index.html`, which gives GitHub Pages that fallback.

**GitHub Pages** (`https://<user>.github.io/player1/`):

```bash
VITE_BASE_PATH=/player1/ \
VITE_SPOTIFY_CLIENT_ID=<client id> \
VITE_SPOTIFY_REDIRECT_URI=https://<user>.github.io/player1/callback \
npm run build
```

Publish `dist/` — for example from a GitHub Actions job that runs `npm ci` and the build above, then uses
`actions/upload-pages-artifact` (with `path: dist`) and `actions/deploy-pages`, with **Settings → Pages → Source**
set to **GitHub Actions**. Register the production redirect URI on the Spotify app first.

**Netlify, Vercel, Cloudflare Pages and similar**: build command `npm run build`, output directory `dist`, and a
rewrite of every path to `/index.html`. Set the `VITE_*` variables in the host's build settings.

## Lyrics and translation providers

Spotify's Web API has no lyrics, so lyrics and translations come from replaceable providers. Both are optional:
missing lyrics show a designed "lyrics unavailable" state, missing translations simply leave the translation row
empty, and neither ever blocks playback.

**Lyrics** (`VITE_LYRICS_PROVIDER`)

| Provider | Behaviour |
| --- | --- |
| `lrclib` | [LRCLIB](https://lrclib.net) synced lyrics, keyless and CORS-enabled. Matches on title, artist, album and duration (`/api/get`), falling back to a search. Sends that track metadata to lrclib.net. |
| `mock` | Original, non-copyright test lines for every track — for development and tests. |
| `none` | Never fetch lyrics. |

**Translation** (`VITE_TRANSLATION_PROVIDER`)

| Provider | Behaviour |
| --- | --- |
| `browser` | Chrome's on-device Translator API (desktop Chrome 138+). No key, and lyrics never leave the device. A language model that is not yet installed is downloaded after one click in the lyrics panel. Other browsers show "translation unavailable". |
| `http` | `POST` to your own serverless function (`VITE_TRANSLATION_ENDPOINT`), which keeps any DeepL / Papago / Google key server-side. |
| `mock` | A small dictionary for the built-in test lines. |
| `none` | No translation row. |

The language of each line is detected separately, so only lines that are not already in the target language are
translated (a Korean song with English hooks gets translations for the English lines only). Lyrics are cached in
`localStorage` for 30 days (3 days for "not found") and translations for 60 days, keyed by track, language pair and
lyric text, so a corrected lyric is translated again.

### The `http` translation contract

```text
POST {VITE_TRANSLATION_ENDPOINT}
Content-Type: application/json

{ "lines": ["…", "…"], "sourceLanguage": "ja" | null, "targetLanguage": "ko" }

200 OK
{ "translations": ["…", "…"] }   // same length and order as "lines"; "" for no translation
```

The function must answer the CORS preflight (`OPTIONS`) and send `Access-Control-Allow-Origin` for the app's
origin, because `Content-Type: application/json` makes the request non-simple. Any other status or shape is treated
as "translation unavailable".

### Adding or swapping a provider

1. Implement the interface — lyrics: `LyricsProvider` in [`src/lyrics/types.ts`](src/lyrics/types.ts); translation:
   `TranslationProvider` in [`src/translation/TranslationProvider.ts`](src/translation/TranslationProvider.ts).

   ```ts
   // src/lyrics/providers/MyLyricsProvider.ts
   import type { TrackIdentity } from '../../domain/types';
   import { parseLrc } from '../lrc';
   import { LyricsProviderError, type LyricsProvider, type LyricsRequestOptions, type TimedLyrics } from '../types';

   export class MyLyricsProvider implements LyricsProvider {
     readonly id = 'mine';
     readonly label = 'My lyrics';

     /** Resolve to null when the track has no timed lyrics; throw only for failures worth retrying. */
     async getTimedLyrics(track: TrackIdentity, options?: LyricsRequestOptions): Promise<TimedLyrics | null> {
       const key = encodeURIComponent(track.isrc ?? track.spotifyTrackId);
       const response = await fetch(`https://lyrics.example/api/tracks/${key}`, { signal: options?.signal });
       if (response.status === 404) return null;
       if (!response.ok) throw new LyricsProviderError(`Lyrics service responded ${response.status}`, response.status >= 500);
       const { lrc } = (await response.json()) as { lrc: string };
       return { source: this.label, lines: parseLrc(lrc) };
     }
   }
   ```

2. Register it in the factory: [`src/lyrics/createLyricsProvider.ts`](src/lyrics/createLyricsProvider.ts) or
   [`src/translation/createTranslationProvider.ts`](src/translation/createTranslationProvider.ts). Wrap a network
   lyrics provider in `withLyricsCache(...)` to reuse the local cache.
3. Add its id to `LyricsProviderId` / `TranslationProviderId` and the matching list in
   [`src/app/config.ts`](src/app/config.ts), then select it with the environment variable.

A provider that needs a secret must run behind your own backend or serverless function; the browser only ever calls
that function.

## Editorial overrides

Editorial text is optional, kept apart from Spotify data, and merged in by
[`src/catalogue/editorial/lookup.ts`](src/catalogue/editorial/lookup.ts). Pages without an entry render from Spotify
metadata alone — never add placeholder prose.

- **Artists** — add an entry to [`src/catalogue/editorial/artists.ts`](src/catalogue/editorial/artists.ts):

  ```ts
  {
    artistId: '2IUl3m1H1EQ7QfNbNWvgru',        // open.spotify.com/artist/<ID>
    name: 'Vaundy',                             // for editors only; the page shows Spotify's name
    language: 'ko',                             // language of the bio, for correct CJK glyphs
    bio: ['First paragraph…', 'Second paragraph…'],
    featuredReleaseIds: ['3RhkGySFESW5d50IlNWuP1'],   // "Selected releases", in order
    featuredReleaseTitles: ['呼び声'],                 // fallback matched by title if an ID changes
  },
  ```

- **Albums** — add an entry to [`src/catalogue/editorial/albums.ts`](src/catalogue/editorial/albums.ts) with
  `albumId` (from `open.spotify.com/album/<ID>`), an optional `title` for reference, `language` and one to three
  `description` paragraphs.

IDs are the 22-character part of a Spotify link (**Share → Copy link**), without any `?si=` suffix.

## Album colour

Colour is semantic, not decorative. [`src/catalogue/palette/`](src/catalogue/palette/) extracts dominant, secondary,
accent, light and dark colours from the cover, caches them per album, and adjusts lightness until the colour meets
contrast targets against the neutral page (3:1 for marks and bars, 4.5:1 for text). If extraction fails, the neutral
design is used.

`PALETTE_ROLE_MAP` in [`mapPaletteToTokens.ts`](src/catalogue/palette/mapPaletteToTokens.ts) is the only place that
decides where album colour appears. By default the **dominant** colour drives `--active` (progress, active
navigation, current-track and selected markers) and `--cover-shadow`. Page surface, text, lyrics and separators always
stay neutral; secondary, accent, light and dark are extracted but reserved. Change the map to re-theme without
touching any page.

## Preview mode

**Preview without Spotify** (or `/?preview`) runs the whole interface on a sample catalogue built from
`docs/handoff/catalogue_seed_data.json`: sample track lists and timings, generated cover plates, original test lyric
lines with translations, and a simulated playback clock. It never calls Spotify, LRCLIB or a translation service and
never plays audio, so it is safe for demos, design review and tests. It is available only while no Spotify account
is connected; hide it with `VITE_ENABLE_PREVIEW=false`.

## Keyboard

- `/` focuses search from anywhere; in results, `↓` / `↑` move, `Enter` opens or plays, `Esc` returns to the field.
- `Space` plays or pauses when focus is not on a control.
- Seek and volume sliders take arrow keys, `Page Up` / `Page Down`, `Home` and `End`.
- Focus rings are always visible, and `prefers-reduced-motion` turns transitions and lyric motion off.

## Architecture

React 19 + TypeScript + Vite, CSS Modules on a small token layer
([`src/styles/tokens.css`](src/styles/tokens.css)), TanStack Query for catalogue data, React Router. No UI kit.

```text
src/
  app/            services, configuration, session (Spotify or preview), routes, shell (rail, top bar, mini player, queue drawer)
  auth/           Authorization Code + PKCE, token store, cross-tab refresh, connect and callback screens
  spotify/        typed Web API client (401 refresh, 429 / 5xx backoff), endpoints, mappers, error taxonomy, scopes
  playback/       the single playback store, Web Playback SDK adapter, Spotify engine, playback clock
  catalogue/
    data/         CatalogueSource interface (Spotify or preview) and query hooks
    editorial/    artist and album overrides
    palette/      cover colour extraction, contrast safety, token mapping
    pages/        Home, Now Playing, Artist, Album
    components/   buttons, covers, lists, player controls, lyrics panel, state panels
  search/         Search page
  lyrics/         LyricsProvider, LRC parser, lyric sync, cache, LRCLIB and mock providers
  translation/    TranslationProvider, language detection, browser / http / mock providers
  preview/        sample catalogue, preview data source and simulated engine
  domain/         app-level types shared by all of the above
```

**Playback is one source of truth.** Web Playback SDK events (when this browser is the active device) or Web API
polling (when another device is) feed a single store holding the track, album, artists, position anchor, duration,
paused state, device, volume and context. The position is never counted by a timer: it is computed from the last
anchor as `positionAt(snapshot, now)`, and both the progress bar and the lyric cursor derive from that — so lyrics
follow seeks, pauses, device switches and track changes. Commands update the store optimistically and reconcile with
Spotify's next report; reads older than a newer command are discarded.

The engine handles SDK connect / reconnect, token refresh, `authentication` / `account` / `playback` errors,
autoplay blocking, transfer to and from this browser, "no active device", and restoring state after a browser
refresh. Each failure has a designed state instead of a silent failure.

## Known limitations

- **Development Mode.** Up to five allow-listed users, and the owner needs Premium (Spotify's February 2026
  changes). A wider audience needs Spotify's extended quota approval.
- **Premium and browser support.** Playback control (SDK and Web API player endpoints) requires Premium. Audio in
  the browser needs the Web Playback SDK, i.e. a desktop browser with protected-media (EME/Widevine) support; mobile
  browsers are not supported. Without it the app controls another Spotify device instead.
- **Autoplay.** Browsers block audio until the page has had a click or key press, so the first play in a session
  may need one.
- **Development Mode API limits.** Search returns at most 10 results per type per page, and an artist's discography
  loads 10 releases at a time (both have **Show more**). Artist top tracks are no longer available to new apps, so
  the Artist page shows releases.
- **Deprecated fields.** Followers, genres, popularity and record label may be missing from API responses; the UI
  never depends on them.
- **Playlists.** Spotify returns playlist items only for playlists you own or collaborate on, so playlists on Home
  play as a context without a track list.
- **Queue.** Read-only: the Web API cannot reorder or remove queue items. Podcast episodes, audiobooks, ads and local
  files are not shown in Now Playing — it shows the idle state while they play.
- **Rate limits.** When Spotify's `Retry-After` header is not exposed to the browser, the client falls back to
  exponential backoff; long limits show a designed "rate limited" state.
- **Lyrics.** LRCLIB is community-sourced, so coverage and timing vary, and each lookup sends the track title,
  artist, album and duration to lrclib.net. Use `VITE_LYRICS_PROVIDER=none` to disable it.
- **Translation.** The `browser` provider works only in desktop Chrome with the built-in Translator API; elsewhere
  configure an `http` endpoint or leave translation off. Output is machine translation.
- **Cover colour.** If a cover image cannot be read (network, CORS or decode failure), that album uses the neutral
  palette.
- **Preview data.** Track lists, durations and lyric lines in preview mode are samples, not Spotify data.

## Project documents

The original handoff — prompt, design and functional specs, architecture notes, acceptance checklist, reference HTML
and seed data — is kept in [`docs/handoff/`](docs/handoff/). [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) records how
each acceptance item is met and verified.
