# Acceptance record

How each item of [`handoff/CATALOGUE_ACCEPTANCE_CHECKLIST.md`](handoff/CATALOGUE_ACCEPTANCE_CHECKLIST.md) is met, and
how it was verified.

**Verification method.** Automated checks (`npm run check`): typecheck, lint, 128 Vitest tests in 16 files, and the
production build. Visual and interaction checks ran in Chromium (Playwright) at 1024×768, 1152×864, 1280×800,
1440×900, 1920×1080 and 2560×1440, in two setups:

- **Preview mode** — the offline sample catalogue with a simulated clock.
- **Spotify mode with fixtures** — the real Spotify code path with Web API and LRCLIB responses stubbed from the
  official OpenAPI schema and LRCLIB's server source, and a fake Web Playback SDK device in unit tests.

The build environment could not reach Spotify, so **nothing has been run against a real Spotify account yet**. Before
release, run the [real-account pass](#real-account-pass) at the end of this document.

## Scope

| Item | Status | How |
| --- | --- | --- |
| No Specimen Book route, component, tab or production control | Met | Routes are Home, Search, Now Playing, Album, Artist, `/callback` and a 404 page ([`SessionRoot.tsx`](../src/app/SessionRoot.tsx)). No Specimen code exists. |
| No Curatorial Note on Now Playing | Met | Now Playing shows cover, identity, lyrics and controls only. |
| No palette / type design-lab UI | Met | Palette use is code-only (`PALETTE_ROLE_MAP`); type sizes are tokens. |
| No prototype-only exhibition labels | Met | Headings are functional: "Recently played", "Track sequence", "Selected releases". |

## Typography

| Item | Status | How |
| --- | --- | --- |
| Small functional text readable on a desktop monitor | Met | Floor tokens: 14 px (`--text-micro`) and 15 px (`--text-small`); body 18 px. |
| Nothing below the floor without a strong reason | Met | No functional text is below 14 px. The only smaller lettering is inside generated placeholder sleeves: decorative, `aria-hidden`, and repeating the real title beside it. |
| Current lyric visually dominant | Met | 56–64 px current line (by viewport) against 22 px upcoming lines, weight and ink contrast. |
| Korean / Japanese / English consistent | Met | IBM Plex Sans + Noto Sans KR + Noto Sans JP. Each lyric line and editorial text carries its `lang`, so `:lang()` rules pick CJK glyphs and line height. Checked with Japanese, Korean and mixed Korean/English songs. |

## Now Playing

| Item | Status | How |
| --- | --- | --- |
| Fits one desktop viewport, no page scroll | Met | Fixed-viewport shell from 960×600 up; measured `scrollHeight == clientHeight` at every size above. |
| Album cover square and large | Met | `aspect-ratio: 1`, sized by container query (`--art`) against the reading column and height. |
| Title / artist / album tied to the cover | Met | Identity block directly under the cover in the same column. |
| Current lyric + translation + next two lines | Met | [`LyricsPanel`](../src/catalogue/components/player/LyricsPanel.tsx) renders the active line, its translation and two upcoming lines from `useLyricCursor`. |
| Translation can be toggled | Met | `aria-pressed` toggle, remembered in local preferences. |
| Controls integrated into the composition | Met | [`PlaybackControls`](../src/catalogue/components/player/PlaybackControls.tsx) sit in the reading column: transport, scrub bar with times, volume, queue, like, translation and device picker. |
| Seek works | Met (fixtures) | Pointer and keyboard seeking; SDK `seek` when this browser plays, `PUT /me/player/seek` otherwise. |
| Previous / play-pause / next against actual player state | Met (fixtures) | Optimistic update, then reconcile with the SDK event or the next `GET /me/player`; failed commands raise an issue and re-read the state ([`spotifyEngine.test.ts`](../src/playback/spotifyEngine.test.ts)). |
| No independent fake timer once Spotify is connected | Met | The simulated clock exists only in the preview engine. In Spotify mode the position is `positionAt(snapshot, now)` from the last SDK / Web API anchor ([`playerReducer.test.ts`](../src/playback/playerReducer.test.ts)). |
| Lyrics derive from real playback position | Met | The lyric cursor is a binary search over line start times at `positionAt(...)` ([`lyricSync.test.ts`](../src/lyrics/lyricSync.test.ts)); seeks, pauses and track changes move it immediately. |
| Lyrics-unavailable state designed | Met | Separate states for no timed lyrics, provider error and instrumental; playback continues. |

## Artist

| Item | Status | How |
| --- | --- | --- |
| Artist image and biography visually close | Met | Portrait and text share one head grid. |
| Release covers restrained | Met | Selected releases use 120 px covers; the full discography is a compact table (year, title, type, tracks). |
| Vaundy / Tyler / tripleS editorial overrides | Met | [`artists.ts`](../src/catalogue/editorial/artists.ts), keyed by Spotify artist ID, with featured release IDs and a title fallback ([`lookup.test.ts`](../src/catalogue/editorial/lookup.test.ts)). |
| Non-curated artists render without editorial prose | Met | No entry means no bio block; name, image and releases come from Spotify. Checked with the non-curated preview artist and fixture artists. |

## Album

| Item | Status | How |
| --- | --- | --- |
| Cover / title / artist / metadata / description grouped LEFT | Met | Two columns from narrow desktop (≥ 861 px viewport) up. The cover sits beside the title where the column allows (≥ 441 px), otherwise above it; the columns stack only at tablet widths. |
| Full track sequence on the RIGHT | Met | Right column, grouped by disc for multi-disc albums. |
| Track sequence visible early | Met | The sequence starts at the top of the right column; the identity column is sticky on tall viewports. |
| Complete album track data used | Met | The album's embedded first page plus every further `/albums/{id}/tracks` page ([`spotifySource.ts`](../src/catalogue/data/spotifySource.ts)). |
| Non-curated albums work without a description | Met | The description block is omitted. |
| Current playing track identifiable | Met | Accent marker, playing indicator and `aria-current`. |

## Spotify

| Item | Status | How |
| --- | --- | --- |
| Currently supported authorization flow | Met | Authorization Code with PKCE (S256), `127.0.0.1` loopback redirect ([`auth.test.ts`](../src/auth/auth.test.ts) includes the RFC 7636 test vector). |
| No client secret in the SPA | Met | No secret is read or sent; a test asserts the authorize URL has none. |
| Token refresh / re-auth handled | Met | Refresh 60 s before expiry and on `401`; merged across tabs; revoked refresh tokens lead to a Reconnect screen. |
| Web Playback SDK errors have useful UI | Met | Unsupported browser, Premium required, authentication (one silent refresh and reconnect first), playback errors, autoplay blocked, device offline / reconnecting. |
| No-active-device state has useful UI | Met | Offers "Play in this browser" or another device from the picker; never fails silently. |
| Scopes minimal and documented | Met | [`scopes.ts`](../src/spotify/scopes.ts) lists each scope with its feature; README table. |

## Lyrics / Translation

| Item | Status | How |
| --- | --- | --- |
| Provider abstraction | Met | `LyricsProvider` — the handoff interface plus `id` / `label`. |
| Mock provider for development / tests | Met | Original, non-copyright test lines. |
| Translation provider replaceable | Met | `browser`, `http`, `mock`, `none` behind `TranslationProvider`; selected by environment variable. |
| Missing lyrics do not break playback | Met | Lyrics load independently of the player store; failures become lyric states. |
| Missing translation does not break lyrics | Met | Translation failures leave the translation row empty or show "Translation unavailable". |
| Cache where appropriate | Met | Bounded `localStorage` caches with TTL: lyrics, translations and palettes. |

## Palette

| Item | Status | How |
| --- | --- | --- |
| Extraction centralized | Met | [`src/catalogue/palette/`](../src/catalogue/palette/) with a per-album cache. |
| Extraction failure returns the neutral design | Met | `NEUTRAL_TOKENS` fallback ([`palette.test.ts`](../src/catalogue/palette/palette.test.ts)). |
| Contrast safety checked | Met | WCAG contrast against the page: 3:1 for marks, 4.5:1 for text, with a hue-preserving lightness adjustment. |
| Album colour does not recolor all text / background | Met | Only `--active*` and `--cover-shadow` change; surfaces, text, lyrics and separators stay neutral. |
| Mapping changeable in code without rewriting pages | Met | `PALETTE_ROLE_MAP` in [`mapPaletteToTokens.ts`](../src/catalogue/palette/mapPaletteToTokens.ts). |

## Quality

| Item | Status | How |
| --- | --- | --- |
| Keyboard focus visible | Met | Global `:focus-visible` ring; checked on the rail, controls, sliders, track rows and search results. |
| Buttons have accessible labels | Met | Icon-only buttons carry `aria-label`; integration tests query controls by role and name. |
| Reduced motion respected | Met | `prefers-reduced-motion` zeroes transition tokens and disables animations. |
| Desktop wide layout inspected | Met | 1440×900, 1920×1080, 2560×1440. |
| Narrow desktop layout inspected | Met | 1024×768, 1152×864, 1280×800. |
| Typecheck / lint / tests / production build pass | Met | `npm run check`. |
| README setup updated | Met | [`README.md`](../README.md). |

## Real-account pass

Run with a Premium account on a desktop browser after completing the Spotify app configuration in the README:

1. Connect, approve the scopes, and land back on the page you started from.
2. Start an album from the Album page: audio plays in the browser, the track row shows as playing, and Now Playing
   lyrics follow the audio.
3. Seek, pause, skip back and forward, and change volume from Now Playing and the mini player.
4. Start music on a phone: the app shows that device and controls it; **Play in this browser** transfers it back.
5. Reload the page mid-song: playback state, position and lyrics resume.
6. Leave the tab for over an hour: the token refreshes without a visible interruption.
7. Like the current track and save an album; confirm both in the Spotify app.
