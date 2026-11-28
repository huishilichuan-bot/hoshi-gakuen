/* ほしの学園 — 3Dミニゲームの共通キット（第8回〜）。Three.js は HMRace3d と同じものを初回だけ読み込む。オリジナル。 */
(function () {
  "use strict";
  const H = window.HMGames, R3 = window.HMRace3d;
  if (!H || !R3 || !R3.kit) return;
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
    const tube = new T.Mesh(new T.TubeGeometry(c2, n * 2, rad, 5, closed), lam(T, col));
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


  // ---------- 部品をまとめて軽くする（同じグループの部品を1つのメッシュに。色は頂点カラーで持つ） ----------
  const VCM = {};
  function vcMat(T) { return VCM.m || (VCM.m = new T.MeshLambertMaterial({ vertexColors: true })); }
  function bakeable(c) { return c.isMesh && !c.isInstancedMesh && !c.isSkinnedMesh && c.material && !Array.isArray(c.material) && !c.material.map && !c.material.transparent && c.material.color && !c.material.vertexColors && !c.material.isMeshBasicMaterial && !c.userData.keep; }
  function bake(T, group, deep, keep) {
    group.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(group.matrixWorld).invert();
    const list = [];
    const visit = (o) => { o.children.slice().forEach((c) => { if (keep && keep.has(c)) return; if (bakeable(c)) list.push(c); else if (deep && !c.isMesh && !c.isPoints && c.children.length) visit(c); }); };
    visit(group);
    if (list.length < 2) return null;
    let n = 0;
    const parts = list.map((m) => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, m.matrixWorld)); if (!g.attributes.normal) g.computeVertexNormals(); n += g.attributes.position.count; return [g, m.material.color]; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    parts.forEach(([g, c]) => { const cnt = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; } o += cnt; g.dispose(); });
    list.forEach((m) => m.parent.remove(m));
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("normal", new T.BufferAttribute(nor, 3)); geo.setAttribute("color", new T.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    const mesh = new T.Mesh(geo, vcMat(T)); group.add(mesh);
    return mesh;
  }
  // 木の全部のグループで、すぐ下の部品をまとめる（動くグループはそのまま動く）
  function bakeTree(T, root) { const groups = []; root.traverse((o) => { if (!o.isMesh && o.children && o.children.length) groups.push(o); }); groups.forEach((g) => bake(T, g, false)); return root; }

  // ---------- 人（スポーツ選手）：身長およそ1.7。腕はかた→ひじ、脚はつけ根→ひざ で曲がる ----------
  function athlete(T, parent, opt) {
    opt = opt || {};
    const skin = opt.skin || 0xf3c29c, shirt = opt.shirt || 0x4dabf7, pants = opt.pants || 0x343a40, hair = opt.hair || 0x2b2118;
    const g = new T.Group(); parent.add(g);
    const hip = new T.Group(); hip.position.y = 0.92; g.add(hip);
    box(T, hip, 0.34, 0.18, 0.22, pants, 0, 0, 0);
    const torso = new T.Group(); torso.position.y = 0.08; hip.add(torso);
    box(T, torso, 0.38, 0.5, 0.24, shirt, 0, 0.28, 0);
    if (opt.num != null) { const n = new T.Mesh(G(T, "athNum", () => new T.PlaneGeometry(0.2, 0.2)), new T.MeshBasicMaterial({ map: KIT.plateTex(T, opt.num, "#ffffff"), transparent: true })); n.position.set(0, 0.32, -0.125); n.rotation.y = Math.PI; torso.add(n); }
    if (opt.stripe) box(T, torso, 0.39, 0.06, 0.25, opt.stripe, 0, 0.44, 0);
    cyl(T, torso, 0.06, 0.07, 0.08, 8, skin, 0, 0.56, 0);
    const head = new T.Group(); head.position.set(0, 0.7, 0); torso.add(head);
    sph(T, head, 0.13, skin, 0, 0, 0, null, 12, 10);
    // かみ：上と後ろ
    const hr = sph(T, head, 0.135, hair, 0, 0.035, -0.015, null, 12, 8); hr.scale.set(1, 0.85, 1);
    if (opt.cap) { const c = sph(T, head, 0.14, opt.cap, 0, 0.05, 0, null, 12, 8); c.scale.set(1, 0.7, 1); box(T, head, 0.2, 0.02, 0.12, opt.cap, 0, 0.04, 0.15); }
    if (opt.helmet) { const c = sph(T, head, 0.155, opt.helmet, 0, 0.03, -0.01, null, 14, 10); c.scale.set(1, 0.92, 1.02); box(T, head, 0.22, 0.02, 0.1, opt.helmet, 0, 0.0, 0.16); }
    if (opt.band) cyl(T, head, 0.137, 0.137, 0.04, 12, opt.band, 0, 0.06, 0);
    // 顔（目と口）
    [-0.045, 0.045].forEach((x) => box(T, head, 0.025, 0.035, 0.01, 0x1c1a14, x, 0.01, 0.125));
    box(T, head, 0.05, 0.012, 0.01, 0xc0504d, 0, -0.06, 0.122);
    const mkArm = (s) => {
      const sh = new T.Group(); sh.position.set(s * 0.24, 0.48, 0); torso.add(sh);
      sph(T, sh, 0.065, shirt, 0, 0, 0);
      box(T, sh, 0.09, 0.28, 0.09, opt.sleeve === false ? skin : shirt, 0, -0.14, 0);
      const el = new T.Group(); el.position.y = -0.28; sh.add(el);
      box(T, el, 0.08, 0.26, 0.08, skin, 0, -0.13, 0);
      const hand = new T.Group(); hand.position.y = -0.28; el.add(hand);
      sph(T, hand, 0.05, opt.glove || skin, 0, 0, 0);
      sh.userData.el = el; sh.userData.hand = hand; return sh;
    };
    const mkLeg = (s) => {
      const l = new T.Group(); l.position.set(s * 0.1, -0.04, 0); hip.add(l);
      box(T, l, 0.13, 0.42, 0.14, pants, 0, -0.21, 0);
      const kn = new T.Group(); kn.position.y = -0.42; l.add(kn);
      box(T, kn, 0.11, 0.4, 0.12, opt.sock || skin, 0, -0.2, 0);
      box(T, kn, 0.13, 0.08, 0.26, opt.shoe || 0xf8f9fa, 0, -0.42, 0.05);
      l.userData.knee = kn; return l;
    };
    const armL = mkArm(-1), armR = mkArm(1), legL = mkLeg(-1), legR = mkLeg(1);
    const shadow = softShadow(T, g, 0.8, 0.8);
    const a = { g, hip, torso, head, armL, armR, legL, legR, shadow };
    if (opt.pose) opt.pose(a);
    if (opt.lod) { bake(T, torso, true); bakeTree(T, hip); }
    else if (!opt.noBake) bakeTree(T, g);
    return a;
  }
  // 走る・歩くアニメ（ph は位相、amp は大きさ 0..1）
  function runPose(a, ph, amp) {
    const s = Math.sin(ph) * amp;
    a.legL.rotation.x = s * 0.9; a.legR.rotation.x = -s * 0.9;
    a.legL.userData.knee.rotation.x = Math.max(0, -Math.sin(ph + 0.6)) * amp * 1.1; a.legR.userData.knee.rotation.x = Math.max(0, Math.sin(ph + 0.6)) * amp * 1.1;
    a.armL.rotation.x = -s * 0.8; a.armR.rotation.x = s * 0.8;
    a.armL.userData.el.rotation.x = -0.5 * amp; a.armR.userData.el.rotation.x = -0.5 * amp;
    a.hip.position.y = 0.92 + Math.abs(Math.cos(ph)) * 0.04 * amp;
  }
  // 観客席（ひな壇＋色つきの観客、まとめて描く）
  function crowdStand(T, scene, x, z, ry, w, rows, seed) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    for (let r = 0; r < rows; r++) box(T, g, w, 0.5, 0.9, 0xced4da, 0, 0.25 + r * 0.5, -r * 0.9);
    const ppl = [], heads = [], rr = R01(seed || 5);
    for (let r = 0; r < rows; r++) for (let x2 = -w / 2 + 0.4; x2 < w / 2 - 0.3; x2 += 0.55) { if (rr() < 0.12) continue; ppl.push({ x: x2 + (rr() - 0.5) * 0.1, y: 0.78 + r * 0.5, z: -r * 0.9 }); heads.push({ x: x2, y: 1.1 + r * 0.5, z: -r * 0.9 }); }
    const body = inst(T, g, G(T, "crowdB", () => new T.BoxGeometry(0.34, 0.5, 0.26)), new T.MeshLambertMaterial({ color: 0xffffff }), ppl, [0xe03131, 0x4dabf7, 0xffe066, 0x51cf66, 0xcc5de8, 0xff922b, 0xffffff, 0x20c997]);
    inst(T, g, G(T, "crowdH", () => new T.SphereGeometry(0.13, 6, 5)), lam(T, 0xf3c29c), heads);
    g.userData.ppl = ppl; g.userData.body = body;
    return g;
  }
  // 観客がゆれる（喜ぶとジャンプ）
  function cheerCrowd(T, g, t, joy) {
    const m = g.userData.body, ppl = g.userData.ppl, d = new T.Object3D();
    if (!m) return;
    for (let i = 0; i < ppl.length; i += 1) {
      const o = ppl[i]; const j = joy > 0 ? Math.max(0, Math.sin(t * 12 + i * 1.7)) * 0.18 * joy : Math.sin(t * 2 + i) * 0.015;
      d.position.set(o.x, o.y + j, o.z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }
  function lightTower(T, scene, x, z, h) {
    const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    cyl(T, g, 0.25, 0.4, h, 6, 0x868e96, 0, h / 2, 0);
    box(T, g, 3.2, 1.6, 0.3, 0x495057, 0, h + 0.6, 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) box(T, g, 0.6, 0.55, 0.05, 0, -1.15 + i * 0.77, h + 0.25 + j * 0.7, 0.17, bas(T, 0xfff9db));
    g.lookAt(0, h, 0);
    return g;
  }
  function textTex(T, text, opt) {
    opt = opt || {};
    return KIT.canvasTex(T, opt.w || 256, opt.h || 128, (g, w, h) => {
      g.fillStyle = opt.bg || "#1b1640"; g.fillRect(0, 0, w, h);
      if (opt.border) { g.strokeStyle = opt.border; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); }
      g.fillStyle = opt.fg || "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      const lines = String(text).split("\n"), fs = opt.fs || Math.min(h / (lines.length + 0.4), 64);
      g.font = "900 " + fs + "px 'Hiragino Sans','Noto Sans JP',sans-serif";
      lines.forEach((ln, i) => g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.1));
    });
  }
  // ---------- 音（オリジナルの効果音） ----------
  function sfx() {
    const F = window.HMFx;
    return {
      bat: () => { F.noise(0.06, 0.16, 2500); F.tone(1400, 0.05, "square", 0.06, 500); },
      pop: () => { F.tone(900, 0.04, "sine", 0.08, 600); },
      bounce: () => { F.tone(520, 0.05, "sine", 0.07, 300); },
      swish: () => { F.noise(0.16, 0.07, 3000); F.tone(1100, 0.12, "sine", 0.04, 1600); },
      rim: () => { F.tone(330, 0.12, "triangle", 0.08, 300); F.tone(660, 0.08, "triangle", 0.04); },
      pins: () => { for (let i = 0; i < 5; i++) F.tone(300 + Math.random() * 500, 0.08, "square", 0.05, 120, i * 0.03); F.noise(0.3, 0.12, 900); },
      roll: () => F.noise(0.5, 0.05, 150),
      throwS: () => { F.noise(0.12, 0.06, 1200); },
      boom: () => { F.noise(0.35, 0.18, 120); F.tone(110, 0.3, "sawtooth", 0.08, 40); },
      shoot: () => { F.tone(880, 0.06, "square", 0.05, 440); },
      cheer: () => { F.noise(0.9, 0.06, 1500); },
      whistle: () => { F.tone(2100, 0.25, "sine", 0.06, 2300); },
      ui: () => F.tone(760, 0.05, "triangle", 0.06)
    };
  }

  // ---------- ゲームの外側（画面・ボタン・ループ・結果） ----------
  const SKILL = { easy: 0.8, normal: 0.92, hard: 1.0, ultra: 1.08 };
  function start(def, diff, prev) {
    const GF = window.GF;
    diff = diff || "normal";
    let cancelled = false, st = null;
    const body = GF.openLayer(def.title || def.n, () => { cancelled = true; if (st) stop(st); });
    body.innerHTML = '<div class="r3d-wait">' + (def.wait || "じゅんびしているよ…") + "</div>";
    R3.loadThree().then((T) => { if (!cancelled) { st = boot(T, body, def, diff, prev); } }).catch((e) => { console.error(e); if (!cancelled && prev) prev(diff); });
  }
  function stop(st) {
    if (!st || st.dead) return;
    st.dead = true; cancelAnimationFrame(st.raf);
    try { if (st.game && st.game.dispose) st.game.dispose(); } catch (e) {}
    if (st.fx3) st.fx3.clear();
    (st.unbind || []).forEach((f) => { try { f(); } catch (e) {} });
    if (st.renderer) { try { st.renderer.dispose(); st.renderer.forceContextLoss(); } catch (e) {} }
    if (st.body) st.body.innerHTML = "";
  }
  function boot(T, body, def, diff, prev) {
    const FX = window.HMFx, GF = window.GF;
    const st = { dead: false, unbind: [], body, t: 0, go: false, done: false, id: def.id };
    window.__G3D = st;
    const btns = def.buttons || [];
    const arrows = def.arrows || "lr";
    let arrowHtml = "";
    if (arrows === "lr") arrowHtml = '<div class="r3d-arrows"><button type="button" class="r3d-btn arrow" data-hold="left" aria-label="左">◀</button><button type="button" class="r3d-btn arrow" data-hold="right" aria-label="右">▶</button></div>';
    else if (arrows === "cross") arrowHtml = '<div class="g3-cross"><button type="button" class="r3d-btn arrow up" data-hold="up" aria-label="上">▲</button><button type="button" class="r3d-btn arrow left" data-hold="left" aria-label="左">◀</button><button type="button" class="r3d-btn arrow down" data-hold="down" aria-label="下">▼</button><button type="button" class="r3d-btn arrow right" data-hold="right" aria-label="右">▶</button></div>';
    body.className = (body.className || "") + " r3d-body";
    body.innerHTML = '<div class="r3d g3d">' +
      '<canvas class="r3d-gl"></canvas><canvas class="r3d-fx"></canvas>' +
      '<div class="r3d-hud"><div class="r3d-pos g3-big"></div><div class="r3d-lap g3-sub"></div><div class="r3d-time g3-sub2"></div><div class="r3d-mt g3-gauge" hidden><i></i></div></div>' +
      '<div class="g3-right" hidden></div>' +
      '<div class="r3d-cheer" hidden></div><div class="r3d-final" hidden></div><div class="r3d-cd"></div>' +
      (def.help ? '<div class="g3-help">' + def.help + "</div>" : "") +
      '<div class="r3d-pad"><div class="r3d-col left">' + arrowHtml + '</div><div class="r3d-col right g3-btns">' +
      btns.map((b) => '<button type="button" class="r3d-btn ' + (b.cls || "drift") + '" data-hold="' + b.k + '">' + b.label + "</button>").join("") +
      "</div></div></div>";
    const glcv = body.querySelector(".r3d-gl"), fxcv = body.querySelector(".r3d-fx");
    const overlay = new FX.Overlay(fxcv), shake = new FX.Shake();
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(def.fov || 55, 1, 0.1, def.far || 300);
    let dpr = Math.min(window.devicePixelRatio || 1, 1.6), renderer;
    try { renderer = new T.WebGLRenderer({ canvas: glcv, antialias: dpr < 1.4, alpha: false, powerPreference: "high-performance" }); }
    catch (e) { console.error(e); if (prev) prev(diff); return st; }
    if (T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
    st.renderer = renderer; st.camera = camera; st.scene = scene;
    const W0 = () => Math.max(260, body.clientWidth || 360), H0 = () => Math.max(320, body.clientHeight || 520);
    function layout() { const w = W0(), h = H0(); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); overlay.resize(w, h, Math.min(dpr, 1.5)); if (st.game && st.game.resize) st.game.resize(w, h); }
    window.addEventListener("resize", layout); st.unbind.push(() => window.removeEventListener("resize", layout));
    // 入力：押している間（held）と、押した瞬間（hit）
    const held = { left: 0, right: 0, up: 0, down: 0, a: 0, b: 0, c: 0 }, edge = {}, rel = {};
    const press = (k) => { if (!held[k]) { edge[k] = 1; } held[k] = 1; };
    const release = (k) => { if (held[k]) rel[k] = 1; held[k] = 0; };
    const inp = { held, hit: (k) => { const v = !!edge[k]; edge[k] = 0; return v; }, up: (k) => { const v = !!rel[k]; rel[k] = 0; return v; }, x: () => (held.right ? 1 : 0) - (held.left ? 1 : 0), y: () => (held.up ? 1 : 0) - (held.down ? 1 : 0) };
    body.querySelectorAll("[data-hold]").forEach((el) => {
      const k = el.getAttribute("data-hold"), ids = new Set();
      const on = (e) => { e.preventDefault(); e.stopPropagation(); try { el.setPointerCapture(e.pointerId); } catch (er) {} ids.add(e.pointerId); press(k); el.classList.add("on"); try { FX.ctx(); } catch (er) {} };
      const off = (e) => { ids.delete(e.pointerId); if (!ids.size) { release(k); el.classList.remove("on"); } };
      el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("lostpointercapture", off);
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    });
    const keyOf = (e) => {
      const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k;
      if (k === "ArrowLeft" || kl === "a") return "left";
      if (k === "ArrowRight" || kl === "d") return "right";
      if (k === "ArrowUp" || kl === "w") return "up";
      if (k === "ArrowDown" || kl === "s") return "down";
      if (k === " " || k === "Shift" || k === "Enter") return "a";
      if (kl === "x" || kl === "e") return "b";
      if (kl === "c" || kl === "q") return "c";
      return null;
    };
    const kd = (e) => { const k = keyOf(e); if (!k) return; e.preventDefault(); if (!e.repeat) press(k); };
    const ku = (e) => { const k = keyOf(e); if (!k) return; release(k); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    st.unbind.push(() => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); });
    const hudBig = body.querySelector(".g3-big"), hudSub = body.querySelector(".g3-sub"), hudSub2 = body.querySelector(".g3-sub2"), gauge = body.querySelector(".g3-gauge"), gaugeI = gauge.querySelector("i"), right = body.querySelector(".g3-right");
    const cheer = body.querySelector(".r3d-cheer"), big = body.querySelector(".r3d-final"), cd = body.querySelector(".r3d-cd"), help = body.querySelector(".g3-help");
    let cheerT = 0, bigT = 0;
    const last = {};
    const setTxt = (el, k, v) => { if (v == null) return; if (last[k] !== v) { last[k] = v; el.innerHTML = v; } };
    const fx3 = new FX.ThreeFx(T, scene); st.fx3 = fx3;
    const ctx = {
      T, scene, camera, renderer, body, inp, FX, fx3, shake, overlay, diff, sk: SKILL[diff] || 0.92, st, S: sfx(), k: HM3D.k,
      say(t, sec) { cheer.hidden = false; cheer.textContent = t; cheerT = sec || 2; },
      big(t, sec, col) { big.hidden = false; big.textContent = t; big.style.color = col || ""; bigT = sec || 1.6; },
      hud(o) { setTxt(hudBig, "b", o.big); setTxt(hudSub, "s", o.sub); setTxt(hudSub2, "s2", o.sub2); if (o.right != null) { right.hidden = !o.right; setTxt(right, "r", o.right); } if (o.gauge != null) { gauge.hidden = o.gauge < 0; gaugeI.style.width = Math.round(Math.max(0, Math.min(1, o.gauge)) * 100) + "%"; if (o.gaugeCol) gaugeI.style.background = o.gaugeCol; } },
      label(k, text) { const b = body.querySelector('[data-hold="' + k + '"]'); if (b && b.textContent !== text) b.textContent = text; },
      end(res) {
        if (st.done) return; st.done = true; st.go = false;
        FX.SFX.finish(); overlay.flash(res.win ? "#ffe066" : "#9fb4ff", 0.45);
        GF.reportGame(def.id, diff, !!res.win, res.metric ? { metric: res.metric } : {});
        setTimeout(() => { if (st.dead) return; GF.showResult({ win: !!res.win, title: res.title, text: res.text || "", onRetry: () => { stop(st); start(def, diff, prev); } }); }, res.delay || 1100);
      }
    };
    st.ctx = ctx;
    scene.background = new T.Color(def.sky || 0x9ec5ff);
    if (def.fog !== false) scene.fog = new T.Fog(def.fogCol || def.sky || 0x9ec5ff, def.fogNear || 60, def.fogFar || 220);
    scene.add(new T.HemisphereLight(def.hemiSky || 0xeef3ff, def.hemiGround || 0x445544, def.hemi || 1.0));
    const sun = new T.DirectionalLight(def.sunCol || 0xfff4e0, def.sun || 0.9); sun.position.set(20, 40, 15); scene.add(sun);
    const game = def.setup(ctx);
    st.game = game;
    layout();
    try { FX.ctx(); } catch (e) {}
    const unlock = () => { try { FX.ctx(); } catch (e) {} };
    body.addEventListener("pointerdown", unlock, { once: true });
    const useCd = def.countdown !== false;
    if (!useCd) { st.go = true; cd.textContent = ""; if (help) setTimeout(() => help.classList.add("hide"), 4200); }
    let lastT = 0, fpsE = 60, lowT = 0;
    st.fps = 60;
    const camSave = new T.Vector3();
    function frame(now) {
      if (st.dead) return;
      st.raf = requestAnimationFrame(frame);
      const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016; lastT = now;
      fpsE += ((1 / Math.max(0.001, dt)) - fpsE) * 0.05; st.fps = fpsE;
      // 重いときは解像度を少し下げる（iPhone でもなめらかに）
      if (fpsE < 46 && dpr > 1) { lowT += dt; if (lowT > 1.5) { lowT = 0; dpr = Math.max(1, dpr - 0.2); layout(); } } else lowT = 0;
      st.t += dt;
      if (useCd && !st.go && !st.done) {
        const n = 3 - Math.floor(st.t / 0.8);
        if (st._cdn !== n) { st._cdn = n; if (n >= 0) FX.SFX.countdown(n); }
        cd.textContent = n > 0 ? String(n) : (st.t < 2.6 ? (def.goText || "スタート！") : "");
        if (st.t >= 2.4) { st.go = true; setTimeout(() => { if (!st.dead) cd.textContent = ""; }, 400); if (help) setTimeout(() => help.classList.add("hide"), 3500); }
      }
      game.step(dt, st.t);
      fx3.step(dt); shake.step(dt);
      if (cheerT > 0) { cheerT -= dt; if (cheerT <= 0) cheer.hidden = true; }
      if (bigT > 0) { bigT -= dt; if (bigT <= 0) big.hidden = true; }
      overlay.step(dt, game.speed01 ? game.speed01() : 0);
      camSave.copy(camera.position);
      camera.position.x += shake.x * 3; camera.position.y += shake.y * 3; camera.position.z += shake.z * 3;
      renderer.render(scene, camera);
      camera.position.copy(camSave);
      // 押した瞬間のしるしは1フレームで消す（使われなかったもの）
      for (const k in edge) edge[k] = 0;
      for (const k in rel) rel[k] = 0;
    }
    st.raf = requestAnimationFrame(frame);
    return st;
  }
  function register(def) {
    const prev = (window.GCGames && GCGames.open && GCGames.open[def.id]) || null;
    H.add({ id: def.id, e: def.e, n: def.n, c: def.c, genre: def.genre || "sports", fresh: true, pro: true, d: def.d }, (diff) => start(def, diff, prev));
  }
  const HM3D = { register, start, k: { bake, bakeTree, vcMat, G, KIT, MAT, lam, bas, glass, box, cyl, sph, cone, softShadow, inst, along, particles, noiseTex, stripeTex, waveTex, windowsTex, R01, athlete, runPose, crowdStand, cheerCrowd, lightTower, textTex } };
  window.HM3D = HM3D;
})();
