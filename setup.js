#!/usr/bin/env node
// 설치 스크립트 — git clone 뒤 한 번 실행한다:  node setup.js
// 하는 일: ① crew 옆에 rooms/·knowledge/ 만들기 ② 봇마다 .claude/settings.json 을 절대 경로로 생성
//         ③ .env 틀 만들기 ④ 기동 명령 출력.  다시 실행해도 안전하다(있는 것은 건너뛴다).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CREW = path.resolve(__dirname);
const ROOT = path.dirname(CREW);
const ROOMS = path.join(ROOT, 'rooms');
const KNOWLEDGE = path.join(ROOT, 'knowledge');
const BOTS = fs.readdirSync(path.join(CREW, 'bots')).filter(b => fs.existsSync(path.join(CREW, 'bots', b, 'CLAUDE.md')));

// Claude Code 권한 패턴: "//" + 절대 경로(슬래시). 윈도우 C:\x → //C:/x, 맥 /Users/x → //Users/x
const pat = p => '//' + p.replace(/\\/g, '/').replace(/^\//, '');
const log = m => console.log('  ' + m);

function ensureDir(p, note) { if (!fs.existsSync(p)) { fs.mkdirSync(p, { recursive: true }); log(`만듦  ${p}${note ? '  (' + note + ')' : ''}`); } else log(`있음  ${p}`); }
function gitInit(p) { if (!fs.existsSync(path.join(p, '.git'))) { execSync('git init -q -b main', { cwd: p }); log(`git init  ${p}`); } }

console.log(`루트: ${ROOT}\ncrew: ${CREW}\n봇: ${BOTS.join(', ')}\n`);

console.log('① 형제 폴더');
ensureDir(ROOMS, '과제마다 이 아래에 방 폴더, 방마다 git');
ensureDir(KNOWLEDGE, '회사 지식, git 하나');
ensureDir(path.join(KNOWLEDGE, 'domain'));
ensureDir(path.join(KNOWLEDGE, 'projects'));
gitInit(KNOWLEDGE);
ensureDir(path.join(CREW, 'proposals'));

console.log('\n② 봇 settings.json');
const tpl = fs.readFileSync(path.join(CREW, 'common', 'settings.template.json'), 'utf8');
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
    .replace(/\{\{BOT\}\}/g, bot)
    .replace('{{ROOMS_DIR}}', ROOMS.replace(/\\/g, '\\\\'))
    .replace('{{KNOWLEDGE_DIR}}', KNOWLEDGE.replace(/\\/g, '\\\\'))
    .replace('{{PROPOSALS_DIR}}', path.join(CREW, 'proposals').replace(/\\/g, '\\\\')));
  const dir = path.join(CREW, 'bots', bot, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(json, null, 2) + '\n');
  log(`씀  bots/${bot}/.claude/settings.json  (deny ${json.permissions.deny.length}개)`);
  const env = path.join(CREW, 'bots', bot, '.env');
  if (!fs.existsSync(env)) { fs.writeFileSync(env, 'MINIDISCORD_TOKEN=\n'); log(`틀  bots/${bot}/.env  ← 토큰을 채워라`); }
}

console.log('\n③ 기동 명령 (봇마다 터미널 하나)');
for (const bot of BOTS) console.log(`  cd "${path.join(CREW, 'bots', bot)}" && claude --setting-sources project,local --strict-mcp-config --mcp-config .mcp.json`);
console.log('\n끝. 지침을 고쳤으면 봇을 재시작해야 적용된다.');
