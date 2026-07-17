/* ═══════════════════════════════════════════════════════════════════════
   WALKTHROUGH ENGINE (Phase 1+) — scripted spotlight tours.
   Reads window.WALKTHROUGHS (steps.example.js). Each step spotlights a target
   and shows an explanatory callout. Steps may:
     • target a deck-level element:   { target: '.m-core', ... }
     • open a module first + target INSIDE its iframe:
                                      { module: 'command', frame: true, target: '#cats', ... }
   No AI, no UI control beyond opening the module the tour is describing.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SPOT_PAD = 8;
  const GAP = 14;

  const state = { active: false, steps: null, index: 0, els: null, onResize: null };

  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

  /* ── deck helpers (top window) ─────────────────────────────────────── */
  const activeModuleId = () => {
    const a = document.querySelector('.sub--active');
    return a ? a.dataset.id : null;
  };
  const moduleFrame = () => document.querySelector('.module iframe');

  function activateModule(id) {
    return new Promise((res) => {
      if (activeModuleId() === id) return res();
      const btn = document.querySelector('.sub[data-id="' + id + '"]');
      if (!btn) return res();
      btn.click();
      const start = performance.now();
      const tick = () => {
        const fr = moduleFrame();
        let ready = false;
        try {
          ready = fr && fr.contentDocument && fr.contentDocument.readyState === 'complete'
            && fr.contentDocument.body && fr.contentDocument.body.children.length > 0;
        } catch (e) { ready = false; }
        if (ready) return setTimeout(res, 200);          // small settle for layout
        if (performance.now() - start > 4500) return res();
        setTimeout(tick, 100);
      };
      setTimeout(tick, 150);
    });
  }

  function waitForFrameEl(sel, timeout) {
    return new Promise((res) => {
      const start = performance.now();
      const tick = () => {
        const fr = moduleFrame();
        let node = null;
        try { node = fr && fr.contentDocument && fr.contentDocument.querySelector(sel); } catch (e) { node = null; }
        if (node) return res(node);
        if (performance.now() - start > 3000) return res(null);
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  function plainRect(r) {
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  }

  async function resolveTarget(step) {
    if (step.module) await activateModule(step.module);
    if (!state.active) return null;

    if (step.frame) {
      const node = await waitForFrameEl(step.target, 3000);
      const fr = moduleFrame();
      if (!node || !fr) return null;
      try { node.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) { /* ignore */ }
      const ir = fr.getBoundingClientRect();
      const rr = node.getBoundingClientRect();
      const left = ir.left + rr.left, top = ir.top + rr.top;
      // clamp to the iframe's visible box so an off-screen inner element
      // never spotlights outside the stage
      const cLeft = clamp(left, ir.left, ir.right);
      const cTop = clamp(top, ir.top, ir.bottom);
      const cRight = clamp(left + rr.width, ir.left, ir.right);
      const cBottom = clamp(top + rr.height, ir.top, ir.bottom);
      return { node, r: { left: cLeft, top: cTop, width: cRight - cLeft, height: cBottom - cTop, right: cRight, bottom: cBottom } };
    }

    const t = document.querySelector(step.target);
    return t ? { node: t, r: plainRect(t.getBoundingClientRect()) } : null;
  }

  /* ── chrome ────────────────────────────────────────────────────────── */
  function buildChrome() {
    const scrim = el('div', 'wt-scrim');
    scrim.addEventListener('click', (e) => e.stopPropagation());
    const spot = el('div', 'wt-spot');

    const callout = el('div', 'wt-callout');
    const arrow = el('div', 'wt-callout__arrow');
    const head = el('div', 'wt-callout__head');
    const dot = el('div', 'wt-callout__dot');
    const title = el('div', 'wt-callout__title');
    const count = el('div', 'wt-callout__count');
    head.append(dot, title, count);
    const body = el('div', 'wt-callout__body');
    const foot = el('div', 'wt-callout__foot');
    const prev = el('button', 'wt-btn wt-btn--prev'); prev.textContent = '‹ Back';
    const dots = el('div', 'wt-dots');
    const exit = el('button', 'wt-btn wt-btn--exit'); exit.textContent = 'Exit';
    const next = el('button', 'wt-btn wt-btn--next'); next.textContent = 'Next ›';
    foot.append(prev, dots, exit, next);
    callout.append(arrow, head, body, foot);

    prev.addEventListener('click', () => go(state.index - 1));
    next.addEventListener('click', () => { if (state.index >= state.steps.length - 1) stop(); else go(state.index + 1); });
    exit.addEventListener('click', stop);

    document.body.append(scrim, spot, callout);
    state.els = { scrim, spot, callout, arrow, title, count, body, prev, next, dots };
  }

  function placeCallout(r, placement) {
    const { callout, arrow } = state.els;
    const cw = callout.offsetWidth, ch = callout.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;

    let place = placement || 'auto';
    if (place === 'auto') {
      if (r.bottom + GAP + ch < vh) place = 'bottom';
      else if (r.top - GAP - ch > 0) place = 'top';
      else if (r.right + GAP + cw < vw) place = 'right';
      else place = 'left';
    }
    let top, left;
    if (place === 'bottom') { top = r.bottom + GAP; left = r.left + r.width / 2 - cw / 2; }
    else if (place === 'top') { top = r.top - GAP - ch; left = r.left + r.width / 2 - cw / 2; }
    else if (place === 'right') { left = r.right + GAP; top = r.top + r.height / 2 - ch / 2; }
    else { left = r.left - GAP - cw; top = r.top + r.height / 2 - ch / 2; }

    left = clamp(left, 12, vw - cw - 12);
    top = clamp(top, 12, vh - ch - 12);
    callout.style.left = left + 'px';
    callout.style.top = top + 'px';

    const tcx = r.left + r.width / 2, tcy = r.top + r.height / 2;
    let ax, ay;
    if (place === 'bottom') { ax = clamp(tcx - left, 14, cw - 14); ay = -6; }
    else if (place === 'top') { ax = clamp(tcx - left, 14, cw - 14); ay = ch - 6; }
    else if (place === 'right') { ax = -6; ay = clamp(tcy - top, 14, ch - 14); }
    else { ax = cw - 6; ay = clamp(tcy - top, 14, ch - 14); }
    arrow.style.left = ax + 'px';
    arrow.style.top = ay + 'px';
  }

  async function render() {
    const myIndex = state.index;
    const step = state.steps[myIndex];
    const found = await resolveTarget(step);
    if (!state.active || myIndex !== state.index) return;   // exited or advanced mid-await

    const { spot, title, count, body, prev, next, dots, callout, arrow } = state.els;
    title.textContent = step.title || '';
    body.innerHTML = escapeHtml(step.body || '');
    count.textContent = (state.index + 1) + ' / ' + state.steps.length;
    prev.disabled = state.index === 0;
    next.textContent = state.index >= state.steps.length - 1 ? 'Done ✓' : 'Next ›';
    dots.innerHTML = '';
    state.steps.forEach((_, i) => { const d = el('i'); if (i === state.index) d.className = 'on'; dots.append(d); });
    if (window.Tutor) window.Tutor.setContext(step);   // feed the ask-more tutor

    if (!found) {
      spot.style.opacity = '0'; arrow.style.opacity = '0';
      callout.style.left = (window.innerWidth / 2 - callout.offsetWidth / 2) + 'px';
      callout.style.top = (window.innerHeight / 2 - callout.offsetHeight / 2) + 'px';
      return;
    }
    spot.style.opacity = '1'; arrow.style.opacity = '1';
    const r = found.r;
    spot.style.top = (r.top - SPOT_PAD) + 'px';
    spot.style.left = (r.left - SPOT_PAD) + 'px';
    spot.style.width = (r.width + SPOT_PAD * 2) + 'px';
    spot.style.height = (r.height + SPOT_PAD * 2) + 'px';
    requestAnimationFrame(() => placeCallout(spot.getBoundingClientRect(), step.placement));
  }

  function go(i) { state.index = clamp(i, 0, state.steps.length - 1); render(); }

  function start(key) {
    const wt = (window.WALKTHROUGHS || {})[key] || firstWalkthrough();
    if (!wt || !wt.steps || !wt.steps.length) { console.warn('[walkthrough] no steps for', key); return; }
    closeMenu();
    if (state.active) stop();
    state.active = true;
    state.steps = wt.steps;
    state.index = 0;
    buildChrome();
    state.onResize = () => { if (state.active) render(); };
    window.addEventListener('resize', state.onResize);
    document.addEventListener('keydown', onKey, true);
    render();
  }

  function stop() {
    if (!state.active) return;
    state.active = false;
    window.removeEventListener('resize', state.onResize);
    document.removeEventListener('keydown', onKey, true);
    const { scrim, spot, callout } = state.els || {};
    [scrim, spot, callout].forEach((n) => n && n.remove());
    state.els = null;
    if (window.Tutor) window.Tutor.setContext(null);   // hide the tutor with the tour
  }

  function onKey(e) {
    if (!state.active) return;
    if (e.key === 'Escape') { e.preventDefault(); stop(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (state.index < state.steps.length - 1) go(state.index + 1); else stop(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.index - 1); }
  }

  function firstWalkthrough() {
    const all = window.WALKTHROUGHS || {};
    const k = Object.keys(all)[0];
    return k ? all[k] : null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ── launcher menu ─────────────────────────────────────────────────── */
  let menuEl = null;
  function openMenu(anchor) {
    closeMenu();
    const all = window.WALKTHROUGHS || {};
    menuEl = el('div', 'wt-menu');
    const t = el('div', 'wt-menu__title'); t.textContent = 'WALKTHROUGHS';
    menuEl.append(t);
    Object.keys(all).forEach((key) => {
      const item = el('button', 'wt-menu__item');
      item.textContent = all[key].name || key;
      item.addEventListener('click', () => start(key));
      menuEl.append(item);
    });
    document.body.append(menuEl);
    const r = anchor.getBoundingClientRect();
    menuEl.style.top = (r.bottom + 6) + 'px';
    menuEl.style.left = clamp(r.left, 8, window.innerWidth - menuEl.offsetWidth - 8) + 'px';
    setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
  }
  function onDocClick(e) {
    if (menuEl && !menuEl.contains(e.target) && e.target.id !== 'wt-launch') closeMenu();
  }
  function closeMenu() {
    document.removeEventListener('click', onDocClick, true);
    if (menuEl) { menuEl.remove(); menuEl = null; }
  }

  window.Walkthrough = {
    start, stop, go,
    isActive: () => state.active,
    currentStep: () => (state.active ? state.steps[state.index] : null),
  };

  function wire() {
    const btn = document.getElementById('wt-launch');
    if (btn && !btn.dataset.wtWired) {
      btn.dataset.wtWired = '1';
      btn.addEventListener('click', () => { if (menuEl) closeMenu(); else openMenu(btn); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
