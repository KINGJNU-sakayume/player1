import type { AlbumEditorial } from './types';

/**
 * Album editorial overrides — edit freely.
 *
 * Find an album ID in the Spotify URL: open.spotify.com/album/<ID>.
 * Albums without an entry simply show no description.
 */
const entries: AlbumEditorial[] = [
  {
    albumId: '5zi7WsKlIiUXv09tbGLKsE',
    title: 'IGOR',
    language: 'ko',
    description: [
      '타일러가 작사·작곡·프로듀싱을 모두 맡은 다섯 번째 정규 앨범. 금발 가발과 파스텔 수트의 페르소나 ‘IGOR’를 앞세워, 사랑의 시작과 끝을 한 편의 이야기처럼 배치했다.',
      '빌보드 200 1위로 데뷔한 그의 첫 앨범이며, 제62회 그래미 어워드에서 최우수 랩 앨범상을 받았다.',
    ],
  },
  {
    albumId: '2nkto6YNI4rUYTLqEwWJ3o',
    title: 'Flower Boy',
    language: 'ko',
    description: [
      '2017년에 발표한 네 번째 정규 앨범. 따뜻한 코드 진행과 현악, 여름빛 사운드 위에 외로움과 성장에 관한 가장 내밀한 이야기를 얹었다.',
      '제60회 그래미 어워드 최우수 랩 앨범 부문 후보에 올랐다.',
    ],
  },
  {
    albumId: '45ba6QAtNrdv6Ke4MFOKk9',
    title: 'CALL ME IF YOU GET LOST',
    language: 'ko',
    description: [
      'DJ Drama의 ‘Gangsta Grillz’ 믹스테이프 형식을 빌려, 여행하는 페르소나 ‘Tyler Baudelaire’의 기록처럼 엮은 여섯 번째 정규 앨범.',
      '빌보드 200 1위에 올랐고, 제64회 그래미 어워드에서 그에게 두 번째 최우수 랩 앨범상을 안겼다.',
    ],
  },
  {
    albumId: '4dKFBa0YCH4636ZtY4L2p7',
    title: 'strobo',
    language: 'ko',
    description: ['2020년에 발표한 첫 정규 앨범. 데뷔 이후 이어진 초기 싱글들을 한데 묶어, 장르를 가리지 않는 Vaundy의 출발점을 보여 준다.'],
  },
  {
    albumId: '4LWbfv8uvEF3oz7YBFxmzn',
    title: 'replica',
    language: 'ko',
    description: ['2023년에 발표한 두 번째 정규 앨범. 35곡 규모로, 그간 발표한 싱글들과 새 곡을 하나의 목록으로 정리했다.'],
  },
  {
    albumId: '1FEdDqMaOL8oZYzI4n27GM',
    title: '<ASSEMBLE24>',
    language: 'ko',
    description: [
      '24명 전원이 참여한 첫 정규 앨범. 타이틀곡 ‘Girls Never Die’를 중심으로, 유닛 활동으로 흩어져 있던 목소리를 하나의 앨범으로 모았다.',
    ],
  },
];

export const albumEditorial: Readonly<Record<string, AlbumEditorial>> = Object.fromEntries(
  entries.map((entry) => [entry.albumId, entry]),
);
