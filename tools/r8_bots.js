/* 第8回のテスト用ボット（tools/test_r8.py が読みこむ。アプリには入らない） */
window.__R8BOTS = {
  baseball: () => (() => { const key = (k, d) => window.dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { key: k })); const held = {};
  const set = (k, v) => { if (!!held[k] !== !!v) { held[k] = v; key(k, v); } };
  const loop = () => { const s = window.__G3D; if (!s || s.dead) return; const d = s.game.dbg(); requestAnimationFrame(loop);
    if (d.pitch) { const du = d.pitch.u - d.cu + (window.__botErrU || 0), dv = d.pitch.v - d.cv + (window.__botErrV || 0);
      set("ArrowRight", du > 0.02); set("ArrowLeft", du < -0.02); set("ArrowUp", dv > 0.02); set("ArrowDown", dv < -0.02);
      const fdt = window.__lt != null && d.pitch.t > window.__lt ? d.pitch.t - window.__lt : 0.016; window.__lt = d.pitch.t;
      if (!window.__sw && d.pitch.t + fdt * 0.8 >= d.pitch.Tt - 0.13 - 0.008 + (window.__botErrT || 0)) { window.__sw = 1; key(" ", true); setTimeout(() => key(" ", false), 60); } }
    else { window.__sw = 0; window.__lt = null; ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].forEach((k) => set(k, false)); } };
  loop(); })(),
  rally: () => (() => {
  const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k === " " ? "Space" : k, bubbles: true }));
  let held = null, lastServe = 0, off = 0, lastR = -1;
  const set = (k) => { if (held === k) return; if (held) key("keyup", held); held = k; if (k) key("keydown", k); };
  setInterval(() => {
    const s = window.__G3D; if (!s || !s.game || !s.game.dbg) return; const d = s.game.dbg();
    if (d.phase === "serve" && d.server === "me" && performance.now() - lastServe > 1500) { lastServe = performance.now(); set(null); key("keydown", " "); setTimeout(() => key("keyup", " "), 60); return; }
    if (d.rallyN !== lastR) { lastR = d.rallyN; off = (Math.random() - 0.5) * d.reach * (window.__botErr || 1.6); }
    if (d.chance && window.__botSmash) { key("keydown", " "); setTimeout(() => key("keyup", " "), 30); }
    let tx = 0;
    if (d.hitter === "cpu" && d.pred) tx = d.pred.x + off;
    const dx = tx - d.px;
    if (Math.abs(dx) < d.reach * 0.2) set(null); else set(dx > 0 ? "ArrowLeft" : "ArrowRight");
  }, 16);
})(),
  basket: () => (() => {
  const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k === " " ? "Space" : k, bubbles: true }));
  let holding = false, moved = 0, n = 0;
  setInterval(() => {
    const s = window.__G3D; if (!s || !s.game || !s.game.dbg) return; const d = s.game.dbg();
    if (d.phase !== "ready") { if (holding) { key("keyup", " "); holding = false; } return; }
    if (!holding && d.shots === n && d.shots % 3 === 0 && moved !== d.shots) { moved = d.shots; key("keydown", d.shots % 2 ? "ArrowLeft" : "ArrowRight"); setTimeout(() => key("keyup", d.shots % 2 ? "ArrowLeft" : "ArrowRight"), 50); return; }
    if (!holding) { key("keydown", " "); holding = true; window.__tgt = d.zc + (Math.random() - 0.5) * d.ZW * (window.__botErr || 1.3); return; }
    if (d.pw >= window.__tgt) { key("keyup", " "); holding = false; n = d.shots + 1; }
  }, 16);
})(),
  bowling: () => (() => {
  const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k === " " ? "Space" : k, bubbles: true }));
  const tap = () => { key("keydown", " "); setTimeout(() => key("keyup", " "), 40); };
  let busy = 0, tx = 0.0, ta = 0, tp = 0.6;
  setInterval(() => {
    const s = window.__G3D; if (!s || !s.game || !s.game.dbg) return; const d = s.game.dbg();
    if (performance.now() < busy) return;
    const E = window.__botErr || 1;
    if (d.phase === "pos") { if (Math.abs(d.bx - tx) > 0.03) { const k = d.bx < tx ? "ArrowLeft" : "ArrowRight"; key("keydown", k); setTimeout(() => key("keyup", k), 30); busy = performance.now() + 50; } else { tap(); busy = performance.now() + 200; ta = (Math.random() - 0.5) * 0.02 * E; tp = 0.55 + (Math.random() - 0.5) * 0.2 * E; tx = 0.06 + (Math.random() - 0.5) * 0.15 * E; } }
    else if (d.phase === "aim") { if (Math.abs(d.ang - ta) < 0.006) { tap(); busy = performance.now() + 200; } }
    else if (d.phase === "power") { if (Math.abs(d.pw - tp) < 0.03) { tap(); busy = performance.now() + 200; } }
  }, 16);
})(),
};
