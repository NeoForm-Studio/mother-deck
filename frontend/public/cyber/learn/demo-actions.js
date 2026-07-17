/* ═══════════════════════════════════════════════════════════════════════
   GUIDED DEMO CONTROL (Phase 3) — the tutor can DRIVE the deck to demonstrate.
   SAFETY MODEL: capability lives HERE, not in the model. The model can only
   REQUEST named actions from this registry; every action + param is validated
   against allowlists before it runs. Unknown actions, unlisted selectors, and
   anything destructive are rejected — they simply don't exist here.
   Safe set only: navigate · highlight · load-sample · fill-field · click-safe
   · narrate · wait.  NO delete/clear/submit/export/send.  NO terminal
   execution in this build (that's the separate, toggle-gated increment).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const MODULES = ['terminal', 'recon', 'command', 'scripts', 'malware', 'payload', 'loot', 'killchain', 'blue', 'engage', 'ctf', 'recorder'];

  // The ONLY selectors a demo may fill or click, per module. Curated + non-destructive.
  // fill = only simple-value inputs (a placeholder, an IP, a port). Parse-sensitive
  // fields (nmap ingest, etc.) are intentionally NOT fillable — demos use 'sample'
  // to load valid demo data instead, so a stray value can't produce a "no results" glitch.
  const SAFE = {
    recon:     { fill: [],                                                          click: ['#btn-sample', '#btn-ingest'] },
    command:   { fill: ['#p-TARGET', '#p-LHOST', '#p-LPORT', '#p-URL', '#p-WORDLIST', '#q'], click: [] },
    payload:   { fill: ['#p-LHOST', '#p-LPORT'],                                    click: [] },
    scripts:   { fill: [],                                                          click: ['#btn-new'] },
    malware:   { fill: [],                                                          click: ['#add-toggle'] },
    killchain: { fill: [],                                                          click: ['#btn-export'] },
    blue:      { fill: [],                                                          click: ['#btn-analyze'] },
    recorder:  { fill: [],                                                          click: ['#btn-play'] },
    loot:      { fill: [],                                                          click: [] },
    engage:    { fill: [],                                                          click: [] },
    ctf:       { fill: [],                                                          click: [] },
    terminal:  { fill: [],                                                          click: [] },
  };
  // Built-in "load sample data" trigger per module (non-destructive demo data).
  const SAMPLE_BTN = { recon: '#btn-sample', recorder: '#btn-play' };

  const MAX_STEPS = 14;
  const MAX_TEXT = 4000;

  const state = { running: false, stop: false, ui: null };

  /* ── iframe helpers (same-origin) ─────────────────────────────────── */
  const activeModuleId = () => { const a = document.querySelector('.sub--active'); return a ? a.dataset.id : null; };
  const moduleFrame = () => document.querySelector('.module iframe');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function openModule(id) {
    return new Promise((res) => {
      if (activeModuleId() === id) return res(true);
      const btn = document.querySelector('.sub[data-id="' + id + '"]');
      if (!btn) return res(false);
      btn.click();
      const start = performance.now();
      const tick = () => {
        const fr = moduleFrame();
        let ready = false;
        try { ready = fr && fr.contentDocument && fr.contentDocument.readyState === 'complete' && fr.contentDocument.body && fr.contentDocument.body.children.length > 0; } catch (e) { ready = false; }
        if (ready) return setTimeout(() => res(true), 250);
        if (performance.now() - start > 4500) return res(false);
        setTimeout(tick, 100);
      };
      setTimeout(tick, 150);
    });
  }
  function waitFrameEl(sel, timeout) {
    return new Promise((res) => {
      const start = performance.now();
      const tick = () => {
        const fr = moduleFrame();
        let node = null;
        try { node = fr && fr.contentDocument && fr.contentDocument.querySelector(sel); } catch (e) { node = null; }
        if (node) return res(node);
        if (performance.now() - start > 2500) return res(null);
        setTimeout(tick, 100);
      };
      tick();
    });
  }
  function composedRect(node, fr) {
    const ir = fr.getBoundingClientRect(), rr = node.getBoundingClientRect();
    const left = ir.left + rr.left, top = ir.top + rr.top;
    return { left, top, width: rr.width, height: rr.height };
  }

  /* ── highlight ring (visual only; no scrim, deck stays usable) ────── */
  let ring = null;
  function showRing(rect) {
    if (!ring) { ring = document.createElement('div'); ring.className = 'demo-ring'; document.body.append(ring); }
    ring.style.display = 'block';
    ring.style.left = (rect.left - 6) + 'px';
    ring.style.top = (rect.top - 6) + 'px';
    ring.style.width = (rect.width + 12) + 'px';
    ring.style.height = (rect.height + 12) + 'px';
  }
  function hideRing() { if (ring) ring.style.display = 'none'; }

  /* ── validation: the gatekeeper ───────────────────────────────────── */
  function validate(step) {
    if (!step || typeof step !== 'object') return { ok: false, reason: 'not an object' };
    const a = step.action;
    const m = step.module;
    const inMod = (list) => m && MODULES.includes(m) && (SAFE[m] || {})[list] && SAFE[m][list].includes(step.selector);
    switch (a) {
      case 'say':       return typeof step.text === 'string' && step.text.length <= MAX_TEXT ? { ok: true } : { ok: false, reason: 'bad text' };
      case 'wait':      return { ok: true };
      case 'open':      return MODULES.includes(m) ? { ok: true } : { ok: false, reason: 'unknown module ' + m };
      case 'highlight': return typeof step.selector === 'string' ? { ok: true } : { ok: false, reason: 'bad selector' };
      case 'sample':    return SAMPLE_BTN[m] ? { ok: true } : { ok: false, reason: 'no sample for ' + m };
      case 'fill':      return inMod('fill') && typeof step.value === 'string' && step.value.length <= MAX_TEXT
                                 ? { ok: true } : { ok: false, reason: 'fill not allowed: ' + m + ' ' + step.selector };
      case 'click':     return inMod('click') ? { ok: true } : { ok: false, reason: 'click not allowed: ' + m + ' ' + step.selector };
      case 'terminalType':
      case 'terminalRun': return typeof step.command === 'string' && step.command.length && step.command.length <= 800
                                 ? { ok: true } : { ok: false, reason: 'bad command' };
      default:          return { ok: false, reason: 'unknown action: ' + a };
    }
  }

  /* ── run one validated step ───────────────────────────────────────── */
  async function runStep(step) {
    const m = step.module;
    switch (step.action) {
      case 'say': narrate(step.text); return;
      case 'wait': await sleep(Math.max(0, Math.min(4000, step.ms || 600))); return;
      case 'open': await openModule(m); return;
      case 'highlight': {
        let node, rect;
        if (step.frame || m) { if (m) await openModule(m); const fr = moduleFrame(); node = await waitFrameEl(step.selector, 2500); if (node && fr) { try { node.scrollIntoView({ block: 'center' }); } catch (e) {} rect = composedRect(node, fr); } }
        else { node = document.querySelector(step.selector); if (node) rect = node.getBoundingClientRect(); }
        if (rect) showRing(rect);
        return;
      }
      case 'sample': { await openModule(m); const el = await waitFrameEl(SAMPLE_BTN[m], 2500); if (el) { try { el.scrollIntoView({ block: 'center' }); } catch (e) {} showRing(composedRect(el, moduleFrame())); el.click(); } return; }
      case 'fill': {
        await openModule(m); const el = await waitFrameEl(step.selector, 2500);
        if (el) { try { el.scrollIntoView({ block: 'center' }); } catch (e) {} showRing(composedRect(el, moduleFrame())); el.focus();
          el.value = step.value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
        return;
      }
      case 'click': { await openModule(m); const el = await waitFrameEl(step.selector, 2500); if (el) { try { el.scrollIntoView({ block: 'center' }); } catch (e) {} showRing(composedRect(el, moduleFrame())); el.click(); } return; }
      case 'terminalType': await terminalAction(step.command, false); return;
      case 'terminalRun': {
        if (demoMode() === 'auto') {
          const go = await confirmRun(step.command);
          await terminalAction(step.command, go);
          narrate(go ? '↳ ran it.' : '↳ skipped — typed only.');
        } else {
          await terminalAction(step.command, false);
          narrate('↳ typed into the shell — press Enter to run it yourself (Guided mode).');
        }
        return;
      }
    }
  }

  const demoMode = () => (localStorage.getItem('mother.demo.mode') || 'guided');

  async function terminalAction(command, execute) {
    await openModule('terminal');
    const fr = moduleFrame();
    const api = fr && fr.contentWindow && fr.contentWindow.motherTerminal;
    if (!api) { narrate('(terminal not ready)'); return; }
    const termEl = await waitFrameEl('#term', 2500);
    if (termEl) showRing(composedRect(termEl, fr));
    const ok = await api.ensureConnected();
    if (!ok) { narrate('(could not connect the Kali shell — is the terminal enabled?)'); return; }
    await sleep(400);
    api.inject(command, execute);
  }

  // Autonomous-mode gate: show the exact command and require an explicit Run.
  function confirmRun(cmd) {
    return new Promise((resolve) => {
      const ov = document.createElement('div'); ov.className = 'demo-confirm';
      const box = document.createElement('div'); box.className = 'demo-confirm__box';
      const title = document.createElement('div'); title.className = 'demo-confirm__title'; title.textContent = 'MOTHER wants to run this in the Kali shell';
      const pre = document.createElement('pre'); pre.className = 'demo-confirm__cmd'; pre.textContent = cmd;
      const row = document.createElement('div'); row.className = 'demo-confirm__row';
      const skip = document.createElement('button'); skip.className = 'demo-confirm__skip'; skip.textContent = 'Skip';
      const run = document.createElement('button'); run.className = 'demo-confirm__run'; run.textContent = '▶ Run';
      row.append(skip, run); box.append(title, pre, row); ov.append(box); document.body.append(ov);
      const done = (v) => { ov.remove(); resolve(v); };
      run.addEventListener('click', () => done(true));
      skip.addEventListener('click', () => done(false));
      ov.addEventListener('click', (e) => { if (e.target === ov) done(false); });  // backdrop = skip (default safe)
    });
  }

  function narrate(text) {
    if (window.Tutor && window.Tutor.demoSay) window.Tutor.demoSay(text);
  }

  /* ── DEMO MODE banner + STOP ──────────────────────────────────────── */
  function showBanner() {
    if (state.ui) { state.ui.root.style.display = 'flex'; return; }
    const root = document.createElement('div'); root.className = 'demo-banner';
    const dot = document.createElement('span'); dot.className = 'demo-banner__dot';
    const label = document.createElement('span'); label.className = 'demo-banner__label'; label.textContent = 'DEMO MODE — MOTHER is driving';
    const stop = document.createElement('button'); stop.className = 'demo-banner__stop'; stop.textContent = '■ STOP';
    stop.addEventListener('click', () => { state.stop = true; });
    root.append(dot, label, stop);
    document.body.append(root);
    state.ui = { root };
  }
  function hideBanner() { if (state.ui) state.ui.root.style.display = 'none'; }

  /* ── run a whole plan ─────────────────────────────────────────────── */
  async function runPlan(plan) {
    if (state.running) return { ok: false, error: 'a demo is already running' };
    if (!Array.isArray(plan)) return { ok: false, error: 'plan is not a list' };

    // Validate everything up front; keep only valid steps.
    const valid = [];
    const rejected = [];
    for (const step of plan.slice(0, MAX_STEPS)) {
      const v = validate(step);
      if (v.ok) valid.push(step); else rejected.push({ step, reason: v.reason });
    }
    if (rejected.length) console.warn('[demo] rejected steps:', rejected);
    if (!valid.length) return { ok: false, error: 'no valid steps in plan', rejected };

    state.running = true; state.stop = false;
    showBanner();
    try {
      for (const step of valid) {
        if (state.stop) { narrate('— demo stopped —'); break; }
        await runStep(step);
        await sleep(step.action === 'say' ? 1100 : 950);   // pacing so it's watchable
      }
    } catch (e) {
      console.error('[demo] error', e);
    } finally {
      state.running = false;
      hideRing();
      setTimeout(hideBanner, 600);
    }
    return { ok: true, ran: valid.length, rejected: rejected.length };
  }

  // The action vocabulary + allowlists, so the planner prompt can be built
  // from a single source of truth.
  function vocabulary() {
    return {
      modules: MODULES,
      actions: {
        open: 'open a subsystem — {action:"open", module}',
        highlight: 'spotlight an element — {action:"highlight", module?, selector, frame?:true}',
        sample: 'load a module’s built-in sample data — {action:"sample", module}  (only: ' + Object.keys(SAMPLE_BTN).join(', ') + ')',
        fill: 'type a sample value into an allowed input (no submit) — {action:"fill", module, selector, value}',
        click: 'click an allowlisted safe control — {action:"click", module, selector}',
        terminalType: 'type a command into the live Kali terminal WITHOUT running it (learner presses Enter) — {action:"terminalType", command}',
        terminalRun: 'propose running a command in the Kali terminal — {action:"terminalRun", command}. Guided mode types only; Autonomous mode asks the operator to confirm before it runs. Use real, safe teaching commands (e.g. whoami, id, nmap -F <target>).',
        say: 'narrate a step — {action:"say", text}',
        wait: 'pause — {action:"wait", ms}',
      },
      fillable: Object.fromEntries(Object.entries(SAFE).map(([k, v]) => [k, v.fill]).filter(([, v]) => v.length)),
      clickable: Object.fromEntries(Object.entries(SAFE).map(([k, v]) => [k, v.click]).filter(([, v]) => v.length)),
    };
  }

  // ── helpers for the MACH RUN cinematic scene (machrun.js) ─────────────
  // Locate the on-screen rect of a step's click target, for the fake cursor.
  async function locate(step) {
    if (step.action === 'open') { const b = document.querySelector('.sub[data-id="' + step.module + '"]'); return b ? b.getBoundingClientRect() : null; }
    if (step.module) await openModule(step.module);
    let sel = step.selector;
    if (step.action === 'sample') sel = SAMPLE_BTN[step.module];
    if (step.action === 'terminalType' || step.action === 'terminalRun' || step.action === 'terminalExec') sel = '#term';
    if (!sel) return null;
    const node = await waitFrameEl(sel, 2500);
    const fr = moduleFrame();
    if (node && fr) return composedRect(node, fr);
    const dn = document.querySelector(sel);
    return dn ? dn.getBoundingClientRect() : null;
  }
  // Run one validated step (used by the curated scene).
  async function runOne(step) { const v = validate(step); if (!v.ok) return { ok: false, reason: v.reason }; await runStep(step); return { ok: true }; }
  // Execute a command in the terminal (scene-only; MACH RUN gates it with one upfront confirm).
  async function terminalExec(cmd) { await terminalAction(cmd, true); }

  window.DemoActions = {
    runPlan, validate, vocabulary, isRunning: () => state.running, stop: () => { state.stop = true; },
    locate, runStep: runOne, terminalExec, hideRing, showRing,
  };
})();
