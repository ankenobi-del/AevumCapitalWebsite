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
      if (p > 0.6) { ctx.fillStyle = '#9a7a26'; ctx.globalAlpha = Math.min(1, (p - 0.6) * 3); ctx.fillText('Cash value', X(0.6), h * 0.62); ctx.globalAlpha = 1; }
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
      var w = pm.w, h = pm.h, top = 8, laneH = (h * 0.55) / 7, base = h - 6;
      pctx.clearRect(0, 0, w, h);
      var cyc = (clock % 9) / 7.5; // 0..1.2 then restart
      var tcur = Math.min(1, cyc);
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
      var floorY = base, ceilY = h * 0.62;
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
      pctx.font = '600 11.5px Onest, sans-serif'; pctx.fillStyle = 'rgba(232,236,243,0.65)';
      pctx.fillText('Policies maturing: ' + matured + ' / ' + N, 10, h * 0.62 - 10);
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
    var mkt = [], act = [], len = 220, mv = 0, vol = 1, shock = 0, shockLabel = 0, av = 0;
    for (var q = 0; q < len; q++) stepSignal();
    function stepSignal() {
      // market: mean-reverting random walk with volatility clustering and occasional drawdowns
      if (R2() < 0.012 && shock <= 0) { shock = 22; shockLabel = 1.6; }
      vol = 0.85 * vol + 0.15 * (0.6 + R2() * 1.6);
      var drift = shock > 0 ? -0.9 : 0.06;
      if (shock > 0) shock--;
      mv += drift + (R2() - 0.5) * 2.6 * vol - mv * 0.025;
      mkt.push(mv);
      // actuarial: maturities arrive at a steady statistical pace regardless of the market
      av += 0.35 + (R2() < 0.18 ? 1.4 : 0);
      act.push(av);
      if (mkt.length > len) { mkt.shift(); act.shift(); }
    }
    var acc = 0;
    var drawSig = function () {
      var w = sm.w, h = sm.h, mid = h * 0.5;
      sctx.clearRect(0, 0, w, h);
      // lane backgrounds
      sctx.fillStyle = 'rgba(255,255,255,0.03)'; sctx.fillRect(0, 0, w, mid - 8); sctx.fillRect(0, mid + 8, w, h - mid - 8);
      sctx.strokeStyle = 'rgba(255,255,255,0.06)'; sctx.lineWidth = 1;
      for (var g = 1; g < 6; g++) { var gx = (w * g) / 6; sctx.beginPath(); sctx.moveTo(gx, 0); sctx.lineTo(gx, h); sctx.stroke(); }
      var X = function (i) { return (i / (len - 1)) * w; };
      // market lane
      var mn = Math.min.apply(null, mkt), mx = Math.max.apply(null, mkt), span = Math.max(8, mx - mn);
      var MY = function (v) { return 18 + (1 - (v - mn) / span) * (mid - 44); };
      sctx.beginPath();
      mkt.forEach(function (v, i) { if (!i) sctx.moveTo(X(i), MY(v)); else sctx.lineTo(X(i), MY(v)); });
      sctx.strokeStyle = 'rgba(160,178,205,0.9)'; sctx.lineWidth = 1.6; sctx.stroke();
      // actuarial lane: rescale window to show steady slope
      var a0 = act[0], a1 = act[act.length - 1];
      var AY = function (v) { return h - 16 - ((v - a0) / Math.max(1, a1 - a0)) * (h - mid - 50); };
      var grad = sctx.createLinearGradient(0, mid, 0, h);
      grad.addColorStop(0, 'rgba(226,182,83,0.28)'); grad.addColorStop(1, 'rgba(226,182,83,0)');
      sctx.beginPath(); sctx.moveTo(0, h - 8);
      act.forEach(function (v, i) { sctx.lineTo(X(i), AY(v)); });
      sctx.lineTo(w, h - 8); sctx.closePath(); sctx.fillStyle = grad; sctx.fill();
      sctx.beginPath();
      act.forEach(function (v, i) { if (!i) sctx.moveTo(X(i), AY(v)); else sctx.lineTo(X(i), AY(v)); });
      sctx.strokeStyle = GOLD2; sctx.lineWidth = 2.2; sctx.stroke();
      // maturity events as dots
      for (var i = 1; i < act.length; i++) {
        if (act[i] - act[i - 1] > 1) { sctx.beginPath(); sctx.arc(X(i), AY(act[i]), 3, 0, 6.283); sctx.fillStyle = GOLD2; sctx.fill(); }
      }
      // heads
      var lx = X(len - 1);
      sctx.beginPath(); sctx.arc(lx - 2, MY(mkt[len - 1]), 4, 0, 6.283); sctx.fillStyle = '#c9d4e6'; sctx.fill();
      sctx.beginPath(); sctx.arc(lx - 2, AY(act[len - 1]), 4.5, 0, 6.283); sctx.fillStyle = GOLD2; sctx.fill();
      // labels
      sctx.font = '600 12px Onest, sans-serif';
      sctx.fillStyle = 'rgba(232,236,243,0.7)'; sctx.fillText('Equity & bond markets: driven by sentiment and cycles', 12, 16);
      sctx.fillStyle = GOLD2; sctx.fillText('Policy maturities: driven by actuarial outcomes', 12, mid + 26);
      if (shockLabel > 0) {
        sctx.globalAlpha = Math.min(1, shockLabel);
        sctx.fillStyle = 'rgba(255,140,120,0.95)'; sctx.font = '600 11px Onest, sans-serif';
        sctx.fillText('Market drawdown', lx - 112, MY(mkt[len - 1]) + 20);
        sctx.globalAlpha = 1;
      }
    };
    if (reduce) drawSig();
    else loop(sig, function (dt) {
      acc += dt; shockLabel = Math.max(0, shockLabel - dt * 0.5);
      while (acc > 0.05) { acc -= 0.05; stepSignal(); }
      drawSig();
    });
    window.addEventListener('resize', function () { sm = fitCanvas(sig); sctx = sm.ctx; drawSig(); });
  }

  /* ---------- CTA: gold star particle field ---------- */
  $$('.cta-canvas').forEach(function (cv) {
    var cmz = fitCanvas(cv), c = cmz.ctx, pts = [], R3 = rng(11), mouse = { x: -999, y: -999 };
    function star(t) { // four-point star outline, t in 0..1
      var a = t * Math.PI * 2, k = Math.pow(Math.abs(Math.cos(2 * a)), 6);
      var r = 0.18 + 0.82 * k;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    }
    function build() {
      pts = [];
      var n = Math.min(520, Math.round(cmz.w * cmz.h / 1500));
      for (var i = 0; i < n; i++) {
        var onStar = i < n * 0.55;
        var s = star(R3());
        var scale = Math.min(cmz.w, cmz.h) * 0.42 * (onStar ? (0.86 + R3() * 0.16) : 1);
        var hx = onStar ? cmz.w / 2 + s.x * scale : R3() * cmz.w;
        var hy = onStar ? cmz.h / 2 + s.y * scale : R3() * cmz.h;
        pts.push({ hx: hx, hy: hy, x: R3() * cmz.w, y: R3() * cmz.h, vx: 0, vy: 0, r: onStar ? 1 + R3() * 1.4 : 0.6 + R3() * 0.9, star: onStar, ph: R3() * 6.28 });
      }
    }
    build();
    cv.parentElement.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    cv.parentElement.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    var time = 0;
    function frame(dt) {
      time += dt;
      c.clearRect(0, 0, cmz.w, cmz.h);
      pts.forEach(function (p) {
        var tx = p.hx + Math.sin(time * 0.6 + p.ph) * (p.star ? 2 : 14), ty = p.hy + Math.cos(time * 0.5 + p.ph) * (p.star ? 2 : 14);
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 12000) { var f = (12000 - d2) / 12000 * 2.2; p.vx += dx / Math.sqrt(d2 + 1) * f; p.vy += dy / Math.sqrt(d2 + 1) * f; }
        p.vx += (tx - p.x) * 0.012; p.vy += (ty - p.y) * 0.012;
        p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx; p.y += p.vy;
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283);
        c.fillStyle = p.star ? 'rgba(226,182,83,' + (0.55 + 0.45 * Math.sin(time * 1.5 + p.ph) * 0.5 + 0.2) + ')' : 'rgba(232,236,243,0.18)';
        c.fill();
      });
    }
    if (reduce) { pts.forEach(function (p) { p.x = p.hx; p.y = p.hy; }); frame(0); }
    else loop(cv, frame);
    window.addEventListener('resize', function () { cmz = fitCanvas(cv); c = cmz.ctx; build(); });
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
    var yl = el('text', { x: 4, y: Y(0.86), class: 'axis-label' }, svg); yl.textContent = 'Coverage';
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
    var W2 = 600, H2 = 190, mid = 100, sc = 4.2, bw = (W2 - 40) / yrsN;
    var s2 = el('svg', { viewBox: '0 0 ' + W2 + ' ' + H2, role: 'img', 'aria-label': 'Illustration: index returns compared with credited growth that is floored at zero' }, iul);
    el('line', { x1: 20, x2: W2 - 20, y1: mid, y2: mid, stroke: 'rgba(11,31,58,0.25)' }, s2);
    var fl = el('text', { x: W2 - 20, y: mid - 6, 'text-anchor': 'end', class: 'axis-label', style: 'font-weight:600;fill:' + NAVY }, s2); fl.textContent = 'Floor';
    var bars = [];
    rets.forEach(function (r, i) {
      var x = 20 + i * bw + 3, w = bw - 6;
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
