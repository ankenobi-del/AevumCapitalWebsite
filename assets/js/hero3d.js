/* Aevum Capital — isometric 3D hero scene (Three.js).
   Variants (data-variant on .hero-canvas): star | shield | policy | columns.
   Transparent canvas over the cream page, no post-processing: glow is done with
   unlit emissive tubes + soft halo sprites so the page background is untouched. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.querySelector('.hero-canvas');
if (host) init(host);

function init(host) {
  const variant = host.dataset.variant || 'star';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 900px)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  const maxPR = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.6);
  let pr = maxPR;
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // refreshed on a cadence in the loop
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 300);
  const world = new THREE.Group();
  scene.add(world);

  /* ---------- palette & materials ---------- */
  const C = {
    navy: new THREE.Color('#0b1f3a'), navy3: new THREE.Color('#1d3a66'),
    gold: new THREE.Color('#d6b157'), goldHot: new THREE.Color('#ffd77a'),
    porcelain: new THREE.Color('#fbfaf7'), sand: new THREE.Color('#ece7dd')
  };
  const M = {
    porcelain: new THREE.MeshPhysicalMaterial({ color: C.porcelain, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    tile: new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.42, metalness: 0 }),
    gold: new THREE.MeshPhysicalMaterial({ color: C.gold, metalness: 1, roughness: 0.22, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
    goldSatin: new THREE.MeshPhysicalMaterial({ color: '#c9a74a', metalness: 0.95, roughness: 0.38 }),
    navyGlass: new THREE.MeshPhysicalMaterial({ color: '#0f2a55', metalness: 0.35, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08 }),
    navySolid: new THREE.MeshPhysicalMaterial({ color: C.navy3, metalness: 0.2, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.42 }),
    ink: new THREE.MeshBasicMaterial({ color: '#0b1f3a', transparent: true, opacity: 0.18 }),
    glow: new THREE.MeshBasicMaterial({ color: C.goldHot, toneMapped: false }),
    glowSoft: new THREE.MeshBasicMaterial({ color: '#f1c766', transparent: true, opacity: 0.22, toneMapped: false, depthWrite: false })
  };

  /* ---------- helpers ---------- */
  const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,224,150,1)'); gr.addColorStop(0.25, 'rgba(242,196,90,0.55)'); gr.addColorStop(1, 'rgba(242,196,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const halo = (scale, opacity = 0.9) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity, depthWrite: false, toneMapped: false }));
    s.scale.setScalar(scale); return s;
  };
  function starShape(R, r) {
    const s = new THREE.Shape();
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI / 2 + i * Math.PI / 2;
      const tip = [Math.cos(a) * R, Math.sin(a) * R];
      if (i === 0) { s.moveTo(tip[0], tip[1]); continue; }
      const ca = a - Math.PI / 4;
      s.quadraticCurveTo(Math.cos(ca) * r, Math.sin(ca) * r, tip[0], tip[1]);
    }
    return s;
  }
  const extrude = (shape, depth, bevel = 0.06) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 5, curveSegments: 48 });
    g.center(); return g;
  };

  /* ---------- floor: hatch texture + shadow catcher ---------- */
  {
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(512, 512, 60, 512, 512, 512);
    rg.addColorStop(0, 'rgba(255,255,255,0.75)'); rg.addColorStop(0.7, 'rgba(255,255,255,0.25)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024);
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = 'rgba(11,31,58,0.08)'; g.lineWidth = 1.2;
    for (let i = -1024; i < 2048; i += 14) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 1024, 1024); g.stroke(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.001; world.add(floor);
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.ShadowMaterial({ opacity: 0.11 }));
    catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; world.add(catcher);
  }

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight('#ffffff', '#e9e3d6', 1.1));
  const key = new THREE.DirectionalLight('#fff6e6', 2.4);
  key.position.set(9, 16, 7); key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 1536, small ? 1024 : 1536);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  key.shadow.radius = 6; key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#a9c2ff', 0.8); rim.position.set(-10, 6, -8); scene.add(rim);

  /* ---------- object layout ---------- */
  // placed in screen terms (sx = across, d = toward camera) then mapped to world x/z
  const S2 = Math.SQRT1_2;
  const at = (sx, d) => new THREE.Vector3((sx + d) * S2, 0, (d - sx) * S2);
  const spots = {
    coins: at(-5.4, 4.2),
    chart: at(3.0, 8.2),
    bars: at(7.0, -0.6),
    doc: at(-4.2, -5.8)
  };
  const anim = []; // per-frame updaters (t, dt)

  /* ---------- tiles ---------- */
  {
    const geo = new RoundedBoxGeometry(1.7, 0.2, 1.7, 3, 0.12);
    const cells = [];
    let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let x = -11; x <= 11; x += 2.1) for (let z = -11; z <= 11; z += 2.1) {
      const d = Math.hypot(x, z);
      if (d < 5.6 || d > 12.5) continue;
      if (Object.values(spots).some(s => Math.hypot(s.x - x, s.z - z) < 2.4)) continue;
      if (rnd() < (small ? 0.5 : 0.62)) continue;
      cells.push({ x, z, ph: rnd() * 6.28, h: rnd() < 0.18 ? 0.35 : 0 });
    }
    const inst = new THREE.InstancedMesh(geo, M.tile, cells.length);
    inst.castShadow = false; inst.receiveShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    world.add(inst);
    anim.push((t) => {
      cells.forEach((c, i) => { p.set(c.x, 0.1 + c.h + Math.sin(t * 0.9 + c.ph) * 0.06, c.z); m4.compose(p, q, sc); inst.setMatrixAt(i, m4); });
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  /* ---------- central platform + segmented ring ---------- */
  const center = new THREE.Group(); world.add(center);
  {
    const base = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.75, 0.5, 96), M.porcelain));
    base.position.y = 0.25; center.add(base);
    const step = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.75, 0.22, 96), M.porcelain));
    step.position.y = 0.61; center.add(step);
    // glowing inlay ring
    const inlay = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.035, 12, 160), M.glow);
    inlay.rotation.x = Math.PI / 2; inlay.position.y = 0.51; center.add(inlay);
    const inlayHalo = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.16, 12, 160), M.glowSoft);
    inlayHalo.rotation.x = Math.PI / 2; inlayHalo.position.y = 0.51; center.add(inlayHalo);

    // segmented navy-glass ring (three arcs with gaps)
    const ringG = new THREE.Group(); ringG.position.y = 0.72; center.add(ringG);
    const segs = [[0.15, 2.0], [2.25, 4.15], [4.4, 6.08]];
    segs.forEach(([a0, a1]) => {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, 3.55, a0, a1, false);
      sh.absarc(0, 0, 2.75, a1, a0, true);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 5, curveSegments: 64 });
      const m = shadowy(new THREE.Mesh(g, M.navyGlass));
      m.rotation.x = -Math.PI / 2; ringG.add(m);
    });
    anim.push((t) => { ringG.rotation.y = t * 0.12; });

    // orbiting gold beads on the ring
    const beads = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), M.glow);
      const h = halo(0.9, 0.8); b.add(h); center.add(b); beads.push(b);
    }
    anim.push((t) => beads.forEach((b, i) => { const a = -t * 0.5 + i * 2.094; b.position.set(Math.cos(a) * 3.15, 1.52, Math.sin(a) * 3.15); }));
  }

  /* ---------- centerpiece by variant ---------- */
  const hero = new THREE.Group(); hero.position.y = 2.75; center.add(hero);
  const heroHalo = halo(5.5, 0.55); heroHalo.position.y = 0; hero.add(heroHalo);
  if (variant === 'star') {
    const star = shadowy(new THREE.Mesh(extrude(starShape(2.05, 0.24), 0.32, 0.08), M.gold));
    hero.add(star);
    const star2 = new THREE.Mesh(extrude(starShape(0.55, 0.07), 0.12, 0.03), M.gold);
    star2.position.set(2.2, 1.4, 0.4); hero.add(star2);
    anim.push((t) => { star.rotation.y = t * 0.55; star2.rotation.y = -t * 1.2; star2.position.y = 1.4 + Math.sin(t * 1.4) * 0.15; });
  } else if (variant === 'shield') {
    const sh = new THREE.Shape();
    sh.moveTo(0, 1.9); sh.bezierCurveTo(0.7, 1.55, 1.25, 1.6, 1.65, 1.6);
    sh.bezierCurveTo(1.7, 0.2, 1.3, -1.1, 0, -2.0);
    sh.bezierCurveTo(-1.3, -1.1, -1.7, 0.2, -1.65, 1.6);
    sh.bezierCurveTo(-1.25, 1.6, -0.7, 1.55, 0, 1.9);
    const shield = shadowy(new THREE.Mesh(extrude(sh, 0.5, 0.12), M.navySolid));
    const emblem = new THREE.Mesh(extrude(starShape(0.95, 0.12), 0.16, 0.04), M.gold);
    emblem.position.z = 0.42; shield.add(emblem);
    const rimG = new THREE.Mesh(extrude(sh, 0.08, 0.02), M.goldSatin); rimG.scale.set(1.07, 1.05, 1); rimG.position.z = -0.24; shield.add(rimG);
    hero.add(shield);
    anim.push((t) => { shield.rotation.y = Math.sin(t * 0.5) * 0.7; });
  } else if (variant === 'policy') {
    const stack = new THREE.Group(); hero.add(stack);
    for (let i = 0; i < 4; i++) {
      const sheet = shadowy(new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.08, 3.3, 2, 0.04), M.porcelain));
      sheet.position.set(i * 0.05, -1.2 + i * 0.12, -i * 0.04); sheet.rotation.y = i * 0.05; stack.add(sheet);
    }
    const top = stack.children[3];
    for (let l = 0; l < 6; l++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(l === 0 ? 1.3 : 1.9 - (l % 2) * 0.5, 0.02, 0.09), M.ink);
      line.position.set(-0.25 + (l === 0 ? -0.3 : 0), 0.05, -1.15 + l * 0.32); top.add(line);
    }
    const seal = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 64), M.gold));
    seal.position.set(0.7, 0.0, 1.0); stack.add(seal);
    const sealStar = new THREE.Mesh(extrude(starShape(0.4, 0.05), 0.06, 0.02), M.goldSatin);
    sealStar.rotation.x = -Math.PI / 2; sealStar.position.y = 0.1; seal.add(sealStar);
    stack.rotation.x = 0.5; stack.position.y = 1.5; stack.scale.setScalar(0.92);
    anim.push((t) => { stack.rotation.y = Math.sin(t * 0.4) * 0.5 - 0.3; seal.rotation.y = t * 0.8; });
  } else { // columns
    const temple = new THREE.Group(); temple.position.y = -1.25; temple.scale.setScalar(0.82); hero.add(temple);
    const stepsGeo = [[4.2, 0.22, 2.2], [3.8, 0.22, 1.9]];
    stepsGeo.forEach((s, i) => { const m = shadowy(new THREE.Mesh(new RoundedBoxGeometry(s[0], s[1], s[2], 2, 0.05), M.porcelain)); m.position.y = 0.11 + i * 0.22; temple.add(m); });
    for (let i = 0; i < 3; i++) {
      const col = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 2.6, 24), M.porcelain));
      col.position.set(-1.2 + i * 1.2, 0.44 + 1.3, 0); temple.add(col);
      const cap = shadowy(new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.16, 0.85, 2, 0.04), M.porcelain));
      cap.position.set(col.position.x, 0.44 + 2.68, 0); temple.add(cap);
    }
    const beam = shadowy(new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.36, 1.4, 2, 0.06), M.porcelain));
    beam.position.y = 3.3; temple.add(beam);
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.06, 1.42), M.goldSatin); band.position.y = 3.3; temple.add(band);
    const crown = shadowy(new THREE.Mesh(extrude(starShape(0.7, 0.09), 0.14, 0.04), M.gold));
    crown.position.y = 4.35; temple.add(crown);
    anim.push((t) => { temple.rotation.y = Math.sin(t * 0.35) * 0.45 + 0.5; crown.rotation.y = t * 0.9; });
  }
  anim.push((t) => { hero.position.y = 2.75 + Math.sin(t * 1.1) * 0.14; });

  /* ---------- pedestal helper ---------- */
  const pedestal = (pos, w = 2.6, d = 2.6, h = 0.55) => {
    const g = new THREE.Group(); g.position.copy(pos); world.add(g);
    const p = shadowy(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.16), M.porcelain));
    p.position.y = h / 2; g.add(p);
    const lip = new THREE.Mesh(new RoundedBoxGeometry(w + 0.02, 0.04, d + 0.02, 2, 0.02), M.glowSoft);
    lip.position.y = 0.02; g.add(lip);
    g.userData.top = h;
    return g;
  };

  /* ---------- coin stacks (accumulating) ---------- */
  {
    const g = pedestal(spots.coins, 3.0, 2.4);
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.13, 48);
    const stacks = [{ x: -0.85, z: 0.2, n: 0, max: 6 }, { x: 0.05, z: -0.25, n: 0, max: 9 }, { x: 0.95, z: 0.25, n: 0, max: 12 }];
    const coins = [];
    stacks.forEach((s, si) => {
      s.meshes = [];
      for (let i = 0; i < s.max; i++) {
        const c = shadowy(new THREE.Mesh(coinGeo, i % 4 === 3 ? M.goldSatin : M.gold));
        c.position.set(s.x, g.userData.top + 0.065 + i * 0.135, s.z); c.rotation.y = Math.random() * 6;
        c.visible = false; g.add(c); s.meshes.push(c); coins.push(c);
      }
    });
    // pre-fill
    stacks.forEach(s => { s.n = Math.floor(s.max * 0.5); s.meshes.forEach((m, i) => { m.visible = i < s.n; }); });
    let drop = null, timer = 0;
    anim.push((t, dt) => {
      timer += dt;
      if (!drop && timer > 0.55) {
        timer = 0;
        const open = stacks.filter(s => s.n < s.max);
        if (!open.length) { stacks.forEach(s => { s.n = Math.floor(s.max * 0.3); s.meshes.forEach((m, i) => { m.visible = i < s.n; }); }); return; }
        const s = open[Math.floor(Math.random() * open.length)];
        const m = s.meshes[s.n]; m.visible = true;
        drop = { s, m, y0: m.position.y + 2.2, y1: g.userData.top + 0.065 + s.n * 0.135, k: 0 };
      }
      if (drop) {
        drop.k = Math.min(1, drop.k + dt * 2.4);
        const e = drop.k < 1 ? 1 - Math.pow(1 - drop.k, 3) : 1;
        const bounce = drop.k > 0.75 ? Math.sin((drop.k - 0.75) * 4 * Math.PI) * 0.04 * (1 - drop.k) : 0;
        drop.m.position.y = drop.y0 + (drop.y1 - drop.y0) * e + bounce;
        drop.m.rotation.y += dt * 6;
        if (drop.k >= 1) { drop.m.position.y = drop.y1; drop.s.n++; drop = null; }
      }
    });
  }

  /* ---------- growing bar chart ---------- */
  {
    const g = pedestal(spots.bars, 3.2, 2.0);
    const n = 5, bars = [];
    const geo = new RoundedBoxGeometry(0.42, 1, 0.42, 2, 0.06);
    for (let i = 0; i < n; i++) {
      const b = shadowy(new THREE.Mesh(geo, i === n - 1 ? M.gold : M.navyGlass));
      b.position.set(-1.1 + i * 0.55, 0, 0); g.add(b);
      bars.push({ m: b, h: 0.4, target: 0.4 });
    }
    const pattern = [[0.6, 0.9, 1.2, 1.5, 2.0], [0.7, 1.0, 1.1, 1.6, 2.2], [0.5, 0.85, 1.3, 1.7, 2.4]];
    let pi = 0, timer = 0;
    const set = () => { pattern[pi % pattern.length].forEach((h, i) => { bars[i].target = h; }); pi++; };
    set();
    anim.push((t, dt) => {
      timer += dt; if (timer > 2.6) { timer = 0; set(); }
      bars.forEach((b, i) => {
        b.h += (b.target - b.h) * Math.min(1, dt * 3.2);
        b.m.scale.y = b.h; b.m.position.y = g.userData.top + b.h / 2;
      });
    });
    const tip = halo(1.4, 0.7); g.add(tip);
    anim.push(() => { const b = bars[n - 1]; tip.position.set(b.m.position.x, g.userData.top + b.h + 0.15, 0); });
  }

  /* ---------- glass line-chart panel (self drawing) ---------- */
  {
    const g = pedestal(spots.chart, 2.4, 1.2, 0.4);
    const panel = new THREE.Group(); panel.position.set(0, g.userData.top + 1.25, 0); panel.rotation.y = Math.PI / 4 - 0.15; g.add(panel);
    const glassP = shadowy(new THREE.Mesh(new RoundedBoxGeometry(3.0, 2.1, 0.09, 3, 0.04), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.18, clearcoat: 1, transparent: true, opacity: 0.86 })));
    panel.add(glassP);
    const frame = new THREE.Mesh(new RoundedBoxGeometry(3.04, 2.14, 0.05, 3, 0.03), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, transparent: true, opacity: 0.5 }));
    frame.position.z = -0.03; panel.add(frame);
    for (let i = 0; i < 3; i++) {
      const gl = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.014, 0.01), M.ink); gl.position.set(0, -0.6 + i * 0.55, 0.06); panel.add(gl);
    }
    const pts = [];
    const ys = [-0.75, -0.55, -0.62, -0.3, -0.36, -0.05, 0.12, 0.05, 0.38, 0.55, 0.78];
    ys.forEach((y, i) => pts.push(new THREE.Vector3(-1.3 + i * 0.26, y, 0.08)));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.TubeGeometry(curve, 160, 0.05, 8, false);
    const line = new THREE.Mesh(tube, M.glow); panel.add(line);
    const total = tube.index.count;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), M.glow); head.add(halo(0.8, 0.9)); panel.add(head);
    let k = 0;
    anim.push((t, dt) => {
      k += dt / 3.2; if (k > 1.35) k = 0;
      const u = Math.min(1, k);
      line.geometry.setDrawRange(0, Math.floor(total * u / 6) * 6);
      head.position.copy(curve.getPointAt(Math.max(0.001, u)));
      panel.position.y = g.userData.top + 1.25 + Math.sin(t * 0.9) * 0.08;
    });
  }

  /* ---------- floating policy document ---------- */
  {
    const g = pedestal(spots.doc, 2.2, 2.2, 0.45);
    const doc = new THREE.Group(); g.add(doc);
    const sheet = shadowy(new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.06, 2.1, 2, 0.03), M.porcelain));
    doc.add(sheet);
    for (let l = 0; l < 5; l++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(l === 0 ? 0.8 : 1.15 - (l % 2) * 0.3, 0.012, 0.06), M.ink);
      line.position.set(-0.1, 0.04, -0.7 + l * 0.26); doc.add(line);
    }
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 40), M.gold); seal.position.set(0.45, 0.05, 0.7); doc.add(seal);
    doc.rotation.set(0.5, 0.4, -0.1);
    anim.push((t) => { doc.position.y = g.userData.top + 1.0 + Math.sin(t * 1.2 + 1) * 0.16; doc.rotation.z = -0.1 + Math.sin(t * 0.8) * 0.06; });
  }

  /* ---------- glowing data paths with travelling pulses ---------- */
  {
    const y = 0.03;
    // L-shaped traces from the platform rim to each pedestal, plus two running off-stage
    const routes = Object.values(spots).map((s) => {
      const L = Math.hypot(s.x, s.z), ux = s.x / L, uz = s.z / L;
      const p0 = [ux * 4.9, uz * 4.9], end = [s.x - ux * 1.7, s.z - uz * 1.7];
      const dx = end[0] - p0[0], dz = end[1] - p0[1];
      if (Math.min(Math.abs(dx), Math.abs(dz)) < 0.7) return [p0, end];
      return Math.abs(dx) > Math.abs(dz) ? [p0, [p0[0], end[1]], end] : [p0, [end[0], p0[1]], end];
    });
    routes.push([[spots.chart.x + 1.4, spots.chart.z], [12.5, spots.chart.z], [12.5, spots.chart.z - 5]]);
    routes.push([[spots.bars.x, spots.bars.z - 1.2], [spots.bars.x, -12.5], [spots.bars.x - 5, -12.5]]);
    routes.forEach((r, ri) => {
      const pts = [];
      r.forEach((p, i) => {
        const v = new THREE.Vector3(p[0], y, p[1]);
        if (i > 0 && i < r.length - 1) {
          const prev = new THREE.Vector3(r[i - 1][0], y, r[i - 1][1]), next = new THREE.Vector3(r[i + 1][0], y, r[i + 1][1]);
          pts.push(v.clone().add(prev.clone().sub(v).normalize().multiplyScalar(0.35)));
          pts.push(v.clone().add(next.clone().sub(v).normalize().multiplyScalar(0.35)));
        } else pts.push(v);
      });
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.03, 6, false), M.glow));
      world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.11, 6, false), M.glowSoft));
      const pulses = [];
      for (let k = 0; k < 2; k++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), M.glow);
        p.add(halo(0.9, 0.85)); world.add(p); pulses.push({ m: p, o: k * 0.5 + ri * 0.13 });
      }
      const speed = 0.16 + (ri % 3) * 0.04;
      anim.push((t) => pulses.forEach(p => { const u = (t * speed + p.o) % 1; p.m.position.copy(curve.getPointAt(u)).setY(0.07); }));
    });
  }

  /* ---------- rising gold motes ---------- */
  {
    const n = small ? 40 : 90, pos = new Float32Array(n * 3), sp = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, r = 2 + Math.random() * 9;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = Math.sin(a) * r;
      sp.push(0.2 + Math.random() * 0.5);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: haloTex, size: 0.32, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, color: '#f3c969' }));
    world.add(pts);
    anim.push((t, dt) => {
      for (let i = 0; i < n; i++) { pos[i * 3 + 1] += sp[i] * dt; if (pos[i * 3 + 1] > 8) pos[i * 3 + 1] = 0; }
      geo.attributes.position.needsUpdate = true;
    });
  }

  /* ---------- camera framing ---------- */
  const camBase = new THREE.Vector3();
  const look = new THREE.Vector3(0, 1.2, 0);
  function layout() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const mobile = w < 900;
    const dist = mobile ? 58 : (w / h > 1.9 ? 44 : 48);
    camBase.set(1, 0.88, 1).normalize().multiplyScalar(dist);
    if (mobile) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.setViewOffset(w, h, -w * 0.24, h * 0.03, w, h);
    camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', () => { layout(); if (!running) renderOnce(); });

  /* ---------- interaction ---------- */
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => { ptr.x = e.clientX / window.innerWidth - 0.5; ptr.y = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  let scrollP = 0, scrollS = 0;
  const onScroll = () => { scrollP = Math.min(1, Math.max(0, window.scrollY / (host.clientHeight || 1))); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let t = 0, running = false, visible = true, lastOp = '', frameN = 0, slow = 0, fast = 0;
  function update(dt) {
    t += dt;
    anim.forEach(f => f(t, dt));
    ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 2.5);
    ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 2.5);
    camera.position.copy(camBase);
    camera.position.x += ptr.sx * 3.2 - ptr.sy * 1.2;
    camera.position.z += -ptr.sx * 3.2 - ptr.sy * 1.2;
    camera.position.y += ptr.sy * 2.0;
    camera.lookAt(look);
    scrollS += (scrollP - scrollS) * (dt ? Math.min(1, dt * 8) : 1);
    world.rotation.y = scrollS * 0.35;
    world.position.y = -scrollS * 2.0;
    const op = (1 - scrollS * 0.85).toFixed(3);
    if (op !== lastOp) { renderer.domElement.style.opacity = op; lastOp = op; }
  }
  function renderOnce() { update(0); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); }
  function frame() {
    if (!running) return;
    const raw = clock.getDelta();
    update(Math.min(0.05, raw));
    // shadows only move with the slow-moving pieces; refresh them every other frame
    if ((frameN++ & 1) === 0) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    // adaptive resolution: drop pixel ratio when frames run long, restore when there is headroom
    if (raw > 0.024) { slow++; fast = 0; } else if (raw < 0.013) { fast++; slow = 0; }
    if (slow > 40 && pr > 1) { pr = Math.max(1, pr - 0.25); renderer.setPixelRatio(pr); layout(); slow = 0; }
    else if (fast > 240 && pr < maxPR) { pr = Math.min(maxPR, pr + 0.25); renderer.setPixelRatio(pr); layout(); fast = 0; }
    requestAnimationFrame(frame);
  }
  function setRunning(on) {
    if (reduce) return;
    if (on && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
    else if (!on) running = false;
  }
  if (reduce) { t = 4; anim.forEach(f => f(t, 0.016)); renderOnce(); }
  else {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; setRunning(visible && !document.hidden); }, { threshold: 0 }).observe(host);
    document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));
    setRunning(true);
  }
  host.classList.add('is-ready');
}
