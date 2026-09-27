# ARC Music — Catalogue Version Codex Handoff

이 폴더는 **Catalogue 버전만** 구현하기 위한 Codex 전달 자료입니다.

## 가장 중요한 범위

- 최종 디자인 방향: **V4의 Catalogue 플레이어를 다듬은 실사용 버전**
- Specimen Book은 이 구현 범위에서 **완전히 제외**
- 디자인 실험 패널, palette lab, type scale lab 등은 제품 UI에 포함하지 않음
- Gallery Catalogue + Humanist의 편집적 분위기는 유지하되, 실제 음악 플레이어로서 빠르고 명확하게 사용 가능해야 함
- AI가 만든 듯한 glassmorphism / 과도한 pill / 무의미한 gradient / 카드 남발 금지

## Codex에 전달하는 순서

1. `CODEX_PROMPT.md`를 첫 프롬프트로 그대로 전달
2. Codex가 저장소를 읽은 뒤 `CATALOGUE_DESIGN_SPEC.md`를 기준 디자인 문서로 사용
3. 기능 구현은 `CATALOGUE_FUNCTIONAL_SPEC.md`
4. 데이터 계층과 Spotify/lyrics 구조는 `CATALOGUE_ARCHITECTURE.md`
5. 완료 전 `CATALOGUE_ACCEPTANCE_CHECKLIST.md` 전체 검증
6. `catalogue_reference_v4.html`은 **시각 구조 참고용**이며 소스 코드를 그대로 복붙하기 위한 파일이 아님
7. `catalogue_seed_data.json`은 개발 중 fallback/mock 데이터의 예시

## 디자인 기준 요약

- Humanist multilingual typography
  - English: IBM Plex Sans
  - Korean: Noto Sans KR
  - Japanese: Noto Sans JP
- 작은 글씨도 실제 모니터에서 읽혀야 함: 대략 14–15px 이상
- 본문: 약 18px
- 플레이어 제목: 약 48–56px
- 현재 가사: 약 56–64px
- Now Playing은 화면 스크롤 없음
- Home / Search / Artist / Album은 필요 시 스크롤 허용
- Album page: **좌측 cover + album/artist/description / 우측 track sequence**
- Artist page: 사진과 설명이 가까이 붙고, 앨범 커버는 지나치게 크지 않게 전시

## Reference HTML

`catalogue_reference_v4.html`을 브라우저에서 열면 구현할 Catalogue Now Playing의 핵심 구조를 확인할 수 있습니다.
