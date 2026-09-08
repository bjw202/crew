#!/usr/bin/env node
// 설치 스크립트 — git clone 뒤 한 번 실행한다:  node setup.js
// 하는 일: ① crew 옆에 rooms/·knowledge/ 만들기 ② 봇마다 .claude/settings.json 을 절대 경로로 생성
//         ③ .env 틀 만들기 ④ .env 의 토큰으로 .mcp.json 생성 ⑤ 기동 명령 출력.  다시 실행해도 안전하다(있는 것은 건너뛴다).
// minidiscord 위치: 기본은 루트/minidiscord (crew 의 형제). 다른 곳이면 MINIDISCORD_DIR=<경로> node setup.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CREW = path.resolve(__dirname);
const ROOT = path.dirname(CREW);
const ROOMS = path.join(ROOT, 'rooms');
const KNOWLEDGE = path.join(ROOT, 'knowledge');
const MINIDISCORD = process.env.MINIDISCORD_DIR || path.join(ROOT, 'minidiscord');
const CHANNEL = path.join(MINIDISCORD, 'channel', 'dist', 'index.js');
const SERVER = process.env.MINIDISCORD_SERVER || 'ws://127.0.0.1:3000/bot';
const BOTS = fs.readdirSync(path.join(CREW, 'bots')).filter(b => fs.existsSync(path.join(CREW, 'bots', b, 'CLAUDE.md')));

// Claude Code 권한 패턴: "//" + 절대 경로(슬래시). 윈도우 C:\x → //C:/x, 맥 /Users/x → //Users/x
const pat = p => '//' + p.replace(/\\/g, '/').replace(/^\//, '');
const log = m => console.log('  ' + m);

function ensureDir(p, note) { if (!fs.existsSync(p)) { fs.mkdirSync(p, { recursive: true }); log(`만듦  ${p}${note ? '  (' + note + ')' : ''}`); } else log(`있음  ${p}`); }
function gitInit(p) { if (!fs.existsSync(path.join(p, '.git'))) { execSync('git init -q -b main', { cwd: p }); log(`git init  ${p}`); } }
// .env 를 KEY=VALUE 로 읽는다 (따옴표·주석 없음, 한 줄에 하나)
function readEnv(file) {
  const out = {};
  try { for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim(); } } catch {}
  return out;
}

console.log(`루트: ${ROOT}\ncrew: ${CREW}\nminidiscord: ${MINIDISCORD}\n봇: ${BOTS.join(', ')}\n`);

console.log('① 형제 폴더');
ensureDir(ROOMS, '과제마다 이 아래에 방 폴더, 방마다 git');
ensureDir(KNOWLEDGE, '회사 지식, git 하나');
ensureDir(path.join(KNOWLEDGE, 'domain'));
ensureDir(path.join(KNOWLEDGE, 'projects'));
gitInit(KNOWLEDGE);
ensureDir(path.join(CREW, 'proposals'));
if (!fs.existsSync(CHANNEL)) log(`없음  ${CHANNEL}  ← minidiscord 에서 npm run build -w channel 을 먼저 (또는 MINIDISCORD_DIR 지정)`);

console.log('\n② 봇 settings.json · .env · .mcp.json');
const tpl = fs.readFileSync(path.join(CREW, 'common', 'settings.template.json'), 'utf8');
const noToken = [];
for (const bot of BOTS) {
  const others = BOTS.filter(b => b !== bot).flatMap(b => [
    `Edit(${pat(path.join(ROOMS, '*', b))}/**)`,
    `Edit(${pat(path.join(CREW, 'bots', b))}/**)`,
  ]);
  const knowledgeDeny =
    bot === 'archivist' ? `Edit(${pat(path.join(KNOWLEDGE, 'projects'))}/**)` :
    bot === 'orchestrator' ? `Edit(${pat(path.join(KNOWLEDGE, 'domain'))}/**)` :
    `Edit(${pat(KNOWLEDGE)}/**)`;
  const json = JSON.parse(tpl
    .replace('"{{DENY_OTHERS}}"', others.map(s => JSON.stringify(s)).join(', '))
    .replace('"{{DENY_KNOWLEDGE}}"', JSON.stringify(knowledgeDeny))
    .replace(/\{\{CREW\}\}/g, pat(CREW))
    .replace(/\{\{ROOMS\}\}/g, pat(ROOMS))
    .replace(/\{\{KNOWLEDGE\}\}/g, pat(KNOWLEDGE))
    .replace(/\{\{BOT\}\}/g, bot)
    .replace('{{ROOMS_DIR}}', ROOMS.replace(/\\/g, '\\\\'))
    .replace('{{KNOWLEDGE_DIR}}', KNOWLEDGE.replace(/\\/g, '\\\\'))
    .replace('{{PROPOSALS_DIR}}', path.join(CREW, 'proposals').replace(/\\/g, '\\\\')));
  const dir = path.join(CREW, 'bots', bot, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(json, null, 2) + '\n');
  log(`씀  bots/${bot}/.claude/settings.json  (deny ${json.permissions.deny.length}개, allow ${json.permissions.allow.length}개)`);
  const env = path.join(CREW, 'bots', bot, '.env');
  if (!fs.existsSync(env)) { fs.writeFileSync(env, 'MINIDISCORD_TOKEN=\n'); log(`틀  bots/${bot}/.env  ← 토큰을 채워라`); }
  // .mcp.json — 채널 플러그인 등록. 토큰은 minidiscord 웹 화면 «+ 봇 등록» 에서 한 번만 보인다.
  const token = readEnv(env).MINIDISCORD_TOKEN;
  const mcp = path.join(CREW, 'bots', bot, '.mcp.json');
  if (token) {
    fs.writeFileSync(mcp, JSON.stringify({ mcpServers: { 'minidiscord-channel': { command: 'node', args: [CHANNEL], env: { MINIDISCORD_TOKEN: token, MINIDISCORD_SERVER: SERVER } } } }, null, 2) + '\n');
    log(`씀  bots/${bot}/.mcp.json`);
  } else { noToken.push(bot); log(`건너뜀  bots/${bot}/.mcp.json  (.env 에 토큰이 없음)`); }
}

console.log('\n③ 서버 (minidiscord 를 이렇게 띄운다 — 봇 첨부 허용 + 봇끼리 이어 말하기 제한 해제)');
console.log(`  MINIDISCORD_BOT_FILES_DIR="${ROOMS}" MINIDISCORD_BOT_RUN_LIMIT=0 npm start   # minidiscord 폴더에서`);

console.log('\n④ 기동 명령 (봇마다 터미널 하나 — 첫 기동 때 "폴더 신뢰"와 "개발 채널 경고" 두 번은 사람이 확인한다)');
for (const bot of BOTS) console.log(`  cd "${path.join(CREW, 'bots', bot)}" && claude --setting-sources project,local --strict-mcp-config --mcp-config .mcp.json --dangerously-load-development-channels server:minidiscord-channel`);
if (noToken.length) console.log(`\n  토큰 없는 봇: ${noToken.join(', ')} — minidiscord 에 등록해 .env 에 넣고 node setup.js 를 다시 돌린다.`);
console.log('\n끝. 지침을 고쳤으면 봇을 재시작해야 적용된다.');
