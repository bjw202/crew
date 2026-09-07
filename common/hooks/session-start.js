#!/usr/bin/env node
// SessionStart 훅 (startup | resume | compact).
// 봇이 깨어날 때 "현재 방"의 내 상태 파일을 문맥에 다시 싣는다.
// 방은 봇 폴더의 `현재방` 파일(한 줄)이 정한다 — 공통 규칙 "내 방" 참조.
// 실패해도 세션을 막지 않는다 (fail-open): 파일이 없으면 안내문만 싣는다.

const fs = require('fs');
const path = require('path');

// 루트 = crew 의 부모. 봇의 cwd 는 루트/crew/bots/<봇>/ 이므로 세 단계 위. (시험용 덮어쓰기: CREW_ROOMS)
const rootOf = cwd => path.resolve(cwd, '..', '..', '..');
const LIMITS = { 인계: 20, 작업상태: 200, 기존지식: 40, 기억: 50 };

function readLines(file, max) {
  try {
    const lines = fs.readFileSync(file, 'utf8').replace(/\s+$/, '').split(/\r?\n/);
    const cut = lines.slice(0, max).join('\n');
    return lines.length > max ? cut + `\n… (${lines.length - max}줄 더 있음 — 파일을 직접 읽어라)` : cut;
  } catch { return null; }
}

function main() {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
  const cwd = input.cwd || process.cwd();
  const bot = path.basename(cwd);
  const ROOMS = process.env.CREW_ROOMS || path.join(rootOf(cwd), 'rooms');
  const source = input.source || 'startup';

  const parts = [`[깨어남: ${source}] 나는 ${bot}이다. 앞 문맥은 캐시다 — 아래 파일이 진실이다.`];

  let room = '';
  try { room = fs.readFileSync(path.join(cwd, '현재방'), 'utf8').split(/\r?\n/)[0].trim(); } catch {}
  if (!room) {
    parts.push('현재 방 기록이 없다. 다음 메시지의 방(meta.room_name)을 확인해 현재방 파일에 쓰고, 그 방의 내 상태 파일부터 읽어라.');
  } else {
    const roomDir = path.join(ROOMS, room);
    const state = bot === 'orchestrator'
      ? ['작업상태.md', path.join(roomDir, 'orchestrator', '작업상태.md'), LIMITS.작업상태]
      : ['인계.md', path.join(roomDir, bot, '인계.md'), LIMITS.인계];
    parts.push(`현재 방: ${room}`);
    const s = readLines(state[1], state[2]);
    parts.push(s ? `## ${state[0]}\n${s}` : `## ${state[0]}\n(없음 — 이 방에서 첫 작업이거나 open-room 전이다)`);
    const k = readLines(path.join(roomDir, 'archivist', '00-기존-지식.md'), LIMITS.기존지식);
    if (k) parts.push(`## 00-기존-지식.md\n${k}`);
  }

  const mem = readLines(path.join(cwd, '기억.md'), LIMITS.기억);
  if (mem) parts.push(`## 기억.md\n${mem}`);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: parts.join('\n\n') }
  }));
}

main();
