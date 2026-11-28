/* ほしの学園 — 第8回：3Dスポーツ（野球・卓球・テニス・バスケ・ボウリング）。games-3d-kit.js（HM3D）を使う。オリジナル。 */
(function () {
  "use strict";
  const HM3D = window.HM3D;
  if (!HM3D) return;
  const K = HM3D.k, { G, KIT, lam, bas, box, cyl, sph, cone, softShadow, inst, athlete, runPose, crowdStand, cheerCrowd, lightTower, textTex, noiseTex, stripeTex, R01, bake, bakeTree } = K;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const partnerColor = (T, def) => { try { const pid = window.HM_APP && HM_APP.state && HM_APP.state().partner; const ch = pid && ((window.HMGK && HMGK.CHARS && HMGK.CHARS.find((c) => c.id === pid)) || (window.GCArt && GCArt.charById && GCArt.charById(pid))); if (ch && ch.color) return new T.Color(ch.color).getHex(); } catch (e) {} return def; };
  // 平らな板（地面の模様など）
  function flat(T, parent, w, d, mat, x, y, z, ry) { const m = new T.Mesh(G(T, "flat" + w + "_" + d, () => new T.PlaneGeometry(w, d)), mat); m.rotation.x = -Math.PI / 2; if (ry) m.rotation.z = ry; m.position.set(x, y, z); parent.add(m); return m; }
  function disc(T, parent, r, mat, x, y, z, seg) { const m = new T.Mesh(G(T, "disc" + r + "_" + (seg || 32), () => new T.CircleGeometry(r, seg || 32)), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); parent.add(m); return m; }
  function ballMesh(T, r, col, seam) {
    const g = new T.Group();
    const tex = KIT.canvasTex(T, 128, 64, (c, w, h) => { c.fillStyle = "#" + col.toString(16).padStart(6, "0"); c.fillRect(0, 0, w, h); if (seam) { c.strokeStyle = seam; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= w; x += 4) { const y = h / 2 + Math.sin((x / w) * Math.PI * 4) * h * 0.28; if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); } });
    g.add(new T.Mesh(new T.SphereGeometry(r, 14, 10), new T.MeshLambertMaterial({ map: tex })));
    return g;
  }

  // =====================================================================
  // 野球：ホームランバッター（ミートカーソルで打つ。10球で相手より多く点をとる）
  // =====================================================================
  HM3D.register({
    id: "baseball", e: "⚾", n: "ホームランバッター", c: "#2e8b57", genre: "sports",
    title: "ホームランバッター",
    d: "3Dの球場でバッターになるよ。画面を指でなぞってミートカーソル（丸）を動かし、投げる前に出る青い丸（球が来る場所）を目印に、ボールに合わせて「打つ」。球はぜんぶストライク。10球で相手チームより多く点をとれば勝ち。",
    help: "指でなぞって（矢印キーでも）ミートカーソル（丸）を動かす<br>投げる前に出る青い丸が、球の来る場所<br>ボールが来たら「打つ」（スペース／画面をタップ）",
    arrows: "cross", buttons: [{ k: "a", label: "打つ", cls: "go big" }],
    sky: 0x8fc4ff, fogNear: 120, fogFar: 320, far: 400, fov: 50, countdown: false,
    setup(ctx) {
      const { T, scene, camera, inp, S, FX } = ctx;
      const sk = ctx.sk, me = partnerColor(T, 0xe03131);
      // ---- 球場 ----
      const grassTex = stripeTex(T, "#4fa45a", "#46984f", 2); grassTex.repeat.set(1, 24); grassTex.rotation = 0;
      disc(T, scene, 130, new T.MeshLambertMaterial({ map: grassTex }), 0, 0, 30, 48);
      const dirt = new T.MeshLambertMaterial({ map: (() => { const t = noiseTex(T, "#b98a5a", ["#a77a4c", "#c99a68", "#8f6a42"], 3); t.repeat.set(6, 6); return t; })() });
      // 内野の土（扇形）とダイヤモンドの芝
      // CircleGeometry は XY 面。x 軸を -90° 回すと、XY の -y 方向が +z（センター方向）になる
      const fan = new T.Mesh(new T.CircleGeometry(29, 32, -Math.PI * 3 / 4, Math.PI / 2), dirt); fan.rotation.x = -Math.PI / 2; fan.position.y = 0.02; scene.add(fan);
      const inGrass = new T.Mesh(new T.PlaneGeometry(19.4, 19.4), new T.MeshLambertMaterial({ map: grassTex })); inGrass.rotation.set(-Math.PI / 2, 0, Math.PI / 4); inGrass.position.set(0, 0.03, 13.7); scene.add(inGrass);
      disc(T, scene, 2.7, dirt, 0, 0.05, 18.4, 20); // マウンド
      const mound = new T.Mesh(new T.SphereGeometry(2.6, 16, 6, 0, Math.PI * 2, 0, 0.35), dirt); mound.position.set(0, -2.45, 18.4); scene.add(mound);
      disc(T, scene, 3.2, dirt, 0, 0.04, 0, 24); // ホームのまわり
      // ベース
      const white = lam(T, 0xffffff);
      [[19.4, 19.4], [0, 38.8], [-19.4, 19.4]].forEach(([x, z]) => { box(T, scene, 0.4, 0.08, 0.4, 0xffffff, x, 0.06, z).rotation.y = Math.PI / 4; });
      const plate = new T.Shape(); plate.moveTo(-0.22, 0); plate.lineTo(0.22, 0); plate.lineTo(0.22, 0.22); plate.lineTo(0, 0.43); plate.lineTo(-0.22, 0.22); plate.lineTo(-0.22, 0);
      const pm = new T.Mesh(new T.ShapeGeometry(plate), white); pm.rotation.x = -Math.PI / 2; pm.position.set(0, 0.06, 0.0); scene.add(pm);
      // ファウルライン・バッターボックス
      [[1, 1], [-1, 1]].forEach(([sx]) => { const ln = new T.Mesh(new T.PlaneGeometry(0.1, 100), white); ln.rotation.set(-Math.PI / 2, 0, sx * Math.PI / 4); ln.position.set(sx * 35.3, 0.05, 35.3); scene.add(ln); });
      [-0.85, 0.85].forEach((x) => { const bx = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(1.2, 1.8)), new T.LineBasicMaterial({ color: 0xffffff })); bx.rotation.x = -Math.PI / 2; bx.position.set(x, 0.06, 0.2); scene.add(bx); });
      // フェンス（左右 72m・センター 80m）
      const fenceR = (phi) => 72 + 8 * Math.cos(Math.min(Math.PI / 2, Math.abs(phi) * 2));
      const fpos = [], fsegs = 40;
      for (let i = 0; i <= fsegs; i++) { const phi = -Math.PI / 4 + (i / fsegs) * Math.PI / 2; fpos.push([Math.sin(phi) * fenceR(phi), Math.cos(phi) * fenceR(phi), phi]); }
      for (let i = 0; i < fsegs; i++) {
        const [x1, z1] = fpos[i], [x2, z2] = fpos[i + 1], L = Math.hypot(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, ry = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2;
        const w = box(T, scene, L + 0.05, 3.2, 0.4, 0x1f5f3a, mx, 1.6, mz); w.rotation.y = ry;
        const tp = box(T, scene, L + 0.05, 0.15, 0.45, 0xffd43b, mx, 3.25, mz); tp.rotation.y = ry;
      }
      [[-Math.PI / 4, "72m"], [0, "80m"], [Math.PI / 4, "72m"]].forEach(([phi, tx]) => { const r = fenceR(phi) - 0.25; const s = new T.Mesh(new T.PlaneGeometry(2.6, 1.3), new T.MeshBasicMaterial({ map: textTex(T, tx, { bg: "#1f5f3a", fg: "#ffffff" }) })); s.position.set(Math.sin(phi) * r, 1.8, Math.cos(phi) * r); s.rotation.y = phi + Math.PI; scene.add(s); });
      // 外野スタンド・照明・スコアボード
      const stands = [];
      for (let i = 0; i < 7; i++) { const phi = -Math.PI / 4 + 0.05 + (i / 6) * (Math.PI / 2 - 0.1), r = fenceR(phi) + 4; stands.push(crowdStand(T, scene, Math.sin(phi) * r, Math.cos(phi) * r, phi, 15, 6, 11 + i)); }
      [[-40, 24], [40, 24], [-58, 70], [58, 70]].forEach(([x, z]) => lightTower(T, scene, x, z, 26));
      const sbCv = document.createElement("canvas"); sbCv.width = 512; sbCv.height = 256; const sbTex = new T.CanvasTexture(sbCv); if (T.SRGBColorSpace) sbTex.colorSpace = T.SRGBColorSpace;
      const sb = new T.Group(); box(T, sb, 22, 11, 0.6, 0x212529, 0, 0, -0.2); const sbm = new T.Mesh(new T.PlaneGeometry(20.5, 10), new T.MeshBasicMaterial({ map: sbTex })); sbm.rotation.y = Math.PI; sbm.position.z = -0.55; sb.add(sbm); box(T, sb, 1, 12, 1, 0x495057, -8, -11, 0); box(T, sb, 1, 12, 1, 0x495057, 8, -11, 0); sb.position.set(0, 21, 104); scene.add(sb);
      // ---- 選手 ----
      const pitcher = athlete(T, scene, { shirt: 0x1c3d7a, pants: 0xf1f3f5, cap: 0x1c3d7a, sock: 0x1c3d7a, num: 18, noBake: true });
      pitcher.g.position.set(0, 0.25, 18.4); pitcher.g.rotation.y = Math.PI;
      const pGlove = sph(T, pitcher.armL.userData.hand, 0.09, 0x8b5a2b, 0, -0.02, 0);
      bakeTree(T, pitcher.g);
      const fieldPos = [[14, 22, "1B"], [-14, 22, "3B"], [6, 32, "2B"], [-6, 32, "SS"], [-30, 58, "LF"], [0, 66, "CF"], [30, 58, "RF"]];
      const fielders = fieldPos.map(([x, z], i) => { const a = athlete(T, scene, { shirt: 0x1c3d7a, pants: 0xf1f3f5, cap: 0x1c3d7a, sock: 0x1c3d7a, lod: true, pose: (q) => { q.armL.rotation.x = -0.6; q.armR.rotation.x = -0.4; q.hip.rotation.x = 0.25; } }); a.g.position.set(x, 0, z); a.g.rotation.y = Math.PI; a.home = new T.Vector3(x, 0, z); a.ph = i; return a; });
      const batter = athlete(T, scene, { shirt: 0xf8f9fa, pants: 0xf8f9fa, helmet: me, sock: me, stripe: me, num: 7, noBake: true });
      batter.g.position.set(0.85, 0, 0.25); batter.g.rotation.y = -Math.PI / 2;
      batter.head.rotation.y = 1.25;
      // バット：両手のあいだ
      const bat = new T.Group(); batter.torso.add(bat); bat.position.set(0.0, 0.62, 0.12);
      const batM = cyl(T, bat, 0.035, 0.022, 0.86, 8, 0xd9a066, 0, 0.43, 0); cyl(T, bat, 0.024, 0.024, 0.12, 8, 0x212529, 0, 0.02, 0);
      bakeTree(T, batter.g);
      // 構え（バットを立てる）→ スイング
      const ease = (x) => x * x * (3 - 2 * x);
      // s: -0.35〜0=テイクバック（ためる）, 0=構え, 1=打つ瞬間, 1.6=フォロースルー
      // 腰 → 体幹 → 腕とバット の順に回る（ずらして動かすと自然に見える）
      const batPose = (s) => {
        const ld = clamp(-s, 0, 0.35) / 0.35, k = clamp(s, 0, 1.6);
        const hipK = ease(clamp(k / 0.55, 0, 1)), bodyK = ease(clamp((k - 0.12) / 0.6, 0, 1)), armK = ease(clamp((k - 0.22) / 0.62, 0, 1)), fol = ease(clamp((k - 1) / 0.6, 0, 1));
        batter.hip.rotation.y = lerp(0.2, -0.5, hipK) + ld * 0.3 - fol * 0.25;
        batter.torso.rotation.y = lerp(0.5, -1.6, bodyK) + ld * 0.4 - fol * 0.6;
        bat.rotation.set(lerp(-0.35, -1.5, armK) - fol * 0.15, 0, lerp(0.5, 1.57, armK) - ld * 0.2 + fol * 0.5);
        batter.armL.rotation.set(lerp(-1.4, -1.5, armK), 0, lerp(0.6, 0.1, armK));
        batter.armR.rotation.set(lerp(-1.6, -1.3, armK), 0, lerp(-0.3, -0.1, armK));
        batter.armL.userData.el.rotation.x = lerp(-1.2, -0.2, armK); batter.armR.userData.el.rotation.x = lerp(-1.5, -0.3, armK);
        batter.legL.rotation.x = lerp(-0.25, 0.2, hipK) - ld * 0.3; batter.legR.rotation.x = lerp(0.2, -0.1, hipK) + ld * 0.1;
      };
      batPose(0);
      // ---- ボール・カーソル ----
      const ball = ballMesh(T, 0.07, 0xffffff, "#e03131"); ball.scale.setScalar(1.6); scene.add(ball); ball.visible = false;
      const ballSh = softShadow(T, scene, 0.4, 0.4); ballSh.visible = false;
      const trail = []; for (let i = 0; i < 8; i++) { const m = new T.Mesh(G(T, "trl", () => new T.SphereGeometry(0.06, 6, 4)), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 - i * 0.03, depthWrite: false })); m.visible = false; scene.add(m); trail.push(m); }
      const RC = { easy: 0.2, normal: 0.16, hard: 0.13, ultra: 0.11 }[ctx.diff] || 0.16;
      const EMAX = { easy: 0.2, normal: 0.15, hard: 0.115, ultra: 0.09 }[ctx.diff] || 0.15; // タイミングの許せる幅（秒）
      const WU = 1.35; // ピッチャーのモーション（この間に予告マーカーが出ている）
      const TT = { easy: 1.5, normal: 1.0, hard: 0.85, ultra: 0.72 }[ctx.diff] || 1.0; // リリースからミットまで（ストレートの秒数）
      const MK_R = { easy: 0.1, normal: 0.115, hard: 0.14, ultra: 0.17 }[ctx.diff] || 0.115, MK_OFF = { easy: 0, normal: 0.02, hard: 0.04, ultra: 0.065 }[ctx.diff] || 0.02; // 予告マーカーの大きさ・ずれ（強いほどぼんやり）
      const ZONE = { x0: -0.25, x1: 0.25, y0: 0.5, y1: 1.12 }, CZ = 0.35;
      const zoneG = new T.Group(); zoneG.position.set(0, 0, CZ); scene.add(zoneG);
      const zl = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(ZONE.x1 - ZONE.x0, ZONE.y1 - ZONE.y0)), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
      zl.position.set(0, (ZONE.y0 + ZONE.y1) / 2, 0); zoneG.add(zl);
      for (let i = 1; i < 3; i++) { const v = new T.Mesh(G(T, "zv", () => new T.PlaneGeometry(0.006, ZONE.y1 - ZONE.y0)), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })); v.position.set(ZONE.x0 + (ZONE.x1 - ZONE.x0) * i / 3, (ZONE.y0 + ZONE.y1) / 2, 0); zoneG.add(v); const h = new T.Mesh(G(T, "zh", () => new T.PlaneGeometry(ZONE.x1 - ZONE.x0, 0.006)), v.material); h.position.set(0, ZONE.y0 + (ZONE.y1 - ZONE.y0) * i / 3, 0); zoneG.add(h); }
      const cur = new T.Group(); zoneG.add(cur);
      const ring = new T.Mesh(new T.RingGeometry(RC - 0.012, RC, 32), new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95, side: T.DoubleSide, depthTest: false })); cur.add(ring);
      const fillM = new T.Mesh(new T.CircleGeometry(RC, 32), new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.16, side: T.DoubleSide, depthTest: false, depthWrite: false })); cur.add(fillM);
      const dot = new T.Mesh(new T.CircleGeometry(0.018, 12), new T.MeshBasicMaterial({ color: 0xff6b6b, side: T.DoubleSide, depthTest: false })); cur.add(dot);
      ring.renderOrder = fillM.renderOrder = dot.renderOrder = 10;
      const markTex = KIT.canvasTex(T, 128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(40,130,255,.85)"); gr.addColorStop(0.6, "rgba(40,130,255,.65)"); gr.addColorStop(0.82, "rgba(190,230,255,.95)"); gr.addColorStop(1, "rgba(116,192,252,0)"); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
      const mark = new T.Mesh(new T.PlaneGeometry(MK_R * 2, MK_R * 2), new T.MeshBasicMaterial({ map: markTex, transparent: true, opacity: 0, side: T.DoubleSide, depthTest: false, depthWrite: false })); mark.renderOrder = 9; zoneG.add(mark);
      // 画面を指でなぞる／マウスでカーソルを動かす（ストライクゾーンの面に当てる）
      const dom = ctx.renderer.domElement; dom.style.touchAction = "none";
      const ray = new T.Raycaster(), ndc = new T.Vector2(), zPlane = new T.Plane(new T.Vector3(0, 0, 1), -CZ), hitV = new T.Vector3();
      let tapSwing = false, ptr = null;
      const aimAt = (e) => { const r = dom.getBoundingClientRect(); if (!r.width) return; ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); camera.updateMatrixWorld(); ray.setFromCamera(ndc, camera); if (ray.ray.intersectPlane(zPlane, hitV)) { cu = clamp(-hitV.x, -0.7, 0.7); cv = clamp(hitV.y, 0.1, 1.7); } };
      const offUI = (e) => !!(e.target && e.target.closest && e.target.closest("button,[data-hold]"));
      const onPD = (e) => { if (offUI(e)) return; ptr = { id: e.pointerId, t0: performance.now(), x0: e.clientX, y0: e.clientY, moved: false }; aimAt(e); if (e.pointerType === "mouse") tapSwing = true; };
      const onPM = (e) => { if (ptr && ptr.id === e.pointerId) { if (Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0) > 12) ptr.moved = true; aimAt(e); } else if (e.pointerType === "mouse" && !offUI(e)) aimAt(e); };
      const onPU = (e) => { if (ptr && ptr.id === e.pointerId) { if (e.pointerType !== "mouse" && !ptr.moved && performance.now() - ptr.t0 < 260) tapSwing = true; ptr = null; } };
      ctx.body.addEventListener("pointerdown", onPD); ctx.body.addEventListener("pointermove", onPM); ctx.body.addEventListener("pointerup", onPU); ctx.body.addEventListener("pointercancel", onPU);
      ctx.st.unbind.push(() => { ctx.body.removeEventListener("pointerdown", onPD); ctx.body.removeEventListener("pointermove", onPM); ctx.body.removeEventListener("pointerup", onPU); ctx.body.removeEventListener("pointercancel", onPU); });
      const handV = new T.Vector3();
      let cu = 0, cv = 0.82; // u は画面の右が＋（世界の x はマイナス）
      // ---- 状態 ----
      const PITCHES = 10;
      const cpuBase = { easy: 3, normal: 5, hard: 7, ultra: 9 }[ctx.diff] || 5;
      const cpu = Math.max(1, cpuBase + Math.floor(Math.random() * 3) - 1);
      let lastSwing = null, score = 0, n = 0, hr = 0, hits = 0, phase = "wait", tPhase = 0, swingT = -1, swingS = 0, result = "", pitch = null, fly = null, camMode = 0, joy = 0, combo = 0;
      const camHome = { p: new T.Vector3(0, 1.62, -3.9), l: new T.Vector3(0, 1.05, 12) };
      camera.position.copy(camHome.p); camera.lookAt(camHome.l);
      const camL = camHome.l.clone();
      const drawBoard = () => {
        const c = sbCv.getContext("2d"); c.fillStyle = "#101418"; c.fillRect(0, 0, 512, 256);
        c.fillStyle = "#ffe066"; c.font = "900 44px sans-serif"; c.textAlign = "left"; c.fillText("ほしの学園", 24, 60);
        c.fillStyle = "#fff"; c.font = "800 36px sans-serif"; c.fillText("きみ", 24, 130); c.fillText("あいて", 24, 196);
        c.textAlign = "right"; c.font = "900 54px sans-serif"; c.fillStyle = "#69db7c"; c.fillText(String(score), 300, 134); c.fillStyle = "#ff8787"; c.fillText(String(cpu), 300, 200);
        c.fillStyle = "#fff"; c.font = "800 30px sans-serif"; c.fillText("のこり " + (PITCHES - n) + "球", 490, 130); c.fillText("HR " + hr, 490, 196);
        sbTex.needsUpdate = true;
      };
      drawBoard();
      const TYPES = [
        { n: "ストレート", v: 31, ax: 0, ay: 0, w: 4 }, { n: "カーブ", v: 24, ax: -5.5, ay: -4, w: 2 }, { n: "スライダー", v: 27, ax: 6, ay: -1, w: 2 },
        { n: "チェンジアップ", v: 21, ax: 0, ay: -2, w: 1.5 }, { n: "フォーク", v: 26, ax: 0, ay: -7, w: 1.2 }, { n: "シュート", v: 28, ax: -4, ay: 0, w: 1 }
      ];
      const pool = { easy: [0, 0, 3], normal: [0, 0, 1, 3, 2], hard: [0, 1, 2, 3, 4], ultra: [0, 1, 2, 3, 4, 5] }[ctx.diff] || [0, 1, 3];
      // ぜんぶストライク。球速はゆっくり（弱い＞普通＞強い の順に遅い）。投げる前に予告マーカーが出る
      function solve(p) { const d = p.p0.distanceTo(p.target); p.v0 = p.target.clone().sub(p.p0).sub(p.a.clone().multiplyScalar(0.5 * p.Tt * p.Tt)).divideScalar(p.Tt); p.kmh = Math.round(d / p.Tt * 3.6 * 1.75); return p; }
      function newPitch() {
        const ty = TYPES[pool[Math.floor(Math.random() * pool.length)]];
        const tx = rnd(ZONE.x0 + 0.04, ZONE.x1 - 0.04), tyy = rnd(ZONE.y0 + 0.05, ZONE.y1 - 0.05);
        const p0 = new T.Vector3(-0.35, 1.9, 17.3), target = new T.Vector3(tx, tyy, CZ);
        const Tt = TT * Math.pow(31 / ty.v, 0.4), gs = Math.pow(0.65 / Tt, 2);
        const a = new T.Vector3(ty.ax * gs, (-9.8 * 0.5 + ty.ay) * gs, 0);
        const ang = Math.random() * Math.PI * 2, rr = MK_OFF * Math.sqrt(Math.random());
        return solve({ ty, p0, a, Tt, t: 0, target, inZone: true, mk: { x: tx + Math.cos(ang) * rr, y: tyy + Math.sin(ang) * rr } });
      }
      function posAt(p, t, out) { return out.copy(p.p0).addScaledVector(p.v0, t).addScaledVector(p.a, 0.5 * t * t); }
      const tmp = new T.Vector3();
      function hitBall(q, e, dx, dy) {
        const ev = 14 + 21 * q + (q > 0.82 ? 6 : 0);
        const theta = clamp(24 - (dy / RC) * 32 + (Math.random() - 0.5) * 6, -12, 72) * Math.PI / 180;
        const phi = clamp((e / EMAX) * 0.72 + dx * 0.9 + (Math.random() - 0.5) * 0.1, -1.1, 1.1);
        fly = { p: ball.position.clone(), v: new T.Vector3(Math.sin(phi) * Math.cos(theta) * ev, Math.sin(theta) * ev, Math.cos(phi) * Math.cos(theta) * ev), phi, theta, ev, q, t: 0, landed: false, bounces: 0, out: null };
        S.bat(); FX.SFX.hit(); ctx.shake.add(q > 0.8 ? 6 : 3);
        ctx.fx3.burst(ball.position.clone(), ["#ffffff", "#ffe066"], 10, 4, 0.3);
        if (q > 0.85) { ctx.overlay.flash("#fff3bf", 0.35); }
        camMode = 1;
      }
      function judge(kind) {
        log.push(kind + (fly ? ":q" + fly.q.toFixed(2) + ":ev" + fly.ev.toFixed(0) + ":th" + (fly.theta * 57).toFixed(0) + ":ph" + (fly.phi * 57).toFixed(0) : ""));
        result = kind; phase = "result"; tPhase = 0;
        let pts = 0, col = "#fff";
        if (kind === "HR") { pts = 4; hr++; combo++; col = "#ffe066"; ctx.big("ホームラン！", 2.2, col); S.cheer(); joy = 1.5; ctx.overlay.flash("#ffe066", 0.4); FX.SFX.finish(); }
        else if (kind === "2B") { pts = 2; hits++; combo++; ctx.big("ツーベース！", 1.8, "#69db7c"); S.cheer(); joy = 0.8; }
        else if (kind === "H") { pts = 1; hits++; combo++; ctx.big("ヒット！", 1.6, "#69db7c"); joy = 0.5; }
        else if (kind === "F") { combo = 0; ctx.big("ファウル", 1.2, "#ced4da"); }
        else if (kind === "OUT") { combo = 0; ctx.big(fly && fly.theta > 0.95 ? "フライでアウト" : fly && fly.theta < 0.17 ? "ゴロでアウト" : "キャッチでアウト", 1.5, "#ff8787"); }
        else if (kind === "K") { combo = 0; ctx.big("空ぶり！", 1.2, "#ff8787"); }
        else if (kind === "L") { combo = 0; ctx.big("見のがし", 1.2, "#a5d8ff"); }
        score += pts;
        if (pts && combo >= 3) ctx.say(combo + "連続ヒット！ その調子！", 2);
        drawBoard(); hudUp();
      }
      function hudUp() { ctx.hud({ big: score + "点", sub: "のこり " + (PITCHES - n) + "球", sub2: "HR " + hr + "・ヒット " + hits, right: "あいて <b>" + cpu + "</b> 点" }); }
      const log = [];
      const LBL = { HR: "ホームラン", "2B": "ツーベース", H: "ヒット", F: "ファウル", OUT: "アウト", K: "空ぶり", L: "見のがし" };
      return {
        dbg: () => ({ log, phase, n, score, cpu, cu, cv, pitch: pitch && phase === "pitch" ? { t: pitch.t, Tt: pitch.Tt, u: -pitch.target.x, v: pitch.target.y, z: ball.position.z, inZone: pitch.inZone } : null,
          // 予告マーカー（投げる前から出ているか）：lead = マーカーが出てからミットに届くまでの秒数
          wind: pitch && phase === "windup" ? { t: tPhase, remain: WU - tPhase, Tt: pitch.Tt, lead: WU - tPhase + pitch.Tt, op: mark.material.opacity, u: -mark.position.x, v: mark.position.y, ballOn: ball.visible } : null,
          mk: { op: mark.material.opacity, x: mark.position.x, y: mark.position.y }, lastSwing }),
        step(dt, t) {
          cheerCrowd(T, stands[(Math.floor(t * 30)) % stands.length], t, joy); joy = Math.max(0, joy - dt * 0.4);
          // カーソル：指・マウスで直接動かす（上の onPD/onPM）。矢印キーでも動かせる。画面の右が右（世界の x とは逆）
          if (phase !== "fly" && !(phase === "result" && fly)) { cu = clamp(cu + inp.x() * dt * 1.15, -0.7, 0.7); cv = clamp(cv + inp.y() * dt * 1.15, 0.1, 1.7); }
          cur.position.set(-cu, cv, 0);
          fielders.forEach((f, i) => { if (!fly) { f.g.position.lerp(f.home, dt * 2); runPose(f, t * 2 + i, 0.05); f.g.rotation.y = Math.PI; } });
          tPhase += dt;
          if (phase !== "pitch") tapSwing = false;
          if (phase === "wait") {
            hudUp();
            if (ctx.st.go && tPhase > (n ? 1.0 : 4.6)) { phase = "windup"; tPhase = 0; pitch = newPitch(); swingT = -1; swingS = -0.01; batPose(0); }
          } else if (phase === "windup") {
            const k = tPhase / WU;
            pitcher.legL.rotation.x = -Math.sin(Math.min(1, k) * Math.PI) * 1.2; pitcher.legL.userData.knee.rotation.x = Math.sin(Math.min(1, k) * Math.PI) * 1.3;
            pitcher.armR.rotation.x = k < 0.7 ? lerp(0, 2.6, k / 0.7) : lerp(2.6, -1.2, (k - 0.7) / 0.3); pitcher.torso.rotation.y = k < 0.7 ? lerp(0, 0.6, k / 0.7) : lerp(0.6, -0.4, (k - 0.7) / 0.3);
            // 投げ始めたらすぐ、球が来る場所に青いぼかし丸を出す（ミットに届く 2 秒以上前）
            mark.position.set(pitch.mk.x, pitch.mk.y, 0.01);
            mark.material.opacity = Math.min(0.95, tPhase * 3) * (0.85 + 0.15 * Math.sin(t * 6));
            // 球はピッチャーの右手にもったまま見える
            if (pitcher.armR.userData.hand) { pitcher.armR.userData.hand.getWorldPosition(handV); ball.position.copy(handV); ball.visible = true; ball.scale.setScalar(3.7); }
            if (tPhase >= WU) { phase = "pitch"; tPhase = 0; ball.visible = true; if (pitcher.armR.userData.hand) { pitch.p0.copy(ball.position); solve(pitch); } S.throwS(); ctx.say(pitch.ty.n + " " + pitch.kmh + "km/h", 1.2); }
          } else if (phase === "pitch") {
            pitch.t += dt;
            posAt(pitch, pitch.t, ball.position); ball.rotation.x += dt * 30; ball.scale.setScalar(1.5 + 2.2 * clamp(ball.position.z / 17, 0, 1));
            pitcher.armR.rotation.x = lerp(pitcher.armR.rotation.x, 0, dt * 4); pitcher.legL.rotation.x *= 0.9; pitcher.torso.rotation.y *= 0.9;
            // 予告マーカーはそのまま（球が来る場所）。ミットに近づくと少し濃く
            mark.material.opacity = 0.8 + 0.15 * (pitch.t / pitch.Tt);
            // 軌跡
            for (let i = trail.length - 1; i > 0; i--) { trail[i].position.copy(trail[i - 1].position); trail[i].visible = trail[i - 1].visible; }
            trail[0].position.copy(ball.position); trail[0].visible = true;
            if ((inp.hit("a") || tapSwing) && swingT < 0) { swingT = pitch.t; S.throwS(); }
            if (swingT >= 0) { swingS = Math.min(1.6, swingS + dt * 7.7); batPose(swingS); } else batPose(-0.35 * ease(clamp(pitch.t / 0.35, 0, 1)) * (1 - clamp((pitch.t - pitch.Tt + 0.3) / 0.3, 0, 1)));
            // 打つ瞬間（スイングから 0.13 秒後）。タイミング（早い／ジャスト／遅い）とカーソル位置の両方で判定
            if (swingT >= 0 && !pitch.tested && pitch.t >= swingT + 0.13) {
              pitch.tested = true;
              const e = pitch.Tt - pitch.t; // ＋なら早い（秒）、−なら遅い
              const cx = -cu, cy = cv;
              const dx = pitch.target.x - cx, dy = pitch.target.y - cy, d = Math.hypot(dx, dy), RR = RC + 0.045;
              const tOK = Math.abs(e) < EMAX, pOK = d < RR;
              const tm = Math.abs(e) <= EMAX * 0.33 ? "just" : e > 0 ? "early" : "late";
              lastSwing = { e, d, tm, tOK, pOK };
              if (!(tOK && pOK)) log.push("miss e" + e.toFixed(3) + " d" + d.toFixed(3));
              if (tOK && pOK) {
                let q = clamp((1 - d / RR) * Math.sqrt(1 - Math.abs(e) / EMAX) * 1.08, 0, 1);
                if (tm === "just" && d < RR * 0.6) q = Math.max(q, 0.9); // ジャスト＋芯はしっかり飛ぶ
                lastSwing.q = q;
                ball.position.set(pitch.target.x, pitch.target.y, CZ);
                hitBall(q, e, -dx * 2, cy - pitch.target.y);
                ctx.say(tm === "just" ? "ジャスト！" : tm === "early" ? "ちょっと早い" : "ちょっと遅い", 1.0);
                phase = "fly"; tPhase = 0; mark.material.opacity = 0;
                return;
              }
              ctx.say(!tOK ? (e > 0 ? "早すぎ！ もっと引きつけよう" : "遅すぎ！ 球が来たらすぐ振ろう") : "ズレた！ カーソルを青い丸に合わせよう", 1.4);
            }
            if (ball.position.z < -1.2) {
              ball.visible = false; trail.forEach((m) => (m.visible = false)); mark.material.opacity = 0;
              n++;
              if (swingT >= 0) judge("K"); else { judge("L"); ctx.say("見のがし！ 青い丸に合わせて「打つ」", 1.5); }
            }
            if (swingT < 0) batPose(Math.max(0, Math.sin(t * 2) * 0.02));
          } else if (phase === "fly") {
            const f = fly; f.t += dt;
            if (swingS < 1.6) { swingS = Math.min(1.6, swingS + dt * 6); batPose(swingS); }
            f.v.y -= 9.8 * dt; f.v.multiplyScalar(1 - 0.06 * dt);
            const prevR = Math.hypot(f.p.x, f.p.z);
            f.p.addScaledVector(f.v, dt);
            if (f.p.y < 0.07) { f.p.y = 0.07; if (f.v.y < 0) { f.v.y *= -0.42; f.v.x *= 0.7; f.v.z *= 0.7; f.bounces++; if (f.bounces === 1) S.bounce(); } }
            ball.position.copy(f.p); ball.rotation.x += dt * 20;
            ballSh.visible = true; ballSh.position.set(f.p.x, 0.04, f.p.z); const ss = Math.max(0.3, 1 - f.p.y * 0.05); ballSh.scale.set(ss, ss, ss);
            for (let i = trail.length - 1; i > 0; i--) { trail[i].position.copy(trail[i - 1].position); trail[i].visible = trail[i - 1].visible; }
            trail[0].position.copy(ball.position);
            const r = Math.hypot(f.p.x, f.p.z), phi = Math.atan2(f.p.x, f.p.z);
            const foul = Math.abs(f.phi) > Math.PI / 4 + 0.02;
            // 野手が落下点へ走る
            if (!f.land) { // 落下点を予測
              const vy = f.v.y, tt = (vy + Math.sqrt(vy * vy + 2 * 9.8 * Math.max(0, f.p.y))) / 9.8; f.land = new T.Vector3(f.p.x + f.v.x * tt * 0.9, 0, f.p.z + f.v.z * tt * 0.9); f.tLand = tt;
              let best = null, bd = 1e9; fielders.forEach((fd) => { const dd = fd.g.position.distanceTo(f.land); if (dd < bd) { bd = dd; best = fd; } }); f.fd = best;
              const reach = 7.5 * f.tLand + (ctx.diff === "easy" ? 1 : ctx.diff === "ultra" ? 5 : 3);
              f.catchable = !foul && f.theta > 0.17 && bd < reach && Math.hypot(f.land.x, f.land.z) < fenceR(Math.atan2(f.land.x, f.land.z)) - 1;
            }
            if (f.fd) { const fd = f.fd; const to = (f.catchable ? f.land : new T.Vector3(f.p.x, 0, f.p.z)).clone().sub(fd.g.position); to.y = 0; const dl = to.length(); if (dl > 0.3) { const sp = Math.min(dl, 7.5 * dt); fd.g.position.addScaledVector(to.normalize(), sp); fd.g.rotation.y = Math.atan2(to.x, to.z); runPose(fd, t * 14, 1); } else runPose(fd, 0, 0); }
            if (camMode) { const look = f.p.clone(); camL.lerp(look, dt * 5); const cp = new T.Vector3(f.p.x * 0.35, 5 + Math.min(18, f.p.y * 0.5), Math.min(f.p.z * 0.45, 40) - 9); camera.position.lerp(cp, dt * 2.2); camera.lookAt(camL); }
            if (!f.out) {
              if (foul && (f.bounces > 0 || r > 30)) f.out = "F";
              else if (!foul && prevR < fenceR(phi) && r >= fenceR(phi)) f.out = f.p.y > 3.3 ? "HR" : "2B";
              else if (f.catchable && f.fd && f.fd.g.position.distanceTo(new T.Vector3(f.p.x, 0, f.p.z)) < 1.6 && f.p.y < 2.4) { f.out = "OUT"; ball.visible = false; S.pop(); }
              else if (!foul && f.bounces > 0 && !f.catchable) f.out = r > 58 ? "2B" : (r < 26 && f.ev < 24 && f.theta < 0.25 ? "OUT" : "H");
              else if (!foul && f.bounces > 0 && f.catchable) f.out = "H";
              if (f.out) { n++; judge(f.out); }
            }
          } else if (phase === "result") {
            if (fly && result !== "OUT") { fly.v.y -= 9.8 * dt; fly.p.addScaledVector(fly.v, dt); if (fly.p.y < 0.07) { fly.p.y = 0.07; fly.v.y *= -0.4; fly.v.x *= 0.8; fly.v.z *= 0.8; } ball.position.copy(fly.p); if (camMode) { camL.lerp(fly.p, dt * 3); camera.lookAt(camL); } }
            if (tPhase > (result === "HR" ? 2.6 : result === "K" || result === "L" ? 0.9 : 2.0)) {
              fly = null; camMode = 0; ball.visible = false; ballSh.visible = false; trail.forEach((m) => (m.visible = false));
              camera.position.copy(camHome.p); camL.copy(camHome.l); camera.lookAt(camL); batPose(0);
              fielders.forEach((f) => f.g.position.copy(f.home));
              if (n >= PITCHES) {
                phase = "end"; const win = score > cpu;
                ctx.end({ win, title: win ? "勝ち！ " + score + " 対 " + cpu : score === cpu ? "引き分け " + score + " 対 " + cpu : "負け… " + score + " 対 " + cpu, text: "10球で " + score + "点（ホームラン " + hr + "本・ヒット " + hits + "本）", metric: { v: score, unit: "点", lower: false, label: "とく点" } });
              } else { phase = "wait"; tPhase = 0; }
            }
          }
        }
      };
    }
  });

  // =====================================================================
  // 卓球・テニス：ラリーの共通エンジン
  //   ←→で動く。ボールが届くところに来ると自動でふる（打つ位置で角度が変わる）。
  //   スペース：サーブ／高いボール（チャンス）はスマッシュ。←→を押しながら打つとその向きへ。
  // =====================================================================
  function rally(cfg) {
    HM3D.register({
      id: cfg.id, e: cfg.e, n: cfg.n, c: cfg.c, genre: "sports", title: cfg.n, d: cfg.d,
      help: "←→ で動く（ボールに近づくと自動でふるよ）<br>ラケットのはしで打つと角度がつく・←→を押しながら打つとその向きへ<br>スペース：サーブ／光るボールはスマッシュ",
      arrows: "lr", buttons: [{ k: "a", label: "サーブ", cls: "go big" }],
      sky: cfg.sky, fog: cfg.fog, fogNear: cfg.fogNear, fogFar: cfg.fogFar, far: cfg.far || 300, fov: cfg.fov || 55, countdown: false,
      hemiSky: cfg.hemiSky, hemiGround: cfg.hemiGround, hemiI: cfg.hemiI, sunI: cfg.sunI,
      setup(ctx) {
        const { T, scene, camera, inp, S, FX } = ctx;
        const sk = ctx.sk, D = ctx.diff, P = cfg;
        const L = P.L, W = P.W, HALF = L / 2, NET = P.surf + P.netH, R = P.ballR, g = P.g;
        const me = partnerColor(T, 0xe03131);
        P.build(T, scene, ctx);
        // ---- 選手 ----
        const mkPlayer = (shirt, pants, band) => {
          const a = athlete(T, scene, { shirt, pants, band, sock: 0xffffff, shoe: 0xffffff, noBake: true });
          const rk = P.racket(T); a.armR.userData.hand.add(rk); bakeTree(T, a.g); return a;
        };
        const meA = mkPlayer(me, 0x212529, 0xffffff), cpuA = mkPlayer(0x1c7ed6, 0xf8f9fa, 0xffd43b);
        cpuA.g.rotation.y = Math.PI;
        const PZ = P.plane, CZ = L - P.plane; // 打つ面（z）
        let px = 0, cx = 0, pv = 0, cTarget = 0;
        const swing = { me: -1, cpu: -1, meSide: 1, cpuSide: 1 };
        function pose(a, s, side, run, t) {
          // s: スイングの進み（-1 はかまえ）
          runPose(a, t, run);
          a.hip.position.y = 0.92 - 0.08 + (run ? a.hip.position.y - 0.92 : 0);
          a.torso.rotation.x = 0.22; a.legL.rotation.x += 0.15; a.legR.rotation.x -= 0.1;
          if (s < 0) { a.torso.rotation.y = 0.35; a.armR.rotation.set(-0.5, 0, 0.5); a.armR.userData.el.rotation.x = -0.9; return; }
          const k = Math.sin(Math.min(1, s) * Math.PI / 2);
          const fore = side > 0; // 右手側のボール
          if (fore) { a.torso.rotation.y = lerp(0.9, -0.8, k); a.armR.rotation.set(-0.3 - k * 0.6, 0, lerp(1.3, -0.3, k)); }
          else { a.torso.rotation.y = lerp(-0.6, 0.7, k); a.armR.rotation.set(-0.4 - k * 0.5, 0, lerp(-0.7, 0.9, k)); }
          a.armR.userData.el.rotation.x = -0.4;
        }
        // ---- ボール ----
        const ball = ballMesh(T, R, P.ballCol, P.seam); scene.add(ball);
        const glow = new T.Mesh(new T.SphereGeometry(R * 2.2, 12, 8), new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.0, depthWrite: false })); ball.add(glow);
        const bsh = softShadow(T, scene, R * 5, R * 5);
        const trail = []; for (let i = 0; i < 6; i++) { const m = new T.Mesh(G(T, "rtrail" + P.id, () => new T.SphereGeometry(R * 0.8, 6, 4)), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 - i * 0.05, depthWrite: false })); m.visible = false; scene.add(m); trail.push(m); }
        const mark = disc(T, scene, P.markR, new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false }), 0, P.surf + 0.012, 0, 20);
        const pos = new T.Vector3(), vel = new T.Vector3();
        const surfAt = (x, z) => (P.table ? (Math.abs(x) <= W / 2 && z >= 0 && z <= L ? P.surf : 0) : 0);
        const inCourt = (x, z) => Math.abs(x) <= W / 2 + R && z >= -R && z <= L + R;
        // ---- 試合の状態 ----
        let my = 0, op = 0, server = "me", phase = "serve", tP = 0, hitter = null, landed = null, rallyN = 0, maxRally = 0, lastA = -9, smashNow = false, chance = false, pred = null, why = "", tAll = 0, served = 0;
        const TO = P.to;
        const cpuSpd = P.cpuSpd * ({ easy: 0.75, normal: 0.92, hard: 1.08, ultra: 1.22 }[D] || 1);
        const cpuErr = { easy: 0.2, normal: 0.11, hard: 0.06, ultra: 0.035 }[D] || 0.1;
        const cpuReact = { easy: 0.34, normal: 0.24, hard: 0.16, ultra: 0.1 }[D] || 0.2;
        const cpuPow = { easy: 0.88, normal: 1, hard: 1.1, ultra: 1.2 }[D] || 1;
        const mySpd = P.mySpd;
        function solve(from, tx, tz, Tt) {
          const ty = surfAt(tx, tz) + R; let Tf = Tt;
          for (let i = 0; i < 14; i++) {
            const vx = (tx - from.x) / Tf, vz = (tz - from.z) / Tf, vy = (ty - from.y + 0.5 * g * Tf * Tf) / Tf;
            const tn = (HALF - from.z) / vz; const yn = from.y + vy * tn - 0.5 * g * tn * tn;
            if (tn <= 0 || yn > NET + P.netMargin) return new T.Vector3(vx, vy, vz);
            Tf *= 1.08;
          }
          const vx = (tx - from.x) / Tf, vz = (tz - from.z) / Tf, vy = (ty - from.y + 0.5 * g * Tf * Tf) / Tf; return new T.Vector3(vx, vy, vz);
        }
        // その面（z=zp）を通るときの x と高さを予測（バウンドもふくむ）
        function predict(zp) {
          const p = pos.clone(), v = vel.clone(), h = 1 / 120;
          for (let i = 0; i < 600; i++) {
            const pz = p.z; v.y -= g * h; p.addScaledVector(v, h);
            const s = surfAt(p.x, p.z); if (p.y < s + R && v.y < 0) { p.y = s + R; v.y = -v.y * P.bounce; v.x *= P.fric; v.z *= P.fric; }
            if ((pz - zp) * (p.z - zp) <= 0) return { x: p.x, y: p.y, t: i * h };
          }
          return null;
        }
        function rallyRate() { return Math.min(1, rallyN / P.rampN); }
        function shoot(who, tx, tz, Tt) {
          hitter = who; landed = null; vel.copy(solve(pos, tx, tz, Tt));
          mark.position.set(tx, surfAt(tx, tz) + 0.012, tz); mark.material.opacity = 0;
          rallyN++; maxRally = Math.max(maxRally, rallyN);
          S.pop(); FX.SFX.hit && 0;
          if (who === "cpu") { pred = null; setTimeout(() => { if (!ctx.st.dead && hitter === "cpu") pred = predict(PZ); }, 0); }
          else { cpuThink(); }
        }
        // CPU がどこへ動くか（反応のおくれ＋少しのずれ）
        let cpuWait = 0;
        function cpuThink() { cpuWait = cpuReact; const pr = predict(CZ); cTarget = pr ? pr.x + rnd(-1, 1) * P.reach * (0.35 + (1 - cpuPow) * 0.6) : cx; }
        function point(toMe, msg) {
          if (phase !== "rally" && phase !== "serveFly") return;
          phase = "point"; tP = 0; why = msg;
          if (toMe) { my++; ctx.big(msg, 1.3, "#69db7c"); ctx.say("あなたのポイント！", 1.3); S.cheer && S.cheer(); FX.SFX.star(); } else { op++; ctx.big(msg, 1.3, "#ff8787"); ctx.say("あいてのポイント", 1.3); FX.SFX.crash && FX.SFX.hit(); }
          mark.material.opacity = 0; glow.material.opacity = 0;
          hud();
        }
        function hud() { ctx.hud({ big: "あなた " + my + " - " + op + " あいて", sub: TO + "点先取" + (rallyN > 2 ? "・ラリー " + rallyN : ""), sub2: phase === "serve" && server === "me" ? "スペースでサーブ" : "", right: "最長ラリー <b>" + maxRally + "</b>" }); }
        function resetServe() {
          phase = "serve"; tP = 0; hitter = null; landed = null; rallyN = 0; smashNow = false; chance = false; pred = null;
          const tot = my + op; server = Math.floor(tot / 2) % 2 === 0 ? "me" : "cpu";
          vel.set(0, 0, 0); trail.forEach((m) => (m.visible = false));
          ctx.label("a", server === "me" ? "サーブ" : "スマッシュ");
          hud();
        }
        function bounceAt(x, z) {
          const inn = P.table ? (Math.abs(x) <= W / 2 + R && z >= -R && z <= L + R && pos.y > P.surf * 0.5) : inCourt(x, z);
          const side = z < HALF ? "me" : "cpu";
          S.bounce && S.bounce();
          if (landed == null) {
            if (!inn) { point(hitter === "cpu", "アウト！"); return; }
            if (side === hitter) { point(hitter === "cpu", "ネット！"); return; }
            landed = side; mark.position.set(x, surfAt(x, z) + 0.012, z); mark.material.opacity = 0.7;
            if (side === "me") { chance = pred && pred.y > P.smashY; }
          } else {
            // 2回目のバウンド＝受ける側が返せなかった
            point(landed === "cpu", landed === "cpu" ? "決まった！" : "とれなかった");
          }
        }
        function myHit() {
          const off = clamp((pos.x - (px)) / P.reach, -1, 1); // 世界の x（画面では左が +）
          const recent = tAll - lastA < 0.35 || inp.held.a;
          const high = pos.y > P.smashY;
          const aim = -inp.x(); // 画面右＝世界 -x
          let tx = clamp(off * W * 0.42 + aim * W * 0.3 + rnd(-0.05, 0.05) * W, -W * 0.62, W * 0.62);
          if (Math.abs(off) < 0.85) tx = clamp(tx, -W / 2 + P.edge, W / 2 - P.edge);
          let tz = lerp(P.tzMin, P.tzMax, 0.45 + Math.random() * 0.45);
          let Tt = P.flight * lerp(1, P.fastMul, rallyRate()) * (1 / Math.sqrt(sk));
          smashNow = false;
          if (recent && high) { smashNow = true; Tt *= 0.52; tz = lerp(P.tzMin, P.tzMax, 0.7 + Math.random() * 0.3); ctx.big("スマッシュ！", 0.9, "#ffe066"); ctx.shake.add(0.25); FX.SFX.boost(); ctx.fx3.burst(pos.clone(), [0xffe066, 0xffffff], 14, 2, 0.4); }
          else if (recent) { Tt *= 0.8; if (Math.random() < 0.15) tx = Math.sign(tx || 1) * (W / 2 + P.edge * 2); }
          swing.me = 0; swing.meSide = pos.x - meA.g.position.x > 0 ? 1 : -1;
          shoot("me", tx, tz, Tt);
        }
        function cpuHit() {
          const err = Math.random() < cpuErr + rallyN * 0.01 + (smashNow ? 0.4 : 0);
          let tx = rnd(-1, 1) * (W / 2 - P.edge), tz = lerp(L - P.tzMax, L - P.tzMin, Math.random());
          let Tt = P.flight * lerp(1, P.fastMul, rallyRate()) / cpuPow;
          if (err) { if (Math.random() < 0.5) tx = Math.sign(rnd(-1, 1)) * (W / 2 + P.edge * 3); else tz = L - P.tzMin * 0.2 - (P.table ? 0 : 1.5); }
          // たまにふわっとしたチャンスボール
          const lob = !err && Math.random() < { easy: 0.3, normal: 0.2, hard: 0.12, ultra: 0.08 }[D];
          if (lob) Tt *= 1.5;
          smashNow = false; swing.cpu = 0; swing.cpuSide = pos.x - cpuA.g.position.x < 0 ? 1 : -1;
          shoot("cpu", tx, tz, Tt);
          if (lob) { const p0 = pos.clone(), v0 = vel.clone(); vel.y *= 1.0; pos.copy(p0); vel.copy(v0); }
        }
        // ---- カメラ ----
        const camL = new T.Vector3(); const C = P.cam;
        camera.position.set(C[0], C[1], C[2]); camL.set(C[3], C[4], C[5]); camera.lookAt(camL);
        resetServe();
        ctx.say(TO + "点先取！ スペースでサーブ", 2.2);
        return {
          dbg: () => ({ phase, my, op, server, px, cx, hitter, landed, rallyN, ball: { x: pos.x, y: pos.y, z: pos.z, vz: vel.z }, pred, PZ, reach: P.reach, chance }),
          step(dt, t) {
            tAll = t; const aHit = inp.hit("a"); if (aHit) lastA = t;
            tP += dt;
            // プレイヤーの移動
            const ix = phase === "point" ? 0 : -inp.x();
            pv = lerp(pv, ix * mySpd, Math.min(1, dt * 12));
            px = clamp(px + pv * dt, -P.xr, P.xr);
            const handOff = P.handOff;
            meA.g.position.set(px - handOff, 0, PZ - P.bodyBack);
            // CPU の移動
            if (cpuWait > 0) cpuWait -= dt; else if (hitter === "me" || phase === "rally") { const d = cTarget - cx; cx += clamp(d, -cpuSpd * dt, cpuSpd * dt); }
            if (phase === "serve" && server === "cpu") cx = lerp(cx, 0, dt * 2);
            if (phase === "point") cx = lerp(cx, 0, dt);
            cpuA.g.position.set(cx + handOff, 0, CZ + P.bodyBack);
            if (swing.me >= 0) { swing.me += dt * 5; if (swing.me > 1.6) swing.me = -1; }
            if (swing.cpu >= 0) { swing.cpu += dt * 5; if (swing.cpu > 1.6) swing.cpu = -1; }
            pose(meA, swing.me, swing.meSide, Math.min(1, Math.abs(pv) / mySpd), t * 12);
            pose(cpuA, swing.cpu, swing.cpuSide, Math.min(1, Math.abs(cpuWait > 0 ? 0 : cTarget - cx) * 3), t * 12);
            // サーブ
            if (phase === "serve") {
              const sx = server === "me" ? px : cx, sz = server === "me" ? PZ + 0.05 : CZ - 0.05;
              pos.set(sx, P.serveY + Math.abs(Math.sin(t * 3.2)) * P.toss, sz);
              if (server === "me") {
                if (ctx.st.go && aHit) {
                  phase = "serveFly"; served++; swing.me = 0; swing.meSide = 1;
                  const aim = -inp.x();
                  const tx = clamp(aim * W * 0.3 + rnd(-0.12, 0.12) * W, -W / 2 + P.edge, W / 2 - P.edge);
                  shoot("me", tx, lerp(P.tzMin, P.tzMax, 0.55 + Math.random() * 0.35), P.flight * 1.05 / Math.sqrt(sk)); rallyN = 0; hud();
                }
              } else if (tP > 1.3 && ctx.st.go) {
                phase = "serveFly"; swing.cpu = 0; swing.cpuSide = 1;
                shoot("cpu", rnd(-1, 1) * (W / 2 - P.edge * 1.5), lerp(L - P.tzMax, L - P.tzMin, 0.3 + Math.random() * 0.5), P.flight * 1.1); rallyN = 0;
              }
            } else if (phase === "serveFly" || phase === "rally") {
              if (phase === "serveFly") phase = "rally";
              const N = 4, h = dt / N;
              for (let i = 0; i < N && phase === "rally"; i++) {
                const p0z = pos.z, p0y = pos.y;
                vel.y -= g * h; pos.addScaledVector(vel, h);
                // ネット
                if ((p0z - HALF) * (pos.z - HALF) <= 0 && pos.y < NET && Math.abs(pos.x) < W / 2 + P.netOver) { pos.z = HALF - Math.sign(vel.z) * R; vel.z *= -0.15; vel.x *= 0.3; S.swish && S.swish(); }
                const s = surfAt(pos.x, pos.z);
                if (pos.y < s + R && vel.y < 0 && p0y >= s + R - 0.02) { pos.y = s + R; vel.y = -vel.y * P.bounce; vel.x *= P.fric; vel.z *= P.fric; bounceAt(pos.x, pos.z); }
                else if (pos.y < R && vel.y < 0) { pos.y = R; vel.y = -vel.y * P.bounce * 0.8; vel.x *= 0.8; vel.z *= 0.8; bounceAt(pos.x, pos.z); }
                if (phase !== "rally") break;
                // 打ち返し
                if (hitter === "cpu" && (p0z - PZ) * (pos.z - PZ) <= 0) {
                  if (landed === "me" && Math.abs(pos.x - px) < P.reach && pos.y > P.hitY[0] && pos.y < P.hitY[1]) { pos.z = PZ; myHit(); }
                  else if (landed === "me") { swing.me = 0; swing.meSide = pos.x > px ? 1 : -1; }
                } else if (hitter === "me" && (p0z - CZ) * (pos.z - CZ) <= 0) {
                  if (landed === "cpu" && Math.abs(pos.x - cx) < P.reach * 1.05 && pos.y > P.hitY[0] && pos.y < P.hitY[1] && !(smashNow && Math.random() < 0.6 - (cpuPow - 1))) { pos.z = CZ; cpuHit(); }
                  else if (landed === "cpu") { swing.cpu = 0; }
                }
                // 遠くへ行った
                if (pos.z < -P.far || pos.z > L + P.far || Math.abs(pos.x) > W + P.far) { if (landed) point(landed === "cpu", landed === "cpu" ? "決まった！" : "とれなかった"); else point(hitter === "cpu", "アウト！"); }
              }
              if (hitter === "cpu" && !pred) pred = predict(PZ);
              chance = hitter === "cpu" && landed === "me" && pred && pred.y > P.smashY;
              glow.material.opacity = chance ? 0.35 + Math.sin(t * 18) * 0.15 : 0;
              ctx.label("a", "スマッシュ");
            } else if (phase === "point") {
              vel.y -= g * dt; pos.addScaledVector(vel, dt); if (pos.y < R) { pos.y = R; vel.y = Math.abs(vel.y) * 0.4; vel.x *= 0.7; vel.z *= 0.7; }
              if (tP > 1.6) {
                if (my >= TO || op >= TO) {
                  phase = "end"; const win = my > op;
                  ctx.end({ win, title: win ? "勝ち！ " + my + " 対 " + op : "負け… " + my + " 対 " + op, text: TO + "点先取の試合。最長ラリー " + maxRally + "回。", metric: { v: my - op, unit: "点差", lower: false, label: "点差" } });
                } else resetServe();
              }
            }
            mark.material.opacity = Math.max(0, mark.material.opacity - dt * 0.8);
            ball.position.copy(pos); ball.rotation.x += dt * 25; ball.rotation.y += dt * 9;
            const sh = surfAt(pos.x, pos.z); bsh.position.set(pos.x, sh, pos.z); const ss = Math.max(0.3, 1 - (pos.y - sh) * P.shScale); bsh.scale.set(ss, ss, ss);
            for (let i = trail.length - 1; i > 0; i--) { trail[i].position.copy(trail[i - 1].position); trail[i].visible = trail[i - 1].visible; }
            trail[0].position.copy(pos); trail[0].visible = phase === "rally" && vel.lengthSq() > P.trailV;
            // カメラ（プレイヤーを少し追う）
            const camX = px * P.camFollow, lookX = lerp(px, pos.x, 0.4) * P.camFollow * 0.8;
            camera.position.x = lerp(camera.position.x, camX, dt * 3); camL.x = lerp(camL.x, lookX, dt * 3); camera.lookAt(camL);
            if (P.anim) P.anim(t, dt, phase === "point" && why);
          }
        };
      }
    });
  }

  // ---- 卓球 ----
  rally({
    id: "pingpong", e: "🏓", n: "卓球", c: "#0b7285", to: 7,
    d: "3Dの卓球台でラリー！←→で動いて、ボールに近づくと自動で打ち返すよ。ラケットのはしで打つと角度がつく。光るボールはスペースでスマッシュ。7点先取！",
    L: 2.74, W: 1.525, surf: 0.76, netH: 0.1525, netMargin: 0.03, netOver: 0.15, ballR: 0.022, ballCol: 0xff922b, g: 9.8, bounce: 0.78, fric: 0.97,
    table: true, plane: -0.22, bodyBack: 0.32, handOff: 0.42, reach: 0.3, xr: 1.25, mySpd: 2.7, cpuSpd: 2.4,
    hitY: [0.7, 1.75], smashY: 1.2, serveY: 1.0, toss: 0.25, tzMin: 1.55 + 0.1, tzMax: 2.62, edge: 0.07, flight: 0.56, fastMul: 0.72, rampN: 16,
    markR: 0.06, far: 4, shScale: 0.8, trailV: 4, camFollow: 0.55,
    cam: [0, 2.75, -3.15, 0, 0.55, 2.0], fov: 50, sky: 0x26324a, fog: 0x26324a, fogNear: 14, fogFar: 40, far: 80, hemiI: 0.95, sunI: 0.75,
    racket(T) {
      const r = new T.Group();
      cyl(T, r, 0.016, 0.016, 0.1, 8, 0x8d5a2b, 0, -0.05, 0);
      const f = cyl(T, r, 0.075, 0.075, 0.012, 16, 0xe03131, 0, -0.17, 0); f.rotation.z = Math.PI / 2;
      const bk = cyl(T, r, 0.075, 0.075, 0.004, 16, 0x212529, 0.009, -0.17, 0); bk.rotation.z = Math.PI / 2;
      return r;
    },
    build(T, scene) {
      // 体育館の床・かべ
      const floor = new T.MeshLambertMaterial({ map: (() => { const t = stripeTex(T, "#c98b4f", "#bf8247", 6); t.repeat.set(8, 1); return t; })() });
      flat(T, scene, 24, 30, floor, 0, 0, 1.4);
      flat(T, scene, 7.5, 12, lam(T, 0x2f5d8a), 0, 0.006, 1.37);
      // まわりの赤いフェンス
      const fence = [];
      for (let i = -5; i <= 5; i++) { fence.push({ x: i * 0.72, y: 0.36, z: -4.2 }); fence.push({ x: i * 0.72, y: 0.36, z: 7.0 }); }
      for (let i = -3; i <= 10; i++) { fence.push({ x: -3.75, y: 0.36, z: -4.2 + i * 0.8 * 0.95 + 2.4, ry: Math.PI / 2 }); fence.push({ x: 3.75, y: 0.36, z: -4.2 + i * 0.8 * 0.95 + 2.4, ry: Math.PI / 2 }); }
      inst(T, scene, new T.BoxGeometry(0.7, 0.7, 0.06), lam(T, 0xc92a2a), fence);
      // かべ・窓
      const wallTex = K.windowsTex ? K.windowsTex(T) : null;
      const wm = new T.MeshLambertMaterial({ color: 0x4a5a78 });
      box(T, scene, 26, 9, 0.3, 0x46536d, 0, 4.5, 13); box(T, scene, 0.3, 9, 30, 0x3f4b63, -12, 4.5, 1.4); box(T, scene, 0.3, 9, 30, 0x3f4b63, 12, 4.5, 1.4); box(T, scene, 26, 9, 0.3, 0x46536d, 0, 4.5, -11);
      const ban = new T.Mesh(new T.PlaneGeometry(5, 1.0), new T.MeshBasicMaterial({ map: textTex(T, "ほしの学園 卓球大会", { w: 512, h: 100, bg: "#1864ab", fg: "#ffe066", fs: 54 }) })); ban.position.set(0, 1.25, 12.8); ban.rotation.y = Math.PI; scene.add(ban);
      // 天井のライト
      inst(T, scene, new T.BoxGeometry(2.2, 0.12, 0.5), new T.MeshBasicMaterial({ color: 0xfff9db }), [{ x: -3, y: 8, z: 0 }, { x: 3, y: 8, z: 0 }, { x: -3, y: 8, z: 5 }, { x: 3, y: 8, z: 5 }, { x: 0, y: 8, z: 9 }]);
      // 観客
      crowdStand(T, scene, -7.5, 1.4, Math.PI / 2, 12, 4, 31); crowdStand(T, scene, 7.5, 1.4, -Math.PI / 2, 12, 4, 37);
      // 卓球台
      const top = new T.Mesh(new T.BoxGeometry(1.525, 0.03, 2.74), new T.MeshLambertMaterial({ map: KIT.canvasTex(T, 128, 256, (c, w, h) => { c.fillStyle = "#1b4f8a"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.fillRect(0, 0, w, 4); c.fillRect(0, h - 4, w, 4); c.fillRect(0, 0, 4, h); c.fillRect(w - 4, 0, 4, h); c.fillRect(w / 2 - 1, 0, 2, h); }) }));
      top.position.set(0, 0.745, 1.37); scene.add(top);
      [[-0.65, 0.2], [0.65, 0.2], [-0.65, 2.54], [0.65, 2.54]].forEach(([x, z]) => box(T, scene, 0.05, 0.73, 0.05, 0x343a40, x, 0.365, z));
      box(T, scene, 1.3, 0.05, 0.05, 0x343a40, 0, 0.2, 1.37);
      // ネット
      const net = new T.Mesh(new T.PlaneGeometry(1.83, 0.1525), new T.MeshBasicMaterial({ map: KIT.canvasTex(T, 128, 16, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 1; for (let x = 0; x <= w; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.fillStyle = "#fff"; c.fillRect(0, 0, w, 3); }), transparent: true, side: T.DoubleSide, depthWrite: false }));
      net.position.set(0, 0.76 + 0.076, 1.37); scene.add(net);
      [-0.915, 0.915].forEach((x) => box(T, scene, 0.03, 0.18, 0.06, 0x212529, x, 0.84, 1.37));
      // スコア表示の台
      box(T, scene, 0.6, 0.9, 0.3, 0x343a40, 1.6, 0.45, 1.37);
    }
  });

  // ---- テニス ----
  rally({
    id: "tennis", e: "🎾", n: "テニス", c: "#1c7ed6", to: 5,
    d: "3Dのテニスコートでラリー！←→で動いて、ボールに近づくと自動で打ち返すよ。ラケットのはしで打つと角度がつく。光るボールはスペースでスマッシュ。5点先取！",
    L: 23.77, W: 8.23, surf: 0, netH: 0.95, netMargin: 0.25, netOver: 1.0, ballR: 0.07, ballCol: 0xd8f53a, seam: "#ffffff", g: 9.8, bounce: 0.74, fric: 0.86,
    table: false, plane: -0.9, bodyBack: 0.25, handOff: 0.78, reach: 1.15, xr: 6.0, mySpd: 7.2, cpuSpd: 7.6,
    hitY: [0.12, 2.8], smashY: 2.15, serveY: 2.3, toss: 0.6, tzMin: 15.5, tzMax: 22.4, edge: 0.35, flight: 1.45, fastMul: 0.7, rampN: 14,
    markR: 0.22, far: 9, shScale: 0.15, trailV: 60, camFollow: 0.55,
    cam: [0, 3.5, -6.6, 0, 0.6, 11], fov: 52, sky: 0x8ec9ff, fog: 0xbfe0ff, fogNear: 70, fogFar: 180, far: 260,
    racket(T) {
      const r = new T.Group();
      cyl(T, r, 0.018, 0.022, 0.26, 8, 0x212529, 0, -0.1, 0);
      const fr = new T.Mesh(G(T, "rkfr", () => new T.TorusGeometry(0.15, 0.014, 6, 20)), lam(T, 0x1c7ed6)); fr.position.y = -0.4; fr.rotation.y = Math.PI / 2; fr.scale.set(1, 1.25, 1); r.add(fr);
      const st = new T.Mesh(G(T, "rkst", () => new T.CircleGeometry(0.145, 16)), new T.MeshBasicMaterial({ color: 0xf1f3f5, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false })); st.position.y = -0.4; st.rotation.y = Math.PI / 2; st.scale.set(1, 1.25, 1); r.add(st);
      return r;
    },
    build(T, scene) {
      const L = 23.77, W = 8.23, D2 = 10.97;
      flat(T, scene, 60, 80, lam(T, 0x3f8f5a), 0, -0.01, L / 2);
      flat(T, scene, 18.5, 36.6, lam(T, 0x2b8a3e), 0, 0.0, L / 2);
      flat(T, scene, D2 + 0.4, L + 0.4, lam(T, 0x1971c2), 0, 0.004, L / 2);
      const lw = 0.06, lm = new T.MeshBasicMaterial({ color: 0xffffff });
      const line = (w, d, x, z) => flat(T, scene, w, d, lm, x, 0.009, z);
      line(D2, lw, 0, 0); line(D2, lw, 0, L); // ベースライン
      [-D2 / 2, D2 / 2, -W / 2, W / 2].forEach((x) => line(lw, L, x, L / 2));
      line(W, lw, 0, L / 2 - 6.4); line(W, lw, 0, L / 2 + 6.4); line(lw, 12.8, 0, L / 2);
      line(lw, 0.25, 0, 0.12); line(lw, 0.25, 0, L - 0.12);
      // ネット
      const net = new T.Mesh(new T.PlaneGeometry(12.8, 1.0), new T.MeshBasicMaterial({ map: (() => { const t = KIT.canvasTex(T, 256, 32, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = "rgba(20,20,20,.8)"; c.lineWidth = 1; for (let x = 0; x <= w; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.fillStyle = "#fff"; c.fillRect(0, 0, w, 4); }); return t; })(), transparent: true, side: T.DoubleSide, depthWrite: false }));
      net.position.set(0, 0.5, L / 2); scene.add(net);
      [-6.4, 6.4].forEach((x) => cyl(T, scene, 0.05, 0.05, 1.07, 8, 0x343a40, x, 0.535, L / 2));
      // しんぱん台
      const ch = new T.Group(); ch.position.set(7.4, 0, L / 2); scene.add(ch);
      [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(([x, z]) => box(T, ch, 0.06, 1.8, 0.06, 0xf8f9fa, x, 0.9, z));
      box(T, ch, 0.7, 0.08, 0.7, 0x2b8a3e, 0, 1.8, 0); box(T, ch, 0.7, 0.6, 0.08, 0x2b8a3e, 0.3, 2.1, 0).rotation.y = Math.PI / 2;
      athlete(T, ch, { shirt: 0x343a40, cap: 0xf8f9fa, lod: true }).g.position.set(0, 1.0, 0);
      // フェンス・観客
      const fz = [-6.5, L + 6.5];
      fz.forEach((z) => { box(T, scene, 18.5, 3.0, 0.08, 0x1e4d2b, 0, 1.5, z); const sg = new T.Mesh(new T.PlaneGeometry(8, 0.9), new T.MeshBasicMaterial({ map: textTex(T, "HOSHI OPEN", { w: 512, h: 64, bg: "#1e4d2b", fg: "#ffffff", fs: 40 }) })); sg.position.set(0, 1.4, z + (z < 0 ? 0.06 : -0.06)); if (z > 0) sg.rotation.y = Math.PI; scene.add(sg); });
      [-9.25, 9.25].forEach((x) => box(T, scene, 0.08, 1.2, 36.6, 0x1e4d2b, x, 0.6, L / 2));
      crowdStand(T, scene, -13, L / 2, Math.PI / 2, 30, 6, 41); crowdStand(T, scene, 13, L / 2, -Math.PI / 2, 30, 6, 43);
      crowdStand(T, scene, 0, L + 9.5, Math.PI, 20, 5, 47);
      lightTower(T, scene, -16, -4, 16); lightTower(T, scene, 16, -4, 16); lightTower(T, scene, -16, L + 4, 16); lightTower(T, scene, 16, L + 4, 16);
      // 遠くの木
      const tr = []; for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; tr.push({ x: Math.cos(a) * 45, y: 3, z: L / 2 + Math.sin(a) * 55, s: 1 + (i % 3) * 0.3 }); }
      inst(T, scene, new T.ConeGeometry(2.2, 6, 7), lam(T, 0x2f6b3c), tr);
    }
  });

  // =====================================================================
  // バスケ：スリーポイントショット（スペースを長押しして、パワーが緑のところで放す）
  // =====================================================================
  HM3D.register({
    id: "basket", e: "🏀", n: "スリーポイントショット", c: "#f76707", genre: "sports", title: "スリーポイントショット",
    d: "3Dのアリーナでスリーポイント！←→で5か所のシュート位置を移動。スペース（シュート）を長押しして、パワーが緑のところで放すと入りやすい。45秒であいてより多く点をとれば勝ち。3本連続で得点2倍！",
    help: "←→ でシュートする場所を変える<br>「シュート」を長押し → パワーが緑のところで放す<br>3本連続で入ると得点2倍！",
    arrows: "lr", buttons: [{ k: "a", label: "シュート", cls: "go big" }],
    sky: 0x1d2333, fog: 0x1d2333, fogNear: 30, fogFar: 80, far: 120, fov: 55, hemiI: 0.95, sunI: 0.7,
    setup(ctx) {
      const { T, scene, camera, inp, S, FX } = ctx;
      const D = ctx.diff, me = partnerColor(T, 0xe03131);
      const RIM = new T.Vector3(0, 3.05, 0), RR = 0.23, BR = 0.12, BOARD = 0.39, g = 9.8;
      // ---- コート ----
      const wood = new T.MeshLambertMaterial({ map: (() => { const t = stripeTex(T, "#d9a066", "#cf955b", 8); t.repeat.set(1, 6); return t; })() });
      flat(T, scene, 30, 32, wood, 0, 0, -6);
      flat(T, scene, 60, 60, lam(T, 0x2b2f3d), 0, -0.02, -6);
      const paint = lam(T, 0x1864ab);
      flat(T, scene, 4.9, 5.8, paint, 0, 0.004, -1.325);
      disc(T, scene, 1.8, paint, 0, 0.005, -4.225, 24);
      const lm = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide });
      // スリーポイントライン（リングの中心から 6.75m）
      const arc = new T.Mesh(new T.RingGeometry(6.72, 6.78, 64, 1, Math.PI * 0.05, Math.PI * 0.9), lm); arc.rotation.x = -Math.PI / 2; arc.position.set(0, 0.008, 0); scene.add(arc);
      [-1, 1].forEach((s) => flat(T, scene, 0.06, 2.63, lm, s * 6.75 * Math.cos(Math.PI * 0.05), 0.008, 0.26));
      flat(T, scene, 15, 0.06, lm, 0, 0.008, 1.575); // エンドライン
      flat(T, scene, 0.06, 5.8, lm, -2.45, 0.009, -1.325); flat(T, scene, 0.06, 5.8, lm, 2.45, 0.009, -1.325); flat(T, scene, 4.9, 0.06, lm, 0, 0.009, -4.225);
      // ゴール
      const post = new T.Group(); post.position.set(0, 0, 1.2); scene.add(post);
      box(T, post, 0.9, 0.4, 0.9, 0x343a40, 0, 0.2, 0.4);
      cyl(T, post, 0.1, 0.12, 3.6, 10, 0x495057, 0, 1.8, 0.4);
      box(T, post, 0.12, 0.12, 1.1, 0x495057, 0, 3.55, -0.15);
      const boardM = new T.Mesh(new T.BoxGeometry(1.8, 1.05, 0.04), new T.MeshLambertMaterial({ color: 0xe7f5ff, transparent: true, opacity: 0.55 }));
      boardM.position.set(0, 3.38, BOARD + 0.02); scene.add(boardM);
      const bl = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.8, 1.05, 0.04)), new T.LineBasicMaterial({ color: 0xffffff })); bl.position.copy(boardM.position); scene.add(bl);
      const sq = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(0.59, 0.45)), new T.LineBasicMaterial({ color: 0xe8590c })); sq.position.set(0, 3.28, BOARD - 0.005); scene.add(sq);
      const rim = new T.Mesh(new T.TorusGeometry(RR, 0.018, 6, 28), lam(T, 0xf76707)); rim.rotation.x = Math.PI / 2; rim.position.copy(RIM); scene.add(rim);
      box(T, scene, 0.06, 0.04, 0.17, 0xf76707, 0, 3.05, RR + 0.07);
      // ネット（ワイヤーの円すい台）
      const netGeo = new T.CylinderGeometry(RR, RR * 0.6, 0.42, 12, 3, true);
      const net = new T.Mesh(netGeo, new T.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.85 }));
      net.position.set(0, 3.05 - 0.21, 0); scene.add(net);
      // 観客・ライト・スコアボード
      const stands = [crowdStand(T, scene, -11, -5, Math.PI / 2, 22, 6, 51), crowdStand(T, scene, 11, -5, -Math.PI / 2, 22, 6, 53), crowdStand(T, scene, 0, 7, Math.PI, 20, 6, 57)];
      inst(T, scene, new T.BoxGeometry(3, 0.15, 0.6), new T.MeshBasicMaterial({ color: 0xfff9db }), [{ x: -4, y: 11, z: -2 }, { x: 4, y: 11, z: -2 }, { x: -4, y: 11, z: -9 }, { x: 4, y: 11, z: -9 }]);
      const sbC = document.createElement("canvas"); sbC.width = 256; sbC.height = 128; const sbT = new T.CanvasTexture(sbC); sbT.colorSpace = T.SRGBColorSpace;
      const sb = new T.Mesh(new T.PlaneGeometry(4, 2), new T.MeshBasicMaterial({ map: sbT })); sb.position.set(0, 7.6, 6.6); sb.rotation.y = Math.PI; scene.add(sb);
      box(T, scene, 4.3, 2.3, 0.2, 0x111111, 0, 7.6, 6.75);
      // ---- 選手とボール ----
      const pl = athlete(T, scene, { shirt: me, pants: me, stripe: 0xffffff, sock: 0xffffff, sleeve: false, noBake: true }); bakeTree(T, pl.g);
      const ball = new T.Group(); scene.add(ball);
      const bt = KIT.canvasTex(T, 128, 64, (c, w, h) => { c.fillStyle = "#e8590c"; c.fillRect(0, 0, w, h); c.strokeStyle = "#2b1a0e"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(w / 4, 0); c.lineTo(w / 4, h); c.moveTo(w * 3 / 4, 0); c.lineTo(w * 3 / 4, h); c.stroke(); });
      ball.add(new T.Mesh(new T.SphereGeometry(BR, 16, 12), new T.MeshLambertMaterial({ map: bt })));
      const fire = new T.Mesh(new T.SphereGeometry(BR * 1.7, 12, 8), new T.MeshBasicMaterial({ color: 0xff6b00, transparent: true, opacity: 0, depthWrite: false })); ball.add(fire);
      const bsh = softShadow(T, scene, 0.5, 0.5);
      // ---- シュート位置（画面の右へ行くほど index が大きい） ----
      const ANG = [-68, -34, 0, 34, 68].map((a) => a * Math.PI / 180);
      const spotPos = (i) => new T.Vector3(Math.sin(ANG[i]) * 7.0, 0, -Math.cos(ANG[i]) * 7.0); // カメラは +z 向き → 画面右は -x。sin が正だと…
      // 画面右＝世界 -x にしたいので、index が大きいほど x を小さく
      const spot = (i) => { const p = spotPos(i); p.x = -p.x; return p; };
      let si = 2, walkFrom = spot(2), walkTo = spot(2), walkT = 1;
      // ---- パワーゲージ（緑のゾーンつき） ----
      const gw = document.createElement("div");
      gw.style.cssText = "position:absolute;left:50%;bottom:150px;transform:translateX(-50%);width:min(70vw,320px);height:28px;border-radius:14px;background:rgba(0,0,0,.55);border:3px solid rgba(255,255,255,.85);overflow:hidden;pointer-events:none;z-index:5;transition:opacity .15s";
      const gz = document.createElement("div"); gz.style.cssText = "position:absolute;top:0;bottom:0;background:rgba(64,192,87,.9);border-left:3px solid #fff;border-right:3px solid #fff;box-sizing:border-box;color:#fff;font:bold 14px/22px sans-serif;text-align:center;text-shadow:0 1px 2px #000"; gz.textContent = "★";
      const gf = document.createElement("div"); gf.style.cssText = "position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ffd43b,#ff922b);opacity:.5;width:0";
      const gn = document.createElement("div"); gn.style.cssText = "position:absolute;top:0;bottom:0;width:6px;background:#fff;box-shadow:0 0 4px #000;left:0";
      gw.append(gf, gz, gn); ctx.body.appendChild(gw); // 第10回：緑のゾーンを、たまっていく色の上に出して見やすく
      const ZW = { easy: 0.2, normal: 0.13, hard: 0.085, ultra: 0.07 }[D] || 0.13;
      let zc = 0.7;
      const newZone = () => { zc = rnd(0.55, 0.85); gz.style.left = ((zc - ZW / 2) * 100) + "%"; gz.style.width = (ZW * 100) + "%"; };
      newZone();
      // ---- 状態 ----
      const TIME = 45, CPU = { easy: 15, normal: 24, hard: 33, ultra: 42 }[D] || 24;
      let phase = "ready", tP = 0, pw = 0, pdir = 1, left = TIME, score = 0, made = 0, shots = 0, combo = 0, scored = false, rimHits = 0, netWob = 0, joy = 0;
      const pos = new T.Vector3(), vel = new T.Vector3();
      const rimPts = []; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; rimPts.push(new T.Vector3(RIM.x + Math.cos(a) * RR, RIM.y, RIM.z + Math.sin(a) * RR)); }
      const camL = new T.Vector3().copy(RIM); camL.y = 2.75;
      function drawSB() { const c = sbC.getContext("2d"); c.fillStyle = "#111"; c.fillRect(0, 0, 256, 128); c.font = "bold 30px sans-serif"; c.textAlign = "center"; c.fillStyle = "#ffd43b"; c.fillText(Math.ceil(left) + "", 128, 40); c.fillStyle = "#69db7c"; c.fillText("きみ " + score, 70, 100); c.fillStyle = "#ff8787"; c.fillText("あいて " + CPU, 186, 100); sbT.needsUpdate = true; }
      let sbLast = -1;
      function hud() { ctx.hud({ big: score + "点", sub: "のこり " + Math.ceil(left) + "秒", sub2: combo >= 3 ? "🔥 得点2倍中！（" + combo + "本連続）" : combo ? combo + "本連続" : "", right: "あいて <b>" + CPU + "</b> 点" }); }
      function release() {
        const p = pw; shots++;
        const st = spot(si), from = new T.Vector3(st.x, 2.35, st.z);
        const toR0 = new T.Vector3(RIM.x - from.x, 0, RIM.z - from.z).normalize(); from.addScaledVector(toR0, 0.25);
        const toR = new T.Vector3(RIM.x - from.x, 0, RIM.z - from.z), d = toR.length(); toR.normalize();
        const th = 52 * Math.PI / 180, h = RIM.y - from.y;
        const vI = Math.sqrt((g * d * d) / (2 * Math.cos(th) ** 2 * (d * Math.tan(th) - h)));
        const v = vI * (1 + 0.003 + ((p - zc) / (ZW / 2)) * 0.0095 + rnd(-0.002, 0.002));
        const side = rnd(-1, 1) * (0.003 + Math.abs(p - zc) * 0.04);
        const dir = toR.clone().applyAxisAngle(new T.Vector3(0, 1, 0), side);
        pos.copy(from); vel.set(dir.x * v * Math.cos(th), v * Math.sin(th), dir.z * v * Math.cos(th));
        phase = "fly"; tP = 0; scored = false; rimHits = 0;
        S.swish && S.throwS && S.throwS();
        const inZ = Math.abs(p - zc) <= ZW / 2;
        ctx.say(inZ ? "いいタイミング！" : p < zc ? "ちょっと弱い…" : "ちょっと強い…", 0.9);
      }
      drawSB(); hud();
      return {
        dbg: () => ({ phase, pw, zc, ZW, score, made, shots, combo, left, si, px: pl.g.position.x, pz: pl.g.position.z }),
        step(dt, t) {
          tP += dt; joy = Math.max(0, joy - dt * 0.5);
          if (ctx.st.go && phase !== "end") left = Math.max(0, left - dt);
          const aDown = inp.hit("a"), aUp = inp.up("a");
          // 移動
          if (phase === "ready" || phase === "fly" || phase === "after") {
            const nx = inp.hit("right") ? 1 : inp.hit("left") ? -1 : 0;
            if (nx && walkT >= 1 && phase === "ready") { const ns = clamp(si + nx, 0, 4); if (ns !== si) { walkFrom = pl.g.position.clone(); si = ns; walkTo = spot(si); walkT = 0; newZone(); S.ui && S.ui(); } }
          }
          if (walkT < 1) { walkT = Math.min(1, walkT + dt * 2.6); pl.g.position.lerpVectors(walkFrom, walkTo, walkT); runPose(pl, t * 14, 0.8); }
          else { pl.g.position.copy(spot(si)); }
          pl.g.rotation.y = Math.atan2(RIM.x - pl.g.position.x, RIM.z - pl.g.position.z);
          // カメラ（選手の後ろ）
          const sp = pl.g.position, back = new T.Vector3(sp.x - RIM.x, 0, sp.z - RIM.z).normalize();
          const cp = new T.Vector3(sp.x + back.x * 4.2 + back.z * 0.95, 3.25, sp.z + back.z * 4.2 - back.x * 0.95);
          camera.position.lerp(cp, Math.min(1, dt * 4)); camera.lookAt(camL);
          if (phase === "ready") {
            const hand = new T.Vector3(sp.x, 1.25 + Math.abs(Math.sin(t * 6)) * 0 , sp.z).addScaledVector(back, -0.35);
            if (walkT >= 1) { pl.armL.rotation.set(-0.9, 0, 0.2); pl.armR.rotation.set(-0.9, 0, -0.2); pl.armL.userData.el.rotation.x = -0.6; pl.armR.userData.el.rotation.x = -0.6; runPose(pl, 0, 0); pl.armL.rotation.set(-0.9, 0, 0.2); pl.armR.rotation.set(-0.9, 0, -0.2); }
            const drib = !inp.held.a && walkT >= 1;
            pos.copy(hand); if (drib) { const b = Math.abs(Math.sin(t * 7)); pos.y = BR + b * 1.0; pos.addScaledVector(back, -0.1); pos.x += (sp.x > 0 ? -1 : 1) * 0; }
            if (inp.held.a && ctx.st.go && walkT >= 1 && left > 0) {
              pw += pdir * dt / 0.95 * (ctx.sk); if (pw >= 1) { pw = 1; pdir = -1; } if (pw <= 0) { pw = 0; pdir = 1; }
              pos.y = 1.7 + pw * 0.4; pl.armL.rotation.x = pl.armR.rotation.x = -2.4 - pw * 0.4; pl.hip.position.y = 0.92 - (1 - pw) * 0.12;
              if (aDown) { pw = 0; pdir = 1; }
            }
            if ((aUp || (!inp.held.a && pw > 0)) && pw > 0 && left > 0) { release(); pl.armL.rotation.x = pl.armR.rotation.x = -2.9; }
            if (left <= 0 && phase === "ready") { phase = "end"; finish(); }
          } else if (phase === "fly") {
            const N = 6, h = dt / N;
            for (let i = 0; i < N; i++) {
              const py = pos.y; vel.y -= g * h; pos.addScaledVector(vel, h);
              // リング
              for (const rp of rimPts) { const d = pos.distanceTo(rp); if (d < BR + 0.018) { const n = pos.clone().sub(rp).normalize(); const vn = vel.dot(n); if (vn < 0) { vel.addScaledVector(n, -1.6 * vn); vel.multiplyScalar(0.86); rimHits++; if (rimHits === 1) S.rim && S.rim(); } pos.copy(rp).addScaledVector(n, BR + 0.019); } }
              // ボード
              if (pos.z + BR > BOARD && pos.z < BOARD + 0.2 && Math.abs(pos.x) < 0.9 && pos.y > 2.85 && pos.y < 3.9 && vel.z > 0) { pos.z = BOARD - BR; vel.z *= -0.55; S.bounce && S.bounce(); }
              // 入った？
              if (!scored && py >= RIM.y && pos.y < RIM.y && vel.y < 0 && Math.hypot(pos.x - RIM.x, pos.z - RIM.z) < RR - BR * 0.45) {
                scored = true; made++; combo++; const pts = combo >= 3 ? 6 : 3; score += pts; netWob = 1; joy = 1.2;
                S.swish && S.swish(); FX.SFX.star(); ctx.big(combo >= 3 ? "+" + pts + " 🔥" : rimHits ? "入った！ +3" : "スウィッシュ！ +3", 1.1, combo >= 3 ? "#ff922b" : "#69db7c");
                if (combo === 3) ctx.say("3本連続！ここから得点2倍！", 1.6);
                ctx.fx3.burst(RIM.clone(), [0xffe066, 0xff922b, 0xffffff], 18, 2.2, 0.6); hud();
                vel.multiplyScalar(0.35);
              }
              // ゆか
              if (pos.y < BR && vel.y < 0) { pos.y = BR; vel.y *= -0.62; vel.x *= 0.8; vel.z *= 0.8; if (Math.abs(vel.y) > 1) S.bounce && S.bounce(); }
            }
            if (tP > 0.25) { pl.armL.rotation.x = pl.armR.rotation.x = lerp(pl.armL.rotation.x, -0.3, dt * 3); pl.hip.position.y = 0.92; }
            if ((scored && tP > 1.0) || tP > 2.3 || (pos.y < 0.5 && tP > 0.8 && !scored && Math.abs(pos.z) > 1.5)) {
              if (!scored) { combo = 0; ctx.big(rimHits ? "おしい！" : "はずれ", 0.9, "#ff8787"); hud(); }
              phase = "after"; tP = 0;
            }
          } else if (phase === "after") {
            vel.y -= g * dt; pos.addScaledVector(vel, dt); if (pos.y < BR) { pos.y = BR; vel.y *= -0.5; }
            if (tP > 0.35) { phase = "ready"; pw = 0; pdir = 1; tP = 0; newZone(); if (left <= 0) { phase = "end"; finish(); } }
          }
          // ゲージ
          gf.style.width = (pw * 100) + "%"; gn.style.left = "calc(" + (pw * 100) + "% - 3px)";
          const inZ = Math.abs(pw - zc) <= ZW / 2; gn.style.background = inZ ? "#b2f2bb" : "#fff"; gw.style.borderColor = inZ ? "#69db7c" : "rgba(255,255,255,.85)";
          gw.style.opacity = phase === "ready" ? "1" : "0.7";
          // ネットのゆれ
          if (netWob > 0) { netWob = Math.max(0, netWob - dt * 1.5); net.scale.set(1 - netWob * 0.15, 1 + Math.sin(t * 30) * netWob * 0.25, 1 - netWob * 0.15); } else net.scale.set(1, 1, 1);
          ball.position.copy(pos); if (phase === "fly") { ball.rotation.x -= dt * 12; }
          fire.material.opacity = combo >= 3 ? 0.35 + Math.sin(t * 20) * 0.12 : 0;
          bsh.position.set(pos.x, 0.01, pos.z); const ss = Math.max(0.3, 1 - pos.y * 0.15); bsh.scale.set(ss, ss, ss);
          if (Math.ceil(left) !== sbLast) { sbLast = Math.ceil(left); drawSB(); hud(); if (sbLast === 10) ctx.say("のこり10秒！", 1.2); }
          cheerCrowd(T, stands[Math.floor(t * 30) % 3], t, joy);
        }
      };
      function finish() {
        const win = score > CPU;
        ctx.end({ win, title: win ? "勝ち！ " + score + " 対 " + CPU : score === CPU ? "引き分け " + score + " 対 " + CPU : "負け… " + score + " 対 " + CPU, text: "45秒で " + shots + "本中 " + made + "本成功（" + score + "点）", metric: { v: score, unit: "点", lower: false, label: "とく点" } });
      }
    }
  });

  // =====================================================================
  // ボウリング：ストライクレーン（位置→向き→強さをスペースで決めて、転がる間は←→でカーブ）
  // =====================================================================
  HM3D.register({
    id: "bowling", e: "🎳", n: "ストライクレーン", c: "#7048e8", genre: "sports", title: "ストライクレーン",
    d: "3Dのボウリング場で5フレーム勝負！←→で立つ位置を決めてスペース、ゆれる矢印の向きでスペース、パワーでスペース。転がっている間は←→でカーブをかけられるよ。あいてより高い点なら勝ち。",
    help: "①←→で位置 → スペース　②ゆれる矢印 → スペース<br>③パワー → スペース　④転がる間は ←→ でカーブ",
    arrows: "lr", buttons: [{ k: "a", label: "決定", cls: "go big" }],
    sky: 0x14112b, fog: 0x14112b, fogNear: 30, fogFar: 70, far: 100, fov: 50, hemiI: 0.9, sunI: 0.6,
    setup(ctx) {
      const { T, scene, camera, inp, S, FX } = ctx;
      const D = ctx.diff, me = partnerColor(T, 0x7048e8);
      const LW = 1.05, HEAD = 18.29, BR = 0.109, PR = 0.061, PIT = 19.45;
      // ---- レーン ----
      const laneTex = (() => { const t = stripeTex(T, "#e3b77a", "#d9ab6c", 39); t.repeat.set(1, 1); return t; })();
      const laneM = new T.MeshLambertMaterial({ map: laneTex });
      const lanes = [-3.2, -1.6, 0, 1.6, 3.2];
      lanes.forEach((lx) => {
        flat(T, scene, LW, 19.8, laneM, lx, 0, 9.4);
        [-1, 1].forEach((s) => { const gt = new T.Mesh(G(T, "gutter", () => new T.CylinderGeometry(0.12, 0.12, 19.8, 8, 1, true, 0, Math.PI)), lam(T, 0x495057)); gt.material.side = T.DoubleSide; gt.rotation.set(Math.PI / 2, 0, Math.PI / 2 * 0); gt.rotation.z = 0; gt.position.set(lx + s * (LW / 2 + 0.12), 0.0, 9.4); gt.rotation.set(-Math.PI / 2, Math.PI / 2, 0); scene.add(gt); });
        box(T, scene, 0.18, 0.12, 19.8, 0x2b2f3d, lx + LW / 2 + 0.33, 0.04, 9.4); box(T, scene, 0.18, 0.12, 19.8, 0x2b2f3d, lx - LW / 2 - 0.33, 0.04, 9.4);
      });
      // ガイドの矢印とドット
      const am = new T.MeshBasicMaterial({ color: 0x7048e8 });
      for (let i = -3; i <= 3; i++) { const tri = new T.Mesh(G(T, "barrow", () => { const sh = new T.Shape(); sh.moveTo(0, 0.12); sh.lineTo(-0.03, 0); sh.lineTo(0.03, 0); return new T.ShapeGeometry(sh); }), am); tri.rotation.x = -Math.PI / 2; tri.position.set(i * 0.127, 0.004, 4.6 + Math.abs(i) * 0.3); scene.add(tri); }
      flat(T, scene, LW, 0.03, new T.MeshBasicMaterial({ color: 0xc92a2a }), 0, 0.004, 0);
      // アプローチ・うしろ
      flat(T, scene, 12, 6, lam(T, 0xc99a63), 0, -0.001, -3);
      flat(T, scene, 14, 6, lam(T, 0x3b2f6b), 0, -0.002, -8);
      // ピンの上のかざり・おく
      box(T, scene, 9, 1.4, 0.3, 0x1b1640, 0, 1.6, 18.0);
      const sign = new T.Mesh(new T.PlaneGeometry(4, 0.9), new T.MeshBasicMaterial({ map: textTex(T, "★ STRIKE LANE ★", { w: 512, h: 110, bg: "#1b1640", fg: "#ffd43b", fs: 56 }) })); sign.position.set(0, 1.6, 17.84); sign.rotation.y = Math.PI; scene.add(sign);
      box(T, scene, 9, 2.4, 0.2, 0x0b0a1a, 0, 1.2, 20.3);
      box(T, scene, 9, 0.6, 1.2, 0x111111, 0, -0.3, 19.9);
      // ネオン
      const neon = [0xff6ec7, 0x74c0fc, 0xffd43b, 0x69db7c];
      for (let i = 0; i < 4; i++) box(T, scene, 9, 0.05, 0.05, neon[i], 0, 2.6 + i * 0.25, 18.1);
      inst(T, scene, new T.BoxGeometry(0.6, 0.06, 1.8), new T.MeshBasicMaterial({ color: 0xfff3bf }), [0, 5, 10, 15].map((z) => ({ x: 0, y: 4.2, z })));
      // ボールの戻り台・いす
      box(T, scene, 0.5, 0.5, 1.4, 0x343a40, -0.95, 0.25, -2.2); box(T, scene, 2.4, 0.45, 0.7, 0x5f3dc4, 0, 0.22, -5);
      // ピン（ほかのレーンのはまとめて描く）
      const pinPts = []; [[0, 0], [0.02, 0.02], [0.05, 0.06], [0.06, 0.13], [0.058, 0.17], [0.04, 0.24], [0.025, 0.28], [0.028, 0.32], [0.032, 0.35], [0.02, 0.375], [0, 0.38]].forEach(([r, y]) => pinPts.push(new T.Vector2(r * 0.95 + (r ? 0.003 : 0), y)));
      const pinGeo = new T.LatheGeometry(pinPts, 14);
      const pinTex = KIT.canvasTex(T, 16, 128, (c, w, h) => { c.fillStyle = "#f8f9fa"; c.fillRect(0, 0, w, h); c.fillStyle = "#e03131"; c.fillRect(0, h * 0.7, w, h * 0.035); c.fillRect(0, h * 0.77, w, h * 0.035); });
      const pinMat = new T.MeshLambertMaterial({ map: pinTex });
      const SP = 0.305, RowD = 0.264;
      const pinXZ = []; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) pinXZ.push([(i - r / 2) * SP, HEAD + r * RowD]);
      const others = []; lanes.forEach((lx) => { if (lx) pinXZ.forEach(([x, z]) => others.push({ x: lx + x, y: 0, z })); });
      inst(T, scene, pinGeo, pinMat, others);
      const pins = pinXZ.map(([x, z]) => { const m = new T.Mesh(pinGeo, pinMat); scene.add(m); const sh = softShadow(T, m, 0.18, 0.18); return { m, x0: x, z0: z, x, z, vx: 0, vz: 0, down: false, gone: false, tilt: 0, dir: 0, y: 0, vy: 0, sh }; });
      // ---- ボール ----
      const ball = new T.Group(); scene.add(ball);
      const bm = new T.Mesh(new T.SphereGeometry(BR, 20, 14), new T.MeshPhongMaterial({ color: me, shininess: 90, specular: 0x666666 })); ball.add(bm);
      [[0.03, 0.06], [-0.03, 0.06], [0, 0.0]].forEach(([x, y]) => { const h = new T.Mesh(G(T, "bhole", () => new T.CircleGeometry(0.014, 8)), new T.MeshBasicMaterial({ color: 0x111111 })); h.position.set(x, y + 0.03, Math.sqrt(Math.max(0, BR * BR - x * x - (y + 0.03) ** 2)) + 0.001); bm.add(h); });
      const bsh = softShadow(T, scene, 0.32, 0.32);
      const pl = athlete(T, scene, { shirt: me, pants: 0x343a40, noBake: true }); bakeTree(T, pl.g);
      // 矢印
      const arrowG = new T.Group(); scene.add(arrowG);
      const ar = new T.Mesh(new T.PlaneGeometry(0.08, 2.4), new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85, depthWrite: false })); ar.rotation.x = -Math.PI / 2; ar.position.set(0, 0.01, 1.4); arrowG.add(ar);
      const ah = new T.Mesh(new T.CircleGeometry(0.14, 3), ar.material); ah.rotation.set(-Math.PI / 2, 0, Math.PI / 2); ah.position.set(0, 0.011, 2.65); arrowG.add(ah);
      // ---- 試合 ----
      const FR = 5, CPU = { easy: 55, normal: 72, hard: 92, ultra: 112 }[D] || 72;
      const frames = []; for (let i = 0; i < FR; i++) frames.push([]);
      let fi = 0, standing = 10, phase = "pos", tP = 0, bx = 0, ang = 0, angT = 0, pw = 0, pdir = 1, hookUsed = 0, rollT = 0, joyT = 0, msgDone = false;
      const ball3 = { x: 0, z: -0.3, vx: 0, vz: 0, gutter: false, out: false };
      const ANGSP = { easy: 1.6, normal: 2.0, hard: 2.5, ultra: 2.9 }[D] || 2, PWSP = { easy: 0.8, normal: 1.0, hard: 1.25, ultra: 1.45 }[D] || 1;
      function rollsFlat() { const r = []; frames.forEach((f) => f.forEach((v) => r.push(v))); return r; }
      function total() {
        const r = rollsFlat(); let s = 0, i = 0;
        for (let f = 0; f < FR; f++) {
          if (i >= r.length) break;
          if (f === FR - 1) { s += r.slice(i).reduce((a, b) => a + b, 0); break; }
          if (r[i] === 10) { s += 10 + (r[i + 1] || 0) + (r[i + 2] || 0); i += 1; }
          else { s += r[i] + (r[i + 1] || 0); if (r[i] + (r[i + 1] || 0) === 10) s += r[i + 2] || 0; i += 2; }
        }
        return s;
      }
      function frameStr() {
        return frames.map((f) => { if (!f.length) return "・"; let rack = 10, out = ""; f.forEach((v) => { if (v === rack && rack === 10) { out += "X"; rack = 10; } else if (v === rack) { out += "/"; rack = 10; } else { out += v ? v : "-"; rack -= v; } }); return out; }).join(" | ");
      }
      function hud(extra) {
        const tip = phase === "pos" ? "←→で位置 → スペース" : phase === "aim" ? "矢印がまん中に来たらスペース" : phase === "power" ? "パワーをスペースで決める" : phase === "roll" ? "←→ でカーブ！" : "";
        ctx.hud({ big: "フレーム " + Math.min(FR, fi + 1) + "/" + FR + "　" + total() + "点", sub: frameStr(), sub2: extra || tip, right: "あいて <b>" + CPU + "</b> 点", gauge: phase === "power" ? pw : -1, gaugeCol: pw > 0.85 ? "#ff6b6b" : pw > 0.55 ? "#ffd43b" : "#69db7c" });
      }
      function resetPins(all) {
        pins.forEach((p) => { if (all) { p.x = p.x0; p.z = p.z0; p.down = false; p.gone = false; p.tilt = 0; p.y = 0; p.vy = 0; } p.vx = 0; p.vz = 0; if (p.down) p.gone = true; });
        pins.forEach((p) => { p.m.visible = !p.gone; });
      }
      function newBall() { phase = "pos"; tP = 0; ball3.x = bx; ball3.z = -0.3; ball3.vx = 0; ball3.vz = 0; ball3.gutter = false; ball3.out = false; hookUsed = 0; rollT = 0; msgDone = false; pw = 0; pdir = 1; ctx.label("a", "決定"); hud(); }
      function nextRoll() {
        const f = frames[fi], before = standing, knocked = standing - pins.filter((p) => !p.gone && !p.down).length;
        f.push(knocked); standing -= knocked;
        const last = fi === FR - 1;
        let msg = knocked === 0 ? (ball3.gutter ? "ガター…" : "0本") : knocked + "本！";
        if (before === 10 && knocked === 10) msg = "ストライク！"; else if (before < 10 && knocked === before) msg = "スペア！";
        const col = msg === "ストライク！" ? "#ffe066" : msg === "スペア！" ? "#69db7c" : "#fff";
        ctx.big(msg, 1.6, col);
        if (msg === "ストライク！" || msg === "スペア！") { S.cheer(); FX.SFX.finish(); ctx.overlay.flash(msg === "ストライク！" ? "#ffe066" : "#69db7c", 0.35); }
        // 次へ
        let frameDone = false;
        if (!last) frameDone = f.length === 2 || f[0] === 10;
        else { const sum2 = f.length >= 2 ? f[0] + f[1] : 0; frameDone = (f.length === 2 && f[0] !== 10 && sum2 < 10) || f.length === 3; }
        if (frameDone) { fi++; standing = 10; resetPins(true); }
        else if (standing === 0) { standing = 10; resetPins(true); }
        else resetPins(false);
        hud();
        if (fi >= FR) { phase = "end"; const sc = total(), win = sc > CPU; setTimeout(() => ctx.end({ win, title: win ? "勝ち！ " + sc + " 対 " + CPU : sc === CPU ? "引き分け " + sc + " 対 " + CPU : "負け… " + sc + " 対 " + CPU, text: "5フレームで " + sc + "点（" + frameStr() + "）", metric: { v: sc, unit: "点", lower: false, label: "スコア" } }), 900); }
        else newBall();
      }
      const camL = new T.Vector3(0, 0.3, 12);
      camera.position.set(0, 1.5, -2.6); camera.lookAt(camL);
      newBall();
      return {
        dbg: () => ({ phase, bx, ang, pw, fi, standing, total: total(), frames: JSON.stringify(frames), ball: { x: ball3.x, z: ball3.z } }),
        step(dt, t) {
          tP += dt; const go = ctx.st.go, a = inp.hit("a");
          const ix = -inp.x(); // 世界の x
          if (phase === "pos") {
            bx = clamp(bx + ix * dt * 0.7, -0.42, 0.42); ball3.x = bx;
            if (go && a) { phase = "aim"; tP = 0; angT = Math.random() * 6; S.ui && S.ui(); }
          } else if (phase === "aim") {
            angT += dt * ANGSP; ang = Math.sin(angT) * 0.075;
            if (a) { phase = "power"; tP = 0; S.ui && S.ui(); }
          } else if (phase === "power") {
            pw += pdir * dt * PWSP; if (pw >= 1) { pw = 1; pdir = -1; } if (pw <= 0) { pw = 0; pdir = 1; }
            if (a) { phase = "roll"; tP = 0; const sp = 5.6 + pw * 4.0; ball3.vz = sp * Math.cos(ang); ball3.vx = sp * Math.sin(ang); S.roll && S.roll(); FX.SFX.whoosh && FX.SFX.whoosh(); ctx.label("a", "カーブは←→"); }
            hud();
          } else if (phase === "roll" || phase === "settle") {
            const N = 4, h = dt / N; rollT += dt;
            for (let k = 0; k < N; k++) {
              if (!ball3.out) {
                if (phase === "roll" && !ball3.gutter && ball3.z > 3 && ball3.z < HEAD - 0.3) { const hk = ix * (0.9 + (ball3.z / HEAD) * 0.9); ball3.vx += hk * h; hookUsed += Math.abs(hk) * h; }
                ball3.x += ball3.vx * h; ball3.z += ball3.vz * h;
                if (!ball3.gutter && Math.abs(ball3.x) > LW / 2 && ball3.z < HEAD - 0.4) { ball3.gutter = true; ball3.vx = 0; ball3.x = Math.sign(ball3.x) * (LW / 2 + 0.11); S.bounce && S.bounce(); }
                if (ball3.z > PIT) ball3.out = true;
              }
              // ボールとピン
              pins.forEach((p) => {
                if (p.gone) return;
                if (!ball3.gutter && !ball3.out) { const dx = p.x - ball3.x, dz = p.z - ball3.z, d = Math.hypot(dx, dz), md = BR + PR; if (d < md && d > 1e-6) { const nx = dx / d, nz = dz / d, rv = (ball3.vx - p.vx) * nx + (ball3.vz - p.vz) * nz; if (rv > 0) { const m1 = 7, m2 = 1.5, j = (1.75 * rv) / (1 / m1 + 1 / m2); ball3.vx -= (j / m1) * nx; ball3.vz -= (j / m1) * nz; p.vx += (j / m2) * nx + rnd(-0.15, 0.15); p.vz += (j / m2) * nz; S.pins && S.pins(); } p.x = ball3.x + nx * md; p.z = ball3.z + nz * md; } }
              });
              for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
                const A = pins[i], B = pins[j]; if (A.gone || B.gone) continue;
                const ra = A.down ? 0.09 : PR, rb = B.down ? 0.09 : PR;
                const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz), md = ra + rb;
                if (d < md && d > 1e-6) { const nx = dx / d, nz = dz / d, rv = (A.vx - B.vx) * nx + (A.vz - B.vz) * nz; if (rv > 0) { const jj = 0.8 * rv; A.vx -= jj * nx; A.vz -= jj * nz; B.vx += jj * nx + rnd(-0.08, 0.08); B.vz += jj * nz; } const push = (md - d) / 2; A.x -= nx * push; A.z -= nz * push; B.x += nx * push; B.z += nz * push; }
              }
              pins.forEach((p) => {
                if (p.gone) return;
                p.x += p.vx * h; p.z += p.vz * h; const fr = Math.max(0, 1 - (p.down ? 2.2 : 3.5) * h); p.vx *= fr; p.vz *= fr;
                const sp = Math.hypot(p.vx, p.vz);
                if (!p.down && sp > 0.22) { p.down = true; p.dir = Math.atan2(p.vx, p.vz); p.vy = Math.min(2.2, sp * 0.45); }
                if (Math.abs(p.x) > LW / 2 + 0.3) { p.x = Math.sign(p.x) * (LW / 2 + 0.3); p.vx *= -0.5; if (!p.down) { p.down = true; p.dir = Math.atan2(p.vx, p.vz); } }
                if (Math.abs(p.x) > LW / 2 + 0.05 && !p.down) { p.down = true; p.dir = Math.atan2(p.vx, p.vz); }
                if (p.z > PIT + 0.2) { p.down = true; p.gone = true; p.m.visible = false; }
              });
            }
            pins.forEach((p) => { if (p.gone) return; if (p.down) { p.tilt = Math.min(Math.PI / 2, p.tilt + dt * 7); p.vy -= 9.8 * dt; p.y = Math.max(0, p.y + p.vy * dt); } });
            if (phase === "roll" && ball3.out) { phase = "settle"; tP = 0; }
            if (phase === "roll" && ball3.vz < 0.05 && rollT > 1) { phase = "settle"; tP = 0; ball3.out = true; }
            if (phase === "settle" && tP > 1.7) { nextRoll(); }
          }
          // 表示
          ball.position.set(ball3.x, ball3.gutter ? BR - 0.07 : BR, ball3.z); ball.visible = !(ball3.out && ball3.z >= PIT);
          if (phase === "roll" || phase === "settle") { bm.rotation.x += ball3.vz * dt / BR; bm.rotation.z -= ball3.vx * dt / BR; }
          bsh.position.set(ball3.x, ball3.gutter ? -0.06 : 0.006, ball3.z);
          pins.forEach((p) => { p.m.position.set(p.x, p.y, p.z); p.m.rotation.set(0, 0, 0); if (p.down) { p.m.rotation.y = p.dir; p.m.rotateX(p.tilt); } p.sh.visible = !p.down; });
          arrowG.visible = phase === "aim" || phase === "power"; arrowG.position.set(ball3.x, 0, ball3.z); arrowG.rotation.y = ang;
          // 選手
          if (phase === "pos" || phase === "aim" || phase === "power") { pl.g.position.set(ball3.x - 0.25, 0, -0.75); pl.armR.rotation.set(phase === "power" ? 0.6 + pw * 0.6 : -0.2, 0, 0); runPose(pl, 0, 0); pl.armR.rotation.x = phase === "power" ? 0.6 + pw * 0.6 : -0.3; ball.position.y = phase === "power" ? 0.45 : BR; }
          else { pl.armR.rotation.x = lerp(pl.armR.rotation.x, -1.3, dt * 6); }
          // カメラ
          let cp, cl;
          if (phase === "roll" && ball3.z < HEAD - 5) { cp = new T.Vector3(ball3.x * 0.5, 1.2, ball3.z - 2.4); cl = new T.Vector3(ball3.x * 0.3, 0.2, ball3.z + 8); }
          else if (phase === "roll" || phase === "settle") { cp = new T.Vector3(0, 1.7, HEAD - 3.3); cl = new T.Vector3(0, -0.15, HEAD + 0.6); }
          else { cp = new T.Vector3(ball3.x * 0.4, 1.55, -2.7); cl = new T.Vector3(0, 0.25, 11); }
          camera.position.lerp(cp, Math.min(1, dt * (phase === "settle" ? 2 : 4))); camL.lerp(cl, Math.min(1, dt * 4)); camera.lookAt(camL);
          if (phase === "roll" && (tP * 10 | 0) % 3 === 0) hud();
        }
      };
    }
  });
})();
