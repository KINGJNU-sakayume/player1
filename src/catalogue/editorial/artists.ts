import type { ArtistEditorial } from './types';

/**
 * Artist editorial overrides — edit freely.
 *
 * Find an artist ID in the Spotify URL: open.spotify.com/artist/<ID>.
 * Artists without an entry render from Spotify metadata alone; never add
 * placeholder prose here.
 */
const entries: ArtistEditorial[] = [
  {
    artistId: '2IUl3m1H1EQ7QfNbNWvgru',
    name: 'Vaundy',
    language: 'ko',
    bio: [
      '2000년생 도쿄 출신의 싱어송라이터. 작사·작곡·편곡은 물론 아트워크와 뮤직비디오의 비주얼 디렉션까지 직접 다루는 멀티 아티스트로, 2019년 온라인에 곡을 공개하며 활동을 시작했다.',
      '곡마다 장르도 얼굴도 바뀌는 만큼, 이 카탈로그에서는 작품별 커버와 시각 언어의 변화를 함께 읽는다.',
    ],
    featuredReleaseIds: ['3RhkGySFESW5d50IlNWuP1', '4dKFBa0YCH4636ZtY4L2p7', '4LWbfv8uvEF3oz7YBFxmzn'],
    featuredReleaseTitles: ['呼び声', 'strobo', 'replica'],
  },
  {
    artistId: '4V8LLVI7PbaPR0K2TGSxFF',
    name: 'Tyler, The Creator',
    language: 'ko',
    bio: [
      '로스앤젤레스 출신의 래퍼이자 프로듀서, 크리에이티브 디렉터. 오드 퓨처(Odd Future)를 이끌며 등장했고, 자신의 앨범 대부분을 직접 프로듀싱한다.',
      '음악과 패션 브랜드 GOLF WANG, 페스티벌 Camp Flog Gnaw를 하나의 시각 세계로 묶어 왔다. Flower Boy, IGOR, CALL ME IF YOU GET LOST를 대표 전시 음반으로 둔다.',
    ],
    featuredReleaseIds: ['2nkto6YNI4rUYTLqEwWJ3o', '5zi7WsKlIiUXv09tbGLKsE', '45ba6QAtNrdv6Ke4MFOKk9'],
    featuredReleaseTitles: ['Flower Boy', 'IGOR', 'CALL ME IF YOU GET LOST'],
  },
  {
    artistId: '5Z71xE9prhpHrqL5thVMyK',
    name: 'tripleS',
    language: 'ko',
    bio: [
      'MODHAUS 소속의 24인조 걸그룹. 2022년부터 멤버가 한 명씩 공개되며 합류했고, 2023년 정식 데뷔했다.',
      '팬 투표로 유닛 구성을 정하는 구조 덕분에 디스코그래피가 유닛과 완전체를 오가는 모듈처럼 쌓인다. 2024년에는 24인 완전체 정규 앨범 〈ASSEMBLE24〉를 발표했다.',
    ],
    featuredReleaseIds: ['2X2nKgBuusDa4VqLI6hMU2', '0ZluUcxj1FrWoZX7BhW26K', '1FEdDqMaOL8oZYzI4n27GM'],
    featuredReleaseTitles: ['LOVElution <ↀ>', 'EVOLution <⟡>', '<ASSEMBLE24>'],
  },
];

export const artistEditorial: Readonly<Record<string, ArtistEditorial>> = Object.fromEntries(
  entries.map((entry) => [entry.artistId, entry]),
);
