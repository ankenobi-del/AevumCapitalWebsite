/* Aevum Capital — finance visualizations.
   All charts are conceptual illustrations of mechanics described in the copy;
   none depict actual or projected performance, and each is labeled so on the page. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NAVY = '#0b1f3a', NAVY3 = '#1d3a66', GOLD = '#c9a74a', GOLD2 = '#e2b653', MUTED = '#8a909b';
  var SVGNS = 'http://www.w3.org/2000/svg';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function onView(node, cb, opts) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting, e); }); }, opts || { threshold: 0.25 });
    io.observe(node);
    return io;
  }
  function once(node, cb, threshold) {
    var done = false;
    var io = onView(node, function (vis) { if (vis && !done) { done = true; cb(); if (io) io.disconnect(); } }, { threshold: threshold || 0.3 });
  }
  function money(n) {
    var a = Math.abs(n);
    var s = a >= 1e6 ? '$' + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M' : '$' + Math.round(a / 1000).toLocaleString('en-US') + 'K';
    return (n < 0 ? '−' : '') + s;
  }
  function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }
  function fitCanvas(c) {
    var r = c.getBoundingClientRect(), d = dpr();
    c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d));
    var ctx = c.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }
  // deterministic PRNG so illustrations look the same for every visitor
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // animation loop that only runs while visible
  function loop(node, frame) {
    var running = false, raf = 0, last = 0;
    function tick(t) { var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t; frame(dt, t / 1000); if (running) raf = requestAnimationFrame(tick); }
    onView(node, function (vis) {
      if (vis && !running) { running = true; last = 0; raf = requestAnimationFrame(tick); }
      else if (!vis && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0 });
  }

  /* ---------- stroke draw-in for any svg [data-draw] ---------- */
  $$('[data-draw]').forEach(function (svg) {
    $$('.ln', svg).forEach(function (p) {
      var L = p.getTotalLength ? p.getTotalLength() : 1000;
      p.style.strokeDasharray = L; p.style.strokeDashoffset = reduce ? 0 : L;
    });
    once(svg, function () { svg.classList.add('in'); $$('.ln', svg).forEach(function (p) { p.style.strokeDashoffset = 0; }); }, 0.4);
  });

  /* ---------- value ladder explainer ---------- */
  var ladder = $('.ladder');
  if (ladder) {
    var steps = $$('.xstep');
    var mobile = window.matchMedia('(max-width: 900px)');
    var setStep = function (n) { ladder.setAttribute('data-step', n); steps.forEach(function (s, i) { s.classList.toggle('is-active', i === n - 1); }); };
    if (reduce) setStep(3);
    else if (mobile.matches) {
      once(ladder, function () { setStep(1); setTimeout(function () { setStep(2); }, 1600); setTimeout(function () { setStep(3); }, 3200); }, 0.5);
    } else {
      steps.forEach(function (s, i) {
        onView(s, function (vis) { if (vis) setStep(i + 1); }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      });
      once(ladder, function () { if (ladder.getAttribute('data-step') === '0') setStep(1); }, 0.5);
    }
  }

  /* ---------- solutions: whole-life style mini chart (light card) ---------- */
  var covMini = $('#mini-coverage');
  if (covMini) {
    var cm = fitCanvas(covMini), ctx = cm.ctx, t0 = null;
    var drawCov = function (p) {
      var w = cm.w, h = cm.h, pad = 10;
      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = 'rgba(11,31,58,0.06)'; ctx.lineWidth = 1;
      for (var g = 1; g < 4; g++) { ctx.beginPath(); ctx.moveTo(pad, h * g / 4); ctx.lineTo(w - pad, h * g / 4); ctx.stroke(); }
      var X = function (u) { return pad + u * (w - pad * 2); };
      var dbY = h * 0.22;
      // death benefit line (lifelong)
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, X(p), h); ctx.clip();
      ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(X(0), dbY); ctx.lineTo(X(1), dbY); ctx.stroke();
      // cash value curve with area
      var grad = ctx.createLinearGradient(0, h * 0.3, 0, h);
      grad.addColorStop(0, 'rgba(201,167,74,0.35)'); grad.addColorStop(1, 'rgba(201,167,74,0)');
      ctx.beginPath(); ctx.moveTo(X(0), h - pad);
      for (var i = 0; i <= 60; i++) { var u = i / 60; ctx.lineTo(X(u), h - pad - (h - pad - dbY - 8) * Math.pow(u, 1.7)); }
      ctx.lineTo(X(1), h - pad); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      for (var j = 0; j <= 60; j++) { var v = j / 60; var y = h - pad - (h - pad - dbY - 8) * Math.pow(v, 1.7); if (!j) ctx.moveTo(X(v), y); else ctx.lineTo(X(v), y); }
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
      // labels
      ctx.font = '600 12px Onest, sans-serif'; ctx.fillStyle = NAVY; ctx.fillText('Death benefit', X(0), dbY - 10);
      if (p > 0.7) { var cu = 0.66, cy = h - pad - (h - pad - dbY - 8) * Math.pow(cu, 1.7); ctx.fillStyle = '#8a6a1c'; ctx.globalAlpha = Math.min(1, (p - 0.7) * 4); ctx.fillText('Cash value', X(cu) + 6, cy + 24); ctx.globalAlpha = 1; }
      // head dot
      var hu = Math.min(p, 1), hy = h - pad - (h - pad - dbY - 8) * Math.pow(hu, 1.7);
      ctx.beginPath(); ctx.arc(X(hu), hy, 5, 0, 6.283); ctx.fillStyle = GOLD; ctx.fill();
      ctx.beginPath(); ctx.arc(X(hu), hy, 10 + 3 * Math.sin(Date.now() / 300), 0, 6.283); ctx.strokeStyle = 'rgba(201,167,74,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    };
    if (reduce) drawCov(1);
    else {
      var prog = 0;
      once(covMini, function () {
        loop(covMini, function (dt) { prog = Math.min(1, prog + dt / 2.4); drawCov(1 - Math.pow(1 - prog, 3)); });
      });
      drawCov(0);
    }
    window.addEventListener('resize', function () { cm = fitCanvas(covMini); ctx = cm.ctx; drawCov(1); });
  }

  /* ---------- solutions: policy portfolio maturities (dark card) ---------- */
  var port = $('#mini-portfolio');
  if (port) {
    var pm = fitCanvas(port), pctx = pm.ctx, R = rng(7), N = 28, pol = [];
    // each policy: lane position + maturity time on a 0..1 horizon (bell-ish, centered)
    for (var k = 0; k < N; k++) {
      var m = 0.15 + 0.7 * ((R() + R() + R()) / 3);
      pol.push({ m: m, lane: k % 7, x: R(), size: 0.6 + R() * 0.5 });
    }
    pol.sort(function (a, b) { return a.m - b.m; });
    var clock = 0;
    var drawPort = function () {
      var w = pm.w, h = pm.h, top = 26, laneH = (h * 0.56 - top) / 7, base = h - 6;
      pctx.clearRect(0, 0, w, h);
      var cyc = (clock % 9) / 7.5; // 0..1.2 then restart
      var tcur = Math.min(1, cyc);
      pctx.globalAlpha = cyc > 1.08 ? Math.max(0, 1 - (cyc - 1.08) / 0.1) : Math.min(1, cyc / 0.04);
      // policies as tokens
      var matured = 0;
      pol.forEach(function (p) {
        var x = 10 + p.m * (w - 20), y = top + p.lane * laneH + laneH / 2;
        var done = tcur >= p.m;
        if (done) matured++;
        pctx.beginPath();
        var r = 4.2 * p.size + (done ? 1.2 : 0);
        pctx.arc(x, y, r, 0, 6.283);
        pctx.fillStyle = done ? GOLD2 : 'rgba(255,255,255,0.22)';
        pctx.fill();
        if (done && tcur - p.m < 0.06) {
          var a = 1 - (tcur - p.m) / 0.06;
          pctx.beginPath(); pctx.arc(x, y, r + 10 * (1 - a), 0, 6.283);
          pctx.strokeStyle = 'rgba(226,182,83,' + a + ')'; pctx.lineWidth = 1.5; pctx.stroke();
        }
      });
      // time cursor
      var cx = 10 + tcur * (w - 20);
      pctx.strokeStyle = 'rgba(255,255,255,0.25)'; pctx.setLineDash([3, 4]); pctx.lineWidth = 1;
      pctx.beginPath(); pctx.moveTo(cx, top); pctx.lineTo(cx, base); pctx.stroke(); pctx.setLineDash([]);
      // cumulative proceeds step line
      var floorY = base, ceilY = h * 0.64;
      pctx.beginPath(); pctx.moveTo(10, floorY);
      var c = 0;
      pol.forEach(function (p) {
        if (p.m > tcur) return;
        var x = 10 + p.m * (w - 20);
        pctx.lineTo(x, floorY - (floorY - ceilY) * (c / N));
        c++;
        pctx.lineTo(x, floorY - (floorY - ceilY) * (c / N));
      });
      pctx.lineTo(cx, floorY - (floorY - ceilY) * (c / N));
      pctx.strokeStyle = GOLD2; pctx.lineWidth = 2.2; pctx.stroke();
      // expected schedule (dashed smooth)
      pctx.beginPath();
      for (var i = 0; i <= 50; i++) {
        var u = i / 50, z = (u - 0.5) / 0.16, cdf = 0.5 * (1 + erf(z / Math.SQRT2));
        var yy = floorY - (floorY - ceilY) * cdf;
        if (!i) pctx.moveTo(10 + u * (w - 20), yy); else pctx.lineTo(10 + u * (w - 20), yy);
      }
      pctx.strokeStyle = 'rgba(255,255,255,0.28)'; pctx.setLineDash([4, 5]); pctx.lineWidth = 1.2; pctx.stroke(); pctx.setLineDash([]);
      pctx.globalAlpha = 1;
      pctx.font = '600 11.5px Onest, sans-serif'; pctx.fillStyle = 'rgba(232,236,243,0.65)';
      pctx.fillText('Policies matured: ' + matured + ' / ' + N, 10, 13);
    };
    if (reduce) { clock = 7.5; drawPort(); }
    else loop(port, function (dt) { clock += dt; drawPort(); });
    window.addEventListener('resize', function () { pm = fitCanvas(port); pctx = pm.ctx; drawPort(); });
  }
  function erf(x) { var s = x < 0 ? -1 : 1; x = Math.abs(x); var t = 1 / (1 + 0.3275911 * x); var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }

  /* ---------- uncorrelated signal (two independent drivers) ---------- */
  var sig = $('#signal');
  if (sig) {
    var sm = fitCanvas(sig), sctx = sm.ctx, R2 = rng(42);
    var mkt = [], act = [], shk = [], len = 200, mv = 0, vol = 1, shock = 0, av = 0;
    var STEP = 0.07, acc = 0, matured = 0, drawdownA = 0;
    var view = null; // eased axis ranges so the chart never snaps when samples scroll off
    function stepSignal() {
      // market: mean-reverting random walk with volatility clustering and occasional drawdowns
      if (R2() < 0.012 && shock <= 0) shock = 22;
      vol = 0.85 * vol + 0.15 * (0.6 + R2() * 1.6);
      var drift = shock > 0 ? -0.9 : 0.06;
      mkt.push(mv += drift + (R2() - 0.5) * 2.6 * vol - mv * 0.025);
      shk.push(shock > 0); if (shock > 0) shock--;
      // actuarial: maturities arrive at a steady statistical pace regardless of the market
      var hit = R2() < 0.18; if (hit) matured++;
      act.push(av += 0.35 + (hit ? 1.4 : 0));
      if (mkt.length > len + 1) { mkt.shift(); act.shift(); shk.shift(); }
    }
    for (var q = 0; q < len + 1; q++) stepSignal();
    function ranges() {
      var mn = Infinity, mx = -Infinity;
      for (var i = 0; i < mkt.length; i++) { if (mkt[i] < mn) mn = mkt[i]; if (mkt[i] > mx) mx = mkt[i]; }
      var pad = Math.max(4, (mx - mn) * 0.12);
      return { mn: mn - pad, mx: mx + pad, a0: act[0], a1: act[act.length - 1] };
    }
    function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    function pill(c, txt, x, y, fg, bg) {
      c.font = '600 11px Onest, sans-serif';
      var tw = c.measureText(txt).width, pw = tw + 20;
      rr(c, x - pw, y - 10, pw, 20, 10); c.fillStyle = bg; c.fill();
      c.fillStyle = fg; c.textAlign = 'right'; c.fillText(txt, x - 10, y + 4); c.textAlign = 'left';
    }
    var drawSig = function (dt) {
      var w = sm.w, h = sm.h, gap = 14, head = 30, laneH = (h - gap) / 2, frac = acc / STEP;
      var tr = ranges();
      if (!view) view = tr;
      var k = dt ? Math.min(1, dt * 2.5) : 1;
      for (var key in tr) view[key] += (tr[key] - view[key]) * k;
      sctx.clearRect(0, 0, w, h);
      var X = function (i) { return ((i - frac) / (len - 1)) * w; };
      var lanes = [{ y: 0, label: 'Equity & bond markets', sub: 'sentiment and cycles', col: 'rgba(196,208,226,0.95)' },
                   { y: laneH + gap, label: 'Policy maturities', sub: 'actuarial outcomes', col: GOLD2 }];
      lanes.forEach(function (L) {
        rr(sctx, 0, L.y, w, laneH, 14); sctx.fillStyle = 'rgba(255,255,255,0.035)'; sctx.fill();
        sctx.strokeStyle = 'rgba(255,255,255,0.07)'; sctx.lineWidth = 1; sctx.stroke();
        sctx.beginPath(); sctx.arc(16, L.y + 18, 4, 0, 6.283); sctx.fillStyle = L.col; sctx.fill();
        sctx.font = '600 12.5px Onest, sans-serif'; sctx.fillStyle = '#fff'; sctx.fillText(L.label, 28, L.y + 22);
        var lw = sctx.measureText(L.label).width;
        sctx.font = '500 12px Onest, sans-serif'; sctx.fillStyle = 'rgba(232,236,243,0.5)';
        if (w > 380) sctx.fillText('· ' + L.sub, 34 + lw, L.y + 22);
      });
      // ---- market lane
      var mTop = head + 6, mBot = laneH - 12;
      var MY = function (v) { return mTop + (1 - (v - view.mn) / Math.max(1, view.mx - view.mn)) * (mBot - mTop); };
      sctx.save(); rr(sctx, 0, 0, w, laneH, 14); sctx.clip();
      sctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (var g = 1; g < 6; g++) { var gx = (w * g) / 6; sctx.beginPath(); sctx.moveTo(gx, mTop); sctx.lineTo(gx, mBot); sctx.stroke(); }
      // drawdown bands
      sctx.fillStyle = 'rgba(255,120,100,0.10)';
      for (var i = 0, st = -1; i <= shk.length; i++) {
        if (i < shk.length && shk[i]) { if (st < 0) st = i; }
        else if (st >= 0) { sctx.fillRect(X(st), mTop - 4, X(i - 1) - X(st), mBot - mTop + 8); st = -1; }
      }
      sctx.beginPath();
      for (i = 0; i < mkt.length; i++) { var x = X(i), y = MY(mkt[i]); if (!i) sctx.moveTo(x, y); else sctx.lineTo(x, y); }
      sctx.lineJoin = 'round'; sctx.strokeStyle = 'rgba(196,208,226,0.95)'; sctx.lineWidth = 1.6; sctx.stroke();
      var hx = X(mkt.length - 1), hy = MY(mkt[mkt.length - 1]);
      sctx.beginPath(); sctx.arc(hx - 3, hy, 4, 0, 6.283); sctx.fillStyle = '#dfe6f2'; sctx.fill();
      sctx.restore();
      // ---- maturity lane
      var oy = laneH + gap, aTop = oy + head + 8, aBot = oy + laneH - 10;
      var AY = function (v) { return aBot - ((v - view.a0) / Math.max(1, view.a1 - view.a0)) * (aBot - aTop); };
      sctx.save(); rr(sctx, 0, oy, w, laneH, 14); sctx.clip();
      var grad = sctx.createLinearGradient(0, aTop, 0, aBot);
      grad.addColorStop(0, 'rgba(226,182,83,0.30)'); grad.addColorStop(1, 'rgba(226,182,83,0)');
      sctx.beginPath(); sctx.moveTo(X(0), aBot + 10);
      for (i = 0; i < act.length; i++) sctx.lineTo(X(i), AY(act[i]));
      sctx.lineTo(X(act.length - 1), aBot + 10); sctx.closePath(); sctx.fillStyle = grad; sctx.fill();
      sctx.beginPath();
      for (i = 0; i < act.length; i++) { if (!i) sctx.moveTo(X(i), AY(act[i])); else sctx.lineTo(X(i), AY(act[i])); }
      sctx.strokeStyle = GOLD2; sctx.lineWidth = 2.2; sctx.stroke();
      sctx.fillStyle = GOLD2;
      for (i = 1; i < act.length; i++) if (act[i] - act[i - 1] > 1) { sctx.beginPath(); sctx.arc(X(i), AY(act[i]), 2.6, 0, 6.283); sctx.fill(); }
      var ax = X(act.length - 1), ay = AY(act[act.length - 1]);
      var pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
      sctx.beginPath(); sctx.arc(ax - 3, ay, 8 + pulse * 4, 0, 6.283); sctx.fillStyle = 'rgba(226,182,83,' + (0.18 - pulse * 0.1) + ')'; sctx.fill();
      sctx.beginPath(); sctx.arc(ax - 3, ay, 4.5, 0, 6.283); sctx.fillStyle = GOLD2; sctx.fill();
      sctx.restore();
      // status pills live in the header row, never on the plot
      var inShock = shk[shk.length - 1] || shk[shk.length - 8];
      drawdownA += ((inShock ? 1 : 0) - drawdownA) * (dt ? Math.min(1, dt * 4) : 1);
      if (drawdownA > 0.02 && w > 330) { sctx.globalAlpha = drawdownA; pill(sctx, 'Drawdown', w - 10, 18, '#ffb3a6', 'rgba(255,120,100,0.16)'); sctx.globalAlpha = 1; }
      if (w > 330) pill(sctx, 'Steady pace', w - 10, oy + 18, GOLD2, 'rgba(226,182,83,0.14)');
    };
    if (reduce) drawSig(0);
    else loop(sig, function (dt) {
      acc += dt;
      while (acc >= STEP) { acc -= STEP; stepSignal(); }
      drawSig(dt);
    });
    window.addEventListener('resize', function () { sm = fitCanvas(sig); sctx = sm.ctx; drawSig(0); });
  }

  /* ---------- CTA: gold star constellation (kept clear of the copy) ---------- */
  $$('.cta-canvas').forEach(function (cv) {
    var host = cv.parentElement, cmz, c, R3, mouse = { x: -9999, y: -9999 }, dust = [], pts = [], clear = { x0: 0, y0: 0, x1: 0, y1: 0 }, centers = [];
    function sprite(rgb) {
      var s = document.createElement('canvas'); s.width = s.height = 48;
      var g = s.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.18, 'rgba(' + rgb + ',0.85)'); gr.addColorStop(0.45, 'rgba(' + rgb + ',0.18)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 48, 48); return s;
    }
    var GS = sprite('246,208,120'), WS = sprite('214,224,240');
    function starPt(t) { // four-point star outline (concave sides like the logo mark)
      var a = t * Math.PI * 2, k = Math.pow(Math.abs(Math.cos(2 * a)), 5);
      var r = 0.16 + 0.84 * k;
      return { x: Math.cos(a - Math.PI / 2) * r, y: Math.sin(a - Math.PI / 2) * r };
    }
    function measure() {
      var cr = cv.getBoundingClientRect(), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, rg = document.createRange();
      Array.prototype.forEach.call(host.children, function (ch) {
        if (ch === cv) return;
        var rects = [];
        if (ch.classList.contains('hero-actions')) rects = Array.prototype.map.call(ch.children, function (b) { return b.getBoundingClientRect(); });
        else { rg.selectNodeContents(ch); rects = [rg.getBoundingClientRect()]; }
        rects.forEach(function (r) { if (!r.width) return; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
      });
      // text rects include reveal offsets; that is fine, the pad absorbs them
      clear = { x0: x0 - cr.left - 36, y0: y0 - cr.top - 30, x1: x1 - cr.left + 36, y1: y1 - cr.top + 40 };
    }
    function build() {
      cmz = fitCanvas(cv); c = cmz.ctx; R3 = rng(11); measure();
      var w = cmz.w, h = cmz.h, side = Math.min(clear.x0, w - clear.x1);
      centers = [];
      if (side > 150) {
        var s = Math.min(side * 0.3, h * 0.2, 90);
        centers.push({ x: clear.x0 / 2, y: h * 0.46, s: s * 0.72, ph: 0 }, { x: (clear.x1 + w) / 2, y: h * 0.54, s: s, ph: 2 });
      } else if (clear.y0 > 120) {
        centers.push({ x: w / 2, y: clear.y0 * 0.52, s: Math.min(clear.y0 * 0.3, 52), ph: 0 });
      }
      pts = [];
      centers.forEach(function (ce) {
        var n = Math.round(Math.min(90, 30 + ce.s * 0.6));
        for (var i = 0; i < n; i++) pts.push({ ce: ce, t: R3(), sp: (0.012 + R3() * 0.02) * (R3() < 0.5 ? 1 : -1), off: 1.08 + R3() * 0.35, size: 3 + R3() * 6, ph: R3() * 6.28 });
      });
      dust = [];
      var nd = Math.round(Math.min(160, w * h / 6000));
      for (var d = 0; d < nd; d++) dust.push({ x: R3() * w, y: R3() * h, v: 4 + R3() * 10, size: 3 + R3() * 5, ph: R3() * 6.28, gold: R3() < 0.3 });
    }
    // crisp four-point star like the logo mark: concave sides via quadratic curves
    function starPath(cx, cy, R, rot) {
      var r = R * 0.16;
      c.beginPath();
      for (var i = 0; i <= 4; i++) {
        var a = -Math.PI / 2 + rot + i * Math.PI / 2, tx = cx + Math.cos(a) * R, ty = cy + Math.sin(a) * R;
        if (!i) { c.moveTo(tx, ty); continue; }
        var ca = a - Math.PI / 4; c.quadraticCurveTo(cx + Math.cos(ca) * r, cy + Math.sin(ca) * r, tx, ty);
      }
      c.closePath();
    }
    // 0 inside the copy's box, rising to 1 a little outside it
    function fade(x, y) {
      var dx = Math.max(clear.x0 - x, 0, x - clear.x1), dy = Math.max(clear.y0 - y, 0, y - clear.y1);
      return Math.min(1, Math.hypot(dx, dy) / 60);
    }
    host.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    host.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    var time = 0, par = { x: 0, y: 0 };
    function frame(dt) {
      time += dt;
      var w = cmz.w, h = cmz.h;
      c.clearRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter';
      dust.forEach(function (p) {
        p.y -= p.v * dt; if (p.y < -10) { p.y = h + 10; }
        var a = fade(p.x, p.y) * (0.25 + 0.2 * Math.sin(time * 1.3 + p.ph));
        if (a < 0.02) return;
        c.globalAlpha = a; c.drawImage(p.gold ? GS : WS, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
      var mx = mouse.x > -9000 ? (mouse.x / w - 0.5) : 0, my = mouse.y > -9000 ? (mouse.y / h - 0.5) : 0;
      par.x += (mx - par.x) * Math.min(1, dt * 3); par.y += (my - par.y) * Math.min(1, dt * 3);
      centers.forEach(function (ce) {
        var br = 1 + 0.035 * Math.sin(time * 0.9 + ce.ph), rot = Math.sin(time * 0.3 + ce.ph) * 0.06;
        var cx = ce.x + par.x * 18, cy = ce.y + par.y * 14, R = ce.s * br;
        // halo
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.5 + 0.12 * Math.sin(time * 1.1 + ce.ph);
        var hs = R * 2.6; c.drawImage(GS, cx - hs / 2, cy - hs / 2, hs, hs);
        // long thin flare across the star
        c.globalAlpha = 0.22; c.drawImage(GS, cx - R * 2.2, cy - 1.5, R * 4.4, 3); c.drawImage(GS, cx - 1.5, cy - R * 2.2, 3, R * 4.4);
        // body
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        starPath(cx, cy, R, rot);
        var g = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        g.addColorStop(0, '#fff1c8'); g.addColorStop(0.45, '#e2b653'); g.addColorStop(1, '#9c7a26');
        c.fillStyle = g; c.fill();
        // facet highlight: lighter upper-left half
        c.save(); starPath(cx, cy, R, rot); c.clip();
        c.beginPath(); c.moveTo(cx - R * 2, cy - R * 2); c.lineTo(cx + R * 2, cy - R * 2); c.lineTo(cx - R * 2, cy + R * 2); c.closePath();
        c.fillStyle = 'rgba(255,250,230,0.22)'; c.fill(); c.restore();
        ce.cx = cx; ce.cy = cy; ce.R = R; ce.rot = rot;
      });
      // sparks orbiting the outline
      c.globalCompositeOperation = 'lighter';
      pts.forEach(function (p) {
        var ce = p.ce; p.t = (p.t + p.sp * dt * 6 + 1) % 1;
        var q = starPt(p.t), cs = Math.cos(ce.rot), sn = Math.sin(ce.rot), o = p.off + 0.05 * Math.sin(time * 2 + p.ph);
        var x = ce.cx + (q.x * cs - q.y * sn) * ce.R * o, y = ce.cy + (q.x * sn + q.y * cs) * ce.R * o;
        var a = (0.45 + 0.55 * Math.sin(time * 2.2 + p.ph)) * fade(x, y);
        if (a < 0.03) return;
        c.globalAlpha = a; c.drawImage(GS, x - p.size / 2, y - p.size / 2, p.size, p.size);
      });
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    build();
    if (reduce) frame(0);
    else loop(cv, frame);
    // copy finishes revealing after load; re-measure so the clear zone matches final layout
    var rb = null;
    var rebuild = function () { clearTimeout(rb); rb = setTimeout(function () { build(); if (reduce) frame(0); }, 120); };
    window.addEventListener('resize', rebuild);
    window.addEventListener('load', rebuild);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  });

  /* ---------- lifecycle track (life settlements) ---------- */
  var track = $('.track');
  if (track) {
    var cards = $$('.track-cards .card', track), nodes = [], token = $('.track-token', track);
    var lineFill = $('.track-fill', track);
    cards.forEach(function (cd, i) {
      var n = document.createElement('i'); n.className = 'track-node';
      n.style.left = ((i + 0.5) / cards.length * 100) + '%';
      track.appendChild(n); nodes.push(n);
    });
    var apply = function (p) {
      var pos = 0.125 + 0.75 * p, x = pos * track.clientWidth;
      if (token) token.style.transform = 'translateX(' + x + 'px) rotate(' + (Math.sin(p * 20) * 4) + 'deg)';
      if (lineFill) lineFill.setAttribute('x2', (pos * 100) + '%');
      cards.forEach(function (cd, i) {
        var lit = pos >= (i + 0.5) / cards.length - 0.01;
        cd.classList.toggle('is-lit', lit); nodes[i].classList.toggle('is-lit', lit);
      });
    };
    if (reduce || !window.AEVUM || !AEVUM.ST) apply(1);
    else {
      apply(0);
      AEVUM.ST.create({ trigger: track, start: 'top 75%', end: 'bottom 45%', scrub: 0.6, onUpdate: function (s) { apply(s.progress); } });
    }
  }

  /* ---------- lapse grid (insurer pricing vs secondary market) ---------- */
  var lg = $('.lapse-grid');
  if (lg) {
    var R4 = rng(3), cells = [];
    for (var z = 0; z < 100; z++) {
      var i = document.createElement('i');
      var l = R4() < 0.42; // illustrative share, not a statistic; no number is displayed
      if (l) i.className = 'is-l';
      i.style.setProperty('--d', (R4() * 0.5).toFixed(2) + 's');
      lg.appendChild(i); cells.push(i);
    }
    var caps = {
      inforce: 'A book of in-force life insurance policies, each with a contractual death benefit.',
      lapse: 'Insurers price for a significant share of policies to lapse or be surrendered before maturity, which becomes their profit.',
      market: 'When those policies are sold on the secondary market instead, the buyer keeps them in force and captures that value.'
    };
    var capEl = $('.lapse-caption'), btns = $$('[data-lapse]');
    var setMode = function (m) {
      lg.setAttribute('data-mode', m);
      if (capEl) capEl.textContent = caps[m];
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lapse') === m ? 'true' : 'false'); });
    };
    var order = ['inforce', 'lapse', 'market'], idx = 0, timer = null, userSet = false;
    btns.forEach(function (b) { b.addEventListener('click', function () { userSet = true; clearInterval(timer); setMode(b.getAttribute('data-lapse')); }); });
    setMode('inforce');
    if (!reduce) onView(lg, function (vis) {
      if (vis && !timer && !userSet) timer = setInterval(function () { idx = (idx + 1) % 3; setMode(order[idx]); }, 3200);
      else if (!vis && timer) { clearInterval(timer); timer = null; }
    }, { threshold: 0.3 });
    else setMode('market');
  }

  /* ---------- settlement math calculator ---------- */
  var calc = $('#calc');
  if (calc) {
    var inp = { face: $('#c-face'), buy: $('#c-buy'), prem: $('#c-prem'), yrs: $('#c-yrs') };
    var out = { face: $('#o-face'), buy: $('#o-buy'), prem: $('#o-prem'), yrs: $('#o-yrs'), mult: $('#o-mult'), cost: $('#o-cost'), spread: $('#o-spread'), irr: $('#o-irr'), paid: $('#o-paid') };
    var chart = $('#calc-chart');
    var shown = { mult: 0 };
    var irr = function (flows) {
      var npv = function (r) { var s = 0; for (var i = 0; i < flows.length; i++) s += flows[i] / Math.pow(1 + r, i); return s; };
      var lo = -0.99, hi = 3;
      if (npv(lo) * npv(hi) > 0) return null;
      for (var k = 0; k < 120; k++) { var mid = (lo + hi) / 2; if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid; }
      return (lo + hi) / 2;
    };
    var paint = function (r) { var p = (r.value - r.min) / (r.max - r.min) * 100; r.style.setProperty('--p', p + '%'); };
    var drawChart = function (face, buy, prem, yrs) {
      if (!chart) return;
      chart.innerHTML = '';
      var W = 600, H = 150, n = yrs + 1, gap = 4, bw = (W - gap * (n - 1)) / n;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', width: '100%', height: '100%' }, chart);
      var max = face, cum = buy;
      for (var y = 0; y < n; y++) {
        var isEnd = y === yrs;
        if (!isEnd) cum += prem;
        var val = isEnd ? face : cum;
        var bh = Math.max(2, (val / max) * (H - 18));
        var r = el('rect', { x: y * (bw + gap), y: H - bh, width: bw, height: bh, rx: Math.min(4, bw / 3), fill: isEnd ? GOLD2 : (y === 0 ? '#5e7aa6' : 'rgba(255,255,255,0.22)') }, svg);
        if (!reduce) { r.style.transformOrigin = 'center bottom'; r.style.transformBox = 'fill-box'; r.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 700, delay: y * 35, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }); }
      }
      var costH = (cum / max) * (H - 18);
      el('line', { x1: 0, x2: W, y1: H - costH, y2: H - costH, stroke: 'rgba(255,255,255,0.35)', 'stroke-dasharray': '4 5', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }, svg);
    };
    var tween = function (elx, to, fmtf) {
      if (reduce || !window.AEVUM || !AEVUM.gsap) { elx.textContent = fmtf(to); return; }
      var o = { v: parseFloat(elx.getAttribute('data-v') || to) };
      AEVUM.gsap.to(o, { v: to, duration: 0.6, ease: 'power3.out', onUpdate: function () { elx.textContent = fmtf(o.v); } });
      elx.setAttribute('data-v', to);
    };
    var update = function () {
      var face = +inp.face.value, buyPct = +inp.buy.value, premPct = +inp.prem.value, yrs = +inp.yrs.value;
      var buy = face * buyPct / 100, prem = face * premPct / 100;
      var paid = prem * yrs, cost = buy + paid, spread = face - cost, mult = face / cost;
      var flows = [-(buy + prem)];
      for (var y = 1; y < yrs; y++) flows.push(-prem);
      flows.push(face);
      var r = irr(flows);
      out.face.textContent = money(face);
      out.buy.textContent = buyPct + '% · ' + money(buy);
      out.prem.textContent = premPct.toFixed(1) + '% · ' + money(prem) + '/yr';
      out.yrs.textContent = yrs + (yrs === 1 ? ' year' : ' years');
      tween(out.mult, mult, function (v) { return v.toFixed(2) + '×'; });
      out.cost.textContent = money(cost);
      out.paid.textContent = money(paid);
      out.spread.textContent = money(spread);
      out.spread.style.color = spread < 0 ? '#ff9a8a' : '';
      out.irr.textContent = r === null ? 'n/a' : (r * 100).toFixed(1) + '%';
      [inp.face, inp.buy, inp.prem, inp.yrs].forEach(paint);
      drawChart(face, buy, prem, yrs);
    };
    var deb = null;
    [inp.face, inp.buy, inp.prem, inp.yrs].forEach(function (r) { r.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(update, 16); }); });
    once(calc, update, 0.2);
    [inp.face, inp.buy, inp.prem, inp.yrs].forEach(paint);
  }

  /* ---------- coverage over time: term vs permanent ---------- */
  var cov = $('#coverage-chart');
  if (cov) {
    var W = 760, H = 300, L = 46, Rr = 16, T = 24, B = 36, years = 50;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Illustration of coverage over time for term and permanent life insurance' }, cov);
    var X = function (y) { return L + (y / years) * (W - L - Rr); };
    var Y = function (v) { return T + (1 - v) * (H - T - B); };
    for (var gy = 0; gy <= 4; gy++) el('line', { x1: L, x2: W - Rr, y1: Y(gy / 4), y2: Y(gy / 4), stroke: 'rgba(11,31,58,0.07)' }, svg);
    for (var yy = 0; yy <= years; yy += 10) { var tx = el('text', { x: X(yy), y: H - 12, 'text-anchor': 'middle', class: 'axis-label' }, svg); tx.textContent = yy === 0 ? 'Policy start' : 'Yr ' + yy; }
    var yl = el('text', { x: L, y: 12, class: 'axis-label', style: 'font-weight:600' }, svg); yl.textContent = 'Coverage';
    var defs = el('defs', {}, svg);
    var g1 = el('linearGradient', { id: 'gTerm', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': NAVY3, 'stop-opacity': 0.35 }, g1); el('stop', { offset: '1', 'stop-color': NAVY3, 'stop-opacity': 0.02 }, g1);
    var g2 = el('linearGradient', { id: 'gCash', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': GOLD, 'stop-opacity': 0.45 }, g2); el('stop', { offset: '1', 'stop-color': GOLD, 'stop-opacity': 0.02 }, g2);
    var termArea = el('path', { fill: 'url(#gTerm)' }, svg);
    var termLine = el('path', { fill: 'none', stroke: NAVY3, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    var cashArea = el('path', { fill: 'url(#gCash)' }, svg);
    var permLine = el('path', { fill: 'none', stroke: NAVY, 'stroke-width': 3 }, svg);
    var cashLine = el('path', { fill: 'none', stroke: GOLD, 'stroke-width': 3 }, svg);
    var endTag = el('g', {}, svg);
    var endLine = el('line', { y1: Y(0.96), y2: H - B, stroke: 'rgba(11,31,58,0.3)', 'stroke-dasharray': '3 4' }, endTag);
    var endTxt = el('text', { y: Y(0.96) - 6, 'text-anchor': 'middle', class: 'axis-label', style: 'font-weight:600;fill:' + NAVY3 }, endTag);
    var state = { term: 20, show: 'term', k: 0 };
    var termPath = function (yrsT, k) {
      var lvl = 0.78, e = Math.min(yrsT, years) * k;
      return { line: 'M' + X(0) + ' ' + Y(lvl) + ' L' + X(e) + ' ' + Y(lvl) + (k >= 1 ? ' L' + X(e) + ' ' + Y(0) + ' L' + X(years) + ' ' + Y(0) : ''),
               area: 'M' + X(0) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(lvl) + ' L' + X(e) + ' ' + Y(lvl) + ' L' + X(e) + ' ' + Y(0) + 'Z' };
    };
    var permPaths = function (k) {
      var lvl = 0.66, e = years * k, d = 'M' + X(0) + ' ' + Y(lvl) + ' L' + X(e) + ' ' + Y(lvl);
      var c = '', a = 'M' + X(0) + ' ' + Y(0);
      for (var i = 0; i <= 60; i++) { var u = (i / 60) * k, yv = 0.6 * Math.pow(u, 1.55); c += (i ? ' L' : 'M') + X(u * years) + ' ' + Y(yv); a += ' L' + X(u * years) + ' ' + Y(yv); }
      a += ' L' + X(e) + ' ' + Y(0) + 'Z';
      return { perm: d, cash: c, area: a };
    };
    var render = function () {
      var k = state.k, t = termPath(state.term, state.show === 'term' ? k : 0), p = permPaths(state.show === 'perm' ? k : 0);
      termLine.setAttribute('d', state.show === 'term' ? t.line : 'M0 0');
      termArea.setAttribute('d', state.show === 'term' ? t.area : 'M0 0');
      permLine.setAttribute('d', state.show === 'perm' ? p.perm : 'M0 0');
      cashLine.setAttribute('d', state.show === 'perm' ? p.cash : 'M0 0');
      cashArea.setAttribute('d', state.show === 'perm' ? p.area : 'M0 0');
      endTag.style.opacity = state.show === 'term' && k >= 1 ? 1 : 0;
      endLine.setAttribute('x1', X(state.term)); endLine.setAttribute('x2', X(state.term));
      endTxt.setAttribute('x', X(state.term)); endTxt.textContent = state.term + '-year term ends';
    };
    var animateTo = function () {
      if (reduce) { state.k = 1; render(); return; }
      var st = performance.now();
      (function f(n) { state.k = Math.min(1, (n - st) / 1100); state.k = 1 - Math.pow(1 - state.k, 3); render(); if (state.k < 1) requestAnimationFrame(f); })(st);
    };
    var cbtns = $$('[data-cov]'), legend = $('#coverage-legend');
    cbtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-cov');
        if (v === 'perm') state.show = 'perm'; else { state.show = 'term'; state.term = +v; }
        cbtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (legend) legend.setAttribute('data-show', state.show);
        animateTo();
      });
    });
    render();
    once(cov, animateTo, 0.4);
  }

  /* ---------- process timeline (about) ---------- */
  var tl = $('.timeline');
  if (tl) {
    var fill = $('.timeline__fill', tl), items = $$('.tl-item', tl);
    var lightTo = function (p) {
      if (fill) fill.style.transform = 'scaleY(' + p + ')';
      var railTop = tl.getBoundingClientRect().top, h = tl.clientHeight;
      items.forEach(function (it) { var c = (it.getBoundingClientRect().top - railTop + 36) / h; it.classList.toggle('is-lit', p >= c - 0.01); });
    };
    if (reduce || !window.AEVUM || !AEVUM.ST) lightTo(1);
    else AEVUM.ST.create({ trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: 0.5, onUpdate: function (s) { lightTo(s.progress); } });
  }

  /* ---------- IUL floor illustration ---------- */
  var iul = $('#iul-chart');
  if (iul) {
    var R5 = rng(19), yrsN = 16, rets = [];
    for (var a = 0; a < yrsN; a++) rets.push(Math.round(((R5() - 0.36) * 34)) / 1);
    var W2 = 600, H2 = 190, mid = 100, sc = 4.2, GL = 66, bw = (W2 - GL - 8) / yrsN;
    var s2 = el('svg', { viewBox: '0 0 ' + W2 + ' ' + H2, role: 'img', 'aria-label': 'Illustration: index returns compared with credited growth that is floored at zero' }, iul);
    el('line', { x1: GL - 6, x2: W2 - 8, y1: mid, y2: mid, stroke: 'rgba(11,31,58,0.3)', 'stroke-dasharray': '3 4' }, s2);
    var fl = el('text', { x: GL - 12, y: mid + 4, 'text-anchor': 'end', class: 'axis-label', style: 'font-weight:600;fill:' + NAVY }, s2); fl.textContent = '0% floor';
    var bars = [];
    rets.forEach(function (r, i) {
      var x = GL + i * bw + 3, w = bw - 6;
      var idx = el('rect', { x: x, width: w / 2 - 1, y: r >= 0 ? mid - r * sc : mid, height: Math.abs(r) * sc, rx: 2, fill: r >= 0 ? 'rgba(29,58,102,0.35)' : 'rgba(214,92,74,0.55)' }, s2);
      var cr = Math.max(0, r);
      var cred = el('rect', { x: x + w / 2 + 1, width: w / 2 - 1, y: mid - cr * sc, height: Math.max(1.5, cr * sc), rx: 2, fill: GOLD }, s2);
      bars.push(idx, cred);
    });
    if (!reduce) {
      bars.forEach(function (b) { b.style.transformBox = 'fill-box'; b.style.transformOrigin = b.getAttribute('fill') && b.getAttribute('fill').indexOf('214,92') > -1 ? 'center top' : 'center bottom'; b.style.transform = 'scaleY(0)'; });
      once(iul, function () { bars.forEach(function (b, i) { b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 800, delay: Math.floor(i / 2) * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }); }); }, 0.4);
    }
  }
})();
