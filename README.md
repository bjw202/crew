# crew — 공정개발 과제를 위한 봇 다섯

Claude Code 세션 다섯(orchestrator · analyst · archivist · researcher · reporter)이 채팅 봇으로 붙어
사람 개입 없이 작업을 잇는다. 이 저장소는 **봇의 설계도**이고 과제 정보는 0건이다.

설계 원문: `crew-team` 레포 `.moai/plans/lazy-giggling-pnueli.md` (v4).

## 읽는 순서

1. `common/CLAUDE-common.md` — 우리 팀(목적·팀 표·용어) + 모든 봇의 공통 규칙 (경로·쓰기·찾기·기억·개선 제안)
2. `common/CLAUDE-worker.md` — worker 넷의 규칙 (통신·handoff·notes·보고 서식)
3. `bots/orchestrator/CLAUDE.md` — 계획·배분·검토·복구
4. `bots/{analyst,archivist,researcher,reporter}/CLAUDE.md` — 봇마다 고유 규칙
5. `bots/orchestrator/.claude/skills/open-room/SKILL.md` — 방 열기
6. `common/hooks/session-start.js` — 세션 시작·`/clear`·압축 뒤 되읽기 (handoff·notes·state·memory)

## 기억은 파일이다 (파일 이름은 영어)

| 무엇을 | 어디에 | 누가 |
|---|---|---|
| 지금 어느 단계인가 | `rooms/<방>/<worker>/handoff.md` (6줄), `orchestrator/state.md` | 각자 |
| 작업 중 알아낸 것 | `rooms/<방>/<worker>/task-N-notes.md` | worker |
| 왜 그렇게 정했나 | `rooms/<방>/orchestrator/decisions.md` (추가만) | orchestrator |
| 무슨 일이 있었나 | `rooms/<방>/orchestrator/chronicle.md` (추가만) | orchestrator |
| 이 방에 무슨 파일이 있나 | `rooms/<방>/archivist/index.md` | archivist |
| 주제의 현재 앎 | `rooms/<방>/archivist/wiki/<topic>.md` | archivist |
| 회사 전체에 무엇이 있나 | `knowledge/index.md` · `domain/` · `projects/` | archivist · orchestrator |
| 일하는 방법 | `crew/bots/<봇>/memory.md` (50줄) | 각자 |

규칙 셋: **먼저 저장, 그다음 행동** · 되살아나면 파일에 있는 것을 대조하고 없는 것만 만든다 · 파일에 없는 사실은 없는 사실이다.
원본과 산출물은 같은 머리말 규격(`room/task/kind/title/created/updated/aliases/tags/sources/status/supersedes`)을 쓰고, 뒤집힌 결론은 `void→대체 경로` 로 남긴다.

## 설치 — 어디에든 clone 하고 한 번 실행

```
git clone <이 저장소> crew
cd crew && node setup.js
```

`setup.js` 가 crew **옆에** `rooms/` 와 `knowledge/`(git) 를 만들고, 봇마다 `.claude/settings.json`(절대 경로 거부 규칙)과 `.env` 틀을 쓴다.
설치 위치를 옮기면 `node setup.js` 를 다시 돌린다. settings.json 과 .env 는 git 에 들어가지 않는다.

## 폴더 (루트 = crew 의 부모)

```
루트/
  crew/                  이 저장소. 봇이 여기서 뜬다: cwd = crew/bots/<봇>/
    common/              공통 지침 · 훅 · settings 틀
    bots/<봇>/           CLAUDE.md · memory.md · .claude/settings.json(생성) · .env(토큰, 생성)
    proposals/           개선 제안 (제안 하나 = 파일 하나)
    setup.js             설치 스크립트
  rooms/<과제>/          작업장. 과제마다 git. orchestrator 가 open-room 으로 만든다
    orchestrator/        state.md · decisions.md · chronicle.md
    <worker>/            handoff.md · task-N-notes.md · task-N-<slug>.md · task-N-report.md
    archivist/           inbox/(원본+사이드카) · index.md(방의 모든 파일) · wiki/ · 00-prior-knowledge.md
  knowledge/             회사 지식. index.md · domain/(archivist) · projects/(orchestrator, 방 열 때 등록). git 하나
```

## 봇 기동 (방마다 새로 띄우지 않는다 — 상주)

`setup.js` 가 봇마다 한 줄씩 찍어 준다:

```
cd 루트/crew/bots/analyst && claude --setting-sources project,local --strict-mcp-config --mcp-config .mcp.json
```

토큰은 `bots/<봇>/.env`. 지침을 고쳤으면 재시작해야 적용된다.

## 봇 추가 — 셋이면 끝

1. `bots/<이름>/CLAUDE.md` 폴더를 만들고 (첫 줄 `@../../common/CLAUDE-common.md`, worker면 `@../../common/CLAUDE-worker.md` 도), `common/CLAUDE-common.md` 의 팀 표에 한 줄을 더한다.
2. minidiscord 에 봇을 등록해 토큰을 받고 `bots/<이름>/.env` 에 넣는다.
3. `common/CLAUDE-common.md` 의 팀 표에 한 줄을 넣고 `node setup.js` 를 다시 돌린다 — 다른 봇들의 거부 규칙에 새 이름이 자동으로 들어간다.

## 운영 습관

- 과제 하나가 끝나면 봇 다섯의 터미널에서 `/clear` 를 한 번씩 친다. 안 해도 지침이 받치지만, 하면 가장 깨끗하다.
- 자동 압축은 봇 전부 70만 토큰(`autoCompactWindow`, `common/settings.template.json`)에서 돈다. 봇 하나만 바꾸려면 `bots/<봇>/.claude/settings.local.json` 에 같은 키를 두면 그쪽이 이긴다. 채팅이나 봇 간 메시지로 `/compact`·`/clear` 를 시킬 수는 없다 (글자로만 도착).
- 지침·스킬을 고쳤으면 해당 봇을 재시작한다.

## S1에서 확인할 것 (설계가 가정만 한 것)

- settings의 `Edit(//<절대경로>/rooms/*/<봇>/**)` — 경로 중간 `*`와 윈도우 드라이브 문자(`//C:/…`) 문법이 먹는가
- 봇 다섯이 한 git 안에 있어도 자동 기억이 섞이지 않는가 (`env.CLAUDE_CODE_DISABLE_AUTO_MEMORY` 가 안 먹으면 `autoMemoryDirectory` 로)
- `@memory.md` import가 자동 압축 뒤에도 사는가
- `session-start.js` 가 `current-room` 파일로 방별 handoff·notes·state 를 되읽는가 (`/clear` 뒤에도)
- 압축이 작업 중간에 와도 task-N-notes.md 만으로 이어지는가

## 장치는 셋

지침(이 저장소의 md 파일들) · `open-room` 스킬 · `session-start.js` 훅. 설치용 `setup.js` 는 봇이 아니라 사람이 한 번 돌린다. 그 외 스크립트·색인·훅은 없다.
