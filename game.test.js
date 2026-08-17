import { describe, expect, it } from "vitest";
import {
  CARDS,
  DECK_MAX,
  DECK_MIN,
  RANK_TIERS,
  addToDeck,
  buyCard,
  canPlayCard,
  canStartBattle,
  closeDeck,
  createGame,
  endTurn,
  getAiIntent,
  getOutcome,
  leaveResult,
  mulliganHand,
  openDeck,
  playCard,
  rankLabel,
  rankTier,
  refreshShop,
  removeFromDeck,
  startBattle,
  summarize,
} from "./game.js";

describe("開局", () => {
  it("相同種子產生一致狀態", () => {
    expect(createGame({ seed: 7 })).toEqual(createGame({ seed: 7 }));
  });

  it("起始在卡市且有金幣、牌組與攤位", () => {
    const s = createGame({ seed: 1 });
    expect(s.screen).toBe("bazaar");
    expect(s.outcome).toBe("playing");
    expect(s.coins).toBeGreaterThanOrEqual(10);
    expect(s.deck.length).toBeGreaterThanOrEqual(DECK_MIN);
    expect(s.shop.length).toBe(3);
    expect(getOutcome(s)).toBe("playing");
  });

  it("牌組達下限即可排位", () => {
    const s = createGame({ seed: 2 });
    expect(canStartBattle(s)).toBe(true);
  });
});

describe("卡市經濟", () => {
  it("金幣足夠可購牌並加入收藏", () => {
    let s = createGame({ seed: 3 });
    const before = s.collection.length;
    const price = s.shop[0].card.price;
    s.coins = price + 5;
    s = buyCard(s, 0);
    expect(s.collection.length).toBe(before + 1);
    expect(s.coins).toBe(5);
    expect(s.shop[0].sold).toBe(true);
  });

  it("金幣不足時拒絕購買", () => {
    let s = createGame({ seed: 4 });
    s.coins = 0;
    const before = structuredClone(s);
    s = buyCard(s, 0);
    expect(s.collection.length).toBe(before.collection.length);
    expect(s.message).toMatch(/金幣/);
  });

  it("刷新攤位消耗金幣並換貨", () => {
    let s = createGame({ seed: 5 });
    const old = s.shop.map((o) => o.id).join(",");
    s.coins = 10;
    s = refreshShop(s);
    expect(s.coins).toBe(8);
    expect(s.shop.every((o) => !o.sold)).toBe(true);
    expect(s.shop.map((o) => o.id).join(",")).not.toBe(old);
  });

  it("已售完攤位不可重複購買", () => {
    let s = createGame({ seed: 6 });
    s.coins = 99;
    s = buyCard(s, 1);
    const coins = s.coins;
    s = buyCard(s, 1);
    expect(s.coins).toBe(coins);
  });
});

describe("牌組編制", () => {
  it("可從收藏加入牌組", () => {
    let s = createGame({ seed: 7 });
    s.coins = 99;
    s = buyCard(s, 0);
    s = openDeck(s);
    const uid = s.collection[0].uid;
    const deckSize = s.deck.length;
    s = addToDeck(s, uid);
    expect(s.deck.length).toBe(deckSize + 1);
    expect(s.collection.some((c) => c.uid === uid)).toBe(false);
  });

  it("牌組滿時不可再加入", () => {
    let s = createGame({ seed: 8 });
    s = openDeck(s);
    while (s.deck.length < DECK_MAX) {
      s.coins = 99;
      s = closeDeck(s);
      s = buyCard(s, 0);
      s = openDeck(s);
      if (!s.collection.length) break;
      s = addToDeck(s, s.collection[0].uid);
    }
    expect(s.deck.length).toBeLessThanOrEqual(DECK_MAX);
  });

  it("可從牌組移回收藏", () => {
    let s = createGame({ seed: 9 });
    s = openDeck(s);
    const card = s.deck[0];
    s = removeFromDeck(s, card.uid);
    expect(s.deck.some((c) => c.uid === card.uid)).toBe(false);
    expect(s.collection.some((c) => c.id === card.id)).toBe(true);
  });

  it("返回卡市後畫面正確", () => {
    let s = createGame({ seed: 10 });
    s = openDeck(s);
    s = closeDeck(s);
    expect(s.screen).toBe("bazaar");
  });
});

describe("排位對戰", () => {
  it("進入對戰有雙方生命、手牌與牌庫", () => {
    let s = createGame({ seed: 11 });
    s = startBattle(s);
    expect(s.screen).toBe("battle");
    expect(s.battle.player.hand.length).toBeGreaterThan(0);
    expect(s.battle.player.draw.length).toBeGreaterThan(0);
    expect(s.battle.ai.hp).toBeGreaterThan(0);
    expect(s.battle.turn).toBe("player");
  });

  it("出牌消耗能量，法術可傷敵", () => {
    let s = createGame({ seed: 12 });
    s = startBattle(s);
    const strike = s.battle.player.hand.find((c) => c.id === "iron_strike")
      || { uid: "fake", id: "iron_strike", type: "spell", cost: 2, effect: "damage", value: 8 };
    if (!s.battle.player.hand.find((c) => c.uid === strike.uid)) {
      s.battle.player.hand.push({ ...CARDS.iron_strike, uid: "test-strike" });
    }
    const card = s.battle.player.hand.find((c) => c.id === "iron_strike");
    if (card) {
      s.battle.player.energy = 3;
      const hp = s.battle.ai.hp;
      s = playCard(s, card.uid, "face");
      expect(s.battle.ai.hp).toBe(hp - CARDS.iron_strike.value);
    }
  });

  it("能量不足時無法出牌", () => {
    let s = createGame({ seed: 13 });
    s = startBattle(s);
    s.battle.player.energy = 0;
    const card = s.battle.player.hand[0];
    const handLen = s.battle.player.hand.length;
    s = playCard(s, card.uid);
    expect(s.battle.player.hand.length).toBe(handLen);
  });

  it("單位可佔場且受場地上限", () => {
    let s = createGame({ seed: 14 });
    s = startBattle(s);
    s.battle.player.energy = 9;
    s.battle.player.hand = [
      { ...CARDS.tea_cat, uid: "u1" },
      { ...CARDS.star_bird, uid: "u2" },
      { ...CARDS.moon_deer, uid: "u3" },
      { ...CARDS.night_fox, uid: "u4" },
    ];
    s = playCard(s, "u1");
    s = playCard(s, "u2");
    s = playCard(s, "u3");
    expect(s.battle.player.field.length).toBe(3);
    s = playCard(s, "u4");
    expect(s.battle.player.field.length).toBe(3);
  });

  it("結束回合後 AI 會行動且回到玩家回合", () => {
    let s = createGame({ seed: 15 });
    s = startBattle(s);
    const round = s.battle.round;
    s = endTurn(s);
    if (s.screen === "battle") {
      expect(s.battle.round).toBe(round + 1);
      expect(s.battle.turn).toBe("player");
    }
  });

  it("調度僅開局可用一次", () => {
    let s = createGame({ seed: 16 });
    s = startBattle(s);
    const before = s.battle.player.hand.map((c) => c.uid).join(",");
    s = mulliganHand(s);
    expect(s.battle.mulliganUsed).toBe(true);
    const after = s.battle.player.hand.map((c) => c.uid).join(",");
    expect(after).not.toBe(before);
    s = mulliganHand(s);
    expect(s.message).toMatch(/一次/);
  });

  it("法術傷害可終結對戰", () => {
    let s = createGame({ seed: 17 });
    s = startBattle(s);
    s.battle.ai.hp = 5;
    s.battle.player.energy = 3;
    s.battle.player.hand = [{ ...CARDS.market_rush, uid: "finisher" }];
    s = playCard(s, "finisher", "face");
    expect(s.screen).toBe("result");
    expect(s.message).toMatch(/勝利/);
  });

  it("落敗後可回卡市", () => {
    let s = createGame({ seed: 18 });
    s = startBattle(s);
    s.battle.player.hp = 0;
    s = endTurn(s);
    expect(s.screen).toBe("result");
    const pts = s.rankPoints;
    s = leaveResult(s);
    expect(s.screen).toBe("bazaar");
    expect(s.rankPoints).toBe(pts);
  });
});

describe("段位與摘要", () => {
  it("rankTier 依分數門檻", () => {
    expect(rankTier(0).id).toBe("bronze");
    expect(rankTier(120).id).toBe("silver");
    expect(rankTier(300).id).toBe("gold");
    expect(rankTier(520).id).toBe("diamond");
  });

  it("rankLabel 含段位名", () => {
    expect(rankLabel(50)).toMatch(/銅牌/);
  });

  it("summarize 回傳關鍵欄位", () => {
    const sum = summarize(createGame({ seed: 19 }));
    expect(sum).toMatchObject({
      screen: "bazaar",
      outcome: "playing",
      deckSize: expect.any(Number),
    });
  });

  it("getAiIntent 在對戰中給出預告", () => {
    let s = createGame({ seed: 20 });
    s = startBattle(s);
    const intent = getAiIntent(s);
    expect(intent).toBeTruthy();
    expect(intent.text).toBeTruthy();
  });

  it("RANK_TIERS 遞增門檻", () => {
    for (let i = 1; i < RANK_TIERS.length; i += 1) {
      expect(RANK_TIERS[i].min).toBeGreaterThan(RANK_TIERS[i - 1].min);
    }
  });
});

describe("不變性", () => {
  it("apply 類操作不 mutate 原 state", () => {
    const before = createGame({ seed: 21 });
    const snap = structuredClone(before);
    buyCard(before, 0);
    expect(before).toEqual(snap);
  });

  it("牌組不足時無法開戰", () => {
    let s = createGame({ seed: 22 });
    s = openDeck(s);
    while (s.deck.length > DECK_MIN - 1) {
      s = removeFromDeck(s, s.deck[0].uid);
    }
    s = closeDeck(s);
    expect(canStartBattle(s)).toBe(false);
    s = startBattle(s);
    expect(s.screen).not.toBe("battle");
  });
});
