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
  // パルクール：ビルの屋上を走ってゴールへ。4人で競走
  // =====================================================================
  HM3D.register({
    id: "parkour", e: "🤸", n: "パルクール", c: "#5f3dc4", genre: "action", title: "パルクール",
    d: "3Dのビルの屋上を4人で競走！↑を押している間だけ走る。「ジャンプ」でビルのすき間や低いかべを飛びこえ、↓でパイプの下をスライディング。←→で3つのレーンを移動。1位でゴールすれば勝ち。",
    help: "↑ 押している間だけ走る　←→ でレーン移動<br>「ジャンプ」（スペース）：すき間・低いかべ<br>↓ スライディング：パイプの下をくぐる",
    arrows: "cross", buttons: [{ k: "a", label: "ジャンプ", cls: "go big" }],
    sky: 0xffb48a, fogCol: 0xf7b8a0, fogNear: 60, fogFar: 230, far: 320, fov: 62,
    setup(ctx) {
      const { T, scene, camera, inp, S, FX } = ctx;
      const D = ctx.diff, sk = ctx.sk, me = partnerColor(T, 0xe03131);
      const LANE = 1.7, GOAL = 380, GR = 17, JV = 6.6, VMAX = 9.2;
      const laneX = (li) => (1 - li) * LANE; // li が大きいほど画面の右（世界の -x）
      const rr = R01(41 + Math.floor(Math.random() * 1000));
      // ---- コース ----
      const B = []; let z = -12, h = 0;
      for (let guard = 0; z < GOAL + 30 && guard < 60; guard++) {
        const first = !B.length, len = first ? 46 : 26 + rr() * 22;
        if (!first) h = clamp(h + (rr() - 0.55) * 2.2, -1.5, 2.5);
        const b = { z0: z, z1: z + len, h, obs: [] };
        if (b.z1 > GOAL - 5 && b.z0 < GOAL) b.z1 = Math.max(b.z1, GOAL + 30);
        B.push(b); z = b.z1 + (b.z1 >= GOAL ? 999 : 2.6 + rr() * 1.8 * sk);
      }
      // 障害物
      B.forEach((b, bi) => {
        let oz = b.z0 + (bi === 0 ? 18 : 7);
        for (let guard = 0; oz < Math.min(b.z1 - 6, GOAL - 4) && guard < 20; guard++) {
          const r = rr(), type = r < 0.42 ? "vent" : r < 0.72 ? "pipe" : "ac";
          const lanes = type === "ac" ? [Math.floor(rr() * 3)] : type === "vent" && rr() < 0.4 ? (rr() < 0.5 ? [0, 1] : [1, 2]) : [0, 1, 2];
          if (type === "ac") { const l2 = Math.floor(rr() * 3); if (l2 !== lanes[0] && rr() < 0.5) lanes.push(l2); }
          b.obs.push({ type, z: oz, lanes, len: type === "pipe" ? 0.5 : type === "ac" ? 1.6 : 0.6, top: type === "vent" ? 0.85 : type === "ac" ? 1.5 : 0 });
          oz += 9 + rr() * 6;
        }
      });
      const allObs = []; B.forEach((b) => b.obs.forEach((o) => { o.h = b.h; allObs.push(o); }));
      // ---- 見た目：ビル ----
      // 第10回：かべの地を明るく（前は地の色が未指定で黒くなっていた）
      const winTex = K.windowsTex ? K.windowsTex(T, "#ffffff", "#fff3bf") : null;
      const wallTex = winTex ? winTex.clone() : null; if (wallTex) { wallTex.needsUpdate = true; wallTex.repeat.set(2, 6); }
      const bcols = [0xb8a9e3, 0x9cc0ea, 0xf0b9a5, 0xa8d5cf, 0xe6cf9c];
      const wallMs = bcols.map((c) => { const m = new T.MeshLambertMaterial({ color: c }); if (wallTex) { m.map = wallTex; } return m; });
      const roofM = lam(T, 0x9aa0a8);
      B.forEach((b, i) => {
        const len = b.z1 - b.z0, cz = (b.z0 + b.z1) / 2;
        const m = new T.Mesh(new T.BoxGeometry(LANE * 3 + 3, 40, len), wallMs[i % wallMs.length]); m.position.set(0, b.h - 20, cz); scene.add(m);
        flat(T, scene, LANE * 3 + 2.6, len - 0.2, roofM, 0, b.h + 0.01, cz);
        [-1, 1].forEach((s) => box(T, scene, 0.25, 0.5, len, 0x495057, s * (LANE * 1.5 + 1.3), b.h + 0.25, cz));
        if (len > 30) cyl(T, scene, 1.2, 1.2, 2, 10, 0x868e96, (i % 2 ? 1 : -1) * (LANE * 1.5 + 2.8), b.h + 1, cz);
      });
      allObs.forEach((o) => {
        if (o.type === "vent") o.lanes.forEach((l) => { box(T, scene, LANE - 0.15, 0.85, 0.6, 0xadb5bd, laneX(l), o.h + 0.425, o.z + 0.3); box(T, scene, LANE - 0.15, 0.08, 0.62, 0xffd43b, laneX(l), o.h + 0.86, o.z + 0.3); });
        else if (o.type === "pipe") { const m = cyl(T, scene, 0.18, 0.18, LANE * 3 + 2.6, 8, 0xd9480f, 0, o.h + 1.2, o.z + 0.25); m.rotation.z = Math.PI / 2; [-1, 1].forEach((s) => box(T, scene, 0.15, 1.2, 0.15, 0x495057, s * (LANE * 1.5 + 1.1), o.h + 0.6, o.z + 0.25)); }
        else o.lanes.forEach((l) => { box(T, scene, LANE - 0.2, 1.5, 1.6, 0xdee2e6, laneX(l), o.h + 0.75, o.z + 0.8); cyl(T, scene, 0.45, 0.45, 0.1, 12, 0x495057, laneX(l), o.h + 1.52, o.z + 0.8); });
      });
      // 遠くのビル街・下の道
      const sky = []; for (let i = 0; i < 160; i++) { const s = rr() < 0.5 ? -1 : 1; const sy = 20 + rr() * 45; sky.push({ x: s * (16 + rr() * 60), y: -40 + sy / 2, z: -30 + rr() * (GOAL + 120), sx: 6 + rr() * 8, sy, sz: 6 + rr() * 8 }); }
      inst(T, scene, new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xffffff, map: winTex || null }), sky, [0xa99bd0, 0x9fb3d6, 0xc9a7b6, 0x8fb5c9]);
      flat(T, scene, 300, GOAL + 300, lam(T, 0x3b3f4a), 0, -40, GOAL / 2);
      // ゴール
      const gb = B.find((b) => b.z0 <= GOAL && b.z1 >= GOAL), gh = gb ? gb.h : 0;
      [-1, 1].forEach((s) => cyl(T, scene, 0.15, 0.15, 3.6, 8, 0xffffff, s * (LANE * 1.5 + 0.9), gh + 1.8, GOAL));
      const gs = new T.Mesh(new T.PlaneGeometry(LANE * 3 + 2, 0.9), new T.MeshBasicMaterial({ map: textTex(T, "GOAL", { w: 256, h: 64, bg: "#e03131", fg: "#fff", fs: 46 }), side: T.DoubleSide })); gs.position.set(0, gh + 3.3, GOAL); gs.rotation.y = Math.PI; scene.add(gs);
      flat(T, scene, LANE * 3 + 2.6, 1, new T.MeshBasicMaterial({ map: KIT.canvasTex(T, 64, 8, (c) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? "#fff" : "#111"; c.fillRect(i * 4, j * 4, 4, 4); } }) }), 0, gh + 0.02, GOAL);
      // ---- ランナー ----
      const cols = [me, 0x1c7ed6, 0x2f9e44, 0xf08c00];
      const BASE = { easy: 6.6, normal: 8.1, hard: 8.75, ultra: 9.0 }[D] || 8.1, STUM = { easy: 0.22, normal: 0.07, hard: 0.03, ultra: 0.015 }[D] || 0.07;
      const startLi = [1, 0, 2, 1], startZ = [0, -1.5, -1.5, -3];
      const runners = cols.map((c, i) => {
        const a = athlete(T, scene, { shirt: c, pants: 0x212529, band: i ? 0xffffff : 0xffd43b, shoe: 0xffffff, noBake: true }); bakeTree(T, a.g);
        return { a, i, me: i === 0, li: startLi[i], x: laneX(startLi[i]), z: startZ[i], y: 0, vy: 0, v: 0, ground: true, slide: 0, stun: 0, fall: 0, fin: 0, ph: rr() * 6, base: BASE * (0.94 + i * 0.03), passed: new Set() };
      });
      const P = runners[0];
      const bAt = (zz) => B.find((b) => zz >= b.z0 && zz <= b.z1) || null;
      let tAll = 0, phase = "play", tEnd = 0, place = 0;
      const finishOrder = [], camL = new T.Vector3();
      function rankOf(r) { return 1 + runners.filter((o) => o !== r && (o.fin ? (!r.fin || o.fin < r.fin) : (!r.fin && o.z > r.z))).length; }
      function hud() { ctx.hud({ big: P.fin ? "ゴール！" : "のこり " + Math.max(0, Math.ceil(GOAL - P.z)) + " m", sub: rankOf(P) + "位 / 4人", sub2: tAll.toFixed(1) + "秒", right: "", gauge: clamp(P.z / GOAL, 0, 1), gaugeCol: "#ffd43b" }); }
      function stumble(r, msg) { r.stun = 0.65; r.v = Math.min(r.v, 1); if (r.me) { ctx.shake.add(0.3); FX.SFX.hit(); if (msg) ctx.say(msg, 1); } }
      hud();
      return {
        dbg: () => { const ahead = allObs.filter((o) => o.z > P.z - 0.5 && o.z < P.z + 16).map((o) => ({ type: o.type, z: o.z, lanes: o.lanes })); const b = bAt(P.z); return { phase, z: P.z, y: P.y, li: P.li, v: P.v, ground: P.ground, gapAt: b ? b.z1 : null, ahead, rank: rankOf(P), fin: P.fin }; },
        step(dt, t) {
          const go = ctx.st.go && phase !== "end"; if (go && !P.fin) tAll += dt;
          const up = inp.held.up, jump = inp.hit("a"), sl = inp.hit("down");
          const goR = inp.hit("right"), goL = inp.hit("left");
          if (go && !P.fin) {
            if (goR) P.li = Math.min(2, P.li + 1);
            if (goL) P.li = Math.max(0, P.li - 1);
            if (P.stun <= 0 && P.fall <= 0) P.v = up ? Math.min(VMAX, P.v + dt * 7) : Math.max(0, P.v - dt * 10);
            if (jump && P.ground && P.stun <= 0 && P.fall <= 0) { P.vy = JV; P.ground = false; P.slide = 0; FX.SFX.whoosh(); }
            if (sl && P.ground && P.stun <= 0) { P.slide = 0.75; FX.SFX.whoosh(); }
          }
          // CPU
          runners.forEach((r) => {
            if (r.me || !go || r.fin) return;
            if (r.stun <= 0 && r.fall <= 0) r.v = Math.min(r.base * (1 + Math.sin(t * 0.7 + r.i) * 0.04), r.v + dt * 6);
            for (let k = 0; k < allObs.length; k++) {
              const o = allObs[k]; if (r.passed.has(k)) continue; const dz = o.z - r.z; if (dz > 9) break;
              if (o.type === "ac" && dz < 7 && dz > 0 && o.lanes.includes(r.li)) { const c = [0, 1, 2].filter((l) => !o.lanes.includes(l)).sort((a, b) => Math.abs(a - r.li) - Math.abs(b - r.li)); if (c.length) r.li = c[0]; }
              if (dz < Math.max(1.2, r.v * 0.3) && dz > 0 && r.ground && r.stun <= 0) {
                r.passed.add(k);
                if (Math.random() < STUM && o.type !== "ac") { stumble(r); continue; }
                if (o.type === "vent" && o.lanes.includes(r.li)) { r.vy = JV; r.ground = false; }
                if (o.type === "pipe") r.slide = 0.75;
              }
            }
            const b = bAt(r.z); if (b && r.ground && b.z1 - r.z < Math.max(1.2, r.v * 0.3) && b.z1 - r.z > 0 && b.z1 < GOAL) { r.vy = JV; r.ground = false; }
          });
          // 物理
          runners.forEach((r) => {
            r.stun = Math.max(0, r.stun - dt); r.slide = Math.max(0, r.slide - dt);
            if (r.fall > 0) { r.fall -= dt; r.vy -= GR * dt; r.y += r.vy * dt; if (r.fall <= 0) { const nb = B.find((b) => b.z0 > r.z - 1) || B[B.length - 1]; r.z = nb.z0 + 1.2; r.y = nb.h; r.vy = 0; r.ground = true; r.v = 0; r.stun = 0.3; } return; }
            r.x = lerp(r.x, laneX(r.li), Math.min(1, dt * 10));
            const z0 = r.z; r.z += r.v * dt;
            const nb = B.find((bb) => z0 < bb.z0 && r.z >= bb.z0);
            if (nb && r.y < nb.h - 0.35) { r.z = nb.z0 - 0.3; r.v = 0; }
            r.vy -= GR * dt; r.y += r.vy * dt;
            const b2 = bAt(r.z), gy = b2 ? b2.h : -100;
            if (r.y <= gy && r.vy <= 0 && r.y > gy - 0.6) { r.y = gy; r.vy = 0; r.ground = true; }
            else if (r.y > gy + 0.02) r.ground = false;
            if (r.y < (b2 ? b2.h - 3 : -4) && r.fall <= 0) { r.fall = 1.0; if (r.me) { ctx.big("落ちた！", 1, "#ff8787"); ctx.say("ちょっと先からやり直し", 1.2); FX.SFX.crash(); } return; }
            if (r.stun <= 0) for (const o of allObs) {
              if (o.z > r.z + 2) break;
              if (!(z0 < o.z + o.len && r.z > o.z - 0.25)) continue; if (!o.lanes.includes(Math.round(1 - r.x / LANE))) continue;
              const feet = r.y - o.h;
              if (o.type === "vent" && feet < o.top - 0.05) { stumble(r, r.me && "つまずいた！ ジャンプで飛びこえよう"); break; }
              else if (o.type === "ac" && feet < o.top - 0.05) { stumble(r, r.me && "ぶつかった！ ←→でよけよう"); r.z = o.z - 0.4; break; }
              else if (o.type === "pipe" && r.slide <= 0 && feet < 1.3) { stumble(r, r.me && "ゴン！ ↓でスライディング"); break; }
            }
            if (!r.fin && r.z >= GOAL) { r.fin = tAll + 0.0001 * r.i; finishOrder.push(r); if (r.me) { place = finishOrder.length; phase = "over"; tEnd = 0; ctx.big(place === 1 ? "1位でゴール！" : place + "位でゴール", 1.8, place === 1 ? "#ffe066" : "#fff"); if (place === 1) { S.cheer && S.cheer(); FX.SFX.finish(); } else FX.SFX.star(); } }
            if (r.fin) r.v = Math.max(0, r.v - dt * 6);
          });
          // 見た目
          runners.forEach((r) => {
            const a = r.a; a.g.position.set(r.x, r.y, r.z); a.g.rotation.set(0, 0, 0); a.torso.rotation.x = 0;
            r.ph += dt * r.v * 1.6;
            if (r.fall > 0) { a.g.rotation.x = 0.6; runPose(a, t * 20, 1); }
            else if (r.slide > 0 && r.ground) { runPose(a, 0, 0); a.g.rotation.x = -1.1; a.g.position.y = r.y + 0.25; a.armL.rotation.x = a.armR.rotation.x = -2.6; }
            else if (!r.ground) { runPose(a, 1.2, 1); a.legL.rotation.x = -1.0; a.legR.rotation.x = 0.5; a.armL.rotation.x = -2.4; a.armR.rotation.x = -2.2; }
            else if (r.stun > 0) { runPose(a, 0, 0); a.torso.rotation.x = 0.5; }
            else { runPose(a, r.ph, Math.min(1, r.v / 6)); a.torso.rotation.x = Math.min(0.35, r.v * 0.04); }
          });
          camera.position.lerp(new T.Vector3(P.x * 0.6, P.y + 3.3, P.z - 6.2), Math.min(1, dt * 6)); camL.lerp(new T.Vector3(P.x * 0.5, P.y + 0.9, P.z + 9), Math.min(1, dt * 6)); camera.lookAt(camL);
          if ((t * 5 | 0) !== ((t - dt) * 5 | 0)) hud();
          if (phase === "over") {
            tEnd += dt;
            if (tEnd > 2.2) { phase = "end"; const win = place === 1;
              ctx.end({ win, title: win ? "1位！ " + tAll.toFixed(1) + "秒" : place + "位 " + tAll.toFixed(1) + "秒", text: "ビルの屋上 " + GOAL + "m を走りぬけた", metric: { v: Math.round(tAll * 10) / 10, unit: "秒", lower: true, label: "タイム" } }); }
          }
        }
      };
    }
  });

  // =====================================================================
  // スターストライカー：宇宙を飛ぶ3Dシューティング。さいごのボスをたおせば勝ち
  // =====================================================================
  HM3D.register({
    id: "starfighter", e: "🚀", n: "スターストライカー", c: "#4263eb", genre: "arcade", title: "スターストライカー",
    d: "3Dの宇宙をとぶシューティング！←↑↓→で自機を動かし、「ショット」長押しで連射。Pアイテムでパワーアップ、「ボム」で画面の敵弾を消せる。さいごの大きなボスをたおせば勝ち。",
    help: "←↑↓→ で移動（画面の右が右）<br>「ショット」（スペース）長押しで連射<br>「ボム」（X）：敵と敵の弾をまとめて消す（2回）",
    arrows: "cross", buttons: [{ k: "a", label: "ショット", cls: "go big" }, { k: "b", label: "ボム", cls: "" }],
    sky: 0x05061a, fog: false, far: 500, fov: 62, countdown: true, goText: "発進！",
    setup(ctx) {
      const { T, scene, camera, inp, S, FX } = ctx;
      const D = ctx.diff, sk = ctx.sk, me = partnerColor(T, 0x4dabf7);
      const XR = 8, YR = 4.6, SPAWNZ = 140;
      const EHP = { easy: 0.7, normal: 1, hard: 1.25, ultra: 1.5 }[D] || 1, ESHOT = { easy: 0.6, normal: 0.85, hard: 1.0, ultra: 1.2 }[D] || 0.85;
      // ---- 宇宙 ----
      const skyTex = KIT.canvasTex(T, 512, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#05061a"); g.addColorStop(0.5, "#1a1046"); g.addColorStop(1, "#05061a"); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const x = (i * 97) % w, y = 60 + (i * 53) % 140, r = 40 + (i % 5) * 18; const gg = c.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, ["rgba(255,80,200,.22)", "rgba(80,160,255,.22)", "rgba(140,90,255,.2)"][i % 3]); gg.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2); } });
      const skyS = new T.Mesh(new T.SphereGeometry(450, 24, 12), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false })); scene.add(skyS);
      const planet = new T.Mesh(new T.SphereGeometry(60, 32, 16), new T.MeshLambertMaterial({ map: stripeTex(T, "#5f3dc4", "#7950f2", 9), emissive: 0x1a0f40 })); planet.position.set(-120, -40, 330); scene.add(planet);
      const ringP = new T.Mesh(new T.RingGeometry(75, 100, 48), new T.MeshBasicMaterial({ color: 0xb197fc, transparent: true, opacity: 0.35, side: T.DoubleSide })); ringP.position.copy(planet.position); ringP.rotation.x = 1.2; scene.add(ringP);
      const NS = 900, sp = new Float32Array(NS * 3); for (let i = 0; i < NS; i++) { sp[i * 3] = rnd(-60, 60); sp[i * 3 + 1] = rnd(-35, 35); sp[i * 3 + 2] = rnd(0, 300); }
      const stG = new T.BufferGeometry(); stG.setAttribute("position", new T.BufferAttribute(sp, 3));
      scene.add(new T.Points(stG, new T.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));
      scene.add(new T.AmbientLight(0x8899ff, 0.35));
      // ---- 自機 ----
      const ship = new T.Group(); scene.add(ship);
      const body = new T.Group(); ship.add(body);
      // 第10回：自機をくわしく（胴体・機首・後ろに引いたつばさ・2つのエンジン・キャノピー・翼の先のライト）
      const hull = 0xe9ecef, dk = 0x495057;
      cyl(T, body, 0.36, 0.42, 1.8, 10, hull, 0, 0, -0.1).rotation.x = Math.PI / 2;
      cone(T, body, 0.36, 1.3, 10, hull, 0, 0, 1.45).rotation.x = Math.PI / 2;
      cone(T, body, 0.12, 0.4, 8, me, 0, 0, 2.15).rotation.x = Math.PI / 2;
      box(T, body, 0.5, 0.08, 1.2, me, 0, 0.3, 0.2);
      [-1, 1].forEach((s) => {
        const w = box(T, body, 1.9, 0.1, 0.95, hull, s * 1.15, -0.06, -0.35); w.rotation.y = s * 0.32;
        const st = box(T, body, 1.5, 0.11, 0.22, me, s * 1.1, -0.04, -0.12); st.rotation.y = s * 0.32;
        cyl(T, body, 0.2, 0.24, 1.3, 10, 0xadb5bd, s * 0.62, -0.08, -0.5).rotation.x = Math.PI / 2;
        cyl(T, body, 0.25, 0.25, 0.14, 10, dk, s * 0.62, -0.08, -1.18).rotation.x = Math.PI / 2;
        box(T, body, 0.1, 0.32, 0.6, dk, s * 2.0, 0.05, -0.62);
        const fin = box(T, body, 0.08, 0.6, 0.6, me, s * 0.42, 0.42, -0.75); fin.rotation.z = -s * 0.35;
        box(T, body, 0.05, 0.05, 0.9, dk, s * 1.95, -0.1, 0.25);
      });
      bake(T, body, true);
      const glassM = new T.MeshLambertMaterial({ color: 0x74c0fc, emissive: 0x1c4f80, transparent: true, opacity: 0.9 });
      const cp = new T.Mesh(new T.SphereGeometry(0.26, 12, 8), glassM); cp.scale.set(1, 0.75, 2.0); cp.position.set(0, 0.3, 0.7); body.add(cp);
      [-1, 1].forEach((s) => { const lt = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), new T.MeshBasicMaterial({ color: s < 0 ? 0xff6b6b : 0x69db7c })); lt.position.set(s * 2.05, 0.05, -0.35); body.add(lt); });
      const flameM = new T.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.85, depthWrite: false });
      const flame = new T.Group(); ship.add(flame); flame.position.set(0, 0, 0);
      [-0.62, 0.62].forEach((x) => { const f = new T.Mesh(new T.ConeGeometry(0.2, 1.0, 8), flameM); f.rotation.x = -Math.PI / 2; f.position.set(x, -0.08, -1.75); flame.add(f); const c = new T.Mesh(new T.ConeGeometry(0.1, 0.6, 8), new T.MeshBasicMaterial({ color: 0xfff3bf, transparent: true, opacity: 0.95, depthWrite: false })); c.rotation.x = -Math.PI / 2; c.position.set(x, -0.08, -1.55); flame.add(c); });
      // ---- 物体 ----
      const shots = [], foes = [], eshots = [], items = [];
      const laserGeo = new T.BoxGeometry(0.08, 0.08, 1.6), laserM = new T.MeshBasicMaterial({ color: 0x8ce99a });
      const orbGeo = new T.SphereGeometry(0.32, 10, 8), orbM = new T.MeshBasicMaterial({ color: 0xff6b6b }), orbM2 = new T.MeshBasicMaterial({ color: 0xffa8a8 });
      const droneGeo = new T.OctahedronGeometry(0.9, 0), droneM = new T.MeshLambertMaterial({ color: 0xff922b, emissive: 0x5a2a00 });
      const fighterGeo = new T.ConeGeometry(0.9, 2.2, 6), fighterM = new T.MeshLambertMaterial({ color: 0xe64980, emissive: 0x4a0a26 });
      const rockGeo = new T.DodecahedronGeometry(1.8, 0), rockM = new T.MeshLambertMaterial({ color: 0x8d7b68, flatShading: true });
      const carrierM = new T.MeshLambertMaterial({ color: 0xffd43b, emissive: 0x6b5200 });
      const pGeo = new T.BoxGeometry(0.9, 0.9, 0.9), pM = new T.MeshBasicMaterial({ map: textTex(T, "P", { w: 64, h: 64, bg: "#fab005", fg: "#fff", fs: 50 }) });
      function spawn(type, x, y, z) {
        let m, hp, r, pts;
        if (type === "drone" || type === "carrier") { m = new T.Mesh(droneGeo, type === "carrier" ? carrierM : droneM); hp = 1; r = 1.0; pts = type === "carrier" ? 300 : 100; }
        else if (type === "fighter") { m = new T.Mesh(fighterGeo, fighterM); m.rotation.x = -Math.PI / 2; hp = 3; r = 1.1; pts = 200; }
        else { m = new T.Mesh(rockGeo, rockM); hp = 6; r = 1.9; pts = 150; }
        m.position.set(x, y, z); scene.add(m);
        const f = { type, m, x, y, z, x0: x, y0: y, hp: Math.ceil(hp * EHP), r, pts, t: rnd(0, 6), cd: rnd(0.6, 1.6), vz: type === "rock" ? 26 : type === "fighter" ? 22 : 30 };
        foes.push(f); return f;
      }
      function eshoot(x, y, z, tx, ty, spd) { const m = new T.Mesh(orbGeo, Math.random() < 0.5 ? orbM : orbM2); m.position.set(x, y, z); scene.add(m); const tt = z / spd; eshots.push({ m, x, y, z, vx: (tx - x) / tt, vy: (ty - y) / tt, vz: -spd }); }
      // ---- ボス ----
      const boss = new T.Group(); boss.visible = false; scene.add(boss);
      const bossBody = new T.Group(); boss.add(bossBody);
      box(T, bossBody, 9, 1.6, 4, 0x495057, 0, 0, 0); box(T, bossBody, 4, 2.6, 5, 0x343a40, 0, 0.4, 0.3); cone(T, bossBody, 1.4, 3, 8, 0x495057, 0, 0, -3).rotation.x = -Math.PI / 2;
      [-1, 1].forEach((s) => { box(T, bossBody, 3, 0.6, 6, 0x5c5f66, s * 6, -0.2, 0.5); });
      bake(T, bossBody, true);
      const core = new T.Mesh(new T.SphereGeometry(1.1, 16, 12), new T.MeshBasicMaterial({ color: 0xff3b3b })); core.position.set(0, 0.4, -2.4); boss.add(core);
      const cannons = [-1, 1].map((s) => { const c = new T.Mesh(new T.CylinderGeometry(0.8, 0.9, 1.6, 10), new T.MeshLambertMaterial({ color: 0xfab005, emissive: 0x4a3500 })); c.rotation.x = Math.PI / 2; c.position.set(s * 6, -0.2, -2.6); boss.add(c); return { m: c, s, hp: Math.ceil(26 * EHP), dead: false }; });
      let bossOn = false, bossHp = Math.ceil(70 * EHP), bossHpMax = bossHp, bossT = 0, bossCd = 2, bossDead = false, bz = 160;
      // ---- 状態 ----
      let x = 0, y = -0.5, vx = 0, vy = 0, shield = { easy: 7, normal: 5, hard: 4, ultra: 3 }[D] || 5, inv = 0, power = 1, bombs = 2, score = 0, fireCd = 0, tAll = 0, phase = "play", tEnd = 0, waveI = 0, kills = 0;
      const SH0 = shield;
      // 出てくる順番（秒, 種類, パターン）
      const WAVES = [];
      for (let s = 2; s < 58; s += 2.2) { const k = Math.floor(s / 2.2) % 6; WAVES.push([s, ["vline", "sine", "rock", "fighter", "carrier", "vee"][k]]); }
      function wave(kind) {
        if (kind === "vline") for (let i = 0; i < 4; i++) spawn("drone", rnd(-XR, XR), rnd(-YR, YR), SPAWNZ + i * 6);
        else if (kind === "sine") { const yy = rnd(-3, 3); for (let i = 0; i < 5; i++) { const f = spawn("drone", -6 + i * 3, yy, SPAWNZ + i * 4); f.sine = 1; } }
        else if (kind === "rock") { spawn("rock", rnd(-6, 6), rnd(-3, 3), SPAWNZ); spawn("rock", rnd(-6, 6), rnd(-3, 3), SPAWNZ + 20); }
        else if (kind === "fighter") { spawn("fighter", rnd(-6, -1), rnd(-3, 3), SPAWNZ); spawn("fighter", rnd(1, 6), rnd(-3, 3), SPAWNZ + 8); }
        else if (kind === "carrier") { spawn("carrier", rnd(-5, 5), rnd(-2, 2), SPAWNZ); spawn("drone", rnd(-XR, XR), rnd(-YR, YR), SPAWNZ + 10); }
        else { for (let i = -2; i <= 2; i++) spawn("drone", i * 2.4, Math.abs(i) * 1.2 - 1, SPAWNZ + Math.abs(i) * 5); }
      }
      function hurt() {
        if (inv > 0 || phase !== "play") return; shield--; inv = 1.4; ctx.shake.add(0.5); ctx.overlay.flash("#ff6b6b", 0.35); FX.SFX.crash(); ctx.fx3.burst(new T.Vector3(x, y, 0), [0xff6b6b, 0xffd43b], 16, 4, 0.4);
        if (power > 1) { power--; ctx.say("パワーダウン…", 1); }
        if (shield <= 0) { phase = "over"; tEnd = 0; ship.visible = false; ctx.fx3.burst(new T.Vector3(x, y, 0), [0xff922b, 0xffd43b, 0xffffff], 50, 8, 1.2); S.boom ? S.boom() : FX.SFX.crash(); ctx.big("やられた…", 1.6, "#ff8787"); }
        hud();
      }
      function kill(f, i) { score += f.pts; kills++; ctx.fx3.burst(new T.Vector3(f.x, f.y, f.z), f.type === "rock" ? [0x8d7b68, 0xced4da] : [0xff922b, 0xffd43b, 0xffffff], 18, 5, 0.5); FX.SFX.hit(); if (f.type === "carrier") { const m = new T.Mesh(pGeo, pM); m.position.set(f.x, f.y, f.z); scene.add(m); items.push({ m, x: f.x, y: f.y, z: f.z }); } scene.remove(f.m); foes.splice(i, 1); }
      function bomb() {
        if (bombs <= 0 || phase !== "play") return; bombs--; ctx.overlay.flash("#ffffff", 0.5); ctx.shake.add(0.6); S.boom ? S.boom() : FX.SFX.crash(); ctx.big("ボム！", 0.8, "#ffe066");
        for (let i = foes.length - 1; i >= 0; i--) if (foes[i].z < 100) kill(foes[i], i);
        eshots.forEach((e) => scene.remove(e.m)); eshots.length = 0;
        if (bossOn && !bossDead) dmgBoss(15, true);
        hud();
      }
      function dmgBoss(n, any) {
        const alive = cannons.filter((c) => !c.dead);
        bossHp -= alive.length && !any ? n * 0.35 : n; core.material.color.setHex(0xffffff); setTimeout(() => core.material.color.setHex(0xff3b3b), 60);
        if (bossHp <= 0 && !bossDead) { bossDead = true; score += 5000; phase = "over"; tEnd = 0; ctx.big("ボス撃破！", 2, "#ffe066"); S.cheer && S.cheer(); FX.SFX.finish(); for (let k = 0; k < 4; k++) setTimeout(() => { if (!ctx.st.dead) { ctx.fx3.burst(new T.Vector3(rnd(-6, 6), rnd(-1, 2), bz), [0xff922b, 0xffd43b, 0xffffff], 40, 9, 1.2); ctx.shake.add(0.5); } }, k * 250); }
      }
      function hud() { ctx.hud({ big: score + "", sub: "シールド " + "■".repeat(Math.max(0, shield)) + "□".repeat(Math.max(0, SH0 - shield)), sub2: "パワー " + power + "・ボム " + bombs, right: bossOn ? "ボス" : Math.max(0, Math.ceil(60 - tAll)) + "秒", gauge: bossOn ? Math.max(0, bossHp / bossHpMax) : -1, gaugeCol: "#ff6b6b" }); }
      const camL = new T.Vector3(0, 0, 20);
      hud();
      return {
        dbg: () => ({ phase, x, y, score, shield, power, bombs, bossOn, bossHp, foes: foes.filter((f) => f.z > 2 && f.z < 90).map((f) => ({ x: f.x, y: f.y, z: f.z })), shots: eshots.filter((e) => e.z < 25 && e.z > 0).map((e) => ({ x: e.x, y: e.y, z: e.z })), boss: bossOn ? { x: boss.position.x, z: bz, cannons: cannons.filter((c) => !c.dead).map((c) => boss.position.x + c.s * 6) } : null }),
        step(dt, t) {
          const go = ctx.st.go && phase === "play";
          // 星が流れる
          const arr = stG.attributes.position.array; for (let i = 2; i < arr.length; i += 3) { arr[i] -= dt * 60; if (arr[i] < -10) arr[i] += 310; } stG.attributes.position.needsUpdate = true;
          planet.rotation.y += dt * 0.05;
          if (go) {
            tAll += dt;
            const ax = -inp.x(), ay = inp.y();
            vx = lerp(vx, ax * 11, Math.min(1, dt * 8)); vy = lerp(vy, ay * 8, Math.min(1, dt * 8));
            x = clamp(x + vx * dt, -XR, XR); y = clamp(y + vy * dt, -YR, YR);
            inv = Math.max(0, inv - dt);
            fireCd -= dt;
            if (inp.held.a && fireCd <= 0) {
              fireCd = 0.11; const L = (dx, ddx) => { const m = new T.Mesh(laserGeo, laserM); m.position.set(x + dx, y, 1.2); scene.add(m); shots.push({ m, x: x + dx, y, z: 1.2, vx: ddx }); };
              if (power === 1) L(0, 0); else if (power === 2) { L(-0.6, 0); L(0.6, 0); } else { L(-0.6, 0); L(0.6, 0); L(-0.9, -9); L(0.9, 9); }
              if ((t * 20 | 0) % 2 === 0) FX.tone && FX.tone(880, 0.04, "square", 0.03, 660);
            }
            if (inp.hit("b")) bomb();
            // 出てくる
            while (waveI < WAVES.length && tAll >= WAVES[waveI][0]) { wave(WAVES[waveI][1]); waveI++; }
            if (!bossOn && tAll > 62) { bossOn = true; boss.visible = true; ctx.big("ボスがきた！", 1.8, "#ff6b6b"); FX.SFX.countdown && FX.SFX.countdown(); }
          } else { inp.hit("b"); }
          // 自機
          ship.position.set(x, y, 0); body.rotation.z = -vx * 0.022; body.rotation.x = -vy * 0.02; ship.visible = phase !== "over" || shield > 0 ? (inv > 0 ? (t * 20 | 0) % 2 === 0 : true) : false;
          if (shield <= 0) ship.visible = false;
          flame.children.forEach((f, k) => { f.scale.y = 0.8 + Math.sin(t * 40 + k) * 0.22; });
          // レーザー
          for (let i = shots.length - 1; i >= 0; i--) {
            const s = shots[i], z0 = s.z; s.z += 95 * dt; s.x += s.vx * dt; let hit = false;
            for (let j = foes.length - 1; j >= 0 && !hit; j--) { const f = foes[j]; if (f.z + f.r >= z0 && f.z - f.r <= s.z + 0.8 && Math.hypot(f.x - s.x, f.y - s.y) < f.r) { hit = true; f.hp--; f.m.scale.setScalar(1.15); if (f.hp <= 0) kill(f, j); else FX.tone && FX.tone(300, 0.03, "square", 0.03); } }
            if (!hit && bossOn && !bossDead && s.z >= bz - 3 && z0 <= bz + 2) {
              const bx = boss.position.x;
              for (const c of cannons) { if (!c.dead && Math.hypot(bx + c.s * 6 - s.x, -0.2 - s.y + boss.position.y * 0) < 1.3) { hit = true; c.hp--; c.m.material.emissive.setHex(0xffffff); setTimeout(() => c.m.material.emissive.setHex(0x4a3500), 50); if (c.hp <= 0) { c.dead = true; c.m.visible = false; score += 1500; ctx.big("砲台をこわした！", 1.2, "#ffd43b"); ctx.fx3.burst(new T.Vector3(bx + c.s * 6, -0.2, bz - 2.6), [0xff922b, 0xffd43b], 30, 6, 0.8); ctx.shake.add(0.4); } break; } }
              if (!hit && Math.abs(s.x - bx) < 4.5 && Math.abs(s.y - 0.2) < 1.8) { hit = true; dmgBoss(1); }
            }
            if (hit || s.z > 160) { scene.remove(s.m); shots.splice(i, 1); } else s.m.position.set(s.x, s.y, s.z);
          }
          // 敵
          for (let i = foes.length - 1; i >= 0; i--) {
            const f = foes[i]; f.t += dt; f.m.scale.lerp(new T.Vector3(1, 1, 1), dt * 10);
            if (go) { f.z -= f.vz * dt * (f.z > 70 ? 1.6 : 1); if (f.sine) f.x = f.x0 + Math.sin(f.t * 2.2) * 3; if (f.type === "drone" && !f.sine) f.y = f.y0 + Math.sin(f.t * 1.8) * 1.2; }
            f.m.rotation.y += dt * 2; if (f.type === "rock") f.m.rotation.x += dt;
            if (f.type === "fighter") { f.m.rotation.y = 0; f.m.rotation.z += dt * 3; f.x += (x - f.x) * dt * 0.3; if (go && f.z < 75 && f.z > 25) { f.cd -= dt; if (f.cd <= 0) { f.cd = rnd(1.0, 1.6) / ESHOT; eshoot(f.x, f.y, f.z, x, y, 24 * ESHOT + 8); } } }
            f.m.position.set(f.x, f.y, f.z);
            if (f.z < 1.2 && f.z > -1.2 && Math.hypot(f.x - x, f.y - y) < f.r + 0.6) { hurt(); kill(f, i); continue; }
            if (f.z < -8) { scene.remove(f.m); foes.splice(i, 1); }
          }
          // 敵の弾
          for (let i = eshots.length - 1; i >= 0; i--) {
            const e = eshots[i]; if (go) { e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; }
            e.m.position.set(e.x, e.y, e.z);
            if (e.z < 0.6 && e.z > -0.6 && Math.hypot(e.x - x, e.y - y) < 0.75) { hurt(); scene.remove(e.m); eshots.splice(i, 1); continue; }
            if (e.z < -6) { scene.remove(e.m); eshots.splice(i, 1); }
          }
          // アイテム
          for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i]; it.z -= 20 * dt; it.x += (x - it.x) * dt * 1.2; it.y += (y - it.y) * dt * 1.2; it.m.rotation.y += dt * 3; it.m.position.set(it.x, it.y, it.z);
            if (Math.abs(it.z) < 1.5 && Math.hypot(it.x - x, it.y - y) < 1.4) { if (power < 3) { power++; ctx.big("パワーアップ！", 1, "#ffd43b"); } else { score += 500; ctx.big("+500", 0.8, "#ffd43b"); } FX.SFX.itemGet(); scene.remove(it.m); items.splice(i, 1); hud(); continue; }
            if (it.z < -6) { scene.remove(it.m); items.splice(i, 1); }
          }
          // ボス
          if (bossOn) {
            bossT += dt; bz = Math.max(48, bz - dt * 25);
            boss.position.set(Math.sin(bossT * 0.5) * 4, Math.sin(bossT * 0.8) * 1.2, bz); boss.rotation.z = Math.sin(bossT * 0.5) * 0.08;
            core.scale.setScalar(1 + Math.sin(t * 8) * 0.08);
            if (go && bz <= 50 && !bossDead) {
              bossCd -= dt;
              if (bossCd <= 0) {
                const pat = Math.floor(bossT / 4) % 3, bx = boss.position.x, by = boss.position.y, spd = 20 * ESHOT + 8;
                if (pat === 0) { for (let k = -2; k <= 2; k++) eshoot(bx, by, bz - 3, x + k * 2.5, y, spd); bossCd = 1.8 / ESHOT; }
                else if (pat === 1) { cannons.forEach((c) => { if (!c.dead) eshoot(bx + c.s * 6, by - 0.2, bz - 3, x, y, spd + 4); }); bossCd = 0.7 / ESHOT; }
                else { for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + bossT; eshoot(bx, by, bz - 3, bx + Math.cos(a) * 7, by + Math.sin(a) * 4, spd - 4); } bossCd = 2.2 / ESHOT; }
              }
            }
          }
          // カメラ
          camera.position.lerp(new T.Vector3(x * 0.55, y * 0.5 + 2.3, -9.5), Math.min(1, dt * 5)); camL.lerp(new T.Vector3(x * 0.6, y * 0.5, 24), Math.min(1, dt * 5)); camera.lookAt(camL);
          if ((t * 5 | 0) !== ((t - dt) * 5 | 0)) hud();
          if (phase === "over") {
            tEnd += dt;
            if (tEnd > 2.2) { phase = "end"; const win = bossDead;
              ctx.end({ win, title: win ? "クリア！ " + score + "点" : "ゲームオーバー " + score + "点", text: "たおした敵 " + kills + "・のこりシールド " + Math.max(0, shield), metric: { v: score, unit: "点", lower: false, label: "スコア" } }); }
          }
        }
      };
    }
  });

  // =====================================================================
  // 雪合戦ロイヤル：6人で雪玉を投げ合い、さいごまで残った人の勝ち
  // =====================================================================
  HM3D.register({
    id: "snowfight", e: "☃️", n: "雪合戦ロイヤル", c: "#74c0fc", genre: "battle", title: "雪合戦ロイヤル",
    d: "3Dの雪の広場で6人の雪合戦！←↑↓→で動いて、「投げる」で近くの相手に雪玉。「かがむ」で雪の山にかくれよう。3回当たると退場。ふぶきがせまってくるよ。さいごまで残れば勝ち。",
    help: "←↑↓→ で動く（画面の右が右）<br>「投げる」（スペース）：前にいる相手へ<br>「かがむ」（X）：雪の山のかげで当たりにくい",
    arrows: "cross", buttons: [{ k: "a", label: "投げる", cls: "go big" }, { k: "b", label: "かがむ", cls: "" }],
    sky: 0xcfe3f5, fogCol: 0xe7f1fb, fogNear: 40, fogFar: 110, far: 200, fov: 55,
    setup(ctx) {
      const { T, scene, camera, inp, S, FX } = ctx;
      const D = ctx.diff, sk = ctx.sk, me = partnerColor(T, 0xe03131);
      const AR = 28, BR = 0.17, g = 14;
      // ---- 広場 ----
      const snowM = new T.MeshLambertMaterial({ emissive: 0x8796a8, map: (() => { const t = noiseTex(T, "#f4f8fc", ["#e9f1f9", "#ffffff", "#dde9f5"], 2); t.repeat.set(16, 16); return t; })() });
      flat(T, scene, 400, 400, snowM, 0, 0, 0);
      const rr = R01(31), trees = [], snowTops = [], rocks = [];
      for (let i = 0; i < 90; i++) { const a = rr() * Math.PI * 2, d = AR + 3 + rr() * 45; trees.push({ x: Math.cos(a) * d, y: 3.2, z: Math.sin(a) * d, s: 0.8 + rr() * 0.8 }); snowTops.push({ x: Math.cos(a) * d, y: 5.2 * (0.8 + rr() * 0) + 0.5, z: Math.sin(a) * d, s: 0.8 }); }
      inst(T, scene, new T.ConeGeometry(2.2, 6.5, 7), lam(T, 0x2b6a4a), trees);
      inst(T, scene, new T.ConeGeometry(1.1, 2.0, 7), lam(T, 0xf8fbff), snowTops);
      // 雪の山（かくれる場所）
      const mounds = [];
      const moundM = new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0x7f8fa3 });
      const mk = (x, z, r, h) => { const m = new T.Mesh(G(T, "mound", () => new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), moundM); m.scale.set(r, h, r); m.position.set(x, 0, z); scene.add(m); mounds.push({ x, z, r, h }); };
      for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2 + rr() * 0.4, d = 6 + rr() * 17; mk(Math.cos(a) * d, Math.sin(a) * d, 1.5 + rr() * 1.0, 1.25 + rr() * 0.35); }
      mk(0, 0, 2.2, 1.4);
      // 雪だるま（かざり）
      [[-AR + 3, 6], [AR - 4, -8], [5, AR - 4]].forEach(([x, z]) => { sph(T, scene, 0.9, 0xffffff, x, 0.8, z); sph(T, scene, 0.6, 0xffffff, x, 2.0, z); cone(T, scene, 0.1, 0.4, 6, 0xff922b, x, 2.05, z - 0.65).rotation.x = -Math.PI / 2; box(T, scene, 0.7, 0.5, 0.7, 0x212529, x, 2.75, z); });
      // ふぶきの輪
      const stormM = new T.MeshBasicMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false });
      const storm = new T.Mesh(new T.CylinderGeometry(1, 1, 6, 48, 1, true), stormM); storm.position.y = 3; scene.add(storm);
      // ---- 子どもたち ----
      const cols = [me, 0x1c7ed6, 0x2f9e44, 0xf08c00, 0x9c36b5, 0x0b7285];
      const names = ["あなた", "そら", "みどり", "だいち", "すみれ", "うみ"];
      const kids = cols.map((c, i) => {
        const a = athlete(T, scene, { shirt: c, pants: 0x343a40, cap: i === 0 ? 0xffffff : 0xf1f3f5, stripe: 0xffffff, glove: c, shoe: 0x495057, sock: 0x495057, noBake: true }); bakeTree(T, a.g);
        const ang = (i / 6) * Math.PI * 2 + 0.3, x = Math.cos(ang) * 18, z = Math.sin(ang) * 18;
        const tag = new T.Mesh(new T.PlaneGeometry(2.4, 0.6), new T.MeshBasicMaterial({ map: textTex(T, names[i], { w: 256, h: 64, bg: i ? "rgba(0,0,0,0.45)" : "#e03131", fg: "#fff", fs: 44 }), transparent: true, depthTest: false })); tag.renderOrder = 6; scene.add(tag);
        return { a, i, me: i === 0, x, z, face: Math.atan2(-x, -z), hp: i === 0 ? ({ easy: 5, normal: 3, hard: 3, ultra: 2 }[D] || 3) : 3, out: false, cd: 1 + rr() * 1.5, crouch: false, vx: 0, vz: 0, wp: { x, z }, tgt: null, cTime: 0, hitT: 0, tag, think: rr() * 1, outT: 0, cold: 0 };
      });
      const P = kids[0];
      const hearts = P.hp;
      const CPUCD = { easy: 2.0, normal: 1.45, hard: 1.1, ultra: 0.9 }[D] || 1.45, CPUERR = { easy: 1.6, normal: 1.05, hard: 0.7, ultra: 0.45 }[D] || 1.05;
      // ---- 雪玉 ----
      const balls = [], ballGeo = new T.SphereGeometry(BR, 8, 6), ballM = lam(T, 0xffffff);
      function blockedBy(x, z, y) { for (const m of mounds) { const d = Math.hypot(x - m.x, z - m.z); if (d < m.r) { const hh = m.h * Math.sqrt(Math.max(0, 1 - (d / m.r) ** 2)); if (y < hh) return true; } } return false; }
      function throwAt(k, tx, tz) {
        const sx = k.x + Math.sin(k.face) * 0.5, sz = k.z + Math.cos(k.face) * 0.5, sy = 1.6;
        const d = Math.hypot(tx - sx, tz - sz), tt = clamp(d / 17, 0.25, 1.4), ty = 1.0;
        const vx = (tx - sx) / tt, vz = (tz - sz) / tt, vy = (ty - sy + 0.5 * g * tt * tt) / tt;
        const m = new T.Mesh(ballGeo, ballM); m.position.set(sx, sy, sz); scene.add(m);
        balls.push({ m, x: sx, y: sy, z: sz, vx, vy, vz, owner: k, age: 0 });
        k.throwT = 0.35; if (k.me) S.throwS ? S.throwS() : FX.SFX.whoosh();
      }
      function nearestFoe(k, cone) {
        let best = null, bd = 1e9;
        kids.forEach((o) => { if (o === k || o.out) return; const dx = o.x - k.x, dz = o.z - k.z, d = Math.hypot(dx, dz); if (d > 24) return; if (cone) { let da = Math.atan2(dx, dz) - k.face; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > cone) return; } const sc = d + (cone ? Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - k.face), Math.cos(Math.atan2(dx, dz) - k.face))) * 6 : 0); if (sc < bd) { bd = sc; best = o; } });
        return best;
      }
      function hitKid(k, by) {
        if (phase !== "play" || k.out) return;
        k.hp--; k.hitT = 0.4; ctx.fx3.burst(new T.Vector3(k.x, 1.2, k.z), [0xffffff, 0xe7f5ff], 14, 2.5, 0.4);
        if (by && by.me) { hits++; ctx.big(k.hp > 0 ? "あたり！" : names[k.i] + " 退場！", 0.8, "#69db7c"); FX.SFX.star(); }
        if (k.me) { ctx.shake.add(0.35); ctx.overlay.flash("#e7f5ff", 0.35); FX.SFX.hit(); ctx.say(k.hp > 0 ? "当たった！ のこり ❤" + k.hp : "当たっちゃった…", 1.2); }
        if (k.hp <= 0) { k.out = true; k.outT = 0; place = kids.filter((o) => !o.out).length + 1; if (k.me) myPlace = place; }
        hud();
      }
      // ---- 状態 ----
      let tAll = 0, hits = 0, phase = "play", tEnd = 0, place = 6, myPlace = 0, stormR = AR + 2;
      const camL = new T.Vector3(P.x, 0, P.z);
      function hud() { const alive = kids.filter((k) => !k.out).length; ctx.hud({ big: "のこり " + alive + "人", sub: "❤".repeat(Math.max(0, P.hp)) + "♡".repeat(Math.max(0, hearts - P.hp)), sub2: "あてた " + hits + "回" + (tAll > 25 ? "・ふぶきがせまる！" : ""), right: Math.floor(tAll) + "秒" }); }
      hud();
      return {
        dbg: () => ({ phase, x: P.x, z: P.z, face: P.face, hp: P.hp, hits, alive: kids.filter((k) => !k.out).length, foes: kids.filter((k) => !k.me && !k.out).map((k) => ({ x: k.x, z: k.z })), stormR }),
        step(dt, t) {
          const go = ctx.st.go && phase === "play"; if (go) tAll += dt;
          // ふぶき：30秒から小さくなる
          if (go && tAll > 30) stormR = Math.max(7, stormR - dt * 0.35);
          storm.scale.set(stormR, 1, stormR); storm.rotation.y += dt * 0.2; stormM.opacity = tAll > 25 ? 0.28 + Math.sin(t * 3) * 0.06 : 0.12;
          // プレイヤー
          if (go && !P.out) {
            P.crouch = !!inp.held.b;
            const mx = -inp.x(), mz = inp.y(), sp = P.crouch ? 1.2 : 5.6 * (P.cold > 0 ? 0.6 : 1);
            P.vx = lerp(P.vx, mx * sp, Math.min(1, dt * 10)); P.vz = lerp(P.vz, mz * sp, Math.min(1, dt * 10));
            if (mx || mz) { const tf = Math.atan2(mx, mz); P.face += Math.atan2(Math.sin(tf - P.face), Math.cos(tf - P.face)) * Math.min(1, dt * 10); }
            P.cd -= dt;
            if (inp.hit("a") && P.cd <= 0 && !P.crouch) { const f = nearestFoe(P, 1.0); if (f) { P.face = Math.atan2(f.x - P.x, f.z - P.z); const lead = Math.hypot(f.x - P.x, f.z - P.z) / 17; throwAt(P, f.x + f.vx * lead * 0.8, f.z + f.vz * lead * 0.8); } else throwAt(P, P.x + Math.sin(P.face) * 14, P.z + Math.cos(P.face) * 14); P.cd = 0.5; }
          } else { inp.hit("a"); }
          // CPU
          kids.forEach((k) => {
            if (k.me || k.out || !go) return;
            k.think -= dt; k.cd -= dt;
            if (k.think <= 0) {
              k.think = rnd(0.6, 1.4); k.tgt = nearestFoe(k, 0) || null;
              const tg = k.tgt; let wx = k.x, wz = k.z;
              if (tg) { const dx = tg.x - k.x, dz = tg.z - k.z, d = Math.hypot(dx, dz) || 1, want = rnd(8, 13); const side = rnd(-1, 1) * 5; wx = tg.x - (dx / d) * want + (-dz / d) * side; wz = tg.z - (dz / d) * want + (dx / d) * side; }
              // たまに近くの雪山へ
              if (Math.random() < 0.3) { let bm = null, bd = 1e9; mounds.forEach((m) => { const d = Math.hypot(m.x - k.x, m.z - k.z); if (d < bd) { bd = d; bm = m; } }); if (bm && tg) { const dx = bm.x - tg.x, dz = bm.z - tg.z, d = Math.hypot(dx, dz) || 1; wx = bm.x + (dx / d) * (bm.r + 0.7); wz = bm.z + (dz / d) * (bm.r + 0.7); } }
              const rd = Math.hypot(wx, wz); if (rd > stormR - 2) { wx *= (stormR - 3) / rd; wz *= (stormR - 3) / rd; }
              k.wp = { x: wx, z: wz }; k.crouch = Math.random() < 0.18;
            }
            const dx = k.wp.x - k.x, dz = k.wp.z - k.z, d = Math.hypot(dx, dz), sp = k.crouch ? 0 : 4.6 * (0.85 + sk * 0.15) * (k.cold > 0 ? 0.6 : 1);
            if (d > 0.5) { k.vx = lerp(k.vx, (dx / d) * sp, Math.min(1, dt * 6)); k.vz = lerp(k.vz, (dz / d) * sp, Math.min(1, dt * 6)); } else { k.vx *= 0.8; k.vz *= 0.8; }
            const tg = k.tgt && !k.tgt.out ? k.tgt : null;
            if (tg) { const fa = Math.atan2(tg.x - k.x, tg.z - k.z); k.face += Math.atan2(Math.sin(fa - k.face), Math.cos(fa - k.face)) * Math.min(1, dt * 6); }
            else if (d > 0.5) k.face = Math.atan2(dx, dz);
            if (tg && k.cd <= 0) { const dd = Math.hypot(tg.x - k.x, tg.z - k.z); if (dd < 20) { k.crouch = false; const lead = dd / 17 * rnd(0.3, 1.0); throwAt(k, tg.x + tg.vx * lead + rnd(-1, 1) * CPUERR, tg.z + tg.vz * lead + rnd(-1, 1) * CPUERR); k.cd = CPUCD * rnd(0.8, 1.3) * (tg.me ? 1 : 1.25); } }
          });
          // 移動と衝突
          kids.forEach((k) => {
            if (k.out) return;
            k.x += k.vx * dt; k.z += k.vz * dt;
            mounds.forEach((m) => { const dx = k.x - m.x, dz = k.z - m.z, d = Math.hypot(dx, dz), md = m.r + 0.35; if (d < md && d > 1e-4) { k.x = m.x + (dx / d) * md; k.z = m.z + (dz / d) * md; } });
            const r = Math.hypot(k.x, k.z); if (r > AR) { k.x *= AR / r; k.z *= AR / r; }
            // ふぶきの外はさむい
            if (go && !k.out && r > stormR) { k.cold += dt; if (k.cold > 2.5) { k.cold = 0.01; hitKid(k, null); if (k.me) ctx.say("さむい！ ふぶきの中へもどろう", 1.4); } } else k.cold = 0;
          });
          for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) { const a = kids[i], b = kids[j]; if (a.out || b.out) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 0.8 && d > 1e-4) { const p = (0.8 - d) / 2; a.x -= dx / d * p; a.z -= dz / d * p; b.x += dx / d * p; b.z += dz / d * p; } }
          // 雪玉
          for (let i = balls.length - 1; i >= 0; i--) {
            const b = balls[i]; b.age += dt; let gone = false;
            for (let s2 = 0; s2 < 3 && !gone; s2++) {
              const h = dt / 3; b.vy -= g * h; b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
              if (b.y < 0.1 || blockedBy(b.x, b.z, b.y)) { gone = true; ctx.fx3.burst(new T.Vector3(b.x, Math.max(0.1, b.y), b.z), [0xffffff], 8, 1.6, 0.3); break; }
              for (const k of kids) { if (k.out || k === b.owner) continue; const top = k.crouch ? 0.95 : 1.75; if (Math.hypot(k.x - b.x, k.z - b.z) < 0.45 && b.y < top && b.y > 0.1) { gone = true; hitKid(k, b.owner); break; } }
            }
            if (b.age > 3) gone = true;
            if (gone) { scene.remove(b.m); balls.splice(i, 1); } else b.m.position.set(b.x, b.y, b.z);
          }
          // 見た目
          kids.forEach((k) => {
            const a = k.a, spd = Math.hypot(k.vx, k.vz);
            a.g.position.set(k.x, 0, k.z); a.g.rotation.y = k.face;
            if (k.out) { k.outT += dt; a.g.position.y = 0; a.hip.position.y = 0.45; a.legL.rotation.x = a.legR.rotation.x = -1.4; a.armR.rotation.set(-2.6, 0, Math.sin(t * 6) * 0.4); a.g.visible = k.outT < 4; k.tag.visible = false; return; }
            runPose(a, t * 11, Math.min(1, spd / 4.5));
            if (k.crouch) { a.hip.position.y = 0.55; a.legL.rotation.x = a.legR.rotation.x = -1.2; a.legL.userData.knee.rotation.x = a.legR.userData.knee.rotation.x = 2.0; }
            if (k.throwT > 0) { k.throwT -= dt; a.armR.rotation.x = -2.6 + (0.35 - k.throwT) * 8; }
            if (k.hitT > 0) { k.hitT -= dt; a.torso.rotation.x = -0.3; } else a.torso.rotation.x = 0;
            k.tag.position.set(k.x, 2.35, k.z); k.tag.quaternion.copy(camera.quaternion);
          });
          // カメラ
          camera.position.lerp(new T.Vector3(P.x, 10.5, P.z - 9.5), Math.min(1, dt * 4)); camL.lerp(new T.Vector3(P.x, 0, P.z + 3), Math.min(1, dt * 4)); camera.lookAt(camL);
          // 勝ち負け
          if (phase === "play") {
            const alive = kids.filter((k) => !k.out);
            if (P.out) { phase = "over"; tEnd = 0; ctx.big("退場… " + myPlace + "位", 1.8, "#ff8787"); }
            else if (alive.length === 1) { phase = "over"; tEnd = 0; myPlace = 1; ctx.big("さいごまで残った！", 1.8, "#ffe066"); S.cheer && S.cheer(); FX.SFX.finish(); }
            if ((t * 4 | 0) !== ((t - dt) * 4 | 0)) hud();
          } else if (phase === "over") {
            tEnd += dt;
            if (tEnd > 2) { phase = "end"; const win = myPlace === 1;
              ctx.end({ win, title: win ? "優勝！ 1位" : myPlace + "位", text: "あてた " + hits + "回・" + Math.round(tAll) + "秒", metric: { v: myPlace, unit: "位", lower: true, label: "順位" } }); }
          }
        }
      };
    }
  });

  // =====================================================================
  // タンクバトル：かべではね返る砲弾で、3台の敵戦車をたおす
  // =====================================================================
  HM3D.register({
    id: "tankbattle", e: "🪖", n: "タンクバトル", c: "#868e96", genre: "battle", title: "タンクバトル",
    d: "3Dのアリーナで戦車バトル！↑↓で前・後ろ、←→で向きを変える。「発射」の砲弾はかべで1回はね返るよ。3台の敵戦車をすべてたおせば勝ち。",
    help: "↑↓ で前・後ろ　←→ で向きを変える<br>「発射」（スペース）：砲弾はかべで1回はね返る<br>自分のはね返った弾にも気をつけて",
    arrows: "cross", buttons: [{ k: "a", label: "発射", cls: "go big" }],
    sky: 0xf4d6a0, fogCol: 0xf0d8a8, fogNear: 50, fogFar: 140, far: 220, fov: 58,
    setup(ctx) {
      const { T, scene, camera, inp, S, FX } = ctx;
      const D = ctx.diff, sk = ctx.sk, me = partnerColor(T, 0x2f9e44);
      const A = 22, TR = 1.35, SR = 0.22;
      // ---- アリーナ ----
      const sand = new T.MeshLambertMaterial({ map: (() => { const t = noiseTex(T, "#d9b77a", ["#cfa96a", "#e4c48d", "#c49d5c"], 3); t.repeat.set(12, 12); return t; })() });
      flat(T, scene, 300, 300, sand, 0, 0, 0);
      const wallM = lam(T, 0x8d8273);
      [[0, -A - 0.5, 2 * A + 2, 1], [0, A + 0.5, 2 * A + 2, 1], [-A - 0.5, 0, 1, 2 * A + 2], [A + 0.5, 0, 1, 2 * A + 2]].forEach(([x, z, w, d]) => { box(T, scene, w, 2.2, d, 0x8d8273, x, 1.1, z); box(T, scene, w + 0.1, 0.25, d + 0.1, 0xffd43b, x, 2.25, z); });
      const blocks = [];
      const addBlock = (x, z, w, d, col, h) => { blocks.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }); box(T, scene, w, h || 2.2, d, col || 0x9c8f7d, x, (h || 2.2) / 2, z); };
      const crateTex = KIT.canvasTex(T, 64, 64, (c, w, h) => { c.fillStyle = "#b07b3f"; c.fillRect(0, 0, w, h); c.strokeStyle = "#7a5228"; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); c.beginPath(); c.moveTo(4, 4); c.lineTo(w - 4, h - 4); c.stroke(); });
      const crateM = new T.MeshLambertMaterial({ map: crateTex });
      [[-8, -6, 8, 1.6], [8, 6, 8, 1.6], [0, 0, 1.6, 7], [-13, 10, 1.6, 8], [13, -10, 1.6, 8], [-4, 14, 6, 1.6], [4, -14, 6, 1.6]].forEach(([x, z, w, d]) => addBlock(x, z, w, d, 0x9c8f7d, 2.2));
      [[-15, -15], [15, 15], [16, -2], [-16, 2]].forEach(([x, z]) => { blocks.push({ x0: x - 1.1, x1: x + 1.1, z0: z - 1.1, z1: z + 1.1 }); const m = new T.Mesh(G(T, "crate22", () => new T.BoxGeometry(2.2, 2.2, 2.2)), crateM); m.position.set(x, 1.1, z); scene.add(m); });
      // まわりの岩・ドラム缶
      const rr = R01(23), rocks = [], drums = [];
      for (let i = 0; i < 60; i++) { const a = rr() * Math.PI * 2, d = A + 6 + rr() * 40; rocks.push({ x: Math.cos(a) * d, y: 0.5, z: Math.sin(a) * d, s: 1.5 + rr() * 3.5, ry: rr() * 3 }); }
      inst(T, scene, new T.DodecahedronGeometry(1, 0), lam(T, 0xb08d5b), rocks);
      for (let i = 0; i < 10; i++) drums.push({ x: (i % 2 ? 1 : -1) * (A - 0.9), y: 0.6, z: -18 + i * 4 });
      inst(T, scene, new T.CylinderGeometry(0.45, 0.45, 1.2, 10), lam(T, 0xc92a2a), drums);
      // ---- 戦車 ----
      function mkTank(col, dark) {
        const g = new T.Group(); scene.add(g);
        const hull = new T.Group(); g.add(hull);
        box(T, hull, 2.0, 0.6, 2.8, col, 0, 0.7, 0); box(T, hull, 1.8, 0.3, 0.6, dark, 0, 0.95, 1.2);
        [-1, 1].forEach((s) => { box(T, hull, 0.5, 0.65, 3.1, 0x343a40, s * 1.15, 0.38, 0); for (let i = 0; i < 4; i++) { const w = cyl(T, hull, 0.28, 0.28, 0.52, 10, 0x495057, s * 1.15, 0.32, -1.1 + i * 0.73); w.rotation.z = Math.PI / 2; } });
        bake(T, hull, true);
        const tur = new T.Group(); tur.position.y = 1.0; g.add(tur);
        cyl(T, tur, 0.75, 0.85, 0.5, 12, col, 0, 0.25, 0); box(T, tur, 0.5, 0.2, 0.5, dark, 0.3, 0.55, -0.3);
        const brl = cyl(T, tur, 0.11, 0.13, 1.8, 8, dark, 0, 0.28, 1.2); brl.rotation.x = Math.PI / 2;
        bake(T, tur, true);
        softShadow(T, g, 3.2, 4);
        return { g, tur };
      }
      const mkHp = () => { const m = new T.Mesh(new T.PlaneGeometry(1.8, 0.22), new T.MeshBasicMaterial({ color: 0xff6b6b, depthTest: false })); m.renderOrder = 5; scene.add(m); return m; };
      const player = Object.assign(mkTank(me, 0x1e5e2a), { x: 0, z: -17, h: 0, th: 0, hp: { easy: 7, normal: 5, hard: 4, ultra: 3 }[D] || 5, cd: 0, me: true, v: 0, dead: false });
      // 第10回：弱い・普通・強いの差をはっきり（敵の体力・ねらい補助）
      const EHP = { easy: 2, normal: 3, hard: 4, ultra: 4 }[D] || 3, AIM = { easy: 0.16, normal: 0.09, hard: 0.05, ultra: 0.035 }[D] || 0.09;
      const ecol = [0x868e96, 0x8a7b52, 0x6c757d];
      const spawns = [[-14, 17], [14, 17], [0, 19]];
      const enemies = spawns.map(([x, z], i) => Object.assign(mkTank(ecol[i], 0x343a40), { x, z, h: Math.PI, th: Math.PI, hp: EHP, cd: (D === "easy" ? 2.5 : 1.2) + i * 0.6, wp: null, stuck: 0, dead: false, bar: mkHp(), aimErr: 0 }));
      const tanks = [player].concat(enemies);
      const ER = { easy: 2.8, normal: 1.7, hard: 1.25, ultra: 0.95 }[D] || 1.7, EACC = { easy: 0.18, normal: 0.095, hard: 0.05, ultra: 0.03 }[D] || 0.095, ESP = { easy: 2.4, normal: 3.3, hard: 4.0, ultra: 4.6 }[D] || 3.3;
      // ---- 当たり判定 ----
      function inBlock(x, z, r) { if (Math.abs(x) > A - r || Math.abs(z) > A - r) return true; return blocks.some((b) => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r); }
      function pushOut(t) {
        t.x = clamp(t.x, -A + TR, A - TR); t.z = clamp(t.z, -A + TR, A - TR);
        blocks.forEach((b) => { const cx = clamp(t.x, b.x0, b.x1), cz = clamp(t.z, b.z0, b.z1), dx = t.x - cx, dz = t.z - cz, d = Math.hypot(dx, dz); if (d < TR) { if (d > 1e-4) { t.x = cx + (dx / d) * TR; t.z = cz + (dz / d) * TR; } else { t.x += TR; } } });
      }
      function segHits(x0, z0, x1, z1) { // 見通し（ブロックにさえぎられる？）
        for (const b of blocks) { let t0 = 0, t1 = 1; const dx = x1 - x0, dz = z1 - z0; let ok = true;
          for (const [p, d, lo, hi] of [[x0, dx, b.x0 - 0.3, b.x1 + 0.3], [z0, dz, b.z0 - 0.3, b.z1 + 0.3]]) { if (Math.abs(d) < 1e-6) { if (p < lo || p > hi) { ok = false; break; } } else { let a = (lo - p) / d, c = (hi - p) / d; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) { ok = false; break; } } }
          if (ok) return true; }
        return false;
      }
      // ---- 砲弾 ----
      const shells = [];
      const shellGeo = new T.SphereGeometry(SR, 8, 6), shellM = new T.MeshBasicMaterial({ color: 0xffe066 }), shellE = new T.MeshBasicMaterial({ color: 0xff6b6b });
      function fire(t) {
        const fx = Math.sin(t.th), fz = Math.cos(t.th), x = t.x + fx * 2.3, z = t.z + fz * 2.3;
        if (inBlock(x, z, SR)) { FX.SFX.hit(); return; }
        const m = new T.Mesh(shellGeo, t.me ? shellM : shellE); m.position.set(x, 1.28, z); scene.add(m);
        const sp = t.me ? 19 : 14 * (0.9 + sk * 0.1);
        shells.push({ m, x, z, vx: fx * sp, vz: fz * sp, b: 0, life: 3.2, owner: t, age: 0 });
        ctx.fx3.burst(new T.Vector3(x, 1.28, z), [0xffd43b, 0xff922b, 0xffffff], 8, 2.5, 0.25);
        S.shoot ? S.shoot() : FX.SFX.itemUse(); if (t.me) ctx.shake.add(0.15);
      }
      function boom(t) {
        t.dead = true; ctx.fx3.burst(new T.Vector3(t.x, 1.2, t.z), [0xff922b, 0xffd43b, 0x495057, 0x212529], 40, 6, 1.0); S.boom ? S.boom() : FX.SFX.crash(); ctx.shake.add(0.6);
        t.g.traverse((o) => { if (o.material && o.material.color && !o.material.map) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.3); } });
        t.tur.rotation.z = 0.5; t.tur.position.y = 0.85; if (t.bar) t.bar.visible = false;
      }
      // ---- 状態 ----
      let tAll = 0, phase = "play", tEnd = 0, shotsFired = 0, hits = 0;
      const camL = new T.Vector3();
      function hud() { const left = enemies.filter((e) => !e.dead).length; ctx.hud({ big: "のこり敵 " + left + "台", sub: "❤".repeat(Math.max(0, player.hp)), sub2: Math.floor(tAll) + "秒", right: "命中 <b>" + hits + "</b>" }); }
      function pickWp(e) { for (let i = 0; i < 30; i++) { const x = rnd(-A + 3, A - 3), z = rnd(-A + 3, A - 3); if (!inBlock(x, z, TR + 0.6)) { e.wp = { x, z }; return; } } e.wp = { x: 0, z: 10 }; }
      enemies.forEach(pickWp);
      hud();
      return {
        dbg: () => ({ phase, x: player.x, z: player.z, h: player.h, hp: player.hp, enemies: enemies.map((e) => ({ x: e.x, z: e.z, dead: e.dead, los: !segHits(player.x, player.z, e.x, e.z) })), hits }),
        step(dt, t) {
          const go = ctx.st.go && phase === "play";
          if (go) tAll += dt;
          // プレイヤー（←→で向き：右を押すと画面の右へ曲がる）
          if (go && !player.dead) {
            player.h -= inp.x() * 2.3 * dt;
            const tv = inp.y() > 0 ? 6.5 : inp.y() < 0 ? -3.8 : 0; player.v = lerp(player.v, tv, Math.min(1, dt * 5));
            player.x += Math.sin(player.h) * player.v * dt; player.z += Math.cos(player.h) * player.v * dt; pushOut(player);
            player.th = player.h;
            // ゆるいねらい補助（8°以内の敵に向ける）
            let best = null, bd = AIM; enemies.forEach((e) => { if (e.dead) return; const a = Math.atan2(e.x - player.x, e.z - player.z); let d = a - player.h; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < bd && !segHits(player.x, player.z, e.x, e.z)) { bd = Math.abs(d); best = d; } });
            if (best != null) player.th = player.h + best;
            player.cd -= dt; if (inp.hit("a") && player.cd <= 0) { fire(player); player.cd = 0.55; shotsFired++; }
          } else inp.hit("a");
          // 敵
          enemies.forEach((e, i) => {
            if (e.dead || !go) return;
            const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz), los = !player.dead && !segHits(e.x, e.z, player.x, player.z);
            if (!e.wp || Math.hypot(e.wp.x - e.x, e.wp.z - e.z) < 2 || e.stuck > 2.5) { pickWp(e); e.stuck = 0; if (los && dist > 14 && Math.random() < 0.6) e.wp = { x: e.x + dx * 0.4, z: e.z + dz * 0.4 }; else if (los && dist < 13) { const s2 = Math.random() < 0.5 ? 1 : -1; const wx = e.x + (dz / dist) * 7 * s2 - (dx / dist) * 3, wz = e.z - (dx / dist) * 7 * s2 - (dz / dist) * 3; if (!inBlock(wx, wz, TR + 0.5)) e.wp = { x: wx, z: wz }; } }
            const want = Math.atan2(e.wp.x - e.x, e.wp.z - e.z); let dh = Math.atan2(Math.sin(want - e.h), Math.cos(want - e.h));
            e.h += clamp(dh, -1.8 * dt, 1.8 * dt);
            const sp = Math.abs(dh) < 0.6 ? ESP * (los && dist < 10 ? 0.4 : 1) : 0.6; const ox = e.x, oz = e.z;
            e.x += Math.sin(e.h) * sp * dt; e.z += Math.cos(e.h) * sp * dt; pushOut(e);
            if (Math.hypot(e.x - ox, e.z - oz) < sp * dt * 0.3) e.stuck += dt; else e.stuck = Math.max(0, e.stuck - dt);
            // 砲塔：見えていればプレイヤーへ（少しずれる）
            const ta = los ? Math.atan2(dx + player.v * Math.sin(player.h) * dist / 14 * 0.6, dz + player.v * Math.cos(player.h) * dist / 14 * 0.6) + e.aimErr : e.h;
            const dth = Math.atan2(Math.sin(ta - e.th), Math.cos(ta - e.th)); e.th += clamp(dth, -2.2 * dt, 2.2 * dt);
            e.cd -= dt; if (los && e.cd <= 0 && Math.abs(dth) < 0.08 && dist < 34) { fire(e); e.cd = ER * rnd(0.85, 1.25); e.aimErr = rnd(-1, 1) * EACC * 2; }
          });
          // 戦車どうし
          for (let i = 0; i < tanks.length; i++) for (let j = i + 1; j < tanks.length; j++) { const a = tanks[i], b = tanks[j]; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < TR * 2 && d > 1e-4) { const p = (TR * 2 - d) / 2; if (!a.dead) { a.x -= (dx / d) * p; a.z -= (dz / d) * p; } if (!b.dead) { b.x += (dx / d) * p; b.z += (dz / d) * p; } } }
          // 砲弾
          for (let i = shells.length - 1; i >= 0; i--) {
            const s = shells[i]; s.age += dt; s.life -= dt; let gone = s.life <= 0;
            const N = 3; for (let k = 0; k < N && !gone; k++) {
              const h = dt / N, nx = s.x + s.vx * h, nz = s.z + s.vz * h;
              if (inBlock(nx, nz, SR)) {
                if (s.b >= 1) { gone = true; ctx.fx3.burst(new T.Vector3(s.x, 1.28, s.z), [0xadb5bd, 0xffd43b], 8, 2, 0.3); FX.SFX.hit(); break; }
                const bx = inBlock(nx, s.z, SR), bz = inBlock(s.x, nz, SR);
                if (bx) s.vx *= -1; if (bz) s.vz *= -1; if (!bx && !bz) { s.vx *= -1; s.vz *= -1; }
                s.b++; ctx.fx3.burst(new T.Vector3(s.x, 1.28, s.z), [0xffffff, 0xffd43b], 6, 2, 0.2); S.bounce ? S.bounce() : FX.SFX.hit();
              } else { s.x = nx; s.z = nz; }
              for (const tk of tanks) { if (tk.dead || (tk === s.owner && s.b === 0)) continue; if (Math.hypot(tk.x - s.x, tk.z - s.z) < TR + SR) { gone = true; tk.hp--; if (s.owner.me && !tk.me) hits++; ctx.fx3.burst(new T.Vector3(s.x, 1.3, s.z), [0xff922b, 0xffd43b, 0xffffff], 16, 3.5, 0.45); FX.SFX.crash ? FX.SFX.crash() : 0;
                  if (tk.me) { ctx.shake.add(0.5); ctx.overlay.flash("#ff6b6b", 0.3); ctx.say(s.owner === tk ? "自分の弾が当たった！" : "当たった！ のこり ❤" + Math.max(0, tk.hp), 1.2); }
                  else ctx.big(tk.hp > 0 ? "命中！" : "撃破！", 0.8, tk.hp > 0 ? "#ffd43b" : "#69db7c");
                  if (tk.hp <= 0) boom(tk); hud(); break; } }
            }
            if (gone) { scene.remove(s.m); shells.splice(i, 1); } else s.m.position.set(s.x, 1.28, s.z);
          }
          // 見た目
          tanks.forEach((tk) => { tk.g.position.set(tk.x, 0, tk.z); tk.g.rotation.y = tk.h; tk.tur.rotation.y = tk.th - tk.h; if (tk.bar) { tk.bar.position.set(tk.x, 3.1, tk.z); tk.bar.quaternion.copy(camera.quaternion); tk.bar.scale.x = Math.max(0.01, tk.hp / EHP); } });
          // カメラ（戦車のうしろ）
          const fx = Math.sin(player.h), fz = Math.cos(player.h);
          camera.position.lerp(new T.Vector3(player.x - fx * 11, 11.5, player.z - fz * 11), Math.min(1, dt * 4)); camL.lerp(new T.Vector3(player.x + fx * 8, 0, player.z + fz * 8), Math.min(1, dt * 5)); camera.lookAt(camL);
          // 勝ち負け
          if (phase === "play") {
            if (player.hp <= 0) { if (!player.dead) boom(player); phase = "over"; tEnd = 0; ctx.big("やられた…", 1.6, "#ff8787"); }
            else if (enemies.every((e) => e.dead)) { phase = "over"; tEnd = 0; ctx.big("ぜんぶ撃破！", 1.6, "#ffe066"); S.cheer && S.cheer(); FX.SFX.finish(); }
            if ((t * 4 | 0) !== ((t - dt) * 4 | 0)) hud();
          } else if (phase === "over") {
            tEnd += dt;
            if (tEnd > 1.8) { phase = "end"; const win = !player.dead; const left = enemies.filter((e) => !e.dead).length;
              ctx.end({ win, title: win ? "勝ち！ " + Math.round(tAll) + "秒で全滅" : "負け… のこり " + left + "台", text: "命中 " + hits + "発・発射 " + shotsFired + "発", metric: win ? { v: Math.round(tAll * 10) / 10, unit: "秒", lower: true, label: "クリアタイム" } : null }); }
          }
        }
      };
    }
  });

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
