// 由 js/cards.js 自动生成卡牌数据表：node tools/gen-card-doc.mjs > docs/03-卡牌数据表.md
import { CARD_LIST, CLASSES, ELEMENT_INFO } from '../js/cards.js';

const out = ['# 卡牌数据表（自动生成）', '', '> 由 `npm run cards` 从 `js/cards.js` 生成，请勿手改。每档 2 张，开局每档随机抽 1 张。', ''];
const groups = [
  ...Object.entries(ELEMENT_INFO).map(([k, v]) => [`${v.icon} ${v.name}元素`, (c) => c.el === k]),
  ...Object.entries(CLASSES).map(([k, v]) => [`${v.icon} ${v.name}（${v.el}元素）`, (c) => c.cls === k]),
  ['衍生物', (c) => c.token],
];
for (const [title, f] of groups) {
  out.push(`## ${title}`, '', '| 档 | 费 | 名称 | 类型 | 攻/血 | 效果 |', '|---|---|---|---|---|---|');
  for (const c of CARD_LIST.filter(f)) {
    out.push(`| ${c.tier ?? '-'} | ${c.cost} | ${c.icon} ${c.name} | ${c.type === 'creature' ? '生物' : '法术'} | ${c.type === 'creature' ? `${c.atk}/${c.hp}` : '-'} | ${c.text} |`);
  }
  out.push('');
}
console.log(out.join('\n'));
