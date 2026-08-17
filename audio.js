const SFX = {
  click: "./assets/audio/click.ogg",
  ok: "./assets/audio/ok.ogg",
  hit: "./assets/audio/hit.ogg",
  soft: "./assets/audio/soft.ogg",
  coin: "./assets/audio/coin.ogg",
  error: "./assets/audio/error.ogg",
  win: "./assets/audio/win.ogg",
  action: "./assets/audio/action.ogg",
};

export class GameAudio {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.buffers = new Map();
    this.music = null;
    this.musicGain = null;
    this.suspended = false;
  }

  async start() {
    this.ctx ??= new AudioContext();
    await this.ctx.resume();
    await Promise.all(Object.entries(SFX).map(([name, url]) => this.#load(name, url)));
    await this.#startMusic();
  }

  async #load(name, url) {
    if (this.buffers.has(name)) return;
    try {
      const res = await fetch(url);
      this.buffers.set(name, await this.ctx.decodeAudioData(await res.arrayBuffer()));
    } catch {
      this.buffers.set(name, null);
    }
  }

  async #startMusic() {
    if (this.music || !this.ctx) return;
    try {
      const res = await fetch("./assets/audio/music.ogg");
      const buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = this.enabled && !this.suspended ? 0.18 : 0;
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain).connect(this.ctx.destination);
      source.start();
      this.music = source;
      this.musicGain = gain;
    } catch {}
  }

  play(name, { volume = 0.45 } = {}) {
    const buffer = this.buffers.get(name);
    if (!this.enabled || this.suspended || !this.ctx || !buffer) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(this.ctx.destination);
    source.start();
  }

  setEnabled(on) {
    this.enabled = on;
    this.#syncMusic();
  }

  suspend() {
    this.suspended = true;
    this.#syncMusic();
    if (this.ctx?.state === "running") void this.ctx.suspend();
  }

  resume() {
    this.suspended = false;
    this.#syncMusic();
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  #syncMusic() {
    if (this.musicGain) this.musicGain.gain.value = this.enabled && !this.suspended ? 0.18 : 0;
  }
}
