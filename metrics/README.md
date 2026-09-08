# metrics — 세대별 숫자 (기계가 붙인다)

`runs.jsonl` 은 `scripts/retro-cost.js --record` 가 한 줄씩 덧붙인다. 손으로 고치지 않는다.

한 줄 = 한 번 잰 것: 언제·어느 세대(label)·어느 방·전체 합계·봇별 값·도구 승인 횟수.

세대끼리 견주는 숫자는 기억이 아니라 이 파일에서 온다. 해석은 `../EVOLUTION.md` 가 맡는다.

    node scripts/retro-cost.js --since 2026-09-09 --room 1 --record --label S2
