# Catalogue Architecture & Integration Notes

## Spotify

Use current official Spotify docs and OpenAPI schema.

### Authentication

For a browser SPA, use Authorization Code with PKCE.

Suggested modules:

```text
auth/
  pkce.ts
  tokenStore.ts
  SpotifyAuthProvider.tsx

spotify/
  client.ts
  types.ts
  scopes.ts
  endpoints.ts

playback/
  spotifyPlaybackSdk.ts
  playerStore.ts
  playbackClock.ts
```

Do not place a client secret in frontend code.

## Data domains

Keep API transport models separate from UI domain models.

Example:

```ts
type TrackIdentity = {
  spotifyTrackId: string;
  uri: string;
  title: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  durationMs: number;
};

type PlayerSnapshot = {
  track: TrackIdentity | null;
  positionMs: number;
  durationMs: number;
  paused: boolean;
  volume: number;
  deviceId?: string;
};
```

## Timed lyrics

```text
lyrics/
  types.ts
  LyricsProvider.ts
  providers/
    MockLyricsProvider.ts
  lyricSync.ts
  lyricsCache.ts
```

The UI consumes one stable normalized format.

## Translation

```text
translation/
  TranslationProvider.ts
  translationCache.ts
  providers/
    ...
```

Cache by:
- track ID
- source language
- target language
- normalized line text or lyric version hash

## Editorial overrides

```text
catalogue/editorial/
  artists.ts
  albums.ts
  lookup.ts
```

Only three initial curated artists are needed:
- Vaundy
- Tyler, The Creator
- tripleS

Do not make editorial content a required property.

## Palette

```text
catalogue/palette/
  extractAlbumPalette.ts
  paletteCache.ts
  mapPaletteToTokens.ts
  contrast.ts
```

Semantic output:

```ts
type AlbumPalette = {
  dominant: string;
  secondary: string;
  accent: string;
  light: string;
  dark: string;
};
```

Production mapping default:
- `dominant` -> `--active`
- `dominant` -> subtle cover shadow
- neutral base -> background / paper / body text / lyric text / separators

The mapping should be easy to change later, but there is no end-user design-control UI.

## Routing

Suggested routes if the repository uses routing:

```text
/
 /search
 /now-playing
 /artist/:artistId
 /album/:albumId
```

If the app uses one persistent shell, the player state should survive route navigation.

## State boundaries

Global/shared:
- auth
- Spotify player
- current track/playback
- user preferences

Query/cache:
- search
- artists
- albums
- playlists
- recently played

Local component state:
- drawer open
- translation visibility
- ephemeral hover/focus

## Environment

Create `.env.example`, for example:

```dotenv
VITE_SPOTIFY_CLIENT_ID=
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback

# Only if a chosen lyrics / translation adapter requires a public-safe setting.
# Never put private provider secrets into VITE_ variables.
```

If a provider requires a secret, use an existing secure backend/serverless function.

## Deployment

Respect the repository's existing deployment workflow.

For static GitHub Pages-style deployment:
- routing must work under the configured base path
- OAuth redirect URI must exactly match a registered Spotify redirect
- do not assume `localhost` redirect semantics in production

Document exact production redirect setup.
