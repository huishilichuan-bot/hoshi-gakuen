/* ほしの学園 — 第9回：3Dアクション（パルクール・スターストライカー・雪合戦ロイヤル・タンクバトル・スカイダイビング）。games-3d-kit.js（HM3D）を使う。オリジナル。 */
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
  // スカイダイビング：リングをくぐって、パラシュートで的のまん中に着地
  // =====================================================================
  HM3D.register({
    id: "skydive", e: "🪂", n: "スカイダイビング", c: "#1c7ed6", genre: "action", title: "スカイダイビング",
    d: "3Dの空からダイブ！←↑↓→で動いて金のリングをくぐると点が入る（続けてくぐるとボーナス）。高さ600mより下で「ひらく」。さいごは的のまん中に着地しよう。",
    help: "←↑↓→ で空を移動（画面の右が右）<br>金のリングをくぐろう<br>600mより下で「ひらく」→ 的のまん中へ",
    arrows: "cross", buttons: [{ k: "a", label: "ひらく", cls: "go big" }],
    sky: 0x7cc0ff, fogCol: 0xb9dcff, fogNear: 300, fogFar: 1600, far: 2000, fov: 60, countdown: true, goText: "ジャンプ！",
    setup(ctx) {
      const { T, scene, camera, inp, S, FX } = ctx;
      const D = ctx.diff, sk = ctx.sk, me = partnerColor(T, 0xff6b6b);
      const H0 = 1800, OPENMAX = 600, FALL = 46, VH = 15 * sk, WIND = { easy: 0.4, normal: 0.8, hard: 1.2, ultra: 1.6 }[D] || 0.8;
      const GOAL = { easy: 600, normal: 900, hard: 1200, ultra: 1500 }[D] || 900;
      // ---- 地上 ----
      const fieldTex = KIT.canvasTex(T, 512, 512, (c, w, h) => {
        const rr = R01(7); const cols = ["#8bc34a", "#9ccc65", "#7cb342", "#c5e1a5", "#d4b06a", "#a5d6a7", "#689f38", "#e6c97a"];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = cols[Math.floor(rr() * cols.length)]; c.fillRect(x * 64, y * 64, 64, 64); c.strokeStyle = "rgba(60,80,40,.35)"; c.lineWidth = 2; c.strokeRect(x * 64, y * 64, 64, 64); if (rr() < 0.4) { c.strokeStyle = "rgba(0,0,0,.08)"; for (let k = 0; k < 64; k += 6) { c.beginPath(); c.moveTo(x * 64, y * 64 + k); c.lineTo(x * 64 + 64, y * 64 + k); c.stroke(); } } }
        c.fillStyle = "#9e9e9e"; c.fillRect(0, 250, w, 10); c.fillRect(250, 0, 10, h);
      });
      fieldTex.repeat.set(6, 6);
      flat(T, scene, 3000, 3000, new T.MeshLambertMaterial({ map: fieldTex }), 0, 0, 0);
      // 川と湖
      const water = lam(T, 0x4dabf7);
      disc(T, scene, 120, water, -380, 0.3, 260, 32);
      flat(T, scene, 40, 1600, water, 300, 0.25, 0, 0.3);
      // 着地の的（空港の芝の上）
      flat(T, scene, 160, 160, lam(T, 0x6fbf5a), 0, 0.4, 0);
      const ringCols = [0xffffff, 0xe03131, 0xffffff, 0xe03131, 0xffd43b];
      [30, 22, 15, 8, 3].forEach((r, i) => disc(T, scene, r, new T.MeshLambertMaterial({ color: ringCols[i] }), 0, 0.5 + i * 0.05, 0, 40));
      // 町（家と木をまとめて描く）
      const rr = R01(19), houses = [], roofs = [], trees = [];
      for (let i = 0; i < 260; i++) { const a = rr() * Math.PI * 2, d = 180 + rr() * 900; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(x - 300) < 30) continue; const s = 6 + rr() * 8; houses.push({ x, y: s / 2, z, sx: s * 1.4, sy: s, sz: s, ry: rr() * 3 }); roofs.push({ x, y: s + s * 0.3, z, sx: s * 1.1, sy: s * 0.6, sz: s * 1.1, ry: houses[houses.length - 1].ry }); }
      for (let i = 0; i < 500; i++) { const a = rr() * Math.PI * 2, d = 100 + rr() * 1100; trees.push({ x: Math.cos(a) * d, y: 6, z: Math.sin(a) * d, s: 1 + rr() * 1.2 }); }
      inst(T, scene, new T.BoxGeometry(1, 1, 1), lam(T, 0xffffff), houses, [0xf8f9fa, 0xffe8cc, 0xe7f5ff, 0xfff3bf]);
      inst(T, scene, new T.ConeGeometry(0.8, 1, 4), lam(T, 0xffffff), roofs, [0xc92a2a, 0x1971c2, 0x5c940d, 0x862e9c]);
      inst(T, scene, new T.ConeGeometry(4, 12, 7), lam(T, 0x2f7d3a), trees);
      // 雲（板にした雲をまとめて）
      const cloudTex = KIT.canvasTex(T, 128, 64, (c, w, h) => { for (let i = 0; i < 9; i++) { const x = 20 + (i * 11) % 90, y = 26 + (i % 3) * 6, r = 14 + (i % 4) * 5; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } });
      const cloudM = new T.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false });
      const clouds = []; for (let i = 0; i < 70; i++) clouds.push({ x: (rr() - 0.5) * 900, y: 300 + rr() * 1300, z: (rr() - 0.5) * 900, rx: -Math.PI / 2, s: 1, sx: 90 + rr() * 80, sy: 45 + rr() * 30, sz: 1 });
      inst(T, scene, new T.PlaneGeometry(1, 1), cloudM, clouds);
      // 飛行機（とび出したあと遠ざかる）
      const plane = new T.Group(); scene.add(plane);
      box(T, plane, 3, 3, 16, 0xf1f3f5, 0, 0, 0); box(T, plane, 22, 0.4, 3.2, 0xdee2e6, 0, 0.6, 1); box(T, plane, 7, 0.3, 2, 0xdee2e6, 0, 0.8, -7); box(T, plane, 0.3, 3, 2.4, 0xe03131, 0, 2.2, -7);
      [-6, 6].forEach((x) => cyl(T, plane, 0.9, 0.9, 2.4, 10, 0x495057, x, 0, 3).rotation.x = Math.PI / 2);
      plane.position.set(0, H0 + 8, -60);
      // ---- ダイバー ----
      const diver = athlete(T, scene, { shirt: me, pants: me, helmet: 0x212529, glove: 0x212529, shoe: 0x212529, sock: me, noBake: true });
      bakeTree(T, diver.g);
      const canopy = new T.Group(); scene.add(canopy); canopy.visible = false;
      const canTex = KIT.canvasTex(T, 256, 64, (c, w, h) => { const cs = ["#ff6b6b", "#ffd43b", "#4dabf7", "#ffffff"]; for (let i = 0; i < 8; i++) { c.fillStyle = cs[i % 4]; c.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
      const cm = new T.Mesh(new T.SphereGeometry(4.2, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), new T.MeshLambertMaterial({ map: canTex, side: T.DoubleSide }));
      cm.scale.set(1.3, 0.55, 0.8); cm.position.y = 5.2; canopy.add(cm);
      const lineG = new T.BufferGeometry(); const lp = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; lp.push(0, 1.3, 0, Math.cos(a) * 4.6, 5.2 + 0.6, Math.sin(a) * 2.9); }
      lineG.setAttribute("position", new T.Float32BufferAttribute(lp, 3)); canopy.add(new T.LineSegments(lineG, new T.LineBasicMaterial({ color: 0x343a40 })));
      // ---- リング ----
      const ringGeo = new T.TorusGeometry(4.2, 0.35, 8, 28), rings = [];
      let lx = 0, lz = 0;
      for (let h = H0 - 90; h > OPENMAX - 120; h -= 72) {
        const dmax = VH * (72 / FALL) * 0.62; const a = rr() * Math.PI * 2, d = dmax * (0.35 + rr() * 0.65);
        lx = clamp(lx + Math.cos(a) * d, -70, 70); lz = clamp(lz + Math.sin(a) * d, -70, 70);
        const m = new T.Mesh(ringGeo, new T.MeshLambertMaterial({ color: 0xffd43b, emissive: 0x6b4f00 })); m.rotation.x = Math.PI / 2; m.position.set(lx, h, lz); scene.add(m);
        rings.push({ m, x: lx, y: h, z: lz, done: false });
      }
      // 速さの線
      const streakN = 60, sp = []; for (let i = 0; i < streakN; i++) sp.push((rr() - 0.5) * 30, (rr() - 0.5) * 60, (rr() - 0.5) * 30);
      const stG = new T.BufferGeometry(); stG.setAttribute("position", new T.Float32BufferAttribute(sp, 3));
      const streaks = new T.Points(stG, new T.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(streaks);
      // ---- 状態 ----
      const p = new T.Vector3(0, H0, -50), v = new T.Vector3(0, 0, 0);
      let phase = "fall", score = 0, chain = 0, passed = 0, openAt = 0, landD = -1, tEnd = 0, fallV = 8, windA = rnd(0, Math.PI * 2), sayLow = false;
      const camL = new T.Vector3();
      camera.position.set(0, H0 + 9, -60); camera.lookAt(p);
      function hud() {
        const alt = Math.max(0, Math.round(p.y));
        const next = rings.find((r) => !r.done && r.y < p.y + 2);
        ctx.hud({ big: alt + " m", sub: score + "点（目標 " + GOAL + "）", sub2: phase === "fall" ? (alt <= OPENMAX ? "パラシュートをひらこう！" : next ? "リング " + passed + "/" + rings.length : "") : phase === "chute" ? "的までのきょり " + Math.round(Math.hypot(p.x, p.z)) + " m" : "", right: chain > 1 ? "れんぞく <b>" + chain + "</b>" : "", gauge: phase === "fall" ? 1 - (p.y - 0) / H0 : -1, gaugeCol: p.y <= OPENMAX ? "#69db7c" : "#74c0fc" });
      }
      function land() {
        phase = "landed"; tEnd = 0; landD = Math.hypot(p.x, p.z);
        const pts = Math.max(0, Math.round(500 - landD * 16)); score += pts;
        const msg = landD < 2 ? "ど真ん中！" : landD < 8 ? "ナイス着地！" : landD < 30 ? "着地" : "的の外…";
        ctx.big(msg + " +" + pts, 2, landD < 8 ? "#ffe066" : "#fff"); if (landD < 8) { S.cheer(); FX.SFX.finish(); } else FX.SFX.hit();
        ctx.fx3.burst(p.clone(), [0xffffff, 0x8bc34a, 0xffd43b], 22, 3, 0.8);
        hud();
      }
      hud();
      return {
        dbg: () => ({ phase, alt: p.y, x: p.x, z: p.z, score, passed, chain, next: (rings.find((r) => !r.done && r.y < p.y) || null) && (({ x, y, z }) => ({ x, y, z }))(rings.find((r) => !r.done && r.y < p.y)) }),
        step(dt, t) {
          const go = ctx.st.go;
          plane.position.z += dt * 55; plane.position.y += dt * 2;
          // 入力（画面の右＝世界の -x、画面の上＝世界の +z）
          const ax = -inp.x(), az = inp.y(), a = inp.hit("a");
          if (phase === "fall" && go) {
            fallV = Math.min(FALL, fallV + dt * 22);
            v.x = lerp(v.x, ax * VH, Math.min(1, dt * 2.5)); v.z = lerp(v.z, az * VH + 0.0, Math.min(1, dt * 2.5));
            const y0 = p.y; p.x += v.x * dt; p.z += v.z * dt; p.y -= fallV * dt;
            // リング
            rings.forEach((r) => { if (!r.done && y0 >= r.y && p.y < r.y) { r.done = true; const d = Math.hypot(p.x - r.x, p.z - r.z); if (d < 4.4) { chain++; passed++; const pts = 30 + Math.min(5, chain - 1) * 10; score += pts; r.m.material.color.setHex(0x69db7c); r.m.material.emissive.setHex(0x1b5e20); ctx.big("+" + pts, 0.7, "#ffe066"); FX.SFX.star(); ctx.fx3.burst(new T.Vector3(r.x, r.y, r.z), [0xffd43b, 0xffffff], 14, 4, 0.5); } else { chain = 0; r.m.material.opacity = 0.35; r.m.material.transparent = true; } } });
            if (p.y <= OPENMAX && !sayLow) { sayLow = true; ctx.say("600mより下！「ひらく」でパラシュート", 2.2); FX.SFX.countdown && FX.SFX.countdown(); }
            if (a) { if (p.y <= OPENMAX) { phase = "chute"; openAt = p.y; const bonus = p.y < 520 && p.y > 330 ? 150 : 50; score += bonus; ctx.big(bonus > 50 ? "ナイスタイミング！ +" + bonus : "パラシュート！ +" + bonus, 1.4, "#69db7c"); FX.SFX.boost(); ctx.shake.add(0.4); } else ctx.say("まだ高いよ（600mより下で）", 1.2); }
            if (phase === "fall" && p.y < 200) { phase = "chute"; openAt = p.y; ctx.big("ひらくのがおそい！", 1.4, "#ff8787"); FX.SFX.boost(); }
            // ポーズ：うつぶせで手足を広げる
            diver.g.rotation.set(-Math.PI / 2 + 0.15 + v.z * 0.01, 0, -v.x * 0.02); diver.armL.rotation.set(0, 0, -1.3 + Math.sin(t * 9) * 0.05); diver.armR.rotation.set(0, 0, 1.3 - Math.sin(t * 9) * 0.05); diver.armL.userData.el.rotation.x = -0.6; diver.armR.userData.el.rotation.x = -0.6; diver.legL.rotation.set(0.2, 0, -0.3); diver.legR.rotation.set(0.2, 0, 0.3); diver.legL.userData.knee.rotation.x = 0.6; diver.legR.userData.knee.rotation.x = 0.6;
            diver.g.position.set(p.x, p.y + 0.9, p.z);
            camera.position.lerp(new T.Vector3(p.x, p.y + 6, p.z - 4.8), Math.min(1, dt * 5)); camL.set(p.x, p.y - 22, p.z + 9); camera.lookAt(camL);
            streaks.visible = true; streaks.position.set(p.x, p.y - 10, p.z); const arr = stG.attributes.position.array; for (let i = 1; i < arr.length; i += 3) { arr[i] += fallV * dt * 1.4; if (arr[i] > 30) arr[i] -= 60; } stG.attributes.position.needsUpdate = true;
          } else if (phase === "chute") {
            const wx = Math.cos(windA) * WIND, wz = Math.sin(windA) * WIND; windA += dt * 0.1;
            v.x = lerp(v.x, ax * 7 + wx, Math.min(1, dt * 1.6)); v.z = lerp(v.z, az * 7 + wz, Math.min(1, dt * 1.6));
            const vy = p.y > 70 ? 20 : 9;
            p.x += v.x * dt; p.z += v.z * dt; p.y -= vy * dt; fallV = vy;
            if (p.y <= 0.9) { p.y = 0.9; land(); }
            diver.g.rotation.set(0, Math.PI, -v.x * 0.02); diver.armL.rotation.set(-2.8, 0, -0.2); diver.armR.rotation.set(-2.8, 0, 0.2); diver.legL.rotation.set(0, 0, 0); diver.legR.rotation.set(0, 0, 0); diver.legL.userData.knee.rotation.x = 0.2; diver.legR.userData.knee.rotation.x = 0.2;
            diver.g.position.set(p.x, p.y - 0.9, p.z); canopy.visible = true; canopy.position.set(p.x, p.y + 0.4, p.z); canopy.scale.setScalar(Math.min(1, canopy.scale.x + dt * 2.5) || 0.1); canopy.rotation.z = v.x * 0.03; canopy.rotation.x = -v.z * 0.03;
            camera.position.lerp(new T.Vector3(p.x, p.y + 8, p.z - 15), Math.min(1, dt * 3)); camL.lerp(new T.Vector3(lerp(p.x, 0, 0.3), p.y - 14, lerp(p.z, 0, 0.3) + 8), Math.min(1, dt * 3)); camera.lookAt(camL);
            streaks.visible = false;
          } else if (phase === "landed") {
            tEnd += dt; canopy.position.y = Math.max(0.3, canopy.position.y - dt * 3); canopy.scale.y = Math.max(0.15, canopy.scale.y - dt);
            diver.armL.rotation.set(-2.9, 0, -0.4 + Math.sin(t * 8) * 0.2); diver.armR.rotation.set(-2.9, 0, 0.4 - Math.sin(t * 8) * 0.2);
            if (tEnd > 2.4) {
              phase = "end"; const win = score >= GOAL;
              ctx.end({ win, title: win ? "クリア！ " + score + "点" : "あと少し… " + score + "点", text: "リング " + passed + "/" + rings.length + "・パラシュート " + Math.round(openAt) + "m・的から " + landD.toFixed(1) + "m（目標 " + GOAL + "点）", metric: { v: score, unit: "点", lower: false, label: "とく点" } });
            }
          } else if (!go) { diver.g.position.set(p.x, p.y + 0.9, p.z); diver.g.rotation.set(0, 0, 0); camera.lookAt(p); }
          hud();
        }
      };
    }
  });
})();
