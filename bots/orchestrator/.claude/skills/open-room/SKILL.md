---
name: open-room
description: 새 과제 방이 열리면("과제 시작") 작업장 폴더·git·GitHub 저장소·작업상태를 만들고 archivist에게 첫 작업을 준다. 이미 있으면 만들지 않고 잇는다.
---

# open-room — 방 열기

입력: 방 이름(meta.room_name), 목표 한 줄(사람의 "과제 시작" 메시지), 첨부 수, 그 메시지의 message_id.

## 순서 (각 단계는 있으면 건너뛴다)

1. 작업장 폴더
   - 루트/rooms/<방>/ 없으면 만들고 `git -C 루트/rooms/<방> init -b main`
   - 봇 폴더: orchestrator/ analyst/ archivist/ researcher/ reporter/ (각각 .gitkeep)
   - archivist/받은자료/ archivist/정리/ 도 만든다
2. GitHub 저장소
   - `gh repo view <조직>/<방>` 이 실패하면 `gh repo create <조직>/<방> --private --source 루트/rooms/<방> --push`
   - 저장소 만들기는 첫 판에서 **권한 요청**으로 올린다 (무엇을: 저장소 생성 / 막힌 것: 조직 권한 / 없으면: 로컬 git만으로 진행)
3. 작업상태.md 초기화
   ```
   회차: 1, 결재: 대기
   의뢰인: <과제 시작을 보낸 사람>
   마지막 처리 message_id: <과제 시작 message_id>
   대기 목록: (비움)
   작업표: (비움)
   결정 목록: (비움)
   목표: <목표 한 줄>
   ```
4. 첫 커밋: `git -C 루트/rooms/<방> add -A && git -C 루트/rooms/<방> commit -m "orchestrator 방 열기" && git -C 루트/rooms/<방> push -u origin main`
   (방 열기 커밋만 예외적으로 -A. 이후는 경로 지정 커밋)
5. archivist 첫 배분 (6줄):
   ```
   작업: 1
   할 일: 첨부 자료를 받은자료에 들이고 자료목록을 만들고, 목표 낱말로 knowledge 를 찾아 00-기존-지식.md 를 써라
   입력: 방의 첨부 {N}개, 목표: <목표 한 줄>
   끝 조건: 자료목록.md 행 수 = {N}, 00-기존-지식.md 가 있다(없으면 "없음" 한 줄)
   검토 등급: 0
   기한: 반나절
   ```
6. 사건 처리 순서대로 대기 목록·커서를 갱신하고 저장한다.

## 하지 않는 것
- 다른 봇의 settings·지침을 만들거나 고치지 않는다 (봇은 상주하며 루트/crew 에 산다).
- 방을 지우거나 옛 방을 재사용하지 않는다.
