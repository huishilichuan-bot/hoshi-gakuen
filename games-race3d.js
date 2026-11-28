/* ほしの学園 — 3Dレースの土台と「カート」。Three.js は初回だけ読み込む。オリジナル。 */
(function () {
  "use strict";
  const H = window.HMGames, Fx = () => window.HMFx;
  const prevKart = (window.GCGames && GCGames.open && GCGames.open.kart) || null;
  const THREE_URL = "./vendor/three.module.min.js";
  let THREE = null, loadP = null;

  const VEHICLES = {
    kart: { id: "kart", n: "カート", accel: 15, brake: 34, drag: 0.7, max: 20.5, boostMax: 28.5, turn: 2.08, driftTurn: 3.05, grip: 0.92, mt1: 0.7, mt2: 1.35, mt1Boost: 0.7, mt2Boost: 1.2, revMax: 7.5 },
    bike: { id: "bike", n: "バイク", accel: 19, brake: 24, drag: 0.48, max: 26, boostMax: 34, turn: 2.05, driftTurn: 2.7, grip: 0.8, mt1: 0.65, mt2: 1.25, mt1Boost: 0.65, mt2Boost: 1.1, revMax: 6 },
    rally: { id: "rally", n: "ダートラリー", accel: 15, brake: 22, drag: 0.62, max: 20, boostMax: 27, turn: 2.15, driftTurn: 3.4, grip: 0.72, mt1: 0.75, mt2: 1.4, mt1Boost: 0.7, mt2Boost: 1.15, revMax: 6 },
    boat: { id: "boat", n: "ボート", accel: 14, brake: 18, drag: 0.7, max: 19, boostMax: 26, turn: 1.9, driftTurn: 2.6, grip: 0.7, mt1: 0.8, mt2: 1.5, mt1Boost: 0.8, mt2Boost: 1.2, revMax: 5 },
    jetski: { id: "jetski", n: "水上バイク", accel: 18, brake: 20, drag: 0.58, max: 24, boostMax: 32, turn: 2.2, driftTurn: 3.0, grip: 0.74, mt1: 0.65, mt2: 1.25, mt1Boost: 0.7, mt2Boost: 1.15, revMax: 5 },
    ski: { id: "ski", n: "スキー", accel: 16, brake: 14, drag: 0.42, max: 25, boostMax: 33, turn: 2.0, driftTurn: 2.8, grip: 0.76, mt1: 0.7, mt2: 1.3, mt1Boost: 0.7, mt2Boost: 1.15, revMax: 4 },
    snowboard: { id: "snowboard", n: "スノボ", accel: 16, brake: 16, drag: 0.45, max: 24, boostMax: 32, turn: 2.15, driftTurn: 3.1, grip: 0.74, mt1: 0.7, mt2: 1.3, mt1Boost: 0.7, mt2Boost: 1.2, revMax: 4 },
    sled: { id: "sled", n: "犬そり", accel: 13, brake: 20, drag: 0.6, max: 18, boostMax: 24, turn: 2.0, driftTurn: 2.9, grip: 0.8, mt1: 0.8, mt2: 1.5, mt1Boost: 0.75, mt2Boost: 1.15, revMax: 4 },
    space: { id: "space", n: "宇宙", accel: 18, brake: 16, drag: 0.35, max: 28, boostMax: 38, turn: 1.85, driftTurn: 2.4, grip: 0.68, mt1: 0.6, mt2: 1.15, mt1Boost: 0.8, mt2Boost: 1.3, revMax: 6 },
    horse: { id: "horse", n: "競馬", accel: 15, brake: 22, drag: 0.58, max: 23, boostMax: 29, turn: 2.1, driftTurn: 2.5, grip: 0.84, mt1: 0.75, mt2: 1.4, mt1Boost: 0.65, mt2Boost: 1.05, revMax: 5 },
    cycle: { id: "cycle", n: "ロードバイク", accel: 14, brake: 24, drag: 0.4, max: 21, boostMax: 28, turn: 2.25, driftTurn: 2.7, grip: 0.9, mt1: 0.8, mt2: 1.5, mt1Boost: 0.7, mt2Boost: 1.2, revMax: 5 },
    highway: { id: "highway", n: "ハイウェイラッシュ", accel: 20, brake: 22, drag: 0.38, max: 30, boostMax: 40, turn: 1.7, driftTurn: 2.3, grip: 0.82, mt1: 0.6, mt2: 1.2, mt1Boost: 0.7, mt2Boost: 1.15, revMax: 7 },
    drift: { id: "drift", n: "ターボドリフト", accel: 17, brake: 24, drag: 0.5, max: 24, boostMax: 33, turn: 2.4, driftTurn: 3.6, grip: 0.7, mt1: 0.55, mt2: 1.1, mt1Boost: 0.75, mt2Boost: 1.25, revMax: 6 }
  };
  const THEMES = {
    campus: { sky: 0xb8c8ff, fog: 0xc8d4ff, fogNear: 40, fogFar: 160, grass: 0x4aa162, grass2: 0x3d8a54, road: 0x3a3f55, roadLine: 0xf4f1e8, curb: 0xefe7ff, rail: 0x6d5bd0, dirt: 0x7a5a3a },
    dirt: { sky: 0xe8d5b0, fog: 0xe8d5b0, fogNear: 35, fogFar: 140, grass: 0xc4a26a, grass2: 0x8a6a3a, road: 0x8b5a2b, roadLine: 0xe8d5a8, curb: 0x6b4423, rail: 0x5c3d21, dirt: 0x7a5a3a },
    water: { sky: 0x7ec8e8, fog: 0xa8d8ef, fogNear: 40, fogFar: 150, grass: 0x1c7ed6, grass2: 0x1864ab, road: 0x1a5276, roadLine: 0xd0ebff, curb: 0x74c0fc, rail: 0x1864ab, dirt: 0x0c3d66 },
    snow: { sky: 0xdce8ff, fog: 0xeef3ff, fogNear: 30, fogFar: 130, grass: 0xeef3f8, grass2: 0xc5d4e8, road: 0xd0d8e8, roadLine: 0x5c7cfa, curb: 0xffffff, rail: 0x4dabf7, dirt: 0xb0c0d4 },
    space: { sky: 0x0b1026, fog: 0x1a1f4a, fogNear: 50, fogFar: 180, grass: 0x161b33, grass2: 0x2b2155, road: 0x2a2f55, roadLine: 0x74c0fc, curb: 0x845ef7, rail: 0x5c7cfa, dirt: 0x1a1f3a },
    turf: { sky: 0xb8e0a8, fog: 0xd4ecc8, fogNear: 40, fogFar: 150, grass: 0x51cf66, grass2: 0x2f9e44, road: 0x37b24d, roadLine: 0xfff4c2, curb: 0x8ce99a, rail: 0x2b8a3e, dirt: 0x5c4a32 },
    asphalt: { sky: 0x8aa2c4, fog: 0xb8c4d8, fogNear: 50, fogFar: 170, grass: 0x3d8a54, grass2: 0x2b6a3e, road: 0x2c2f38, roadLine: 0xffe066, curb: 0xf8f9fa, rail: 0x868e96, dirt: 0x495057 }
  };
  const ITEM_NAMES = { boost: "ほしダッシュ", ink: "インクしみ", shield: "ノートバリア", star: "ながれぼし" };
  const ITEM_IDS = ["boost", "boost", "ink", "shield", "star"];
  const DEFAULT_LAPS = 2, RACERS = 8, ROAD_W = 7.2, FIN_T = 0.975;

  function loadThree() {
    if (THREE) return Promise.resolve(THREE);
    if (loadP) return loadP;
    loadP = import(THREE_URL).then((m) => { THREE = m; return m; });
    return loadP;
  }
  function skillOf(diff) { return { easy: 0.82, normal: 0.92, hard: 0.98, ultra: 1.03 }[diff] || 0.92; }
  function clampLaps(n) { n = +n; return n === 3 ? 3 : 2; }

  // 画面の右と、カートの右が同じ向きならそのまま。カメラが正面に回って逆向きなら符号を反転する。
  function screenSteer(steer, yaw, camRightX, camRightZ) {
    if (!steer) return 0;
    const align = Math.cos(yaw) * camRightX + (-Math.sin(yaw)) * camRightZ;
    return align < 0 ? -steer : steer;
  }
  function camRightXZ(camera) {
    camera.updateMatrixWorld();
    const e = camera.matrixWorld.elements;
    return { x: e[0], z: e[2] };
  }

  function campusPoints(T) {
    const P = (x, z, y) => new T.Vector3(x, y || 0, z);
    return [
      P(0, -38), P(16, -36, 0.2), P(34, -24, 0.4), P(42, -4, 0.2), P(40, 16),
      P(28, 30, 0.3), P(10, 36, 0.6), P(-8, 34, 0.4), P(-24, 22), P(-36, 8, 0.2),
      P(-38, -8), P(-28, -22, 0.15), P(-14, -30), P(-4, -36)
    ];
  }
  function makeCurve(T, pts, closed, smooth) { return smooth ? new T.CatmullRomCurve3(pts, closed !== false, "centripetal", 0.5) : new T.CatmullRomCurve3(pts, closed !== false, "catmullrom", 0.18); }

  function roadGeom(T, curve, half, segs) {
    const pos = [], nor = [], uv = [], idx = [];
    const up = new T.Vector3(0, 1, 0), side = new T.Vector3(), nrm = new T.Vector3(), tan = new T.Vector3();
    const a = new T.Vector3(), b = new T.Vector3(), p = new T.Vector3();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPointAt(t, p); curve.getTangentAt(t, tan);
      side.crossVectors(up, tan).normalize();
      if (side.lengthSq() < 0.01) side.set(1, 0, 0);
      nrm.crossVectors(tan, side).normalize();
      a.copy(p).addScaledVector(side, half); a.y += 0.04;
      b.copy(p).addScaledVector(side, -half); b.y += 0.04;
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      nor.push(nrm.x, nrm.y, nrm.z, nrm.x, nrm.y, nrm.z);
      uv.push(0, t * 40, 1, t * 40);
      if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  // 坂のある周回コース：道の両側に、地面まで下がる土手を作る（道が宙に浮いて見えないように）
  function bankGeom(T, curve, half, slopeW, baseY, segs) {
    const pos = [], idx = [];
    const up = new T.Vector3(0, 1, 0), side = new T.Vector3(), tan = new T.Vector3(), p = new T.Vector3();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPointAt(t, p); curve.getTangentAt(t, tan);
      side.crossVectors(up, tan).normalize();
      const h = p.y - baseY, w = half + slopeW + h * 1.2;
      [w, half, -half, -w].forEach((o, k) => pos.push(p.x + side.x * o, k === 0 || k === 3 ? baseY - 0.02 : p.y - 0.03, p.z + side.z * o));
      if (i < segs) { const q = i * 4; for (let k = 0; k < 3; k++) idx.push(q + k, q + k + 4, q + k + 1, q + k + 1, q + k + 4, q + k + 5); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  function curbGeom(T, curve, half, segs, inward) {
    const pos = [], idx = [], col = [];
    const up = new T.Vector3(0, 1, 0), side = new T.Vector3(), tan = new T.Vector3(), p = new T.Vector3();
    const w = 0.42, h = 0.22;
    const cA = [0.93, 0.25, 0.25], cB = [0.96, 0.96, 0.96];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPointAt(t, p); curve.getTangentAt(t, tan);
      side.crossVectors(up, tan).normalize();
      if (inward) side.negate();
      const ox = p.x + side.x * (half - 0.05), oz = p.z + side.z * (half - 0.05);
      const ix = ox + side.x * w, iz = oz + side.z * w;
      const yb = p.y; pos.push(ox, yb, oz, ox, yb + h, oz, ix, yb + h, iz, ix, yb, iz);
      const c = ((i / 2) | 0) % 2 ? cA : cB;
      for (let k = 0; k < 4; k++) col.push(c[0], c[1], c[2]);
      if (i < segs) {
        const k = i * 4, n = k + 4;
        idx.push(k, n, k + 1, k + 1, n, n + 1, k + 1, n + 1, k + 2, k + 2, n + 1, n + 2, k + 2, n + 2, k + 3, k + 3, n + 2, n + 3);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    g.setIndex(idx);
    return g;
  }

  function sampleAt(curve, t, outP, outT) {
    const u = curve.closed ? ((t % 1) + 1) % 1 : Math.max(0, Math.min(1, t));
    curve.getPointAt(u, outP);
    if (outT) curve.getTangentAt(u, outT);
    return u;
  }
  function nearestT(curve, x, z, hint, segs) {
    let best = hint, bestD = 1e9;
    for (let k = -12; k <= 12; k++) {
      const t = curve.closed ? (((hint + k / segs) % 1) + 1) % 1 : Math.max(0, Math.min(1, hint + k / segs));
      const p = curve.getPointAt(t);
      const dx = p.x - x, dz = p.z - z, d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  function canvasTex(T, w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const tex = new T.CanvasTexture(c);
    if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
  function plateTex(T, n, bg) {
    return canvasTex(T, 64, 32, (g, w, h) => {
      g.fillStyle = "#f1f3f5"; g.fillRect(0, 0, w, h);
      g.fillStyle = bg; g.fillRect(3, 3, w - 6, h - 6);
      g.fillStyle = "#fff"; g.font = "bold 20px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(String(n), w / 2, h / 2 + 1);
    });
  }
  function bannerTex(T, title, sub) {
    return canvasTex(T, 512, 128, (g, w, h) => {
      g.fillStyle = "#1b1438"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffe066"; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8);
      g.fillStyle = "#fff"; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(title, w / 2, sub ? 54 : h / 2);
      if (sub) { g.fillStyle = "#ffe066"; g.font = "bold 26px sans-serif"; g.fillText(sub, w / 2, 100); }
    });
  }
  function checkerTex(T) {
    return canvasTex(T, 128, 32, (g, w, h) => {
      const tw = 16, th = 16;
      for (let y = 0; y < h / th; y++) for (let x = 0; x < w / tw; x++) {
        g.fillStyle = (x + y) % 2 ? "#f8f9fa" : "#1a1b1e";
        g.fillRect(x * tw, y * th, tw, th);
      }
    });
  }
  function signTex(T, text) {
    return canvasTex(T, 256, 128, (g, w, h) => {
      g.fillStyle = "#efe7ff"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#5f3dc4"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = "#2b2155"; g.font = "bold 28px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      const lines = text.split("\n");
      lines.forEach((ln, i) => g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 32));
    });
  }

  const _G = {};
  function G(T, k, fn) { return _G[k] || (_G[k] = fn()); }
  function buildKart(T, col, accent, isMe, num) {
    const root = new T.Group();
    const body = new T.Group(); body.name = "body"; root.add(body);
    const paint = new T.MeshLambertMaterial({ color: col });
    const acc = new T.MeshLambertMaterial({ color: accent });
    const dark = new T.MeshLambertMaterial({ color: 0x1c1e27 });
    const metal = new T.MeshLambertMaterial({ color: 0x868e96 });
    const chassis = new T.Mesh(G(T, "ch", () => new T.BoxGeometry(0.95, 0.16, 1.55)), dark);
    chassis.position.y = 0.28; body.add(chassis);
    const shell = new T.Mesh(G(T, "sh", () => new T.BoxGeometry(1.12, 0.28, 1.62)), paint);
    shell.position.y = 0.42; body.add(shell);
    const nose = new T.Mesh(G(T, "no", () => new T.BoxGeometry(0.92, 0.18, 0.48)), acc);
    nose.position.set(0, 0.48, 0.68); body.add(nose);
    const sideL = new T.Mesh(G(T, "sd", () => new T.BoxGeometry(0.22, 0.2, 1.1)), paint);
    sideL.position.set(-0.58, 0.36, 0.05); body.add(sideL);
    const sideR = sideL.clone(); sideR.position.x = 0.58; body.add(sideR);
    const wing = new T.Mesh(G(T, "wg", () => new T.BoxGeometry(1.28, 0.06, 0.3)), dark);
    wing.position.set(0, 0.72, -0.78); body.add(wing);
    const stayL = new T.Mesh(G(T, "st", () => new T.BoxGeometry(0.06, 0.28, 0.06)), metal);
    stayL.position.set(-0.4, 0.58, -0.72); body.add(stayL);
    const stayR = stayL.clone(); stayR.position.x = 0.4; body.add(stayR);
    const seat = new T.Mesh(G(T, "se", () => new T.BoxGeometry(0.5, 0.22, 0.42)), dark);
    seat.position.set(0, 0.55, -0.12); body.add(seat);
    const wheel = new T.Mesh(G(T, "sw", () => new T.TorusGeometry(0.16, 0.018, 5, 8)), metal);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(0, 0.7, 0.12); body.add(wheel);
    const colm = new T.Mesh(G(T, "cm", () => new T.CylinderGeometry(0.025, 0.03, 0.22, 5)), metal);
    colm.position.set(0, 0.6, 0.18); body.add(colm);
    const helm = new T.Mesh(G(T, "hm", () => new T.SphereGeometry(0.16, 8, 6)), acc);
    helm.position.set(0, 0.82, -0.06); body.add(helm);
    const visor = new T.Mesh(G(T, "vs", () => new T.BoxGeometry(0.18, 0.07, 0.12)), new T.MeshLambertMaterial({ color: 0x74c0fc }));
    visor.position.set(0, 0.84, 0.08); body.add(visor);
    const torso = new T.Mesh(G(T, "ts", () => new T.BoxGeometry(0.36, 0.22, 0.28)), new T.MeshLambertMaterial({ color: 0x2b2155 }));
    torso.position.set(0, 0.62, -0.08); body.add(torso);
    const armL = new T.Mesh(G(T, "ar", () => new T.BoxGeometry(0.08, 0.08, 0.28)), new T.MeshLambertMaterial({ color: 0xf3c29c }));
    armL.position.set(-0.22, 0.66, 0.08); body.add(armL);
    const armR = armL.clone(); armR.position.x = 0.22; body.add(armR);
    const exL = new T.Mesh(G(T, "ex", () => new T.CylinderGeometry(0.05, 0.06, 0.28, 5)), metal);
    exL.rotation.x = Math.PI / 2; exL.position.set(-0.18, 0.32, -0.92); body.add(exL);
    const exR = exL.clone(); exR.position.x = 0.18; body.add(exR);
    const plate = new T.Mesh(G(T, "pl", () => new T.PlaneGeometry(0.32, 0.16)), new T.MeshBasicMaterial({ map: plateTex(T, num, "#" + (col | 0).toString(16).padStart(6, "0")) }));
    plate.position.set(0, 0.42, -0.95); plate.rotation.y = Math.PI; body.add(plate);
    const flameM = new T.MeshBasicMaterial({ color: 0x74c0fc, transparent: true, opacity: 0, depthWrite: false });
    const flames = [];
    [-0.18, 0.18].forEach((x) => {
      const fl = new T.Mesh(G(T, "fl", () => new T.ConeGeometry(0.09, 0.42, 6)), flameM.clone());
      fl.position.set(x, 0.32, -1.12); fl.rotation.x = Math.PI; body.add(fl); flames.push(fl);
    });
    const mkWheel = (x, z, front) => {
      const grp = new T.Group(); grp.position.set(x, 0.22, z);
      const tire = new T.Mesh(G(T, "tr", () => new T.CylinderGeometry(0.22, 0.22, 0.16, 8)), dark);
      tire.rotation.z = Math.PI / 2; grp.add(tire);
      const rim = new T.Mesh(G(T, "rm", () => new T.CylinderGeometry(0.12, 0.12, 0.17, 6)), metal);
      rim.rotation.z = Math.PI / 2; grp.add(rim);
      const arm = new T.Mesh(G(T, "wa", () => new T.BoxGeometry(0.06, 0.05, 0.28)), metal);
      arm.position.set(x > 0 ? -0.16 : 0.16, 0.02, 0); grp.add(arm);
      root.add(grp);
      return { grp, tire, front: !!front };
    };
    const wheels = [mkWheel(-0.58, 0.55, true), mkWheel(0.58, 0.55, true), mkWheel(-0.58, -0.55, false), mkWheel(0.58, -0.55, false)];
    const shadow = new T.Mesh(G(T, "shd", () => new T.CircleGeometry(0.85, 8)), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; root.add(shadow);
    root.scale.setScalar(isMe ? 1 : 0.96);
    root.userData = { body, wheels, flames, shadow };
    return root;
  }

  function makeTree(T, theme) {
    const g = new T.Group();
    const tr = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 0.7, 5), new T.MeshLambertMaterial({ color: 0x6b4a2b }));
    tr.position.y = 0.35; g.add(tr);
    const leaf = new T.Mesh(new T.ConeGeometry(0.7, 1.4, 7), new T.MeshLambertMaterial({ color: theme.grass2 }));
    leaf.position.y = 1.25; g.add(leaf);
    return g;
  }


  function dressCourse(T, scene, curve, theme, R, RW) {
    R = R || {}; RW = RW || ROAD_W;
    const closed = curve.closed;
    const up = new T.Vector3(0, 1, 0);
    const at = (t, sideOff, y) => {
      const u = closed ? ((t % 1) + 1) % 1 : Math.max(0, Math.min(1, t));
      const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
      const side = new T.Vector3().crossVectors(up, tan).normalize();
      return { p, tan, side, x: p.x + side.x * sideOff, y: p.y + (y || 0), z: p.z + side.z * sideOff, yaw: Math.atan2(tan.x, tan.z) };
    };
    // 木
    const tree = R.prop ? R.prop(T, theme) : makeTree(T, theme);
    const nTree = R.propN || 16;
    for (let i = 0; tree && i < nTree; i++) {
      const t = nTree > 16 ? (i / nTree + 0.013) % 1 : (i * 0.041 + 0.02) % 1;
      const s = (i % 2 ? 1 : -1) * (RW + 3.2 + (i % 5) * 0.7);
      const a = at(t, s);
      const tr = tree.clone(); tr.position.set(a.x, a.y, a.z); tr.rotation.y = i * 0.7;
      tr.scale.setScalar(0.85 + (i % 4) * 0.15); scene.add(tr);
    }
    // 旗
    const flagMat = [0x5f3dc4, 0xffe066, 0xe03131].map((c) => new T.MeshLambertMaterial({ color: c, side: T.DoubleSide }));
    for (let i = 0; R.flags !== false && i < 8; i++) {
      const a = at(0.05 + i * 0.09, (i % 2 ? 1 : -1) * (RW + 1.6));
      const pole = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 2.4, 5), new T.MeshLambertMaterial({ color: 0xced4da }));
      pole.position.set(a.x, a.y + 1.2, a.z); scene.add(pole);
      const fl = new T.Mesh(new T.PlaneGeometry(0.7, 0.42), flagMat[i % 3]);
      fl.position.set(a.x + Math.cos(a.yaw) * 0.35, a.y + 2.1, a.z + Math.sin(a.yaw) * 0.35);
      fl.rotation.y = a.yaw + Math.PI / 2; scene.add(fl);
    }
    // 看板（オリジナル）
    const signs = R.signs || [[0.12, "ほしの\nサーキット"], [0.4, "コーナー\n注意"], [0.68, "がんばって！"], [0.88, "ゴールまで\nもう少し"]];
    const backMat = new T.MeshLambertMaterial({ color: 0x5c5f66 });
    signs.forEach(([t, text], i) => {
      const a = at(t, (i % 2 ? -1 : 1) * (RW + 2.4));
      const post = new T.Mesh(new T.BoxGeometry(0.12, 1.8, 0.12), new T.MeshLambertMaterial({ color: 0x868e96 }));
      post.position.set(a.x, a.y + 0.9, a.z); scene.add(post);
      // 表は走ってくる側に文字、裏はうら板（両面に同じ絵を貼ると裏から文字が反転して見えるため）
      const bd = new T.Mesh(new T.PlaneGeometry(1.6, 0.8), new T.MeshBasicMaterial({ map: signTex(T, text) }));
      bd.position.set(a.x, a.y + 1.9, a.z); bd.rotation.y = a.yaw + Math.PI; scene.add(bd);
      const bk = new T.Mesh(new T.PlaneGeometry(1.64, 0.84), backMat);
      bk.position.set(a.x + Math.sin(a.yaw) * 0.02, a.y + 1.9, a.z + Math.cos(a.yaw) * 0.02); bk.rotation.y = a.yaw; scene.add(bk);
    });
    // 観客席（2か所、低いひな壇＋色つきの席）
    const seatMat = new T.MeshLambertMaterial({ color: 0xdee2e6 });
    const crowdGeo = new T.BoxGeometry(0.22, 0.38, 0.22);
    const benchGeo = new T.BoxGeometry(6.4, 0.32, 1.0);
    const palM = [0xe03131, 0x4dabf7, 0xffe066, 0x51cf66, 0xcc5de8, 0xffffff].map((c) => new T.MeshLambertMaterial({ color: c }));
    (R.stands === false ? [] : (R.stands || [0.22, 0.72])).forEach((t0, si) => {
      const a = at(t0, (si ? -1 : 1) * (RW + 6.5));
      const stand = new T.Group();
      for (let row = 0; row < 3; row++) {
        const st = new T.Mesh(benchGeo, seatMat);
        st.position.set(0, 0.2 + row * 0.5, -row * 0.85); stand.add(st);
        for (let k = 0; k < 6; k++) {
          const c = new T.Mesh(crowdGeo, palM[(k + row + si) % palM.length]);
          c.position.set(-2.4 + k * 0.85, 0.52 + row * 0.5, -row * 0.85); stand.add(c);
        }
      }
      stand.position.set(a.x, a.y, a.z); stand.rotation.y = a.yaw + (si ? 0 : Math.PI); scene.add(stand);
    });
    if (R.dress) R.dress(T, scene, curve, theme, at, RW);
    // スタート／ゴール：チェッカーライン＋細いゲート＋GOAL看板
    const g0 = at(closed ? 0 : FIN_T, 0);
    const check = new T.Mesh(new T.PlaneGeometry(RW * 2, 1.6), new T.MeshBasicMaterial({ map: checkerTex(T) }));
    check.rotation.x = -Math.PI / 2; check.position.set(g0.p.x, g0.p.y + 0.07, g0.p.z);
    check.rotation.z = -g0.yaw; scene.add(check);
    const postM = new T.MeshLambertMaterial({ color: 0x2b2155 });
    const posts = [];
    [-1, 1].forEach((s) => {
      const post = new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 3.6, 8), postM);
      post.position.set(g0.p.x + g0.side.x * s * (RW + 0.15), g0.p.y + 1.8, g0.p.z + g0.side.z * s * (RW + 0.15));
      scene.add(post); posts.push(post);
    });
    const banTex = bannerTex(T, "GOAL", R.courseName || "ほしのサーキット");
    const ban = new T.Mesh(new T.PlaneGeometry(RW * 2 + 0.4, 0.7), new T.MeshBasicMaterial({ map: banTex }));
    ban.position.set(g0.p.x, g0.p.y + 3.35, g0.p.z);
    ban.rotation.y = g0.yaw + Math.PI; scene.add(ban);
    // 裏側にも、正しい向きの文字の看板を別に貼る（DoubleSide だと裏から反転して見える）
    const ban2 = new T.Mesh(new T.PlaneGeometry(RW * 2 + 0.4, 0.7), new T.MeshBasicMaterial({ map: banTex }));
    ban2.position.set(g0.p.x + Math.sin(g0.yaw) * 0.03, g0.p.y + 3.35, g0.p.z + Math.cos(g0.yaw) * 0.03);
    ban2.rotation.y = g0.yaw; scene.add(ban2);
    if (!closed) {
      // 一方通行のコースはスタート位置にも白いライン
      const s0 = at(0.012, 0);
      const sl = new T.Mesh(new T.PlaneGeometry(RW * 2, 0.5), new T.MeshBasicMaterial({ color: 0xffffff }));
      sl.rotation.x = -Math.PI / 2; sl.rotation.z = -s0.yaw; sl.position.set(s0.p.x, s0.p.y + 0.07, s0.p.z); scene.add(sl);
    }
    return { check, ban, posts };
  }

  function Marks(T, scene) {
    const geo = new T.PlaneGeometry(0.26, 0.62);
    const mat = new T.MeshBasicMaterial({ color: 0x16171c, transparent: true, opacity: 0.38, depthWrite: false });
    const mesh = new T.InstancedMesh(geo, mat, 56);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    scene.add(mesh);
    const dummy = new T.Object3D();
    dummy.scale.set(0, 0, 0); dummy.updateMatrix();
    for (let i = 0; i < 56; i++) mesh.setMatrixAt(i, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    this.mesh = mesh; this.dummy = dummy; this.i = 0; this.n = 56; this._d = 0;
  }
  Marks.prototype.stamp = function (x, z, yaw, y) {
    const d = this.dummy;
    d.position.set(x, (y || 0) + 0.055, z);
    d.rotation.set(-Math.PI / 2, yaw, 0, "YXZ");
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    this.mesh.setMatrixAt(this.i % this.n, d.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.i++;
  };

  function stopAll(st) {
    if (!st) return;
    st.dead = true;
    cancelAnimationFrame(st.raf);
    if (st.engine) try { st.engine.stop(); } catch (e) {}
    if (st.fx3) st.fx3.clear();
    if (st.renderer) { try { st.renderer.dispose(); } catch (e) {} }
    if (st.onResize) window.removeEventListener("resize", st.onResize);
    (st.unbind || []).forEach((fn) => { try { fn(); } catch (e) {} });
    if (st.body) st.body.innerHTML = "";
  }

  function boot(T, body, opts, diff) {
    const FX = Fx(); if (!FX) return;
    const R = opts.race || {};
    const veh = Object.assign({}, VEHICLES[opts.vehicle || "kart"] || VEHICLES.kart, R.veh || {});
    const theme = Object.assign({}, THEMES[opts.theme || "campus"] || THEMES.campus, R.theme || {});
    const closed = !R.sprint;
    const laps = closed ? clampLaps(opts.laps != null ? opts.laps : (window.HMRace3d && HMRace3d.pendingLaps)) : 1;
    const RW = R.roadW || ROAD_W;
    const ACT = R.action || "drift";
    const GF = window.GF;
    const st = { dead: false, unbind: [], body, t: 0, go: false, done: false, laps, id: opts.id || "kart" };
    const W0 = () => Math.max(260, body.clientWidth || 360);
    const H0 = () => Math.max(320, body.clientHeight || 520);

    body.className = (body.className || "") + " r3d-body";
    body.innerHTML = '<div class="r3d">' +
      '<canvas class="r3d-gl"></canvas><canvas class="r3d-fx"></canvas>' +
      '<canvas class="r3d-map" width="140" height="140"></canvas>' +
      '<div class="r3d-hud"><div class="r3d-pos">–</div><div class="r3d-lap">' + (closed ? "LAP 1/" + laps : "スタート") + '</div><div class="r3d-time">0.00</div>' +
      '<div class="r3d-item" hidden></div><div class="r3d-mt"><i></i></div></div>' +
      '<div class="r3d-cheer" hidden></div><div class="r3d-final" hidden>ファイナルラップ</div>' +
      '<div class="r3d-cd"></div>' +
      '<div class="r3d-pad">' +
        '<div class="r3d-col left"><div class="r3d-arrows">' +
          '<button type="button" class="r3d-btn arrow" data-hold="left" aria-label="左">◀</button>' +
          '<button type="button" class="r3d-btn arrow" data-hold="right" aria-label="右">▶</button>' +
        "</div></div>" +
        '<div class="r3d-col mid">' +
          '<button type="button" class="r3d-btn go" data-hold="accel">すすむ</button>' +
          '<button type="button" class="r3d-btn stop" data-hold="brake">とまる</button>' +
        "</div>" +
        '<div class="r3d-col right">' +
          '<button type="button" class="r3d-btn drift" data-hold="drift">' + (R.actionLabel || "ドリフト") + '</button>' +
          (R.items === false ? '' : '<button type="button" class="r3d-btn item" data-item="1">アイテム</button>') +
        "</div></div></div>";

    const glcv = body.querySelector(".r3d-gl");
    const fxcv = body.querySelector(".r3d-fx");
    const mapcv = body.querySelector(".r3d-map");
    const overlay = new FX.Overlay(fxcv);
    const shake = new FX.Shake();
    st.engine = new FX.Engine();
    st.overlay = overlay; st.shake = shake;

    const scene = new T.Scene();
    scene.background = new T.Color(theme.sky);
    scene.fog = new T.Fog(theme.fog, theme.fogNear, theme.fogFar);
    const camera = new T.PerspectiveCamera(R.fov || 55, 1, 0.1, R.far || 240);
    st.camera = camera;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: glcv, antialias: dpr < 1.4, alpha: false, powerPreference: "high-performance" });
    } catch (err) {
      console.error(err);
      const fb = opts.fallback || prevKart;
      if (fb) fb(diff);
      return;
    }
    renderer.setClearColor(theme.sky, 1);
    if (T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
    st.renderer = renderer;
    scene.add(new T.HemisphereLight(R.hemiSky || 0xe8f0ff, R.hemiGround || 0x3d5a3a, R.hemi || 1.05));
    const sun = new T.DirectionalLight(R.sunCol || 0xfff4e0, R.sun || 0.85); sun.position.set(30, 50, 10); scene.add(sun);

    const curve = makeCurve(T, R.points ? R.points(T) : campusPoints(T), closed, !!R.points);
    const curveLen = curve.getLength();
    // 長いコースでも、近い点を探す細かさ（約1.4m）をカートと同じにする
    const segs = Math.max(180, Math.round(curveLen / 1.45));
    const roadMat = R.roadMat ? R.roadMat(T, theme) : new T.MeshLambertMaterial({ color: theme.road });
    st.roadMat = roadMat;
    scene.add(new T.Mesh(roadGeom(T, curve, RW, Math.round(segs * 0.7)), roadMat));
    if (R.midLine !== false) {
      const mid = new T.Mesh(roadGeom(T, curve, 0.08, Math.round(segs * 0.6)), new T.MeshBasicMaterial({ color: theme.roadLine }));
      mid.position.y = 0.03; scene.add(mid);
    }
    if (R.curbs !== false) {
      const curbMat = new T.MeshLambertMaterial({ vertexColors: true });
      const cs = Math.max(140, Math.round(curveLen / 1.9));
      scene.add(new T.Mesh(curbGeom(T, curve, RW, cs, false), curbMat));
      scene.add(new T.Mesh(curbGeom(T, curve, RW, cs, true), curbMat));
    }
    if (R.ground !== false) {
      if (closed) {
        const box = new T.Box3().setFromPoints(curve.getSpacedPoints(60));
        const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
        const rad = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 + 50;
        const ground = new T.Mesh(new T.CircleGeometry(Math.max(90, rad), 32), new T.MeshLambertMaterial({ color: theme.grass }));
        ground.rotation.x = -Math.PI / 2; ground.position.set(cx, box.min.y - 0.05, cz); scene.add(ground);
        if (box.max.y - box.min.y > 0.6) {
          const bank = new T.Mesh(bankGeom(T, curve, RW, 3, box.min.y - 0.04, Math.round(segs * 0.5)), new T.MeshLambertMaterial({ color: theme.grass2 || theme.grass, side: T.DoubleSide }));
          scene.add(bank);
        }
      } else {
        // 一方通行（坂道）のコースは、道にそった広い地面
        const gnd = new T.Mesh(roadGeom(T, curve, RW + (R.groundW || 46), Math.round(segs * 0.5)), new T.MeshLambertMaterial({ color: theme.grass }));
        gnd.position.y = -0.09; scene.add(gnd);
      }
    }
    dressCourse(T, scene, curve, theme, R, RW);
    const fx3 = new FX.ThreeFx(T, scene); st.fx3 = fx3;
    const marks = new Marks(T, scene); st.marks = marks;

    const boxGeo = new T.BoxGeometry(0.7, 0.7, 0.7);
    const boxMat = new T.MeshLambertMaterial({ color: 0x74c0fc });
    const boxes = [];
    (R.items === false ? [] : (R.boxes || [0.18, 0.37, 0.58, 0.79])).forEach((t0) => {
      [-0.35, 0.35].forEach((off) => {
        const p = curve.getPointAt(t0), tan = curve.getTangentAt(t0);
        const side = new T.Vector3().set(0, 1, 0).cross(tan).normalize();
        const m = new T.Mesh(boxGeo, boxMat.clone());
        m.position.set(p.x + side.x * off * RW * 0.55, p.y + 0.7, p.z + side.z * off * RW * 0.55);
        scene.add(m);
        boxes.push({ m, t: t0, off, ready: 0, live: true, y0: p.y });
      });
    });

    // ---- コースのしかけ（ジャンプ台・ダッシュ板・どろ・障害物）----
    const upV = new T.Vector3(0, 1, 0);
    function placeOn(tt, off, y) {
      const u = closed ? ((tt % 1) + 1) % 1 : Math.max(0, Math.min(1, tt));
      const pp = curve.getPointAt(u), tn = curve.getTangentAt(u);
      const sd = new T.Vector3().crossVectors(upV, tn).normalize();
      return { x: pp.x + sd.x * off, y: pp.y + (y || 0), z: pp.z + sd.z * off, yaw: Math.atan2(tn.x, tn.z), side: sd, p: pp, tan: tn };
    }
    const ramps = (R.ramps || []).map((rt) => {
      const a = placeOn(rt, 0);
      const m = R.rampMesh ? R.rampMesh(T, RW) : (() => {
        const g = new T.Group();
        const w = new T.Mesh(new T.BoxGeometry(RW * 1.5, 0.5, 2.6), new T.MeshLambertMaterial({ color: R.rampCol || 0xf08c00 }));
        w.rotation.x = -0.2; w.position.y = 0.18; g.add(w);
        const s = new T.Mesh(new T.BoxGeometry(RW * 1.5, 0.08, 0.5), new T.MeshBasicMaterial({ color: 0xffffff }));
        s.position.set(0, 0.47, 1.05); s.rotation.x = -0.2; g.add(s);
        return g;
      })();
      m.position.set(a.x, a.y, a.z); m.rotation.y = a.yaw; scene.add(m);
      return { t: rt, m };
    });
    const hz = (R.hazards || []).map((h) => {
      const off = (h.off || 0) * RW * 0.62;
      const a = placeOn(h.t, off);
      const m = R.hazardMesh ? R.hazardMesh(T, h.kind, theme) : null;
      if (m) { m.position.set(a.x, a.y, a.z); m.rotation.y = a.yaw; scene.add(m); }
      return { kind: h.kind, x: a.x, y: a.y, z: a.z, yaw: a.yaw, m, r: h.r || (h.kind === "mud" || h.kind === "pad" || h.kind === "ring" ? 1.9 : 1.0), cool: 0 };
    });
    st.ramps = ramps; st.hz = hz;

    let meCol = 0xe03131, meAcc = 0xffe066, pName = "";
    try {
      const pid = (GF.advantage && GF.advantage().partner) || (window.HM_APP && HM_APP.state && HM_APP.state().partner);
      const gk = window.HMGK && HMGK.CHARS && pid && HMGK.CHARS.find((c) => c.id === pid);
      const ch = gk || (window.GCArt && GCArt.charById && pid && GCArt.charById(pid)) || null;
      if (ch && ch.color) meCol = new T.Color(ch.color).getHex();
      if (ch && (ch.call || ch.name)) pName = ch.call || ch.name;
    } catch (e) {}
    const pal = R.pal || [0x4dabf7, 0x51cf66, 0xcc5de8, 0xff922b, 0x20c997, 0xf06595, 0xe8590c];
    const NR = R.racers || RACERS;
    const build = R.build || buildKart;
    const T0 = closed ? 0.995 : 0.03;
    const names = ["あおい", "みどり", "すみれ", "ひなた", "かい", "りん", "翔太"];
    const sk = skillOf(diff);
    const racers = [];
    const p0 = curve.getPointAt(T0), t0v = curve.getTangentAt(T0);
    const side0 = new T.Vector3().set(0, 1, 0).cross(t0v).normalize();
    const yaw0 = Math.atan2(t0v.x, t0v.z);
    for (let i = 0; i < NR; i++) {
      const meF = i === 0;
      const lane = R.grid ? R.grid(i, RW).lane : (i % 2 ? 1 : -1) * (1.6 + (i % 2) * 0.2);
      const back = R.grid ? R.grid(i, RW).back : Math.floor(i / 2) * 2.8;
      const col = meF ? meCol : pal[(i - 1) % pal.length];
      const acc = meF ? meAcc : 0xffffff;
      const mesh = build(T, col, acc, meF, i + 1, theme);
      const x = p0.x - t0v.x * back + side0.x * lane;
      const z = p0.z - t0v.z * back + side0.z * lane;
      mesh.position.set(x, p0.y, z); mesh.rotation.y = yaw0; scene.add(mesh);
      racers.push({
        me: meF, name: meF ? (GF.getNick && GF.getNick() || "きみ") : names[i - 1],
        col, mesh, x, y: p0.y, z, yaw: yaw0, speed: 0, slip: 0, steer: 0, idx: i, stam: 1, pen: 0, ay: 0, vy: 0, air: 0, nitro: 0.35, draft: 0,
        drift: 0, charge: 0, boost: 0, hit: 0, ink: 0, shield: 0,
        item: null, lap: 0, sector: 0, t: T0, place: i + 1, fin: 0,
        sk: meF ? 1 : (sk * (0.96 + (i * 0.012) % 0.08)), spin: 0, roll: 0, pitch: 0, lastStamp: 0
      });
    }
    const me = racers[0];
    const input = { steer: 0, accel: 0, brake: 0, drift: 0 };
    const keys = { left: 0, right: 0, accel: 0, brake: 0, drift: 0 };
    function syncInput() {
      const s = (keys.right ? 1 : 0) + (keys.left ? -1 : 0);
      input.steer = s;
      if (!input._touchAccel) input.accel = keys.accel;
      if (!input._touchBrake) input.brake = keys.brake;
      if (!input._touchDrift) input.drift = keys.drift;
    }
    st.input = input; st.me = me; st.racers = racers; st.keys = keys;
    const ctx = { T, scene, curve, closed, RW, theme, racers, me, st, input, veh, laps, placeOn, curveLen, FX: null, fx3: null, say: null };

    function bindHold(el, key) {
      const ids = new Set();
      const on = (e) => {
        e.preventDefault(); e.stopPropagation();
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
        ids.add(e.pointerId);
        if (key === "left") { keys.left = 1; input._touchSteer = 1; }
        else if (key === "right") { keys.right = 1; input._touchSteer = 1; }
        else if (key === "accel") { input.accel = 1; input._touchAccel = 1; }
        else if (key === "brake") { input.brake = 1; input._touchBrake = 1; }
        else if (key === "drift") { input.drift = 1; input._touchDrift = 1; }
        el.classList.add("on");
        syncInput();
      };
      const off = (e) => {
        if (e && e.pointerId != null) ids.delete(e.pointerId);
        else ids.clear();
        if (ids.size) return;
        if (key === "left") keys.left = 0;
        else if (key === "right") keys.right = 0;
        else if (key === "accel") { input.accel = 0; input._touchAccel = 0; }
        else if (key === "brake") { input.brake = 0; input._touchBrake = 0; }
        else if (key === "drift") { input.drift = 0; input._touchDrift = 0; }
        el.classList.remove("on");
        syncInput();
      };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointercancel", off);
      st.unbind.push(() => { el.removeEventListener("pointerdown", on); el.removeEventListener("pointerup", off); el.removeEventListener("pointercancel", off); });
    }
    body.querySelectorAll("[data-hold]").forEach((el) => bindHold(el, el.getAttribute("data-hold")));

    const itemBtn = body.querySelector("[data-item]");
    const useItem = () => {
      if (!st.go || me.fin || !me.item) return;
      const it = me.item; me.item = null;
      body.querySelector(".r3d-item").hidden = true;
      FX.SFX.itemUse();
      if (it === "boost") { me.boost = Math.max(me.boost, 1.4); FX.SFX.boost(); shake.add(5); overlay.flash("#74c0fc", 0.3); }
      else if (it === "shield") { me.shield = 2.2; overlay.flash("#ffe066", 0.2); }
      else if (it === "ink") { st.puddles.push(makePuddle(me.x, me.z, me.y - me.ay)); }
      else if (it === "star") { st.shots.push(makeShot(me, me.yaw)); FX.SFX.whoosh(); }
    };
    const onItem = (e) => { e.preventDefault(); useItem(); };
    if (itemBtn) {
      itemBtn.addEventListener("pointerdown", onItem);
      st.unbind.push(() => itemBtn.removeEventListener("pointerdown", onItem));
    }

    const kd = (e) => {
      const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k;
      if (k === "ArrowLeft" || kl === "a") keys.left = 1;
      if (k === "ArrowRight" || kl === "d") keys.right = 1;
      if (k === "ArrowUp" || kl === "w") keys.accel = 1;
      if (k === "ArrowDown" || kl === "s") keys.brake = 1;
      if (k === "Shift" || k === " ") { e.preventDefault(); keys.drift = 1; }
      if ((kl === "x" || kl === "e") && !e.repeat) { e.preventDefault(); useItem(); }
      syncInput();
    };
    const ku = (e) => {
      const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k;
      if (k === "ArrowLeft" || kl === "a") keys.left = 0;
      if (k === "ArrowRight" || kl === "d") keys.right = 0;
      if (k === "ArrowUp" || kl === "w") keys.accel = 0;
      if (k === "ArrowDown" || kl === "s") keys.brake = 0;
      if (k === "Shift" || k === " ") keys.drift = 0;
      syncInput();
    };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    st.unbind.push(() => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); });

    st.puddles = []; st.shots = [];
    function makePuddle(x, z, y) {
      const mesh = new T.Mesh(new T.CircleGeometry(1.25, 14), new T.MeshBasicMaterial({ color: 0x1a1d27, transparent: true, opacity: 0.72 }));
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, (y || 0) + 0.08, z); scene.add(mesh);
      return { x, z, life: 7, mesh };
    }
    function makeShot(from, yaw) {
      const mesh = new T.Mesh(new T.SphereGeometry(0.22, 8, 6), new T.MeshBasicMaterial({ color: 0xffe066 }));
      const sy = from.y - (from.ay || 0) + 0.7;
      mesh.position.set(from.x, sy, from.z); scene.add(mesh);
      return { x: from.x, y: sy, z: from.z, t: from.t, yaw, life: 2.2, from, mesh };
    }
    const cheer = body.querySelector(".r3d-cheer");
    const finalEl = body.querySelector(".r3d-final");
    let cheerT = 0, finalT = 0, saidFinal = false;
    function say(text) {
      if (!text) return;
      cheer.hidden = false; cheer.textContent = text; cheerT = 2.2;
    }
    try {
      const p = (GF.advantage && GF.advantage().partner) || "";
      say(p === "shota" ? "先輩、いってらっしゃいっす！" : ((pName || "相棒") + "「いってらっしゃい！ 1位めざそう！」"));
    } catch (e) { say("いってらっしゃい！ 1位めざそう！"); }

    ctx.FX = FX; ctx.fx3 = fx3; ctx.say = say; ctx.overlay = overlay; ctx.shake = shake; ctx.camera = camera; ctx.raced = () => raced; ctx.progress = (r) => progress(r);
    const hooks = R.setup ? R.setup(ctx) : null;
    st.hooks = hooks;
    // スリップストリーム：前の相手のすぐ後ろにつくと、空気の抵抗が減って速くなる
    let draftSaid = 0;
    function stepDraft(dt) {
      racers.forEach((r) => {
        const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw);
        let on = false;
        for (const o of racers) {
          if (o === r || o.speed < 6) continue;
          const dx = o.x - r.x, dz = o.z - r.z, al = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
          if (al > 1.2 && al < 6.5 && lat < 1.35) { on = true; break; }
        }
        r.draft = Math.max(0, Math.min(1, r.draft + (on ? dt * 1.6 : -dt * 1.2)));
        if (r.me && r.draft > 0.6) {
          if (st.t - draftSaid > 7) { draftSaid = st.t; say("スリップストリーム！ 前の人のうしろで風よけ"); }
          if (Math.random() < dt * 10) fx3.burst(new T.Vector3(r.x + fx * 1.4, r.y + 0.8, r.z + fz * 1.4), ["#ffffff", "#d0ebff"], 1, 6, 0.25);
        }
      });
    }

    function layout() {
      const w = W0(), h = H0();
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      overlay.resize(w, h, Math.min(dpr, 1.5));
    }
    layout();
    st.onResize = layout; window.addEventListener("resize", layout);

    const tmpP = new T.Vector3(), tmpT = new T.Vector3(), camP = new T.Vector3(), camL = new T.Vector3();
    // スタートは少し後ろ・上から見て、他のカートに埋まらないようにする
    camP.set(me.x - Math.sin(me.yaw) * 8.6, me.y + 4.1, me.z - Math.cos(me.yaw) * 8.6);
    camL.set(me.x + Math.sin(me.yaw) * 5, me.y + 0.7, me.z + Math.cos(me.yaw) * 5);
    const unlock = () => { try { FX.ctx(); } catch (e) {} };
    body.addEventListener("pointerdown", unlock, { once: true });
    st.unbind.push(() => body.removeEventListener("pointerdown", unlock));
    try { FX.ctx(); } catch (e) {}
    let low = 0, fpsE = 60, last = 0, raced = 0;
    const hudPos = body.querySelector(".r3d-pos");
    const hudLap = body.querySelector(".r3d-lap");
    const hudTime = body.querySelector(".r3d-time");
    const hudItem = body.querySelector(".r3d-item");
    const hudMt = body.querySelector(".r3d-mt i");
    const cdEl = body.querySelector(".r3d-cd");

    function progress(r) { return closed ? r.lap + (((r.t - 0.995) % 1) + 1) % 1 : r.t; }
    function rank() {
      const a = racers.slice().sort((x, y) => progress(y) - progress(x) || (x.fin || 99) - (y.fin || 99));
      a.forEach((r, i) => { r.place = i + 1; });
    }

    function hitEdge(r, t, p, tan) {
      const side = new T.Vector3().set(0, 1, 0).cross(tan);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0); else side.normalize();
      const dx = r.x - p.x, dz = r.z - p.z;
      const lat = dx * side.x + dz * side.z;
      const lim = RW - 0.7;
      if (Math.abs(lat) > lim) {
        const over = Math.abs(lat) - lim, sgn = lat > 0 ? 1 : -1;
        r.x -= side.x * sgn * (over + 0.04);
        r.z -= side.z * sgn * (over + 0.04);
        const want = Math.atan2(tan.x, tan.z);
        let err = want - r.yaw;
        while (err > Math.PI) err -= Math.PI * 2; while (err < -Math.PI) err += Math.PI * 2;
        r.yaw += err * 0.55;
        r.slip *= 0.4;
        const first = r.hit <= 0;
        if (first) {
          r.speed *= 0.78;
          r.hit = 0.18;
          if (r.me) { shake.add(7); FX.SFX.crash(); fx3.burst(new T.Vector3(r.x, r.y + 0.3, r.z), ["#fff", "#ffd43b"], 10, 5, 0.35); }
        }
        return true;
      }
      return false;
    }

    function playerSteer() {
      const cr = camRightXZ(camera);
      return screenSteer(input.steer, me.yaw, cr.x, cr.z);
    }

    function stepRacer(r, dt, isGo) {
      if (r.fin) { r.speed *= 1 - dt * 1.6; }
      r.hit = Math.max(0, r.hit - dt); r.boost = Math.max(0, r.boost - dt); r.ink = Math.max(0, r.ink - dt); r.shield = Math.max(0, r.shield - dt);
      let steer = r.me ? playerSteer() : r.steer;
      const spd = Math.abs(r.speed);
      const actOn = !r.fin && isGo && (r.me ? input.drift : r.wantDrift);
      const drifting = ACT === "drift" && actOn && Math.abs(steer) > 0.2 && r.speed > 7 && !r.air;
      // ドリフト以外のボタン：スパート（スタミナを使う）・クラウチ（前かがみ）・ニトロ
      r.spurt = 0;
      if (ACT === "spurt") {
        if (actOn && r.stam > 0.02 && r.speed > 3) { r.spurt = 1; r.stam = Math.max(0, r.stam - dt * (R.stamUse || 0.26)); }
        else r.stam = Math.min(1, r.stam + dt * (R.stamGain || 0.075));
      } else if (ACT === "tuck") {
        r.spurt = actOn && r.speed > 3 ? 1 : 0;
      } else if (ACT === "nitro") {
        if (actOn && r.nitro > 0.02) { r.spurt = 1; r.nitro = Math.max(0, r.nitro - dt * 0.42); r.boost = Math.max(r.boost, 0.12); }
      }
      if (r.air) steer *= 0.35;
      if (drifting) {
        r.drift = 1; r.charge += dt; r.slip += (steer * 0.9 - r.slip) * dt * 4;
        if (r.me && Math.random() < dt * 10) {
          FX.SFX.drift();
          fx3.burst(new T.Vector3(r.x - Math.cos(r.yaw) * 0.5, r.y + 0.12, r.z + Math.sin(r.yaw) * 0.5), ["#cfd4e0", "#fff", "#ffd43b"], 4, 3, 0.28);
        }
        r.lastStamp += spd * dt;
        if (r.lastStamp > 0.42) { r.lastStamp = 0; marks.stamp(r.x - Math.sin(r.yaw) * 0.55, r.z - Math.cos(r.yaw) * 0.55, r.yaw, r.y - r.ay); }
      } else {
        r.drift = 0; r.slip += (0 - r.slip) * dt * 6;
        if (r.charge >= veh.mt2) { r.boost = Math.max(r.boost, veh.mt2Boost); if (r.me) { FX.SFX.boost(); overlay.flash("#ff922b", 0.28); shake.add(4); } }
        else if (r.charge >= veh.mt1) { r.boost = Math.max(r.boost, veh.mt1Boost); if (r.me) { FX.SFX.boost(); overlay.flash("#74c0fc", 0.22); } }
        r.charge = 0; r.lastStamp = 0;
      }
      let cap = r.boost > 0 ? veh.boostMax : veh.max;
      if (r.spurt && ACT !== "nitro") cap *= ACT === "tuck" ? 1.12 : 1.16;
      if (r.draft > 0) cap += 2.4 * r.draft;
      if (r.mud > 0) cap *= 0.62;
      const inkMul = r.ink > 0 && r.shield <= 0 ? 0.52 : 1;
      if (isGo && !r.fin) {
        const acc = r.me ? input.accel : 1;
        const brk = r.me ? input.brake : 0;
        if (acc) r.speed += veh.accel * dt * (r.boost > 0 ? 1.45 : 1) * (r.spurt ? 1.3 : 1) * (r.me ? 1 : r.sk);
        if (brk) {
          if (r.speed > 0.35) r.speed -= veh.brake * dt;
          else r.speed -= veh.brake * 0.4 * dt;
        }
      }
      r.speed -= r.speed * veh.drag * dt;
      if (Math.abs(steer) > 0.2 && !r.drift && r.speed > 0) r.speed -= Math.abs(steer) * r.speed * 0.32 * dt;
      if (r.speed > cap * inkMul) r.speed += (cap * inkMul - r.speed) * dt * 3;
      if (r.speed < -(veh.revMax || 7)) r.speed += (-(veh.revMax || 7) - r.speed) * dt * 4;
      if (r.hit > 0) r.speed *= 1 - dt * 0.8;
      const turn = (r.drift ? veh.driftTurn : veh.turn) * (0.45 + 0.55 * Math.min(1, spd / 14)) * (ACT === "tuck" && r.spurt ? 0.6 : 1);
      r.yaw += steer * turn * dt * (spd / Math.max(4, veh.max)) * (r.drift ? 1.15 : 1);
      const yaw = r.yaw + r.slip * 0.35;
      r.x += Math.sin(yaw) * r.speed * dt;
      r.z += Math.cos(yaw) * r.speed * dt;
      r.t = nearestT(curve, r.x, r.z, r.t, segs);
      sampleAt(curve, r.t, tmpP, tmpT);
      // 波・流れ（ボートなど）：横に流される
      if (R.current && isGo && !r.fin) {
        const sx = tmpT.z, sz = -tmpT.x, k = Math.sin(st.t * 0.9 + r.t * 40) * R.current * dt;
        r.x += sx * k; r.z += sz * k;
      }
      // ジャンプ台
      const prevT = r._pt == null ? r.t : r._pt; r._pt = r.t;
      if (!r.air && r.speed > 8) ramps.forEach((rp) => {
        if ((prevT < rp.t && r.t >= rp.t && r.t - prevT < 0.05)) {
          r.air = 1; r.vy = 3.2 + r.speed * 0.17;
          if (r.me) { FX.SFX.whoosh(); shake.add(3); }
        }
      });
      if (r.air) {
        r.ay += r.vy * dt; r.vy -= 17 * dt;
        if (r.ay <= 0) {
          r.ay = 0; r.air = 0; r.vy = 0;
          if (r.me) { shake.add(6); FX.SFX.hit(); fx3.burst(new T.Vector3(r.x, tmpP.y + 0.2, r.z), R.spray || ["#fff", "#ffd43b"], 12, 5, 0.4); }
          if (R.landBoost) r.boost = Math.max(r.boost, R.landBoost);
        }
      }
      r.y = tmpP.y + r.ay; hitEdge(r, r.t, tmpP, tmpT);
      // しかけに当たる
      r.mud = Math.max(0, (r.mud || 0) - dt);
      for (let k = 0; k < hz.length; k++) {
        const h = hz[k]; if (r.air && h.kind !== "ring") continue;
        const dx = r.x - h.x, dz = r.z - h.z;
        if (dx * dx + dz * dz > h.r * h.r * 1.5) continue;
        if (h.kind === "mud") { if (r.shield <= 0) r.mud = 0.35; if (r.me && Math.random() < dt * 8) fx3.burst(new T.Vector3(r.x, r.y + 0.2, r.z), R.mudCol || ["#6b4423", "#8b5a2b"], 3, 3, 0.35); }
        else if (h.kind === "pad" || h.kind === "ring") {
          if (r.boost < 0.6) { r.boost = Math.max(r.boost, h.kind === "ring" ? 1.1 : 0.9); if (r.me) { FX.SFX.boost(); overlay.flash("#74c0fc", 0.25); shake.add(3); } }
        } else if (r.shield <= 0 && r.hit <= 0.05) {
          r.hit = 0.45; r.speed *= 0.55; r.slip += (dx * tmpT.z - dz * tmpT.x) > 0 ? 0.6 : -0.6;
          if (r.me) { shake.add(8); FX.SFX.crash(); fx3.burst(new T.Vector3(h.x, h.y + 0.5, h.z), R.spray || ["#fff", "#ffd43b"], 10, 5, 0.4); }
        }
      }
      if (R.onRacer) R.onRacer(ctx, r, dt, isGo);
      if (!closed) {
        if (r.t >= FIN_T && !r.fin && isGo) { r.fin = raced + r.pen; rank(); if (r.me) finish(); }
        if (r.me && r.t > 0.78 && !saidFinal) { saidFinal = true; finalEl.textContent = R.lastText || "ラストスパート！"; finalEl.hidden = false; finalT = 2.4; FX.SFX.star(); }
      }
      const sec = closed ? Math.floor(((((r.t - 0.995) % 1) + 1) % 1) * 8) : -1;
      if (r.secBits == null) r.secBits = 0;
      if (sec === (r.sector + 1) % 8) {
        r.sector = sec;
        r.secBits |= (1 << sec);
        if (sec === 0 && (r.secBits & 0xFE) === 0xFE && !r.fin) { r.lap++; r.secBits = 1; }
      }
      if (closed && r.lap >= laps && !r.fin) { r.fin = raced + r.pen; rank(); if (r.me) finish(); }
      if (closed && r.me && r.lap === laps - 1 && !saidFinal) {
        saidFinal = true; finalEl.hidden = false; finalT = 2.6; FX.SFX.star();
      }
      // 見た目：タイヤ回転・切れ角・ロール・ピッチ・炎・影
      r.spin += r.speed * dt * 2.4;
      r.roll += ((-steer * 0.22 - r.slip * 0.14) - r.roll) * dt * 8;
      const accNow = (r.me ? (input.accel ? 1 : 0) - (input.brake ? 1 : 0) : 0.4);
      const slope = r.air ? 0 : -Math.asin(Math.max(-0.6, Math.min(0.6, tmpT.y)));
      r.pitch += ((accNow * 0.06 - r.speed * 0.004 + slope) - r.pitch) * dt * 8;
      r.mesh.position.set(r.x, r.y, r.z);
      r.mesh.rotation.set(0, r.yaw, 0);
      const ud = r.mesh.userData;
      if (ud && ud.body) ud.body.rotation.set(r.pitch, 0, r.roll);
      if (ud && ud.wheels) {
        ud.wheels.forEach((w) => {
          w.tire.rotation.x = r.spin;
          if (w.front) w.grp.rotation.y = -steer * 0.5;
        });
      }
      if (ud && ud.flames) {
        const on = r.boost > 0 || r.speed > 15;
        ud.flames.forEach((fl, i) => {
          fl.material.opacity = r.boost > 0 ? 0.7 + Math.sin(st.t * 28 + i) * 0.2 : (on ? 0.22 : 0);
          fl.scale.y = r.boost > 0 ? 1.3 + Math.sin(st.t * 22 + i) * 0.2 : 0.75;
          if (r.boost > 0) fl.material.color.set(i ? 0xff922b : 0x74c0fc);
        });
      }
      if (ud && ud.shadow) { ud.shadow.position.set(0, 0.03 - r.ay, 0); const s = Math.max(0.45, 1 - r.ay * 0.18); ud.shadow.scale.set(s, s, s); }
      if (R.bob) { const b = Math.sin(st.t * 3.1 + r.idx * 1.7) * R.bob * (0.4 + Math.min(1, spd / 12)); r.mesh.position.y += b; if (ud && ud.body) ud.body.rotation.x += Math.cos(st.t * 3.1 + r.idx * 1.7) * R.bob * 0.5; }
      if (ud && ud.anim) ud.anim(r, dt, st.t, steer, r.me ? input : null);
      if (R.spray && spd > 6 && !r.air && Math.random() < dt * (r.me ? 14 : 4)) {
        fx3.burst(new T.Vector3(r.x - Math.sin(r.yaw) * 0.9, r.y + 0.15, r.z - Math.cos(r.yaw) * 0.9), R.spray, r.me ? 3 : 2, 2.5 + spd * 0.08, 0.35);
      }
    }

    function cpu(r, dt) {
      sampleAt(curve, r.t + (11.7 / curveLen) * (R.look || 1) * r.sk, tmpP, tmpT);
      const want = Math.atan2(tmpP.x - r.x, tmpP.z - r.z);
      let err = want - r.yaw; while (err > Math.PI) err -= Math.PI * 2; while (err < -Math.PI) err += Math.PI * 2;
      r.steer = Math.max(-1, Math.min(1, err * 1.6));
      r.wantDrift = Math.abs(err) > 0.45 && r.speed > 10;
      if (ACT !== "drift") {
        const pr = progress(r), endish = closed ? (r.lap >= laps - 1 && (pr % 1) > 0.55) : pr > 0.62;
        r.wantDrift = ACT === "tuck" ? Math.abs(err) < 0.12 : ACT === "nitro" ? (r.nitro > 0.5 && Math.abs(err) < 0.2) : (endish && r.stam > 0.05) || r.stam > 0.97;
      }
      if (R.cpu) R.cpu(ctx, r, dt);
      if (r.item && Math.random() < dt * 0.35) {
        const it = r.item; r.item = null;
        if (it === "boost") r.boost = Math.max(r.boost, 1.2);
        else if (it === "shield") r.shield = 2;
        else if (it === "ink") st.puddles.push(makePuddle(r.x, r.z, r.y - r.ay));
        else if (it === "star") st.shots.push(makeShot(r, r.yaw));
      }
    }

    function pickBoxes(dt) {
      const spin = st.t * 2;
      boxes.forEach((b) => {
        b.m.rotation.y = spin; b.m.position.y = b.y0 + 0.7 + Math.sin(st.t * 3 + b.t * 8) * 0.08;
        if (!b.live) { b.ready -= dt; if (b.ready <= 0) { b.live = true; b.m.visible = true; } return; }
        racers.forEach((r) => {
          if (!b.live || r.fin) return;
          const dx = r.x - b.m.position.x, dz = r.z - b.m.position.z;
          if (dx * dx + dz * dz < 1.1) {
            b.live = false; b.m.visible = false; b.ready = 4;
            if (!r.item) {
              r.item = ITEM_IDS[(Math.random() * ITEM_IDS.length) | 0];
              if (r.me) { hudItem.hidden = false; hudItem.textContent = ITEM_NAMES[r.item]; FX.SFX.itemGet(); }
            }
          }
        });
      });
    }
    function dropShot(s) { if (s.mesh) scene.remove(s.mesh); }
    const shP = new T.Vector3(), shT = new T.Vector3();
    function stepHazards(dt) {
      for (let i = st.puddles.length - 1; i >= 0; i--) {
        const p = st.puddles[i]; p.life -= dt;
        if (p.mesh) p.mesh.material.opacity = Math.max(0.15, p.life / 7 * 0.72);
        if (p.life <= 0) { if (p.mesh) scene.remove(p.mesh); st.puddles.splice(i, 1); continue; }
        racers.forEach((r) => {
          if (r.shield > 0) return;
          const dx = r.x - p.x, dz = r.z - p.z;
          if (dx * dx + dz * dz < 2.2) r.ink = Math.max(r.ink, 1.1);
        });
      }
      for (let i = st.shots.length - 1; i >= 0; i--) {
        const sh = st.shots[i]; sh.life -= dt;
        sh.x += Math.sin(sh.yaw) * 38 * dt; sh.z += Math.cos(sh.yaw) * 38 * dt;
        sh.t = nearestT(curve, sh.x, sh.z, sh.t, segs); sampleAt(curve, sh.t, shP, shT); sh.y += (shP.y + 0.7 - sh.y) * Math.min(1, dt * 10);
        if (sh.mesh) sh.mesh.position.set(sh.x, sh.y, sh.z);
        if (sh.life <= 0) { dropShot(sh); st.shots.splice(i, 1); continue; }
        let hitOne = false;
        racers.forEach((r) => {
          if (hitOne || r === sh.from || r.fin || r.shield > 0) return;
          const dx = r.x - sh.x, dz = r.z - sh.z;
          if (dx * dx + dz * dz < 1.4) {
            r.hit = 0.7; r.speed *= 0.3;
            if (r.me) { shake.add(9); FX.SFX.hit(); }
            dropShot(sh); st.shots.splice(i, 1); hitOne = true;
          }
        });
      }
    }

    function finish() {
      if (st.done) return;
      st.done = true; st.go = false;
      if (st.engine) st.engine.stop();
      FX.SFX.finish();
      // ペナルティ（スキーの旗門など）があるときは、タイムで順位を決める（まだゴールしていない相手は今のペースで見積もる）
      if (racers.some((r) => r.pen > 0)) {
        const est = (r) => r.fin || (raced + r.pen + Math.max(0, (closed ? laps - progress(r) : FIN_T - r.t)) * curveLen / Math.max(6, r.speed || veh.max * 0.8));
        me.place = 1 + racers.filter((r) => r !== me && est(r) < me.fin).length;
      }
      const place = me.place, win = place === 1;
      say(win ? "1位！ すごい！" : place + "位だったよ。もう一回いってみよう！");
      overlay.flash(win ? "#ffe066" : "#9fb4ff", 0.45);
      GF.reportGame(st.id, diff, win, { metric: { v: Math.round(me.fin * 100) / 100, unit: "秒", lower: true, label: "タイム", winOnly: false } });
      setTimeout(() => {
        if (st.dead) return;
        GF.showResult({
          win, title: win ? "1位！ ゴール！" : place + "位でゴール",
          text: "タイム " + me.fin.toFixed(2) + "秒" + (closed ? "（" + laps + "周）" : "") + (me.pen ? "　ペナルティ +" + me.pen + "秒ふくむ" : "") + (R.resultNote ? R.resultNote(ctx) : ""),
          onRetry: () => { stopAll(st); start(Object.assign({}, opts, { diff, laps })); }
        });
      }, 900);
    }

    function drawMap() {
      const c = mapcv.getContext("2d"), w = 140, h = 140;
      c.clearRect(0, 0, w, h);
      c.fillStyle = "rgba(10,14,40,.55)"; c.beginPath(); c.arc(70, 70, 66, 0, 7); c.fill();
      let minX = 99, maxX = -99, minZ = 99, maxZ = -99;
      const pts = [];
      for (let i = 0; i <= 80; i++) {
        const p = curve.getPointAt(i / 80); pts.push(p);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
      }
      const sc = 100 / Math.max(maxX - minX, maxZ - minZ);
      const X = (x) => 70 + (x - (minX + maxX) / 2) * sc, Z = (z) => 70 + (z - (minZ + maxZ) / 2) * sc;
      c.strokeStyle = "#efe7ff"; c.lineWidth = 6; c.lineJoin = "round"; c.beginPath();
      pts.forEach((p, i) => { if (i) c.lineTo(X(p.x), Z(p.z)); else c.moveTo(X(p.x), Z(p.z)); });
      c.closePath(); c.stroke();
      // ゴール位置
      const gp = curve.getPointAt(0);
      c.fillStyle = "#fff"; c.fillRect(X(gp.x) - 3, Z(gp.z) - 3, 6, 6);
      racers.forEach((r) => {
        c.fillStyle = r.me ? "#ffe066" : "#" + (r.col.toString(16).padStart(6, "0"));
        c.beginPath(); c.arc(X(r.x), Z(r.z), r.me ? 5 : 3.2, 0, 7); c.fill();
        if (r.me) { c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke(); }
      });
    }

    function loop(ts) {
      if (st.dead) return;
      const dt0 = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      const fps = dt0 > 0 ? 1 / dt0 : 60; fpsE = fpsE * 0.9 + fps * 0.1;
      if (fpsE < 45) low++; else low = Math.max(0, low - 1);
      if (low > 45 && dpr > 1) { dpr = 1; layout(); low = 0; }
      st.t += dt0;
      const cd = st.t;
      if (!st.go && !st.done) {
        const n = 3 - Math.floor(cd);
        if (st._cdn !== n) { st._cdn = n; if (n >= 0) FX.SFX.countdown(n); }
        cdEl.textContent = n > 0 ? String(n) : (cd < 3.15 ? "GO!" : "");
        if (cd >= 3) { st.go = true; raced = 0; if (!R.quiet) st.engine.start(); cdEl.textContent = ""; }
      }
      if (st.go && !st.done) raced += dt0;
      if (R.draft && st.go) stepDraft(dt0);
      racers.forEach((r) => { if (!r.me) cpu(r, dt0); stepRacer(r, dt0, st.go && !st.done); });
      if (hooks && hooks.step) hooks.step(dt0);
      pickBoxes(dt0); stepHazards(dt0); rank(); fx3.step(dt0); shake.step(dt0);
      if (cheerT > 0) { cheerT -= dt0; if (cheerT <= 0) cheer.hidden = true; }
      if (finalT > 0) { finalT -= dt0; if (finalT <= 0) finalEl.hidden = true; }

      const back = st.go ? 7.5 : 8.6, up = st.go ? 3.25 : 4.1;
      const tx = me.x - Math.sin(me.yaw) * back, tz = me.z - Math.cos(me.yaw) * back;
      const follow = st.go ? 9 : 14;
      camP.lerp(new T.Vector3(tx, me.y + up, tz), 1 - Math.exp(-dt0 * follow));
      camL.lerp(new T.Vector3(me.x + Math.sin(me.yaw) * 5.5, me.y + 0.65, me.z + Math.cos(me.yaw) * 5.5), 1 - Math.exp(-dt0 * (follow + 2)));
      camera.position.set(camP.x + shake.x, camP.y + shake.y, camP.z + shake.z);
      camera.lookAt(camL);
      if (st.engine && st.go) st.engine.set(Math.min(1, Math.abs(me.speed) / veh.boostMax), me.boost > 0 ? 0.045 : 0.03);
      overlay.step(dt0, Math.min(1, Math.max(0, me.speed) / veh.boostMax));
      hudPos.textContent = me.place + "位";
      hudLap.textContent = closed ? "LAP " + Math.min(laps, me.lap + 1) + "/" + laps : "ゴールまで " + Math.max(0, Math.round((FIN_T - me.t) * curveLen)) + "m";
      hudTime.textContent = (st.done ? me.fin : raced + me.pen).toFixed(2) + (me.pen ? "（+" + me.pen + "）" : "");
      if (ACT === "drift") {
        const mt = me.charge;
        hudMt.style.width = Math.min(100, (mt / veh.mt2) * 100) + "%";
        hudMt.style.background = mt >= veh.mt2 ? "#ff922b" : (mt >= veh.mt1 ? "#74c0fc" : "rgba(255,255,255,.55)");
      } else {
        const g = ACT === "spurt" ? me.stam : ACT === "nitro" ? me.nitro : Math.min(1, Math.max(0, me.speed) / (veh.max * 1.12));
        hudMt.style.width = Math.round(g * 100) + "%";
        hudMt.style.background = ACT === "nitro" ? "#74c0fc" : ACT === "spurt" ? (g < 0.25 ? "#ff6b6b" : "#69db7c") : (me.spurt ? "#ffe066" : "rgba(255,255,255,.55)");
      }
      if (st.t * 8 % 1 < dt0 * 8) drawMap();
      renderer.render(scene, camera);
      st.raf = requestAnimationFrame(loop);
      st.fps = fpsE;
    }
    st.raf = requestAnimationFrame(loop);
    window.__R3D = st;
    return st;
  }

  function start(opts) {
    const GF = window.GF;
    const diff = opts.diff || "normal";
    const sprint = !!(opts.race && opts.race.sprint);
    const laps = sprint ? 1 : clampLaps(opts.laps != null ? opts.laps : (window.HMRace3d && HMRace3d.pendingLaps));
    opts = Object.assign({}, opts, { laps });
    let cancelled = false;
    const body = GF.openLayer((opts.title || "カート") + "（" + GF.diffName(diff) + (sprint ? "" : "・" + laps + "周") + "）", () => {
      cancelled = true;
      if (window.__R3D && !window.__R3D.dead) stopAll(window.__R3D);
    });
    body.innerHTML = '<div class="r3d-wait">コースを用意しているよ…</div>';
    const fb = opts.fallback || prevKart;
    loadThree().then((T) => {
      if (!cancelled) boot(T, body, opts, diff);
    }).catch((err) => {
      console.error(err);
      if (!cancelled && fb) fb(diff);
    });
  }

  H.add({
    id: "kart", e: "🏎️", n: "カート", c: "#e03131", genre: "race", fresh: true, pro: true,
    d: "学園のサーキットを3Dで走るよ。すすむ・とまる・左右で操作して、ドリフトとアイテムで1位をめざそう。"
  }, (diff) => start({ id: "kart", title: "カート", vehicle: "kart", theme: "campus", items: true, drift: true, diff, laps: (window.HMRace3d && HMRace3d.pendingLaps) || DEFAULT_LAPS }));

  // 3Dレースの登録。周回のあるレースだけ、モード選択で「2周・3周」をえらべる
  const LAPS_IDS = { kart: 1 };
  function register(def) {
    const prev = (window.GCGames && GCGames.open && GCGames.open[def.id]) || null;
    if (!def.race || !def.race.sprint) LAPS_IDS[def.id] = 1;
    H.add({ id: def.id, e: def.e, n: def.n, c: def.c, genre: "race", fresh: true, pro: true, d: def.d }, (diff) => start({
      id: def.id, title: def.title || def.n, vehicle: def.vehicle, theme: def.theme, race: def.race, diff,
      laps: (window.HMRace3d && HMRace3d.pendingLaps) || DEFAULT_LAPS, fallback: prev
    }));
  }
  const hasLaps = (id) => !!LAPS_IDS[id];
  window.HMRace3d = { start, loadThree, screenSteer, camRightXZ, clampLaps, register, hasLaps, VEHICLES, THEMES, ITEM_NAMES, DEFAULT_LAPS, RACERS, ROAD_W, FIN_T, pendingLaps: DEFAULT_LAPS,
    kit: { G, canvasTex, signTex, makeTree, roadGeom, plateTex, buildKart } };
})();
