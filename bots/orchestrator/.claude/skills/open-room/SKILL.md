---
name: open-room
description: 새 과제 방이 열리면("과제 시작") 작업장 폴더·git·GitHub 저장소·state.md 를 만들고, knowledge 에 방을 등록하고, archivist에게 첫 작업을 준다. 이미 있으면 만들지 않고 잇는다.
---

# open-room — 방 열기

입력: 방 이름(봉투의 room_name — / 와 .. 은 - 로), 방 번호(chat_id), 목표 한 줄(사람의 "과제 시작" 메시지), 첨부 수, 그 메시지의 message_id.

## 순서 (각 단계는 있으면 건너뛴다)

1. 작업장 폴더
   - 루트/rooms/<방>/ 없으면 만들고 `git -C 루트/rooms/<방> init -b main`
   - 봇 폴더: orchestrator/ analyst/ archivist/ researcher/ reporter/ (각각 .gitkeep)
   - archivist/inbox/ archivist/wiki/ 도 만든다
2. GitHub 저장소
   - `gh repo view <조직>/<방>` 이 실패하면 `gh repo create <조직>/<방> --private --source 루트/rooms/<방> --push`
   - 저장소 만들기는 첫 판에서 **권한 요청**으로 올린다 (무엇을: 저장소 생성 / 막힌 것: 조직 권한 / 없으면: 로컬 git만으로 진행)
3. state.md 초기화 — 대기 목록에 첫 배분을 미리 넣는다 (먼저 저장, 그다음 행동)
   ```
   회차: 1, 결재: 대기
   의뢰인: <과제 시작을 보낸 사람>
   마지막 처리 message_id: <과제 시작 message_id>
   대기 목록: - <과제 시작 message_id> 과제 시작 → archivist 작업 1 배분
   작업표: (비움)
   목표: <목표 한 줄>
   ```
   decisions.md 와 chronicle.md 는 머리글 한 줄로 만든다.
4. 첫 커밋 — 명령을 셋으로 나눠 부른다(공통 규칙: Bash 한 번에 하나):
   `git -C 루트/rooms/<방> add -A`
   `git -C 루트/rooms/<방> commit -m "orchestrator 방 열기"`
   `git -C 루트/rooms/<방> push -u origin main`
   (방 열기 커밋만 예외적으로 -A. 이후는 경로 지정 커밋)
5. knowledge 에 방 등록 — 루트/knowledge/projects/<방>.md 를 지금 만든다 (마감 때 갱신):
   ```
   ---
   room: <방> / kind: project / title: <목표 한 줄> / created: <오늘> / updated: <오늘>
   aliases: <목표의 낱말·영문·약어 3개 이상> / tags: / status: open / repo: <저장소 주소>
   ---
   목표 / 상태: 진행 중 (회차 1) / 원본 자료: 루트/rooms/<방>/archivist/index.md / 결론: (아직 없음)
   ```
   `git -C 루트/knowledge commit -m "orchestrator <방> 등록" -- projects/<방>.md`
   `git -C 루트/knowledge push`
   (knowledge/index.md 의 방 줄은 archivist 가 작업 1에서 더한다.)
6. archivist 첫 배분 (6줄):
   ```
   작업: 1
   할 일: 첨부 자료를 inbox 에 들이고 index.md 를 만들고, 목표 낱말로 knowledge 를 찾아 00-prior-knowledge.md 를 쓰고, knowledge/index.md 에 이 방 줄을 더해라
   입력: 방의 첨부 {N}개, 목표: <목표 한 줄>
   끝 조건: index.md 자료 행 수 = {N}, 00-prior-knowledge.md 가 있다(없으면 "없음" 한 줄), knowledge/index.md 에 <방> 줄이 있다
   검토 등급: 0
   기한: 반나절
   ```
7. 대기 목록에서 지우고 state.md 를 저장한다.

## 하지 않는 것
- 다른 봇의 settings·지침을 만들거나 고치지 않는다 (봇은 상주하며 루트/crew 에 산다).
- 방을 지우거나 옛 방을 재사용하지 않는다.
