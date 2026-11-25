/* Aevum Capital — core interactions: nav, smooth scroll, reveals, counters.
   Everything degrades: without GSAP/Lenis the page is fully readable. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  window.AEVUM = window.AEVUM || {};
  AEVUM.reduce = reduce;

  /* ---------- preloader ---------- */
  var pre = document.querySelector('.preload');
  function donePreload() { if (pre) pre.classList.add('is-done'); }
  window.addEventListener('load', function () { setTimeout(donePreload, 250); });
  setTimeout(donePreload, 2600); // never block content

  document.querySelectorAll('.yr').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ---------- header ---------- */
  var header = document.querySelector('.site-header');
  function onScrollHeader() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.nav-menu a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('nav-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- rolling button letters ---------- */
  document.querySelectorAll('[data-roll]').forEach(function (el) {
    var label = el.querySelector('.label');
    if (!label) return;
    var text = label.textContent.trim();
    var roll = document.createElement('span');
    roll.className = 'roll';
    roll.setAttribute('aria-hidden', 'true');
    for (var r = 0; r < 2; r++) {
      var row = document.createElement('span');
      row.className = 'roll__row';
      for (var i = 0; i < text.length; i++) {
        var ch = document.createElement('span');
        ch.className = 'roll__ch';
        ch.style.setProperty('--i', i);
        ch.textContent = text[i];
        row.appendChild(ch);
      }
      roll.appendChild(row);
    }
    label.classList.add('sr-only');
    label.parentNode.insertBefore(roll, label);
  });

  /* ---------- counters (used with or without GSAP) ---------- */
  function fmt(n, dec) { return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function runCounter(el) {
    var to = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var pre = el.getAttribute('data-pre') || '';
    var suf = el.getAttribute('data-suf') || '';
    if (reduce) { el.textContent = pre + fmt(to, dec) + suf; return; }
    var t0 = null, dur = 1800;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + fmt(to * e, dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  } else counters.forEach(runCounter);

  /* ---------- contact form → composed email ---------- */
  var form = document.querySelector('#inquiry');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      var d = new FormData(form);
      var lines = [
        'Name: ' + d.get('name'),
        'Email: ' + d.get('email'),
        'Phone: ' + (d.get('phone') || '-'),
        'Area of interest: ' + (d.get('interest') || '-'),
        'Investor status: ' + (d.get('status') || '-'),
        '',
        (d.get('message') || '')
      ];
      var subject = 'Consultation inquiry: ' + (d.get('interest') || 'General') + ' (' + d.get('name') + ')';
      var href = 'mailto:chris@aevumcapital.llc?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      var status = form.querySelector('.form-status');
      if (status) status.textContent = 'Opening your email app with your inquiry ready to send…';
      window.location.href = href;
    });
  }

  if (!hasGsap) { AEVUM.ready = true; document.dispatchEvent(new Event('aevum:ready')); return; }

  /* ================= GSAP layer ================= */
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  AEVUM.gsap = gsap; AEVUM.ST = ST;

  /* smooth scroll */
  if (!reduce && typeof window.Lenis !== 'undefined') {
    var lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
    AEVUM.lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -80 }); }
      });
    });
  }

  if (reduce) { AEVUM.ready = true; document.dispatchEvent(new Event('aevum:ready')); return; }

  doc.classList.add('anim');

  /* split headings into masked words */
  document.querySelectorAll('[data-split]').forEach(function (h) {
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.textContent = part;
            w.appendChild(inner); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (n.classList.contains('serif') || n.tagName === 'EM') {
            // keep styled phrase intact, wrap as one word block per word
            walk(n);
          } else walk(n);
        }
      });
    };
    walk(h);
    var words = h.querySelectorAll('.w > span');
    var inHero = !!h.closest('.hero');
    var play = function () { gsap.to(words, { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.045, delay: inHero ? 0.55 : 0 }); };
    if (inHero) play();
    else {
      var hio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { hio.disconnect(); play(); } }, { rootMargin: '0px 0px -10% 0px' });
      hio.observe(h);
    }
  });

  /* generic reveals, batched for stagger */
  // IntersectionObserver (not scroll math) so fast flings and anchor jumps can never strand hidden copy
  var revealIO = new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { revealIO.unobserve(e.target); return e.target; });
    if (batch.length) gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { if (!el.closest('.hero')) revealIO.observe(el); });
  // hero reveals fire on load
  var heroReveals = document.querySelectorAll('.hero [data-reveal]');
  if (heroReveals.length) gsap.to(heroReveals, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, delay: 0.7 });

  /* subtle parallax on [data-parallax] */
  document.querySelectorAll('[data-parallax]').forEach(function (el) {
    var amt = parseFloat(el.getAttribute('data-parallax')) || 60;
    gsap.fromTo(el, { y: amt }, { y: -amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* safety: if a trigger never fires, reveal everything after 4s of idleness on load */
  window.addEventListener('load', function () {
    ST.refresh();
    setTimeout(function () {
      document.querySelectorAll('[data-reveal]').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && getComputedStyle(el).opacity === '0') gsap.to(el, { opacity: 1, y: 0, duration: 0.8 });
      });
    }, 4000);
  });

  AEVUM.ready = true;
  document.dispatchEvent(new Event('aevum:ready'));
})();
