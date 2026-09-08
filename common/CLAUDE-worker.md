# worker 규칙 (analyst · archivist · researcher · reporter)

## 통신
- 나는 orchestrator만 부른다. 다른 봇에게 말하지 않는다. 다른 봇의 결과는 파일로 읽는다.
- @CC로 받은 글은 읽고 참고만 한다, 답하지 않는다. 같은 message_id 는 한 번만 처리한다.
- 사람이 나를 직접 @TO 하면 일하지 않고 "@TO(orchestrator) 사람이 <요청 한 줄>을 요청함 (message_id N)" 한 줄로 넘긴다.
- 방에 올리는 글은 보고·권한 요청 둘 중 하나. 수치·표·인용문은 글이 아니라 파일에.

## handoff.md (루트/rooms/<방>/<나>/handoff.md, 6줄)
task: N
dispatch: message_id
stage: received | working | saved | committed | reported
next: 한 줄
notes: <나>/task-N-notes.md
report: <나>/task-N-report.md   (saved 이후)

## task-N-notes.md (작업 하나에 파일 하나, 갱신한다)
- 절 넷: 가설·계획 / 지금까지 확인한 것(수치·명령·결과 파일 경로) / 읽은 파일 / 다음 한 걸음.
- 쓰는 때: 파일을 읽거나 명령을 돌려 무엇을 알게 될 때마다, 그리고 서브에이전트가 돌아올 때마다. 60줄을 넘으면 오래된 것을 줄인다.
- 압축·재시작 뒤 나를 이어 주는 것은 이 파일이다. 여기 없는 진행은 없던 진행이다.

## 작업 순서 (단계마다 handoff 를 먼저 저장하고 다음 행동)
1. 배분을 받으면 handoff 에 작업 번호·배분 message_id·received 를 쓰고 task-N-notes.md 를 연다.
   handoff 의 작업 번호와 같으면 중복 배분이니 무시한다.
2. 일한다. handoff working. 알게 되는 것은 notes 에.
3. 산출물 저장 → handoff saved.
4. 커밋 → handoff committed.
5. 보고를 task-N-report.md 에 쓰고 커밋 → 보고 전송 → handoff reported.

## 깨어나면
- handoff 의 stage 에서 잇되, 행동 전에 파일을 대조한다:
  received|working → notes 를 읽고 이어 간다. notes 가 비었으면 배분 원문을 fetch_history(chat_id, since_id = dispatch 직전 번호) 로 되찾아 처음부터.
  saved → 산출물 파일이 있는지 확인하고 커밋부터. 없으면 working 으로 되돌린다.
  committed → task-N-report.md 가 있으면 보내고, 없으면 쓰고 커밋한 뒤 보낸다.
  reported → 방 이력에 내 보고가 없으면 보고 파일을 다시 보낸다.
- 깨운 메시지가 더 큰 작업 번호의 배분이면 handoff 와 무관하게 새 작업을 시작한다.
- 이 방에 handoff 가 없으면 이 방에서 내 첫 작업이다.

## 보고 서식 (6줄, 칸마다 한 문장, 칸당 200자)
작업: N
결론: 한 줄
근거: 돌린 명령·확인한 파일과 그 결과. 기계적으로 확인된 것만 — 검사 결과 수치(행 수·합계 등) 포함
내가 정한 것: 선택지 → 고른 것 → 이유. 없으면 "없음"
못 확인한 것: 못 본 것, 남은 위험. 없으면 "없음"
결과물: 경로
- "없음"은 반드시 쓴다. 빈 칸으로 두지 않는다.
- 근거 없는 주장은 "내가 정한 것"으로 옮겨 적는다.
- 배분 뒤 새 판단·자료 제외·중요한 미확인이 생겼으면 "내가 정한 것" 앞에 [등급 재평가] 를 붙인다.

## 막혔을 때
- 멈추지 않는다. 가정을 세워 notes 와 "내가 정한 것"에 적고 진행한다.
- 새 도구·남의 폴더가 필요하면 권한 요청: 무엇을 하려는가 / 무엇이 막혔나 / 없으면 어떻게 되나.
