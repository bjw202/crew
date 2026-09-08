#!/bin/bash
# crew 봇 상태줄 — 터미널 다섯을 띄워 놓고 어느 것이 누구인지 한눈에 보려는 것이다.
#
# 두 가지를 지킨다.
#  1. 바깥 것에 기대지 않는다. jq 가 없어도, 사람의 ~/.claude 설정이 없어도 돈다.
#  2. 누구인지·어느 방인지는 stdin 이 아니라 파일에서 읽는다. stdin 이 비어도 틀리지 않는다.
#
# 보이는 것: 봇 이름 · 방 · 모델 · 문맥 사용률 · 브랜치
set -u
input=$(cat 2>/dev/null || true)

# ── JSON 읽기: jq 가 있으면 jq, 없으면 sed (평평한 값만 뽑으므로 충분하다) ──
if command -v jq >/dev/null 2>&1; then
  jstr() { printf '%s' "$input" | jq -r "$1 // empty" 2>/dev/null; }
else
  # $1 은 .a.b.c 꼴 — 마지막 키만 써서 값을 찾는다
  jstr() {
    local key="${1##*.}"
    printf '%s' "$input" \
      | sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p;s/.*\"${key}\"[[:space:]]*:[[:space:]]*\([0-9][0-9.]*\).*/\1/p" \
      | head -1
  }
fi

# ── 누구인가 · 어디인가 (파일에서 읽는다 — stdin 과 무관하다) ──
dir=$(jstr '.workspace.current_dir'); [ -z "$dir" ] && dir=$(jstr '.cwd'); [ -z "$dir" ] && dir=$(pwd)
bot=$(basename "$dir")
room=""
[ -r "$dir/current-room" ] && room=$(head -1 "$dir/current-room" 2>/dev/null | tr -d '\r\n')

segs="🤖 ${bot}"
[ -n "$room" ] && segs="${segs} · 🏠 ${room}"

# ── 모델 ──
# 못 읽으면 "Claude" 같은 엉뚱한 기본값을 보이지 않고 그 칸을 비운다.
# 대신 받은 입력을 한 벌 남겨 둔다 — 왜 없는지는 그 파일을 보면 안다 (gitignore 됨).
model=$(jstr '.model.display_name'); [ -z "$model" ] && model=$(jstr '.model.id')
if [ -n "$model" ]; then
  segs="${segs} · ${model}"
elif [ -n "$input" ] && [ -w "$dir" ]; then
  printf '%s' "$input" > "$dir/.statusline-debug.json" 2>/dev/null || true
fi

# ── 문맥 사용률 (압축 문턱이 65% 라 이 숫자가 곧 남은 여유다) ──
cw=$(jstr '.context_window.used_percentage')
if [ -n "$cw" ]; then
  pct=${cw%%.*}
  case "$pct" in ''|*[!0-9]*) pct="" ;; esac
  if [ -n "$pct" ]; then
    mark=""
    [ "$pct" -ge 55 ] && mark=" ⚠"
    [ "$pct" -ge 65 ] && mark=" 🔴"
    segs="${segs} · CW ${pct}%${mark}"
  fi
fi

# ── 브랜치 (봇은 방 저장소가 아니라 crew 저장소 안에서 뜬다) ──
if command -v git >/dev/null 2>&1 && git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  br=$(git -C "$dir" branch --show-current 2>/dev/null)
  [ -n "$br" ] && segs="${segs} · 🌿 ${br}"
fi

printf '%s\n' "$segs"
exit 0
