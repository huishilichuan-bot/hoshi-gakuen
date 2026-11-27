/* ほしの学園 — ゲーム共通の演出キット（パーティクル・トレイル・ブースト・シェイク・スピードライン・効果音）。オリジナル */
(function (root) {
  "use strict";
  const Fx = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---- 効果音（Web Audio） ----
  let actx = null;
  function ctx() {
    if (!actx) {
      try { actx = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function envGain(ac, t0, vol, a, d) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    g.connect(ac.destination);
    return g;
  }
  function tone(f, dur, type, vol, f2, delay) {
    const ac = ctx(); if (!ac) return;
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = envGain(ac, t0, vol || 0.1, 0.01, dur);
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    o.connect(g); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, hp) {
    const ac = ctx(); if (!ac) return;
    const n = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = n;
    const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 400;
    const t0 = ac.currentTime, g = envGain(ac, t0, vol || 0.08, 0.005, dur);
    src.connect(f); f.connect(g); src.start(t0); src.stop(t0 + dur + 0.02);
  }
  const SFX = {
    countdown: (n) => { if (n > 0) tone(660, 0.12, "square", 0.09); else { tone(880, 0.16, "square", 0.1); tone(1320, 0.28, "square", 0.1, null, 0.08); } },
    boost: () => { tone(420, 0.22, "sawtooth", 0.07, 1200); noise(0.18, 0.06, 800); },
    drift: () => noise(0.08, 0.05, 1800),
    itemGet: () => { tone(880, 0.07, "square", 0.07); tone(1320, 0.12, "square", 0.07, null, 0.06); },
    itemUse: () => { tone(740, 0.1, "triangle", 0.08, 520); },
    crash: () => { noise(0.22, 0.14, 200); tone(180, 0.18, "sawtooth", 0.08, 70); },
    finish: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, "triangle", 0.08, null, i * 0.1)); },
    hit: () => { tone(240, 0.1, "square", 0.08, 120); noise(0.08, 0.08, 600); },
    star: () => { tone(988, 0.08, "sine", 0.08); tone(1318, 0.2, "sine", 0.07, null, 0.07); },
    whoosh: () => { noise(0.2, 0.07, 400); tone(300, 0.2, "sine", 0.04, 900); }
  };

  // エンジン音（ループ）。set(0..1) で回転数
  function Engine() {
    this.ac = null; this.o1 = this.o2 = this.g = this.f = null; this.on = false;
  }
  Engine.prototype.start = function () {
    const ac = ctx(); if (!ac || this.on) return;
    this.ac = ac;
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o1.type = "sawtooth"; o2.type = "square";
    o1.frequency.value = 70; o2.frequency.value = 140;
    f.type = "lowpass"; f.frequency.value = 700;
    g.gain.value = 0.0001;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination);
    o1.start(); o2.start();
    this.o1 = o1; this.o2 = o2; this.g = g; this.f = f; this.on = true;
  };
  Engine.prototype.set = function (p, vol) {
    if (!this.on) return;
    const t = this.ac.currentTime;
    const v = clamp(p, 0, 1);
    this.o1.frequency.setTargetAtTime(70 + v * 180, t, 0.05);
    this.o2.frequency.setTargetAtTime(130 + v * 260, t, 0.05);
    this.f.frequency.setTargetAtTime(500 + v * 1400, t, 0.08);
    this.g.gain.setTargetAtTime((vol == null ? 0.03 : vol) * (0.35 + v * 0.75), t, 0.08);
  };
  Engine.prototype.stop = function () {
    if (!this.on) return;
    try { this.g.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + 0.08); this.o1.stop(this.ac.currentTime + 0.1); this.o2.stop(this.ac.currentTime + 0.1); } catch (e) {}
    this.on = false;
  };

  // ---- カメラシェイク ----
  function Shake() { this.x = 0; this.y = 0; this.z = 0; this.a = 0; }
  Shake.prototype.add = function (a) { this.a = Math.max(this.a, a); };
  Shake.prototype.step = function (dt) {
    this.a *= Math.pow(0.02, dt);
    if (this.a < 0.04) { this.a = 0; this.x = this.y = this.z = 0; return this; }
    this.x = rand(-this.a, this.a) * 0.02;
    this.y = rand(-this.a, this.a) * 0.012;
    this.z = rand(-this.a, this.a) * 0.02;
    return this;
  };

  // ---- 2D オーバーレイ：スピードライン・フラッシュ ----
  function Overlay(cv) {
    this.cv = cv; this.c = cv.getContext("2d");
    this.flashA = 0; this.flashC = "#fff"; this.speed = 0; this.lines = [];
    for (let i = 0; i < 18; i++) this.lines.push({ y: Math.random(), w: rand(0.4, 1), z: rand(0.2, 1), side: Math.random() < 0.5 ? -1 : 1 });
  }
  Overlay.prototype.resize = function (w, h, dpr) {
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + "px"; this.cv.style.height = h + "px";
    this.c.setTransform(dpr, 0, 0, dpr, 0, 0); this.w = w; this.h = h;
  };
  Overlay.prototype.flash = function (col, a) { this.flashC = col || "#fff"; this.flashA = Math.max(this.flashA, a || 0.4); };
  Overlay.prototype.step = function (dt, speed01) {
    this.speed = speed01 || 0;
    this.flashA = Math.max(0, this.flashA - dt * 2.2);
    const c = this.c, w = this.w, h = this.h;
    if (!w) return;
    c.clearRect(0, 0, w, h);
    if (this.speed > 0.55) {
      const str = (this.speed - 0.55) / 0.45;
      c.strokeStyle = "rgba(255,255,255," + (0.08 + str * 0.22) + ")";
      c.lineWidth = 2;
      for (const ln of this.lines) {
        ln.z += dt * (2.2 + str * 6) * ln.w;
        if (ln.z > 1.2) { ln.z = 0.15; ln.y = Math.random(); }
        const x0 = w / 2 + ln.side * (30 + ln.z * w * 0.55);
        const y0 = h * 0.42 + (ln.y - 0.5) * h * 0.8 * (0.3 + ln.z);
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + ln.side * (40 + ln.z * 90) * str, y0 + (ln.y - 0.5) * 20); c.stroke();
      }
    }
    if (this.flashA > 0) { c.fillStyle = this.flashC; c.globalAlpha = this.flashA * 0.5; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
  };

  // ---- 2D パーティクル袋（HUD やフォールバック用） ----
  function Bag() { this.list = []; }
  Bag.prototype.burst = function (x, y, color, n, sp, life, size) {
    n = n || 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (sp || 160) * (0.3 + Math.random() * 0.7);
      this.list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life || 0.6, max: life || 0.6, color: Array.isArray(color) ? color[i % color.length] : (color || "#fff"), size: (size || 3) * (0.6 + Math.random() * 0.8) });
    }
  };
  Bag.prototype.step = function (dt) {
    const g = 220;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += g * dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
    if (this.list.length > 220) this.list.splice(0, this.list.length - 220);
  };
  Bag.prototype.draw = function (c) {
    for (const p of this.list) {
      c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  };

  // ---- 3D パーティクル（Three.js が渡されたとき） ----
  function ThreeFx(THREE, scene) {
    this.T = THREE; this.scene = scene;
    this.geo = new THREE.SphereGeometry(1, 5, 4);
    this.pool = []; this.live = [];
    this.max = 80;
  }
  ThreeFx.prototype._mesh = function (color) {
    const T = this.T;
    const m = new T.Mesh(this.geo, new T.MeshBasicMaterial({ color: color, transparent: true, opacity: 1, depthWrite: false }));
    m.castShadow = false; m.receiveShadow = false;
    return m;
  };
  ThreeFx.prototype.burst = function (pos, color, n, sp, life) {
    n = Math.min(n || 12, this.max - this.live.length);
    for (let i = 0; i < n; i++) {
      const mesh = this.pool.pop() || this._mesh(color);
      const col = Array.isArray(color) ? color[i % color.length] : color;
      mesh.material.color.set(col || 0xffffff);
      mesh.position.copy(pos);
      const a = Math.random() * Math.PI * 2, b = rand(-0.4, 1.1), v = (sp || 6) * (0.3 + Math.random() * 0.7);
      mesh.userData = { vx: Math.cos(a) * v, vy: Math.sin(b) * v * 0.7 + 1.5, vz: Math.sin(a) * v, life: life || 0.45, max: life || 0.45, size: rand(0.08, 0.2) };
      mesh.visible = true; mesh.scale.setScalar(mesh.userData.size);
      this.scene.add(mesh); this.live.push(mesh);
    }
  };
  ThreeFx.prototype.step = function (dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const m = this.live[i], u = m.userData;
      u.life -= dt; u.vy -= 10 * dt;
      m.position.x += u.vx * dt; m.position.y += u.vy * dt; m.position.z += u.vz * dt;
      m.material.opacity = Math.max(0, u.life / u.max);
      m.scale.setScalar(u.size * (0.5 + u.life / u.max));
      if (u.life <= 0) { this.scene.remove(m); m.visible = false; this.live.splice(i, 1); this.pool.push(m); }
    }
  };
  ThreeFx.prototype.clear = function () {
    while (this.live.length) { const m = this.live.pop(); this.scene.remove(m); this.pool.push(m); }
  };

  Fx.clamp = clamp; Fx.rand = rand;
  Fx.ctx = ctx; Fx.tone = tone; Fx.noise = noise; Fx.SFX = SFX; Fx.Engine = Engine;
  Fx.Shake = Shake; Fx.Overlay = Overlay; Fx.Bag = Bag; Fx.ThreeFx = ThreeFx;
  root.HMFx = Fx;
})(typeof window !== "undefined" ? window : globalThis);
