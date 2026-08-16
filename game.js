/** pg-cardbazaar — 卡市爭鋒 (CCG／構築對戰) */

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function deep(o) { return JSON.parse(JSON.stringify(o)); }


export function createGame({ seed = 1 } = {}) {
  return { seed, turn: 0, score: 0, level: 1, meter: 0, resources: 10, flags: {}, log: ["卡市爭鋒：構築／對戰／解鎖"], outcome: "playing", msg: "卡市爭鋒：構築／對戰／解鎖" };
}
export function getLegalActions(s) {
  if (s.outcome !== "playing") return [];
  return ["draw","play","mulligan","rank"];
}
export function applyAction(state, action) {
  const s = deep(state);
  if (s.outcome !== "playing") return s;
  const rnd = mulberry32(s.seed + s.turn * 19);
  s.turn++;
  
  s.flags.deck = s.flags.deck ?? 20;
  if (action === "draw") { s.flags.hand = clamp((s.flags.hand||0)+1,0,7); s.msg = "抽牌"; }
  else if (action === "mulligan") { s.flags.hand = 3; s.msg = "調度手牌"; }
  else if (action === "play") {
    if ((s.flags.hand||0)<=0) s.msg = "沒手牌";
    else { s.flags.hand--; s.meter += 10 + rnd()*10; s.score += 15; s.msg = "打出一張"; }
  } else {
    if (s.meter > 40) { s.level++; s.resources += 2; s.meter = 20; s.msg = "排位勝"; s.score += 40; }
    else { s.msg = "排位敗"; s.resources = Math.max(0, s.resources-1); }
  }

  if (s.resources < 0) s.resources = 0;
  if (s.outcome === "playing" && s.level >= 5 && s.meter >= 100) {
    s.outcome = "won";
    s.msg = "目標達成！";
  }
  if (s.outcome === "playing" && (s.resources <= 0 && s.meter < 20 && s.turn > 8)) {
    s.outcome = "lost";
    s.msg = "資源崩盤";
  }
  return s;
}
export function summarize(s) {
  return { turn: s.turn, level: s.level, meter: s.meter, score: s.score, resources: s.resources, msg: s.msg, outcome: s.outcome, flags: s.flags };
}
export function getOutcome(s) { return s.outcome; }

