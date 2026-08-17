// 卡市爭鋒 — 純邏輯（無 DOM）

const clone = (v) => structuredClone(v);

function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let uidSeq = 1;
function nextUid(prefix = "c") {
  uidSeq += 1;
  return `${prefix}-${uidSeq}`;
}

export const CARDS = {
  tea_cat: {
    id: "tea_cat",
    name: "茶貓",
    type: "unit",
    cost: 1,
    atk: 1,
    hp: 2,
    faction: "tea",
    rarity: "common",
    price: 3,
    desc: "1/2 單位",
  },
  iron_turtle: {
    id: "iron_turtle",
    name: "鐵龜",
    type: "unit",
    cost: 2,
    atk: 1,
    hp: 5,
    taunt: true,
    faction: "iron",
    rarity: "common",
    price: 4,
    desc: "1/5 嘲諷",
  },
  star_bird: {
    id: "star_bird",
    name: "星鳥",
    type: "unit",
    cost: 2,
    atk: 3,
    hp: 2,
    faction: "star",
    rarity: "common",
    price: 5,
    desc: "3/2 單位",
  },
  moon_deer: {
    id: "moon_deer",
    name: "月鹿",
    type: "unit",
    cost: 3,
    atk: 2,
    hp: 4,
    faction: "star",
    rarity: "uncommon",
    price: 7,
    desc: "2/4 單位",
  },
  frost_frog: {
    id: "frost_frog",
    name: "霜蛙",
    type: "unit",
    cost: 2,
    atk: 2,
    hp: 3,
    faction: "tea",
    rarity: "uncommon",
    price: 6,
    desc: "2/3 單位",
  },
  flame_lion: {
    id: "flame_lion",
    name: "炎獅",
    type: "unit",
    cost: 4,
    atk: 5,
    hp: 4,
    faction: "iron",
    rarity: "rare",
    price: 10,
    desc: "5/4 單位",
  },
  night_fox: {
    id: "night_fox",
    name: "夜狐",
    type: "unit",
    cost: 3,
    atk: 4,
    hp: 3,
    faction: "night",
    rarity: "uncommon",
    price: 8,
    desc: "4/3 單位",
  },
  bazaar_hawk: {
    id: "bazaar_hawk",
    name: "市鷹",
    type: "unit",
    cost: 1,
    atk: 2,
    hp: 1,
    rush: true,
    faction: "night",
    rarity: "common",
    price: 4,
    desc: "2/1 衝鋒",
  },
  bargain: {
    id: "bargain",
    name: "討價",
    type: "spell",
    cost: 0,
    effect: "draw",
    value: 1,
    faction: "night",
    rarity: "common",
    price: 2,
    desc: "抽 1 張",
  },
  tea_heal: {
    id: "tea_heal",
    name: "奉茶",
    type: "spell",
    cost: 1,
    effect: "heal",
    value: 5,
    faction: "tea",
    rarity: "common",
    price: 3,
    desc: "回復 5 生命",
  },
  iron_strike: {
    id: "iron_strike",
    name: "鐵價斬",
    type: "spell",
    cost: 2,
    effect: "damage",
    value: 8,
    faction: "iron",
    rarity: "uncommon",
    price: 5,
    desc: "造成 8 傷害",
  },
  star_glimpse: {
    id: "star_glimpse",
    name: "星芒",
    type: "spell",
    cost: 1,
    effect: "damageDraw",
    value: 4,
    draw: 1,
    faction: "star",
    rarity: "common",
    price: 4,
    desc: "4 傷並抽 1",
  },
  market_rush: {
    id: "market_rush",
    name: "搶攤",
    type: "spell",
    cost: 3,
    effect: "damage",
    value: 12,
    faction: "night",
    rarity: "rare",
    price: 8,
    desc: "造成 12 傷害",
  },
  shield_seal: {
    id: "shield_seal",
    name: "封蠟",
    type: "spell",
    cost: 1,
    effect: "block",
    value: 6,
    faction: "iron",
    rarity: "common",
    price: 3,
    desc: "獲得 6 護甲",
  },
  coin_toss: {
    id: "coin_toss",
    name: "擲幣",
    type: "spell",
    cost: 0,
    effect: "coins",
    value: 2,
    faction: "night",
    rarity: "common",
    price: 2,
    desc: "戰後 +2 金幣",
  },
};

export const STARTER_IDS = [
  "tea_cat",
  "tea_cat",
  "iron_turtle",
  "star_bird",
  "bargain",
  "shield_seal",
  "tea_heal",
  "bazaar_hawk",
];
export const SHOP_POOL = Object.keys(CARDS).filter((id) => CARDS[id].price != null);
export const DECK_MIN = 8;
export const DECK_MAX = 20;
export const FIELD_MAX = 3;
export const HAND_MAX = 7;

export const RANK_TIERS = [
  { id: "bronze", name: "銅牌", min: 0 },
  { id: "silver", name: "銀牌", min: 100 },
  { id: "gold", name: "金牌", min: 250 },
  { id: "diamond", name: "鑽牌", min: 500 },
];

function makeCard(id) {
  const base = CARDS[id];
  if (!base) throw new Error(`unknown card ${id}`);
  return { ...base, uid: nextUid(id) };
}

function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRand(state) {
  const rand = mulberry32(state.randState);
  state.randState = (state.randState + 0x9e3779b1) >>> 0;
  return rand;
}

export function rankTier(points) {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (points >= t.min) tier = t;
  }
  return tier;
}

export function rankLabel(points) {
  return `${rankTier(points).name} · ${points} 分`;
}

function rollShop(state) {
  const rand = getRand(state);
  const picks = shuffle(SHOP_POOL, rand).slice(0, 3);
  state.shop = picks.map((id) => ({ id, card: CARDS[id], sold: false }));
}

function aiDeckForRank(points, rand) {
  const tier = rankTier(points).id;
  const base = ["tea_cat", "tea_cat", "iron_turtle", "star_bird", "bargain", "shield_seal"];
  const mid = ["moon_deer", "frost_frog", "night_fox", "iron_strike", "star_glimpse"];
  const high = ["flame_lion", "market_rush", "bazaar_hawk", "bazaar_hawk"];
  let ids = [...base];
  if (tier !== "bronze") ids = ids.concat(mid.slice(0, 4));
  if (tier === "gold" || tier === "diamond") ids = ids.concat(high.slice(0, 3));
  if (tier === "diamond") ids = ids.concat(["flame_lion", "market_rush"]);
  while (ids.length < DECK_MIN) ids.push(base[Math.floor(rand() * base.length)]);
  return shuffle(ids, rand).slice(0, Math.min(DECK_MAX, ids.length)).map((id) => makeCard(id));
}

export function createGame({ seed = 1 } = {}) {
  uidSeq = seed * 1000;
  const rand = mulberry32(seed);
  const collection = [];
  const deck = STARTER_IDS.map((id) => makeCard(id));
  const state = {
    seed,
    randState: seed,
    screen: "bazaar",
    outcome: "playing",
    message: "在卡市挑選新牌，調整牌組後挑戰排位。",
    coins: 12,
    rankPoints: 0,
    score: 0,
    battlesWon: 0,
    collection,
    deck,
    shop: [],
    shopRefreshCost: 2,
    battle: null,
  };
  rollShop(state);
  return state;
}

export function getOutcome(state) {
  return state.outcome;
}

export function summarize(state) {
  return {
    screen: state.screen,
    outcome: state.outcome,
    coins: state.coins,
    rankPoints: state.rankPoints,
    deckSize: state.deck.length,
    collectionSize: state.collection.length,
    message: state.message,
  };
}

export function canStartBattle(state) {
  return state.screen !== "battle" && state.outcome === "playing" && state.deck.length >= DECK_MIN;
}

export function buyCard(state, offerIndex) {
  const s = clone(state);
  if (s.screen !== "bazaar" || s.outcome !== "playing") return s;
  const offer = s.shop[offerIndex];
  if (!offer || offer.sold) {
    s.message = "這攤已售完。";
    return s;
  }
  if (s.coins < offer.card.price) {
    s.message = "金幣不足。";
    return s;
  }
  s.coins -= offer.card.price;
  s.collection.push(makeCard(offer.id));
  offer.sold = true;
  s.message = `購入 ${offer.card.name}。`;
  return s;
}

export function refreshShop(state) {
  const s = clone(state);
  if (s.screen !== "bazaar" || s.outcome !== "playing") return s;
  if (s.coins < s.shopRefreshCost) {
    s.message = "刷新要 2 金幣。";
    return s;
  }
  s.coins -= s.shopRefreshCost;
  rollShop(s);
  s.message = "攤位已換新貨。";
  return s;
}

export function openDeck(state) {
  const s = clone(state);
  if (s.outcome !== "playing" || s.screen === "battle") return s;
  s.screen = "deck";
  s.message = `牌組 ${s.deck.length}/${DECK_MAX} 張，點收藏加入、點牌組移除。`;
  return s;
}

export function closeDeck(state) {
  const s = clone(state);
  if (s.screen !== "deck") return s;
  s.screen = "bazaar";
  s.message = s.deck.length < DECK_MIN ? `牌組至少 ${DECK_MIN} 張才能排位。` : "準備好了就開打。";
  return s;
}

export function addToDeck(state, uid) {
  const s = clone(state);
  if (s.screen !== "deck" || s.deck.length >= DECK_MAX) return s;
  const idx = s.collection.findIndex((c) => c.uid === uid);
  if (idx < 0) return s;
  const card = s.collection[idx];
  s.collection.splice(idx, 1);
  s.deck.push(makeCard(card.id));
  s.message = `${card.name} 加入牌組。`;
  return s;
}

export function removeFromDeck(state, uid) {
  const s = clone(state);
  if (s.screen !== "deck") return s;
  const idx = s.deck.findIndex((c) => c.uid === uid);
  if (idx < 0) return s;
  const card = s.deck[idx];
  s.deck.splice(idx, 1);
  s.collection.push(makeCard(card.id));
  s.message = `${card.name} 移回收藏。`;
  return s;
}

function drawCards(combat, side, count, messageHolder) {
  const pile = combat[side].draw;
  const hand = combat[side].hand;
  for (let i = 0; i < count; i += 1) {
    if (hand.length >= HAND_MAX) break;
    if (!pile.length) {
      if (!combat[side].discard.length) break;
      combat[side].draw = shuffle(combat[side].discard, () => 0.5);
      combat[side].discard = [];
    }
    if (!pile.length) break;
    hand.push(pile.pop());
  }
  if (messageHolder && count > 0) messageHolder.push(`抽 ${count} 張`);
}

function startPlayerTurn(combat) {
  combat.player.energy = combat.player.maxEnergy;
  combat.player.block = 0;
  drawCards(combat, "player", 1);
}

function livingUnits(field) {
  return field.filter((u) => u.hp > 0);
}

function pickAttackTarget(defenderField) {
  const defenders = livingUnits(defenderField);
  if (!defenders.length) return null;
  const taunts = defenders.filter((u) => u.taunt);
  const pool = taunts.length ? taunts : defenders;
  return pool.reduce((best, u) => (u.hp < best.hp ? u : best), pool[0]);
}

function applyDamageToUnit(unit, amount) {
  unit.hp = Math.max(0, unit.hp - amount);
}

function applyDamageToHero(combat, side, amount) {
  const hero = combat[side];
  const blocked = Math.min(hero.block, amount);
  hero.block -= blocked;
  hero.hp = Math.max(0, hero.hp - (amount - blocked));
}

function strikeField(combat, attackerSide, defenderSide) {
  for (const unit of livingUnits(combat[attackerSide].field)) {
    if (unit.exhausted) continue;
    const target = pickAttackTarget(combat[defenderSide].field);
    if (target) applyDamageToUnit(target, unit.atk);
    else applyDamageToHero(combat, defenderSide, unit.atk);
    unit.exhausted = true;
  }
  combat[attackerSide].field = livingUnits(combat[attackerSide].field);
  combat[defenderSide].field = livingUnits(combat[defenderSide].field);
}

function resetExhaustion(combat) {
  for (const u of [...combat.player.field, ...combat.ai.field]) u.exhausted = false;
}

function playUnit(combat, card, side) {
  const actor = combat[side];
  if (actor.field.length >= FIELD_MAX) return false;
  actor.field.push({
    uid: card.uid,
    name: card.name,
    atk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    taunt: !!card.taunt,
    rush: !!card.rush,
    exhausted: !card.rush,
  });
  return true;
}

function resolveSpell(combat, card, side, targetSide = "ai") {
  const actor = combat[side];
  const foeSide = targetSide === "player" ? "player" : "ai";
  switch (card.effect) {
    case "draw":
      drawCards(combat, side, card.value);
      break;
    case "heal":
      actor.hp = Math.min(actor.maxHp, actor.hp + card.value);
      break;
    case "damage":
      applyDamageToHero(combat, foeSide, card.value);
      break;
    case "damageDraw":
      applyDamageToHero(combat, foeSide, card.value);
      drawCards(combat, side, card.draw || 1);
      break;
    case "block":
      actor.block += card.value;
      break;
    case "coins":
      combat.bonusCoins = (combat.bonusCoins || 0) + card.value;
      break;
    default:
      break;
  }
}

export function startBattle(state) {
  const s = clone(state);
  if (!canStartBattle(s)) {
    s.message = `牌組需至少 ${DECK_MIN} 張。`;
    return s;
  }
  const rand = getRand(s);
  const playerDeck = shuffle(s.deck.map((c) => makeCard(c.id)), rand);
  const aiDeck = aiDeckForRank(s.rankPoints, rand);
  s.screen = "battle";
  s.battle = {
    turn: "player",
    round: 1,
    bonusCoins: 0,
    player: {
      hp: 30,
      maxHp: 30,
      block: 0,
      energy: 0,
      maxEnergy: 3,
      hand: [],
      draw: playerDeck,
      discard: [],
      field: [],
    },
    ai: {
      hp: 28 + Math.floor(s.rankPoints / 50),
      maxHp: 28 + Math.floor(s.rankPoints / 50),
      block: 0,
      energy: 0,
      maxEnergy: 3,
      hand: [],
      draw: aiDeck,
      discard: [],
      field: [],
    },
    log: [],
  };
  drawCards(s.battle, "player", 3, s.battle.log);
  drawCards(s.battle, "ai", 3, s.battle.log);
  startPlayerTurn(s.battle);
  s.message = "你的回合：出牌後按結束回合。";
  return s;
}

export function canPlayCard(combat, card, side = "player") {
  if (!combat || combat.turn !== side) return false;
  const actor = combat[side];
  if (actor.energy < card.cost) return false;
  if (card.type === "unit" && actor.field.length >= FIELD_MAX) return false;
  return actor.hand.some((c) => c.uid === card.uid);
}

export function playCard(state, cardUid, target = "face") {
  const s = clone(state);
  const combat = s.battle;
  if (!combat || combat.turn !== "player" || s.screen !== "battle") return s;
  const idx = combat.player.hand.findIndex((c) => c.uid === cardUid);
  if (idx < 0) return s;
  const card = combat.player.hand[idx];
  if (!canPlayCard(combat, card)) {
    s.message = "能量不足或場地已滿。";
    return s;
  }
  if (card.type === "unit" && combat.player.field.length >= FIELD_MAX) {
    s.message = "場地最多 3 單位。";
    return s;
  }
  combat.player.energy -= card.cost;
  combat.player.hand.splice(idx, 1);
  if (card.type === "unit") {
    playUnit(combat, card, "player");
    s.message = `派出 ${card.name}。`;
  } else {
    resolveSpell(combat, card, "player", target);
    combat.player.discard.push(card);
    s.message = `施放 ${card.name}。`;
  }
  if (combat.ai.hp <= 0) return finishBattle(s, true);
  return s;
}

function aiChooseCard(combat) {
  const hand = [...combat.ai.hand].sort((a, b) => b.cost - a.cost);
  for (const card of hand) {
    if (combat.ai.energy < card.cost) continue;
    if (card.type === "unit" && combat.ai.field.length >= FIELD_MAX) continue;
    return card;
  }
  return null;
}

function aiTakeTurn(combat) {
  combat.ai.energy = combat.ai.maxEnergy;
  combat.ai.block = 0;
  drawCards(combat, "ai", 1);
  let safety = 12;
  while (safety-- > 0) {
    const card = aiChooseCard(combat);
    if (!card) break;
    combat.ai.energy -= card.cost;
    combat.ai.hand = combat.ai.hand.filter((c) => c.uid !== card.uid);
    if (card.type === "unit") playUnit(combat, card, "ai");
    else {
      resolveSpell(combat, card, "ai", "player");
      combat.ai.discard.push(card);
    }
    if (combat.player.hp <= 0) break;
  }
  strikeField(combat, "ai", "player");
}

export function endTurn(state) {
  const s = clone(state);
  const combat = s.battle;
  if (!combat || combat.turn !== "player" || s.screen !== "battle") return s;
  strikeField(combat, "player", "ai");
  if (combat.ai.hp <= 0) return finishBattle(s, true);
  if (combat.player.hp <= 0) return finishBattle(s, false);
  combat.turn = "ai";
  aiTakeTurn(combat);
  if (combat.player.hp <= 0) return finishBattle(s, false);
  if (combat.ai.hp <= 0) return finishBattle(s, true);
  combat.turn = "player";
  combat.round += 1;
  resetExhaustion(combat);
  startPlayerTurn(combat);
  s.message = `第 ${combat.round} 回合`;
  return s;
}

function finishBattle(state, playerWon) {
  const s = clone(state);
  const combat = s.battle;
  const bonus = combat?.bonusCoins || 0;
  s.battle = null;
  s.screen = "result";
  if (playerWon) {
    s.outcome = "playing";
    s.battlesWon += 1;
    s.rankPoints += 20 + Math.floor(s.battlesWon / 2) * 2;
    s.coins += 8 + bonus;
    s.score += 100 + s.rankPoints;
    s.message = `排位勝利！+20 分 · 金幣 +${8 + bonus}`;
  } else {
    s.rankPoints = Math.max(0, s.rankPoints - 8);
    s.message = "排位落敗，調整牌組再戰。";
  }
  return s;
}

export function leaveResult(state) {
  const s = clone(state);
  if (s.screen !== "result") return s;
  s.screen = "bazaar";
  rollShop(s);
  if (s.deck.length < DECK_MIN) s.message = `牌組至少 ${DECK_MIN} 張才能再戰。`;
  else s.message = "卡市攤位已更新。";
  return s;
}

export function mulliganHand(state) {
  const s = clone(state);
  const combat = s.battle;
  if (!combat || combat.turn !== "player" || combat.round !== 1) return s;
  if (combat.mulliganUsed) {
    s.message = "開局只能調度一次。";
    return s;
  }
  combat.mulliganUsed = true;
  combat.player.discard.push(...combat.player.hand);
  combat.player.hand = [];
  drawCards(combat, "player", 3);
  s.message = "手牌已調度。";
  return s;
}

export function getAiIntent(state) {
  const combat = state.battle;
  if (!combat) return null;
  const card = aiChooseCard(combat);
  if (!card) return { kind: "attack", text: "壓境" };
  if (card.type === "unit") return { kind: "summon", text: card.name };
  if (card.effect === "damage" || card.effect === "damageDraw") return { kind: "spell", text: `${card.name} ${card.value}` };
  if (card.effect === "heal") return { kind: "heal", text: "奉茶" };
  return { kind: "plan", text: card.name };
}
