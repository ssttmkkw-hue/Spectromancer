// 规则引擎（无 DOM 依赖，可在浏览器与 Node 中运行）
import { CARDS, ELEMENTS, BASIC_ELEMENTS, CLASSES, buildHand, ELEMENT_INFO } from './cards.js';

export const RULES = {
  HERO_HP: 60,
  SLOTS: 6,
  BASIC_START_TOTAL: 12, // 四种基础元素初始总和
  BASIC_START_MIN: 1,
  BASIC_START_MAX: 6,
  SPECIAL_START: 2,      // 职业元素初始值
  GROWTH: 1,             // 每回合每种元素 +1
  FIRST_TURN_GROWTH: true, // 先手第一回合是否也增长元素
  SECOND_BONUS: 2,       // 后手补偿：额外基础元素点数（随机分配）
};

const opp = (p) => 1 - p;

export function elName(el, cls) {
  return el === 'special' ? CLASSES[cls].el : ELEMENT_INFO[el].name;
}

function mulberry(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return { next: t, value: ((r ^ (r >>> 14)) >>> 0) / 4294967296 };
}

export class Game {
  constructor(state) {
    this.s = state;
    this.events = [];
  }

  /** 新开一局 */
  static create({ classes, names = ['你', '对手'], ai = [false, true], seed = (Math.random() * 2 ** 31) | 0, first = null }) {
    const s = {
      seed, turn: 1, current: 0, first: 0, winner: null, uid: 1, log: [],
      players: [0, 1].map((i) => ({
        name: names[i], cls: classes[i], ai: ai[i], hp: RULES.HERO_HP, maxHp: RULES.HERO_HP,
        mana: {}, hand: null, board: Array(RULES.SLOTS).fill(null),
      })),
    };
    const g = new Game(s);
    s.first = first ?? g.rand(2);
    s.current = s.first;
    for (const pl of s.players) {
      pl.hand = buildHand(pl.cls, (n) => g.rand(n));
      // 基础元素：每种至少 MIN，剩余点数随机分配，单种不超过 MAX
      const m = { fire: RULES.BASIC_START_MIN, water: RULES.BASIC_START_MIN, air: RULES.BASIC_START_MIN, earth: RULES.BASIC_START_MIN };
      let left = RULES.BASIC_START_TOTAL - 4 * RULES.BASIC_START_MIN + (pl === s.players[s.first] ? 0 : RULES.SECOND_BONUS);
      while (left > 0) {
        const e = BASIC_ELEMENTS[g.rand(4)];
        if (m[e] < RULES.BASIC_START_MAX || Object.values(m).every((v) => v >= RULES.BASIC_START_MAX)) { m[e]++; left--; }
      }
      pl.mana = { ...m, special: RULES.SPECIAL_START };
    }
    g.log(`${s.players[s.first].name} 先手。`);
    return g;
  }

  clone() {
    return new Game(JSON.parse(JSON.stringify(this.s)));
  }

  // ---------------- 基础查询 ----------------
  rand(n) {
    const r = mulberry(this.s.seed);
    this.s.seed = r.next;
    return Math.floor(r.value * n);
  }
  get cur() { return this.s.current; }
  player(p) { return this.s.players[p]; }
  def(c) { return CARDS[c.id]; }
  creatureAt(p, slot) {
    if (slot < 0 || slot >= RULES.SLOTS) return null;
    const c = this.s.players[p].board[slot];
    return c && c.hp > 0 ? c : null;
  }
  creatures(p) { return this.s.players[p].board.filter((c) => c && c.hp > 0); }
  neighbors(c) { return [this.creatureAt(c.p, c.slot - 1), this.creatureAt(c.p, c.slot + 1)].filter(Boolean); }
  atkOf(c) {
    let a = c.atk;
    for (const o of this.creatures(c.p)) {
      if (o.uid === c.uid) continue;
      const d = CARDS[o.id];
      if (d.auraAll) a += d.auraAll;
      if (d.auraAdj && Math.abs(o.slot - c.slot) === 1) a += d.auraAdj;
    }
    return Math.max(0, a);
  }
  /** 法术伤害：基础值 + 己方法术强化 */
  spell(p, base) {
    return base + this.creatures(p).reduce((s, c) => s + (CARDS[c.id].spellPower || 0), 0);
  }
  growthOf(p, el) {
    return RULES.GROWTH + this.creatures(p).reduce((s, c) => s + ((CARDS[c.id].growth || {})[el] || 0), 0);
  }
  canAttack(c) {
    const d = CARDS[c.id];
    return c.hp > 0 && d.atk > 0 && this.atkOf(c) > 0 && (c.born < this.s.turn || d.haste);
  }

  // ---------------- 事件 & 日志 ----------------
  emit(e) { this.events.push(e); }
  takeEvents() { const e = this.events; this.events = []; return e; }
  log(t) { this.s.log.push(t); if (this.s.log.length > 300) this.s.log.shift(); }

  // ---------------- 效果原语（供卡牌钩子调用） ----------------
  damage(c, amt, src = {}) {
    if (!c || c.hp <= 0) return 0;
    const d = CARDS[c.id];
    amt = Math.max(0, amt - (d.reduce || 0));
    if (amt <= 0) { this.emit({ t: 'dmg', p: c.p, slot: c.slot, n: 0 }); return 0; }
    const dealt = Math.min(amt, c.hp);
    c.hp -= amt;
    this.emit({ t: 'dmg', p: c.p, slot: c.slot, n: amt });
    if (c.hp > 0 && d.onDamaged) d.onDamaged(this, c, amt, src);
    return dealt;
  }
  damageHero(p, amt, src = {}) {
    if (this.s.winner !== null) return 0;
    const shield = this.creatures(p).reduce((s, c) => s + (CARDS[c.id].heroShield || 0), 0);
    amt = Math.max(0, amt - shield);
    const pl = this.s.players[p];
    const dealt = Math.min(amt, Math.max(0, pl.hp));
    pl.hp -= amt;
    this.emit({ t: 'hero', p, n: -amt });
    this.checkWinner();
    return dealt;
  }
  heal(c, n) {
    if (!c || c.hp <= 0) return 0;
    const v = Math.min(n, c.maxHp - c.hp);
    if (v > 0) { c.hp += v; this.emit({ t: 'heal', p: c.p, slot: c.slot, n: v }); }
    return v;
  }
  healHero(p, n) {
    const pl = this.s.players[p];
    const v = Math.max(0, Math.min(n, pl.maxHp - pl.hp));
    if (v > 0) { pl.hp += v; this.emit({ t: 'hero', p, n: v }); }
    return v;
  }
  freeze(c, n = 1) {
    if (!c || c.hp <= 0) return;
    c.frozen = Math.max(c.frozen || 0, n);
    this.emit({ t: 'freeze', p: c.p, slot: c.slot });
  }
  kill(c) {
    if (!c || c.hp <= 0) return;
    c.hp = 0;
    this.emit({ t: 'dmg', p: c.p, slot: c.slot, n: '☠' });
  }
  addMana(p, el, n) {
    const m = this.s.players[p].mana;
    m[el] = Math.max(0, m[el] + n);
    this.emit({ t: 'mana', p, el, n });
  }
  summon(p, slot, id) {
    const d = CARDS[id];
    const c = { uid: this.s.uid++, id, p, slot, atk: d.atk, hp: d.hp, maxHp: d.hp, born: this.s.turn, frozen: 0 };
    this.s.players[p].board[slot] = c;
    this.emit({ t: 'summon', p, slot, uid: c.uid });
    if (d.onSummon) d.onSummon(this, c);
    return c;
  }
  /** 一次攻击（普通或自定义），供攻击阶段与“额外攻击”效果使用 */
  doAttack(c) {
    if (!c || c.hp <= 0 || this.s.winner !== null) return;
    const d = CARDS[c.id];
    this.emit({ t: 'attack', p: c.p, slot: c.slot });
    if (d.attack) d.attack(this, c);
    else {
      const front = this.creatureAt(opp(c.p), c.slot);
      const src = { kind: 'creature', p: c.p, src: c };
      if (front) this.damage(front, this.atkOf(c), src);
      else this.damageHero(opp(c.p), this.atkOf(c), src);
    }
    if (c.hp > 0 && d.onAttack) d.onAttack(this, c);
  }

  resolveDeaths() {
    for (let guard = 0; guard < 20; guard++) {
      const dead = [];
      for (const pl of this.s.players) pl.board.forEach((c) => { if (c && c.hp <= 0) dead.push(c); });
      if (!dead.length) return;
      for (const c of dead) {
        this.s.players[c.p].board[c.slot] = null;
        this.emit({ t: 'death', p: c.p, slot: c.slot, uid: c.uid });
        this.log(`${this.s.players[c.p].name}的「${CARDS[c.id].name}」阵亡。`);
      }
      for (const c of dead) {
        const d = CARDS[c.id];
        if (d.onDeath) d.onDeath(this, c);
        for (const p of [0, 1]) for (const o of this.creatures(p)) {
          const od = CARDS[o.id];
          if (od.onAnyDeath) od.onAnyDeath(this, o, c);
        }
      }
    }
  }
  checkWinner() {
    const [a, b] = this.s.players;
    if (this.s.winner !== null) return;
    if (a.hp <= 0 && b.hp <= 0) this.s.winner = -1;
    else if (a.hp <= 0) this.s.winner = 1;
    else if (b.hp <= 0) this.s.winner = 0;
  }

  // ---------------- 回合流程 ----------------
  /** 回合开始：元素增长（全局第 1 回合先手不增长）→ 回合开始效果 */
  beginTurn() {
    const p = this.cur, pl = this.player(p);
    this.log(`—— 第 ${Math.ceil(this.s.turn / 2)} 轮 · ${pl.name}的回合 ——`);
    if (this.s.turn > 1 || RULES.FIRST_TURN_GROWTH) {
      for (const el of ELEMENTS) pl.mana[el] += this.growthOf(p, el);
    }
    for (let s = 0; s < RULES.SLOTS; s++) {
      const c = this.creatureAt(p, s);
      if (c && CARDS[c.id].onTurnStart) CARDS[c.id].onTurnStart(this, c);
      this.resolveDeaths();
      if (this.s.winner !== null) return;
    }
  }

  targetsFor(p, id) {
    const d = CARDS[id];
    const slots = (q, empty) => [...Array(RULES.SLOTS).keys()].filter((s) => !!this.creatureAt(q, s) !== empty);
    if (d.type === 'creature') return slots(p, true);
    switch (d.target) {
      case 'none': return [null];
      case 'ownEmptySlot': return slots(p, true);
      case 'ownCreature': return this.creatures(p).map((c) => ({ p, slot: c.slot }));
      case 'enemyCreature': return this.creatures(opp(p)).map((c) => ({ p: opp(p), slot: c.slot }));
      case 'anyCreature': return [0, 1].flatMap((q) => this.creatures(q).map((c) => ({ p: q, slot: c.slot })));
    }
    return [];
  }
  canPay(p, id) {
    const d = CARDS[id];
    return this.player(p).mana[d.el] >= d.cost;
  }
  /** 卡牌是否可用：费用足够且存在合法目标 */
  playable(p, id) { return this.canPay(p, id) && this.targetsFor(p, id).length > 0; }

  legalActions(p = this.cur) {
    const acts = [];
    const hand = this.player(p).hand;
    for (const el of ELEMENTS) for (const id of hand[el]) {
      if (!this.canPay(p, id)) continue;
      for (const t of this.targetsFor(p, id)) acts.push({ card: id, target: t });
    }
    return acts;
  }

  /** 出牌（每回合 1 张）。返回是否成功 */
  play(id, target) {
    const p = this.cur, pl = this.player(p), d = CARDS[id];
    if (!Object.values(pl.hand).some((l) => l.includes(id))) return false;
    if (!this.canPay(p, id)) return false;
    const legal = this.targetsFor(p, id);
    const key = (t) => JSON.stringify(t ?? null);
    if (!legal.some((t) => key(t) === key(target))) return false;
    pl.mana[d.el] -= d.cost;
    this.emit({ t: 'cast', p, id, target });
    if (d.type === 'creature') {
      this.log(`${pl.name}召唤了「${d.name}」。`);
      this.summon(p, target, id);
    } else {
      this.log(`${pl.name}施放了「${d.name}」。`);
      const t = target && typeof target === 'object' ? this.creatureAt(target.p, target.slot) : target;
      d.cast(this, p, t);
      for (const q of [0, 1]) for (const c of this.creatures(q)) {
        const cd = CARDS[c.id];
        if (cd.onAnySpell) cd.onAnySpell(this, c, p);
      }
    }
    this.resolveDeaths();
    return true;
  }

  /** 攻击阶段的一步：第 slot 格的己方生物攻击 */
  attackSlot(slot) {
    if (this.s.winner !== null) return false;
    const c = this.creatureAt(this.cur, slot);
    if (!c || !this.canAttack(c)) return false;
    if (c.frozen > 0) {
      c.frozen--;
      this.emit({ t: 'frozenSkip', p: c.p, slot });
      return true;
    }
    this.doAttack(c);
    this.resolveDeaths();
    return true;
  }
  attackPhase() { for (let s = 0; s < RULES.SLOTS; s++) this.attackSlot(s); }

  endTurn() {
    this.s.current = opp(this.s.current);
    this.s.turn++;
  }

  /** 无动画的完整回合（AI 推演 / 模拟器用） */
  runTurn(action) {
    if (action) this.play(action.card, action.target);
    this.attackPhase();
    this.endTurn();
  }
}
