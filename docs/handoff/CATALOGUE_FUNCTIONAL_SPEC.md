# Catalogue Functional Specification

## Core user flow

1. User opens app.
2. If unauthenticated, connect to Spotify.
3. App restores token/session.
4. Home shows useful personal listening surfaces.
5. User selects a track/album/search result.
6. Playback is transferred/started in the browser player when possible.
7. Now Playing updates from real Spotify playback state.
8. Timed lyrics follow playback position.
9. Translation follows active lyric line.
10. Artist/album names navigate to corresponding catalogue pages.

## Player behavior

State:
- track identity
- Spotify URI
- cover
- artist(s)
- album
- playing/paused
- duration
- position
- volume
- active device
- context URI
- optional queue

Controls:
- previous
- play/pause
- next
- seek
- volume
- save/like if implemented
- queue
- translation on/off

The UI must not simulate independent playback once Spotify is connected.

## Lyrics

### Line selection

For sorted lines:
- choose the greatest `startMs <= currentPositionMs`
- if `endMs` exists, use it to validate active interval
- upcoming = next two timed lines

Update from the centralized playback clock.

### Fallbacks

Timed lyrics absent:
- show a clean "Timed lyrics unavailable" state
- keep playback controls fully usable

Translation absent:
- hide translation row
- keep original lyrics

Provider failure:
- retry only when reasonable
- no modal blocking playback

## Search

Search screen should support:
- tracks
- artists
- albums
- playlists where API allows

Requirements:
- debounce input
- cancellation/ignore stale responses
- loading state
- keyboard selection where practical
- result type clearly indicated

## Artist

Normal Spotify data:
- name
- image
- followers/popularity only if actually useful
- albums/releases

Optional local editorial override:
- longer bio
- manually selected releases

Do not generate fake artist biography in the client.

## Album

Always:
- cover
- title
- artist
- release metadata
- complete track list

Optional local editorial override:
- 1–3 description paragraphs

Track sequence is informative even when individual track rows are not separately styled as cards.

## Home / Library

Minimum useful surfaces:
- recently played
- saved albums
- playlists
- optionally saved tracks

Keep API calls cached sensibly.

## Queue

A right drawer is acceptable.

If exact Spotify queue manipulation is unavailable or constrained:
- display reliable queue/context information that is actually available
- do not fake successful remote changes

## Persistence

Local persistence may include:
- auth PKCE verifier during flow
- preferred translation language
- translation enabled
- cached timed lyrics
- cached translated lines
- cached extracted palette
- editorial overrides are source-controlled local data

Do not persist sensitive secrets.

## Error states

Provide designed inline states for:
- login required
- expired authorization
- no active device
- no track playing
- Web Playback SDK unavailable
- Spotify API error
- lyrics unavailable
- translation unavailable

## Performance

- do not re-extract cover palette on every render
- memo/cache by album ID or image URL
- avoid polling if playback SDK events provide state
- if a position clock is needed, update UI efficiently
- cancel obsolete search requests
