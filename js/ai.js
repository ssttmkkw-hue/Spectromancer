// AI：枚举所有合法出牌（含不出牌），在克隆局面上推演「出牌 + 攻击阶段」后评分。
// hard 难度额外推演对手的最佳回应（2 层）。
import { CARDS } from './cards.js';
import { RULES } from './engine.js';

const opp = (p) => 1 - p;

function creatureValue(g, c) {
  const d = CARDS[c.id];
  let v = g.atkOf(c) * 2.2 + c.hp * 0.55;
  if (d.onTurnStart || d.growth || d.auraAdj || d.auraAll || d.spellPower || d.heroShield || d.onAnyDeath || d.onAnySpell) v += 2 + d.cost * 0.6;
  if (d.reduce) v += d.reduce * 2;
  if (c.frozen) v -= g.atkOf(c) * 0.8;
  return v;
}

export function evaluate(g, me) {
  const s = g.s;
  if (s.winner === me) return 1e6;
  if (s.winner === opp(me)) return -1e6;
  if (s.winner === -1) return -5e5;
  const A = g.player(me), B = g.player(opp(me));
  let v = 0;
  v += A.hp * (A.hp < 20 ? 2.2 : 1.2);
  v -= B.hp * (B.hp < 20 ? 2.0 : 1.5);
  for (let slot = 0; slot < RULES.SLOTS; slot++) {
    const a = g.creatureAt(me, slot), b = g.creatureAt(opp(me), slot);
    if (a) { v += creatureValue(g, a); if (!b) v += g.atkOf(a) * 1.0; }
    if (b) { v -= creatureValue(g, b); if (!a) v -= g.atkOf(b) * 1.6; }
  }
  for (const k in A.mana) v += Math.min(A.mana[k], 14) * 0.25;
  return v;
}

function simulate(g, act) {
  const c = g.clone();
  if (act) c.play(act.card, act.target);
  c.attackPhase();
  return c;
}

function bestReplyScore(g, me) {
  // g：我方回合已结束、轮到对手（尚未 beginTurn）
  const c = g.clone();
  c.endTurn();
  c.beginTurn();
  if (c.s.winner !== null) return evaluate(c, me);
  const o = opp(me);
  let worst = Infinity;
  for (const a of [null, ...c.legalActions(o)]) {
    const r = simulate(c, a);
    const sc = evaluate(r, me);
    if (sc < worst) worst = sc;
  }
  return worst;
}

/** 返回 {card, target} 或 null（跳过） */
export function chooseAction(game, level = 'normal') {
  const me = game.cur;
  const acts = [null, ...game.legalActions(me)];
  let scored = acts.map((a) => ({ a, v: evaluate(simulate(game, a), me) }));
  if (level === 'easy') scored.forEach((x) => (x.v += Math.random() * 25));
  scored.sort((x, y) => y.v - x.v);
  if (level === 'hard') {
    const top = scored.slice(0, 8);
    for (const x of top) {
      const after = simulate(game, x.a);
      x.v = after.s.winner === me ? 1e6 : bestReplyScore(after, me) * 0.6 + x.v * 0.4;
    }
    top.sort((x, y) => y.v - x.v);
    return top[0].a;
  }
  return scored[0].a;
}
