// AI 对战模拟：检查引擎稳定性并输出平衡统计
// 用法：node tests/sim.mjs [局数] [难度]
import { Game } from '../js/engine.js';
import { chooseAction } from '../js/ai.js';
import { CLASSES, CARD_LIST } from '../js/cards.js';

const N = +(process.argv[2] || 200);
const LEVEL = process.argv[3] || 'normal';
const cls = Object.keys(CLASSES);
const stats = { firstWins: 0, draws: 0, turns: 0, timeouts: 0 };
const clsStat = Object.fromEntries(cls.map((c) => [c, { games: 0, wins: 0 }]));
const played = {};

for (let i = 0; i < N; i++) {
  const classes = [cls[i % 4], cls[Math.floor(i / 4) % 4]];
  const g = Game.create({ classes, ai: [true, true], seed: 1000 + i });
  let t = 0;
  while (g.s.winner === null && t < 200) {
    g.beginTurn();
    if (g.s.winner !== null) break;
    const a = chooseAction(g, LEVEL);
    if (a) {
      played[a.card] = (played[a.card] || 0) + 1;
      if (!g.play(a.card, a.target)) throw new Error('AI 选择了非法动作 ' + JSON.stringify(a));
    }
    g.attackPhase();
    g.endTurn();
    g.takeEvents();
    t++;
  }
  if (g.s.winner === null) { stats.timeouts++; continue; }
  stats.turns += t;
  for (const p of [0, 1]) clsStat[classes[p]].games++;
  if (g.s.winner === -1) { stats.draws++; continue; }
  clsStat[classes[g.s.winner]].wins++;
  if (g.s.winner === g.s.first) stats.firstWins++;
  for (const pl of g.s.players) {
    if (!(pl.hp <= 60)) throw new Error('英雄生命异常 ' + pl.hp);
    for (const c of pl.board) if (c && (c.hp > c.maxHp)) throw new Error('生物生命超过上限 ' + JSON.stringify(c));
  }
}

const done = N - stats.timeouts;
console.log(`对局 ${N}（${LEVEL}），超时 ${stats.timeouts}，平局 ${stats.draws}`);
console.log(`平均回合数（双方合计）：${(stats.turns / done).toFixed(1)}`);
console.log(`先手胜率：${((stats.firstWins / (done - stats.draws)) * 100).toFixed(1)}%`);
for (const c of cls) console.log(`  ${CLASSES[c].name}: 胜率 ${((clsStat[c].wins / clsStat[c].games) * 100).toFixed(1)}%（${clsStat[c].games} 场次）`);
const never = CARD_LIST.filter((c) => !c.token && !played[c.id]).map((c) => c.name);
console.log('从未被 AI 使用的卡：', never.join('、') || '无');
if (stats.timeouts > N * 0.05) { console.error('超时局过多'); process.exit(1); }
