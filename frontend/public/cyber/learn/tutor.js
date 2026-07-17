/* ═══════════════════════════════════════════════════════════════════════
   ASK-MORE TUTOR (Phase 2) — embedded in the MOTHER core column, always on.
   Explains during walkthroughs (with the current step's context) and any
   time after ("what went wrong?", "what's a reverse shell?", …).
   READ-ONLY: it explains only; it never controls the UI.
   Model toggle: Claude (Athena gateway) or local Qwen (Ollama).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const state = { root: null, ui: null, ctx: null, model: localStorage.getItem('mother.tutor.model') || 'claude', demoMode: localStorage.getItem('mother.demo.mode') || 'guided', busy: false };
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };

  function build(mount) {
    if (state.root) return;
    const root = el('div', 'tutor');

    const head = el('div', 'tutor__head');
    head.append(el('span', 'tutor__title', '◇ MOTHER TUTOR'));
    const models = el('div', 'tutor__models');
    const bClaude = el('button', 'tutor__model', 'Claude'); bClaude.dataset.m = 'claude';
    const bQwen = el('button', 'tutor__model', 'Qwen'); bQwen.dataset.m = 'qwen';
    models.append(bClaude, bQwen);
    head.append(models);

    const topic = el('div', 'tutor__topic');
    const log = el('div', 'tutor__log');

    const composer = el('div', 'tutor__composer');
    const explain = el('button', 'tutor__explain', 'Explain this in more detail');
    const demoRow = el('div', 'tutor__demorow');
    const showme = el('button', 'tutor__showme', '▷ Show me');
    const mode = el('button', 'tutor__demomode');
    mode.title = 'Guided = MOTHER demonstrates safely (navigate/highlight/sample). Autonomous governs terminal command execution (with confirm), added in the terminal increment.';
    demoRow.append(showme, mode);
    const row = el('div', 'tutor__row');
    const input = el('input', 'tutor__input'); input.placeholder = 'Ask about anything…'; input.setAttribute('aria-label', 'Ask the tutor');
    const send = el('button', 'tutor__send', 'Ask');
    row.append(input, send);
    composer.append(explain, demoRow, row);

    root.append(head, topic, log, composer);
    mount.append(root);
    state.root = root;
    state.ui = { topic, log, explain, input, send, bClaude, bQwen, showme, mode };

    setDemoMode(state.demoMode);
    mode.addEventListener('click', () => setDemoMode(state.demoMode === 'auto' ? 'guided' : 'auto'));
    showme.addEventListener('click', showDemo);

    setModel(state.model);
    bClaude.addEventListener('click', () => setModel('claude'));
    bQwen.addEventListener('click', () => setModel('qwen'));
    explain.addEventListener('click', () => { if (state.ctx) ask('Explain this in more detail.'); });
    send.addEventListener('click', () => { const q = input.value.trim(); if (q) { input.value = ''; ask(q); } });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const q = input.value.trim(); if (q) { input.value = ''; ask(q); } } });

    setContext(null);   // general mode until a walkthrough sets context
    sysMsg('MOTHER tutor online. Run a walkthrough for guided help, or ask me anything about the deck, a tool, or an error.');
  }

  function setModel(m) {
    state.model = m;
    localStorage.setItem('mother.tutor.model', m);
    const u = state.ui; if (!u) return;
    u.bClaude.classList.toggle('tutor__model--on', m === 'claude');
    u.bQwen.classList.toggle('tutor__model--on', m === 'qwen');
  }

  // Called by the walkthrough engine each step (null when no tour is running).
  function setContext(step) {
    if (!state.ui) return;
    const u = state.ui;
    if (step) {
      state.ctx = { title: step.title || '', body: step.body || '', module: step.module || null };
      u.topic.innerHTML = 'Explaining: <b>' + escapeHtml(step.title || '') + '</b>';
      u.explain.disabled = state.busy;
    } else {
      state.ctx = null;
      u.topic.innerHTML = 'General — <b>ask me anything</b>';
      u.explain.disabled = true;
    }
  }

  function sysMsg(t) { if (!state.ui) return; state.ui.log.append(el('div', 'tutor__msg tutor__msg--sys', t)); scroll(); }
  function demoSay(t) { if (!state.ui) return; state.ui.log.append(el('div', 'tutor__msg tutor__msg--demo', t)); scroll(); }

  function setDemoMode(m) {
    state.demoMode = m;
    localStorage.setItem('mother.demo.mode', m);
    const u = state.ui; if (!u) return;
    u.mode.textContent = m === 'auto' ? 'Autonomous' : 'Guided';
    u.mode.classList.toggle('tutor__demomode--auto', m === 'auto');
  }

  async function showDemo() {
    if (state.busy || !window.DemoActions) { if (!window.DemoActions) sysMsg('Demo engine not loaded.'); return; }
    const u = state.ui;
    const typed = u.input.value.trim();
    const question = typed || (state.ctx ? ('Show me: ' + state.ctx.title) : 'Show me around the deck');
    if (typed) u.input.value = '';
    u.log.append(el('div', 'tutor__msg tutor__msg--user', '▷ ' + question));
    const note = el('div', 'tutor__msg tutor__msg--sys', 'MOTHER is planning a demo… (a few seconds)');
    u.log.append(note); scroll();
    state.busy = true; setBusy(true);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);   // don't hang forever
      let j = null;
      try {
        const res = await fetch('/learn/demo-plan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, context: state.ctx, vocabulary: window.DemoActions.vocabulary() }),
          signal: ctrl.signal,
        });
        const text = await res.text();               // read raw, then parse defensively
        j = text ? JSON.parse(text) : null;
      } catch (e) { j = null; }
      finally { clearTimeout(timer); }
      note.remove();
      if (!j || !j.ok || !Array.isArray(j.plan) || !j.plan.length) {
        sysMsg('MOTHER couldn’t plan that demo' + (j && j.error ? ': ' + j.error : ' — the planner may be busy. Try again') + '.');
        return;
      }
      const result = await window.DemoActions.runPlan(j.plan);
      if (result && result.rejected) sysMsg('(' + result.rejected + ' step(s) rejected by the safety validator)');
    } catch (e) {
      note.remove(); sysMsg('MOTHER couldn’t run that demo — try again.');
    } finally {
      state.busy = false; setBusy(false);
    }
  }

  function ask(question) {
    if (state.busy || !state.ui) return;
    const u = state.ui;
    u.log.append(el('div', 'tutor__msg tutor__msg--user', question));
    const bot = el('div', 'tutor__msg tutor__msg--bot');
    const cursor = el('span', 'tutor__cursor'); cursor.innerHTML = '&nbsp;';
    bot.append(cursor);
    u.log.append(bot);
    scroll();
    stream(question, bot, cursor);
  }

  async function stream(question, bot, cursor) {
    state.busy = true; setBusy(true);
    let acc = '';
    try {
      const res = await fetch('/learn/tutor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: state.model, question, context: state.ctx }),
      });
      if (!res.ok || !res.body) throw new Error('tutor ' + res.status);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const p = t.slice(5).trim();
          if (p === '[DONE]') continue;
          try {
            const j = JSON.parse(p);
            if (j.d) { acc += j.d; bot.textContent = acc; bot.append(cursor); scroll(); }
            else if (j.error) { acc += '\n[tutor error: ' + j.error + ']'; bot.textContent = acc; }
          } catch (e) { /* partial */ }
        }
      }
    } catch (e) {
      bot.textContent = (bot.textContent || '') + '\n[tutor unreachable: ' + (e.message || e) + ']';
    } finally {
      cursor.remove();
      if (!acc.trim()) bot.textContent = '[no response]';
      else bot.innerHTML = renderMd(acc);   // render markdown once streaming completes
      state.busy = false; setBusy(false); scroll();
    }
  }

  // Minimal, safe markdown: escape first, then add our own tags (no user HTML).
  function renderMd(s) {
    let h = escapeHtml(s);
    h = h.replace(/```(?:\w*)\n?([\s\S]*?)```/g, (m, c) => '<pre class="tutor__code">' + c.replace(/\n$/, '') + '</pre>');
    h = h.replace(/^#{1,6}\s+(.+)$/gm, '<b class="tutor__h">$1</b>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    h = h.replace(/`([^`]+)`/g, '<code class="tutor__ic">$1</code>');
    h = h.replace(/^\s*[-*]\s+(.+)$/gm, '<span class="tutor__li">$1</span>');
    return h;
  }

  function setBusy(b) { const u = state.ui; if (!u) return; u.send.disabled = b; u.explain.disabled = b || !state.ctx; u.showme.disabled = b; }
  function scroll() { const u = state.ui; if (u) u.log.scrollTop = u.log.scrollHeight; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  window.Tutor = { setContext, ask, setModel, demoSay };

  function init() {
    const mount = document.getElementById('tutor-mount');
    if (mount) build(mount);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
