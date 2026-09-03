/**
 * All audio here is synthesized live via the Web Audio API — no external
 * music/sound files. Two honest scope notes:
 *  - "Music" is a simple generative ambient pad (a few slow, detuned
 *    oscillators through a filter), not a composed soundtrack — producing
 *    actual composed music isn't something this can generate as audio
 *    assets.
 *  - SFX (footsteps, gunfire, engine, horn, UI beeps, crowd murmur) are
 *    short synthesized tones/noise bursts, not recorded samples.
 *
 * The AudioContext is created lazily on the first call after a user
 * gesture (browsers block audio autoplay before one), which naturally
 * lines up with the pointer-lock click that already starts the game.
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this._musicNodes = [];
  }

  ensureStarted() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.14;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);

    this._startAmbientMusic();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  _startAmbientMusic() {
    const { ctx, musicGain } = this;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.connect(musicGain);

    const chord = [98, 123.5, 147, 196]; // G2, B2, D3, G3
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.03 + i * 0.011;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.gain.value = 0.04;
      lfo.start();

      this._musicNodes.push(osc, lfo, gain);
    });
  }

  _blip({ freq = 440, duration = 0.08, type = 'sine', gain = 0.3, sweepTo = null }) {
    if (!this.ctx) return;
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  _noiseBurst({ duration = 0.15, gain = 0.4, filterFreq = 2000 } = {}) {
    if (!this.ctx) return;
    const { ctx } = this;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start();
  }

  playFootstep() {
    this._noiseBurst({ duration: 0.05, gain: 0.12, filterFreq: 400 });
  }

  playJump() {
    this._blip({ freq: 300, sweepTo: 500, duration: 0.15, type: 'sine', gain: 0.25 });
  }

  playGunshot(weaponKey) {
    const profile = { pistol: { g: 0.5, f: 1400 }, smg: { g: 0.4, f: 1600 }, rifle: { g: 0.55, f: 1200 }, sniper: { g: 0.7, f: 900 } }[weaponKey] || { g: 0.4, f: 1200 };
    this._noiseBurst({ duration: 0.12, gain: profile.g, filterFreq: profile.f });
    this._blip({ freq: 90, sweepTo: 40, duration: 0.12, type: 'square', gain: profile.g * 0.5 });
  }

  playMeleeSwing() {
    this._noiseBurst({ duration: 0.08, gain: 0.15, filterFreq: 1800 });
  }

  playHitMarker() {
    this._blip({ freq: 900, duration: 0.05, type: 'square', gain: 0.2 });
  }

  playReload() {
    this._blip({ freq: 500, duration: 0.06, type: 'square', gain: 0.15 });
    setTimeout(() => this._blip({ freq: 700, duration: 0.06, type: 'square', gain: 0.15 }), 120);
  }

  playHorn() {
    this._blip({ freq: 220, duration: 0.4, type: 'sawtooth', gain: 0.25 });
  }

  playEngineTick(speedFactor) {
    this._blip({ freq: 60 + speedFactor * 120, duration: 0.08, type: 'sawtooth', gain: 0.05 + speedFactor * 0.05 });
  }

  playUIBeep() {
    this._blip({ freq: 620, duration: 0.05, type: 'sine', gain: 0.15 });
  }

  playBusted() {
    this._blip({ freq: 700, sweepTo: 200, duration: 0.5, type: 'sawtooth', gain: 0.3 });
  }

  playCrowdMurmur() {
    this._noiseBurst({ duration: 0.6, gain: 0.06, filterFreq: 700 });
  }

  dispose() {
    this._musicNodes.forEach((n) => {
      try {
        n.stop?.();
        n.disconnect?.();
      } catch {
        /* already stopped */
      }
    });
    this._musicNodes = [];
    this.ctx?.close?.();
    this.ctx = null;
  }
}
