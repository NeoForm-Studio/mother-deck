/* ═══════════════════════════════════════════════════════════════════════
   MOTHER SOUND — vanilla-JS port of the Athena SoundEngine.
   Same Alien samples (served at /sfx) for the same events, same synth
   fallbacks. Wires the deck's clicks/boot to the matching sounds:
     • cross into MOTHER  → bootReady (interfaceBoot fanfare) + background
     • subsystem / toggle → hydraulicHiss (openPanel)
     • buttons / keys     → keyClack (typeKey)
     • launch a tour      → scanSweep
   Sandbox copy only. Exposed as window.MotherSound.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const Sound = {
    ctx: null, master: null, muted: false, volume: 0.38,
    soundMap: {}, buffers: new Map(), mapFetch: null,
    bgSource: null, bgGain: null, BG_VOL: 0.045,
  };

  function getCtx() {
    if (!Sound.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      Sound.ctx = new AC();
      Sound.master = Sound.ctx.createGain();
      Sound.master.gain.value = Sound.volume;
      Sound.master.connect(Sound.ctx.destination);
    }
    return Sound.ctx;
  }

  function resume() {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    preWarm();
  }

  function ensureMap() {
    if (Sound.mapFetch) return Sound.mapFetch;
    Sound.mapFetch = fetch('/sfx/sound-map.json')
      .then((r) => r.json())
      .then((m) => { Sound.soundMap = m; })
      .catch(() => { /* synth fallback covers everything */ });
    return Sound.mapFetch;
  }

  async function preWarm() {
    await ensureMap();
    ['interfaceBoot', 'openPanel', 'typeKey'].forEach((ev) => {
      const f = pickFile(ev);
      if (f) loadBuffer(f);
    });
  }

  async function loadBuffer(path) {
    if (Sound.buffers.has(path)) return Sound.buffers.get(path);
    try {
      const r = await fetch('/sfx/' + path);
      if (!r.ok) return null;
      const arr = await r.arrayBuffer();
      const buf = await getCtx().decodeAudioData(arr);
      Sound.buffers.set(path, buf);
      return buf;
    } catch (e) { return null; }
  }

  function pickFile(event) {
    const files = Sound.soundMap[event];
    if (!files || !files.length) return null;
    return files[Math.floor(Math.random() * files.length)];
  }

  async function playSample(event, gainLevel, loop, dest) {
    gainLevel = gainLevel == null ? 0.8 : gainLevel;
    await ensureMap();
    const file = pickFile(event);
    if (!file) return null;
    const buf = await loadBuffer(file);
    if (!buf) return null;
    if (Sound.muted && !loop) return null;
    const ctx = getCtx();
    const gain = ctx.createGain();
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = !!loop;
    gain.gain.value = Sound.muted ? 0 : gainLevel;
    src.connect(gain);
    gain.connect(dest || Sound.master || ctx.destination);
    src.start();
    return src;
  }

  /* ── synth fallbacks (same recipes as Athena) ─────────────────────── */
  function synthChirp(f1, f2, dur, vol) {
    vol = vol == null ? 0.22 : vol;
    if (Sound.muted) return;
    const ctx = getCtx(), osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(Sound.master);
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur);
  }
  function synthNoise(dur, freq, vol) {
    vol = vol == null ? 0.12 : vol;
    if (Sound.muted) return;
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * dur * 0.7));
    const src = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), gain = ctx.createGain();
    filt.type = 'bandpass'; filt.frequency.value = freq; filt.Q.value = 0.5;
    src.buffer = buf; src.connect(filt); filt.connect(gain); gain.connect(Sound.master);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.start(t);
  }
  function synthClick(vol) {
    vol = vol == null ? 0.18 : vol;
    if (Sound.muted) return;
    const ctx = getCtx(), dur = 0.025;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf; gain.gain.value = vol;
    src.connect(gain); gain.connect(Sound.master);
    src.start(ctx.currentTime);
  }

  /* ── public event API (mirrors SoundEngine) ───────────────────────── */
  function hydraulicHiss() { playSample('openPanel', 0.82).then((s) => { if (!s) synthNoise(0.15, 800, 0.12); }); }
  function keyClack() { playSample('typeKey', 0.52).then((s) => { if (!s) synthClick(0.18); }); }
  // Softer per-keystroke tick for live typing (rotates the same 14-clip pool).
  function keyType() { playSample('typeKey', 0.32).then((s) => { if (!s) synthClick(0.1); }); }
  // Short pip for tabs / toggles — distinct from a plain button click.
  function blip() { synthChirp(760, 1520, 0.09, 0.14); }
  function motionPing() { playSample('thinking', 0.55).then((s) => { if (!s) synthChirp(1200, 400, 0.35, 0.20); }); }
  function scanSweep() {
    if (Sound.muted) return;
    const ctx = getCtx(), osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(Sound.master); osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.45);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.50);
    osc.start(t); osc.stop(t + 0.50);
  }
  function bootReady() {
    playSample('interfaceBoot', 0.90).then((s) => {
      if (!s) [440, 554, 659, 880].forEach((f, i) => setTimeout(() => synthChirp(f, f * 1.3, 0.08, 0.18), i * 70));
    });
    setTimeout(() => { startBackground(); }, 2200);
  }
  async function startBackground() {
    if (Sound.bgSource) return;
    await ensureMap();
    const ctx = getCtx();
    if (ctx.state === 'suspended') return;
    const gain = ctx.createGain();
    gain.gain.value = 0; gain.connect(ctx.destination);
    Sound.bgGain = gain;
    const src = await playSample('background', Sound.BG_VOL, true, gain);
    if (!src) { Sound.bgGain = null; return; }
    Sound.bgSource = src;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(Sound.muted ? 0 : Sound.BG_VOL, t + 3);
  }
  function setVolume(v) { Sound.volume = v; if (Sound.master && !Sound.muted) Sound.master.gain.value = v; }
  function toggleMute() {
    Sound.muted = !Sound.muted;
    if (Sound.master) Sound.master.gain.value = Sound.muted ? 0 : Sound.volume;
    if (Sound.bgGain) Sound.bgGain.gain.value = Sound.muted ? 0 : Sound.BG_VOL;
    return Sound.muted;
  }

  window.MotherSound = { resume, hydraulicHiss, keyClack, keyType, blip, motionPing, scanSweep, bootReady, startBackground, setVolume, toggleMute };

  /* ── deck wiring (event delegation) ───────────────────────────────── */
  // Audio can't autoplay before a user gesture, so the "boot up" fanfare fires
  // on the first interaction (the deck's visual boot has already auto-run).
  let audioBooted = false;
  function unlock() {
    resume();
    if (!audioBooted) { audioBooted = true; setTimeout(bootReady, 60); }
  }

  function onClick(e) {
    const t = e.target.closest(
      '#to-mother, .cross-btn, .sub, #tg-athena, #tg-mother, .btab, .sm-mode-btn, ' +
      '.tutor__model, .tutor__demomode, .btn, #wt-launch, .wt-btn, .wt-menu__item, ' +
      '.navitem, .navlink, .row, .card, button'
    );
    if (!t) return;
    if (t.closest('.wt-menu__item')) { scanSweep(); return; }          // launch a tour
    if (t.closest('#to-mother, .cross-btn, .sub')) { hydraulicHiss(); return; } // panel-open / navigate
    if (t.closest('#tg-athena, #tg-mother, .btab, .sm-mode-btn, .tutor__model, .tutor__demomode')) {
      blip(); return;                                                  // tabs / toggles → pip
    }
    keyClack();                                                        // every other click → key clack
  }

  // Per-keystroke typing sound on text inputs (skips held-key repeat + modifier combos).
  function onKeyType(e) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tgt = e.target;
    if (!tgt || typeof tgt.matches !== 'function' || !tgt.matches('input, textarea')) return;
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Tab') { resume(); keyType(); }
  }

  function wire() {
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyType, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
