/* ほしの学園 — 3Dレース（第7回）：カート以外の12本。games-race3d.js の土台（HMRace3d）を使う。乗り物・コースはオリジナル。 */
(function () {
  "use strict";
  const R3 = window.HMRace3d;
  if (!R3 || !R3.register) return;
  const KIT = R3.kit, G = KIT.G;

  // ---------- 共通の部品 ----------
  const MAT = {};
  const lam = (T, c) => MAT["l" + c] || (MAT["l" + c] = new T.MeshLambertMaterial({ color: c }));
  const bas = (T, c, op) => MAT["b" + c + "_" + (op || 1)] || (MAT["b" + c + "_" + (op || 1)] = new T.MeshBasicMaterial({ color: c, transparent: op != null && op < 1, opacity: op == null ? 1 : op, depthWrite: !(op != null && op < 1) }));
  const glass = (T) => MAT.glass || (MAT.glass = new T.MeshLambertMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.55 }));
  function box(T, p, w, h, d, c, x, y, z, m) { const o = new T.Mesh(G(T, "b" + w + "_" + h + "_" + d, () => new T.BoxGeometry(w, h, d)), m || lam(T, c)); o.position.set(x, y, z); p.add(o); return o; }
  function cyl(T, p, rt, rb, h, seg, c, x, y, z, m) { const o = new T.Mesh(G(T, "c" + rt + "_" + rb + "_" + h + "_" + seg, () => new T.CylinderGeometry(rt, rb, h, seg)), m || lam(T, c)); o.position.set(x, y, z); p.add(o); return o; }
  function sph(T, p, r, c, x, y, z, m, ws, hs) { const o = new T.Mesh(G(T, "s" + r + "_" + (ws || 8), () => new T.SphereGeometry(r, ws || 8, hs || 6)), m || lam(T, c)); o.position.set(x, y, z); p.add(o); return o; }
  function cone(T, p, r, h, seg, c, x, y, z, m) { const o = new T.Mesh(G(T, "k" + r + "_" + h + "_" + seg, () => new T.ConeGeometry(r, h, seg)), m || lam(T, c)); o.position.set(x, y, z); p.add(o); return o; }
  let shadowTex = null;
  function softShadow(T, root, w, l) {
    if (!shadowTex) shadowTex = KIT.canvasTex(T, 64, 64, (g, W, H) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(0.6, "rgba(0,0,0,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
    const m = new T.Mesh(G(T, "shp", () => new T.PlaneGeometry(1, 1)), MAT.shd || (MAT.shd = new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.scale.set(w, l, 1);
    const g = new T.Group(); g.add(m); root.add(g);
    return g;
  }
  function plate(T, p, num, col, x, y, z, ry, w) {
    const m = new T.Mesh(G(T, "pl" + (w || 0.32), () => new T.PlaneGeometry(w || 0.32, (w || 0.32) / 2)), new T.MeshBasicMaterial({ map: KIT.plateTex(T, num, "#" + (col | 0).toString(16).padStart(6, "0")) }));
    m.position.set(x, y, z); m.rotation.y = ry || 0; p.add(m); return m;
  }
  // 車輪：外側の grp（前輪の切れ角）→ tire（回転）→ タイヤ・ホイール
  function wheel(T, root, x, y, z, r, w, front, rimC, thin) {
    const grp = new T.Group(); grp.position.set(x, y, z);
    const tire = new T.Group(); grp.add(tire);
    if (thin) {
      const tor = new T.Mesh(G(T, "wt" + r, () => new T.TorusGeometry(r, 0.035, 5, 18)), lam(T, 0x1c1e27)); tor.rotation.y = Math.PI / 2; tire.add(tor);
      for (let k = 0; k < 4; k++) { const sp = box(T, tire, 0.012, r * 2 - 0.05, 0.012, 0xced4da, 0, 0, 0); sp.rotation.x = (k * Math.PI) / 4; }
      cyl(T, tire, 0.05, 0.05, 0.1, 6, 0x868e96, 0, 0, 0).rotation.z = Math.PI / 2;
    } else {
      const t1 = cyl(T, tire, r, r, w, 10, 0x1c1e27, 0, 0, 0); t1.rotation.z = Math.PI / 2;
      const rim = cyl(T, tire, r * 0.58, r * 0.58, w + 0.02, 6, rimC || 0xadb5bd, 0, 0, 0); rim.rotation.z = Math.PI / 2;
      const hub = box(T, tire, w + 0.04, r * 0.9, 0.06, 0x495057, 0, 0, 0);
      hub.rotation.x = 0.4;
    }
    root.add(grp);
    return { grp, tire, front: !!front };
  }
  // 人（ヘルメット・胴・腕・脚）。脚と腕はつけ根で回るグループ
  function rider(T, parent, suit, helm, opt) {
    opt = opt || {};
    const g = new T.Group(); parent.add(g);
    const skin = 0xf3c29c;
    const hip = new T.Group(); hip.position.set(0, opt.hipY || 0.5, 0); g.add(hip);
    const torso = new T.Group(); hip.add(torso);
    box(T, torso, 0.34, 0.42, 0.24, suit, 0, 0.22, 0);
    box(T, torso, 0.36, 0.08, 0.26, opt.belt || 0x2b2155, 0, 0.02, 0);
    const head = new T.Group(); head.position.set(0, 0.56, 0.02); torso.add(head);
    sph(T, head, 0.15, helm, 0, 0.02, 0, null, 10, 8);
    box(T, head, 0.2, 0.07, 0.06, 0x1c1e27, 0, 0.0, 0.13, MAT.visor || (MAT.visor = new T.MeshLambertMaterial({ color: 0x4dabf7 })));
    const mkArm = (s) => { const a = new T.Group(); a.position.set(s * 0.21, 0.38, 0); torso.add(a); box(T, a, 0.09, 0.09, 0.32, suit, 0, 0, 0.14); sph(T, a, 0.055, opt.glove || 0x343a40, 0, 0, 0.32); return a; };
    const mkLeg = (s) => { const l = new T.Group(); l.position.set(s * 0.1, 0, 0); hip.add(l); box(T, l, 0.12, 0.34, 0.13, opt.pants || suit, 0, -0.17, 0); const kn = new T.Group(); kn.position.set(0, -0.34, 0); l.add(kn); box(T, kn, 0.11, 0.3, 0.12, opt.pants || suit, 0, -0.15, 0); box(T, kn, 0.12, 0.08, 0.2, opt.boot || 0x212529, 0, -0.3, 0.04); l.userData.knee = kn; return l; };
    const armL = mkArm(-1), armR = mkArm(1), legL = mkLeg(-1), legR = mkLeg(1);
    if (opt.face !== false) box(T, head, 0.12, 0.05, 0.02, skin, 0, -0.08, 0.13);
    return { g, hip, torso, head, armL, armR, legL, legR };
  }
  const R01 = (s) => { let a = s >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // たくさん並べる飾りは InstancedMesh（描く回数を少なくして iPhone でも軽く）
  function inst(T, scene, geo, mat, list, colors) {
    const m = new T.InstancedMesh(geo, mat, list.length);
    const d = new T.Object3D(), c = new T.Color();
    list.forEach((o, i) => { d.position.set(o.x, o.y || 0, o.z); d.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0); d.scale.set(o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (colors) { c.setHex(colors[i % colors.length]); m.setColorAt(i, c); } });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    scene.add(m); return m;
  }
  // コースの横に、ランダム（でも毎回同じ）に飾りの位置を作る
  function along(at, n, minOff, maxOff, seed, opt) {
    const r = R01(seed || 7), out = [];
    opt = opt || {};
    for (let i = 0; i < n; i++) {
      const t = (i + r() * 0.8) / n;
      if (opt.skip && opt.skip(t)) continue;
      const side = opt.side || (r() < 0.5 ? -1 : 1);
      const off = side * (minOff + r() * (maxOff - minOff));
      const a = at(t, off);
      out.push({ x: a.x, y: a.y, z: a.z, ry: r() * 6.28, s: 0.8 + r() * 0.5, yaw: a.yaw, t, side, r });
    }
    return out;
  }
  // コースにそった手すり・ガードレール（Tube）と支柱
  function rail(T, scene, curve, off, y, rad, col, postCol, postEvery) {
    const closed = curve.closed, pts = [], up = new T.Vector3(0, 1, 0), n = Math.max(60, Math.round(curve.getLength() / 3));
    const posts = [];
    for (let i = 0; i <= n - (closed ? 1 : 0); i++) {
      const u = i / n, p = curve.getPointAt(u), tn = curve.getTangentAt(u), sd = new T.Vector3().crossVectors(up, tn).normalize();
      pts.push(new T.Vector3(p.x + sd.x * off, p.y + y, p.z + sd.z * off));
      if (postEvery && i % postEvery === 0) posts.push({ x: p.x + sd.x * off, y: p.y + y / 2, z: p.z + sd.z * off, sy: y });
    }
    const c2 = new T.CatmullRomCurve3(pts, closed);
    const tube = new T.Mesh(new T.TubeGeometry(c2, n, rad, 4, closed), lam(T, col));
    scene.add(tube);
    if (posts.length) inst(T, scene, G(T, "rpost", () => new T.BoxGeometry(0.1, 1, 0.1)), lam(T, postCol || col), posts);
    return tube;
  }
  // 看板：表に文字、裏はうら板（裏から見ても反転した文字が見えない）
  function board(T, scene, a, text, w, h, y, faceBack) {
    const g = new T.Group();
    const fr = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: KIT.signTex(T, text) }));
    fr.position.z = 0.03; g.add(fr);
    box(T, g, w + 0.1, h + 0.1, 0.05, 0x495057, 0, 0, 0);
    box(T, g, 0.1, y, 0.1, 0x868e96, -w / 2 + 0.2, -y / 2 - h / 2, 0); box(T, g, 0.1, y, 0.1, 0x868e96, w / 2 - 0.2, -y / 2 - h / 2, 0);
    g.position.set(a.x, a.y + y + h / 2, a.z); g.rotation.y = a.yaw + (faceBack ? 0 : Math.PI);
    scene.add(g); return g;
  }
  function particles(T, scene, n, spread, col, size, op) {
    const pos = new Float32Array(n * 3), r = R01(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * spread; pos[i * 3 + 1] = r() * spread * 0.5; pos[i * 3 + 2] = (r() - 0.5) * spread; }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3));
    const pts = new T.Points(g, new T.PointsMaterial({ color: col, size: size, transparent: true, opacity: op || 0.9, depthWrite: false, sizeAttenuation: true }));
    scene.add(pts); return pts;
  }
  function waveTex(T, base, hi) {
    const tex = KIT.canvasTex(T, 128, 128, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.strokeStyle = hi; g.lineWidth = 3; g.globalAlpha = 0.55;
      for (let k = 0; k < 6; k++) { g.beginPath(); const y = k * 22 + 8; for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin((x / w) * Math.PI * 4 + k) * 4; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke(); }
      g.globalAlpha = 0.25; g.fillStyle = "#fff"; for (let k = 0; k < 14; k++) g.fillRect((k * 37) % w, (k * 53) % h, 10, 2);
    });
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(3, 1);
    return tex;
  }
  function stripeTex(T, a, b, n) {
    const tex = KIT.canvasTex(T, 64, 64, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(0, (i * h) / n, w, h / n + 1); } });
    tex.wrapS = tex.wrapT = T.RepeatWrapping; return tex;
  }
  function noiseTex(T, base, dots, n) {
    const tex = KIT.canvasTex(T, 128, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = R01(n || 3); for (let i = 0; i < 420; i++) { g.fillStyle = dots[i % dots.length]; g.globalAlpha = 0.35 + r() * 0.4; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } });
    tex.wrapS = tex.wrapT = T.RepeatWrapping; return tex;
  }
  function windowsTex(T, wall, lit) {
    const tex = KIT.canvasTex(T, 64, 128, (g, w, h) => { g.fillStyle = wall; g.fillRect(0, 0, w, h); const r = R01(11); for (let y = 6; y < h - 6; y += 12) for (let x = 5; x < w - 6; x += 12) { g.fillStyle = r() < 0.35 ? lit : "rgba(20,30,60,.65)"; g.fillRect(x, y, 7, 7); } });
    tex.wrapS = tex.wrapT = T.RepeatWrapping; return tex;
  }

  // ---------- 乗り物 ----------
  let curT = null;
  function base(T) { curT = T; const root = new T.Group(), body = new T.Group(); body.name = "body"; root.add(body); return { root, body }; }
  // 第10回：同じグループの部品を1つのメッシュにまとめて、描く回数を減らす（動くグループはそのまま動く）
  function lighten(T, root) { const K = window.HM3D && window.HM3D.k; if (K && K.bakeTree && T) { try { K.bakeTree(T, root); } catch (e) { /* まとめられなくても、そのまま動く */ } } return root; }
  function flamesAt(T, body, list, col) {
    return list.map(([x, y, z, s]) => {
      const fl = new T.Mesh(G(T, "fl" + (s || 1), () => new T.ConeGeometry(0.09 * (s || 1), 0.42 * (s || 1), 6)), new T.MeshBasicMaterial({ color: col || 0x74c0fc, transparent: true, opacity: 0, depthWrite: false }));
      fl.position.set(x, y, z); fl.rotation.x = -Math.PI / 2; body.add(fl); return fl;
    });
  }
  function finish(root, body, o) { lighten(curT, root); root.userData = Object.assign({ body, wheels: [], flames: [] }, o); return root; }
  const lights = (T, body, z, y, xs, col) => xs.forEach((x) => box(T, body, 0.16, 0.08, 0.04, 0, x, y, z, bas(T, col)));

  // 車（ラリー・ハイウェイ・ドリフト）
  function buildCar(style) {
    return function (T, col, acc, isMe, num) {
      const { root, body } = base(T);
      const dark = 0x1c1e27;
      const W = style === "drift" ? 1.5 : 1.36, L = style === "highway" ? 2.5 : 2.3, low = style === "drift" ? 0.34 : style === "rally" ? 0.46 : 0.4;
      box(T, body, W, 0.34, L, col, 0, low, 0);
      box(T, body, W - 0.04, 0.16, 0.5, col, 0, low + 0.2, L / 2 - 0.3);
      box(T, body, W + 0.02, 0.12, 0.35, dark, 0, low - 0.12, L / 2 - 0.05);
      box(T, body, W + 0.02, 0.12, 0.3, dark, 0, low - 0.12, -L / 2 + 0.06);
      // 屋根とガラス
      const cabZ = style === "drift" ? -0.15 : -0.1, cabL = style === "highway" ? 1.25 : 1.05;
      box(T, body, W - 0.2, 0.36, cabL, col, 0, low + 0.34, cabZ);
      box(T, body, W - 0.18, 0.26, 0.04, 0, 0, low + 0.34, cabZ + cabL / 2 + 0.01, glass(T)).rotation.x = -0.35;
      box(T, body, W - 0.18, 0.24, 0.04, 0, 0, low + 0.34, cabZ - cabL / 2 - 0.01, glass(T)).rotation.x = 0.35;
      [-1, 1].forEach((s) => box(T, body, 0.03, 0.22, cabL - 0.2, 0, s * (W / 2 - 0.09), low + 0.36, cabZ, glass(T)));
      // ライト
      lights(T, body, L / 2 + 0.01, low + 0.06, [-W / 2 + 0.22, W / 2 - 0.22], 0xfff3bf);
      lights(T, body, -L / 2 - 0.01, low + 0.08, [-W / 2 + 0.22, W / 2 - 0.22], 0xff4d4d);
      // ストライプ（アクセント色）
      box(T, body, 0.22, 0.012, L + 0.01, acc, 0, low + 0.175, 0);
      box(T, body, 0.22, 0.012, cabL + 0.01, acc, 0, low + 0.525, cabZ);
      plate(T, body, num, col, -W / 2 - 0.01, low + 0.04, 0.1, -Math.PI / 2, 0.42);
      plate(T, body, num, col, W / 2 + 0.01, low + 0.04, 0.1, Math.PI / 2, 0.42);
      if (style === "rally") {
        box(T, body, 0.9, 0.06, 0.5, 0x343a40, 0, low + 0.56, cabZ - 0.1);
        const bar = box(T, body, W - 0.2, 0.12, 0.1, dark, 0, low + 0.3, L / 2 + 0.06);
        [-0.42, -0.14, 0.14, 0.42].forEach((x) => cyl(T, body, 0.07, 0.07, 0.06, 8, 0, x, low + 0.3, L / 2 + 0.12, bas(T, 0xfff9db)).rotation.x = Math.PI / 2);
        [-1, 1].forEach((s) => box(T, body, 0.3, 0.26, 0.03, dark, s * (W / 2 - 0.2), low - 0.22, -L / 2 + 0.32));
        box(T, body, W - 0.1, 0.06, 0.32, acc, 0, low + 0.6, -L / 2 + 0.2);
        [-1, 1].forEach((s) => box(T, body, 0.06, 0.2, 0.06, dark, s * 0.45, low + 0.48, -L / 2 + 0.2));
        void bar;
      } else if (style === "drift") {
        [-1, 1].forEach((s) => { box(T, body, 0.2, 0.26, 0.7, col, s * (W / 2 + 0.04), low - 0.02, L / 2 - 0.5); box(T, body, 0.2, 0.26, 0.7, col, s * (W / 2 + 0.04), low - 0.02, -L / 2 + 0.5); });
        box(T, body, W + 0.2, 0.06, 0.38, acc, 0, low + 0.68, -L / 2 + 0.12);
        [-1, 1].forEach((s) => box(T, body, 0.06, 0.3, 0.2, dark, s * 0.55, low + 0.5, -L / 2 + 0.14));
        box(T, body, W - 0.1, 0.04, 0.3, dark, 0, low - 0.18, L / 2 + 0.05);
        box(T, body, W + 0.1, 0.02, L - 0.3, 0, 0, 0.12, 0, bas(T, acc, 0.55));
      } else {
        box(T, body, W - 0.3, 0.06, 0.08, 0xced4da, 0, low - 0.02, L / 2 + 0.02);
        [-1, 1].forEach((s) => box(T, body, 0.1, 0.06, 0.16, 0xced4da, s * (W / 2 + 0.03), low + 0.34, cabZ + cabL / 2 - 0.05));
      }
      const fl = flamesAt(T, body, [[-0.3, low - 0.06, -L / 2 - 0.2], [0.3, low - 0.06, -L / 2 - 0.2]], 0x74c0fc);
      [-1, 1].forEach((s) => cyl(T, body, 0.05, 0.05, 0.2, 6, 0x868e96, s * 0.3, low - 0.06, -L / 2 - 0.05).rotation.x = Math.PI / 2);
      const wr = style === "drift" ? 0.28 : style === "rally" ? 0.32 : 0.3, ww = style === "drift" ? 0.28 : 0.22;
      const wx = W / 2 - 0.08, wz = L / 2 - 0.45;
      const wheels = [wheel(T, root, -wx, wr, wz, wr, ww, true, acc), wheel(T, root, wx, wr, wz, wr, ww, true, acc), wheel(T, root, -wx, wr, -wz, wr, ww, false, acc), wheel(T, root, wx, wr, -wz, wr, ww, false, acc)];
      const shadow = softShadow(T, root, W + 0.9, L + 0.9);
      root.scale.setScalar(isMe ? 1 : 0.97);
      return finish(root, body, { wheels, flames: fl, shadow });
    };
  }
  // 交通の車（ハイウェイのよける車：トラック・バン・乗用車）
  function buildTraffic(T, kind, col) {
    const { root, body } = base(T);
    if (kind === "truck") {
      box(T, body, 1.6, 1.0, 1.0, col, 0, 0.9, 1.5); box(T, body, 1.5, 0.4, 0.05, 0, 0, 1.1, 2.01, glass(T));
      box(T, body, 1.7, 1.6, 3.2, 0xf1f3f5, 0, 1.2, -0.7); box(T, body, 1.72, 0.3, 3.0, col, 0, 0.75, -0.7);
      lights(T, body, -2.31, 0.6, [-0.6, 0.6], 0xff4d4d);
      [[-0.7, 1.4], [0.7, 1.4], [-0.7, -1.4], [0.7, -1.4], [-0.7, -0.6], [0.7, -0.6]].forEach(([x, z]) => wheel(T, root, x, 0.36, z, 0.36, 0.26, false));
    } else if (kind === "van") {
      box(T, body, 1.45, 1.1, 2.7, col, 0, 0.85, 0); box(T, body, 1.35, 0.45, 0.04, 0, 0, 1.05, 1.36, glass(T));
      [-1, 1].forEach((s) => box(T, body, 0.03, 0.35, 1.6, 0, s * 0.73, 1.1, -0.2, glass(T)));
      lights(T, body, -1.36, 0.55, [-0.5, 0.5], 0xff4d4d);
      [[-0.68, 0.9], [0.68, 0.9], [-0.68, -0.9], [0.68, -0.9]].forEach(([x, z]) => wheel(T, root, x, 0.3, z, 0.3, 0.2, false));
    } else {
      return buildCar("highway")(T, col, 0xe9ecef, false, "");
    }
    softShadow(T, root, 2.4, 4);
    return finish(root, body, {});
  }
  // オートバイ
  function buildBike(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    const lean = new T.Group(); body.add(lean);
    box(T, lean, 0.3, 0.3, 0.9, col, 0, 0.62, 0.05);
    box(T, lean, 0.36, 0.26, 0.42, col, 0, 0.82, 0.32);
    box(T, lean, 0.42, 0.32, 0.3, col, 0, 0.78, 0.66);
    box(T, lean, 0.3, 0.2, 0.04, 0, 0, 1.0, 0.78, glass(T)).rotation.x = -0.5;
    box(T, lean, 0.12, 0.08, 0.04, 0, 0, 0.74, 0.82, bas(T, 0xfff3bf));
    box(T, lean, 0.26, 0.08, 0.5, 0x212529, 0, 0.8, -0.28);
    box(T, lean, 0.28, 0.14, 0.32, acc, 0, 0.78, -0.62);
    box(T, lean, 0.1, 0.05, 0.04, 0, 0, 0.75, -0.79, bas(T, 0xff4d4d));
    box(T, lean, 0.26, 0.24, 0.36, 0x495057, 0, 0.42, 0.08);
    cyl(T, lean, 0.05, 0.06, 0.5, 6, 0xadb5bd, 0.18, 0.4, -0.5).rotation.x = Math.PI / 2 - 0.2;
    [-1, 1].forEach((s) => cyl(T, lean, 0.025, 0.025, 0.56, 5, 0xced4da, s * 0.1, 0.55, 0.78).rotation.x = -0.35);
    box(T, lean, 0.62, 0.03, 0.03, 0x343a40, 0, 0.98, 0.58);
    plate(T, lean, num, col, 0, 0.78, 0.82, 0, 0.26);
    const rd = rider(T, lean, acc, col, { hipY: 0.84, pants: 0x212529 });
    rd.g.position.set(0, 0, -0.2); rd.torso.rotation.x = 0.85; rd.armL.rotation.x = 0.6; rd.armR.rotation.x = 0.6;
    rd.legL.rotation.x = -1.1; rd.legR.rotation.x = -1.1; rd.legL.userData.knee.rotation.x = 1.9; rd.legR.userData.knee.rotation.x = 1.9;
    const wf = wheel(T, lean, 0, 0.33, 0.82, 0.33, 0.14, true, 0x495057);
    const wb = wheel(T, lean, 0, 0.33, -0.62, 0.33, 0.18, false, 0x495057);
    const fl = flamesAt(T, lean, [[0.18, 0.38, -0.8, 0.8]], 0x74c0fc);
    const shadow = softShadow(T, root, 0.9, 2.1);
    return finish(root, body, { wheels: [wf, wb], flames: fl, shadow, anim(r, dt, t, steer) { lean.rotation.z = -steer * 0.42 - r.slip * 0.2; wf.grp.rotation.y = -steer * 0.25; body.rotation.z = 0; if (r.boost > 0 && r.speed > 18) lean.rotation.x = -0.08; else lean.rotation.x *= 0.9; } });
  }
  // ロードバイク（自転車）
  function buildCycle(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    const lean = new T.Group(); body.add(lean);
    const fm = 0x343a40;
    const tube = (x1, y1, z1, x2, y2, z2, c, r) => { const len = Math.hypot(x2 - x1, y2 - y1, z2 - z1); const m = cyl(T, lean, r || 0.025, r || 0.025, len, 5, c || col, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(x2 - x1, y2 - y1, z2 - z1).normalize()); return m; };
    tube(0, 0.36, -0.5, 0, 0.42, 0.02); tube(0, 0.42, 0.02, 0, 0.78, -0.18); tube(0, 0.78, -0.18, 0, 0.36, -0.5);
    tube(0, 0.82, 0.42, 0, 0.42, 0.02); tube(0, 0.78, -0.18, 0, 0.82, 0.42); tube(0, 0.82, 0.42, 0, 0.36, 0.55, fm);
    box(T, lean, 0.12, 0.04, 0.24, 0x212529, 0, 0.86, -0.2);
    box(T, lean, 0.42, 0.03, 0.03, fm, 0, 0.88, 0.48);
    const crank = new T.Group(); crank.position.set(0, 0.42, 0.02); lean.add(crank);
    cyl(T, crank, 0.09, 0.09, 0.02, 10, 0xadb5bd, 0.04, 0, 0).rotation.z = Math.PI / 2;
    const pL = box(T, crank, 0.03, 0.03, 0.16, fm, -0.07, 0, 0.08), pR = box(T, crank, 0.03, 0.03, 0.16, fm, 0.07, 0, -0.08); void pL; void pR;
    plate(T, lean, num, col, 0, 0.62, -0.62, Math.PI, 0.2);
    const rd = rider(T, lean, col, acc, { hipY: 0.88, pants: 0x212529, boot: 0xffffff });
    rd.g.position.set(0, 0, -0.18); rd.torso.rotation.x = 1.0; rd.armL.rotation.x = 0.9; rd.armR.rotation.x = 0.9;
    // 背中の番号
    const wf = wheel(T, lean, 0, 0.36, 0.55, 0.34, 0.05, true, 0, true);
    const wb = wheel(T, lean, 0, 0.36, -0.5, 0.34, 0.05, false, 0, true);
    const shadow = softShadow(T, root, 0.7, 1.9);
    let ph = 0;
    return finish(root, body, { wheels: [wf, wb], flames: [], shadow, anim(r, dt, t, steer) {
      lean.rotation.z = -steer * 0.3;
      ph += Math.max(0, r.speed) * dt * 1.6;
      crank.rotation.x = ph;
      const a = Math.sin(ph), b = Math.sin(ph + Math.PI);
      rd.legL.rotation.x = -0.9 + a * 0.55; rd.legL.userData.knee.rotation.x = 1.3 - a * 0.5;
      rd.legR.rotation.x = -0.9 + b * 0.55; rd.legR.userData.knee.rotation.x = 1.3 - b * 0.5;
      rd.torso.rotation.z = (r.spurt ? Math.sin(ph) * 0.18 : 0);
      rd.hip.position.y = 0.88 + (r.spurt ? 0.08 : 0);
    } });
  }
  // ボート
  function buildBoat(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    box(T, body, 1.3, 0.4, 2.2, 0xf8f9fa, 0, 0.3, -0.1);
    const nose = cone(T, body, 0.75, 1.0, 4, 0xf8f9fa, 0, 0.3, 1.45); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(0.9, 1, 0.55);
    box(T, body, 1.34, 0.12, 2.24, col, 0, 0.1, -0.1);
    box(T, body, 1.36, 0.08, 2.26, acc, 0, 0.36, -0.1);
    box(T, body, 1.0, 0.1, 1.2, 0x8b5a2b, 0, 0.52, -0.3);
    box(T, body, 0.9, 0.3, 0.06, 0, 0, 0.72, 0.38, glass(T)).rotation.x = -0.5;
    box(T, body, 0.36, 0.3, 0.36, 0x343a40, 0, 0.62, -0.75);
    const motor = new T.Group(); motor.position.set(0, 0.5, -1.3); body.add(motor);
    box(T, motor, 0.36, 0.42, 0.34, 0x212529, 0, 0.1, 0); box(T, motor, 0.12, 0.5, 0.12, 0x495057, 0, -0.32, 0);
    const prop = new T.Group(); prop.position.set(0, -0.55, -0.08); motor.add(prop);
    [0, 1, 2].forEach((k) => { const b = box(T, prop, 0.04, 0.22, 0.05, 0xadb5bd, 0, 0, 0); b.rotation.z = (k * Math.PI * 2) / 3; b.position.set(Math.sin((k * Math.PI * 2) / 3) * 0.08, Math.cos((k * Math.PI * 2) / 3) * 0.08, 0); });
    plate(T, body, num, col, -0.68, 0.3, 0.4, -Math.PI / 2, 0.4); plate(T, body, num, col, 0.68, 0.3, 0.4, Math.PI / 2, 0.4);
    const rd = rider(T, body, acc, col, { hipY: 0.62 }); rd.g.position.set(0, 0, -0.35); rd.legL.rotation.x = -1.4; rd.legR.rotation.x = -1.4; rd.legL.userData.knee.rotation.x = 1.4; rd.legR.userData.knee.rotation.x = 1.4; rd.armL.rotation.x = 0.5; rd.armR.rotation.x = 0.5;
        const shadow = softShadow(T, root, 1.8, 3.2);
    return finish(root, body, { shadow, anim(r, dt) { prop.rotation.z += r.speed * dt * 4; motor.rotation.y = r.steer * 0.3; body.rotation.x = Math.min(0.12, r.speed * 0.005) * -1; } });
  }
  // 水上バイク
  function buildJetski(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    box(T, body, 0.8, 0.3, 1.9, col, 0, 0.25, 0);
    const nose = cone(T, body, 0.45, 0.7, 4, col, 0, 0.25, 1.2); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(0.9, 1, 0.5);
    box(T, body, 0.84, 0.1, 1.94, 0xf8f9fa, 0, 0.06, 0);
    box(T, body, 0.36, 0.18, 0.9, 0x212529, 0, 0.48, -0.25);
    box(T, body, 0.5, 0.26, 0.4, acc, 0, 0.5, 0.5);
    box(T, body, 0.7, 0.04, 0.04, 0x343a40, 0, 0.74, 0.52);
    box(T, body, 0.3, 0.12, 0.04, 0, 0, 0.66, 0.72, glass(T)).rotation.x = -0.6;
    plate(T, body, num, col, -0.41, 0.26, 0.2, -Math.PI / 2, 0.36); plate(T, body, num, col, 0.41, 0.26, 0.2, Math.PI / 2, 0.36);
    const rd = rider(T, body, acc, col, { hipY: 0.62 }); rd.g.position.set(0, 0, -0.15); rd.torso.rotation.x = 0.4; rd.armL.rotation.x = 0.8; rd.armR.rotation.x = 0.8; rd.legL.rotation.x = -1.0; rd.legR.rotation.x = -1.0; rd.legL.userData.knee.rotation.x = 1.5; rd.legR.userData.knee.rotation.x = 1.5;
        const shadow = softShadow(T, root, 1.2, 2.6);
    return finish(root, body, { shadow, anim(r, dt, t, steer) { rd.torso.rotation.z = -steer * 0.3; body.rotation.z += -steer * 0.1; } });
  }
  // スキー
  function buildSkier(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    const skis = new T.Group(); body.add(skis);
    [-0.13, 0.13].forEach((x) => { box(T, skis, 0.09, 0.03, 1.6, acc, x, 0.04, 0.05); box(T, skis, 0.09, 0.03, 0.2, acc, x, 0.08, 0.86).rotation.x = -0.5; });
    const rd = rider(T, body, col, 0xffffff, { hipY: 0.72, pants: 0x343a40, boot: acc });
    rd.legL.position.x = -0.13; rd.legR.position.x = 0.13;
    const bib = KIT.plateTex(T, num, "#" + (col | 0).toString(16).padStart(6, "0"));
    const b = new T.Mesh(G(T, "bib", () => new T.PlaneGeometry(0.24, 0.16)), new T.MeshBasicMaterial({ map: bib })); b.position.set(0, 0.25, -0.125); b.rotation.y = Math.PI; rd.torso.add(b);
    const poles = [-1, 1].map((s) => { const p = new T.Group(); p.position.set(s * 0.04, 0, 0.3); rd.armL.parent.children; (s < 0 ? rd.armL : rd.armR).add(p); cyl(T, p, 0.015, 0.015, 1.0, 4, 0xadb5bd, 0, -0.45, 0); return p; });
    const shadow = softShadow(T, root, 0.8, 1.9);
    return finish(root, body, { shadow, anim(r, dt, t, steer) {
      const tuck = r.spurt ? 1 : 0, k = r._tk = (r._tk || 0) + (tuck - (r._tk || 0)) * Math.min(1, dt * 8);
      rd.hip.position.y = 0.72 - k * 0.22; rd.torso.rotation.x = 0.35 + k * 0.6;
      rd.legL.rotation.x = -0.35 - k * 0.6; rd.legR.rotation.x = -0.35 - k * 0.6; rd.legL.userData.knee.rotation.x = 0.6 + k * 0.8; rd.legR.userData.knee.rotation.x = 0.6 + k * 0.8;
      rd.armL.rotation.x = 0.4 + k * 0.6; rd.armR.rotation.x = 0.4 + k * 0.6;
      body.rotation.z = -steer * 0.35; skis.rotation.y = -steer * 0.18 + r.slip * 0.3; poles.forEach((p) => { p.rotation.x = k ? -1.2 : -0.3 + Math.sin(t * 6) * 0.1; });
    } });
  }
  // スノーボード
  function buildBoarder(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    const board = new T.Group(); body.add(board);
    box(T, board, 0.32, 0.04, 1.45, acc, 0, 0.05, 0); cyl(T, board, 0.16, 0.16, 0.04, 10, acc, 0, 0.05, 0.72); cyl(T, board, 0.16, 0.16, 0.04, 10, acc, 0, 0.05, -0.72);
    box(T, board, 0.2, 0.06, 0.12, 0x212529, 0, 0.1, 0.25); box(T, board, 0.2, 0.06, 0.12, 0x212529, 0, 0.1, -0.25);
    const rd = rider(T, body, col, acc, { hipY: 0.68, pants: 0x5c7cfa, boot: 0x212529 });
    rd.g.rotation.y = Math.PI / 2; rd.legL.position.x = -0.22; rd.legR.position.x = 0.22;
    rd.armL.rotation.set(0, 0, -1.0); rd.armR.rotation.set(0, 0, 1.0); rd.head.rotation.y = -Math.PI / 2 + 0.2;
    const bib = KIT.plateTex(T, num, "#" + (col | 0).toString(16).padStart(6, "0"));
    const b = new T.Mesh(G(T, "bib", () => new T.PlaneGeometry(0.24, 0.16)), new T.MeshBasicMaterial({ map: bib })); b.position.set(0, 0.25, 0.125); rd.torso.add(b);
    const shadow = softShadow(T, root, 0.8, 1.8);
    return finish(root, body, { shadow, anim(r, dt, t, steer) {
      const k = Math.max(0, Math.min(1, r.air ? 1 : 0));
      rd.hip.position.y = 0.68 - (r.drift ? 0.16 : 0.05) + k * 0.1; rd.torso.rotation.z = -steer * 0.4;
      body.rotation.z = -steer * 0.38; board.rotation.y = r.slip * 0.4;
      if (r.air) { body.rotation.y = (r._grab = (r._grab || 0) + dt * 6) ; } else { r._grab = 0; body.rotation.y = 0; }
      rd.legL.rotation.x = -0.4 - k * 0.6; rd.legR.rotation.x = -0.4 - k * 0.6; rd.legL.userData.knee.rotation.x = 0.8 + k; rd.legR.userData.knee.rotation.x = 0.8 + k;
    } });
  }
  // 犬ぞり（ぞり＋人＋犬4ひき）
  function buildSled(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    [-0.38, 0.38].forEach((x) => { box(T, body, 0.05, 0.05, 1.9, 0x495057, x, 0.05, -0.2); box(T, body, 0.05, 0.05, 0.3, 0x495057, x, 0.15, 0.82).rotation.x = -0.8; });
    box(T, body, 0.8, 0.06, 1.3, 0x8b5a2b, 0, 0.3, 0); box(T, body, 0.8, 0.3, 0.06, col, 0, 0.45, 0.62); [-1, 1].forEach((s) => box(T, body, 0.04, 0.24, 1.2, col, s * 0.4, 0.42, 0));
    box(T, body, 0.78, 0.5, 0.04, 0x8b5a2b, 0, 0.65, -0.7); box(T, body, 0.9, 0.05, 0.05, 0x343a40, 0, 0.92, -0.72);
    plate(T, body, num, col, 0, 0.45, 0.655, 0, 0.3);
    const rd = rider(T, body, col, acc, { hipY: 0.48, pants: 0x343a40, helm: acc }); rd.g.position.set(0, 0, -1.0); rd.armL.rotation.x = 1.1; rd.armR.rotation.x = 1.1; rd.torso.rotation.x = 0.25;
    sph(T, rd.head, 0.17, 0xffffff, 0, 0.04, 0, null, 8, 6).scale.set(1, 0.6, 1);
    // 犬：2ひきずつ2列、引きづな
    const dogs = [];
    const mkDog = (x, z, c) => {
      const d = new T.Group(); d.position.set(x, 0, z); body.add(d);
      box(T, d, 0.26, 0.24, 0.62, c, 0, 0.42, 0); box(T, d, 0.22, 0.22, 0.26, c, 0, 0.6, 0.36); box(T, d, 0.12, 0.1, 0.16, 0xf8f9fa, 0, 0.55, 0.52);
      cone(T, d, 0.05, 0.12, 4, c, -0.07, 0.75, 0.36); cone(T, d, 0.05, 0.12, 4, c, 0.07, 0.75, 0.36);
      const tail = box(T, d, 0.06, 0.06, 0.26, c, 0, 0.58, -0.38); tail.rotation.x = -0.8; tail.userData.keep = true;
      box(T, d, 0.28, 0.06, 0.2, acc, 0, 0.56, 0.05);
      const legs = [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.22], [0.09, -0.22]].map(([lx, lz]) => { const l = new T.Group(); l.position.set(lx, 0.34, lz); d.add(l); box(T, l, 0.07, 0.32, 0.07, c, 0, -0.16, 0); return l; });
      dogs.push({ d, legs, tail }); return d;
    };
    const dc = [0x495057, 0xf1f3f5, 0x8b5a2b, 0x343a40];
    mkDog(-0.3, 1.5, dc[0]); mkDog(0.3, 1.5, dc[1]); mkDog(-0.3, 2.45, dc[2]); mkDog(0.3, 2.45, dc[3]);
    box(T, body, 0.03, 0.03, 2.2, 0xe03131, 0, 0.48, 1.6);
    const shadow = softShadow(T, root, 1.4, 4.6); shadow.position.z = 0.7;
    return finish(root, body, { shadow, anim(r, dt, t, steer) {
      const sp = Math.max(0, r.speed), ph = (r._ph = (r._ph || 0) + sp * dt * 1.2);
      dogs.forEach((o, i) => { o.legs.forEach((l, j) => { l.rotation.x = Math.sin(ph + i * 0.7 + (j < 2 ? 0 : Math.PI)) * Math.min(0.9, sp * 0.06); }); o.d.position.y = Math.abs(Math.sin(ph + i)) * Math.min(0.08, sp * 0.004); o.tail.rotation.y = Math.sin(t * 8 + i) * 0.4; o.d.rotation.y = steer * 0.25; });
      rd.torso.rotation.z = -steer * 0.25; rd.armR.rotation.x = r.spurt ? 1.1 + Math.sin(t * 14) * 0.6 : 1.1;
    } });
  }
  // ロケット（宇宙）
  function buildRocket(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    const hover = new T.Group(); hover.position.y = 0.75; body.add(hover);
    const f = cyl(T, hover, 0.34, 0.42, 1.9, 10, col, 0, 0, -0.05); f.rotation.x = Math.PI / 2;
    const n = cone(T, hover, 0.34, 0.8, 10, 0xf8f9fa, 0, 0, 1.3); n.rotation.x = Math.PI / 2;
    box(T, hover, 0.86, 0.03, 0.06, acc, 0, 0, 0.88);
    const ck = sph(T, hover, 0.26, 0, 0, 0.26, 0.35, glass(T), 10, 8); ck.scale.set(1, 0.8, 1.5);
    [[0, 0.5], [2.1, 0.5], [4.2, 0.5]].forEach(([a]) => { const fin = box(T, hover, 0.04, 0.55, 0.6, acc, 0, 0, -0.85); fin.position.set(Math.sin(a) * 0.48, Math.cos(a) * 0.48, -0.85); fin.rotation.z = -a; });
    [-1, 1].forEach((s) => { const w = box(T, hover, 0.9, 0.04, 0.5, col, s * 0.6, -0.05, -0.2); w.rotation.z = s * -0.15; box(T, hover, 0.08, 0.08, 0.5, 0, s * 1.05, -0.12, -0.2, bas(T, isMe ? 0xffe066 : 0x74c0fc)); });
    const rim = cyl(T, hover, 0.3, 0.3, 0.12, 10, 0x495057, 0, 0, -1.04); rim.rotation.x = Math.PI / 2;
    plate(T, hover, num, col, 0, 0.42, -0.4, 0, 0.3).rotation.x = -Math.PI / 2;
    const fl = flamesAt(T, hover, [[0, 0, -1.4, 2.3], [-0.55, -0.1, -0.55, 0.9], [0.55, -0.1, -0.55, 0.9]], 0x74c0fc);
    const glow = sph(T, hover, 0.24, 0, 0, 0, -1.12, bas(T, 0x91a7ff, 0.7));
    const shadow = softShadow(T, root, 1.4, 2.6);
    return finish(root, body, { flames: fl, shadow, anim(r, dt, t, steer) { hover.position.y = 0.75 + Math.sin(t * 3 + r.idx) * 0.08; hover.rotation.z = -steer * 0.5; glow.scale.setScalar(0.8 + Math.min(1, r.speed / 25) * 0.6 + (r.boost > 0 ? 0.5 : 0)); fl[0].material.opacity = Math.max(fl[0].material.opacity, 0.35 + Math.min(0.4, r.speed / 60)); } });
  }
  // 馬と騎手
  function buildHorse(T, col, acc, isMe, num) {
    const { root, body } = base(T);
    const hc = [0x8b5a2b, 0x5c3d21, 0x343a40, 0xc4a26a, 0xf1f3f5][num % 5];
    const hb = new T.Group(); body.add(hb);
    box(T, hb, 0.5, 0.52, 1.35, hc, 0, 1.12, 0);
    sph(T, hb, 0.3, hc, 0, 1.12, 0.62).scale.set(0.9, 0.95, 0.8); sph(T, hb, 0.3, hc, 0, 1.12, -0.6).scale.set(0.9, 0.95, 0.8);
    const neck = new T.Group(); neck.position.set(0, 1.3, 0.62); hb.add(neck);
    const nk = box(T, neck, 0.28, 0.72, 0.34, hc, 0, 0.3, 0.12); nk.rotation.x = 0.55;
    const head = new T.Group(); head.position.set(0, 0.66, 0.36); neck.add(head);
    const hd = box(T, head, 0.24, 0.26, 0.56, hc, 0, 0, 0.16); hd.rotation.x = 0.55;
    box(T, head, 0.2, 0.18, 0.2, 0x343a40, 0, -0.16, 0.38).rotation.x = 0.55;
    cone(T, head, 0.05, 0.16, 4, hc, -0.08, 0.2, -0.05); cone(T, head, 0.05, 0.16, 4, hc, 0.08, 0.2, -0.05);
    box(T, neck, 0.06, 0.66, 0.16, 0x212529, 0, 0.36, -0.06).rotation.x = 0.55;
    const tail = new T.Group(); tail.position.set(0, 1.3, -0.82); hb.add(tail); const tl = box(T, tail, 0.1, 0.6, 0.12, 0x212529, 0, -0.28, -0.06); tl.rotation.x = 0.3;
    box(T, hb, 0.54, 0.06, 0.5, acc, 0, 1.41, -0.02); plate(T, hb, num, col, -0.27, 1.22, -0.02, -Math.PI / 2, 0.3); plate(T, hb, num, col, 0.27, 1.22, -0.02, Math.PI / 2, 0.3);
    const legs = [[-0.16, 0.5], [0.16, 0.5], [-0.16, -0.5], [0.16, -0.5]].map(([x, z]) => {
      const l = new T.Group(); l.position.set(x, 0.95, z); hb.add(l);
      box(T, l, 0.13, 0.48, 0.15, hc, 0, -0.24, 0);
      const lo = new T.Group(); lo.position.y = -0.48; l.add(lo); box(T, lo, 0.1, 0.42, 0.11, hc, 0, -0.21, 0); box(T, lo, 0.12, 0.08, 0.14, 0x212529, 0, -0.43, 0.01);
      return { l, lo };
    });
    const rd = rider(T, hb, col, col, { hipY: 1.52, pants: 0xf8f9fa, boot: 0x212529, belt: acc }); rd.g.position.z = 0.1;
    rd.torso.rotation.x = 0.95; rd.legL.rotation.x = -1.2; rd.legR.rotation.x = -1.2; rd.legL.userData.knee.rotation.x = 2.2; rd.legR.userData.knee.rotation.x = 2.2; rd.legL.position.x = -0.24; rd.legR.position.x = 0.24; rd.armL.rotation.x = 1.0; rd.armR.rotation.x = 1.0;
    box(T, rd.torso, 0.36, 0.1, 0.26, acc, 0, 0.3, 0);
    const shadow = softShadow(T, root, 1.1, 2.6);
    return finish(root, body, { shadow, anim(r, dt, t, steer) {
      const sp = Math.max(0, r.speed), ph = (r._ph = (r._ph || 0) + sp * dt * 0.62);
      const amp = Math.min(0.9, sp * 0.06), off = [0, 0.4, Math.PI, Math.PI + 0.4];
      legs.forEach((o, i) => { const s = Math.sin(ph + off[i]); o.l.rotation.x = s * amp; o.lo.rotation.x = Math.max(0, -Math.cos(ph + off[i])) * amp * 1.2; });
      hb.position.y = Math.abs(Math.sin(ph)) * Math.min(0.14, sp * 0.008); hb.rotation.x = Math.sin(ph * 2) * 0.04 * Math.min(1, sp / 10);
      neck.rotation.x = Math.sin(ph) * 0.12 * Math.min(1, sp / 10); tail.rotation.x = 0.2 + Math.sin(ph) * 0.2;
      rd.g.position.y = -hb.position.y * 0.6; rd.armR.rotation.x = r.spurt ? 1.0 + Math.sin(t * 12) * 0.8 : 1.0; hb.rotation.z = -steer * 0.12;
    } });
  }

  // ---------- しかけ（障害物など）の見た目 ----------
  function hazardMesh(T, kind, theme) {
    const g = new T.Group();
    if (kind === "cone") { cone(T, g, 0.32, 0.8, 8, 0xff6b00, 0, 0.4, 0); box(T, g, 0.6, 0.06, 0.6, 0x212529, 0, 0.03, 0); cyl(T, g, 0.2, 0.24, 0.1, 8, 0xffffff, 0, 0.45, 0); }
    else if (kind === "rock") { const m = new T.Mesh(G(T, "rock", () => new T.DodecahedronGeometry(0.8, 0)), lam(T, 0x868e96)); m.position.y = 0.45; m.scale.set(1.2, 0.8, 1); g.add(m); }
    else if (kind === "buoy") { cyl(T, g, 0.45, 0.55, 0.9, 10, 0xff6b6b, 0, 0.3, 0); cyl(T, g, 0.47, 0.47, 0.2, 10, 0xffffff, 0, 0.45, 0); cone(T, g, 0.16, 0.6, 6, 0xffe066, 0, 1.0, 0); }
    else if (kind === "mud") { const m = new T.Mesh(G(T, "mud", () => new T.CircleGeometry(2.2, 14)), bas(T, theme && theme.mudCol || 0x5c3d21, 0.85)); m.rotation.x = -Math.PI / 2; m.position.y = 0.07; g.add(m); const m2 = new T.Mesh(G(T, "mud2", () => new T.CircleGeometry(1.2, 10)), bas(T, 0x3d2914, 0.7)); m2.rotation.x = -Math.PI / 2; m2.position.set(0.5, 0.08, 0.3); g.add(m2); }
    else if (kind === "pad") { const m = new T.Mesh(G(T, "pad", () => new T.PlaneGeometry(2.6, 3.0)), bas(T, 0x339af0, 0.9)); m.rotation.x = -Math.PI / 2; m.position.y = 0.08; g.add(m); [0, 1].forEach((k) => { const a = new T.Mesh(G(T, "padA", () => new T.ConeGeometry(0.8, 0.9, 3)), bas(T, 0xffffff)); a.rotation.set(-Math.PI / 2, 0, 0); a.position.set(0, 0.1, -0.6 + k * 1.1); a.scale.z = 0.1; g.add(a); }); }
    else if (kind === "ring") { const m = new T.Mesh(G(T, "ring", () => new T.TorusGeometry(2.6, 0.18, 6, 24)), bas(T, 0x74c0fc)); m.position.y = 2.2; g.add(m); const m2 = new T.Mesh(G(T, "ring2", () => new T.TorusGeometry(2.2, 0.06, 4, 24)), bas(T, 0xffe066)); m2.position.y = 2.2; g.add(m2); }
    else if (kind === "hay") { const m = cyl(T, g, 0.6, 0.6, 1.2, 10, 0xe9c46a, 0, 0.6, 0); m.rotation.z = Math.PI / 2; cyl(T, g, 0.62, 0.62, 0.1, 10, 0xc4a26a, 0.3, 0.6, 0).rotation.z = Math.PI / 2; }
    else if (kind === "snowman") { sph(T, g, 0.55, 0xffffff, 0, 0.5, 0); sph(T, g, 0.38, 0xffffff, 0, 1.2, 0); cone(T, g, 0.06, 0.3, 6, 0xff922b, 0, 1.22, 0.42).rotation.x = Math.PI / 2; box(T, g, 0.5, 0.1, 0.5, 0x212529, 0, 1.55, 0); box(T, g, 0.3, 0.3, 0.3, 0x212529, 0, 1.72, 0); }
    else if (kind === "log") { const m = cyl(T, g, 0.32, 0.32, 3.0, 8, 0x8b5a2b, 0, 0.32, 0); m.rotation.z = Math.PI / 2; }
    return lighten(T, g);
  }

  // ---------- コースの形 ----------
  const P = (T, a) => a.map(([x, z, y]) => new T.Vector3(x, y || 0, z));
  const COURSES = {
    city: (T) => P(T, [[0, -50], [30, -50], [55, -42], [62, -20], [55, 0], [40, 8], [48, 24], [56, 42], [40, 56], [10, 54], [-10, 40], [-30, 52], [-52, 46], [-60, 24], [-56, 0], [-60, -24], [-46, -46], [-22, -52]]),
    rally: (T) => P(T, [[0, -45, 0], [28, -40, 1.5], [48, -22, 3], [44, 6, 4], [52, 30, 2.5], [30, 46, 1], [6, 36, 2.5], [-14, 48, 4], [-38, 40, 3], [-50, 16, 1.5], [-36, -2, 0.5], [-48, -26, 1], [-28, -46, 0.5]]),
    lake: (T) => P(T, [[0, -50], [35, -46], [58, -25], [56, 5], [38, 20], [50, 40], [30, 58], [0, 55], [-28, 58], [-52, 40], [-46, 15], [-58, -12], [-40, -42]]),
    bay: (T) => P(T, [[0, -40], [22, -44], [40, -30], [38, -10], [18, -2], [22, 16], [42, 24], [46, 44], [24, 56], [2, 46], [-16, 56], [-38, 50], [-48, 28], [-32, 12], [-46, -8], [-40, -30], [-20, -42]]),
    slope: (T) => { const a = []; for (let i = 0; i <= 15; i++) a.push([Math.sin(i * 0.85) * 14, i * 38, 70 - i * 4.6]); return P(T, a); },
    cross: (T) => { const a = []; for (let i = 0; i <= 14; i++) a.push([Math.sin(i * 0.7) * 24, i * 38, 62 - i * 4.4]); return P(T, a); },
    forest: (T) => P(T, [[0, -44], [30, -42], [50, -24], [46, 0], [56, 22], [40, 44], [14, 40], [0, 56], [-24, 50], [-44, 32], [-40, 8], [-54, -14], [-34, -38]]),
    space: (T) => P(T, [[0, -50, 4], [34, -46, 8], [56, -20, 12], [50, 10, 8], [30, 24, 3], [42, 46, 6], [14, 60, 10], [-18, 52, 14], [-44, 40, 10], [-56, 10, 6], [-40, -12, 2], [-54, -34, 5], [-28, -52, 4]]),
    oval: (T) => { const a = []; for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2 - Math.PI / 2; a.push([Math.cos(t) * 64, Math.sin(t) * 36]); } return P(T, a); },
    hills: (T) => P(T, [[0, -55, 0], [30, -52, 1], [56, -36, 3], [62, -8, 6], [48, 14, 8], [56, 38, 5], [34, 58, 2], [6, 50, 1], [-18, 58, 2], [-44, 48, 4], [-60, 22, 6], [-50, -4, 4], [-60, -30, 2], [-34, -52, 0.5]]),
    highway: (T) => { const a = []; for (let i = 0; i <= 15; i++) a.push([Math.sin(i * 0.45) * 26, i * 62, Math.sin(i * 0.7) * 1.5]); return P(T, a); },
    port: (T) => P(T, [[0, -40], [26, -44], [46, -36], [52, -16], [32, -6], [24, 10], [44, 18], [52, 38], [34, 52], [8, 46], [-6, 30], [-24, 40], [-46, 44], [-56, 24], [-44, 4], [-56, -18], [-36, -38]])
  };

  // ---------- 飾り（テーマごと） ----------
  function pines(T, scene, list, snowy) {
    inst(T, scene, G(T, "trunk", () => new T.CylinderGeometry(0.15, 0.2, 1.0, 5)), lam(T, 0x6b4a2b), list.map((o) => ({ x: o.x, y: o.y + 0.5 * o.s, z: o.z, s: o.s })));
    inst(T, scene, G(T, "pine1", () => new T.ConeGeometry(1.2, 2.2, 7)), lam(T, snowy ? 0x2f6f4f : 0x2b8a3e), list.map((o) => ({ x: o.x, y: o.y + 1.8 * o.s, z: o.z, s: o.s, ry: o.ry })));
    inst(T, scene, G(T, "pine2", () => new T.ConeGeometry(0.85, 1.6, 7)), lam(T, snowy ? 0xf1f3f5 : 0x37b24d), list.map((o) => ({ x: o.x, y: o.y + 2.9 * o.s, z: o.z, s: o.s, ry: o.ry })));
  }
  function roundTrees(T, scene, list) {
    inst(T, scene, G(T, "trunk", () => new T.CylinderGeometry(0.15, 0.2, 1.0, 5)), lam(T, 0x6b4a2b), list.map((o) => ({ x: o.x, y: o.y + 0.5 * o.s, z: o.z, s: o.s })));
    inst(T, scene, G(T, "canopy", () => new T.IcosahedronGeometry(1.1, 0)), lam(T, 0x40c057), list.map((o) => ({ x: o.x, y: o.y + 1.7 * o.s, z: o.z, s: o.s * 1.1, ry: o.ry })), [0x40c057, 0x2f9e44, 0x69db7c]);
  }
  function buildings(T, scene, at, RW, n, seed, minOff) {
    const list = along(at, n, RW + (minOff || 9), RW + 34, seed).map((o) => ({ x: o.x, y: o.y, z: o.z, ry: o.yaw, sx: 5 + o.r() * 6, sy: 6 + o.r() * 18, sz: 5 + o.r() * 6 }));
    list.forEach((o) => { o.y += o.sy / 2; });
    const half = Math.ceil(list.length / 2);
    inst(T, scene, G(T, "bld", () => new T.BoxGeometry(1, 1, 1)), MAT.bldA || (MAT.bldA = new T.MeshLambertMaterial({ map: windowsTex(T, "#c5cfe0", "#fff3bf") })), list.slice(0, half));
    inst(T, scene, G(T, "bld", () => new T.BoxGeometry(1, 1, 1)), MAT.bldB || (MAT.bldB = new T.MeshLambertMaterial({ map: windowsTex(T, "#e9d8c4", "#ffe8a3") })), list.slice(half));
  }
  function lamps(T, scene, at, RW, n, closed) {
    const posts = [], heads = [];
    for (let i = 0; i < n; i++) { const t = i / n, s = i % 2 ? 1 : -1, a = at(t, s * (RW + 1.2)); posts.push({ x: a.x, y: a.y + 2.2, z: a.z }); const b = at(t, s * (RW + 0.2)); heads.push({ x: b.x, y: b.y + 4.3, z: b.z, ry: a.yaw }); }
    inst(T, scene, G(T, "lpost", () => new T.CylinderGeometry(0.07, 0.09, 4.4, 5)), lam(T, 0x868e96), posts);
    inst(T, scene, G(T, "lhead", () => new T.BoxGeometry(0.5, 0.14, 0.9)), bas(T, 0xfff3bf), heads);
    void closed;
  }
  function crowd(T, scene, at, RW, n, seed) {
    const list = along(at, n, RW + 1.8, RW + 3.2, seed).map((o) => ({ x: o.x, y: o.y + 0.45, z: o.z, ry: o.ry, s: 1 }));
    inst(T, scene, G(T, "person", () => T.CapsuleGeometry ? new T.CapsuleGeometry(0.2, 0.5, 2, 6) : new T.BoxGeometry(0.4, 0.9, 0.4)), new T.MeshLambertMaterial({ color: 0xffffff }), list, [0xe03131, 0x4dabf7, 0xffe066, 0x51cf66, 0xcc5de8, 0xff922b, 0xffffff]);
    inst(T, scene, G(T, "phead", () => new T.SphereGeometry(0.16, 6, 5)), lam(T, 0xf3c29c), list.map((o) => ({ x: o.x, y: o.y + 0.55, z: o.z })));
  }
  const DRESS = {
    city(T, scene, curve, theme, at, RW) {
      buildings(T, scene, at, RW, 46, 3); lamps(T, scene, at, RW, 22); crowd(T, scene, at, RW, 40, 5);
      rail(T, scene, curve, RW + 0.9, 0.55, 0.06, 0xced4da, 0x868e96, 4); rail(T, scene, curve, -(RW + 0.9), 0.55, 0.06, 0xced4da, 0x868e96, 4);
      board(T, scene, at(0.3, RW + 3), "ベイサイド\nシティ", 2.4, 1.2, 2.5); board(T, scene, at(0.55, -(RW + 3)), "海まで\n2km →", 2.4, 1.2, 2.5);
      const sea = new T.Mesh(new T.PlaneGeometry(400, 120), lam(T, 0x339af0)); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.2, -150); scene.add(sea);
    },
    rally(T, scene, curve, theme, at, RW) {
      pines(T, scene, along(at, 90, RW + 4, RW + 30, 9), false);
      inst(T, scene, G(T, "rock", () => new T.DodecahedronGeometry(0.8, 0)), lam(T, 0x868e96), along(at, 40, RW + 1.5, RW + 12, 12).map((o) => ({ x: o.x, y: o.y + 0.3, z: o.z, s: o.s * 1.2, ry: o.ry })));
      inst(T, scene, G(T, "bale", () => new T.CylinderGeometry(0.6, 0.6, 1.2, 10)), lam(T, 0xe9c46a), along(at, 26, RW + 1.0, RW + 1.6, 15).map((o) => ({ x: o.x, y: o.y + 0.6, z: o.z, rz: Math.PI / 2, ry: o.yaw })));
      crowd(T, scene, at, RW + 3, 30, 17);
      // 遠くの山
      inst(T, scene, G(T, "mtn", () => new T.ConeGeometry(30, 36, 6)), lam(T, 0x9c7a54), [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: Math.cos(i) * 150, y: 10, z: Math.sin(i) * 150, s: 0.7 + (i % 3) * 0.25 })));
    },
    water(T, scene, curve, theme, at, RW) {
      const L = curve.getLength(), n = Math.round(L / 7);
      [-1, 1].forEach((s) => inst(T, scene, G(T, "buoyS", () => new T.SphereGeometry(0.35, 8, 6)), lam(T, 0xffffff), Array.from({ length: n }, (_, i) => { const a = at(i / n, s * (RW + 0.4)); return { x: a.x, y: 0.1, z: a.z }; }), [0xff6b6b, 0xffffff, 0xffe066]));
      const isl = along(at, 9, RW + 18, RW + 40, 21);
      inst(T, scene, G(T, "isl", () => new T.CylinderGeometry(6, 8, 1.2, 10)), lam(T, 0xf4e3b5), isl.map((o) => ({ x: o.x, y: 0, z: o.z, s: o.s })));
      inst(T, scene, G(T, "palmT", () => new T.CylinderGeometry(0.14, 0.2, 4, 5)), lam(T, 0x8b5a2b), isl.map((o) => ({ x: o.x, y: 2.4, z: o.z, rz: 0.15 })));
      inst(T, scene, G(T, "palmL", () => new T.ConeGeometry(2.0, 0.8, 7)), lam(T, 0x2f9e44), isl.map((o) => ({ x: o.x + 0.3, y: 4.5, z: o.z })));
      const lh = new T.Group(); cyl(T, lh, 1.2, 1.6, 10, 10, 0xffffff, 0, 5, 0); cyl(T, lh, 1.25, 1.45, 1.4, 10, 0xe03131, 0, 6.5, 0); cyl(T, lh, 1.0, 1.0, 1.0, 8, 0, 0, 10.5, 0, bas(T, 0xfff3bf)); cone(T, lh, 1.3, 1.2, 8, 0xe03131, 0, 11.6, 0);
      const la = at(0.4, RW + 22); lh.position.set(la.x, 0, la.z); scene.add(lh);
      const pier = at(0.02, -(RW + 6)); const pg = new T.Group(); box(T, pg, 4, 0.3, 14, 0x8b5a2b, 0, 0.6, 0); pg.position.set(pier.x, 0, pier.z); pg.rotation.y = pier.yaw; scene.add(pg);
      crowd(T, scene, at, RW + 4, 12, 31);
    },
    snow(T, scene, curve, theme, at, RW) {
      pines(T, scene, along(at, 120, RW + 3, RW + 30, 41), true);
      rail(T, scene, curve, RW + 0.6, 1.0, 0.05, 0xff6b00, 0xff922b, 5); rail(T, scene, curve, -(RW + 0.6), 1.0, 0.05, 0xff6b00, 0xff922b, 5);
      rail(T, scene, curve, RW + 0.6, 0.5, 0.04, 0xff6b00); rail(T, scene, curve, -(RW + 0.6), 0.5, 0.04, 0xff6b00);
      const ch = new T.Group(); box(T, ch, 6, 3, 5, 0x8b5a2b, 0, 1.5, 0); const rf = cone(T, ch, 4.8, 2.6, 4, 0xf8f9fa, 0, 4.3, 0); rf.rotation.y = Math.PI / 4; box(T, ch, 1.2, 1.0, 0.1, 0, -1.2, 1.6, 2.51, bas(T, 0xfff3bf)); box(T, ch, 1.2, 1.0, 0.1, 0, 1.4, 1.6, 2.51, bas(T, 0xfff3bf));
      const ca = at(0.03, -(RW + 12)); ch.position.set(ca.x, ca.y, ca.z); ch.rotation.y = ca.yaw; scene.add(ch);
      const towers = along(at, 8, RW + 9, RW + 10, 43, { side: 1 });
      inst(T, scene, G(T, "lift", () => new T.CylinderGeometry(0.25, 0.35, 12, 6)), lam(T, 0x868e96), towers.map((o) => ({ x: o.x, y: o.y + 6, z: o.z })));
      inst(T, scene, G(T, "liftX", () => new T.BoxGeometry(3, 0.3, 0.3)), lam(T, 0x495057), towers.map((o) => ({ x: o.x, y: o.y + 12, z: o.z, ry: o.yaw + Math.PI / 2 })));
      inst(T, scene, G(T, "mtnS", () => new T.ConeGeometry(40, 60, 6)), lam(T, 0xe7f0fb), [0, 1, 2, 3, 4].map((i) => { const a = at(0.2 + i * 0.18, (i % 2 ? 1 : -1) * 150); return { x: a.x, y: a.y + 10, z: a.z, s: 0.8 + (i % 2) * 0.3 }; }));
      crowd(T, scene, at, RW + 1.6, 26, 47);
    },
    forestSnow(T, scene, curve, theme, at, RW) {
      pines(T, scene, along(at, 110, RW + 3, RW + 32, 51), true);
      inst(T, scene, G(T, "snowmound", () => new T.SphereGeometry(1.4, 8, 5)), lam(T, 0xffffff), along(at, 40, RW + 1.2, RW + 3, 53).map((o) => ({ x: o.x, y: o.y - 0.4, z: o.z, sx: 1.6, sy: 0.6, sz: 1.2, ry: o.yaw })));
      inst(T, scene, G(T, "flagP", () => new T.CylinderGeometry(0.05, 0.05, 2.2, 4)), lam(T, 0xced4da), along(at, 30, RW + 0.6, RW + 0.8, 57).map((o) => ({ x: o.x, y: o.y + 1.1, z: o.z })));
      crowd(T, scene, at, RW + 3, 24, 59);
      inst(T, scene, G(T, "mtnS", () => new T.ConeGeometry(40, 60, 6)), lam(T, 0xe7f0fb), [0, 1, 2, 3, 4, 5].map((i) => ({ x: Math.cos(i * 1.1) * 160, y: 10, z: Math.sin(i * 1.1) * 160, s: 0.8 + (i % 2) * 0.3 })));
    },
    space(T, scene, curve, theme, at, RW) {
      rail(T, scene, curve, RW + 0.3, 0.35, 0.09, 0, 0, 0).material = bas(T, 0x74c0fc);
      rail(T, scene, curve, -(RW + 0.3), 0.35, 0.09, 0, 0, 0).material = bas(T, 0xcc5de8);
      // 道の下の支え
      const sup = along(at, 30, 0, 0.01, 61).map((o) => ({ x: o.x, y: o.y - 3, z: o.z, sy: 6 }));
      inst(T, scene, G(T, "spSup", () => new T.CylinderGeometry(0.3, 0.6, 1, 6)), lam(T, 0x495057), sup);
      particles(T, scene, 700, 420, 0xffffff, 0.9, 0.95);
      const pl = [[120, 30, -60, 22, 0xff922b], [-140, 50, 80, 30, 0x5c7cfa], [40, -20, 170, 14, 0x63e6be]];
      pl.forEach(([x, y, z, r, c], i) => { const s = sph(T, scene, r, c, x, y, z, null, 20, 14); if (i === 1) { const ring = new T.Mesh(new T.TorusGeometry(r * 1.6, 2.2, 4, 40), lam(T, 0xd0bfff)); ring.position.copy(s.position); ring.rotation.x = 1.2; scene.add(ring); } });
      inst(T, scene, G(T, "aster", () => new T.DodecahedronGeometry(1, 0)), lam(T, 0x6c5f8d), along(at, 50, RW + 6, RW + 40, 63).map((o) => ({ x: o.x, y: o.y + (o.r() - 0.5) * 20, z: o.z, s: 0.8 + o.r() * 2.5, ry: o.ry, rx: o.r() * 3 })));
    },
    turf(T, scene, curve, theme, at, RW) {
      rail(T, scene, curve, RW + 0.5, 1.0, 0.07, 0xffffff, 0xffffff, 3); rail(T, scene, curve, -(RW + 0.5), 1.0, 0.07, 0xffffff, 0xffffff, 3);
      inst(T, scene, G(T, "hedge", () => new T.BoxGeometry(1.6, 0.8, 1.6)), lam(T, 0x2b8a3e), Array.from({ length: 60 }, (_, i) => { const a = at(i / 60, -(RW + 2.4)); return { x: a.x, y: 0.4, z: a.z, ry: a.yaw }; }));
      inst(T, scene, G(T, "flower", () => new T.SphereGeometry(0.4, 6, 4)), lam(T, 0xffffff), along(at, 80, RW + 3, RW + 7, 71, { side: -1 }).map((o) => ({ x: o.x, y: 0.25, z: o.z })), [0xff8787, 0xffe066, 0xf783ac, 0xffffff]);
      // 大きなスタンド（直線の外側）
      const st = new T.Group(); const a = at(0.99, RW + 9);
      for (let row = 0; row < 6; row++) box(T, st, 40, 0.5, 1.4, 0xdee2e6, 0, 0.3 + row * 0.7, row * 1.4);
      box(T, st, 42, 0.4, 10, 0x5f3dc4, 0, 6.2, 3.5);
      const cr = []; for (let row = 0; row < 6; row++) for (let k = 0; k < 30; k++) cr.push({ x: -19 + k * 1.3, y: 0.9 + row * 0.7, z: row * 1.4 });
      inst(T, st, G(T, "cseat", () => new T.BoxGeometry(0.4, 0.6, 0.4)), new T.MeshLambertMaterial({ color: 0xffffff }), cr, [0xe03131, 0x4dabf7, 0xffe066, 0x51cf66, 0xcc5de8, 0xffffff]);
      st.position.set(a.x, 0, a.z); st.rotation.y = a.yaw + Math.PI / 2; scene.add(st);
      // ハロン棒
      inst(T, scene, G(T, "furlong", () => new T.CylinderGeometry(0.1, 0.1, 2.4, 6)), lam(T, 0xe03131), [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((t) => { const b = at(t, -(RW + 0.9)); return { x: b.x, y: 1.2, z: b.z }; }));
      roundTrees(T, scene, along(at, 40, RW + 14, RW + 40, 73, { side: 1 }));
    },
    country(T, scene, curve, theme, at, RW) {
      roundTrees(T, scene, along(at, 70, RW + 4, RW + 30, 81));
      const hs = along(at, 14, RW + 12, RW + 26, 83);
      inst(T, scene, G(T, "house", () => new T.BoxGeometry(4, 3, 5)), lam(T, 0xfff4e6), hs.map((o) => ({ x: o.x, y: o.y + 1.5, z: o.z, ry: o.yaw })), [0xfff4e6, 0xe7f5ff, 0xfff9db]);
      inst(T, scene, G(T, "roof", () => new T.ConeGeometry(3.6, 2, 4)), lam(T, 0xe03131), hs.map((o) => ({ x: o.x, y: o.y + 4, z: o.z, ry: o.yaw + Math.PI / 4 })), [0xe03131, 0x1971c2, 0x2b8a3e, 0x862e9c]);
      const fl = along(at, 10, RW + 16, RW + 40, 85);
      fl.forEach((o, i) => { const f = new T.Mesh(G(T, "field", () => new T.PlaneGeometry(14, 10)), new T.MeshLambertMaterial({ map: stripeTex(T, ["#94d82d", "#ffd43b", "#a9e34b", "#ffa94d"][i % 4], "#74b816", 8) })); f.rotation.x = -Math.PI / 2; f.rotation.z = o.yaw; f.position.set(o.x, o.y + 0.02, o.z); scene.add(f); });
      crowd(T, scene, at, RW + 0.4, 50, 87);
      board(T, scene, at(0.5, RW + 3), "山のぼり\n区間", 2.2, 1.1, 2.2); board(T, scene, at(0.9, -(RW + 3)), "ゴールまで\n500m", 2.2, 1.1, 2.2);
    },
    highway(T, scene, curve, theme, at, RW) {
      buildings(T, scene, at, RW, 60, 91, 12);
      rail(T, scene, curve, RW + 0.6, 0.7, 0.08, 0xadb5bd, 0x868e96, 3); rail(T, scene, curve, -(RW + 0.6), 0.7, 0.08, 0xadb5bd, 0x868e96, 3);
      lamps(T, scene, at, RW, 30);
      // 車線の白い破線
      const L = curve.getLength(), n = Math.round(L / 6), dash = [];
      for (let i = 0; i < n; i++) [-RW / 3, RW / 3].forEach((o) => { const a = at(i / n, o); dash.push({ x: a.x, y: a.y + 0.06, z: a.z, ry: a.yaw }); });
      inst(T, scene, G(T, "dash", () => new T.BoxGeometry(0.18, 0.02, 2.6)), bas(T, 0xffffff), dash);
      [0.25, 0.6].forEach((tt, i) => { const a = at(tt, 0); const gy = new T.Group(); box(T, gy, RW * 2 + 3, 0.5, 0.5, 0x495057, 0, 6, 0); [-1, 1].forEach((s) => box(T, gy, 0.4, 6, 0.4, 0x495057, s * (RW + 1.4), 3, 0)); const sg = new T.Mesh(new T.PlaneGeometry(6, 1.6), new T.MeshBasicMaterial({ map: KIT.signTex(T, i ? "ゴールまで\nあと少し" : "ほしの学園\nまっすぐ") })); sg.position.set(0, 7.1, -0.3); sg.rotation.y = Math.PI; gy.add(sg); box(T, gy, 6.1, 1.7, 0.1, 0x1b6e3a, 0, 7.1, -0.2); gy.position.set(a.x, a.y, a.z); gy.rotation.y = a.yaw; scene.add(gy); });
    },
    port(T, scene, curve, theme, at, RW) {
      const ct = along(at, 50, RW + 6, RW + 26, 101).map((o) => ({ x: o.x, y: o.y + 1.3 + (o.r() < 0.3 ? 2.6 : 0), z: o.z, ry: o.yaw + (o.r() < 0.5 ? 0 : Math.PI / 2) }));
      inst(T, scene, G(T, "cont", () => new T.BoxGeometry(2.6, 2.6, 6)), new T.MeshLambertMaterial({ color: 0xffffff }), ct, [0xe03131, 0x1971c2, 0xf08c00, 0x2b8a3e, 0x5f3dc4, 0x868e96]);
      // タイヤの壁（低ポリの円柱を2段、白いタイヤをときどき入れる）
      const tires = []; const L = curve.getLength(), n = Math.round(L / 1.3);
      for (let i = 0; i < n; i++) [-1, 1].forEach((s) => { const a = at(i / n, s * (RW + 0.9)); tires.push({ x: a.x, y: 0.2, z: a.z }); tires.push({ x: a.x, y: 0.58, z: a.z }); });
      inst(T, scene, G(T, "tireC", () => new T.CylinderGeometry(0.56, 0.56, 0.36, 6)), lam(T, 0xffffff), tires, [0x2b2d33, 0x2b2d33, 0xf1f3f5, 0x2b2d33, 0x2b2d33, 0xe03131]);
      [0.3, 0.7].forEach((tt, i) => { const a = at(tt, (i ? -1 : 1) * (RW + 22)); const cr = new T.Group(); [-2, 2].forEach((x) => [-2, 2].forEach((z) => box(T, cr, 0.5, 18, 0.5, 0xf08c00, x, 9, z))); box(T, cr, 5, 1.2, 26, 0xf08c00, 0, 18, 6); box(T, cr, 3, 2.4, 3, 0x495057, 0, 16, 0); cr.position.set(a.x, 0, a.z); cr.rotation.y = a.yaw; scene.add(cr); });
      lamps(T, scene, at, RW, 18);
      const sea = new T.Mesh(new T.PlaneGeometry(500, 140), lam(T, 0x1864ab)); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.3, 140); scene.add(sea);
    }
  };

  // ---------- 道の見た目 ----------
  const roadTex = {
    asphalt: (T, base) => { const t = noiseTex(T, base || "#3a3d46", ["#555a66", "#2a2c33", "#6c7080"], 5); t.repeat.set(2, 10); return new T.MeshLambertMaterial({ map: t }); },
    dirt: (T) => { const t = noiseTex(T, "#9a6a3a", ["#7a5230", "#b88a58", "#5c3d21", "#c4a26a"], 7); t.repeat.set(2, 14); return new T.MeshLambertMaterial({ map: t }); },
    water: (T) => { const t = waveTex(T, "#1c6fb8", "#d0ebff"); t.repeat.set(2, 18); return new T.MeshLambertMaterial({ map: t, color: 0xffffff }); },
    snow: (T) => { const t = noiseTex(T, "#eef3fa", ["#d0dcec", "#ffffff", "#c5d4e8"], 9); t.repeat.set(2, 12); return new T.MeshLambertMaterial({ map: t }); },
    space: (T) => { const t = KIT.canvasTex(T, 64, 64, (g, w, h) => { g.fillStyle = "#1f2450"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5c7cfa"; g.globalAlpha = 0.7; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); g.fillStyle = "#74c0fc"; g.globalAlpha = 0.9; g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h); }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 30); return new T.MeshBasicMaterial({ map: t }); },
    turf: (T) => { const t = stripeTex(T, "#40c057", "#37b24d", 2); t.repeat.set(1, 20); return new T.MeshLambertMaterial({ map: t }); }
  };
  const noProp = () => null;
  const tOk = (t) => t > 0.04 && t < 0.96;

  // 水のコース：水面の模様を流す
  function waterSetup(ctx) {
    const map = ctx.st.roadMat && ctx.st.roadMat.map;
    return { step(dt) { if (map) { map.offset.y -= dt * 0.35; map.offset.x = Math.sin(ctx.st.t * 0.4) * 0.05; } } };
  }
  // 雪が降る（カメラのまわりだけ）
  function snowfall(ctx, n) {
    const { T, scene, camera } = ctx;
    const pts = particles(T, scene, n || 380, 60, 0xffffff, 0.22, 0.9);
    const pos = pts.geometry.attributes.position;
    return (dt) => {
      pts.position.set(camera.position.x, camera.position.y - 12, camera.position.z);
      for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) - dt * (2.2 + (i % 5) * 0.4); if (y < 0) y += 30; pos.setY(i, y); pos.setX(i, pos.getX(i) + Math.sin(ctx.st.t + i) * dt * 0.3); }
      pos.needsUpdate = true;
    };
  }
  // 風車（ゆっくり回る）
  function windmill(ctx, t, off) {
    const { T, scene, placeOn } = ctx;
    const a = placeOn(t, off), g = new T.Group();
    cyl(T, g, 1.2, 2.0, 9, 8, 0xf8f9fa, 0, 4.5, 0); cone(T, g, 1.6, 2.0, 8, 0xc92a2a, 0, 10, 0);
    const hub = new T.Group(); hub.position.set(0, 8.4, 1.9); g.add(hub);
    for (let k = 0; k < 4; k++) { const b = box(T, hub, 0.9, 5.2, 0.08, 0xfff4e6, 0, 2.7, 0); const arm = new T.Group(); arm.rotation.z = k * Math.PI / 2; arm.add(b); hub.add(arm); }
    g.position.set(a.x, a.y, a.z); g.rotation.y = a.yaw + Math.PI / 2; scene.add(g);
    return (dt) => { hub.rotation.z += dt * 0.9; };
  }
  const lat = (ctx, r, t) => { const a = ctx.placeOn(t, 0); return (r.x - a.x) * a.side.x + (r.z - a.z) * a.side.z; };
  // CPU：ある横位置をめざしてハンドルを切る
  function steerTo(ctx, r, ahead, off) {
    const a = ctx.placeOn(r.t + ahead / ctx.curveLen, off);
    let err = Math.atan2(a.x - r.x, a.z - r.z) - r.yaw;
    while (err > Math.PI) err -= Math.PI * 2; while (err < -Math.PI) err += Math.PI * 2;
    r.steer = Math.max(-1, Math.min(1, err * 1.8));
    return err;
  }

  // ---------- スキー大回転：旗門 ----------
  function skiSetup(ctx) {
    const { T, scene, RW, placeOn } = ctx;
    const gates = [];
    for (let t = 0.08, k = 0; t < 0.94; t += 0.052, k++) gates.push({ t, off: (k % 2 ? 1 : -1) * RW * 0.38, col: k % 2 ? 0xe03131 : 0x1c7ed6 });
    // 旗門はまとめて描く（InstancedMesh）
    const poles = [], flags = [], fcol = [];
    gates.forEach((g) => {
      [-2.4, 2.4].forEach((d) => {
        const a = placeOn(g.t, g.off + d);
        poles.push({ x: a.x, y: a.y + 0.95, z: a.z });
        flags.push({ x: a.x - a.side.x * Math.sign(d) * 0.45, y: a.y + 1.45, z: a.z - a.side.z * Math.sign(d) * 0.45, ry: a.yaw });
        fcol.push(g.col);
      });
    });
    inst(T, scene, G(T, "gpole", () => new T.CylinderGeometry(0.05, 0.05, 1.9, 5)), lam(T, 0xffffff), poles);
    inst(T, scene, G(T, "gflag", () => new T.BoxGeometry(0.9, 0.7, 0.03)), new T.MeshBasicMaterial({ color: 0xffffff }), flags, fcol);
    ctx.st.gates = gates;
    let pass = 0, miss = 0;
    return { gates, step() {}, onRacer(r) {
      if (r.gi == null) r.gi = 0;
      const g = gates[r.gi]; if (!g || r.fin) return;
      if (r.t >= g.t) {
        r.gi++;
        const ok = Math.abs(lat(ctx, r, g.t) - g.off) < 2.7;
        if (!ok) { r.pen += 2; if (r.me) { miss++; ctx.say("旗門ミス！ +2秒"); ctx.FX.SFX.hit(); ctx.overlay.flash("#fa5252", 0.2); } }
        else if (r.me) { pass++; if (pass % 3 === 0) ctx.say("旗門クリア " + pass + "／" + gates.length); ctx.FX.SFX.itemGet(); }
      }
    }, note() { return "旗門 " + pass + "／" + gates.length + (miss ? "（ミス " + miss + "）" : "（ノーミス！）"); } };
  }

  // ---------- ハイウェイ：よける車 ----------
  function highwaySetup(ctx) {
    const { T, scene, RW, placeOn, curveLen, racers, me } = ctx;
    const lanes = [-RW * 2 / 3, 0, RW * 2 / 3];
    const kinds = ["car", "car", "van", "truck", "car"], cols = [0xf8f9fa, 0x495057, 0x1971c2, 0xc92a2a, 0xfab005, 0x2b8a3e];
    const cars = [];
    for (let i = 0; i < 12; i++) {
      const m = buildTraffic(T, kinds[i % kinds.length], cols[i % cols.length]); scene.add(m);
      cars.push({ m, t: 0.075 + i * 0.058, lane: lanes[i % 3], v: 11 + (i % 4) * 1.6, len: kinds[i % kinds.length] === "truck" ? 3.2 : 2.3 });
    }
    let near = 0;
    function place(c) { const a = placeOn(c.t, c.lane); c.x = a.x; c.z = a.z; c.m.position.set(a.x, a.y, a.z); c.m.rotation.y = a.yaw; }
    cars.forEach(place);
    const hooks = { cars, lanes, step(dt) {
      const go = ctx.st.go && !ctx.st.done;
      cars.forEach((c) => {
        if (go) c.t += c.v * dt / curveLen;
        // 置いていかれた車は、プレイヤーの前に出し直す（車の数を少なくして軽く）
        if (c.t < me.t - 35 / curveLen && me.t < 0.9) { c.t = me.t + (75 + Math.random() * 80) / curveLen; c.lane = lanes[Math.floor(Math.random() * 3)]; }
        if (c.t > 0.985) { c.m.visible = false; return; }
        c.m.visible = true; place(c);
        racers.forEach((r) => {
          if (r.fin) return;
          const dx = r.x - c.x, dz = r.z - c.z, f = Math.sin(c.m.rotation.y), g = Math.cos(c.m.rotation.y);
          const al = dx * f + dz * g, la = Math.abs(dx * g - dz * f);
          if (Math.abs(al) < c.len + 0.9 && la < 1.7) {
            if (r.shield <= 0 && r.hit <= 0.05) { r.hit = 0.6; r.speed = Math.min(r.speed, c.v * 0.7); r.slip += dx * g - dz * f > 0 ? 0.5 : -0.5; if (r.me) { ctx.shake.add(10); ctx.FX.SFX.crash(); ctx.fx3.burst(new T.Vector3(r.x, r.y + 0.6, r.z), ["#fff", "#ffd43b", "#adb5bd"], 14, 6, 0.45); ctx.say("ぶつかった！"); } }
            c.hitBy = c.hitBy || new Set(); c.hitBy.add(r);
          } else if (Math.abs(al) < c.len + 1 && la < 3.4 && r.speed > c.v + 4) {
            c.close = c.close || new Set(); c.close.add(r);
          } else if (al > c.len + 1 && c.close && c.close.has(r)) {
            c.close.delete(r);
            if (!(c.hitBy && c.hitBy.has(r))) { r.nitro = Math.min(1, r.nitro + 0.16); if (r.me) { near++; ctx.say("ニアミス！ ニトロ +"); ctx.FX.SFX.itemGet(); ctx.overlay.flash("#63e6be", 0.15); } }
          }
          if (al > c.len + 6 && c.hitBy) c.hitBy.delete(r);
        });
      });
    }, near: () => near };
    return hooks;
  }
  function highwayCpu(ctx, r) {
    const h = ctx.st.hooks; if (!h || !h.cars) return;
    if (r.lane == null) r.lane = h.lanes[(r.idx + 1) % 3];
    const blocked = (ln) => h.cars.some((c) => c.m.visible && c.lane === ln && c.t > r.t && (c.t - r.t) * ctx.curveLen < 26);
    if (blocked(r.lane) && (r.laneCool || 0) <= 0) {
      const opts = h.lanes.filter((ln) => Math.abs(ln - r.lane) < ctx.RW * 0.7 && ln !== r.lane && !blocked(ln));
      if (opts.length) { r.lane = opts[Math.floor(Math.random() * opts.length)]; r.laneCool = 1.2; }
    }
    r.laneCool = (r.laneCool || 0) - 1 / 60;
    steerTo(ctx, r, 13, r.lane);
  }

  // ---------- 12本の登録 ----------
  const defs = [
    { id: "bikerace", e: "🏍️", n: "バイクレース", c: "#c92a2a", vehicle: "bike", theme: "asphalt",
      d: "海ぞいの街を3Dのバイクで走るよ。カーブでは体をたおしてドリフト、ミニターボで加速。2周か3周をえらべる。",
      race: { courseName: "ベイサイドシティ", points: COURSES.city, build: buildBike, roadMat: (T) => roadTex.asphalt(T), prop: noProp, stands: false, dress: DRESS.city,
        signs: [[0.14, "ベイサイド\nGP"], [0.42, "急カーブ\n注意"], [0.7, "ファイト！"], [0.9, "ゴールまで\nもう少し"]],
        hazards: [{ t: 0.3, off: 0.4, kind: "cone" }, { t: 0.31, off: -0.4, kind: "cone" }, { t: 0.62, off: 0, kind: "pad" }, { t: 0.83, off: 0.5, kind: "cone" }], grid: (i) => ({ lane: (i % 2 ? 1 : -1) * 1.8, back: i * 1.6 }) } },
    { id: "rally", e: "🚙", n: "ダートラリー", c: "#a0522d", vehicle: "rally", theme: "dirt",
      d: "森の土の道を3Dのラリーカーで走るよ。ジャンプ台・どろ・岩に気をつけて。すべる道でドリフトを決めよう。",
      race: { courseName: "フォレストラリー", points: COURSES.rally, build: buildCar("rally"), roadMat: (T) => roadTex.dirt(T), prop: noProp, stands: false, dress: DRESS.rally, curbs: false, midLine: false,
        theme: { sky: 0xcfe3f5, fog: 0xdfe8ee, grass: 0x6a8f3a, grass2: 0x8a6a3a }, hemiGround: 0x5c4a32,
        ramps: [0.2, 0.62], rampCol: 0x8b5a2b, landBoost: 0.45, spray: ["#8b5a2b", "#c4a26a", "#6b4423"], mudCol: ["#6b4423", "#8b5a2b"],
        hazards: [{ t: 0.12, off: 0.3, kind: "mud" }, { t: 0.33, off: -0.5, kind: "rock" }, { t: 0.45, off: 0.2, kind: "mud" }, { t: 0.52, off: 0.6, kind: "rock" }, { t: 0.74, off: -0.3, kind: "mud" }, { t: 0.86, off: 0.4, kind: "hay" }],
        signs: [[0.16, "ジャンプ\nあり"], [0.43, "どろに\n注意"], [0.7, "ラリー\nがんばれ"], [0.9, "ゴール\nちかい"]] } },
    { id: "boatrace", e: "🚤", n: "ボートレース", c: "#1971c2", vehicle: "boat", theme: "water",
      d: "湖のコースを3Dのボートで走るよ。波でゆれて、流れで横にながされる。ブイの内側を回って、青いダッシュ板で加速。",
      race: { courseName: "ほしの湖", points: COURSES.lake, build: buildBoat, roadMat: (T) => roadTex.water(T), prop: noProp, stands: false, flags: false, dress: DRESS.water, curbs: false, midLine: false,
        actionLabel: "ターン", current: 1.3, bob: 0.07, spray: ["#ffffff", "#d0ebff", "#a5d8ff"], setup: waterSetup, hemiGround: 0x1864ab,
        hazards: [{ t: 0.15, off: 0, kind: "pad" }, { t: 0.3, off: 0.45, kind: "buoy" }, { t: 0.48, off: -0.45, kind: "buoy" }, { t: 0.56, off: 0.2, kind: "pad" }, { t: 0.72, off: 0.5, kind: "buoy" }, { t: 0.88, off: -0.2, kind: "pad" }],
        signs: [[0.2, "ほしの湖\nレース"], [0.5, "ブイに\n注意"], [0.8, "ゴールは\nこの先"]] } },
    { id: "jetski", e: "🌊", n: "水上バイク", c: "#0c8599", vehicle: "jetski", theme: "water",
      d: "入り江を3Dの水上バイクで走るよ。波のジャンプ台で大ジャンプ、着水でミニ加速。岩にぶつからないように。",
      race: { courseName: "サンセットベイ", points: COURSES.bay, build: buildJetski, roadMat: (T) => roadTex.water(T), prop: noProp, stands: false, flags: false, dress: DRESS.water, curbs: false, midLine: false,
        theme: { sky: 0x8fd3f4, fog: 0xb8e2f2, grass: 0x15aabf, grass2: 0x0c8599 }, current: 0.9, bob: 0.06, spray: ["#ffffff", "#c5f6fa", "#99e9f2"], setup: waterSetup,
        ramps: [0.15, 0.52, 0.8], rampCol: 0x22b8cf, landBoost: 0.55,
        hazards: [{ t: 0.28, off: 0.5, kind: "rock" }, { t: 0.4, off: -0.4, kind: "rock" }, { t: 0.66, off: 0.3, kind: "buoy" }, { t: 0.7, off: -0.2, kind: "pad" }, { t: 0.92, off: 0.4, kind: "rock" }],
        signs: [[0.12, "ジャンプ\nOK"], [0.45, "岩に\n注意"], [0.75, "サンセット\nベイ"]] } },
    { id: "skirace", e: "⛷️", n: "スキー大回転", c: "#4dabf7", vehicle: "ski", theme: "snow",
      d: "雪山を3Dのスキーで一気にすべりおりるよ。赤と青の旗門の間を通ろう（通らないと+2秒）。まっすぐな所はクラウチで加速。",
      race: { sprint: true, courseName: "ほしの山 大回転", points: COURSES.slope, roadW: 9, racers: 6, build: buildSkier, roadMat: (T) => roadTex.snow(T), prop: noProp, stands: false, flags: false, curbs: false, midLine: false, items: false, dress: DRESS.snow, groundW: 60,
        action: "tuck", actionLabel: "クラウチ", spray: ["#ffffff", "#e7f5ff"], quiet: true, lastText: "ラストの旗門！",
        grid: (i) => ({ lane: ((i % 3) - 1) * 3.8, back: Math.floor(i / 3) * 3.2 }),
        setup(ctx) { const h = skiSetup(ctx), sf = snowfall(ctx, 300); return { step(dt) { sf(dt); }, h }; },
        onRacer(ctx, r) { ctx.st.hooks.h.onRacer(r); },
        cpu(ctx, r) { const g = ctx.st.gates[r.gi || 0]; if (g) { const d = (g.t - r.t) * ctx.curveLen; const err = steerTo(ctx, r, Math.max(6, Math.min(16, d)), g.off); r.wantDrift = Math.abs(err) < 0.1; } },
        resultNote: (ctx) => ctx.st.hooks.h.note(),
        signs: [[0.05, "大回転\nスタート"], [0.5, "旗門を\nとおろう"], [0.85, "ゴールは\nもうすぐ"]] } },
    { id: "snowboard", e: "🏂", n: "スノーボードクロス", c: "#5c7cfa", vehicle: "snowboard", theme: "snow",
      d: "6人いっしょに雪のコースを3Dのスノボでくだるよ。キッカーで大ジャンプ、カーブではカービングでターボ。",
      race: { sprint: true, courseName: "ほしの山 クロス", points: COURSES.cross, roadW: 8, racers: 6, build: buildBoarder, roadMat: (T) => roadTex.snow(T), prop: noProp, stands: false, flags: false, curbs: false, midLine: false, dress: DRESS.snow, groundW: 60,
        actionLabel: "カービング", ramps: [0.18, 0.36, 0.55, 0.74], rampCol: 0xdbe4ff, landBoost: 0.6, spray: ["#ffffff", "#e7f5ff"], quiet: true, boxes: [0.27, 0.46, 0.65],
        hazards: [{ t: 0.12, off: 0.5, kind: "snowman" }, { t: 0.43, off: -0.5, kind: "snowman" }, { t: 0.62, off: 0.1, kind: "pad" }, { t: 0.83, off: -0.4, kind: "snowman" }],
        grid: (i) => ({ lane: ((i % 3) - 1) * 3.4, back: Math.floor(i / 3) * 3 }),
        setup(ctx) { const sf = snowfall(ctx, 300); return { step: sf }; },
        signs: [[0.06, "クロス\nスタート"], [0.34, "キッカー"], [0.72, "ラスト\nキッカー"]] } },
    { id: "sledrace", e: "🛷", n: "犬ぞりレース", c: "#868e96", vehicle: "sled", theme: "snow",
      d: "雪の森を3Dの犬ぞりで走るよ。4ひきの犬が走る！ 「かけ声」でスタミナを使ってスパート。丸太と雪だるまに注意。",
      race: { courseName: "ほしの森 雪道", points: COURSES.forest, build: buildSled, roadMat: (T) => roadTex.snow(T), prop: noProp, stands: false, flags: false, curbs: false, midLine: false, dress: DRESS.forestSnow,
        theme: { sky: 0xc8d8f0, fog: 0xe0e8f5, fogFar: 110 }, action: "spurt", actionLabel: "かけ声", stamUse: 0.28, stamGain: 0.08, spray: ["#ffffff", "#e7f5ff"], quiet: true,
        hazards: [{ t: 0.22, off: 0.45, kind: "log" }, { t: 0.38, off: -0.4, kind: "snowman" }, { t: 0.58, off: 0.3, kind: "log" }, { t: 0.76, off: -0.45, kind: "snowman" }],
        setup(ctx) { const sf = snowfall(ctx, 420); return { step: sf }; },
        signs: [[0.15, "犬ぞり\nコース"], [0.5, "丸太に\n注意"], [0.85, "ゴールまで\nがんばれ"]] } },
    { id: "spacerace", e: "🚀", n: "スペースレース", c: "#5f3dc4", vehicle: "space", theme: "space",
      d: "宇宙にうかぶ光のコースを3Dのロケットで走るよ。上り下りのあるコースで、光のリングをくぐると加速。",
      race: { courseName: "ギャラクシーリング", points: COURSES.space, build: buildRocket, roadMat: (T) => roadTex.space(T), prop: noProp, stands: false, flags: false, ground: false, dress: DRESS.space, far: 400,
        theme: { fogNear: 80, fogFar: 320 }, hemiSky: 0x9ab0ff, hemiGround: 0x2b2155, hemi: 1.1, spray: ["#74c0fc", "#d0bfff", "#ffffff"],
        hazards: [{ t: 0.1, off: 0, kind: "ring" }, { t: 0.3, off: 0.3, kind: "ring" }, { t: 0.45, off: -0.4, kind: "rock" }, { t: 0.55, off: -0.2, kind: "ring" }, { t: 0.7, off: 0.5, kind: "rock" }, { t: 0.82, off: 0, kind: "ring" }],
        signs: [[0.2, "ギャラクシー\nリング"], [0.6, "リングで\n加速"]] } },
    { id: "horserace", e: "🏇", n: "競馬ダービー", c: "#2b8a3e", vehicle: "horse", theme: "turf",
      d: "芝のオーバルを3Dの馬で走るよ。足が動いて本物みたい。「ムチ」でスタミナを使って追いこみ。スタミナ配分がコツ。",
      race: { courseName: "ほしのダービー", points: COURSES.oval, roadW: 8, build: buildHorse, roadMat: (T) => roadTex.turf(T), prop: noProp, stands: false, flags: false, curbs: false, midLine: false, items: false, dress: DRESS.turf,
        action: "spurt", actionLabel: "ムチ", stamUse: 0.3, stamGain: 0.06, spray: ["#5c4a32", "#8ce99a"], quiet: true, lastText: "最後の直線！",
        grid: (i) => ({ lane: -RW_H + 0.9 + i * 1.75, back: 0 }),
        signs: [[0.3, "ほしの\nダービー"], [0.75, "最後の\nコーナー"]] } },
    { id: "cycling", e: "🚴", n: "ロードバイク", c: "#f08c00", vehicle: "cycle", theme: "asphalt",
      d: "いなかの山道を3Dのロードバイクで走るよ。ペダルをこいで、前の人のうしろでスリップストリーム。「ダンシング」でスパート。",
      race: { courseName: "ほしの丘 ロード", points: COURSES.hills, build: buildCycle, roadMat: (T) => roadTex.asphalt(T, "#4a4d56"), prop: noProp, stands: false, dress: DRESS.country, curbs: false, items: false,
        theme: { sky: 0xa5d8ff, fog: 0xc5e3f6, grass: 0x74b816, grass2: 0x5c940d, roadLine: 0xffffff }, action: "spurt", actionLabel: "ダンシング", draft: true, stamUse: 0.24, stamGain: 0.07, quiet: true,
        grid: (i) => ({ lane: ((i % 4) - 1.5) * 1.6, back: Math.floor(i / 4) * 2.4 }),
        setup(ctx) { const w1 = windmill(ctx, 0.35, 26), w2 = windmill(ctx, 0.8, -30); return { step(dt) { w1(dt); w2(dt); } }; } } },
    { id: "highway", e: "🚗", n: "ハイウェイラッシュ", c: "#546e7a", vehicle: "highway", theme: "asphalt",
      d: "3車線の高速道路を3Dで走るよ。トラックや車をよけて、ぎりぎりですりぬける（ニアミス）とニトロがたまる。",
      race: { sprint: true, courseName: "ほしのハイウェイ", points: COURSES.highway, roadW: 10.8, racers: 6, build: buildCar("highway"), roadMat: (T) => roadTex.asphalt(T, "#34373f"), prop: noProp, stands: false, flags: false, curbs: false, midLine: false, items: false, dress: DRESS.highway,
        theme: { sky: 0xffc9a8, fog: 0xf5c2a8, fogNear: 60, fogFar: 200, grass: 0x5c7a4a }, sunCol: 0xffd8a8, action: "nitro", actionLabel: "ニトロ", lastText: "ラストスパート！ ニトロ全開",
        grid: (i) => ({ lane: [-7.2, 0, 7.2][i % 3], back: Math.floor(i / 3) * 6 }),
        setup: highwaySetup, cpu: highwayCpu,
        onRacer(ctx, r, dt, go) { if (go && !r.fin) r.nitro = Math.min(1, r.nitro + dt * 0.02); },
        resultNote: (ctx) => "ニアミス " + ctx.st.hooks.near() + "回",
        signs: [[0.1, "ハイウェイ\nスタート"], [0.5, "トラックに\n注意"]] } },
    { id: "racing", e: "🏎️", n: "ターボドリフト", c: "#e8590c", vehicle: "drift", theme: "asphalt",
      d: "夕焼けの港のコースを3Dのレースカーで走るよ。ヘアピンで長くドリフトするとオレンジのターボ。タイヤの壁に注意。",
      race: { courseName: "ハーバーナイト", points: COURSES.port, build: buildCar("drift"), roadMat: (T) => roadTex.asphalt(T, "#2e3038"), prop: noProp, stands: [0.5], dress: DRESS.port,
        theme: { sky: 0xff9e7a, fog: 0xf0a08a, fogNear: 50, fogFar: 170, grass: 0x6c757d, grass2: 0x495057, roadLine: 0xffffff }, sunCol: 0xffb38a, hemiSky: 0xffd8c0,
        hazards: [{ t: 0.4, off: 0, kind: "pad" }, { t: 0.78, off: 0.3, kind: "pad" }],
        signs: [[0.18, "ヘアピン\n注意"], [0.46, "ハーバー\nナイト"], [0.86, "ターボで\nゴールへ"]] } }
  ];
  const RW_H = 8;
  defs.forEach((d) => { d.race.hazardMesh = hazardMesh; R3.register(d); });
})();
