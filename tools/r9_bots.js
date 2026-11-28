/* 第9回のテスト用ボット（tools/test_r9.py が読みこむ。アプリには入らない） */
window.__R9BOTS = {
  parkour: () => (() => {
  const key = (k, d) => window.dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { key: k }));
  const tap = (k) => { key(k, true); setTimeout(() => key(k, false), 40); };
  key("ArrowUp", true); let busy = 0;
  const it = setInterval(() => { const s = window.__G3D; if (!s || s.dead) { clearInterval(it); return; } const d = s.game.dbg(); if (d.fin) { key("ArrowUp", false); return; }
    if (performance.now() < busy) return;
    const lead = Math.max(1.2, d.v * 0.28);
    if (d.ground && d.gapAt != null && d.gapAt - d.z < lead && d.gapAt - d.z > 0) { tap(" "); busy = performance.now() + 300; return; }
    for (const o of d.ahead) { const dz = o.z - d.z;
      if (o.type === "ac" && o.lanes.includes(d.li) && dz < 8 && dz > -1) { const c = [0, 1, 2].filter((l) => !o.lanes.includes(l)).sort((a, b) => Math.abs(a - d.li) - Math.abs(b - d.li))[0]; if (c != null) { tap(c > d.li ? "ArrowRight" : "ArrowLeft"); busy = performance.now() + 200; return; } }
      if (o.type === "vent" && o.lanes.includes(d.li) && dz < lead && dz > 0 && d.ground) { tap(" "); busy = performance.now() + 300; return; }
      if (o.type === "pipe" && dz < lead * 0.9 && dz > 0 && d.ground) { tap("ArrowDown"); busy = performance.now() + 300; return; }
    }
  }, 20);
})(),
  starfighter: () => (() => {
  const key = (k, d) => window.dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { key: k })); const held = {};
  const set = (k, v) => { if (!!held[k] !== !!v) { held[k] = v; key(k, v); } };
  set(" ", true);
  const it = setInterval(() => { const s = window.__G3D; if (!s || s.dead) { clearInterval(it); return; } const d = s.game.dbg();
    let tx = 0, ty = 0;
    if (d.boss) { tx = d.boss.cannons.length ? d.boss.cannons[0] : d.boss.x; ty = 0; }
    else if (d.foes.length) { const f = d.foes.sort((a, b) => a.z - b.z)[0]; tx = f.x; ty = f.y; }
    const th = d.shots.find((e) => e.z < 14 && Math.hypot(e.x - d.x, e.y - d.y) < 1.6);
    if (th) { tx = d.x + (th.x > d.x ? -3 : 3); ty = d.y + (th.y > d.y ? -2 : 2); }
    const dx = tx - d.x, dy = ty - d.y;
    set("ArrowLeft", dx > 0.3); set("ArrowRight", dx < -0.3); set("ArrowUp", dy > 0.3); set("ArrowDown", dy < -0.3);
  }, 30);
})(),
  snowfight: () => (() => {
  const key = (k, d) => window.dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { key: k })); const held = {};
  const set = (k, v) => { if (!!held[k] !== !!v) { held[k] = v; key(k, v); } };
  let lastF = 0;
  const it = setInterval(() => { const s = window.__G3D; if (!s || s.dead) { clearInterval(it); return; } const d = s.game.dbg();
    if (!d.foes.length) { ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].forEach((k) => set(k, false)); return; }
    const f = d.foes.slice().sort((a, b) => Math.hypot(a.x - d.x, a.z - d.z) - Math.hypot(b.x - d.x, b.z - d.z))[0];
    let dx = f.x - d.x, dz = f.z - d.z; const dist = Math.hypot(dx, dz);
    const r = Math.hypot(d.x, d.z); if (r > d.stormR - 3) { dx = -d.x; dz = -d.z; }
    const mv = dist > 10 || r > d.stormR - 3; const n = Math.hypot(dx, dz) || 1;
    set("ArrowLeft", mv && dx / n > 0.35); set("ArrowRight", mv && dx / n < -0.35); set("ArrowUp", mv && dz / n > 0.35); set("ArrowDown", mv && dz / n < -0.35);
    if (dist < 18 && performance.now() - lastF > 550) { lastF = performance.now(); key(" ", true); setTimeout(() => key(" ", false), 40); }
  }, 30);
})(),
  tankbattle: () => (() => {
  const key = (k, d) => window.dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { key: k })); const held = {};
  const set = (k, v) => { if (!!held[k] !== !!v) { held[k] = v; key(k, v); } };
  let lastF = 0;
  const it = setInterval(() => { const s = window.__G3D; if (!s || s.dead) { clearInterval(it); return; } const d = s.game.dbg();
    const al = d.enemies.filter((e) => !e.dead); if (!al.length) { ["ArrowLeft","ArrowRight","ArrowUp"].forEach((k) => set(k, false)); return; }
    al.sort((a, b) => (b.los - a.los) || (Math.hypot(a.x - d.x, a.z - d.z) - Math.hypot(b.x - d.x, b.z - d.z)));
    const e = al[0], a = Math.atan2(e.x - d.x, e.z - d.z); let df = Math.atan2(Math.sin(a - d.h), Math.cos(a - d.h));
    set("ArrowLeft", df > 0.06); set("ArrowRight", df < -0.06);
    const dist = Math.hypot(e.x - d.x, e.z - d.z);
    set("ArrowUp", !e.los || dist > 12 || (performance.now() / 1000 % 3) < 1.0);
    if (e.los && Math.abs(df) < 0.1 && performance.now() - lastF > 600) { lastF = performance.now(); key(" ", true); setTimeout(() => key(" ", false), 40); }
  }, 30);
})(),
  skydive: () => (() => {
  const key = (k, d) => window.dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { key: k })); const held = {};
  const set = (k, v) => { if (!!held[k] !== !!v) { held[k] = v; key(k, v); } };
  let opened = false;
  const it = setInterval(() => { const s = window.__G3D; if (!s || s.dead) { clearInterval(it); return; } const d = s.game.dbg();
    let tx = 0, tz = 0; if (d.phase === "fall" && d.next) { tx = d.next.x; tz = d.next.z; }
    const dx = tx - d.x, dz = tz - d.z, th = d.phase === "fall" ? 1.2 : 0.6;
    set("ArrowLeft", dx > th); set("ArrowRight", dx < -th); set("ArrowUp", dz > th); set("ArrowDown", dz < -th);
    if (d.phase === "fall" && d.alt < (window.__openAlt || 450) && !opened) { opened = true; key(" ", true); setTimeout(() => key(" ", false), 60); }
  }, 30);
})(),
};
