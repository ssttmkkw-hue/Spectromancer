// 卡牌数据 —— 《元素决斗》原创卡组
// 每个元素卡池 8 张，按费用分 4 档（每档 2 张），开局每档随机抽 1 张 → 每元素 4 张，共 20 张。
// 钩子函数签名见 docs/02-开发文档.md 「卡牌效果钩子」一节。

export const ELEMENTS = ['fire', 'water', 'air', 'earth', 'special'];
export const BASIC_ELEMENTS = ['fire', 'water', 'air', 'earth'];

export const ELEMENT_INFO = {
  fire:  { name: '火', color: '#e8553d', icon: '🔥' },
  water: { name: '水', color: '#3d8ee8', icon: '💧' },
  air:   { name: '风', color: '#9ad0e0', icon: '🌪️' },
  earth: { name: '土', color: '#8a6a3a', icon: '🪨' },
};

// 职业：special 元素随职业变化
export const CLASSES = {
  radiant: { name: '星辉祭司', el: '星辉', color: '#f2c94c', icon: '✨', desc: '治疗与守护，靠续航拖垮对手。' },
  shadow:  { name: '暗影术士', el: '暗影', color: '#9b59b6', icon: '💀', desc: '以死亡为燃料，越打越强。' },
  gear:    { name: '机巧师',   el: '齿轮', color: '#95a5a6', icon: '⚙️', desc: '炮塔与装甲，稳扎稳打。' },
  wild:    { name: '兽王',     el: '野性', color: '#27ae60', icon: '🐺', desc: '群体增益与额外攻击，爆发极强。' },
};

// ---------- 小工具 ----------
const opp = (p) => 1 - p;
const enemies = (g, p) => g.creatures(opp(p));
const allies = (g, p) => g.creatures(p);

// T = 档位（1..4），抽牌时每档抽一张
const C = (o) => ({ type: 'creature', ...o });
const S = (o) => ({ type: 'spell', ...o });

const cardList = [
  // ===================== 火：直伤、爆发 =====================
  C({ id: 'ember_imp', el: 'fire', tier: 1, cost: 1, name: '余烬小鬼', icon: '👺', atk: 2, hp: 7,
      text: '召唤时：对正对面的敌方生物造成 2 点伤害。',
      onSummon(g, c) { const t = g.creatureAt(opp(c.p), c.slot); if (t) g.damage(t, 2, { kind: 'effect', p: c.p }); } }),
  S({ id: 'scorch', el: 'fire', tier: 1, cost: 2, name: '灼热射线', icon: '☄️', target: 'enemyCreature',
      text: '对一个敌方生物造成 8 点伤害。',
      cast(g, p, t) { g.damage(t, g.spell(p, 8), { kind: 'spell', p }); } }),
  C({ id: 'flame_wall', el: 'fire', tier: 2, cost: 4, name: '烈焰之墙', icon: '🧱', atk: 0, hp: 6,
      text: '不会攻击。召唤时：对所有敌方生物造成 4 点伤害。',
      onSummon(g, c) { for (const t of enemies(g, c.p)) g.damage(t, 4, { kind: 'effect', p: c.p }); } }),
  C({ id: 'lava_berserker', el: 'fire', tier: 2, cost: 5, name: '熔岩狂战士', icon: '🪓', atk: 4, hp: 16,
      text: '每次受到伤害后，攻击力 +1。',
      onDamaged(g, c) { c.atk += 1; } }),
  C({ id: 'cinder_golem', el: 'fire', tier: 3, cost: 7, name: '灰烬魔像', icon: '🗿', atk: 6, hp: 24,
      text: '你的回合开始时：对所有敌方生物造成 1 点伤害。',
      onTurnStart(g, c) { for (const t of enemies(g, c.p)) g.damage(t, 1, { kind: 'effect', p: c.p }); } }),
  S({ id: 'fire_rain', el: 'fire', tier: 3, cost: 8, name: '火雨', icon: '🌋', target: 'none',
      text: '对所有敌方生物造成 7 点伤害，并对敌方英雄造成 5 点伤害。',
      cast(g, p) { const d = g.spell(p, 7); for (const t of enemies(g, p)) g.damage(t, d, { kind: 'spell', p }); g.damageHero(opp(p), g.spell(p, 5), { kind: 'spell', p }); } }),
  C({ id: 'inferno_lord', el: 'fire', tier: 4, cost: 11, name: '炎狱之主', icon: '😈', atk: 9, hp: 34,
      text: '召唤时：对所有敌方生物造成 5 点伤害。你的火元素每回合额外 +1。', growth: { fire: 1 },
      onSummon(g, c) { for (const t of enemies(g, c.p)) g.damage(t, 5, { kind: 'effect', p: c.p }); } }),
  S({ id: 'meteor', el: 'fire', tier: 4, cost: 12, name: '陨星坠落', icon: '💥', target: 'none',
      text: '对所有敌方生物造成 12 点伤害。',
      cast(g, p) { const d = g.spell(p, 12); for (const t of enemies(g, p)) g.damage(t, d, { kind: 'spell', p }); } }),

  // ===================== 水：控制、资源 =====================
  S({ id: 'frost_bolt', el: 'water', tier: 1, cost: 1, name: '冰霜箭', icon: '❄️', target: 'enemyCreature',
      text: '对一个敌方生物造成 4 点伤害并冻结它（跳过其下一次攻击）。',
      cast(g, p, t) { g.damage(t, g.spell(p, 4), { kind: 'spell', p }); g.freeze(t, 1); } }),
  C({ id: 'tide_acolyte', el: 'water', tier: 1, cost: 2, name: '潮汐侍僧', icon: '🧜', atk: 1, hp: 10,
      text: '你的水元素每回合额外 +1。', growth: { water: 1 } }),
  C({ id: 'coral_guard', el: 'water', tier: 2, cost: 4, name: '珊瑚卫士', icon: '🐚', atk: 3, hp: 16,
      text: '受到的所有伤害 -1。', reduce: 1 }),
  S({ id: 'healing_spring', el: 'water', tier: 2, cost: 4, name: '治愈之泉', icon: '⛲', target: 'none',
      text: '你的英雄恢复 10 点生命，所有己方生物恢复 5 点生命。',
      cast(g, p) { g.healHero(p, 10); for (const c of allies(g, p)) g.heal(c, 5); } }),
  C({ id: 'sea_witch', el: 'water', tier: 3, cost: 6, name: '海妖女巫', icon: '🧙‍♀️', atk: 3, hp: 20,
      text: '召唤时：冻结所有敌方生物。',
      onSummon(g, c) { for (const t of enemies(g, c.p)) g.freeze(t, 1); } }),
  S({ id: 'vortex', el: 'water', tier: 3, cost: 8, name: '吞噬漩涡', icon: '🌀', target: 'enemyCreature',
      text: '对一个敌方生物造成 20 点伤害。',
      cast(g, p, t) { g.damage(t, g.spell(p, 20), { kind: 'spell', p }); } }),
  C({ id: 'abyss_sovereign', el: 'water', tier: 4, cost: 10, name: '深渊海皇', icon: '🐋', atk: 6, hp: 32,
      text: '你的四种基础元素每回合额外 +1。', growth: { fire: 1, water: 1, air: 1, earth: 1 } }),
  S({ id: 'tsunami', el: 'water', tier: 4, cost: 11, name: '海啸', icon: '🌊', target: 'none',
      text: '对所有敌方生物造成 9 点伤害并冻结它们。',
      cast(g, p) { const d = g.spell(p, 9); for (const t of enemies(g, p)) { g.damage(t, d, { kind: 'spell', p }); g.freeze(t, 1); } } }),

  // ===================== 风：迅捷、打脸 =====================
  C({ id: 'wind_sprite', el: 'air', tier: 1, cost: 1, name: '风之精灵', icon: '🧚', atk: 2, hp: 5, haste: true,
      text: '迅捷：召唤当回合即可攻击。' }),
  S({ id: 'static_shock', el: 'air', tier: 1, cost: 2, name: '静电冲击', icon: '⚡', target: 'none',
      text: '对敌方英雄造成 5 点伤害，对每个敌方生物造成 1 点伤害。',
      cast(g, p) { g.damageHero(opp(p), g.spell(p, 5), { kind: 'spell', p }); for (const t of enemies(g, p)) g.damage(t, g.spell(p, 1), { kind: 'spell', p }); } }),
  C({ id: 'thunder_hawk', el: 'air', tier: 2, cost: 5, name: '雷鹰', icon: '🦅', atk: 3, hp: 13,
      text: '飞行：攻击总是直接打向敌方英雄。',
      attack(g, c) { g.damageHero(opp(c.p), g.atkOf(c), { kind: 'creature', p: c.p, src: c }); } }),
  S({ id: 'thunderclap', el: 'air', tier: 2, cost: 5, name: '雷霆一击', icon: '🌩️', target: 'none',
      text: '对敌方英雄造成 9 点伤害。',
      cast(g, p) { g.damageHero(opp(p), g.spell(p, 9), { kind: 'spell', p }); } }),
  C({ id: 'storm_caller', el: 'air', tier: 3, cost: 7, name: '风暴使者', icon: '🧞', atk: 5, hp: 22, spellPower: 2,
      text: '你的法术伤害 +2。' }),
  S({ id: 'chain_lightning', el: 'air', tier: 3, cost: 8, name: '连锁闪电', icon: '🔗', target: 'none',
      text: '对敌方英雄及所有敌方生物造成 8 点伤害。',
      cast(g, p) { const d = g.spell(p, 8); for (const t of enemies(g, p)) g.damage(t, d, { kind: 'spell', p }); g.damageHero(opp(p), d, { kind: 'spell', p }); } }),
  C({ id: 'thunder_titan', el: 'air', tier: 4, cost: 11, name: '雷霆泰坦', icon: '🗲', atk: 8, hp: 34,
      text: '每当任意一方施放法术后：对敌方英雄造成 3 点伤害。',
      onAnySpell(g, c) { g.damageHero(opp(c.p), 3, { kind: 'effect', p: c.p }); } }),
  S({ id: 'wrath_storm', el: 'air', tier: 4, cost: 12, name: '风暴之怒', icon: '🌪', target: 'none',
      text: '对所有敌方生物造成 5 点伤害，对敌方英雄造成 15 点伤害。',
      cast(g, p) { for (const t of enemies(g, p)) g.damage(t, g.spell(p, 5), { kind: 'spell', p }); g.damageHero(opp(p), g.spell(p, 15), { kind: 'spell', p }); } }),

  // ===================== 土：厚血、回复 =====================
  S({ id: 'earth_pulse', el: 'earth', tier: 1, cost: 1, name: '地脉涌动', icon: '🌱', target: 'none',
      text: '你的英雄恢复 7 点生命。',
      cast(g, p) { g.healHero(p, 7); } }),
  C({ id: 'rockhide_boar', el: 'earth', tier: 1, cost: 2, name: '岩甲野猪', icon: '🐗', atk: 2, hp: 12,
      text: '朴实而坚韧。' }),
  C({ id: 'elder_treant', el: 'earth', tier: 2, cost: 5, name: '古树守卫', icon: '🌳', atk: 3, hp: 22,
      text: '你的回合开始时：相邻的己方生物恢复 3 点生命。',
      onTurnStart(g, c) { for (const n of g.neighbors(c)) g.heal(n, 3); } }),
  S({ id: 'petrify', el: 'earth', tier: 2, cost: 4, name: '石化术', icon: '🪨', target: 'enemyCreature',
      text: '对一个敌方生物造成 9 点伤害，并使其攻击力永久 -2。',
      cast(g, p, t) { g.damage(t, g.spell(p, 9), { kind: 'spell', p }); t.atk = Math.max(0, t.atk - 2); } }),
  C({ id: 'mountain_giant', el: 'earth', tier: 3, cost: 8, name: '山岳巨人', icon: '⛰️', atk: 6, hp: 32,
      text: '你的回合开始时：自身恢复 4 点生命。',
      onTurnStart(g, c) { g.heal(c, 4); } }),
  S({ id: 'earthquake', el: 'earth', tier: 3, cost: 8, name: '大地震', icon: '🫨', target: 'none',
      text: '对场上所有生物（包括己方）造成 13 点伤害。',
      cast(g, p) { const d = g.spell(p, 13); for (const t of [...allies(g, p), ...enemies(g, p)]) g.damage(t, d, { kind: 'spell', p }); } }),
  C({ id: 'gaia_avatar', el: 'earth', tier: 4, cost: 11, name: '盖亚化身', icon: '🌍', atk: 7, hp: 42,
      text: '召唤时：你的英雄恢复 15 点生命。你的回合开始时：英雄恢复 3 点生命。',
      onSummon(g, c) { g.healHero(c.p, 15); }, onTurnStart(g, c) { g.healHero(c.p, 3); } }),
  S({ id: 'rebirth', el: 'earth', tier: 4, cost: 10, name: '大地复苏', icon: '🌄', target: 'none',
      text: '你的英雄恢复 22 点生命，所有己方生物恢复全部生命。',
      cast(g, p) { g.healHero(p, 22); for (const c of allies(g, p)) g.heal(c, 999); } }),

  // ===================== 星辉祭司 =====================
  C({ id: 'radiant_squire', el: 'special', cls: 'radiant', tier: 1, cost: 1, name: '辉光侍从', icon: '🛡️', atk: 1, hp: 8,
      text: '你的回合开始时：你的英雄恢复 2 点生命。',
      onTurnStart(g, c) { g.healHero(c.p, 2); } }),
  S({ id: 'blessing', el: 'special', cls: 'radiant', tier: 1, cost: 2, name: '星光祝福', icon: '🌟', target: 'ownCreature',
      text: '一个己方生物恢复全部生命，攻击力永久 +2。',
      cast(g, p, t) { g.heal(t, 999); t.atk += 2; } }),
  C({ id: 'guardian_angel', el: 'special', cls: 'radiant', tier: 2, cost: 4, name: '守护天使', icon: '👼', atk: 3, hp: 14, heroShield: 1,
      text: '你的英雄受到的所有伤害 -1。' }),
  S({ id: 'holy_fire', el: 'special', cls: 'radiant', tier: 2, cost: 3, name: '圣焰', icon: '🕯️', target: 'enemyCreature',
      text: '对一个敌方生物造成 10 点伤害，你的英雄恢复 5 点生命。',
      cast(g, p, t) { g.damage(t, g.spell(p, 10), { kind: 'spell', p }); g.healHero(p, 5); } }),
  C({ id: 'dawn_knight', el: 'special', cls: 'radiant', tier: 3, cost: 6, name: '晨星骑士', icon: '🏇', atk: 6, hp: 22,
      text: '每次攻击后：你的英雄恢复 3 点生命。',
      onAttack(g, c) { g.healHero(c.p, 3); } }),
  S({ id: 'purge', el: 'special', cls: 'radiant', tier: 3, cost: 6, name: '净化圣光', icon: '🔆', target: 'none',
      text: '对所有敌方生物造成 6 点伤害，所有己方生物恢复 6 点生命。',
      cast(g, p) { for (const t of enemies(g, p)) g.damage(t, g.spell(p, 6), { kind: 'spell', p }); for (const c of allies(g, p)) g.heal(c, 6); } }),
  C({ id: 'archangel', el: 'special', cls: 'radiant', tier: 4, cost: 9, name: '炽天使', icon: '😇', atk: 8, hp: 30,
      text: '召唤时：所有己方生物恢复全部生命，你的英雄恢复 10 点生命。',
      onSummon(g, c) { for (const a of allies(g, c.p)) g.heal(a, 999); g.healHero(c.p, 10); } }),
  S({ id: 'judgement', el: 'special', cls: 'radiant', tier: 4, cost: 8, name: '最终审判', icon: '⚖️', target: 'enemyCreature',
      text: '消灭一个敌方生物。',
      cast(g, p, t) { g.kill(t); } }),

  // ===================== 暗影术士 =====================
  C({ id: 'skeleton_thrall', el: 'special', cls: 'shadow', tier: 1, cost: 1, name: '骷髅仆从', icon: '💀', atk: 3, hp: 5,
      text: '死亡时：你获得 2 点暗影元素。',
      onDeath(g, c) { g.addMana(c.p, 'special', 2); } }),
  S({ id: 'soul_drain', el: 'special', cls: 'shadow', tier: 1, cost: 2, name: '灵魂汲取', icon: '🩸', target: 'enemyCreature',
      text: '对一个敌方生物造成 6 点伤害，你的英雄恢复等同于实际伤害的生命。',
      cast(g, p, t) { const dealt = g.damage(t, g.spell(p, 6), { kind: 'spell', p }); g.healHero(p, dealt); } }),
  C({ id: 'crypt_warden', el: 'special', cls: 'shadow', tier: 2, cost: 4, name: '墓穴守望者', icon: '⚰️', atk: 2, hp: 15,
      text: '每当任意其他生物死亡：你获得 1 点暗影元素，你的英雄恢复 2 点生命。',
      onAnyDeath(g, c, dead) { if (dead.uid !== c.uid) { g.addMana(c.p, 'special', 1); g.healHero(c.p, 2); } } }),
  S({ id: 'blight', el: 'special', cls: 'shadow', tier: 2, cost: 4, name: '腐化之雾', icon: '☠️', target: 'none',
      text: '对所有敌方生物造成 4 点伤害，并使其攻击力永久 -1。',
      cast(g, p) { for (const t of enemies(g, p)) { g.damage(t, g.spell(p, 4), { kind: 'spell', p }); t.atk = Math.max(0, t.atk - 1); } } }),
  C({ id: 'soul_eater', el: 'special', cls: 'shadow', tier: 3, cost: 6, name: '噬魂魔', icon: '👹', atk: 5, hp: 18,
      text: '每当一个敌方生物死亡：攻击力 +1，生命上限与生命 +2。',
      onAnyDeath(g, c, dead) { if (dead.p !== c.p) { c.atk += 1; c.maxHp += 2; c.hp += 2; } } }),
  S({ id: 'death_pact', el: 'special', cls: 'shadow', tier: 3, cost: 5, name: '死亡契约', icon: '📜', target: 'ownCreature',
      text: '消灭一个己方生物，对敌方英雄造成等同于其当前生命的伤害。',
      cast(g, p, t) { const v = t.hp; g.kill(t); g.damageHero(opp(p), g.spell(p, v), { kind: 'spell', p }); } }),
  C({ id: 'shadow_lord', el: 'special', cls: 'shadow', tier: 4, cost: 9, name: '暗影领主', icon: '🧛', atk: 7, hp: 28,
      text: '召唤时：对所有敌方生物造成 4 点伤害。你的回合开始时：从敌方英雄吸取 2 点生命。',
      onSummon(g, c) { for (const t of enemies(g, c.p)) g.damage(t, 4, { kind: 'effect', p: c.p }); },
      onTurnStart(g, c) { const d = g.damageHero(opp(c.p), 2, { kind: 'effect', p: c.p }); g.healHero(c.p, d); } }),
  S({ id: 'undead_legion', el: 'special', cls: 'shadow', tier: 4, cost: 8, name: '亡者军团', icon: '🦴', target: 'none',
      text: '在你所有空位召唤「骷髅兵」（3/6）。',
      cast(g, p) { for (let s = 0; s < 6; s++) if (!g.creatureAt(p, s)) g.summon(p, s, 'tok_skeleton'); } }),

  // ===================== 机巧师 =====================
  C({ id: 'clock_spider', el: 'special', cls: 'gear', tier: 1, cost: 1, name: '发条蜘蛛', icon: '🕷️', atk: 2, hp: 6,
      text: '死亡时：对正对面的敌方生物造成 6 点伤害。',
      onDeath(g, c) { const t = g.creatureAt(opp(c.p), c.slot); if (t) g.damage(t, 6, { kind: 'effect', p: c.p }); } }),
  S({ id: 'repair', el: 'special', cls: 'gear', tier: 1, cost: 2, name: '紧急维修', icon: '🔧', target: 'ownCreature',
      text: '一个己方生物生命上限 +6，并恢复全部生命。',
      cast(g, p, t) { t.maxHp += 6; g.heal(t, 999); } }),
  C({ id: 'cannon_turret', el: 'special', cls: 'gear', tier: 2, cost: 4, name: '加农炮塔', icon: '🏯', atk: 0, hp: 18,
      text: '不会攻击。你的回合开始时：对一个随机敌方生物造成 5 点伤害；若没有，则对敌方英雄造成 2 点伤害。',
      onTurnStart(g, c) { const es = enemies(g, c.p); if (es.length) g.damage(es[g.rand(es.length)], 5, { kind: 'effect', p: c.p }); else g.damageHero(opp(c.p), 2, { kind: 'effect', p: c.p }); } }),
  S({ id: 'overclock', el: 'special', cls: 'gear', tier: 2, cost: 3, name: '超频', icon: '🔋', target: 'none',
      text: '你的四种基础元素各 +2。',
      cast(g, p) { for (const e of BASIC_ELEMENTS) g.addMana(p, e, 2); } }),
  C({ id: 'iron_golem', el: 'special', cls: 'gear', tier: 3, cost: 6, name: '钢铁魔像', icon: '🤖', atk: 5, hp: 24, reduce: 2,
      text: '受到的所有伤害 -2。' }),
  S({ id: 'tesla_storm', el: 'special', cls: 'gear', tier: 3, cost: 6, name: '磁暴线圈', icon: '🧲', target: 'none',
      text: '对所有敌方生物与敌方英雄造成 5 点伤害。',
      cast(g, p) { const d = g.spell(p, 5); for (const t of enemies(g, p)) g.damage(t, d, { kind: 'spell', p }); g.damageHero(opp(p), d, { kind: 'spell', p }); } }),
  C({ id: 'war_mech', el: 'special', cls: 'gear', tier: 4, cost: 9, name: '战争机甲', icon: '🦾', atk: 7, hp: 30,
      text: '横扫：攻击时同时伤害正对面及其两侧的敌方生物；正对面为空时攻击英雄。',
      attack(g, c) {
        const o = opp(c.p), a = g.atkOf(c), src = { kind: 'creature', p: c.p, src: c };
        const front = g.creatureAt(o, c.slot);
        const side = [g.creatureAt(o, c.slot - 1), g.creatureAt(o, c.slot + 1)].filter(Boolean);
        if (front) g.damage(front, a, src); else g.damageHero(o, a, src);
        for (const s of side) g.damage(s, a, src);
      } }),
  S({ id: 'gear_surge', el: 'special', cls: 'gear', tier: 4, cost: 8, name: '齿轮洪流', icon: '⚙️', target: 'none',
      text: '所有己方生物攻击力永久 +2，生命上限 +4 并恢复 4 点生命。',
      cast(g, p) { for (const c of allies(g, p)) { c.atk += 2; c.maxHp += 4; g.heal(c, 4); } } }),

  // ===================== 兽王 =====================
  C({ id: 'wolf_cub', el: 'special', cls: 'wild', tier: 1, cost: 1, name: '狼崽', icon: '🐺', atk: 1, hp: 7,
      text: '成长：你的回合开始时攻击力 +1（最多成长 4 次）。',
      onTurnStart(g, c) { if ((c.grow || 0) < 4) { c.grow = (c.grow || 0) + 1; c.atk += 1; } } }),
  S({ id: 'call_wild', el: 'special', cls: 'wild', tier: 1, cost: 2, name: '野性呼唤', icon: '📯', target: 'ownEmptySlot',
      text: '在一个己方空位召唤「灰狼」（3/8）。',
      cast(g, p, slot) { g.summon(p, slot, 'tok_wolf'); } }),
  C({ id: 'alpha_wolf', el: 'special', cls: 'wild', tier: 2, cost: 4, name: '头狼', icon: '🐕', atk: 3, hp: 15, auraAdj: 2,
      text: '相邻的己方生物攻击力 +2。' }),
  S({ id: 'maul', el: 'special', cls: 'wild', tier: 2, cost: 3, name: '撕咬', icon: '🦷', target: 'ownCreature',
      text: '一个己方生物立即对正对面的敌方生物造成其攻击力 2 倍的伤害（正对面为空则不生效）。',
      cast(g, p, t) { const e = g.creatureAt(opp(p), t.slot); if (e) g.damage(e, g.atkOf(t) * 2, { kind: 'creature', p, src: t }); } }),
  C({ id: 'cave_bear', el: 'special', cls: 'wild', tier: 3, cost: 6, name: '洞穴巨熊', icon: '🐻', atk: 6, hp: 22, haste: true,
      text: '迅捷：召唤当回合即可攻击。' }),
  S({ id: 'stampede', el: 'special', cls: 'wild', tier: 3, cost: 6, name: '兽群奔袭', icon: '🐾', target: 'none',
      text: '所有己方生物立即额外攻击一次。',
      cast(g, p) { for (let s = 0; s < 6; s++) { const c = g.creatureAt(p, s); if (c && g.atkOf(c) > 0) g.doAttack(c); } } }),
  C({ id: 'beast_king', el: 'special', cls: 'wild', tier: 4, cost: 9, name: '万兽之王', icon: '🦁', atk: 8, hp: 30, auraAll: 2,
      text: '所有其他己方生物攻击力 +2。' }),
  S({ id: 'primal_roar', el: 'special', cls: 'wild', tier: 4, cost: 8, name: '原始咆哮', icon: '🗣️', target: 'none',
      text: '所有己方生物恢复全部生命，攻击力永久 +2。',
      cast(g, p) { for (const c of allies(g, p)) { g.heal(c, 999); c.atk += 2; } } }),

  // ===================== 衍生物（不进卡组） =====================
  C({ id: 'tok_skeleton', el: 'special', token: true, cost: 0, name: '骷髅兵', icon: '☠️', atk: 3, hp: 6, text: '衍生物。' }),
  C({ id: 'tok_wolf', el: 'special', token: true, cost: 0, name: '灰狼', icon: '🐺', atk: 3, hp: 8, text: '衍生物。' }),
];

export const CARDS = Object.fromEntries(cardList.map((c) => [c.id, c]));
export const CARD_LIST = cardList;

/** 为一名玩家随机生成 20 张牌：每个元素每个档位抽 1 张 */
export function buildHand(cls, rand) {
  const hand = {};
  for (const el of ELEMENTS) {
    const pool = cardList.filter((c) => !c.token && c.el === el && (el !== 'special' || c.cls === cls));
    const picked = [];
    for (let t = 1; t <= 4; t++) {
      const tier = pool.filter((c) => c.tier === t);
      picked.push(tier[rand(tier.length)].id);
    }
    picked.sort((a, b) => CARDS[a].cost - CARDS[b].cost);
    hand[el] = picked;
  }
  return hand;
}
