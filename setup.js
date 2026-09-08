#!/usr/bin/env node
// crew 설치·기동 도구 — 사람이 돌린다. 봇은 이 파일을 쓰지 않는다.
//
//   node setup.js              설치: 폴더·설정·.env·(서버가 떠 있으면) 봇 등록·.mcp.json  — 몇 번 돌려도 안전
//   node setup.js join <방>    방을 만들고(있으면 그대로) 봇 다섯을 참여시킨다
//
// 위치: minidiscord 는 기본 루트/minidiscord (crew 의 형제). 다른 곳이면 MINIDISCORD_DIR=<경로>.
//       서버 주소는 MINIDISCORD_URL (기본 http://127.0.0.1:3000).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CREW = path.resolve(__dirname);
// 상태줄은 crew 안의 common/statusline.sh 다. 봇은 --setting-sources project,local 로 뜨므로
// ~/.claude/settings.json 의 statusLine 은 적용되지 않아 봇 설정에 직접 적어 준다.
// 훅과 달리 statusLine 은 상대 경로를 주면 Claude Code 가 아예 부르지 않는다(실측) — 절대 경로로 넣는다.
const ROOT = path.dirname(CREW);
const ROOMS = path.join(ROOT, 'rooms');
const KNOWLEDGE = path.join(ROOT, 'knowledge');
const MINIDISCORD = process.env.MINIDISCORD_DIR || path.join(ROOT, 'minidiscord');
const CHANNEL = path.join(MINIDISCORD, 'channel', 'dist', 'index.js');
const URL_ = (process.env.MINIDISCORD_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const WS = process.env.MINIDISCORD_SERVER || URL_.replace(/^http/, 'ws') + '/bot';
const PREFIX = process.env.MINIDISCORD_BOT_PREFIX || '';           // 시험용: 봇 이름 앞에 붙임
const BOTS = fs.readdirSync(path.join(CREW, 'bots')).filter(b => fs.existsSync(path.join(CREW, 'bots', b, 'CLAUDE.md')));
const CLAUDE_ARGS = ['--setting-sources', 'project,local', '--strict-mcp-config', '--mcp-config', '.mcp.json', '--dangerously-load-development-channels', 'server:minidiscord-channel'];

const pat = p => '//' + p.replace(/\\/g, '/').replace(/^\//, '');   // Claude Code 권한 패턴: "//" + 절대 경로
const log = m => console.log('  ' + m);
const envFile = bot => path.join(CREW, 'bots', bot, '.env');
function readEnv(file) {
  const out = {};
  try { for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim(); } } catch {}
  return out;
}
function writeEnv(file, kv) { fs.writeFileSync(file, Object.entries(kv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'); }
function ensureDir(p, note) { if (!fs.existsSync(p)) { fs.mkdirSync(p, { recursive: true }); log(`만듦  ${p}${note ? '  (' + note + ')' : ''}`); } else log(`있음  ${p}`); }
function gitInit(p) { if (!fs.existsSync(path.join(p, '.git'))) { execSync('git init -q -b main', { cwd: p }); log(`git init  ${p}`); } }

// ── minidiscord API (이름 하나로 로그인, 쿠키 md_session) ──
let cookie = '';
async function api(method, p, body) {
  const r = await fetch(URL_ + p, { method, headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  if (!r.ok) throw new Error(`${method} ${p} → ${r.status} ${text.slice(0, 120)}`);
  return json;
}
async function serverUp() { try { const j = await api('GET', '/api/health'); return !!(j && j.ok); } catch { return false; } }
async function login() { await api('POST', '/api/auth/login', { username: process.env.MINIDISCORD_USER || 'crew-setup' }); }

// ── 설치 ──
async function install() {
  console.log(`루트: ${ROOT}\ncrew: ${CREW}\nminidiscord: ${MINIDISCORD} (${URL_})\n봇: ${BOTS.join(', ')}\n`);
  console.log('① 형제 폴더');
  ensureDir(ROOMS, '과제마다 방 폴더, 방마다 git');
  ensureDir(KNOWLEDGE, '회사 지식, git 하나');
  ensureDir(path.join(KNOWLEDGE, 'domain')); ensureDir(path.join(KNOWLEDGE, 'projects')); gitInit(KNOWLEDGE);
  ensureDir(path.join(CREW, 'proposals'));
  if (!fs.existsSync(CHANNEL)) log(`없음  ${CHANNEL}  ← minidiscord 폴더에서 npm install && npm run build -w channel`);

  console.log('\n② 봇 등록 (minidiscord 서버가 떠 있을 때만)');
  const up = await serverUp();
  if (!up) log(`서버 없음 (${URL_}) — 건너뜀. 서버를 띄우고 node setup.js 를 다시 돌리면 등록한다.`);
  else {
    await login();
    const existing = new Map((await api('GET', '/api/bots')).map(b => [b.name, b]));
    for (const bot of BOTS) {
      const kv = readEnv(envFile(bot)); const name = PREFIX + bot;
      if (kv.MINIDISCORD_TOKEN) { log(`있음  ${name} (토큰 있음)`); continue; }
      if (existing.has(name)) { log(`주의  ${name} 은 서버에 있는데 .env 에 토큰이 없다 — 웹에서 봇을 삭제하고 다시 돌리거나 토큰을 .env 에 직접 넣어라`); continue; }
      const j = await api('POST', '/api/bots', { name, description: `crew ${bot}`, role: bot === 'orchestrator' ? 'orchestrator' : 'worker' });
      writeEnv(envFile(bot), { ...kv, MINIDISCORD_TOKEN: j.token });
      log(`등록  ${name} (id ${j.id}) → bots/${bot}/.env`);
    }
  }

  console.log('\n③ 봇 설정 파일');
  const tpl = fs.readFileSync(path.join(CREW, 'common', 'settings.template.json'), 'utf8');
  const noToken = [];
  for (const bot of BOTS) {
    const others = BOTS.filter(b => b !== bot).flatMap(b => [`Edit(${pat(path.join(ROOMS, '*', b))}/**)`, `Edit(${pat(path.join(CREW, 'bots', b))}/**)`]);
    const knowledgeDeny = bot === 'archivist' ? `Edit(${pat(path.join(KNOWLEDGE, 'projects'))}/**)` : bot === 'orchestrator' ? `Edit(${pat(path.join(KNOWLEDGE, 'domain'))}/**)` : `Edit(${pat(KNOWLEDGE)}/**)`;
    const json = JSON.parse(tpl
      .replace('"{{DENY_OTHERS}}"', others.map(s => JSON.stringify(s)).join(', '))
      .replace('"{{DENY_KNOWLEDGE}}"', JSON.stringify(knowledgeDeny))
      .replace(/\{\{CREW\}\}/g, pat(CREW)).replace(/\{\{ROOMS\}\}/g, pat(ROOMS)).replace(/\{\{KNOWLEDGE\}\}/g, pat(KNOWLEDGE)).replace(/\{\{BOT\}\}/g, bot)
      .replace('{{ROOMS_DIR}}', ROOMS.replace(/\\/g, '\\\\')).replace('{{KNOWLEDGE_DIR}}', KNOWLEDGE.replace(/\\/g, '\\\\')).replace('{{PROPOSALS_DIR}}', path.join(CREW, 'proposals').replace(/\\/g, '\\\\'))
      .replace('{{STATUSLINE}}', path.join(CREW, 'common', 'statusline.sh').replace(/\\/g, '\\\\')));
    const dir = path.join(CREW, 'bots', bot, '.claude'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(json, null, 2) + '\n');
    if (!fs.existsSync(envFile(bot))) writeEnv(envFile(bot), { MINIDISCORD_TOKEN: '' });
    const token = readEnv(envFile(bot)).MINIDISCORD_TOKEN;
    if (token) fs.writeFileSync(path.join(CREW, 'bots', bot, '.mcp.json'), JSON.stringify({ mcpServers: { 'minidiscord-channel': { command: 'node', args: [CHANNEL], env: { MINIDISCORD_TOKEN: token, MINIDISCORD_SERVER: WS } } } }, null, 2) + '\n');
    else noToken.push(bot);
    log(`씀  bots/${bot}/  settings.json${token ? ' · .mcp.json' : '  (.mcp.json 은 토큰이 없어 건너뜀)'}`);
  }

  console.log('\n④ 서버 명령 (minidiscord 폴더 안에서 — rooms 전체 경로가 들어 있다)');
  log(`cd ${JSON.stringify(MINIDISCORD)} && MINIDISCORD_BOT_FILES_DIR=${JSON.stringify(ROOMS)} MINIDISCORD_BOT_RUN_LIMIT=0 npm run dev -w server`);
  console.log('\n⑤ 다음');
  if (!up) log('서버가 안 떠 있다 — 위 ④ 로 서버를 켜고 node setup.js 를 다시 돌리면 봇을 등록한다');
  else if (noToken.length) log(`토큰 없는 봇: ${noToken.join(', ')} — 위 ② 의 주의를 처리한 뒤 node setup.js 다시`);
  else {
    log('node setup.js join <방이름>   → 방 만들고 봇 다섯 참여');
    console.log('\n⑥ 봇 기동 (터미널을 다섯 열어 하나씩 붙여 넣는다 — 봇은 자기 폴더에서 뜬다)');
    for (const bot of BOTS) log(`cd ${JSON.stringify(path.join(CREW, 'bots', bot))} && claude ${CLAUDE_ARGS.join(' ')}`);
  }
}

// ── 방 열기: 방 만들고 봇 다섯 참여 ──
async function join(roomName) {
  if (!roomName) throw new Error('방 이름을 주세요: node setup.js join <방>');
  if (!(await serverUp())) throw new Error(`서버 없음 (${URL_})`);
  await login();
  const rooms = await api('GET', '/api/rooms');
  let room = (rooms.active || []).find(r => r.name === roomName);
  if (!room) { room = await api('POST', '/api/rooms', { name: roomName }); log(`방 만듦  ${roomName} (id ${room.id})`); } else log(`방 있음  ${roomName} (id ${room.id})`);
  const bots = new Map((await api('GET', '/api/bots')).map(b => [b.name, b]));
  for (const bot of BOTS) {
    const b = bots.get(PREFIX + bot); if (!b) { log(`없음  ${PREFIX + bot} — node setup.js 로 먼저 등록`); continue; }
    await api('POST', `/api/rooms/${room.id}/bots`, { bot_id: b.id }); log(`참여  ${b.name}`);
  }
  log(`웹에서 방 ${roomName} 을 열고 "@TO(orchestrator) 과제 시작: <목표 한 줄>" 로 시작한다.`);
}

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (!cmd) await install();
    else if (cmd === 'join') await join(arg);
    else throw new Error(`모르는 명령: ${cmd}`);
  } catch (e) { console.error('오류: ' + e.message); process.exit(1); }
})();
