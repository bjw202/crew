#!/usr/bin/env node
// 회고 계측 — orchestrator 가 회차 닫힘에 돌린다.
//
//   node ../../scripts/retro.js <방> <회차>
//
// 방 폴더와 그 저장소의 git 이력만 읽는다. 채팅 서버도 인증도 쓰지 않는다.
// 숫자는 이 스크립트가 세고, 판단은 orchestrator 가 한다 — 봇에게 손으로 세게 하지 않는다.
// 턴·토큰·승인 횟수는 여기서 못 본다. 그건 사람이 retro-cost.js 로 잰다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CREW = path.dirname(__dirname);
const ROOT = path.dirname(CREW);
const [roomArg, roundArg] = process.argv.slice(2);
if (!roomArg || !roundArg) { console.error('쓰는 법: node retro.js <방> <회차>'); process.exit(1); }
const round = String(roundArg).trim();
const ROOM = path.join(ROOT, 'rooms', roomArg.replace(/[/]|\.\./g, '-'));
if (!fs.existsSync(ROOM)) { console.error(`방 폴더가 없다: ${ROOM}`); process.exit(1); }

const read = p => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const git = a => { try { return execSync(`git -C ${JSON.stringify(ROOM)} ${a}`, { encoding: 'utf8' }); } catch { return ''; } };
const out = [];
const say = (k, v) => out.push('  ' + k.padEnd(9) + v);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.name === '.git' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(ROOM);
const mds = files.filter(f => f.endsWith('.md'));
const rel = f => path.relative(ROOM, f);

// 머리말 한 덩이 읽기
function head(f) {
  const t = read(f); const m = t.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const o = {};
  for (const line of m[1].split('\n')) { const kv = line.match(/^([a-z_]+):\s*(.*)$/); if (kv) o[kv[1]] = kv[2].trim(); }
  return o;
}
const headed = mds.map(f => [f, head(f)]).filter(([, h]) => h);

// ── 작업 (chronicle 의 이 회차 줄) ──
const chron = read(path.join(ROOM, 'orchestrator', 'chronicle.md')).split('\n')
  .map(l => l.split('|').map(c => c.trim())).filter(c => c.length >= 8 && c[1] === round);
say('작업', chron.length ? `통과 ${chron.length} (${chron.map(c => c[2]).join('·')})` : '통과 0 — chronicle 에 이 회차 줄이 없다');

// ── 정정판 · 폐기 ──
const sup = headed.filter(([, h]) => h.supersedes && h.supersedes !== 'none');
const chain = {};                                    // 대체된 파일 → 대체한 파일
for (const [f, h] of sup) chain[path.basename(h.supersedes)] = path.basename(f);
let longest = 0, longestPath = '';
for (const [f] of sup) {
  let n = 1, cur = path.basename(f), guard = 0;
  const back = Object.fromEntries(Object.entries(chain).map(([a, b]) => [b, a]));
  while (back[cur] && guard++ < 20) { cur = back[cur]; n++; }
  if (n > longest) { longest = n; longestPath = `${cur} → … → ${path.basename(f)}`; }
}
say('정정판', sup.length ? `${sup.length}개가 앞 판을 대체 · 가장 긴 사슬 ${longest}겹 (${longestPath})` : '없음');

const voids = headed.filter(([, h]) => h.status === 'void');
// 폐기된 판을 아직 sources 로 가리키는 살아 있는 파일
const voidNames = new Set(voids.map(([f]) => path.basename(f)));
const stillCited = [];
for (const [f, h] of headed) {
  if (h.status === 'void') continue;
  if (/(^|\/)index\.md$/.test(f)) continue;                    // 색인은 폐기된 판도 대체 경로와 함께 싣는 것이 제 일이다
  // supersedes 줄은 정상 인용이다 — 그 줄만 빼고 본다
  const body = read(f).split('\n').filter(l => !/^supersedes:/.test(l.trim())).join('\n');
  for (const v of voidNames) if (body.includes(v)) { stillCited.push(`${rel(f)} → ${v}`); break; }
}
say('폐기', `void ${voids.length}개` + (stillCited.length ? ` · 아직 인용되는 것 ${stillCited.length}건: ${stillCited.slice(0, 3).join(', ')}` : ' · 아직 인용되는 것 0'));

// ── 커밋 ──
const log = git('log --oneline --no-decorate').split('\n').filter(Boolean);
const byBot = {};
for (const l of log) { const m = l.match(/^\w+\s+(\S+)/); if (m) { const b = m[1].replace(/[:：,]$/, ''); byBot[b] = (byBot[b] || 0) + 1; } }
say('커밋', `${log.length} · ` + Object.entries(byBot).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([b, n]) => `${b} ${n}`).join(' · '));

// ── 보고 서식 (칸당 400자) ──
const KEYS = ['결론', '근거', '내가 정한 것', '못 확인한 것', '결과물'];
let over = 0, worst = 0, worstAt = '';
for (const f of mds.filter(f => /task-\d+-report\.md$/.test(f))) {
  for (const line of read(f).split('\n')) {
    const m = line.match(/^(결론|근거|내가 정한 것|못 확인한 것|결과물):\s*(.*)$/);
    if (m && [...m[2]].length > 400) { over++; if ([...m[2]].length > worst) { worst = [...m[2]].length; worstAt = `${rel(f)} 의 "${m[1]}"`; } }
  }
}
say('보고칸', over ? `400자 초과 ${over}칸 · 가장 긴 것 ${worst}자 (${worstAt})` : '400자 초과 0칸');

// ── 미해결 (decisions 의 "못 확인한 것") ──
const dec = read(path.join(ROOM, 'orchestrator', 'decisions.md')).split('\n');
const unk = dec.filter(l => l.includes('못 확인한 것') && !/못 확인한 것: ?없음/.test(l));
say('미해결', `decisions 의 "못 확인한 것" ${unk.length}건`);

// ── 제안 ──
const pdir = path.join(CREW, 'proposals');
const props = fs.existsSync(pdir) ? fs.readdirSync(pdir).filter(f => f.endsWith('.md')) : [];
const st = { 제안: 0, 결재: 0, 반영: 0, 기각: 0, '?': 0 };
const stuck = [];
for (const f of props) {
  const t = read(path.join(pdir, f));
  const m = t.match(/^\s*(?:[-*]\s*)?상태\s*[:：]\s*(제안|결재|반영|기각)/m);
  const k = m ? m[1] : '?'; st[k]++;
  if (k === '결재') stuck.push(f);
}
say('제안', `제안 ${st.제안} · 결재 ${st.결재} · 반영 ${st.반영} · 기각 ${st.기각}` + (st['?'] ? ` · 상태 못 읽음 ${st['?']}` : '')
  + (stuck.length ? `\n            ↳ 결재됐는데 아직 반영 안 된 것: ${stuck.join(', ')} — 그 봇에게 통지가 갔는지 본다` : ''));

// ── 배분 · 멘션 ──
const state = read(path.join(ROOM, 'orchestrator', 'state.md'));
const dispatched = chron.length + (state.match(/^\d+\s*\|/gm) || []).length;
say('배분', `이 회차에 손댄 작업 ${dispatched} (통과 ${chron.length} + 작업표에 남은 것 ${dispatched - chron.length})`);

const mm = state.match(/이번 회차 내 멘션 수:\s*(\d+)[^\n]*?상한\s*(\d+)/);
if (mm) {
  const cnt = Number(mm[1]), cap = Number(mm[2]);
  let note = '';
  // 배분 하나에 최소 배분 한 번 + 보고 한 번이다. 기록이 배분 수의 두 배에 못 미치면 세다 만 것이다.
  if (cnt < dispatched * 2) note = `  ← 배분 ${dispatched}건인데 기록이 ${cnt}. 카운터가 멈췄는지 본다`;
  else if (cnt > cap) note = '  ← 상한 넘음. 판정 1회를 올렸는지 본다';
  say('멘션', `기록 ${cnt} / 상한 ${cap}${note}`);
} else say('멘션', 'state.md 에서 못 읽음 — 카운터가 죽었는지 본다');

console.log(`\n회고 계측 · 방 ${roomArg} · 회차 ${round} · ${new Date().toISOString().slice(0, 10)}\n`);
console.log(out.join('\n'));
console.log('\n  (턴·토큰·승인 횟수·방이 멈춰 있던 시간은 여기서 못 본다 — 사람이 scripts/retro-cost.js 로 잰다)\n');
