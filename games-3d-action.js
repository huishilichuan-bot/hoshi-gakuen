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
      const ecol = [0x868e96, 0x8a7b52, 0x6c757d];
      const spawns = [[-14, 17], [14, 17], [0, 19]];
      const enemies = spawns.map(([x, z], i) => Object.assign(mkTank(ecol[i], 0x343a40), { x, z, h: Math.PI, th: Math.PI, hp: 3, cd: 1.5 + i * 0.7, wp: null, stuck: 0, dead: false, bar: mkHp(), aimErr: 0 }));
      const tanks = [player].concat(enemies);
      const ER = { easy: 2.6, normal: 1.8, hard: 1.35, ultra: 1.05 }[D] || 1.8, EACC = { easy: 0.16, normal: 0.1, hard: 0.06, ultra: 0.035 }[D] || 0.1, ESP = { easy: 2.6, normal: 3.2, hard: 3.8, ultra: 4.3 }[D] || 3.2;
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
            let best = null, bd = 0.09; enemies.forEach((e) => { if (e.dead) return; const a = Math.atan2(e.x - player.x, e.z - player.z); let d = a - player.h; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < bd && !segHits(player.x, player.z, e.x, e.z)) { bd = Math.abs(d); best = d; } });
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
          tanks.forEach((tk) => { tk.g.position.set(tk.x, 0, tk.z); tk.g.rotation.y = tk.h; tk.tur.rotation.y = tk.th - tk.h; if (tk.bar) { tk.bar.position.set(tk.x, 3.1, tk.z); tk.bar.quaternion.copy(camera.quaternion); tk.bar.scale.x = Math.max(0.01, tk.hp / 3); } });
          // カメラ（戦車のうしろ）
          const fx = Math.sin(player.h), fz = Math.cos(player.h);
          camera.position.lerp(new T.Vector3(player.x - fx * 11, 11.5, player.z - fz * 11), Math.min(1, dt * 4)); camL.lerp(new T.Vector3(player.x + fx * 8, 0, player.z + fz * 8), Math.min(1, dt * 5)); camera.lookAt(camL);
          // 勝ち負け
          if (phase === "play") {
            if (player.hp <= 0 && !player.dead) { boom(player); phase = "over"; tEnd = 0; ctx.big("やられた…", 1.6, "#ff8787"); }
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
