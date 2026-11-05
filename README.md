# 元素决斗 · Elemental Duel

致敬 Richard Garfield《魔幻卡牌》（Spectromancer）玩法的手机竖屏网页卡牌对战：
五种元素、25 张明牌（每元素 5 张）永不消耗、每回合元素自动增长、6 列战场自动对攻。卡牌与美术为原创。

## 运行

```bash
npm run serve        # 或任意静态服务器，打开 http://localhost:8080
```

## 测试 / 平衡模拟

```bash
npm test             # 200 局 AI 自对战，检查引擎稳定性并输出胜率
node tests/sim.mjs 100 hard
npm run cards        # 重新生成 docs/03-卡牌数据表.md
```

## 文档

- [01 原作玩法研究](docs/01-玩法研究.md)
- [02 开发文档](docs/02-开发文档.md)
- [03 卡牌数据表](docs/03-卡牌数据表.md)
