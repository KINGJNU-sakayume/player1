# Catalogue Acceptance Checklist

## Scope
- [ ] No Specimen Book route, component, tab, or production control
- [ ] No Curatorial Note on Now Playing
- [ ] No palette/type design-lab UI
- [ ] No prototype-only exhibition labels

## Typography
- [ ] Small functional text is readable on a normal desktop monitor
- [ ] No functional text below the agreed readability floor without a strong reason
- [ ] Current lyric is visually dominant
- [ ] Korean / Japanese / English typography feels consistent

## Now Playing
- [ ] Fits in one desktop viewport without page scroll
- [ ] Album cover remains square and large
- [ ] Title / artist / album are directly associated with cover
- [ ] Current lyric + translation + next two lines visible
- [ ] Translation can be toggled
- [ ] Controls are integrated into the composition
- [ ] Seek works
- [ ] Previous / play-pause / next work against actual player state
- [ ] No independent fake timer once Spotify is connected
- [ ] Lyrics derive from real playback position
- [ ] Lyrics-unavailable state is designed

## Artist
- [ ] Artist image and biography are visually close
- [ ] Release covers are restrained, not viewport-dominating
- [ ] Vaundy editorial override works
- [ ] Tyler editorial override works
- [ ] tripleS editorial override works
- [ ] Non-curated artists render correctly without editorial prose

## Album
- [ ] Cover/title/artist/metadata/description are grouped on the LEFT
- [ ] Full track sequence is on the RIGHT
- [ ] Track sequence is visible early, not pushed below a giant hero
- [ ] Complete album track data is used
- [ ] Non-curated albums work without a description
- [ ] Current playing track can be identified

## Spotify
- [ ] Authorization uses a currently supported Spotify flow
- [ ] Browser SPA does not contain Spotify client secret
- [ ] Token refresh/re-auth behavior is handled
- [ ] Web Playback SDK errors have useful UI
- [ ] No-active-device state has useful UI
- [ ] Scopes are minimal and documented

## Lyrics / Translation
- [ ] Provider abstraction exists
- [ ] Mock provider exists for development/tests
- [ ] Translation provider is replaceable
- [ ] Missing lyrics do not break playback
- [ ] Missing translation does not break lyrics
- [ ] Cache exists where appropriate

## Palette
- [ ] Palette extraction is centralized
- [ ] Extraction failure returns neutral design
- [ ] Contrast safety is checked
- [ ] Album color does not automatically recolor all text/background
- [ ] Palette mapping can be changed in code without rewriting pages

## Quality
- [ ] Keyboard focus is visible
- [ ] Buttons have accessible labels
- [ ] Reduced motion is respected
- [ ] Desktop wide layout manually inspected
- [ ] Narrow desktop layout manually inspected
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Production build passes
- [ ] README setup is updated
