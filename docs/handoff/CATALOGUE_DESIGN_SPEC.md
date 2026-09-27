# Catalogue Design Specification

## 1. Design thesis

ARC Music Catalogue는 스트리밍 서비스의 기능성을 유지하면서, 음반을 '콘텐츠 카드'가 아니라 **한 장의 음반 오브젝트와 그 주변의 편집 정보**로 보는 UI다.

핵심은 화려한 장식이 아니라:
- 큰 앨범 커버
- 읽히는 활자
- 정확한 선과 여백
- 동기화된 가사
- 앨범 단위 탐색

이다.

## 2. Visual language

### Base

- warm off-white / paper neutral
- near-black text
- thin rules
- square imagery
- little or no border radius
- subtle shadow only around album art
- no full-screen gradient wash

### Typography

Humanist multilingual:
- IBM Plex Sans
- Noto Sans KR
- Noto Sans JP

Minimum practical desktop scale:
- tiny/meta: 14px
- small: 15px
- body: 18px
- strong body: 20px
- section: 20–22px
- track/album title: 48–56px
- current lyric: 56–64px
- upcoming lyric: 20–24px

If content does not fit:
1. reduce cover
2. reduce gaps
3. reflow columns
4. only then consider small type changes

Do not solve layout overflow by shrinking body text below the readability floor.

## 3. Now Playing

### Layout

```text
┌────────────────────────────────────────────────────┐
│ top navigation                                     │
├───────────────────────┬────────────────────────────┤
│                       │ Lyrics                     │
│ large album cover     │                            │
│                       │ CURRENT LINE               │
│ title                 │ translation                │
│ artist · album        │ next line                  │
│                       │ next line                  │
│                       │                            │
│                       │ controls / progress        │
└───────────────────────┴────────────────────────────┘
```

- 100vh
- no page scroll
- cover side approximately 40–45%
- lyric side approximately 55–60%
- cover remains square and visually dominant, but current lyric is the dominant text element
- controls belong to the lyric side's lower edge and share its grid
- no detached black footer

### Lyrics

- current: highest contrast
- translation: directly below
- next 2 lines: lower contrast
- smooth transition on active line changes
- no karaoke bounce
- no per-word animation in first implementation
- translation toggle is functional

## 4. Home

Home can scroll.

Editorial catalogue approach:
- section title + restrained album grid
- rows can be used for recently played / playlists
- avoid card chrome
- image, title, artist are enough
- hover can reveal play affordance without large floating pills

## 5. Artist page

Target composition:

```text
┌─────────────────────────────────────────────┐
│ [artist image ~320–380px]  Artist name      │
│                           short bio         │
│                           metadata          │
├─────────────────────────────────────────────┤
│ selected releases                           │
│ [small cover + text] [small cover + text]  │
│ [small cover + text]                        │
└─────────────────────────────────────────────┘
```

Important:
- actual artist photo close to biography
- release cover size roughly 100–150px in desktop exhibition row
- do not use three giant square covers spanning the viewport
- hard-coded editorial text is optional
- generic artists should still display cleanly without custom prose

## 6. Album page

Mandatory two-column structure.

```text
┌────────────────────────┬────────────────────────────┐
│ [cover]  album title   │ TRACK SEQUENCE             │
│          artist        │ 01 Track ........... 3:20 │
│          release meta  │ 02 Track ........... 3:10 │
│                        │ 03 Track ........... 3:32 │
│ description below      │ ...                        │
│ cover/info group       │                            │
└────────────────────────┴────────────────────────────┘
```

Left:
- cover approximately 220–300px
- album title beside cover
- artist beside/under title
- release / track count / runtime
- description under the grouped cover/title region
- left column can become sticky on long albums

Right:
- track sequence begins near the top
- all available tracks as compact readable rows
- no huge hero that pushes tracks down
- current track can receive a thin accent / active marker

## 7. Album-derived color

Palette is semantic, not decorative.

Extract:
- dominant
- secondary
- accent
- light
- dark

Default mapping:
- dominant → active navigation, progress, selected marker
- dominant → subtle cover shadow
- neutral → page surface, main text, lyric text, separators
- secondary/accent → available for future album-specific overrides

Do not expose a production control panel.

## 8. Motion

Use:
- 180–300ms navigation fades
- lyric movement with restrained easing
- hover image scale <= ~1.02

Avoid:
- springy motion
- glowing effects
- bouncing controls
- excessive parallax
- large background animation

## 9. What must NOT appear

- Specimen Book
- curatorial note on playback page
- object essay
- palette extraction explanation
- design influence panel
- typography lab
- palette lab
- huge decorative serial numbers
- exhibition folio numbers
- fake museum metadata in production UI
