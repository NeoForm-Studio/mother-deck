/* ═══════════════════════════════════════════════════════════════════════
   CONCEPT VISUALISER — two lenses for "what's happening":
     TECH (Phase B) — network diagram: nodes, port strip, packets.
     HOLO (Phase C) — a holographic layman metaphor: breaking into a building
                      (doors = ports; a tunnel back = the reverse shell), with
                      plain-language captions. Toggle in the panel header.
   Conceptual teaching animation — NOT live traffic. Driven by MACH RUN.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const W = 680, H = 184;
  const OPEN_PORTS = new Set([22, 80, 443]);
  const PORTS = [22, 80, 443, 3306, 8080];
  const DOORS = [22, 80, 443, 3306];   // building doors (holo)

  const C = { holo: '#00c8ff', amber: '#e8a63a', green: '#4bc46a', red: '#ff4433', dim: '#3a5a4a' };

  // Plain-language captions for the HOLO (layman) lens.
  const HOLO_CAP = {
    scan: 'Trying every door to see which ones are unlocked.',
    target: 'Marking the building — this is our way in.',
    payload: 'Preparing a hidden key that phones home.',
    revshell: 'We’re inside — a secret tunnel opens back to us.',
    detect: 'The guard spots the tunnel — alarm raised!',
    link: 'Us on the left, the target building on the right.',
  };

  let panel, capEl, canvas, ctx, dpr, raf, techToggle, holoToggle;
  let lens = localStorage.getItem('mother.viz.lens') || 'tech';
  let mode = 'link', techCap = '', packets = [], lit = new Set(), lastSpawn = 0, t0 = 0;

  const A = { x: 78, y: H / 2 + 4 };
  const T = { x: W - 96, y: H / 2 + 4 };

  function ensure() {
    if (panel) return;
    panel = document.createElement('div'); panel.className = 'viz-panel';
    const head = document.createElement('div'); head.className = 'viz-head';
    const title = document.createElement('span'); title.innerHTML = '<span class="viz-head__dot"></span> CONCEPT · WHAT’S HAPPENING';
    const lensWrap = document.createElement('div'); lensWrap.className = 'viz-lens';
    techToggle = document.createElement('button'); techToggle.className = 'viz-lens__btn'; techToggle.textContent = 'Tech';
    holoToggle = document.createElement('button'); holoToggle.className = 'viz-lens__btn'; holoToggle.textContent = 'Holo';
    lensWrap.append(techToggle, holoToggle);
    head.append(title, lensWrap);
    capEl = document.createElement('div'); capEl.className = 'viz-caption';
    canvas = document.createElement('canvas'); canvas.className = 'viz-canvas';
    panel.append(head, capEl, canvas); document.body.append(panel);
    dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    techToggle.addEventListener('click', () => setLens('tech'));
    holoToggle.addEventListener('click', () => setLens('holo'));
    setLens(lens);
    t0 = performance.now();
    if (!raf) loop(performance.now());
  }

  function setLens(l) {
    lens = l; localStorage.setItem('mother.viz.lens', l);
    if (techToggle) techToggle.classList.toggle('viz-lens__btn--on', l === 'tech');
    if (holoToggle) holoToggle.classList.toggle('viz-lens__btn--on', l === 'holo');
    updateCaption();
  }
  function updateCaption() { if (capEl) capEl.textContent = lens === 'holo' ? (HOLO_CAP[mode] || techCap) : techCap; }

  function show() { ensure(); panel.classList.add('viz-panel--on'); }
  function hide() { if (panel) panel.classList.remove('viz-panel--on'); }
  function set(m, caption) {
    ensure();
    mode = m || 'link'; techCap = caption || '';
    if (m === 'target' || m === 'link') lit = new Set();
    if (m === 'revshell') packets.push({ dir: -1, prog: 0, y: 0, big: true });
    updateCaption();
  }

  function loop(now) { (lens === 'holo' ? drawHolo : drawTech)(now); raf = requestAnimationFrame(loop); }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ── TECH lens (network diagram) ──────────────────────────────────── */
  function node(x, y, label, sub, accent) {
    const w = 78, h = 40;
    ctx.save(); rrect(x - w / 2, y - h / 2, w, h, 5);
    ctx.fillStyle = 'rgba(7,16,7,0.9)'; ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 1.2; ctx.shadowColor = accent; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = accent; ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center'; ctx.fillText(label, x, y - 2);
    ctx.fillStyle = 'rgba(200,255,200,0.6)'; ctx.font = '8px Courier New'; ctx.fillText(sub, x, y + 10); ctx.restore();
  }
  function drawTech(now) {
    const t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = 'rgba(51,255,51,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(A.x + 40, A.y); ctx.lineTo(T.x - 46, T.y); ctx.stroke(); ctx.restore();
    PORTS.forEach((p, i) => {
      const py = T.y - 30 + i * 15, px = T.x + 44, isOpen = OPEN_PORTS.has(p), on = lit.has(p);
      ctx.fillStyle = on ? C.green : (isOpen ? 'rgba(75,196,106,0.35)' : C.dim);
      if (on) { ctx.shadowColor = C.green; ctx.shadowBlur = 6; }
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = on ? C.green : 'rgba(133,255,133,0.4)'; ctx.font = '8px Courier New'; ctx.textAlign = 'left'; ctx.fillText(String(p), px + 7, py + 3);
    });
    if (mode === 'scan' && now - lastSpawn > 260) { lastSpawn = now; packets.push({ dir: 1, prog: 0, y: (Math.random() - 0.5) * 16, port: PORTS[((now / 260) | 0) % PORTS.length] }); }
    if (mode === 'revshell' && now - lastSpawn > 500) { lastSpawn = now; packets.push({ dir: -1, prog: 0, y: 0 }); }
    const x1 = A.x + 40, x2 = T.x - 46;
    packets = packets.filter((pk) => {
      pk.prog += pk.big ? 0.018 : 0.03;
      if (pk.prog >= 1) { if (pk.dir === 1 && pk.port && OPEN_PORTS.has(pk.port)) lit.add(pk.port); return false; }
      const f = pk.dir === 1 ? pk.prog : 1 - pk.prog, x = x1 + (x2 - x1) * f, y = A.y + pk.y, col = pk.dir === 1 ? C.holo : C.amber;
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 7; ctx.beginPath(); ctx.arc(x, y, pk.big ? 3.5 : 2.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; return true;
    });
    if (mode === 'revshell') {
      ctx.save(); ctx.strokeStyle = C.amber; ctx.lineWidth = 1.4; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 20; ctx.shadowColor = C.amber; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.moveTo(x2, T.y + 14); ctx.lineTo(x1, A.y + 14); ctx.stroke();
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x1, A.y + 14); ctx.lineTo(x1 + 8, A.y + 10); ctx.lineTo(x1 + 8, A.y + 18); ctx.closePath(); ctx.fillStyle = C.amber; ctx.fill(); ctx.restore();
    }
    node(A.x, A.y, 'ATTACKER', 'kali · 10.10.14.7', mode === 'payload' || mode === 'revshell' ? C.amber : C.holo);
    node(T.x, T.y, 'TARGET', '10.10.10.15', mode === 'detect' ? C.red : C.green);
    if (mode === 'target') { const r = 26 + Math.sin(t * 4) * 3; ctx.save(); ctx.strokeStyle = C.holo; ctx.lineWidth = 1; ctx.shadowColor = C.holo; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(T.x, T.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(T.x - r - 5, T.y); ctx.lineTo(T.x - r + 6, T.y); ctx.moveTo(T.x + r - 6, T.y); ctx.lineTo(T.x + r + 5, T.y); ctx.moveTo(T.x, T.y - r - 5); ctx.lineTo(T.x, T.y - r + 6); ctx.moveTo(T.x, T.y + r - 6); ctx.lineTo(T.x, T.y + r + 5); ctx.stroke(); ctx.restore(); }
    if (mode === 'payload') { ctx.save(); const pulse = 0.5 + 0.5 * Math.sin(t * 5); ctx.globalAlpha = 0.6 + pulse * 0.4; rrect(A.x - 26, A.y - 40, 52, 16, 3); ctx.strokeStyle = C.amber; ctx.stroke(); ctx.fillStyle = C.amber; ctx.font = 'bold 8px Courier New'; ctx.textAlign = 'center'; ctx.fillText('◆ PAYLOAD', A.x, A.y - 29); ctx.restore(); }
    if (mode === 'detect') { const blink = Math.sin(t * 6) > 0; ctx.save(); ctx.globalAlpha = blink ? 1 : 0.35; ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(T.x, T.y - 44); ctx.lineTo(T.x - 9, T.y - 30); ctx.lineTo(T.x + 9, T.y - 30); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#021018'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center'; ctx.fillText('!', T.x, T.y - 32); ctx.fillStyle = C.red; ctx.font = '8px Courier New'; ctx.fillText('LOGGED', T.x, T.y - 48); ctx.restore(); }
  }

  /* ── HOLO lens (layman metaphor: breaking into a building) ────────── */
  function projector(cx, baseY, topY) {
    ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = C.holo; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 22, baseY); ctx.lineTo(cx, topY); ctx.lineTo(cx + 22, baseY); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(cx, baseY, 26, 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function drawHolo(now) {
    const t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
    const bob = Math.sin(t * 1.3) * 3;
    const baseY = H - 14;
    const ax = 92, ay = H / 2 + bob;
    const bx = W - 150, bw = 96, bh = 84, byTop = H / 2 - bh / 2 + bob;

    projector(ax, baseY, ay + 18); projector(bx + bw / 2, baseY, byTop);

    // ── the "US" figure (attacker) — a little holo person
    ctx.save(); ctx.strokeStyle = C.holo; ctx.fillStyle = C.holo; ctx.lineWidth = 1.4; ctx.shadowColor = C.holo; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(ax, ay - 14, 6, 0, Math.PI * 2); ctx.stroke();                      // head
    ctx.beginPath(); ctx.moveTo(ax, ay - 8); ctx.lineTo(ax, ay + 8); ctx.stroke();                // body
    ctx.beginPath(); ctx.moveTo(ax - 8, ay - 2); ctx.lineTo(ax + 8, ay - 2); ctx.stroke();        // arms
    ctx.beginPath(); ctx.moveTo(ax, ay + 8); ctx.lineTo(ax - 7, ay + 20); ctx.moveTo(ax, ay + 8); ctx.lineTo(ax + 7, ay + 20); ctx.stroke(); // legs
    ctx.shadowBlur = 0; ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'center'; ctx.fillText('US', ax, ay + 34); ctx.restore();

    // ── the building (target) — wireframe with doors
    ctx.save();
    ctx.strokeStyle = mode === 'detect' ? C.red : C.holo; ctx.lineWidth = 1.4;
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 7;
    ctx.fillStyle = mode === 'detect' ? 'rgba(255,68,51,0.06)' : 'rgba(0,200,255,0.06)';
    ctx.beginPath(); ctx.rect(bx, byTop, bw, bh); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - 4, byTop); ctx.lineTo(bx + bw / 2, byTop - 20); ctx.lineTo(bx + bw + 4, byTop); ctx.stroke(); // roof
    ctx.shadowBlur = 0;
    // doors (= ports)
    DOORS.forEach((p, i) => {
      const dw = 15, dh = 26, dx = bx + 8 + i * (dw + 6), dy = byTop + bh - dh - 4;
      const open = OPEN_PORTS.has(p), on = lit.has(p);
      ctx.strokeStyle = on ? C.green : (open ? 'rgba(75,196,106,0.6)' : 'rgba(0,200,255,0.4)');
      ctx.lineWidth = 1.2; if (on) { ctx.shadowColor = C.green; ctx.shadowBlur = 7; }
      ctx.strokeRect(dx, dy, dw, dh);
      if (on) { ctx.fillStyle = 'rgba(75,196,106,0.25)'; ctx.fillRect(dx, dy, dw, dh); }        // open door glows
      ctx.shadowBlur = 0;
      ctx.fillStyle = on ? C.green : 'rgba(133,255,133,0.4)'; ctx.font = '7px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(String(p), dx + dw / 2, dy + dh + 8);
    });
    ctx.fillStyle = mode === 'detect' ? C.red : C.holo; ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'center'; ctx.fillText('THE TARGET', bx + bw / 2, byTop - 26); ctx.restore();

    // ── scan: knocks on the doors; open ones light up
    if (mode === 'scan') {
      const doorX = bx + 8 + 7, sweep = (t * 1.3) % (DOORS.length + 1);
      DOORS.forEach((p, i) => {
        if (Math.abs(sweep - i) < 0.5 && OPEN_PORTS.has(p)) lit.add(p);
      });
      const f = (t * 0.9) % 1, kx = ax + 14 + (bx - ax - 14) * f;
      ctx.save(); ctx.fillStyle = C.holo; ctx.shadowColor = C.holo; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(kx, ay, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // ── target: reticle over the building
    if (mode === 'target') {
      const cx = bx + bw / 2, cy = byTop + bh / 2, r = 52 + Math.sin(t * 4) * 3;
      ctx.save(); ctx.strokeStyle = C.holo; ctx.lineWidth = 1; ctx.shadowColor = C.holo; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      [[-r - 4, 0, -r + 8, 0], [r - 8, 0, r + 4, 0], [0, -r - 4, 0, -r + 8], [0, r - 8, 0, r + 4]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(cx + a, cy + b); ctx.lineTo(cx + c, cy + d); ctx.stroke(); }); ctx.restore();
    }

    // ── payload: a glowing key at US
    if (mode === 'payload') {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.save(); ctx.globalAlpha = 0.6 + pulse * 0.4; ctx.strokeStyle = C.amber; ctx.fillStyle = C.amber; ctx.lineWidth = 1.4; ctx.shadowColor = C.amber; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(ax, ay - 40, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ay - 34); ctx.lineTo(ax, ay - 24); ctx.moveTo(ax, ay - 28); ctx.lineTo(ax + 5, ay - 28); ctx.stroke();
      ctx.shadowBlur = 0; ctx.font = 'bold 8px Courier New'; ctx.textAlign = 'center'; ctx.fillText('KEY', ax + 22, ay - 38); ctx.restore();
    }

    // ── revshell: a glowing tunnel from the building back to US
    if (mode === 'revshell') {
      const sx = bx + 12, sy = byTop + bh - 16, ex = ax + 10, ey = ay + 6;
      ctx.save(); ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.shadowColor = C.amber; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + ex) / 2, sy + 26, ex, ey); ctx.stroke();
      // particles flowing back to US
      for (let k = 0; k < 3; k++) {
        const f = ((t * 0.6 + k / 3) % 1);
        const mx = (1 - f) * (1 - f) * sx + 2 * (1 - f) * f * ((sx + ex) / 2) + f * f * ex;
        const my = (1 - f) * (1 - f) * sy + 2 * (1 - f) * f * (sy + 26) + f * f * ey;
        ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.arc(mx, my, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.fillStyle = C.amber; ctx.font = 'bold 8px Courier New'; ctx.textAlign = 'center'; ctx.fillText('SECRET TUNNEL', (sx + ex) / 2, sy + 40); ctx.restore();
    }

    // ── detect: alarm on the building
    if (mode === 'detect') {
      const blink = Math.sin(t * 6) > 0;
      ctx.save(); ctx.globalAlpha = blink ? 1 : 0.3; ctx.fillStyle = C.red; ctx.shadowColor = C.red; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(bx + bw / 2, byTop - 30, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = 'bold 8px Courier New'; ctx.textAlign = 'center'; ctx.fillText('⚠ ALARM', bx + bw / 2, byTop - 40); ctx.restore();
    }
  }

  window.Visualizer = { show, hide, set, setLens };
})();
