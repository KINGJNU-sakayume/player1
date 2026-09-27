import type {
  AlbumDetail,
  AlbumTrack,
  AlbumType,
  ArtistDetail,
  ArtistRef,
  PlaylistSummary,
  ReleaseDatePrecision,
  TrackIdentity,
} from '../domain/types';
import type { AlbumPalette } from '../catalogue/palette/types';
import { TEST_LINES_EN, TEST_LINES_JA, TEST_LINES_KO_MIXED, buildTimedLines } from '../lyrics/providers/testLines';
import type { TimedLyrics } from '../lyrics/types';
import seed from './catalogue_seed_data.json';

/**
 * Offline preview catalogue — shown only when the user chooses "Preview
 * without Spotify". Artist and album IDs are real Spotify IDs so editorial
 * overrides apply; track lists and durations are approximate sample data;
 * all lyric lines are original test lines. Nothing here is used once Spotify
 * is connected.
 */

type LyricSet = 'en' | 'ja' | 'mixed' | 'instrumental' | null;

interface TrackDef {
  id: string;
  name: string;
  durationMs: number;
  lyrics?: LyricSet;
}

interface AlbumDef {
  id: string;
  name: string;
  artistIds: string[];
  albumType: AlbumType;
  releaseDate: string;
  precision: ReleaseDatePrecision;
  totalTracks: number | null;
  label?: string;
  copyrights?: string[];
  /** Omitted when the preview does not include the track sequence. */
  tracks?: TrackDef[];
}

const TYLER = '4V8LLVI7PbaPR0K2TGSxFF';
const VAUNDY = '2IUl3m1H1EQ7QfNbNWvgru';
const TRIPLES = '5Z71xE9prhpHrqL5thVMyK';
const ENSEMBLE = '0ArcPreviewEnsemble';

export const PREVIEW_ARTISTS: ArtistDetail[] = [
  { id: TYLER, name: 'Tyler, The Creator' },
  { id: VAUNDY, name: 'Vaundy' },
  { id: TRIPLES, name: 'tripleS' },
  { id: ENSEMBLE, name: 'ARC Preview Ensemble' },
].map((a) => ({ ...a, uri: `spotify:artist:${a.id}`, images: [], genres: [], followers: null }));

const pv = (key: string, n: number) => `0Pv${key}${String(n).padStart(2, '0')}`;

function tracks(key: string, list: Array<[string, number, LyricSet?]>, realIds: Record<number, string> = {}): TrackDef[] {
  return list.map(([name, seconds, lyrics = 'en'], index) => ({
    id: realIds[index + 1] ?? pv(key, index + 1),
    name,
    durationMs: seconds * 1000,
    lyrics,
  }));
}

const ALBUMS: AlbumDef[] = [
  {
    id: '5zi7WsKlIiUXv09tbGLKsE',
    name: 'IGOR',
    artistIds: [TYLER],
    albumType: 'album',
    releaseDate: '2019-05-17',
    precision: 'day',
    totalTracks: 12,
    tracks: tracks(
      'Igor',
      [
        ["IGOR'S THEME", 200],
        ['EARFQUAKE', 190],
        ['I THINK', 212],
        ['EXACTLY WHAT YOU RUN FROM YOU END UP CHASING', 14, null],
        ['RUNNING OUT OF TIME', 177],
        ['NEW MAGIC WAND', 195],
        ['A BOY IS A GUN*', 210],
        ['PUPPET', 179],
        ["WHAT'S GOOD", 205],
        ['GONE, GONE / THANK YOU', 375],
        ["I DON'T LOVE YOU ANYMORE", 161],
        ['ARE WE STILL FRIENDS?', 265],
      ],
      { 1: '51RN0kzWd7xeR4th5HsEtW', 2: '5hVghJ4KaYES3BFUATCYn0' },
    ),
  },
  {
    id: '2nkto6YNI4rUYTLqEwWJ3o',
    name: 'Flower Boy',
    artistIds: [TYLER],
    albumType: 'album',
    releaseDate: '2017-07-21',
    precision: 'day',
    totalTracks: 14,
    tracks: tracks('FlowerBoy', [
      ['Foreword', 194],
      ['Where This Flower Blooms', 194],
      ['Sometimes...', 36, null],
      ['See You Again', 180],
      ['Who Dat Boy', 205],
      ['Pothole', 236],
      ['Garden Shed', 223],
      ['Boredom', 320],
      ["I Ain't Got Time!", 206],
      ['911 / Mr. Lonely', 255],
      ["Droppin' Seeds", 60, null],
      ['November', 225],
      ['Glitter', 224],
      ['Enjoy Right Now, Today', 235, 'instrumental'],
    ]),
  },
  {
    id: '45ba6QAtNrdv6Ke4MFOKk9',
    name: 'CALL ME IF YOU GET LOST',
    artistIds: [TYLER],
    albumType: 'album',
    releaseDate: '2021-06-25',
    precision: 'day',
    totalTracks: 16,
    tracks: tracks('Cmiygl', [
      ['SIR BAUDELAIRE', 93],
      ['CORSO', 160],
      ['LEMONHEAD', 130],
      ['WUSYANAME', 121],
      ['LUMBERJACK', 138],
      ['HOT WIND BLOWS', 156],
      ['MASSA', 216],
      ['RUNITUP', 197],
      ['MANIFESTO', 232],
      ['SWEET / I THOUGHT YOU WANTED TO DANCE', 588],
      ['MOMMA TALK', 77, null],
      ['RISE!', 172],
      ['BLESSED', 57, null],
      ['JUGGERNAUT', 158],
      ['WILSHIRE', 512],
      ['SAFARI', 185],
    ]),
  },
  {
    id: '3RhkGySFESW5d50IlNWuP1',
    name: '呼び声',
    artistIds: [VAUNDY],
    albumType: 'single',
    releaseDate: '2025',
    precision: 'year',
    totalTracks: 1,
    tracks: [{ id: '3kQf453SpkwX7ALdgzNSNY', name: '呼び声', durationMs: 234_000, lyrics: 'ja' }],
  },
  {
    id: '4dKFBa0YCH4636ZtY4L2p7',
    name: 'strobo',
    artistIds: [VAUNDY],
    albumType: 'album',
    releaseDate: '2020',
    precision: 'year',
    totalTracks: null,
  },
  {
    id: '4LWbfv8uvEF3oz7YBFxmzn',
    name: 'replica',
    artistIds: [VAUNDY],
    albumType: 'album',
    releaseDate: '2023',
    precision: 'year',
    totalTracks: 35,
  },
  {
    id: '1FEdDqMaOL8oZYzI4n27GM',
    name: '<ASSEMBLE24>',
    artistIds: [TRIPLES],
    albumType: 'album',
    releaseDate: '2024',
    precision: 'year',
    totalTracks: 10,
  },
  {
    id: '2X2nKgBuusDa4VqLI6hMU2',
    name: 'LOVElution <ↀ>',
    artistIds: [TRIPLES],
    albumType: 'album',
    releaseDate: '2023',
    precision: 'year',
    totalTracks: null,
  },
  {
    id: '0ZluUcxj1FrWoZX7BhW26K',
    name: 'EVOLution <⟡>',
    artistIds: [TRIPLES],
    albumType: 'album',
    releaseDate: '2023',
    precision: 'year',
    totalTracks: 8,
  },
  {
    id: '0ArcTestPressing01',
    name: 'Test Pressing',
    artistIds: [ENSEMBLE],
    albumType: 'album',
    releaseDate: '2026-09-01',
    precision: 'day',
    totalTracks: 6,
    label: 'ARC Preview',
    copyrights: ['℗ 2026 ARC Preview — sample data for the offline preview'],
    tracks: tracks('TestPress', [
      ['Rule and Margin', 214, 'en'],
      ['Index Card', 178, 'ja'],
      ['Paper Weight', 252, 'instrumental'],
      ['Thin Line', 201, 'mixed'],
      ['Catalogue Number', 227, null],
      ['Last Proof', 305, 'en'],
    ]),
  },
];

/** A track that is playable in the preview although its album's sequence is not included. */
const LOOSE_TRACKS: Array<{ albumId: string; track: TrackDef }> = [
  {
    albumId: '1FEdDqMaOL8oZYzI4n27GM',
    track: { id: '45OflED18VsURGw2z0Y6Cv', name: 'Girls Never Die', durationMs: 187_000, lyrics: 'mixed' },
  },
];

const artistById = new Map(PREVIEW_ARTISTS.map((a) => [a.id, a]));

function artistRefs(ids: string[]): ArtistRef[] {
  return ids.flatMap((id) => {
    const artist = artistById.get(id);
    return artist ? [{ id: artist.id, name: artist.name, uri: artist.uri }] : [];
  });
}

function toAlbumTrack(def: TrackDef, album: AlbumDef, index: number): AlbumTrack {
  return {
    id: def.id,
    uri: `spotify:track:${def.id}`,
    name: def.name,
    artists: artistRefs(album.artistIds),
    durationMs: def.durationMs,
    trackNumber: index + 1,
    discNumber: 1,
    explicit: false,
    isPlayable: true,
  };
}

function toAlbumDetail(album: AlbumDef): AlbumDetail {
  const albumTracks = (album.tracks ?? []).map((t, i) => toAlbumTrack(t, album, i));
  return {
    id: album.id,
    uri: `spotify:album:${album.id}`,
    name: album.name,
    artists: artistRefs(album.artistIds),
    images: [],
    albumType: album.albumType,
    releaseDate: album.releaseDate,
    releaseDatePrecision: album.precision,
    totalTracks: album.totalTracks,
    tracks: albumTracks,
    tracksComplete: Boolean(album.tracks),
    totalDurationMs: albumTracks.reduce((sum, t) => sum + t.durationMs, 0),
    label: album.label ?? null,
    copyrights: album.copyrights ?? [],
  };
}

export const PREVIEW_ALBUMS: AlbumDetail[] = ALBUMS.map(toAlbumDetail);
const albumById = new Map(PREVIEW_ALBUMS.map((a) => [a.id, a]));

function toIdentity(def: TrackDef, album: AlbumDetail): TrackIdentity {
  return {
    spotifyTrackId: def.id,
    uri: `spotify:track:${def.id}`,
    title: def.name,
    artists: album.artists,
    album: { id: album.id, name: album.name, uri: album.uri, images: [] },
    durationMs: def.durationMs,
    explicit: false,
  };
}

const trackDefs: Array<{ def: TrackDef; album: AlbumDetail }> = [
  ...ALBUMS.flatMap((album) => (album.tracks ?? []).map((def) => ({ def, album: albumById.get(album.id)! }))),
  ...LOOSE_TRACKS.map(({ albumId, track }) => ({ def: track, album: albumById.get(albumId)! })),
];

export const PREVIEW_TRACKS: TrackIdentity[] = trackDefs.map(({ def, album }) => toIdentity(def, album));
const trackByUri = new Map(PREVIEW_TRACKS.map((t) => [t.uri, t]));

export function previewTrack(uri: string): TrackIdentity | undefined {
  return trackByUri.get(uri);
}

export function previewAlbum(id: string): AlbumDetail | undefined {
  return albumById.get(id);
}

export function previewArtist(id: string): ArtistDetail | undefined {
  return artistById.get(id);
}

export function previewAlbumTracks(albumId: string): TrackIdentity[] {
  return PREVIEW_TRACKS.filter((t) => t.album.id === albumId);
}

/* ── Lyrics (original test lines) ───────────────────────────────────────── */

const LINE_SETS: Record<Exclude<LyricSet, null | 'instrumental'>, { texts: readonly string[]; language: string }> = {
  en: { texts: TEST_LINES_EN, language: 'en' },
  ja: { texts: TEST_LINES_JA, language: 'ja' },
  mixed: { texts: TEST_LINES_KO_MIXED, language: 'ko' },
};

export const PREVIEW_LYRICS: Record<string, TimedLyrics> = Object.fromEntries(
  trackDefs.flatMap(({ def }): Array<[string, TimedLyrics]> => {
    if (!def.lyrics) return [];
    if (def.lyrics === 'instrumental') return [[def.id, { lines: [], instrumental: true }]];
    const set = LINE_SETS[def.lyrics];
    return [[def.id, { language: set.language, lines: buildTimedLines(set.texts, def.durationMs) }]];
  }),
);

/* ── Library surfaces ───────────────────────────────────────────────────── */

const uri = (id: string) => `spotify:track:${id}`;

/** [track id, minutes ago] */
export const PREVIEW_RECENTLY_PLAYED: Array<[string, number]> = [
  ['5hVghJ4KaYES3BFUATCYn0', 4],
  ['3kQf453SpkwX7ALdgzNSNY', 18],
  ['45OflED18VsURGw2z0Y6Cv', 41],
  [pv('FlowerBoy', 4), 66],
  [pv('TestPress', 1), 132],
  [pv('Igor', 3), 205],
  [pv('Cmiygl', 4), 1470],
  [pv('TestPress', 4), 1530],
  [pv('Igor', 6), 2900],
  [pv('FlowerBoy', 8), 4400],
];

interface PreviewPlaylist extends PlaylistSummary {
  trackUris: string[];
}

const playlist = (id: string, name: string, description: string | null, trackIds: string[]): PreviewPlaylist => ({
  id,
  uri: `spotify:playlist:${id}`,
  name,
  description,
  images: [],
  ownerName: 'You',
  itemCount: trackIds.length,
  trackUris: trackIds.map(uri),
});

export const PREVIEW_PLAYLISTS: PreviewPlaylist[] = [
  playlist('0ArcLateDesk0001', 'Late desk', 'Quiet records for the last hour of work.', [
    pv('TestPress', 1),
    '3kQf453SpkwX7ALdgzNSNY',
    pv('FlowerBoy', 4),
    pv('Igor', 3),
    pv('TestPress', 4),
    pv('FlowerBoy', 12),
  ]),
  playlist('0ArcMorningIdx01', 'Morning index', null, [
    '5hVghJ4KaYES3BFUATCYn0',
    '45OflED18VsURGw2z0Y6Cv',
    pv('Cmiygl', 2),
    pv('TestPress', 6),
  ]),
  playlist('0ArcRotation0001', 'Heavy rotation', 'Everything on repeat this month.', [
    '45OflED18VsURGw2z0Y6Cv',
    '5hVghJ4KaYES3BFUATCYn0',
    '3kQf453SpkwX7ALdgzNSNY',
    pv('Cmiygl', 4),
    pv('FlowerBoy', 5),
    pv('Igor', 6),
    pv('TestPress', 2),
  ]),
];

export const PREVIEW_SAVED_ALBUM_IDS = [
  '5zi7WsKlIiUXv09tbGLKsE',
  '3RhkGySFESW5d50IlNWuP1',
  '1FEdDqMaOL8oZYzI4n27GM',
  '2nkto6YNI4rUYTLqEwWJ3o',
  '0ArcTestPressing01',
  '4LWbfv8uvEF3oz7YBFxmzn',
  '45ba6QAtNrdv6Ke4MFOKk9',
  '4dKFBa0YCH4636ZtY4L2p7',
  '0ZluUcxj1FrWoZX7BhW26K',
  '2X2nKgBuusDa4VqLI6hMU2',
];

/** Liked Songs, most recently liked first. */
export const PREVIEW_LIKED_TRACK_URIS = [
  uri('5hVghJ4KaYES3BFUATCYn0'),
  uri('3kQf453SpkwX7ALdgzNSNY'),
  uri(pv('FlowerBoy', 4)),
  uri('45OflED18VsURGw2z0Y6Cv'),
  uri(pv('Igor', 3)),
  uri(pv('TestPress', 1)),
  uri(pv('Cmiygl', 4)),
  uri(pv('Igor', 6)),
  uri(pv('TestPress', 4)),
  uri(pv('FlowerBoy', 8)),
  uri(pv('Cmiygl', 2)),
  uri(pv('TestPress', 6)),
];

export const PREVIEW_INITIALLY_SAVED_URIS = [...PREVIEW_LIKED_TRACK_URIS];

export const PREVIEW_FOLLOWED_ARTIST_IDS = [TYLER, VAUNDY, TRIPLES, ENSEMBLE];

/* ── Palettes from the handoff seed data ────────────────────────────────── */

const SEED_ALBUM_BY_TITLE: Record<string, string> = {
  '呼び声': '3RhkGySFESW5d50IlNWuP1',
  EARFQUAKE: '5zi7WsKlIiUXv09tbGLKsE',
  'Girls Never Die': '1FEdDqMaOL8oZYzI4n27GM',
};

export const PREVIEW_PALETTES: Array<[albumId: string, palette: AlbumPalette]> = seed.demoTracks.flatMap((track) => {
  const albumId = SEED_ALBUM_BY_TITLE[track.title];
  return albumId ? [[albumId, track.palette] as [string, AlbumPalette]] : [];
});

/** Where the preview starts: the reference layout's track, one minute in. */
export const PREVIEW_START = {
  contextUri: 'spotify:album:5zi7WsKlIiUXv09tbGLKsE',
  trackUri: uri('5hVghJ4KaYES3BFUATCYn0'),
  positionMs: 57_000,
};
