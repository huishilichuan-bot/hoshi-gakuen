/* ほしの学園 — 3Dレースの土台と「カート」。Three.js は初回だけ読み込む。オリジナル。 */
(function () {
  "use strict";
  const H = window.HMGames, Fx = () => window.HMFx;
  const prevKart = (window.GCGames && GCGames.open && GCGames.open.kart) || null;
  const THREE_URL = "./vendor/three.module.min.js";
  let THREE = null, loadP = null;

  // 固定の性能（カート）。あとから乗り物を足すときも同じキーで上書きする。
  const VEHICLES = {
    kart: { id: "kart", n: "カート", accel: 17, brake: 26, drag: 0.55, max: 22, boostMax: 30.5, turn: 2.35, driftTurn: 3.15, grip: 0.88, mt1: 0.7, mt2: 1.35, mt1Boost: 0.7, mt2Boost: 1.2 },
    bike: { id: "bike", n: "バイク", accel: 19, brake: 24, drag: 0.48, max: 26, boostMax: 34, turn: 2.05, driftTurn: 2.7, grip: 0.8, mt1: 0.65, mt2: 1.25, mt1Boost: 0.65, mt2Boost: 1.1 },
    rally: { id: "rally", n: "ダートラリー", accel: 15, brake: 22, drag: 0.62, max: 20, boostMax: 27, turn: 2.15, driftTurn: 3.4, grip: 0.72, mt1: 0.75, mt2: 1.4, mt1Boost: 0.7, mt2Boost: 1.15 },
    boat: { id: "boat", n: "ボート", accel: 14, brake: 18, drag: 0.7, max: 19, boostMax: 26, turn: 1.9, driftTurn: 2.6, grip: 0.7, mt1: 0.8, mt2: 1.5, mt1Boost: 0.8, mt2Boost: 1.2 },
    jetski: { id: "jetski", n: "水上バイク", accel: 18, brake: 20, drag: 0.58, max: 24, boostMax: 32, turn: 2.2, driftTurn: 3.0, grip: 0.74, mt1: 0.65, mt2: 1.25, mt1Boost: 0.7, mt2Boost: 1.15 },
    ski: { id: "ski", n: "スキー", accel: 16, brake: 14, drag: 0.42, max: 25, boostMax: 33, turn: 2.0, driftTurn: 2.8, grip: 0.76, mt1: 0.7, mt2: 1.3, mt1Boost: 0.7, mt2Boost: 1.15 },
    snowboard: { id: "snowboard", n: "スノボ", accel: 16, brake: 16, drag: 0.45, max: 24, boostMax: 32, turn: 2.15, driftTurn: 3.1, grip: 0.74, mt1: 0.7, mt2: 1.3, mt1Boost: 0.7, mt2Boost: 1.2 },
    sled: { id: "sled", n: "犬そり", accel: 13, brake: 20, drag: 0.6, max: 18, boostMax: 24, turn: 2.0, driftTurn: 2.9, grip: 0.8, mt1: 0.8, mt2: 1.5, mt1Boost: 0.75, mt2Boost: 1.15 },
    space: { id: "space", n: "宇宙", accel: 18, brake: 16, drag: 0.35, max: 28, boostMax: 38, turn: 1.85, driftTurn: 2.4, grip: 0.68, mt1: 0.6, mt2: 1.15, mt1Boost: 0.8, mt2Boost: 1.3 },
    horse: { id: "horse", n: "競馬", accel: 15, brake: 22, drag: 0.58, max: 23, boostMax: 29, turn: 2.1, driftTurn: 2.5, grip: 0.84, mt1: 0.75, mt2: 1.4, mt1Boost: 0.65, mt2Boost: 1.05 },
    cycle: { id: "cycle", n: "ロードバイク", accel: 14, brake: 24, drag: 0.4, max: 21, boostMax: 28, turn: 2.25, driftTurn: 2.7, grip: 0.9, mt1: 0.8, mt2: 1.5, mt1Boost: 0.7, mt2Boost: 1.2 },
    highway: { id: "highway", n: "ハイウェイラッシュ", accel: 20, brake: 22, drag: 0.38, max: 30, boostMax: 40, turn: 1.7, driftTurn: 2.3, grip: 0.82, mt1: 0.6, mt2: 1.2, mt1Boost: 0.7, mt2Boost: 1.15 },
    drift: { id: "drift", n: "ターボドリフト", accel: 17, brake: 24, drag: 0.5, max: 24, boostMax: 33, turn: 2.4, driftTurn: 3.6, grip: 0.7, mt1: 0.55, mt2: 1.1, mt1Boost: 0.75, mt2Boost: 1.25 }
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
  const LAPS = 3, RACERS = 8, ROAD_W = 7.2;

  function loadThree() {
    if (THREE) return Promise.resolve(THREE);
    if (loadP) return loadP;
    loadP = import(THREE_URL).then((m) => { THREE = m; return m; });
    return loadP;
  }

  function skillOf(diff) {
    return { easy: 0.82, normal: 0.92, hard: 0.98, ultra: 1.03 }[diff] || 0.92;
  }

  // ほしのサーキット（閉じたスプライン、通学路のキャンパス）
  function campusPoints(T) {
    const P = (x, z, y) => new T.Vector3(x, y || 0, z);
    return [
      P(0, -38), P(16, -36, 0.2), P(34, -24, 0.4), P(42, -4, 0.2), P(40, 16),
      P(28, 30, 0.3), P(10, 36, 0.6), P(-8, 34, 0.4), P(-24, 22), P(-36, 8, 0.2),
      P(-38, -8), P(-28, -22, 0.15), P(-14, -30), P(-4, -36)
    ];
  }

  function makeCurve(T, pts) {
    return new T.CatmullRomCurve3(pts, true, "catmullrom", 0.18);
  }

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
      if (i < segs) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  function curbGeom(T, curve, half, segs, inward) {
    const pos = [], idx = [];
    const up = new T.Vector3(0, 1, 0), side = new T.Vector3(), tan = new T.Vector3(), p = new T.Vector3();
    const w = 0.45, h = 0.28;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPointAt(t, p); curve.getTangentAt(t, tan);
      side.crossVectors(up, tan).normalize();
      if (inward) side.negate();
      const ox = p.x + side.x * (half - 0.05), oz = p.z + side.z * (half - 0.05);
      const ix = ox + side.x * w, iz = oz + side.z * w;
      pos.push(ox, 0, oz, ox, h, oz, ix, h, iz, ix, 0, iz);
      if (i < segs) {
        const k = i * 4, n = k + 4;
        idx.push(k, n, k + 1, k + 1, n, n + 1, k + 1, n + 1, k + 2, k + 2, n + 1, n + 2, k + 2, n + 2, k + 3, k + 3, n + 2, n + 3);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    g.setIndex(idx);
    return g;
  }

  function sampleAt(curve, t, outP, outT, T) {
    const u = ((t % 1) + 1) % 1;
    curve.getPointAt(u, outP);
    if (outT) curve.getTangentAt(u, outT);
    return u;
  }

  function nearestT(curve, x, z, hint, segs) {
    let best = hint, bestD = 1e9;
    for (let k = -12; k <= 12; k++) {
      const t = (((hint + k / segs) % 1) + 1) % 1;
      const p = curve.getPointAt(t);
      const dx = p.x - x, dz = p.z - z, d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  function buildKart(T, col, accent, isMe) {
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(1.15, 0.32, 1.7), new T.MeshLambertMaterial({ color: col }));
    body.position.y = 0.38; body.castShadow = false; g.add(body);
    const hood = new T.Mesh(new T.BoxGeometry(1.05, 0.16, 0.7), new T.MeshLambertMaterial({ color: accent }));
    hood.position.set(0, 0.52, 0.35); g.add(hood);
    const wing = new T.Mesh(new T.BoxGeometry(1.25, 0.08, 0.28), new T.MeshLambertMaterial({ color: 0x222533 }));
    wing.position.set(0, 0.62, -0.78); g.add(wing);
    const cab = new T.Mesh(new T.BoxGeometry(0.7, 0.28, 0.5), new T.MeshLambertMaterial({ color: 0x1d2233 }));
    cab.position.set(0, 0.58, -0.1); g.add(cab);
    const helm = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), new T.MeshLambertMaterial({ color: isMe ? accent : 0xf3c29c }));
    helm.position.set(0, 0.78, -0.06); g.add(helm);
    const visor = new T.Mesh(new T.BoxGeometry(0.22, 0.08, 0.16), new T.MeshLambertMaterial({ color: 0x9ad0ff }));
    visor.position.set(0, 0.8, 0.1); g.add(visor);
    const wl = new T.CylinderGeometry(0.22, 0.22, 0.18, 10);
    const wm = new T.MeshLambertMaterial({ color: 0x1a1a1a });
    [[-0.58, 0.22, 0.52], [0.58, 0.22, 0.52], [-0.58, 0.22, -0.55], [0.58, 0.22, -0.55]].forEach(([x, y, z]) => {
      const w = new T.Mesh(wl, wm); w.position.set(x, y, z); w.rotation.z = Math.PI / 2; g.add(w);
    });
    const flame = new T.Mesh(new T.ConeGeometry(0.16, 0.55, 8), new T.MeshBasicMaterial({ color: 0x74c0fc, transparent: true, opacity: 0 }));
    flame.position.set(0, 0.3, -1.05); flame.rotation.x = Math.PI; flame.name = "flame"; g.add(flame);
    g.scale.setScalar(isMe ? 1 : 0.96);
    return g;
  }

  function makeTree(T, theme) {
    const g = new T.Group();
    const tr = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 0.7, 5), new T.MeshLambertMaterial({ color: 0x6b4a2b }));
    tr.position.y = 0.35; g.add(tr);
    const leaf = new T.Mesh(new T.ConeGeometry(0.7, 1.4, 7), new T.MeshLambertMaterial({ color: theme.grass2 }));
    leaf.position.y = 1.25; g.add(leaf);
    return g;
  }


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
    const veh = Object.assign({}, VEHICLES[opts.vehicle || "kart"] || VEHICLES.kart);
    const theme = THEMES[opts.theme || "campus"] || THEMES.campus;
    const GF = window.GF;
    const st = { dead: false, unbind: [], body, t: 0, go: false, done: false };
    const W0 = () => Math.max(260, body.clientWidth || 360);
    const H0 = () => Math.max(320, body.clientHeight || 520);

    body.className = (body.className || "") + " r3d-body";
    body.innerHTML = '<div class="r3d">' +
      '<canvas class="r3d-gl"></canvas><canvas class="r3d-fx"></canvas>' +
      '<canvas class="r3d-map" width="140" height="140"></canvas>' +
      '<div class="r3d-hud"><div class="r3d-pos">–</div><div class="r3d-lap">LAP 1/' + LAPS + '</div><div class="r3d-time">0.00</div>' +
      '<div class="r3d-item" hidden></div><div class="r3d-mt"><i></i></div></div>' +
      '<div class="r3d-cheer" hidden></div>' +
      '<div class="r3d-cd"></div>' +
      '<div class="r3d-pad">' +
        '<div class="r3d-steer" data-steer="1"><span class="r3d-knob"></span></div>' +
        '<div class="r3d-btns">' +
          '<button type="button" class="r3d-btn drift" data-drift="1">ドリフト</button>' +
          '<button type="button" class="r3d-btn item" data-item="1">アイテム</button>' +
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
    const camera = new T.PerspectiveCamera(58, 1, 0.1, 220);
    let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: glcv, antialias: dpr < 1.4, alpha: false, powerPreference: "high-performance" });
    } catch (err) {
      console.error(err);
      if (prevKart) prevKart(diff);
      return;
    }
    renderer.setClearColor(theme.sky, 1);
    if (T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
    st.renderer = renderer;
    const hemi = new T.HemisphereLight(0xe8f0ff, 0x3d5a3a, 1.05); scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff4e0, 0.85); sun.position.set(30, 50, 10); scene.add(sun);

    const curve = makeCurve(T, campusPoints(T));
    const segs = 180;
    const road = new T.Mesh(roadGeom(T, curve, ROAD_W, segs), new T.MeshLambertMaterial({ color: theme.road }));
    road.receiveShadow = false; scene.add(road);
    // 中央線
    const mid = new T.Mesh(roadGeom(T, curve, 0.09, 120), new T.MeshBasicMaterial({ color: theme.roadLine }));
    mid.position.y = 0.03; scene.add(mid);
    scene.add(new T.Mesh(curbGeom(T, curve, ROAD_W, 140, false), new T.MeshLambertMaterial({ color: theme.curb })));
    scene.add(new T.Mesh(curbGeom(T, curve, ROAD_W, 140, true), new T.MeshLambertMaterial({ color: theme.curb })));
    const ground = new T.Mesh(new T.CircleGeometry(90, 28), new T.MeshLambertMaterial({ color: theme.grass }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);

    // 木（インスタンスではなく少量）
    const tree = makeTree(T, theme);
    for (let i = 0; i < 22; i++) {
      const t = (i * 0.047 + 0.03) % 1, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
      const side = new T.Vector3().set(0, 1, 0).cross(tan).normalize();
      const s = (i % 2 ? 1 : -1) * (ROAD_W + 3 + (i % 5) * 0.8);
      const tr = tree.clone(); tr.position.set(p.x + side.x * s, 0, p.z + side.z * s);
      tr.rotation.y = i * 0.7; tr.scale.setScalar(0.85 + (i % 4) * 0.15); scene.add(tr);
    }
    // スタートゲート
    const gateP = curve.getPointAt(0), gateT = curve.getTangentAt(0);
    const gateSide = new T.Vector3().set(0, 1, 0).cross(gateT).normalize();
    const arch = new T.Group();
    const postM = new T.MeshLambertMaterial({ color: 0x5f3dc4 });
    [-1, 1].forEach((s) => {
      const post = new T.Mesh(new T.BoxGeometry(0.3, 3.2, 0.3), postM);
      post.position.set(gateSide.x * s * (ROAD_W + 0.2), 1.6, gateSide.z * s * (ROAD_W + 0.2));
      arch.add(post);
    });
    const bar = new T.Mesh(new T.BoxGeometry(ROAD_W * 2 + 0.8, 0.4, 0.3), new T.MeshLambertMaterial({ color: 0xffe066 }));
    bar.position.y = 3.15; arch.add(bar);
    arch.position.copy(gateP); scene.add(arch);

    const fx3 = new FX.ThreeFx(T, scene); st.fx3 = fx3;

    // アイテム箱
    const boxGeo = new T.BoxGeometry(0.7, 0.7, 0.7);
    const boxMat = new T.MeshLambertMaterial({ color: 0x74c0fc });
    const boxes = [];
    [0.18, 0.37, 0.58, 0.79].forEach((t0, i) => {
      [-0.35, 0.35].forEach((off, j) => {
        const p = curve.getPointAt(t0), tan = curve.getTangentAt(t0);
        const side = new T.Vector3().set(0, 1, 0).cross(tan).normalize();
        const m = new T.Mesh(boxGeo, boxMat.clone());
        m.position.set(p.x + side.x * off * ROAD_W * 0.55, 0.7, p.z + side.z * off * ROAD_W * 0.55);
        scene.add(m);
        boxes.push({ m, t: t0, off, ready: 0, live: true });
      });
    });

    // パートナー色
    let meCol = 0xe03131, meAcc = 0xffe066, pName = "";
    try {
      const pid = (GF.advantage && GF.advantage().partner) || (window.HM_APP && HM_APP.state && HM_APP.state().partner);
      const ch = (window.GCArt && GCArt.charById && pid && GCArt.charById(pid))
        || (window.HMGK && HMGK.CHARS && pid && HMGK.CHARS.find((c) => c.id === pid)) || null;
      if (ch && ch.color) meCol = new T.Color(ch.color).getHex();
      if (ch && (ch.call || ch.name)) pName = ch.call || ch.name;
    } catch (e) {}
    const pal = [0x4dabf7, 0x51cf66, 0xcc5de8, 0xff922b, 0x20c997, 0xf06595, 0xe8590c];
    const names = ["あおい", "みどり", "すみれ", "ひなた", "かい", "りん", "翔太"];
    const sk = skillOf(diff);
    const racers = [];
    const p0 = curve.getPointAt(0.995), t0v = curve.getTangentAt(0.995);
    const side0 = new T.Vector3().set(0, 1, 0).cross(t0v).normalize();
    const yaw0 = Math.atan2(t0v.x, t0v.z);
    for (let i = 0; i < RACERS; i++) {
      const me = i === 0;
      const lane = (i % 2 ? 1 : -1) * (1.6 + (i % 2) * 0.2);
      const back = Math.floor(i / 2) * 2.4;
      const col = me ? meCol : pal[(i - 1) % pal.length];
      const acc = me ? meAcc : 0xffffff;
      const mesh = buildKart(T, col, acc, me);
      const x = p0.x - t0v.x * back + side0.x * lane;
      const z = p0.z - t0v.z * back + side0.z * lane;
      mesh.position.set(x, 0, z); mesh.rotation.y = yaw0; scene.add(mesh);
      racers.push({
        me, name: me ? (GF.getNick && GF.getNick() || "きみ") : names[i - 1],
        col, mesh, x, y: 0, z, yaw: yaw0, speed: 0, slip: 0, steer: 0,
        drift: 0, charge: 0, boost: 0, hit: 0, ink: 0, shield: 0,
        item: null, lap: 0, sector: 0, t: 0.995, place: i + 1, fin: 0, sk: me ? 1 : (sk * (0.96 + (i * 0.012) % 0.08))
      });
    }
    const me = racers[0];
    const input = { steer: 0, drift: 0, item: 0 };
    st.input = input; st.me = me; st.racers = racers;

    // タッチ操作
    const steerEl = body.querySelector(".r3d-steer");
    const knob = body.querySelector(".r3d-knob");
    const bindHold = (el, key) => {
      const on = (e) => { e.preventDefault(); input[key] = 1; el.classList.add("on"); };
      const off = () => { input[key] = 0; el.classList.remove("on"); };
      el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off);
      el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off);
      st.unbind.push(() => { el.removeEventListener("pointerdown", on); el.removeEventListener("pointerup", off); el.removeEventListener("pointercancel", off); el.removeEventListener("pointerleave", off); });
    };
    bindHold(body.querySelector("[data-drift]"), "drift");
    const itemBtn = body.querySelector("[data-item]");
    const useItem = () => {
      if (!st.go || me.fin || !me.item) return;
      const it = me.item; me.item = null;
      body.querySelector(".r3d-item").hidden = true;
      FX.SFX.itemUse();
      if (it === "boost") { me.boost = Math.max(me.boost, 1.4); FX.SFX.boost(); shake.add(5); overlay.flash("#74c0fc", 0.3); }
      else if (it === "shield") { me.shield = 2.2; overlay.flash("#ffe066", 0.2); }
      else if (it === "ink") { st.puddles.push(makePuddle(me.x, me.z)); }
      else if (it === "star") { st.shots.push(makeShot(me, me.yaw)); FX.SFX.whoosh(); }
    };
    const onItem = (e) => { e.preventDefault(); useItem(); };
    itemBtn.addEventListener("pointerdown", onItem);
    st.unbind.push(() => itemBtn.removeEventListener("pointerdown", onItem));
    const setSteer = (cx) => {
      const r = steerEl.getBoundingClientRect();
      input.steer = Math.max(-1, Math.min(1, (cx - (r.left + r.width / 2)) / (r.width * 0.42)));
      knob.style.transform = "translate(" + (input.steer * 28) + "px,0)";
    };
    const steerOn = (e) => { e.preventDefault(); try { steerEl.setPointerCapture(e.pointerId); } catch (err) {} steerEl.classList.add("on"); setSteer(e.clientX); };
    const steerMove = (e) => { if (steerEl.classList.contains("on")) { e.preventDefault(); setSteer(e.clientX); } };
    const steerOff = () => { steerEl.classList.remove("on"); input.steer = 0; knob.style.transform = "translate(0,0)"; };
    steerEl.addEventListener("pointerdown", steerOn);
    steerEl.addEventListener("pointermove", steerMove);
    steerEl.addEventListener("pointerup", steerOff);
    steerEl.addEventListener("pointercancel", steerOff);
    st.unbind.push(() => { steerEl.removeEventListener("pointerdown", steerOn); steerEl.removeEventListener("pointermove", steerMove); steerEl.removeEventListener("pointerup", steerOff); steerEl.removeEventListener("pointercancel", steerOff); });
    // キー（手元の確認用）
    const kd = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") input.steer = -1;
      if (e.key === "ArrowRight" || e.key === "d") input.steer = 1;
      if (e.key === "Shift" || e.key === "z") input.drift = 1;
      if (e.key === " " || e.key === "x") { e.preventDefault(); useItem(); }
    };
    const ku = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "ArrowRight" || e.key === "d") input.steer = 0;
      if (e.key === "Shift" || e.key === "z") input.drift = 0;
    };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    st.unbind.push(() => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); });

    st.puddles = []; st.shots = [];
    function makePuddle(x, z) {
      const mat = new T.MeshBasicMaterial({ color: 0x1a1d27, transparent: true, opacity: 0.72 });
      const mesh = new T.Mesh(new T.CircleGeometry(1.25, 14), mat);
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.08, z); scene.add(mesh);
      return { x, z, life: 7, mesh };
    }
    function makeShot(from, yaw) {
      const mesh = new T.Mesh(new T.SphereGeometry(0.22, 8, 6), new T.MeshBasicMaterial({ color: 0xffe066 }));
      mesh.position.set(from.x, 0.7, from.z); scene.add(mesh);
      return { x: from.x, y: 0.7, z: from.z, yaw, life: 2.2, from, mesh };
    }
    const cheer = body.querySelector(".r3d-cheer");
    let cheerT = 0;
    function say(text) {
      if (!text) return;
      cheer.hidden = false; cheer.textContent = text; cheerT = 2.2;
    }
    try {
      const p = (GF.advantage && GF.advantage().partner) || "";
      say(p === "shota" ? "先輩、いってらっしゃいっす！" : ((pName || "相棒") + "「いってらっしゃい！ 1位めざそう！」"));
    } catch (e) { say("いってらっしゃい！ 1位めざそう！"); }

    function layout() {
      const w = W0(), h = H0();
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      overlay.resize(w, h, Math.min(dpr, 1.5));
    }
    layout();
    st.onResize = layout; window.addEventListener("resize", layout);

    const tmpP = new T.Vector3(), tmpT = new T.Vector3(), camP = new T.Vector3(), camL = new T.Vector3();
    camP.set(me.x - Math.sin(me.yaw) * 6.4, me.y + 3.1, me.z - Math.cos(me.yaw) * 6.4);
    camL.set(me.x + Math.sin(me.yaw) * 6, me.y + 0.6, me.z + Math.cos(me.yaw) * 6);
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

    function progress(r) { return r.lap + (((r.t - 0.995) % 1) + 1) % 1; }
    function rank() {
      const a = racers.slice().sort((x, y) => progress(y) - progress(x) || (x.fin || 99) - (y.fin || 99));
      a.forEach((r, i) => { r.place = i + 1; });
    }

    function hitEdge(r, t, p, tan) {
      const side = new T.Vector3().set(0, 1, 0).cross(tan);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0); else side.normalize();
      const dx = r.x - p.x, dz = r.z - p.z;
      const lat = dx * side.x + dz * side.z;
      const lim = ROAD_W - 0.7;
      if (Math.abs(lat) > lim) {
        const over = Math.abs(lat) - lim, sgn = lat > 0 ? 1 : -1;
        r.x -= side.x * sgn * (over + 0.04);
        r.z -= side.z * sgn * (over + 0.04);
        // 進行方向をコースに戻して、壁に擦り続けて止まらないようにする
        const want = Math.atan2(tan.x, tan.z);
        let err = want - r.yaw;
        while (err > Math.PI) err -= Math.PI * 2;
        while (err < -Math.PI) err += Math.PI * 2;
        r.yaw += err * 0.55;
        r.slip *= 0.4;
        const first = r.hit <= 0;
        if (first) {
          r.speed *= 0.78;
          r.hit = 0.18;
          if (r.me) { shake.add(7); FX.SFX.crash(); fx3.burst(new T.Vector3(r.x, 0.3, r.z), ["#fff", "#ffd43b"], 10, 5, 0.35); }
        }
        return true;
      }
      return false;
    }

    function stepRacer(r, dt, isGo) {
      if (r.fin) { r.speed *= 1 - dt * 1.6; }
      r.hit = Math.max(0, r.hit - dt); r.boost = Math.max(0, r.boost - dt); r.ink = Math.max(0, r.ink - dt); r.shield = Math.max(0, r.shield - dt);
      let steer = r.me ? input.steer : r.steer;
      const drifting = !r.fin && isGo && (r.me ? input.drift : r.wantDrift) && Math.abs(steer) > 0.2 && r.speed > 7;
      if (drifting) {
        r.drift = 1; r.charge += dt; r.slip += (steer * 0.9 - r.slip) * dt * 4;
        if (r.me && Math.random() < dt * 10) { FX.SFX.drift(); fx3.burst(new T.Vector3(r.x, 0.12, r.z), ["#cfd4e0", "#fff"], 3, 3, 0.25); }
      } else {
        r.drift = 0; r.slip += (0 - r.slip) * dt * 6;
        if (r.charge >= veh.mt2) { r.boost = Math.max(r.boost, veh.mt2Boost); if (r.me) { FX.SFX.boost(); overlay.flash("#ff922b", 0.28); shake.add(4); } }
        else if (r.charge >= veh.mt1) { r.boost = Math.max(r.boost, veh.mt1Boost); if (r.me) { FX.SFX.boost(); overlay.flash("#74c0fc", 0.22); } }
        r.charge = 0;
      }
      const cap = r.boost > 0 ? veh.boostMax : veh.max;
      const inkMul = r.ink > 0 && r.shield <= 0 ? 0.52 : 1;
      if (isGo && !r.fin) r.speed += veh.accel * dt * (r.boost > 0 ? 1.45 : 1) * (r.me ? 1 : r.sk);
      r.speed -= r.speed * veh.drag * dt;
      if (r.speed > cap * inkMul) r.speed += (cap * inkMul - r.speed) * dt * 3;
      if (r.hit > 0) r.speed *= 1 - dt * 0.8;
      const turn = (r.drift ? veh.driftTurn : veh.turn) * (0.45 + 0.55 * Math.min(1, r.speed / 14));
      r.yaw += steer * turn * dt * (r.speed / Math.max(4, veh.max)) * (r.drift ? 1.15 : 1);
      const yaw = r.yaw + r.slip * 0.35;
      r.x += Math.sin(yaw) * r.speed * dt;
      r.z += Math.cos(yaw) * r.speed * dt;
      r.t = nearestT(curve, r.x, r.z, r.t, segs);
      sampleAt(curve, r.t, tmpP, tmpT, T);
      r.y = tmpP.y; hitEdge(r, r.t, tmpP, tmpT);
      // セクター・ラップ（1周すべてのセクターを通ってからカウント）
      const sec = Math.floor(((((r.t - 0.995) % 1) + 1) % 1) * 8);
      if (r.secBits == null) r.secBits = 0;
      if (sec === (r.sector + 1) % 8) {
        r.sector = sec;
        r.secBits |= (1 << sec);
        if (sec === 0 && (r.secBits & 0xFE) === 0xFE && !r.fin) { r.lap++; r.secBits = 1; }
      }
      if (r.lap >= LAPS && !r.fin) { r.fin = raced; rank(); if (r.me) finish(); }
      // 見た目
      r.mesh.position.set(r.x, r.y, r.z);
      r.mesh.rotation.y = r.yaw;
      r.mesh.rotation.z = -steer * 0.18 - r.slip * 0.12;
      const fl = r.mesh.getObjectByName("flame");
      if (fl) { fl.material.opacity = r.boost > 0 ? 0.85 : (r.speed > 16 ? 0.25 : 0); fl.scale.y = r.boost > 0 ? 1.4 : 0.8; }
    }

    function cpu(r, dt) {
      const look = sampleAt(curve, r.t + 0.045 * r.sk, tmpP, tmpT, T);
      const want = Math.atan2(tmpP.x - r.x, tmpP.z - r.z);
      let err = want - r.yaw; while (err > Math.PI) err -= Math.PI * 2; while (err < -Math.PI) err += Math.PI * 2;
      r.steer = Math.max(-1, Math.min(1, err * 1.6));
      r.wantDrift = Math.abs(err) > 0.45 && r.speed > 10;
      if (r.item && Math.random() < dt * 0.35) {
        const it = r.item; r.item = null;
        if (it === "boost") r.boost = Math.max(r.boost, 1.2);
        else if (it === "shield") r.shield = 2;
        else if (it === "ink") st.puddles.push(makePuddle(r.x, r.z));
        else if (it === "star") st.shots.push(makeShot(r, r.yaw));
      }
    }

    function pickBoxes(dt) {
      const spin = st.t * 2;
      boxes.forEach((b) => {
        b.m.rotation.y = spin; b.m.position.y = 0.7 + Math.sin(st.t * 3 + b.t * 8) * 0.08;
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

    function dropShot(s) {
      if (s.mesh) scene.remove(s.mesh);
    }
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
      st.done = true;
      st.go = false;
      if (st.engine) st.engine.stop();
      FX.SFX.finish();
      const place = me.place, win = place === 1;
      say(win ? "1位！ すごい！" : place + "位だったよ。もう一回いってみよう！");
      overlay.flash(win ? "#ffe066" : "#9fb4ff", 0.45);
      GF.reportGame("kart", diff, win, { metric: { v: Math.round(me.fin * 100) / 100, unit: "秒", lower: true, label: "タイム", winOnly: false } });
      setTimeout(() => {
        if (st.dead) return;
        GF.showResult({
          win, title: win ? "1位！ ゴール！" : place + "位でゴール",
          text: "タイム " + me.fin.toFixed(2) + "秒",
          onRetry: () => { stopAll(st); start({ id: "kart", vehicle: "kart", theme: "campus", items: true, drift: true, diff, title: "カート" }); }
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
        if (cd >= 3) { st.go = true; raced = 0; st.engine.start(); cdEl.textContent = ""; }
      }
      if (st.go && !st.done) raced += dt0;
      racers.forEach((r) => { if (!r.me) cpu(r, dt0); stepRacer(r, dt0, st.go && !st.done); });
      pickBoxes(dt0); stepHazards(dt0); rank(); fx3.step(dt0); shake.step(dt0);
      if (cheerT > 0) { cheerT -= dt0; if (cheerT <= 0) cheer.hidden = true; }

      // カメラ
      const back = 6.4, up = 3.1;
      const tx = me.x - Math.sin(me.yaw) * back, tz = me.z - Math.cos(me.yaw) * back;
      camP.lerp(new T.Vector3(tx, me.y + up, tz), 1 - Math.pow(0.001, dt0));
      camL.lerp(new T.Vector3(me.x + Math.sin(me.yaw) * 6, me.y + 0.6, me.z + Math.cos(me.yaw) * 6), 1 - Math.pow(0.0008, dt0));
      camera.position.set(camP.x + shake.x, camP.y + shake.y, camP.z + shake.z);
      camera.lookAt(camL);
      if (st.engine && st.go) st.engine.set(Math.min(1, me.speed / veh.boostMax), me.boost > 0 ? 0.045 : 0.03);
      overlay.step(dt0, Math.min(1, me.speed / veh.boostMax));
      // HUD
      hudPos.textContent = me.place + "位";
      hudLap.textContent = "LAP " + Math.min(LAPS, me.lap + 1) + "/" + LAPS;
      hudTime.textContent = (st.done ? me.fin : raced).toFixed(2);
      const mt = me.charge;
      hudMt.style.width = Math.min(100, (mt / veh.mt2) * 100) + "%";
      hudMt.style.background = mt >= veh.mt2 ? "#ff922b" : (mt >= veh.mt1 ? "#74c0fc" : "rgba(255,255,255,.55)");
      if (st.t * 8 % 1 < dt0 * 8) drawMap();
      renderer.render(scene, camera);
      st.raf = requestAnimationFrame(loop);
      st.fps = fpsE;
    }
    st.raf = requestAnimationFrame(loop);
    // 計測用
    window.__R3D = st;
    return st;
  }

  function start(opts) {
    const GF = window.GF;
    const diff = opts.diff || "normal";
    let cancelled = false;
    const body = GF.openLayer((opts.title || "カート") + "（" + GF.diffName(diff) + "）", () => {
      cancelled = true;
      if (window.__R3D && !window.__R3D.dead) stopAll(window.__R3D);
    });
    body.innerHTML = '<div class="r3d-wait">コースを用意しているよ…</div>';
    loadThree().then((T) => {
      if (!cancelled) boot(T, body, opts, diff);
    }).catch((err) => {
      console.error(err);
      if (!cancelled && prevKart) prevKart(diff);
    });
  }

  H.add({
    id: "kart", e: "🏎️", n: "カート", c: "#e03131", genre: "race", fresh: true, pro: true,
    d: "学園のサーキットを3Dで走るよ。ドリフトでミニターボをためて、アイテムも使って1位をめざそう。"
  }, (diff) => start({ id: "kart", title: "カート", vehicle: "kart", theme: "campus", items: true, drift: true, diff }));

  window.HMRace3d = { start, loadThree, VEHICLES, THEMES, ITEM_NAMES, LAPS, RACERS, ROAD_W };
})();
