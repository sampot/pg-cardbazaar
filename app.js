import {
  CARDS,
  DECK_MAX,
  DECK_MIN,
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
  refreshShop,
  removeFromDeck,
  startBattle,
  summarize,
} from "./game.js";
import { GameAudio } from "./audio.js";
import { loadProgress, saveProgress } from "./persist.js";

await (globalThis.PG?.ready ?? Promise.resolve());

const $ = (sel) => document.querySelector(sel);
const audio = new GameAudio();
let state = createGame({ seed: Date.now() % 99991 });
let progress = {};
let selectedUid = null;

function factionClass(f) {
  return f ? ` faction-${f}` : "";
}

function cardButton(card, { disabled = false, meta = "", onClick, selected = false } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `card type-${card.type}${factionClass(card.faction)}${selected ? " selected" : ""}`;
  btn.disabled = disabled;
  btn.innerHTML = `
    <span class="cost">${card.cost}</span>
    <strong>${card.name}</strong>
    <span class="desc">${card.desc || ""}${meta ? `<br/>${meta}` : ""}</span>
  `;
  btn.onclick = onClick;
  return btn;
}

function unitEl(unit) {
  const el = document.createElement("div");
  el.className = `unit${unit.taunt ? " taunt" : ""}${unit.exhausted ? " exhausted" : ""}`;
  el.innerHTML = `
    <strong>${unit.name}</strong>
    <span>${unit.atk}/${unit.hp}</span>
  `;
  return el;
}

function renderHud() {
  const hud = $("#hud");
  hud.innerHTML = `
    <span>🪙 ${state.coins}</span>
    <span>🏅 ${rankLabel(state.rankPoints)}</span>
    <span>📦 ${state.deck.length}/${DECK_MAX}</span>
    <span>⚔ ${state.battlesWon} 勝</span>
  `;
  if (state.battle) {
    const b = state.battle;
    hud.innerHTML += `
      <span class="battle-stat">♥ ${b.player.hp}/${b.player.maxHp}</span>
      <span class="battle-stat">🛡 ${b.player.block}</span>
      <span class="battle-stat">⚡ ${b.player.energy}/${b.player.maxEnergy}</span>
    `;
  }
}

function renderBazaar(stage) {
  stage.innerHTML = `
    <div class="screen-head">
      <h2>黃昏卡市</h2>
      <p>購入新牌後可調整牌組，再挑戰排位。</p>
    </div>
    <div class="shop"></div>
  `;
  const shop = stage.querySelector(".shop");
  state.shop.forEach((offer, i) => {
    const wrap = document.createElement("div");
    wrap.className = "shop-offer";
    const btn = cardButton(offer.card, {
      disabled: offer.sold,
      meta: offer.sold ? "已售" : `💰 ${offer.card.price}`,
      onClick: () => {
        audio.play("coin");
        state = buyCard(state, i);
        render();
        void persist();
      },
    });
    wrap.append(btn);
    shop.append(wrap);
  });
}

function renderDeck(stage) {
  stage.innerHTML = `
    <div class="screen-head"><h2>牌組編制</h2><p>收藏 → 牌組；再點牌組移回。</p></div>
    <h3>牌組 (${state.deck.length}/${DECK_MAX})</h3>
    <div class="row deck-row"></div>
    <h3>收藏</h3>
    <div class="row collection-row"></div>
  `;
  const deckRow = stage.querySelector(".deck-row");
  const colRow = stage.querySelector(".collection-row");
  for (const card of state.deck) {
    deckRow.append(
      cardButton(card, {
        onClick: () => {
          audio.play("click");
          state = removeFromDeck(state, card.uid);
          render();
        },
      }),
    );
  }
  for (const card of state.collection) {
    colRow.append(
      cardButton(card, {
        disabled: state.deck.length >= DECK_MAX,
        onClick: () => {
          audio.play("ok");
          state = addToDeck(state, card.uid);
          render();
        },
      }),
    );
  }
}

function renderBattle(stage) {
  const b = state.battle;
  const intent = getAiIntent(state);
  stage.innerHTML = `
    <div class="arena">
      <div class="side ai-side">
        <div class="avatar"><img src="./assets/images/rival.png" width="32" height="32" alt="" /></div>
        <div class="hero-bar">
          <strong>對手</strong>
          <span class="intent">${intent ? intent.text : "？"}</span>
          <div class="bar"><i style="width:${(b.ai.hp / b.ai.maxHp) * 100}%"></i></div>
          <span>${b.ai.hp}/${b.ai.maxHp}</span>
        </div>
        <div class="field ai-field"></div>
      </div>
      <div class="side player-side">
        <div class="field player-field"></div>
        <div class="hero-bar">
          <strong>你</strong>
          <div class="bar player"><i style="width:${(b.player.hp / b.player.maxHp) * 100}%"></i></div>
          <span>${b.player.hp}/${b.player.maxHp}</span>
        </div>
        <div class="avatar"><img src="./assets/images/hero.png" width="32" height="32" alt="" /></div>
      </div>
    </div>
  `;
  const aiField = stage.querySelector(".ai-field");
  const playerField = stage.querySelector(".player-field");
  for (const u of b.ai.field) aiField.append(unitEl(u));
  for (const u of b.player.field) playerField.append(unitEl(u));
}

function renderResult(stage) {
  const won = state.message.includes("勝利");
  stage.innerHTML = `
    <div class="end ${won ? "won" : "lost"}">
      <h2>${won ? "排位勝" : "排位敗"}</h2>
      <p>${state.message}</p>
      <p>目前 ${rankLabel(state.rankPoints)}</p>
    </div>
  `;
  if (won) audio.play("win", { volume: 0.55 });
  else audio.play("soft");
}

function renderHand() {
  const hand = $("#hand");
  if (!state.battle || state.screen !== "battle") {
    hand.hidden = true;
    return;
  }
  hand.hidden = false;
  hand.innerHTML = "";
  for (const card of state.battle.player.hand) {
    hand.append(
      cardButton(card, {
        selected: selectedUid === card.uid,
        disabled: !canPlayCard(state.battle, card),
        onClick: () => {
          selectedUid = card.uid;
          audio.play("click");
          if (card.type === "spell" && (card.effect === "damage" || card.effect === "damageDraw")) {
            state = playCard(state, card.uid, "face");
            selectedUid = null;
            audio.play("hit");
            render();
            void persist();
            return;
          }
          if (card.type === "unit" || card.type === "spell") {
            state = playCard(state, card.uid);
            selectedUid = null;
            audio.play(card.type === "unit" ? "action" : "ok");
            render();
            void persist();
          }
        },
      }),
    );
  }
}

function renderActions() {
  const box = $("#actions");
  box.innerHTML = "";
  const add = (label, cls, fn, disabled = false) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls || "";
    b.textContent = label;
    b.disabled = disabled;
    b.onclick = fn;
    box.append(b);
  };

  if (state.screen === "bazaar") {
    add("整理牌組", "ghost", () => {
      audio.play("click");
      state = openDeck(state);
      render();
    });
    add(`刷新攤位 (${state.shopRefreshCost}🪙)`, "ghost", () => {
      audio.play("coin");
      state = refreshShop(state);
      render();
      void persist();
    });
    add("排位對戰", "primary", () => {
      audio.play("action");
      state = startBattle(state);
      selectedUid = null;
      render();
    }, !canStartBattle(state));
  } else if (state.screen === "deck") {
    add("返回卡市", "primary", () => {
      audio.play("click");
      state = closeDeck(state);
      render();
    });
  } else if (state.screen === "battle") {
    add("調度手牌", "ghost", () => {
      state = mulliganHand(state);
      audio.play("soft");
      render();
    }, state.battle?.mulliganUsed || state.battle?.round !== 1);
    add("結束回合", "primary", () => {
      audio.play("hit");
      state = endTurn(state);
      selectedUid = null;
      render();
      void persist();
    });
  } else if (state.screen === "result") {
    add("回卡市", "primary", () => {
      audio.play("ok");
      state = leaveResult(state);
      render();
      void persist();
    });
  }

  if (state.screen !== "result") {
    add("離開", "ghost", () => {
      audio.play("click");
      $("#game").hidden = true;
      $("#lobby").hidden = false;
    });
  }
}

function render() {
  renderHud();
  $("#msg").textContent = state.message;
  const stage = $("#stage");
  if (state.screen === "bazaar") renderBazaar(stage);
  else if (state.screen === "deck") renderDeck(stage);
  else if (state.screen === "battle") renderBattle(stage);
  else if (state.screen === "result") renderResult(stage);
  else stage.innerHTML = "";
  renderHand();
  renderActions();
}

async function persist() {
  progress.best = Math.max(progress.best || 0, state.score);
  progress.rankPoints = Math.max(progress.rankPoints || 0, state.rankPoints);
  progress.battlesWon = Math.max(progress.battlesWon || 0, state.battlesWon);
  $("#best").textContent = progress.best;
  if (state.screen === "result" || getOutcome(state) !== "playing") {
    await saveProgress(progress, globalThis.PG?.kv);
  }
}

function suspend() {
  audio.suspend();
  selectedUid = null;
}

function resume() {
  audio.resume();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") suspend();
  else resume();
});
window.addEventListener("pagehide", suspend);

$("#start").onclick = async () => {
  await audio.start();
  state = createGame({ seed: Date.now() % 99991 });
  selectedUid = null;
  $("#lobby").hidden = true;
  $("#game").hidden = false;
  render();
};

$("#sound").onclick = async (e) => {
  const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
  e.currentTarget.setAttribute("aria-pressed", String(on));
  e.currentTarget.textContent = on ? "♫ 音效" : "♫ 靜音";
  audio.setEnabled(on);
  if (on) await audio.start();
};

progress = await loadProgress(globalThis.PG?.kv);
$("#best").textContent = progress.best || 0;

export { summarize, CARDS };
