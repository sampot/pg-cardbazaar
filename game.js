function clone(v){return structuredClone(v)}
function rand(n){let t=(n+0x6d2b79f5)|0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
export function createGame({seed=1,chapter=1}={}){return {seed:Number(seed)||1,turn:0,score:0,outcome:"playing",message:"準備就緒",chapter,coins:6,collection:["茶狐","鐵龜","星鳥"],deck:["茶狐","鐵龜"],hand:[],playerHp:20,aiHp:20,rank:0}}
export function getLegalActions(s){return s.outcome==="playing"?["unlock", "add", "play", "rank"]:[]}
export function applyAction(state,action){const s=clone(state);if(!getLegalActions(s).includes(action))return s;s.message={"unlock": "開卡包", "add": "加入牌組", "play": "出牌", "rank": "排位對戰"}[action];if(action==="unlock"&&s.coins>=2){s.coins-=2;s.collection.push(["月鹿","霜蛙","炎獅"][s.turn%3])}else if(action==="add"&&s.deck.length<8)s.deck.push(s.collection[s.turn%s.collection.length]);else if(action==="play"){if(!s.hand.length)s.hand=s.deck.slice(0,3);if(s.hand.length){s.hand.pop();s.aiHp-=3+(s.turn%3);s.playerHp-=2}}else if(action==="rank"){if(s.aiHp<=0){s.rank++;s.score+=100;s.coins+=3;s.aiHp=20+s.rank*3;s.playerHp=20}else{s.playerHp-=3}}s.turn++;if(s.rank>=3)s.outcome="won";if(s.playerHp<=0)s.outcome="lost";return s}
export function summarize(s){return {turn:s.turn,score:s.score,outcome:s.outcome,message:s.message}}
export function getOutcome(s){return s.outcome}
