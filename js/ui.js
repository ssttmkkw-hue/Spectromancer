// 界面层：渲染、交互、动画与回合驱动
import { CARDS, CLASSES, ELEMENTS, ELEMENT_INFO } from './cards.js';
import { Game, RULES, elName } from './engine.js';
import { chooseAction } from './ai.js';

const $ = (q, el = document) => el.querySelector(q);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HUMAN = 0, FOE = 1;

const ui = {
  cls: 'radiant', diff: 'normal',
  g: null, tab: 'fire', sel: null, waiting: null, busy: false, pops: new Set(), speed: 1,
};

// ---------------- 工具 ----------------
function elColor(el, cls) { return el === 'special' ? CLASSES[cls].color : `var(--${el})`; }
function elIcon(el, cls) { return el === 'special' ? CLASSES[cls].icon : ELEMENT_INFO[el].icon; }
function ownerCls(id, fallback) { const d = CARDS[id]; return d.cls || fallback; }

function cardHTML(id, { off = false, sel = false, cls } = {}) {
  const d = CARDS[id];
  const c = ownerCls(id, cls);
  const bottom = d.type === 'creature'
    ? `<div class="st"><span class="a">⚔${d.atk}</span><span class="h">❤${d.hp}</span></div>`
    : `<div class="ty">法术</div>`;
  return `<button class="card ${off ? 'off' : ''} ${sel ? 'sel' : ''}" data-card="${id}" style="--ec:${elColor(d.el, c)}">
    <span class="cost">${d.cost}</span><span class="ico">${d.icon}</span><span class="nm">${d.name}</span>${bottom}</button>`;
}

// ---------------- 菜单 ----------------
function initMenu() {
  const list = $('#class-list');
  list.innerHTML = Object.entries(CLASSES).map(([k, c]) => `
    <button class="class-card ${k === ui.cls ? 'on' : ''}" data-cls="${k}" style="--c:${c.color}">
      <span class="ci">${c.icon}</span><b>${c.name}</b><small>职业元素：${c.el}<br>${c.desc}</small></button>`).join('');
  list.onclick = (e) => {
    const b = e.target.closest('[data-cls]'); if (!b) return;
    ui.cls = b.dataset.cls;
    list.querySelectorAll('.class-card').forEach((x) => x.classList.toggle('on', x === b));
  };
  $('#diff-list').onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    ui.diff = b.dataset.v;
    $('#diff-list').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  };
  $('#btn-start').onclick = startGame;
  $('#btn-rules').onclick = showRules;
}

function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id)); }

// ---------------- 对局 ----------------
function startGame() {
  const others = Object.keys(CLASSES).filter((k) => k !== ui.cls);
  const foeCls = others[Math.floor(Math.random() * others.length)];
  ui.g = Game.create({ classes: [ui.cls, foeCls], names: ['你', 'AI·' + CLASSES[foeCls].name], ai: [false, true] });
  ui.tab = 'fire'; ui.sel = null; ui.pops.clear();
  show('game');
  render();
  loop(ui.g);
}

async function loop(g) {
  await banner(g.s.first === HUMAN ? '🎲' : '🤖', g.s.first === HUMAN ? '你先手' : '对手先手', '后手方开局额外获得 2 点基础元素', 1100);
  while (ui.g === g && g.s.winner === null) {
    const p = g.cur;
    g.beginTurn();
    if (!(await step(g))) return;
    if (g.s.winner !== null) break;

    let act;
    if (p === HUMAN) {
      lock(false);
      act = await new Promise((r) => (ui.waiting = r));
      ui.waiting = null;
      lock(true);
      if (ui.g !== g) return;
    } else {
      lock(true);
      await sleep(450 / ui.speed);
      act = chooseAction(g, ui.diff);
      if (act) {
        const d = CARDS[act.card];
        await banner(d.icon, `对手：${d.name}`, d.text, 1100, elColor(d.el, g.player(FOE).cls));
      } else await banner('💤', '对手跳过出牌', '', 700);
    }
    if (ui.g !== g) return;
    if (act) { g.play(act.card, act.target); if (!(await step(g))) return; }
    for (let s = 0; s < RULES.SLOTS && g.s.winner === null; s++) {
      if (g.attackSlot(s) && !(await step(g))) return;
    }
    if (g.s.winner !== null) break;
    g.endTurn();
  }
  if (ui.g === g) { render(); setTimeout(showResult, 500); }
}

/** 播放该局事件；若期间已切换到其他对局则返回 false */
async function step(g) {
  const ev = g.takeEvents();
  if (ui.g !== g) return false;
  await play(ev);
  return ui.g === g;
}

function lock(on) {
  ui.busy = on;
  $('#game').classList.toggle('locked', on);
  if (on) ui.sel = null;
  render();
}

function choose(act) { if (ui.waiting) ui.waiting(act); }

// ---------------- 渲染 ----------------
function render() {
  const g = ui.g; if (!g) return;
  for (const p of [HUMAN, FOE]) renderHero(p);
  for (const p of [HUMAN, FOE]) renderBoard(p);
  renderHand();
  const hint = $('#turn-hint');
  const mine = g.cur === HUMAN && !ui.busy;
  hint.className = mine ? 'mine' : '';
  hint.textContent = g.s.winner !== null ? '对局结束' : mine ? (ui.sel ? '选择目标' : '你的回合 · 选一张牌或跳过') : g.cur === HUMAN ? '你的生物攻击中…' : '对手行动中…';
  ui.pops.clear();
}

function renderHero(p) {
  const g = ui.g, pl = g.player(p), c = CLASSES[pl.cls];
  const el = $(`.hero[data-hero="${p}"]`);
  el.classList.toggle('active', g.cur === p && g.s.winner === null);
  const av = $('.avatar', el); av.textContent = c.icon; av.style.setProperty('--c', c.color);
  $('.hero-name', el).innerHTML = `${pl.name}<small>${c.name}</small>`;
  const hp = Math.max(0, pl.hp);
  $('.hpbar i', el).style.width = `${(hp / pl.maxHp) * 100}%`;
  $('.hpbar span', el).textContent = `${hp} / ${pl.maxHp}`;
  const mr = $('.mana-row', el);
  if (mr) mr.innerHTML = ELEMENTS.map((e) => `<div class="mana" style="--ec:${elColor(e, pl.cls)}">${elIcon(e, pl.cls)}${pl.mana[e]}<em>+${g.growthOf(p, e)}</em></div>`).join('');
}

function validTargets() {
  const g = ui.g;
  if (!ui.sel) return [];
  return g.targetsFor(HUMAN, ui.sel);
}

function renderBoard(p) {
  const g = ui.g, board = $(`.board[data-p="${p}"]`);
  const ts = validTargets();
  const d = ui.sel ? CARDS[ui.sel] : null;
  const isTarget = (slot) => d && ts.some((t) => (t && typeof t === 'object' ? t.p === p && t.slot === slot : p === HUMAN && t === slot));
  let html = '';
  for (let s = 0; s < RULES.SLOTS; s++) {
    const c = g.creatureAt(p, s);
    html += `<div class="slot ${isTarget(s) ? 'target' : ''}" data-p="${p}" data-slot="${s}">`;
    if (c) {
      const cd = CARDS[c.id], a = g.atkOf(c);
      const sick = cd.atk > 0 && c.born >= g.s.turn && !cd.haste && g.cur === p;
      const tags = (c.frozen ? '❄' : '') + (sick ? '💤' : '') + (cd.atk === 0 ? '🛡' : '');
      html += `<div class="cr ${sick ? 'sick' : ''} ${ui.pops.has(c.uid) ? 'pop' : ''}" data-uid="${c.uid}" style="--ec:${elColor(cd.el, ownerCls(c.id, g.player(p).cls))}">
        <span class="tag">${tags}</span><span class="ico">${cd.icon}</span><span class="nm">${cd.name}</span>
        <div class="st"><span class="a ${a > cd.atk ? 'buff' : ''}">${cd.atk === 0 ? '' : a}</span><span class="h ${c.hp < c.maxHp ? 'hurt' : ''}">${c.hp}</span></div></div>`;
    }
    html += '</div>';
  }
  board.innerHTML = html;
}

function renderHand() {
  const g = ui.g, pl = g.player(HUMAN);
  const myTurn = g.cur === HUMAN && !ui.busy;
  $('#tabs').innerHTML = ELEMENTS.map((e) => {
    const any = pl.hand[e].some((id) => g.playable(HUMAN, id));
    return `<button class="tab ${e === ui.tab ? 'on' : ''} ${any ? 'has' : ''}" data-tab="${e}" style="--ec:${elColor(e, pl.cls)}">
      <div><span class="ti">${elIcon(e, pl.cls)}</span> <span class="tv">${pl.mana[e]}</span></div><div class="tg">${elName(e, pl.cls)} +${g.growthOf(HUMAN, e)}</div></button>`;
  }).join('');
  $('#cards').innerHTML = pl.hand[ui.tab].map((id) => cardHTML(id, { off: !g.playable(HUMAN, id), sel: ui.sel === id, cls: pl.cls })).join('');
  const det = $('#detail');
  if (ui.sel) {
    const d = CARDS[ui.sel];
    const need = d.type === 'creature' ? '点击己方空位召唤' : { none: '', ownEmptySlot: '点击己方空位', ownCreature: '点击一个己方生物', enemyCreature: '点击一个敌方生物', anyCreature: '点击任意生物' }[d.target];
    det.innerHTML = `<div class="txt"><b>${d.name}</b>（${elName(d.el, pl.cls)} ${d.cost}）${d.type === 'creature' ? ` ⚔${d.atk} ❤${d.hp}` : ''}<br>${d.text}${need ? ` <b style="color:var(--gold)">→ ${need}</b>` : ''}</div>
      ${d.type === 'spell' && d.target === 'none' ? '<button class="btn primary" id="btn-cast">施放</button>' : ''}`;
  } else {
    det.innerHTML = `<div class="txt">${myTurn ? '每回合可出 <b>1</b> 张牌，之后你的生物自左向右攻击。牌永不消耗，只看元素是否足够。' : '等待中…'}</div>`;
  }
  $('#btn-pass').disabled = !myTurn;
}

// ---------------- 交互 ----------------
function initGameInput() {
  $('#tabs').onclick = (e) => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    ui.tab = b.dataset.tab; render();
  };
  $('#cards').onclick = (e) => {
    const b = e.target.closest('[data-card]'); if (!b) return;
    const id = b.dataset.card, g = ui.g;
    if (ui.busy || g.cur !== HUMAN) { showCard(id); return; }
    if (ui.sel === id) { ui.sel = null; render(); return; }
    if (!g.canPay(HUMAN, id)) { ui.sel = null; render(); $('#detail').innerHTML = `<div class="txt"><b>${CARDS[id].name}</b>：元素不足（需要 ${CARDS[id].cost}）。<br>${CARDS[id].text}</div>`; return; }
    if (!g.targetsFor(HUMAN, id).length) { ui.sel = null; render(); $('#detail').innerHTML = `<div class="txt"><b>${CARDS[id].name}</b>：当前没有合法目标。<br>${CARDS[id].text}</div>`; return; }
    ui.sel = id; render();
  };
  $('#detail').onclick = (e) => {
    if (e.target.id === 'btn-cast' && ui.sel) { const id = ui.sel; ui.sel = null; choose({ card: id, target: null }); }
  };
  const boardClick = (e) => {
    const s = e.target.closest('.slot'); if (!s) return;
    const p = +s.dataset.p, slot = +s.dataset.slot, g = ui.g;
    if (ui.sel && !ui.busy) {
      const t = validTargets().find((t) => (t && typeof t === 'object' ? t.p === p && t.slot === slot : p === HUMAN && t === slot));
      if (t !== undefined) { const id = ui.sel; ui.sel = null; choose({ card: id, target: t }); return; }
    }
    const c = g.creatureAt(p, slot);
    if (c) showCreature(c);
  };
  document.querySelectorAll('.board').forEach((b) => (b.onclick = boardClick));
  $('#btn-pass').onclick = () => { ui.sel = null; choose(null); };
  $('#btn-log').onclick = showLog;
  $('#btn-foe').onclick = showFoe;
  $('.hero.enemy .avatar').onclick = showFoe;
  $('#btn-menu').onclick = showMenuSheet;
  $('#sheet-close').onclick = closeSheet;
  $('#sheet').onclick = (e) => { if (e.target.id === 'sheet') closeSheet(); };
}

// ---------------- 动画 ----------------
function slotEl(p, slot) { return $(`.slot[data-p="${p}"][data-slot="${slot}"]`); }
function heroEl(p) { return $(`.hero[data-hero="${p}"]`); }

function floater(target, text, cls) {
  if (!target) return;
  const r = target.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = `float ${cls}`;
  f.textContent = text;
  f.style.left = `${r.left + r.width / 2 + (Math.random() * 14 - 7)}px`;
  f.style.top = `${r.top + r.height / 2}px`;
  $('#fx').appendChild(f);
  setTimeout(() => f.remove(), 950);
}

async function play(events) {
  let pending = false;
  for (const e of events) {
    switch (e.t) {
      case 'attack': {
        const cr = $('.cr', slotEl(e.p, e.slot));
        if (cr) { cr.classList.add('lunge'); await sleep(170 / ui.speed); cr.classList.remove('lunge'); }
        break;
      }
      case 'dmg': {
        const el = slotEl(e.p, e.slot);
        floater(el, e.n === '☠' ? '☠' : e.n === 0 ? '0' : `-${e.n}`, 'dmg');
        $('.cr', el)?.classList.add('shake');
        pending = true; break;
      }
      case 'heal': floater(slotEl(e.p, e.slot), `+${e.n}`, 'heal'); pending = true; break;
      case 'freeze': floater(slotEl(e.p, e.slot), '❄', 'ice'); pending = true; break;
      case 'frozenSkip': floater(slotEl(e.p, e.slot), '冻结', 'ice'); pending = true; break;
      case 'hero': {
        const el = heroEl(e.p);
        floater($('.hpbar', el), e.n < 0 ? `${e.n}` : `+${e.n}`, e.n < 0 ? 'dmg' : 'heal');
        if (e.n < 0) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
        pending = true; break;
      }
      case 'mana': if (e.n > 0) floater($(`.hero[data-hero="${e.p}"] .avatar`) || heroEl(e.p), `+${e.n} ${elName(e.el, ui.g.player(e.p).cls)}`, 'mana'); break;
      case 'death': $('.cr', slotEl(e.p, e.slot))?.classList.add('dying'); pending = true; break;
      case 'summon': ui.pops.add(e.uid); break;
    }
  }
  if (pending) await sleep(380 / ui.speed);
  render();
  if (events.length) await sleep(120 / ui.speed);
}

let bannerTimer = 0;
async function banner(icon, title, sub = '', ms = 1000, color) {
  const b = $('#banner');
  b.innerHTML = `<div class="bi">${icon}</div><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
  b.style.setProperty('--ec', color || 'var(--gold)');
  b.classList.add('show');
  clearTimeout(bannerTimer);
  await sleep(ms / ui.speed);
  b.classList.remove('show');
  await sleep(150);
}

// ---------------- 弹层 ----------------
function openSheet(title, html) {
  $('#sheet-title').textContent = title;
  $('#sheet-body').innerHTML = html;
  $('#sheet').classList.add('open');
}
function closeSheet() { $('#sheet').classList.remove('open'); }

function showCard(id) {
  const d = CARDS[id], g = ui.g;
  openSheet(d.name, `<div class="big-card">${cardHTML(id, { cls: g ? g.player(HUMAN).cls : ui.cls })}<div>
    <p><b>${d.type === 'creature' ? '生物' : '法术'}</b> · ${elName(d.el, d.cls || (g ? g.player(HUMAN).cls : ui.cls))}元素 ${d.cost}</p>
    ${d.type === 'creature' ? `<p>攻击 ${d.atk} · 生命 ${d.hp}</p>` : ''}<p>${d.text}</p></div></div>`);
}

function showCreature(c) {
  const g = ui.g, d = CARDS[c.id];
  const st = [];
  if (c.frozen) st.push('❄ 冻结（跳过下一次攻击）');
  if (d.atk > 0 && c.born >= g.s.turn && !d.haste) st.push('💤 刚召唤，下回合起攻击');
  openSheet(`${d.name}（${c.p === HUMAN ? '己方' : '敌方'}）`, `<div class="big-card">${cardHTML(c.id, { cls: g.player(c.p).cls })}<div>
    <p>当前：攻击 <b>${g.atkOf(c)}</b> · 生命 <b>${c.hp}</b> / ${c.maxHp}</p>
    <p>${d.text}</p>${st.map((s) => `<p style="color:var(--muted)">${s}</p>`).join('')}</div></div>`);
}

function showFoe() {
  const g = ui.g, pl = g.player(FOE);
  openSheet(`${pl.name} 的 20 张牌`, ELEMENTS.map((e) => `<div class="foe-el"><div class="eh">${elIcon(e, pl.cls)} ${elName(e, pl.cls)}：${pl.mana[e]}（+${g.growthOf(FOE, e)}/回合）</div>
    <div class="cards">${pl.hand[e].map((id) => cardHTML(id, { off: !g.canPay(FOE, id), cls: pl.cls })).join('')}</div></div>`).join(''));
  $('#sheet-body').onclick = (e) => { const b = e.target.closest('[data-card]'); if (b) showCard(b.dataset.card); };
}

function showLog() {
  const lines = ui.g.s.log.slice().reverse();
  openSheet('战报', lines.map((l) => `<div class="log-line ${l.startsWith('——') ? 'turn' : ''}">${l}</div>`).join(''));
}

function showMenuSheet() {
  openSheet('菜单', `
    <button class="btn" style="width:100%;margin-bottom:8px" id="m-speed">动画速度：${ui.speed === 1 ? '正常' : '快速'}</button>
    <button class="btn" style="width:100%;margin-bottom:8px" id="m-rules">规则说明</button>
    <button class="btn" style="width:100%;margin-bottom:8px" id="m-restart">重新开局</button>
    <button class="btn" style="width:100%" id="m-quit">返回主菜单</button>`);
  $('#m-speed').onclick = () => { ui.speed = ui.speed === 1 ? 2 : 1; showMenuSheet(); };
  $('#m-rules').onclick = showRules;
  $('#m-restart').onclick = () => { closeSheet(); ui.g = null; if (ui.waiting) ui.waiting(null); startGame(); };
  $('#m-quit').onclick = () => { closeSheet(); ui.g = null; if (ui.waiting) ui.waiting(null); show('menu'); };
}

function showRules() {
  openSheet('规则说明', `
    <h3>目标</h3>把对手英雄的 ${RULES.HERO_HP} 点生命打到 0。
    <h3>元素与牌</h3><ul>
      <li>每位法师掌握 5 种元素：火、水、风、土 + 一种职业元素。</li>
      <li>开局每种元素各 4 张牌，共 20 张，<b>全部明牌、永不消耗</b>。只要该元素点数 ≥ 费用即可使用。</li>
      <li>开局四种基础元素随机分配共 ${RULES.BASIC_START_TOTAL} 点，职业元素 ${RULES.SPECIAL_START} 点；后手额外 +${RULES.SECOND_BONUS}。</li>
      <li>每回合开始，<b>每种元素各 +1</b>（部分生物可额外增长）。点数可以一直攒着。</li></ul>
    <h3>回合流程</h3><ul>
      <li>① 元素增长 → 己方「回合开始时」效果结算。</li>
      <li>② 出 <b>最多 1 张</b>牌（召唤生物或施放法术），也可以跳过。</li>
      <li>③ 己方生物 <b>从左到右</b> 依次攻击：攻击正对面的敌方生物；正对面为空则直接攻击敌方英雄。</li></ul>
    <h3>战场</h3><ul>
      <li>每方 ${RULES.SLOTS} 个格子，生物只能召唤到己方空格。</li>
      <li>刚召唤的生物要到你的下个回合才能攻击（💤），带「迅捷」的除外。</li>
      <li>攻击力为 0 的生物（🛡）不会攻击，用来阻挡。</li>
      <li>❄ 冻结：跳过下一次攻击。</li></ul>
    <h3>操作</h3><ul>
      <li>点元素标签切换牌页，点牌选中，再点高亮格子出牌；无目标法术点「施放」。</li>
      <li>点场上生物查看详情；点「对手牌」查看对方全部 20 张牌和元素。</li></ul>`);
}

function showResult() {
  const g = ui.g, w = g.s.winner;
  const win = w === HUMAN, draw = w === -1;
  openSheet('对局结束', `<div class="result"><div class="r-ico">${draw ? '🤝' : win ? '🏆' : '💀'}</div>
    <h2>${draw ? '平局' : win ? '胜利！' : '败北'}</h2>
    <p style="color:var(--muted)">共 ${Math.ceil(g.s.turn / 2)} 轮 · 你 ${Math.max(0, g.player(HUMAN).hp)} HP / 对手 ${Math.max(0, g.player(FOE).hp)} HP</p>
    <button class="btn primary" id="r-again">再来一局</button><button class="btn" id="r-menu">返回主菜单</button></div>`);
  $('#r-again').onclick = () => { closeSheet(); startGame(); };
  $('#r-menu').onclick = () => { closeSheet(); show('menu'); };
}

initMenu();
initGameInput();
