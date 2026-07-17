/* ═══════════════════════════════════════════════════════════════════════
   MACH RUN (Phase A) — a cinematic, start-to-finish operation that drives the
   whole deck: a generated cursor moves + clicks, MOTHER narrates, real nmap
   runs against the internet's sanctioned test host, and the payload/commands
   "rewrite themselves" to the target. Built on the safe demo-actions registry
   (every action validated). One upfront confirm covers the single real command.
   Phase B (concept visualiser) and Phase C (holographic metaphor) layer on later.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const REAL_CMD = 'nmap -F scanme.nmap.org';   // scanme.nmap.org = nmap's sanctioned scan target
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const SCENE = [
    { say: '◈ OPERATION GLASS CANNON — a full engagement, start to finish. Watch MOTHER work.', viz: { m: 'link', cap: 'Attacker and target, across the network.' } },
    { say: 'PHASE 1 · RECON — map the target network.' },
    { step: { action: 'open', module: 'recon' } },
    { step: { action: 'sample', module: 'recon' }, say: 'The network materialises — every host, its open ports and services.', viz: { m: 'scan', cap: 'Recon — discovering hosts on the network.' } },
    { say: 'PHASE 2 · LIVE RECON — drop to the Kali shell and scan a real host.' },
    { step: { action: 'open', module: 'terminal' } },
    { step: { action: 'terminalExec', command: REAL_CMD }, say: 'Real nmap. Real Kali. Service discovery on a live host.', viz: { m: 'scan', cap: 'nmap probes each port — 22, 80 and 443 answer.' } },
    { wait: 4000 },
    { say: 'PHASE 3 · WEAPONISE — watch the code rewrite itself to the target.' },
    { step: { action: 'open', module: 'command' } },
    { step: { action: 'fill', module: 'command', selector: '#p-TARGET', value: '10.10.10.15' }, say: 'Set the target once — every command retargets to 10.10.10.15.', viz: { m: 'target', cap: 'Target locked — 10.10.10.15.' } },
    { step: { action: 'open', module: 'payload' } },
    { step: { action: 'fill', module: 'payload', selector: '#p-LHOST', value: '10.10.14.7' } },
    { step: { action: 'fill', module: 'payload', selector: '#p-LPORT', value: '4444' }, say: 'The reverse shell rewrites itself to our listener — 10.10.14.7 : 4444.', viz: { m: 'payload', cap: 'Reverse shell armed → 10.10.14.7 : 4444.' } },
    { say: 'The exploit lands and the target dials home — a shell on our listener.', viz: { m: 'revshell', cap: 'Target connects BACK to us — the reverse shell opens.' } },
    { wait: 1800 },
    { say: 'PHASE 4 · DOCUMENT — the attack path across MITRE ATT&CK.' },
    { step: { action: 'open', module: 'killchain' } },
    { step: { action: 'highlight', module: 'killchain', frame: true, selector: '#path-flow' }, say: 'Every technique used, chained into a visual kill chain.', viz: { m: 'link', cap: 'The full attack path, recon → shell.' } },
    { say: 'PHASE 5 · DEFENCE — the same attack, from the blue side.' },
    { step: { action: 'open', module: 'blue' } },
    { step: { action: 'click', module: 'blue', selector: '#btn-analyze' }, say: 'And here it is in the logs — how a defender would catch it.', viz: { m: 'detect', cap: 'The callback lands in the logs — the SOC sees it.' } },
    { say: '◈ OPERATION COMPLETE — recon to report, offence to defence. The whole board, in one run.' },
  ];

  let cursor = null, banner = null, running = false, stopFlag = false;

  function ensureCursor() {
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'mach-cursor';
      cursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7 18 2.5-7L20 10.5z" fill="#00c8ff" stroke="#021018" stroke-width="1"/></svg>';
      document.body.append(cursor);
    }
    cursor.style.display = 'block';
  }
  function hideCursor() { if (cursor) cursor.style.display = 'none'; }
  function moveCursor(x, y) {
    return new Promise((res) => { if (!cursor) return res(); cursor.style.left = x + 'px'; cursor.style.top = y + 'px'; setTimeout(res, 680); });
  }
  function clickPulse() { if (!cursor) return; cursor.classList.add('mach-cursor--click'); setTimeout(() => cursor.classList.remove('mach-cursor--click'), 320); }

  function showBanner() {
    if (banner) { banner.style.display = 'flex'; return; }
    banner = document.createElement('div'); banner.className = 'mach-banner';
    const dot = document.createElement('span'); dot.className = 'mach-banner__dot';
    const label = document.createElement('span'); label.className = 'mach-banner__label'; label.textContent = '◈ MACH RUN · OPERATION GLASS CANNON';
    const stop = document.createElement('button'); stop.className = 'mach-banner__stop'; stop.textContent = '■ STOP';
    stop.addEventListener('click', () => { stopFlag = true; window.DemoActions && window.DemoActions.stop(); });
    banner.append(dot, label, stop);
    document.body.append(banner);
  }
  function hideBanner() { if (banner) banner.style.display = 'none'; }

  function narrate(t) { if (window.Tutor && window.Tutor.demoSay) window.Tutor.demoSay(t); }

  function confirmStart() {
    return new Promise((resolve) => {
      const ov = document.createElement('div'); ov.className = 'demo-confirm';
      const box = document.createElement('div'); box.className = 'demo-confirm__box';
      const title = document.createElement('div'); title.className = 'demo-confirm__title'; title.textContent = 'MACH RUN — full automated operation';
      const body = document.createElement('div'); body.style.cssText = 'font-size:12px;color:#c8ffc8;line-height:1.6;margin:10px 0;';
      body.innerHTML = 'MOTHER will drive the whole deck end to end. It runs <b>one real command</b> in the Kali shell:';
      const pre = document.createElement('pre'); pre.className = 'demo-confirm__cmd'; pre.textContent = REAL_CMD;
      const note = document.createElement('div'); note.style.cssText = 'font-size:11px;color:rgba(133,255,133,0.6);margin-bottom:10px;';
      note.textContent = 'scanme.nmap.org is nmap’s sanctioned public scan target. Everything else is navigation, sample data, and narration — nothing else executes.';
      const row = document.createElement('div'); row.className = 'demo-confirm__row';
      const cancel = document.createElement('button'); cancel.className = 'demo-confirm__skip'; cancel.textContent = 'Cancel';
      const begin = document.createElement('button'); begin.className = 'demo-confirm__run'; begin.textContent = '▶ Begin';
      row.append(cancel, begin); box.append(title, body, pre, note, row); ov.append(box); document.body.append(ov);
      const done = (v) => { ov.remove(); resolve(v); };
      begin.addEventListener('click', () => done(true));
      cancel.addEventListener('click', () => done(false));
      ov.addEventListener('click', (e) => { if (e.target === ov) done(false); });
    });
  }

  async function run() {
    if (running || !window.DemoActions) return;
    const go = await confirmStart();
    if (!go) return;
    running = true; stopFlag = false;
    ensureCursor(); showBanner();
    if (window.Visualizer) window.Visualizer.show();
    await moveCursor(window.innerWidth / 2, 230);
    try {
      for (const beat of SCENE) {
        if (stopFlag) { narrate('— MACH RUN stopped —'); break; }
        if (beat.viz && window.Visualizer) window.Visualizer.set(beat.viz.m, beat.viz.cap);
        if (beat.step) {
          const s = beat.step;
          let rect = null;
          try { rect = await window.DemoActions.locate(s); } catch (e) { rect = null; }
          if (rect) { await moveCursor(rect.left + rect.width / 2, rect.top + rect.height / 2); clickPulse(); await sleep(200); }
          if (s.action === 'terminalExec') { await window.DemoActions.terminalExec(s.command); }
          else { await window.DemoActions.runStep(s); }
        }
        if (beat.say) { narrate(beat.say); await sleep(1600); } else { await sleep(700); }
        if (beat.wait) await sleep(beat.wait);
      }
    } catch (e) { console.error('[machrun]', e); }
    finally {
      running = false;
      hideCursor(); hideBanner();
      window.Visualizer && window.Visualizer.hide();
      window.DemoActions && window.DemoActions.hideRing && window.DemoActions.hideRing();
    }
  }

  window.MachRun = { run, isRunning: () => running, stop: () => { stopFlag = true; } };

  function wire() {
    const btn = document.getElementById('mach-run');
    if (btn && !btn.dataset.wired) { btn.dataset.wired = '1'; btn.addEventListener('click', run); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
