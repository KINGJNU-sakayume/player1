# CODEX IMPLEMENTATION PROMPT — ARC Music / Catalogue Version Only

Read this entire prompt before editing anything.

## 0. Scope boundary

Implement **only the Catalogue version** of ARC Music.

Do **not** implement, preserve, revive, or port the Specimen Book player.  
Do **not** add a design-lab UI, palette-lab UI, typography-lab UI, experimental sliders, curatorial-note panels, exhibition labels, or prototype-only controls.

The visual starting point is `catalogue_reference_v4.html`, but it is a reference, not production code.

Before writing code:
1. Inspect the whole repository.
2. Read existing package configuration, routing, state management, styles, environment setup, and deployment workflow.
3. Reuse the existing stack and conventions.
4. Do not rewrite the app framework just because a different stack is easier.
5. Identify obsolete prototype/Specimen code and isolate it from the Catalogue implementation. Do not delete unrelated user data without a clear reason.

If the repository is effectively empty, default to:
- React
- TypeScript
- Vite
- CSS Modules or a small disciplined global CSS/token layer
- no heavyweight UI component library

## 1. Product goal

Build a personal Spotify-based music player that feels like a **modern music catalogue / editorial record collection**, rather than a clone of Spotify or Apple Music.

The app should feel:
- calm
- precise
- editorial
- tactile without skeuomorphism
- premium without luxury clichés
- highly legible on a desktop monitor
- distinctly human-designed

Avoid:
- glassmorphism
- purple/blue AI gradients
- excessive rounded cards
- pill buttons everywhere
- giant empty areas with unreadably small text
- decorative UI that has no function
- animation for animation's sake
- generic dashboard layouts

## 2. Canonical design language

Use the following multilingual Humanist system:

- Latin: IBM Plex Sans
- Korean: Noto Sans KR
- Japanese: Noto Sans JP

Typography baseline:
- micro/small labels: 14–15px
- normal body: ~18px
- secondary body: ~16px where necessary
- section heading: 18–22px
- track title / album title: 48–56px on desktop where space permits
- current lyric: 56–64px
- upcoming lyric: ~22px
- never shrink functional text merely to preserve a layout; reflow the layout instead

The interface should use neutral warm paper/off-white surfaces with album-derived colors as controlled accents.

### Production palette rule

Do not expose palette controls to the end user.

Album-art colors may influence:
- active/playback progress
- active navigation marker
- subtle cover shadow
- small selected-state accents

By default, album colors must **not** recolor:
- all body text
- the whole page background
- every separator
- all lyrics

The neutral editorial base must remain stable so switching tracks does not visually destabilize the app.

Implement the palette logic as a reusable service/token generator so mappings can be changed later without rewriting components.

## 3. Required screens

### A. Home

Scrollable.

Required:
- Recently played
- Albums / saved albums
- playlists or a useful personal-library section
- compact search entry point
- album art must remain visually important
- avoid giant card UI
- rows and grids should look like a catalogue index

Clicking playable content should:
- start or request Spotify playback
- navigate/update Now Playing state

### B. Now Playing — Catalogue layout

This is the most important screen.

Desktop:
- exactly one viewport high
- no page-level vertical scroll
- left: large square album cover
- directly below cover: track title, artist, album
- right: synchronized lyrics
- current lyric is the primary typographic element
- Korean translation directly beneath current lyric when enabled
- next 2 lines visible at reduced emphasis
- lyrics move smoothly as the playback position changes
- controls are visually integrated into the page, not a detached black Spotify-style footer

Include:
- previous
- play/pause
- next
- seek/progress
- current time / total time
- volume
- queue
- like/save if feasible with current API scopes
- translation toggle
- device/playback-state feedback where useful

Do not add:
- Curatorial Note
- Object Essay
- Palette Extraction
- Design Influence labels
- exhibition metadata

### C. Artist page

Scrollable if necessary.

Use a cohesive editorial two-part composition:
- actual artist image
- artist name + short useful bio close to the image, not floating far away
- 3–5 album/release objects displayed at a restrained size
- releases should feel exhibited, not like oversized shopping cards

For the initial hard-coded editorial demo, support:
- Vaundy
- Tyler, The Creator
- tripleS

The app must still work for every other Spotify artist using normal Spotify metadata even if a hand-written bio is unavailable.

Implement optional local editorial overrides:
`artistEditorial[spotifyArtistId]`

When no override exists, fall back gracefully to Spotify/public metadata available through the chosen data layer. Never show placeholder prose pretending an editorial override exists.

### D. Album page

This layout is mandatory:

**LEFT**
- album cover
- album title
- artist
- release metadata
- useful album description if a local editorial override exists

**RIGHT**
- full track sequence
- track number
- title
- duration
- playback state / currently playing marker
- enough rows visible at once to understand the album sequence

The cover/title/description must be spatially grouped together.
The track list must be clearly separated on the right.

No giant hero layout that pushes the track sequence below the fold on a standard desktop monitor.

Use optional:
`albumEditorial[spotifyAlbumId]`

If no editorial description exists, omit the description area cleanly instead of filling it with generic AI text.

### E. Search

Implement a practical Spotify search surface:
- track
- artist
- album
- playlist where supported
- keyboard friendly
- opening a result should use the same shared player/navigation state

### F. Queue / playback context

Queue can be a right drawer or compact secondary surface.
It should not visually dominate the app.

## 4. Spotify integration

Use Spotify's current official developer documentation and OpenAPI schema. Do not guess endpoint paths or response fields.

Browser-only SPA:
- use Authorization Code with PKCE
- never ship a client secret in frontend code
- never use the deprecated Implicit Grant flow

If the existing repository already has a secure backend:
- a server-side Authorization Code flow is acceptable
- keep secrets server-side

Use Spotify Web Playback SDK when browser playback is appropriate for the authorized account.

Implement clear modules:
- auth
- Spotify Web API client
- playback SDK adapter
- player state
- library/search
- navigation data

Do not scatter raw `fetch()` calls across UI components.

Request only scopes actually required by the implemented features.

Environment configuration must be documented in `.env.example`.
Never commit real credentials.

## 5. Lyrics and translation

Do not assume Spotify Web API provides the lyrics feature needed by this app.

Create provider interfaces:

```ts
interface TimedLyricLine {
  startMs: number;
  endMs?: number;
  text: string;
}

interface TimedLyrics {
  language?: string;
  lines: TimedLyricLine[];
}

interface LyricsProvider {
  getTimedLyrics(track: TrackIdentity): Promise<TimedLyrics | null>;
}

interface TranslationProvider {
  translateLines(
    lines: TimedLyricLine[],
    sourceLanguage: string | undefined,
    targetLanguage: string
  ): Promise<string[]>;
}
```

Requirements:
- lyrics provider is replaceable
- translation provider is replaceable
- cache lyrics and translations locally where reasonable
- UI must work when lyrics are unavailable
- UI must work when translation is unavailable
- do not block playback on lyric/translation failures

For development, include a small local mock provider using non-copyright test lines.

## 6. Playback state

Create one source of truth for:
- active track
- album
- artist
- playback position
- duration
- paused/playing
- device state
- volume
- queue/context if available

The lyrics view must derive its active line from playback position, not from an independent timer.

Handle:
- SDK reconnect
- token refresh
- playback transferred to another device
- no active device
- track change
- browser refresh
- stale API data

## 7. Responsive behavior

Primary target: desktop monitor, wide landscape.

Now Playing:
- desktop: no vertical scroll
- maintain album/lyrics balance
- never allow lyrics to be clipped by the control area
- at narrower desktop widths, reduce cover before shrinking text below the typography floor

Artist/Album/Home/Search:
- scrolling is acceptable
- maintain readable widths
- album track sequence must stay easy to scan

Do not optimize the desktop design away merely to make a generic mobile-first layout.

## 8. Architecture

Prefer feature boundaries such as:

```text
src/
  app/
  auth/
  spotify/
  playback/
  lyrics/
  translation/
  catalogue/
    components/
    pages/
    editorial/
  search/
  library/
  styles/
```

Do not force this exact structure if the repository already has a good architecture.

Keep:
- Spotify transport logic out of React presentation components
- editorial overrides separate from API response models
- visual tokens centralized
- album palette extraction/mapping centralized
- timed lyric synchronization testable as pure logic

## 9. Local editorial overrides

Create simple typed local data for hand-curated artist/album descriptions.

Examples only:
- Vaundy
- Tyler, The Creator
- tripleS

Do not require every artist or album to have an override.

Data should look conceptually like:

```ts
type ArtistEditorial = {
  artistId: string;
  bio?: string[];
  featuredReleaseIds?: string[];
};

type AlbumEditorial = {
  albumId: string;
  description?: string[];
};
```

Keep these files easy for the user to hand-edit later.

## 10. Album color extraction

Implement as a utility, not as view-specific code.

Output semantic roles, for example:

```ts
type AlbumPalette = {
  dominant: string;
  secondary: string;
  accent: string;
  light: string;
  dark: string;
};
```

Requirements:
- cache by image URL / album ID
- validate contrast before using a color for text
- default to neutral tokens if extraction fails
- do not recolor the entire application by default
- mapping from semantic palette roles to UI regions must be centralized

## 11. States that must look designed

Create intentional states for:
- loading
- Spotify disconnected
- authorization required
- no playback device
- no active track
- lyrics unavailable
- translation unavailable
- album art missing
- API rate/error state

No raw browser alerts for normal application states.

## 12. Accessibility / interaction

- visible keyboard focus
- semantic buttons
- meaningful alt text where appropriate
- progress control keyboard accessible
- controls have labels/tooltips
- respect `prefers-reduced-motion`
- adequate contrast even when album colors are unusual

## 13. Testing

At minimum test:
- lyric active-line calculation
- formatting playback time
- palette fallback/contrast logic
- editorial override lookup
- player-state transitions where practical

Run and fix:
- typecheck
- lint
- tests
- production build

Do not stop at “code compiles”; manually inspect the main routes in browser-sized desktop layouts.

## 14. Acceptance gate

Before saying the implementation is complete, read and satisfy every item in:
`CATALOGUE_ACCEPTANCE_CHECKLIST.md`

Then update the project documentation with:
- setup
- Spotify app configuration
- required environment variables
- local development command
- production build/deploy command
- known limitations
- how to add artist/album editorial overrides
- how to swap lyrics/translation providers

## 15. Work sequence

Execute in this order:

1. repository audit
2. architecture plan
3. auth/API foundation
4. playback state + SDK adapter
5. Catalogue visual tokens
6. Now Playing page
7. lyrics synchronization
8. Home/Search
9. Artist page
10. Album page
11. editorial override layer
12. palette extraction/mapping
13. error/loading states
14. tests
15. final visual QA

Do not implement the Specimen Book at any point.
