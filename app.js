/* ほしの学園 — 勉強して⭐を集める学習アプリ（小1〜中3）。課金・お金の機能はありません。 */
(() => {
  "use strict";
  // ゲーム一覧の名前：長い名前も1行に収める（文字を少し小さく・必要なら横を少しつめる）
  function anFit(n) {
    let w = 0; for (const ch of String(n || "")) w += /[\u0000-\u00ff\uff61-\uff9f]/.test(ch) ? 0.56 : 1;
    if (w <= 6.9) return "";
    const fs = Math.max(9, Math.min(11, 76 / w)), sx = Math.min(1, 76 / (w * fs));
    return ' style="font-size:' + fs.toFixed(1) + 'px' + (sx < 0.99 ? ';--sx:' + sx.toFixed(3) : '') + '"';
  }
  const VERSION = "1.8.0";
  // 記録はプロフィールごとに分けて保存：ゲスト＝"hoshigakuen"、アカウント＝"hoshigakuen:u:<uid>"（ログアウトで消す）
  const GUEST_KEY = "hoshigakuen";
  let KEY = GUEST_KEY;
  try { const act = localStorage.getItem("hoshigakuen-active"); if (act) KEY = "hoshigakuen:u:" + act; } catch (e) {}
  const SCHEMA = 1;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const now = () => Date.now();
  // テスト用に時計をずらせる（?clock=ミリ秒 のときだけ）
  let clockOffset = 0;
  const today = () => dkey(now() + clockOffset);
  const pad = (n) => String(n).padStart(2, "0");
  function dkey(t) { const d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  // ---------- 定数 ----------
  const SUBJ = [
    { id: "math", n: "算数・数学", e: "🔢", c: "#2f7fd8" },
    { id: "ja", n: "国語", e: "📖", c: "#d9534f" },
    { id: "life", n: "生活", e: "🌱", c: "#4caf50" },
    { id: "sci", n: "理科", e: "🔬", c: "#8a5cd6" },
    { id: "soc", n: "社会", e: "🗾", c: "#e08a12" },
    { id: "en", n: "英語", e: "🔤", c: "#1f9a82" },
    { id: "tech", n: "技術", e: "🔧", c: "#3f6f8a" },
    { id: "home", n: "家庭", e: "🏠", c: "#c43b6e" },
    { id: "music", n: "音楽", e: "🎵", c: "#5b3ea8" },
    { id: "art", n: "美術", e: "🎨", c: "#d946a6" },
    { id: "pe", n: "保健体育", e: "🏃", c: "#2f9e62" },
  ];
  const subjById = (id) => SUBJ.find((s) => s.id === id);
  const gradeName = (g) => (g <= 6 ? "小" + g : "中" + (g - 6));
  const subjName = (s, g) => (s === "math" ? (g <= 6 ? "算数" : "数学") : subjById(s).n);
  const STARS_TO_UNLOCK = 4;
  const STEP_MIN = 7;
  const READ_MS = 1000;
  const GACHA_RATES = [40, 30, 15, 8.5, 4, 2, 0.5];
  const GACHA_RATES_SR = (() => { const t = GACHA_RATES.slice(2).reduce((a, b) => a + b, 0); return GACHA_RATES.map((r, i) => (i >= 2 ? (r / t) * 100 : 0)); })();
  const SHARD_DUP = [1, 1, 2, 2, 3, 4, 5];
  const STAR_COST = [3, 5, 8, 12, 20]; // ★1〜★5 に必要なかけら
  const DIFFS = [{ id: "easy", name: "弱い" }, { id: "normal", name: "中" }, { id: "hard", name: "強い" }, { id: "ultra", name: "最強" }];
  // ゲームのランク：勝ち1回のポイント（弱い1・中2・強い3・最強5）の合計で決まる
  const RANK_PT = { easy: 1, normal: 2, hard: 3, ultra: 5 };
  const RANKS = [[0, "ビギナー", "#adb5bd"], [3, "ブロンズ", "#c87f45"], [10, "シルバー", "#a5b4c8"], [25, "ゴールド", "#f5b700"], [50, "プラチナ", "#5ad1c8"], [100, "ダイヤ", "#74c0fc"], [200, "レジェンド", "#e599f7"]];
  const BGS = [
    { id: "note", n: "ノート", r: -1 }, { id: "sky", n: "青空", r: 1 }, { id: "sunset", n: "夕やけ", r: 2 }, { id: "night", n: "星空", r: 3 },
    { id: "aurora", n: "オーロラ", r: 4 }, { id: "gold", n: "黄金", r: 5 }, { id: "cosmos", n: "にじの宇宙", r: 6 },
  ];
  const MARUS = [
    { id: "red", n: "赤い⭕", r: -1 }, { id: "blue", n: "青い⭕", r: 1 }, { id: "star", n: "星つき⭕", r: 2 }, { id: "hanamaru", n: "花まる", r: 3 },
    { id: "rainbow", n: "にじ⭕", r: 4 }, { id: "gold", n: "金の⭕", r: 5 }, { id: "myth", n: "神話の⭕", r: 6 },
  ];
  const TITLES = [
    { id: "first", n: "はじめの一歩", ok: () => true, how: "最初から" },
    { id: "s10", n: "がんばり屋", ok: (c) => c.total >= 10, how: "⭐を合計10こ" },
    { id: "s50", n: "努力家", ok: (c) => c.total >= 50, how: "⭐を合計50こ" },
    { id: "s100", n: "学びの達人", ok: (c) => c.total >= 100, how: "⭐を合計100こ" },
    { id: "s300", n: "星の勇者", ok: (c) => c.total >= 300, how: "⭐を合計300こ" },
    { id: "s1000", n: "星の王", ok: (c) => c.total >= 1000, how: "⭐を合計1000こ" },
    { id: "r1", n: "顔見知り", ok: (c) => c.maxR >= 1, how: "相棒の仲良し度 Lv2" },
    { id: "r2", n: "声が聞こえる仲", ok: (c) => c.maxR >= 2, how: "相棒の仲良し度 Lv3" },
    { id: "r3", n: "星の制服の持ち主", ok: (c) => c.maxR >= 3, how: "相棒の仲良し度 Lv5" },
    { id: "r4", n: "心強い味方", ok: (c) => c.maxR >= 4, how: "相棒の仲良し度 Lv7" },
    { id: "r5", n: "かけがえのない存在", ok: (c) => c.maxR >= 5, how: "相棒の仲良し度 Lv9" },
    { id: "r6", n: "最高の相棒", ok: (c) => c.maxR >= 6, how: "相棒の仲良し度 Lv10" },
    { id: "boss1", n: "ボスハンター", ok: (c) => c.boss >= 1, how: "単元のボスに1回勝つ" },
    { id: "boss10", n: "ボスマスター", ok: (c) => c.boss >= 10, how: "10の単元でボスに勝つ" },
    { id: "boss50", n: "伝説のボスハンター", ok: (c) => c.boss >= 50, how: "50の単元でボスに勝つ" },
    { id: "box20", n: "ふくしゅう名人", ok: (c) => c.box >= 20, how: "まちがえた問題ボックスで20問クリア" },
    { id: "combo10", n: "コンボの星", ok: (c) => c.combo >= 10, how: "10問連続で正解" },
  ];

  // ---------- 保存 ----------
  function fresh() {
    return { schema: SCHEMA, created: now(), settings: { sound: true, haptic: true, nick: "", vol: 0.8, bgm: true, bgmVol: 0.5, remind: false, remindAt: "17:00", fs: "m", rmotion: false, grade: 0, hint: true }, days: {}, totalStars: 0, pulls: 0, pullsUsed: 0,
      chars: { mori: { n: 1, shards: 0, star: 0, t: now() } }, partner: "mori", look: { bg: "note", maru: "red", title: "first" },
      progress: {}, last: null, reports: [], gachaLog: [], games: {}, wrongBox: [], boxGone: {}, bossWins: {}, boxCleared: 0, bestCombo: 0, use: {}, gk: {}, tests: [], colorTests: {}, colorCoin: {}, kjWrong: [], kjBest: {}, kjTerm: {}, kjCoin: {}, examHist: [], examCoin: {} };
  }
  function migrate(s) {
    if (!s || typeof s !== "object") return fresh();
    const f = fresh();
    for (const k in f) if (s[k] == null) s[k] = f[k];
    s.settings = Object.assign(f.settings, s.settings || {});
    s.look = Object.assign(f.look, s.look || {});
    if (!s.chars.mori) s.chars.mori = f.chars.mori;
    if (!s.kjTerm || typeof s.kjTerm !== "object" || Array.isArray(s.kjTerm)) s.kjTerm = {};
    s.schema = SCHEMA;
    return s;
  }
  // ---------- 利用のようす（日ごと：勉強した時間・答えた数・正解の数・教科ごと）。運営者の管理画面で使う ----------
  const USE_DAYS = 400, USE_CAP_MS = 120000;
  function logUse(subj, ok, ms, counted) {
    try {
      const u = (state.use = state.use && typeof state.use === "object" ? state.use : {}), k = today();
      const d = (u[k] = u[k] || { ms: 0, n: 0, ok: 0, s: {} });
      d.ms += Math.max(0, Math.min(USE_CAP_MS, Math.round(ms || 0)));
      if (counted) { d.n++; if (ok) d.ok++; const sid = String(subj || "other"); const a = (d.s[sid] = d.s[sid] || [0, 0]); a[0]++; if (ok) a[1]++; }
      state.lastActive = now();
      const ks = Object.keys(u); if (ks.length > USE_DAYS) ks.sort().slice(0, ks.length - USE_DAYS).forEach((x) => delete u[x]);
    } catch (e) {}
  }
  let state;
  try { state = migrate(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { state = fresh(); }
  function save() { state.updatedAt = now(); try { if (window.HMSync) HMSync.dirty(); } catch (e) {} try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("保存できませんでした（容量がいっぱいかも）"); } }
  save();
  const dayRec = (k) => (state.days[k] = state.days[k] || { stars: 0, steps: {} });
  const starsToday = () => (state.days[today()] || { stars: 0 }).stars;
  const gamesOpen = () => starsToday() >= STARS_TO_UNLOCK;
  const pullsLeft = () => Math.max(0, state.pulls - state.pullsUsed);
  const maxRarity = () => (window.HMGK ? HMGK.maxRank() : 0);
  const titleCtx = () => ({ total: state.totalStars, maxR: maxRarity(), boss: Object.keys(state.bossWins || {}).length, box: state.boxCleared || 0, combo: state.bestCombo || 0 });

  // ---------- 音・振動・トースト ----------
  let actx = null;
  function tone(notes, type = "sine", vol = 0.18) {
    if (!state.settings.sound) return;
    const mv = state.settings.vol == null ? 0.8 : +state.settings.vol; if (mv <= 0.01) return; vol = Math.max(0.002, vol * mv);
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const t0 = actx.currentTime;
      notes.forEach(([f, d, len]) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(vol, t0 + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + len);
        o.connect(g); g.connect(actx.destination);
        o.start(t0 + d); o.stop(t0 + d + len + 0.02);
      });
    } catch (e) {}
  }
  function sound(kind) {
    if (kind === "pikon") return tone([[1318.5, 0, 0.1], [1760, 0.09, 0.38]], "sine", 0.22); // ピコーン
    if (kind === "miss") return tone([[330, 0, 0.16], [262, 0.12, 0.26]], "triangle", 0.12);
    if (kind === "star") return tone([[784, 0, 0.16], [988, 0.12, 0.16], [1175, 0.24, 0.18], [1568, 0.38, 0.5]]);
    if (kind === "fanfare") return tone([[784, 0, 0.18], [988, 0.12, 0.18], [1175, 0.24, 0.2], [1568, 0.38, 0.5]]);
    if (kind === "soft") return tone([[660, 0, 0.18]]);
    if (kind === "sad") { tone([[392, 0, 0.34], [370, 0.36, 0.34], [349, 0.72, 0.34], [330, 1.08, 1.1]], "triangle", 0.16); return tone([[196, 0, 0.34], [185, 0.36, 0.34], [175, 0.72, 0.34], [165, 1.08, 1.1]], "sine", 0.1); }
    if (kind === "victory") { tone([[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.14], [1047, 0.36, 0.3], [784, 0.62, 0.12], [1047, 0.74, 0.7]], "triangle", 0.16); return tone([[262, 0, 0.3], [330, 0.36, 0.3], [392, 0.74, 0.8]], "sine", 0.1); }
    if (kind === "tap") return tone([[880, 0, 0.06]], "sine", 0.08);
    if (kind === "block") return tone([[220, 0, 0.12]], "square", 0.06);
    if (kind && kind.startsWith("r")) { const r = +kind.slice(1); const base = [523, 587, 659, 784, 880, 988, 1175]; const ns = []; for (let i = 0; i <= Math.min(6, r + 1); i++) ns.push([base[i] * (r >= 4 ? 1.5 : 1), i * 0.09, 0.3]); if (r >= 4) ns.push([2093, ns.length * 0.09, 0.8]); return tone(ns, r >= 5 ? "triangle" : "sine"); }
    return tone([[1568, 0, 0.09], [2093, 0.07, 0.32]]);
  }
  // 英語の読み上げ（iOS はタップの中でだけ話せるので、ボタンを押したときに読む）
  const canSpeak = () => typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
  function speak(text) {
    if (!canSpeak() || !text) return false;
    const vol = Math.max(0.2, state.settings.vol == null ? 0.8 : +state.settings.vol);
    if (window.HMVoice) return window.HMVoice.speak(String(text), { vol });
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.9; u.volume = vol; speechSynthesis.speak(u); return true; } catch (e) { return false; }
  }
  // ---------- BGM（WebAudioでその場で作る、オリジナルのやさしい曲） ----------
  const BGM = { on: false, timer: null, step: 0, next: 0, gain: null, unlocked: false, song: 0 };
  const BGM_SONGS = [
    { bpm: 92, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], mel: [76, 74, 72, 74, 76, 79, 76, 74, 72, 69, 72, 74, 76, 74, 72, 71] },
    { bpm: 84, chords: [[53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64]], mel: [72, 74, 76, 79, 77, 76, 74, 72, 74, 76, 72, 69, 71, 72, 74, 76] },
  ];
  function bgmWanted() {
    const st = state.settings;
    if (!st.bgm || !(st.bgmVol > 0.01) || !BGM.unlocked || document.hidden) return false;
    if (window.HM_CONSENT && !HM_CONSENT.ok) return false;
    const qz = $("#quiz"), gl = $("#game-layer");
    return !(qz && !qz.hidden) && !(gl && !gl.hidden);
  }
  function bgmNote(f, t, dur, type, v) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (f - 69) / 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(BGM.gain); o.start(t); o.stop(t + dur + 0.05);
  }
  function bgmTick() {
    if (!actx || !BGM.on) return;
    const sg = BGM_SONGS[BGM.song], spb = 60 / sg.bpm / 2;
    while (BGM.next < actx.currentTime + 0.4) {
      const i = BGM.step, bar = Math.floor(i / 8) % sg.chords.length, ch = sg.chords[bar];
      if (i % 8 === 0) ch.forEach((n) => bgmNote(n - 12, BGM.next, spb * 7.5, "sine", 0.05));
      if (i % 2 === 0) bgmNote(ch[(i / 2) % 3], BGM.next, spb * 1.6, "triangle", 0.035);
      const m = sg.mel[i % sg.mel.length]; if (i % 2 === 0 || i % 8 === 3) bgmNote(m, BGM.next, spb * 1.8, "triangle", 0.05);
      BGM.step++; BGM.next += spb;
      if (BGM.step % (8 * sg.chords.length * 4) === 0) BGM.song = (BGM.song + 1) % BGM_SONGS.length;
    }
  }
  function bgmUpdate() {
    const want = bgmWanted();
    if (want) {
      try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) { return; }
      if (!BGM.gain) { BGM.gain = actx.createGain(); BGM.gain.connect(actx.destination); }
      BGM.gain.gain.setTargetAtTime(0.9 * state.settings.bgmVol, actx.currentTime, 0.3);
      if (!BGM.on) { BGM.on = true; BGM.next = actx.currentTime + 0.1; BGM.timer = setInterval(bgmTick, 150); }
    } else if (BGM.on) {
      BGM.on = false; clearInterval(BGM.timer);
      try { BGM.gain.gain.setTargetAtTime(0.0001, actx.currentTime, 0.08); } catch (e) {}
      const old = BGM.gain; BGM.gain = null; setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 600);
    }
  }
  ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => { if (!BGM.unlocked) { BGM.unlocked = true; setTimeout(bgmUpdate, 0); } }, { capture: true, passive: true }));
  document.addEventListener("visibilitychange", () => { bgmUpdate(); if (!document.hidden) checkRemind(); });
  setInterval(() => { bgmUpdate(); checkRemind(); }, 1500);
  // ---------- 毎日のおしらせ（決めた時刻をすぎて、その日の⭐がまだ0のとき） ----------
  function checkRemind() {
    const st = state.settings; if (!st.remind) return;
    const d = new Date(Date.now() + clockOffset), [hh, mm] = String(st.remindAt || "17:00").split(":").map(Number);
    if (d.getHours() * 60 + d.getMinutes() < hh * 60 + mm) return;
    const k = today(); if (st.remindDone === k || starsToday() > 0) return;
    st.remindDone = k; save();
    const msg = "今日の⭐をあつめよう！ 1ステップ6割で⭐1こ、⭐4こでゲームがひらくよ";
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      try { navigator.serviceWorker && navigator.serviceWorker.ready.then((r) => r.showNotification("ほしの学園", { body: msg, icon: "./icons/icon-192.png", tag: "hm-remind" })).catch(() => new Notification("ほしの学園", { body: msg })); } catch (e) {}
    } else toast("⏰ " + msg, 4500);
  }
  function haptic(p) { if (state.settings.haptic && navigator.vibrate) { try { navigator.vibrate(p || 12); } catch (e) {} } }
  function toast(msg, ms) {
    const root = $("#toast-root"), el = document.createElement("div");
    el.className = "toast"; el.innerHTML = '<span class="t-msg">' + msg + "</span>";
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 260); }, ms || 2600);
  }

  // ---------- シート ----------
  let sheetClose = null;
  function openSheet(html, opt = {}) {
    closeSheet(true);
    const root = $("#sheet-root");
    root.innerHTML = '<div class="scrim"></div><div class="sheet" role="dialog" aria-label="' + esc(opt.label || "") + '"><div class="grabber"></div><button type="button" class="sheet-close" aria-label="閉じる">✕</button>' + html + "</div>";
    const sh = $(".sheet", root), sc = $(".scrim", root);
    requestAnimationFrame(() => { sh.classList.add("show"); sc.classList.add("show"); });
    sc.addEventListener("click", () => closeSheet());
    $(".sheet-close", sh).addEventListener("click", () => closeSheet());
    sheetClose = opt.onClose || null;
    if (opt.mount) opt.mount(sh);
    return sh;
  }
  function closeSheet(instant) {
    const root = $("#sheet-root"); if (!root.firstChild) return;
    const f = sheetClose; sheetClose = null;
    if (instant) root.innerHTML = "";
    else { $$(".show", root).forEach((e) => e.classList.remove("show")); setTimeout(() => (root.innerHTML = ""), 280); }
    if (f) try { f(); } catch (e) {}
  }

  // ---------- 画面 ----------
  let tab = "home";
  let navDir = "tab";
  let nav = []; // 勉強タブの中の階層 [{v:"grades",s}, {v:"units",s,g}, {v:"steps",s,g,u}]
  let modeNav = [];
  let testDraft = null;
  function setTab(t) {
    if (t === tab && t === "study" && nav.length) { nav = []; navDir = "back"; }
    else if (t === tab && t === "home" && modeNav.length) { modeNav = []; navDir = "back"; }
    else navDir = "tab";
    tab = t;
    if (t !== "study") nav = [];
    if (t !== "home") modeNav = [];
    render(); window.scrollTo(0, 0);
  }
  function applyDisplay() {
    const de = document.documentElement, st = state.settings;
    de.classList.toggle("fs-s", st.fs === "s"); de.classList.toggle("fs-l", st.fs === "l"); de.classList.toggle("fs-xl", st.fs === "xl");
    de.classList.toggle("rmotion", !!st.rmotion);
  }
  function applyLook() {
    applyDisplay();
    document.body.dataset.bg = state.look.bg;
    document.body.dataset.maru = state.look.maru;
  }
  function topStars() {
    const n = starsToday();
    let h = "";
    for (let i = 0; i < STARS_TO_UNLOCK; i++) h += '<span class="ts ' + (i < n ? "on" : "") + '">★</span>';
    if (n > STARS_TO_UNLOCK) h += '<span class="ts-more">+' + (n - STARS_TO_UNLOCK) + "</span>";
    return h;
  }
  function render() {
    applyLook();
    $$(".tab").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
    $("#top-stars").innerHTML = topStars();
    const back = $("#back-btn");
    back.hidden = !((tab === "study" && nav.length) || (tab === "home" && modeNav.length));
    const m = $("#main");
    let title = "ほしの学園";
    m.classList.remove("page-in", "pg-fwd", "pg-back", "pg-tab"); void m.offsetWidth; m.classList.add("page-in", "pg-" + navDir); navDir = "fwd";
    if (tab === "home") {
      if (modeNav.length) { const r = viewMode(); m.innerHTML = r.html; title = r.title; }
      else m.innerHTML = viewHome();
    }
    else if (tab === "study") { const r = viewStudy(); m.innerHTML = r.html; title = r.title; }
    else if (tab === "games") { m.innerHTML = viewGames(); title = "ゲーム"; }
    else if (tab === "gacha") { m.innerHTML = window.HMGK ? HMGK.view() : viewGacha(); title = "相棒"; }
    else if (tab === "settings") { m.innerHTML = viewSettings(); title = "マイページ"; }
    $("#top-title").textContent = title;
    $("#topbar").classList.toggle("large", !(tab === "study" && nav.length));
    const bl = $("#back-btn");
    if (bl && !bl.hidden) {
      if (tab === "home") bl.innerHTML = '<span class="chev">‹</span>ホーム';
      else { const pv = nav[nav.length - 2]; bl.innerHTML = '<span class="chev">‹</span>' + esc(!pv ? "学ぶ" : pv.v === "grades" ? subjById(pv.s).n : pv.v === "units" ? subjName(pv.s, pv.g) + gradeName(pv.g) : "もどる"); }
    }
    mountPartner();
    bgmUpdate();
    if (window.HMGK) HMGK.afterRender(tab);
  }
  function charLevelFor(id) { const e = state.chars[id]; const s = e ? e.star || 0 : 0; return [5, 15, 15, 30, 30, 50][s]; }
  function charHtml(id, size, cls = "") { if (window.HMGK && HMGK.partner()) return HMGK.face(size, cls); return '<div class="char ' + cls + '" style="width:' + size + "px;height:" + size + 'px">' + GCArt.charSvg(id, charLevelFor(id), { size }) + "</div>"; }
  function rarityTag(r) { const R = GCArt.RARITIES[r]; return '<span class="rtag r' + r + '" style="--rc:' + R.c + '">' + R.n + "</span>"; }
  function starMarks(n) { return n ? '<span class="cstars">' + "★".repeat(n) + "</span>" : ""; }
  const titleName = () => (TITLES.find((t) => t.id === state.look.title && t.ok(titleCtx())) || TITLES[0]).n;

  // ホーム
  const HOME_LINES = ["今日もいっしょにがんばろう！", "1ステップは約7分。まずは1つやってみよう。", "解説まで読むと、ぐっと分かるようになるよ。", "⭐を4つ集めたら、今日はゲームで遊ぼう！", "コツコツが最強。今日の1ステップから。"];
  const TAP_LINES = ["わっ！ びっくりした〜", "えへへ、くすぐったい！", "いっしょに⭐集めよう！", "今日はどの教科にする？", "がんばってるの、ちゃんと見てるよ！", "ゲームまであと少し！", "次のステップ、いけそう！", "ナイス！ その調子！"];
  function ringSvg(n, max) { const k = Math.min(1, n / max), C = 2 * Math.PI * 44; return '<svg class="ring2" viewBox="0 0 100 100"><defs><linearGradient id="rg-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd43b"/><stop offset="1" stop-color="#ff922b"/></linearGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="10"/><circle class="ring-fg" cx="50" cy="50" r="44" fill="none" stroke="url(#rg-ring)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - k)).toFixed(1) + '" transform="rotate(-90 50 50)"/></svg>'; }
  function viewHome() {
    const p = GCArt.charById(state.partner), n = starsToday(), e = state.chars[p.id] || {}, need = Math.max(0, STARS_TO_UNLOCK - n);
    const line = HOME_LINES[(new Date().getDate() + n) % HOME_LINES.length];
    let h = homeModesHtml();
    h += window.HMGK ? HMGK.homeHero() : '';
    h += '<section class="today2"><div class="t2-ring">' + ringSvg(n, STARS_TO_UNLOCK) + '<div class="t2-num"><b>' + n + '</b><small>/' + STARS_TO_UNLOCK + '</small></div></div><div class="t2-r"><div class="t2-k">今日の⭐</div>' +
      (need ? '<div class="t2-big">ゲームまで あと <b>' + need + "</b> 個</div>" : '<div class="t2-big ok">🎮 ゲーム解放中！</div>') +
      '<div class="t2-stars">' + Array.from({ length: STARS_TO_UNLOCK }, (_, i) => '<span class="t2s ' + (i < n ? "on" : "") + '" style="--i:' + i + '">★</span>').join("") + (n > STARS_TO_UNLOCK ? '<span class="t2-more">+' + (n - STARS_TO_UNLOCK) + "</span>" : "") + "</div></div></section>";
    if ((state.wrongBox || []).length) h += '<button type="button" class="box-card" data-act="box"><span class="bx-i">📦</span><span class="grow"><b>まちがえた問題ボックス</b><small>' + state.wrongBox.length + " 問 ・ 正解すると消えるよ</small></span><span class=\"go\">▶</span></button>";
    if (state.last) {
      const L = resolveLast(), st = findStep(L.s, L.g, L.u, L.st);
      if (st) h += '<button type="button" class="cont2" data-act="cont">' + HMIcons.icon(L.s, subjById(L.s).c, 46) + '<span class="grow"><b>つづきから学ぶ</b><span class="small">' + esc(subjName(L.s, L.g) + " " + gradeName(L.g) + " ／ " + st.unit.n + " ／ " + SN(st.step.n)) + '</span></span><span class="go">▶</span></button>';
    }
    h += '<div class="sec2">教科</div><div class="quick2">' + SUBJ.map((s, i) => { const gs = gradesOf(s.id); const gl = !gs.length ? "" : gs.length === 1 ? gradeName(gs[0]) : (gs.length === 2 && gs[1] === gs[0] + 1 ? gradeName(gs[0]) + "・" + gradeName(gs[1]) : gradeName(gs[0]) + "〜" + gradeName(gs[gs.length - 1])); return '<button type="button" class="qb2" data-subj="' + s.id + '" style="--sc:' + s.c + ";--i:" + i + '">' + HMIcons.icon(s.id, s.c, 52) + "<b>" + esc(s.n) + "</b><small>" + gl + "</small></button>"; }).join("") + "</div>";
    if (false && pullsLeft()) h += '<button type="button" class="gacha2" data-act="gacha"><span class="g2-box">🎁</span><span class="grow"><b>ガチャを ' + pullsLeft() + ' 回ひけます</b><span class="small">新しいなかまに会いに行こう</span></span><span class="go">▶</span></button>';
    h += '<p class="foot">ほしの学園 v' + VERSION + "</p>";
    return h;
  }
  function mountPartner() {
    const w = $("#partner"); if (!w) return;
    w.addEventListener("click", () => {
      const ch = w.querySelector(".hx-char"); ch.classList.remove("tap"); void ch.offsetWidth; ch.classList.add("tap");
      const b = $("#hx-bubble"); if (b) { b.textContent = TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)]; b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
      sound("soft"); haptic(12);
      const r = w.getBoundingClientRect(); for (let i = 0; i < 7; i++) { const s = document.createElement("span"); s.className = "heart-p"; s.textContent = ["💖", "✨", "⭐", "💫"][i % 4]; s.style.left = r.left + r.width / 2 + "px"; s.style.top = r.top + r.height * 0.4 + "px"; s.style.setProperty("--dx", (Math.random() * 160 - 80).toFixed(0) + "px"); s.style.setProperty("--dy", (-60 - Math.random() * 90).toFixed(0) + "px"); document.body.appendChild(s); setTimeout(() => s.remove(), 1000); }
    });
  }

  // ---------- 教材の検索 ----------
  const S = () => HM.SUBJECTS;
  function gradesOf(s) { return Object.keys(S()[s] || {}).map(Number).sort((a, b) => a - b); }
  // 単元が追加されて番号がずれても「つづきから」が同じステップを指すように、名前で探し直す
  function resolveLast() { const L = state.last; if (!L || !L.un) return L; const us = (S()[L.s] || {})[L.g] || []; const ui = us.findIndex((u) => u.n === L.un); if (ui < 0) return L; const si = us[ui].steps.findIndex((x) => x.n === L.sn); if (si < 0) return L; L.u = ui; L.st = si; return L; }
  function findStep(s, g, u, st) { const us = (S()[s] || {})[g]; if (!us || !us[u] || !us[u].steps[st]) return null; return { unit: us[u], step: us[u].steps[st] }; }
  // 画面に出すステップ名：漢字の練習「国会長同…」は字をならべただけだと中国語の文のように見えるので「・」で区切る（保存のキーは元の名前のまま）
  const SN = (n) => String(n || "").replace(/^(なぞる|書く)「([^」]+)」$/, (m, a, b) => (a === "なぞる" ? "なぞり書き" : "書き取り") + "：" + Array.from(b).join("・"));
  const SNH = (n) => { const m = /^(なぞる|書く)「([^」]+)」$/.exec(String(n || "")); return m ? (m[1] === "なぞる" ? "なぞり書き" : "書き取り") + '<span class="kj-ls">' + (Array.from(m[2]).join("").match(/.{1,4}/gu) || []).map((g) => "<span>" + esc(Array.from(g).join("・")) + "</span>").join("") + "</span>" : esc(n); };
  const stepKey = (s, g, u, st) => { const f = findStep(s, g, u, st); return s + "|" + g + "|" + (f ? f.unit.n + "|" + f.step.n : u + "|" + st); };
  function stepQCount(step) { return typeof step.src === "function" ? step.cnt || 10 : Math.min(step.cnt || 10, step.src.length); }
  function unitStats(s, g, ui) {
    const u = S()[s][g][ui]; let done = 0;
    u.steps.forEach((st, si) => { const p = state.progress[stepKey(s, g, ui, si)]; if (p && p.passed) done++; });
    return { done, total: u.steps.length };
  }

  // ---------- v1.3.0 単元マーク・復習・予習・テスト対策 ----------
  const MARK_OK = 90, MARK_MID = 60;
  const PREP_SUBJ = ["math", "ja", "life", "sci", "soc", "en", "tech", "home", "music", "art", "pe"];
  function markOf(pct) { if (pct == null) return ""; return pct >= MARK_OK ? "ok" : pct >= MARK_MID ? "mid" : "ng"; }
  function markIcon(m) { return m === "ok" ? "✅" : m === "mid" ? "△" : m === "ng" ? "❌" : ""; }
  function markLabel(m, pct) { return m ? '<span class="umark ' + m + '">' + markIcon(m) + " " + pct + "%</span>" : '<span class="umark none">まだ</span>'; }
  function markLegend() { return '<div class="mark-leg"><span class="ml">単元の判定</span><b>✅ 90%以上</b><b>△ 60〜89%</b><b>❌ 59%以下</b></div>'; }
  function unitRecord(s, g, ui) {
    const u = ((S()[s] || {})[g] || [])[ui]; if (!u) return null;
    let best = 0, n = 0, plays = 0, passed = 0;
    u.steps.forEach((st, si) => {
      const p = state.progress[stepKey(s, g, ui, si)];
      if (p && (p.plays || p.passed || p.n)) {
        const nn = p.n || stepQCount(st) || 10;
        best += (p.best || 0); n += nn; plays++;
      }
      if (p && p.passed) passed++;
    });
    const pct = n ? Math.round(100 * best / n) : null;
    const mark = markOf(pct);
    return { s, g, ui, un: u.n, total: u.steps.length, passed, plays, best, n, pct, mark, done: u.steps.length > 0 && passed >= u.steps.length };
  }
  function allUnitRecords() {
    const list = [];
    for (const s of SUBJ) {
      for (const g of gradesOf(s.id)) {
        const us = (S()[s.id] || {})[g] || [];
        for (let ui = 0; ui < us.length; ui++) { const r = unitRecord(s.id, g, ui); if (r) list.push(r); }
      }
    }
    return list;
  }
  function weakUnits() {
    return allUnitRecords().filter((r) => r.mark === "ng" || r.mark === "mid").sort((a, b) => (a.mark === "ng" && b.mark !== "ng" ? -1 : a.mark !== "ng" && b.mark === "ng" ? 1 : (a.pct || 0) - (b.pct || 0)));
  }
  function prepGrade() { return state.settings.grade || 0; }
  function nextPrepUnit(grade) {
    if (!grade) return null;
    for (const s of PREP_SUBJ) {
      const us = (S()[s] || {})[grade] || [];
      for (let ui = 0; ui < us.length; ui++) { const r = unitRecord(s, grade, ui); if (r && !r.done) return r; }
    }
    return null;
  }
  function upcomingPrep(grade, from, n) {
    if (!grade) return [];
    const out = []; let seen = !from;
    for (const s of PREP_SUBJ) {
      const us = (S()[s] || {})[grade] || [];
      for (let ui = 0; ui < us.length; ui++) {
        const r = unitRecord(s, grade, ui); if (!r) continue;
        if (!seen) { if (r.s === from.s && r.g === from.g && r.ui === from.ui) seen = true; continue; }
        out.push(r); if (out.length >= n) return out;
      }
    }
    return out;
  }
  function testsArr() { if (!Array.isArray(state.tests)) state.tests = []; return state.tests; }
  function addDays(ymd, n) { const [Y, M, D] = ymd.split("-").map(Number); const dt = new Date(Y, M - 1, D + n); return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate()); }
  function daysUntil(ymd) { const a = today().split("-").map(Number), b = String(ymd).split("-").map(Number); return Math.round((new Date(b[0], b[1] - 1, b[2]) - new Date(a[0], a[1] - 1, a[2])) / 86400000); }
  function dateLabel(ymd) { const [Y, M, D] = String(ymd).split("-").map(Number); const dt = new Date(Y, M - 1, D); return M + "月" + D + "日（" + "日月火水木金土"[dt.getDay()] + "）"; }
  function resolveScope(sc) {
    const us = (S()[sc.s] || {})[sc.g] || [];
    if (sc.un) { const i = us.findIndex((u) => u.n === sc.un); if (i >= 0) return { s: sc.s, g: sc.g, ui: i, un: sc.un }; }
    if (us[sc.ui]) return { s: sc.s, g: sc.g, ui: sc.ui, un: us[sc.ui].n };
    return null;
  }
  function testScopeRecs(test) { return (test.scope || []).map(resolveScope).filter(Boolean).map((sc) => unitRecord(sc.s, sc.g, sc.ui)).filter(Boolean); }
  function upcomingTests() { return testsArr().filter((t) => daysUntil(t.date) >= 0).sort((a, b) => String(a.date).localeCompare(String(b.date)) || (a.t || 0) - (b.t || 0)); }
  function pastTests() { return testsArr().filter((t) => daysUntil(t.date) < 0).sort((a, b) => String(b.date).localeCompare(String(a.date))); }
  function nearestTest() { return upcomingTests()[0] || null; }
  function testPlan(test) {
    const recs = testScopeRecs(test);
    const rank = { ng: 0, mid: 1, "": 2, ok: 3 };
    const ordered = recs.slice().sort((a, b) => (rank[a.mark] - rank[b.mark]) || (a.pct == null ? -1 : a.pct) - (b.pct == null ? -1 : b.pct));
    const left = daysUntil(test.date);
    const D = left > 0 ? left : 1;
    if (!ordered.length) return { left, items: [], today: null };
    const perDay = Math.max(1, Math.ceil(ordered.length / D));
    const queue = ordered.slice();
    const weak = ordered.filter((r) => r.mark !== "ok");
    const extra = weak.length ? weak : ordered;
    let guard = 0;
    while (queue.length < D * perDay && extra.length && guard++ < 80) queue.push.apply(queue, extra);
    const items = [];
    for (let i = 0; i < D; i++) {
      const dk = addDays(today(), i);
      if (left > 0 && dk === test.date) break;
      const units = [], seen = {};
      for (let k = 0; k < perDay; k++) {
        const u = queue[i * perDay + k] || ordered[k % ordered.length];
        const id = u.s + "|" + u.g + "|" + u.ui;
        if (seen[id]) continue; seen[id] = 1; units.push(u);
      }
      if (!units.length) units.push(ordered[i % ordered.length]);
      items.push({ date: dk, units });
    }
    return { left, items, today: items.find((p) => p.date === today()) || items[0] || null };
  }
  function countDownText(test) {
    const d = daysUntil(test.date);
    if (d === 0) return { k: "今日がテスト", big: "今日", sub: dateLabel(test.date) };
    return { k: "テストまで", big: "あと <b>" + d + "</b> 日", sub: dateLabel(test.date) };
  }
  function testNameOf(t) { return (t.name && String(t.name).trim()) || "テスト"; }
  function defaultTestName(scope) {
    const recs = (scope || []).map(resolveScope).filter(Boolean);
    if (!recs.length) return "テスト";
    const s0 = recs[0].s;
    if (recs.every((r) => r.s === s0)) return subjName(s0, recs[0].g) + "のテスト";
    return "テスト";
  }
  function firstOpenStep(s, g, ui) {
    const u = ((S()[s] || {})[g] || [])[ui]; if (!u) return 0;
    for (let si = 0; si < u.steps.length; si++) { const p = state.progress[stepKey(s, g, ui, si)]; if (!p || !p.passed) return si; }
    return 0;
  }
  function goUnit(s, g, ui, start) {
    if (start) { startStep(s, g, ui, firstOpenStep(s, g, ui)); return; }
    tab = "study"; modeNav = [];
    nav = [{ v: "grades", s }, { v: "units", s, g }, { v: "steps", s, g, u: ui }];
    navDir = "fwd"; render(); window.scrollTo(0, 0);
  }
  function unitRow(r, act, extra) {
    const sb = subjById(r.s);
    return '<button type="button" class="row-btn unit-row" data-act="' + act + '" data-s="' + r.s + '" data-g="' + r.g + '" data-ui="' + r.ui + '">' + HMIcons.icon(r.s, sb.c, 36) + '<span class="grow"><b>' + esc(r.un) + "</b><span class=\"small muted\">" + esc(subjName(r.s, r.g) + " " + gradeName(r.g)) + " ・ 合格 " + r.passed + "/" + r.total + "</span></span>" + markLabel(r.mark, r.pct) + (extra || "") + "</button>";
  }

  function homeModesHtml() {
    const weak = weakUnits(), boxN = (state.wrongBox || []).length;
    const g = prepGrade(), next = nextPrepUnit(g);
    const nt = nearestTest();
    let revSub = boxN || weak.length ? ((boxN ? "まちがえた問題 " + boxN + "問" : "") + (boxN && weak.length ? " ・ " : "") + (weak.length ? "△❌ " + weak.length + "単元" : "")) : "できるようになったところを、もう一度";
    let prepSub = !g ? "学年をえらぶと、次の単元が出るよ" : next ? (subjName(next.s, next.g) + " ／ " + next.un) : "この学年の単元は全部やってあるよ";
    let testSub = nt ? (testNameOf(nt) + " ・ " + (daysUntil(nt.date) === 0 ? "今日" : "あと" + daysUntil(nt.date) + "日")) : "テストの日と範囲を登録しよう";
    let h = "";
    if (nt) {
      const cd = countDownText(nt), plan = testPlan(nt), todayU = plan.today ? plan.today.units : [];
      h += '<button type="button" class="cdown" data-act="mode-test-one" data-id="' + esc(nt.id) + '"><div class="cd-k">' + esc(testNameOf(nt)) + " ・ " + cd.k + '</div><div class="cd-big">' + cd.big + '</div><div class="cd-sub">' + esc(cd.sub) + (todayU.length ? " ・ 今日は " + todayU.map((u) => u.un).join("、") : "") + "</div></button>";
    }
    h += '<div class="modes3">';
    h += '<button type="button" class="mode-card review" data-act="mode-review"><span class="mc-ico">📘</span><b>復習</b><small>' + esc(revSub) + "</small></button>";
    h += '<button type="button" class="mode-card prep" data-act="mode-prep"><span class="mc-ico">📗</span><b>予習</b><small>' + esc(prepSub) + "</small></button>";
    h += '<button type="button" class="mode-card test" data-act="mode-test"><span class="mc-ico">📝</span><b>テスト対策</b><small>' + esc(testSub) + "</small></button>";
    h += "</div>";
    h += '<button type="button" class="marks-link" data-act="mode-marks">単元のようす ✅△❌ を見る</button>';
    h += homeDrillHtml();
    return h;
  }
  function viewMode() {
    const top = modeNav[modeNav.length - 1] || {};
    if (top.v === "review") return { title: "復習", html: viewReview() };
    if (top.v === "prep") return { title: "予習", html: viewPrep() };
    if (top.v === "test") return { title: "テスト対策", html: viewTests() };
    if (top.v === "test-new" || top.v === "test-edit") return { title: top.v === "test-edit" ? "テストを編集" : "テストを登録", html: viewTestForm() };
    if (top.v === "test-one") return { title: "テスト対策", html: viewTestOne(top.id) };
    if (top.v === "marks") return { title: "単元のようす", html: viewMarks() };
    if (top.v === "color") return { title: "カラーテスト", html: viewColorHome() };
    if (top.v === "kj") return { title: "漢字テスト", html: viewKjHome() };
    if (top.v === "exam") return { title: "定期テスト", html: viewExamHome() };
    if (top.v === "exam-scope") return { title: "範囲とタイマー", html: viewExamScope() };
    if (top.v === "exam-hist") return { title: "履歴と点数の推移", html: viewExamHist() };
    return { title: "ほしの学園", html: "" };
  }
  function viewReview() {
    const weak = weakUnits(), boxN = (state.wrongBox || []).length;
    let h = markLegend();
    if (boxN) h += '<button type="button" class="box-card" data-act="box"><span class="bx-i">📦</span><span class="grow"><b>まちがえた問題ボックス</b><small>' + boxN + " 問 ・ 正解すると消えるよ</small></span><span class=\"go\">▶</span></button>";
    h += '<div class="sec2">△・❌の単元</div>';
    if (weak.length) h += '<div class="list">' + weak.map((r) => unitRow(r, "go-unit-start")).join("") + "</div>";
    else h += '<p class="lead soft">今はにがての単元はないよ。単元のようすから、もう一度やってみよう。</p>';
    h += '<button type="button" class="marks-link" data-act="mode-marks">すべての単元のようすを見る</button>';
    return h;
  }
  function viewPrep() {
    const g = prepGrade();
    let h = '<p class="lead">学年の教科書の順で、まだの次の単元から進むよ。</p>';
    h += '<div class="prep-grades">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => '<button type="button" class="chip' + (x === g ? " on" : "") + '" data-act="prep-grade" data-g="' + x + '">' + gradeName(x) + "</button>").join("") + "</div>";
    if (!g) { h += '<p class="lead soft">学年をえらぶと、次の単元が出るよ。</p>'; return h; }
    const next = nextPrepUnit(g);
    if (!next) {
      h += '<div class="prep-hero done"><div class="ph-k">' + gradeName(g) + '</div><b>この学年の単元は全部やってあるよ！</b><p>復習やテスト対策もできるよ。</p><div class="actions two"><button type="button" class="btn" data-act="mode-review">復習</button><button type="button" class="btn primary" data-act="mode-test">テスト対策</button></div></div>';
      return h;
    }
    const sb = subjById(next.s);
    h += '<div class="prep-hero" style="--sc:' + sb.c + '">' + HMIcons.icon(next.s, sb.c, 56) + '<div class="ph-k">次の単元</div><b>' + esc(next.un) + "</b><small>" + esc(subjName(next.s, next.g) + " " + gradeName(next.g)) + " ・ 合格 " + next.passed + "/" + next.total + "</small>" + markLabel(next.mark, next.pct) + '<button type="button" class="btn primary block" data-act="go-unit-start" data-s="' + next.s + '" data-g="' + next.g + '" data-ui="' + next.ui + '">この単元をはじめる</button></div>';
    const more = upcomingPrep(g, next, 6);
    if (more.length) h += '<div class="sec2">このあとの単元</div><div class="list">' + more.map((r) => unitRow(r, "go-unit")).join("") + "</div>";
    return h;
  }
  function viewTests() {
    const up = upcomingTests(), past = pastTests();
    let h = '<p class="lead">テストの日と範囲を登録すると、毎日の計画とカウントダウンができるよ。</p>';
    h += '<button type="button" class="btn block exam-enter" data-act="mode-exam">📝 中間・期末の問題用紙（100点）</button>';
    h += '<button type="button" class="btn primary block" data-act="mode-test-new">＋ テストを登録</button>';
    if (up.length) {
      h += '<div class="sec2">これから</div><div class="list">';
      up.forEach((t) => {
        const cd = countDownText(t), plan = testPlan(t);
        h += '<button type="button" class="test-card" data-act="mode-test-one" data-id="' + esc(t.id) + '"><div class="tc-top"><b>' + esc(testNameOf(t)) + "</b><span class=\"tc-cd\">" + (daysUntil(t.date) === 0 ? "今日" : "あと" + daysUntil(t.date) + "日") + "</span></div><small>" + esc(cd.sub) + " ・ 範囲 " + (t.scope || []).length + "単元" + (plan.today && plan.today.units.length ? " ・ 今日は " + plan.today.units.map((u) => u.un).join("、") : "") + "</small></button>";
      });
      h += "</div>";
    }
    if (past.length) {
      h += '<div class="sec2">これまでのテスト</div><div class="list">';
      past.forEach((t) => { h += '<button type="button" class="test-card past" data-act="mode-test-one" data-id="' + esc(t.id) + '"><div class="tc-top"><b>' + esc(testNameOf(t)) + "</b></div><small>" + esc(dateLabel(t.date)) + " ・ 範囲 " + (t.scope || []).length + "単元</small></button>"; });
      h += "</div>";
    }
    return h;
  }
  function viewTestOne(id) {
    const t = testsArr().find((x) => x.id === id); if (!t) return '<p class="lead">このテストは見つからないよ。</p>';
    const cd = countDownText(t), plan = testPlan(t), recs = testScopeRecs(t), left = daysUntil(t.date);
    let h = '<div class="cdown inpage"><div class="cd-k">' + esc(testNameOf(t)) + " ・ " + cd.k + '</div><div class="cd-big">' + cd.big + '</div><div class="cd-sub">' + esc(cd.sub) + "</div></div>";
    if (left >= 0 && plan.items.length) {
      h += '<div class="sec2">毎日の計画</div><div class="plan-list">';
      plan.items.forEach((day) => {
        const isT = day.date === today();
        h += '<div class="plan-day' + (isT ? " today" : "") + '"><div class="pd-d">' + (isT ? "今日 " : "") + esc(dateLabel(day.date)) + '</div><div class="pd-u">';
        day.units.forEach((u) => { h += '<button type="button" class="plan-u" data-act="go-unit-start" data-s="' + u.s + '" data-g="' + u.g + '" data-ui="' + u.ui + '">' + markIcon(u.mark) + " " + esc(u.un) + "</button>"; });
        h += "</div></div>";
      });
      h += "</div>";
    }
    h += '<div class="sec2">範囲</div>' + markLegend() + '<div class="list">' + recs.map((r) => unitRow(r, "go-unit-start")).join("") + "</div>";
    if (left >= 0 && recs.length) h += '<button type="button" class="btn primary block mock-go" data-act="mock-start" data-id="' + esc(t.id) + '">📝 範囲から模擬テスト（10問）</button>';
    const byS = {};
    recs.forEach((r) => { (byS[r.s] = byS[r.s] || []).push(r); });
    const subjIds = Object.keys(byS);
    if (subjIds.length) {
      h += '<div class="sec2">100点の問題用紙</div><div class="list">';
      subjIds.forEach((s) => {
        const gg = byS[s][0].g;
        const last = (t.system && t.kind) ? latestExam(s, gg, t.system, t.kind) : null;
        const minutes = window.HMExam ? examSpec(s).minutes : 50;
        h += '<button type="button" class="ex-sub" data-act="ex-from-test" data-id="' + esc(t.id) + '" data-s="' + s + '">' + HMIcons.icon(s, subjById(s).c, 36) + '<span class="grow"><b>' + esc(subjName(s, gg)) + '　100点</b><small>' + byS[s].length + '単元 ・ ' + minutes + '分' + (last ? ' ・ 前は ' + last.score + '点' : '') + '</small></span><span class="go">▶</span></button>';
      });
      h += "</div>";
    }
    if (t.lastMock) h += '<p class="small muted center">前の模擬テスト　' + t.lastMock.ok + "/" + t.lastMock.n + "（" + t.lastMock.pct + "%）</p>";
    h += '<div class="actions two tight"><button type="button" class="btn" data-act="mode-test-edit" data-id="' + esc(t.id) + '">編集</button><button type="button" class="btn ghost" data-act="test-del" data-id="' + esc(t.id) + '">削除</button></div>';
    return h;
  }
  function viewTestForm() {
    if (!testDraft) testDraft = newDraft();
    const d = testDraft;
    const us = ((S()[d.pickS] || {})[d.pickG] || []);
    let h = '<label class="field"><span>テストの名前</span><input class="input" id="tm-name" maxlength="24" value="' + esc(d.name) + '" placeholder="' + esc(defaultTestName(d.scope)) + '"></label>';
    h += '<label class="field"><span>テストの日</span><input class="input" id="tm-date" type="date" value="' + esc(d.date) + '" min="' + today() + '"></label>';
    if (window.HMExam) {
      const midG = (d.examG >= 7 && d.examG <= 9) ? d.examG : ((d.pickG >= 7 && d.pickG <= 9) ? d.pickG : 7);
      const sys = String(d.system || "3");
      const terms = HMExam.termsOf(sys);
      let kind = d.kind || terms[0].id;
      if (!terms.some((x) => x.id === kind)) kind = terms[0].id;
      d.examG = midG; d.system = sys; d.kind = kind;
      h += '<div class="sec2">定期テストのプリセット</div>';
      h += '<div class="chips wrap"><button type="button" class="chip' + (sys === "3" ? " on" : "") + '" data-act="td-sys" data-sys="3">3学期制</button><button type="button" class="chip' + (sys === "2" ? " on" : "") + '" data-act="td-sys" data-sys="2">前期・後期</button></div>';
      h += '<div class="chips wrap">' + [7, 8, 9].map((x) => '<button type="button" class="chip' + (x === midG ? " on" : "") + '" data-act="td-exam-g" data-g="' + x + '">' + gradeName(x) + "</button>").join("") + "</div>";
      h += '<div class="chips wrap">' + terms.map((x) => '<button type="button" class="chip' + (x.id === kind ? " on" : "") + '" data-act="td-kind" data-kind="' + x.id + '">' + esc(x.n) + "</button>").join("") + "</div>";
      h += '<button type="button" class="btn block" data-act="td-preset">この範囲を入れる</button>';
      h += '<p class="small muted">えらぶと、その回の教科の範囲が一気に入るよ。あとは単元を足したり外したりできるよ。</p>';
    }
    h += '<div class="sec2">範囲の教科</div><div class="chips wrap">' + SUBJ.map((s) => '<button type="button" class="chip' + (s.id === d.pickS ? " on" : "") + '" data-act="td-s" data-s="' + s.id + '">' + esc(s.n) + "</button>").join("") + "</div>";
    h += '<div class="sec2">学年</div><div class="chips wrap">' + gradesOf(d.pickS).map((g) => '<button type="button" class="chip' + (g === d.pickG ? " on" : "") + '" data-act="td-g" data-g="' + g + '">' + gradeName(g) + "</button>").join("") + "</div>";
    h += '<div class="sec2">単元（タップで追加）</div>';
    if (!us.length) h += '<p class="lead soft">この教科・学年の単元はないよ。べつの学年をえらんでね。</p>';
    else h += '<div class="list">' + us.map((u, ui) => { const on = d.scope.some((x) => x.s === d.pickS && x.g === d.pickG && (x.ui === ui || x.un === u.n)); const r = unitRecord(d.pickS, d.pickG, ui); return '<button type="button" class="row-btn' + (on ? " picked" : "") + '" data-act="td-tog" data-s="' + d.pickS + '" data-g="' + d.pickG + '" data-ui="' + ui + '"><span class="un">' + (on ? "✓" : (ui + 1)) + '</span><span class="grow"><b>' + esc(u.n) + "</b></span>" + (r ? markLabel(r.mark, r.pct) : "") + "</button>"; }).join("") + "</div>";
    if (d.scope.length) {
      h += '<div class="sec2">えらんだ範囲（' + d.scope.length + '単元）</div><div class="picked-wrap">';
      d.scope.forEach((sc, i) => { const r = resolveScope(sc); h += '<button type="button" class="picked-chip" data-act="td-rm" data-i="' + i + '">' + esc(r ? subjName(r.s, r.g) + " " + r.un : "？") + " ×</button>"; });
      h += "</div>";
    }
    h += '<div class="actions"><button type="button" class="btn primary block" data-act="td-save">' + (d.id ? "保存する" : "登録する") + "</button></div>";
    return h;
  }
  function newDraft() {
    const g = prepGrade() || 7;
    const pickS = (S().math && S().math[g]) ? "math" : "ja";
    return { id: null, name: "", date: addDays(today(), 7), scope: [], pickS, pickG: (S()[pickS] || {})[g] ? g : (gradesOf(pickS)[0] || 7) };
  }
  function draftFromTest(t) {
    const sc0 = (t.scope && t.scope[0]) || {};
    const g = sc0.g || prepGrade() || 7;
    return { id: t.id, name: t.name || "", date: t.date, scope: (t.scope || []).map((x) => Object.assign({}, x)), pickS: sc0.s || "math", pickG: g, t: t.t, system: t.system || "", kind: t.kind || "", examG: t.grade || ((g >= 7 && g <= 9) ? g : 7) };
  }
  function readDraftInputs() { if (!testDraft) return; const n = $("#tm-name"), d = $("#tm-date"); if (n) testDraft.name = n.value; if (d && d.value) testDraft.date = d.value; }
  function saveDraftTest() {
    readDraftInputs();
    const d = testDraft; if (!d) return;
    if (!d.date) { toast("テストの日を入れてね"); return; }
    if (daysUntil(d.date) < 0) { toast("テストの日は今日から先にしてね"); return; }
    if (!d.scope.length) { toast("範囲の単元を1つ以上えらんでね"); return; }
    const rec = { id: d.id || ("t" + now()), name: String(d.name || "").trim() || defaultTestName(d.scope), date: d.date, scope: d.scope.map((sc) => { const r = resolveScope(sc); return r || sc; }), t: now() };
    if (d.system) rec.system = d.system;
    if (d.kind) rec.kind = d.kind;
    if (d.examG) rec.grade = d.examG;
    const all = testsArr();
    const i = all.findIndex((x) => x.id === rec.id);
    if (i >= 0) {
      rec.lastMock = all[i].lastMock;
      if (!rec.system && all[i].system) rec.system = all[i].system;
      if (!rec.kind && all[i].kind) rec.kind = all[i].kind;
      if (!rec.grade && all[i].grade) rec.grade = all[i].grade;
      all[i] = rec;
    } else all.push(rec);
    save(); testDraft = null;
    modeNav = [{ v: "test" }, { v: "test-one", id: rec.id }];
    toast("テストを登録したよ"); render();
  }
  function viewMarks() {
    const top = modeNav[modeNav.length - 1] || {};
    const g = top.g || prepGrade() || 0;
    const s = top.s || "";
    let h = markLegend();
    h += '<div class="chips wrap">' + [0].map(() => '<button type="button" class="chip' + (!g ? " on" : "") + '" data-act="marks-g" data-g="0">ぜんぶ</button>').join("") + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => '<button type="button" class="chip' + (x === g ? " on" : "") + '" data-act="marks-g" data-g="' + x + '">' + gradeName(x) + "</button>").join("") + "</div>";
    h += '<div class="chips wrap subj-chips">' + ['<button type="button" class="chip' + (!s ? " on" : "") + '" data-act="marks-s" data-s="">すべて</button>'].concat(SUBJ.map((x) => '<button type="button" class="chip' + (x.id === s ? " on" : "") + '" data-act="marks-s" data-s="' + x.id + '">' + esc(x.n) + "</button>")).join("") + "</div>";
    const recs = allUnitRecords().filter((r) => (!g || r.g === g) && (!s || r.s === s));
    const rank = { ng: 0, mid: 1, "": 2, ok: 3 };
    recs.sort((a, b) => (rank[a.mark] - rank[b.mark]) || (a.pct == null ? -1 : a.pct) - (b.pct == null ? -1 : b.pct) || a.un.localeCompare(b.un, "ja"));
    const nOk = recs.filter((r) => r.mark === "ok").length, nMid = recs.filter((r) => r.mark === "mid").length, nNg = recs.filter((r) => r.mark === "ng").length, nYet = recs.filter((r) => !r.mark).length;
    h += '<div class="mark-sum"><span>✅ ' + nOk + '</span><span>△ ' + nMid + '</span><span>❌ ' + nNg + '</span><span class="yet">まだ ' + nYet + "</span></div>";
    if (!recs.length) h += '<p class="lead soft">この条件の単元はないよ。</p>';
    else h += '<div class="list">' + recs.map((r) => unitRow(r, "go-unit")).join("") + "</div>";
    return h;
  }
  function collectScopeQuestions(scope, want) {
    const pool = [];
    (scope || []).forEach((raw) => {
      const sc = resolveScope(raw); if (!sc) return;
      const u = ((S()[sc.s] || {})[sc.g] || [])[sc.ui]; if (!u) return;
      u.steps.forEach((st, si) => {
        try {
          const qs = HM.makeSet(st);
          (qs || []).forEach((q) => { pool.push(Object.assign({}, q, { __src: { s: sc.s, g: sc.g, un: u.n, sn: st.n, ui: sc.ui, si } })); });
        } catch (e) {}
      });
    });
    return HM.U.shuf(pool).slice(0, want);
  }
  function startMock(test) {
    const qs = collectScopeQuestions(test.scope, 10);
    if (!qs.length) { toast("この範囲では問題を作れなかったよ"); return; }
    Q = { s: qs[0].__src.s, g: qs[0].__src.g, ui: null, si: null, key: "mock|" + test.id, unit: { n: testNameOf(test) }, step: { n: "模擬テスト" }, qs, i: 0, mode: "mock", testId: test.id, results: [], baseCorrect: 0, need: HM.passNeed(qs.length), n: qs.length, shownAt: 0, answered: false, passOpen: true, combo: 0, starGiven: true, card: true };
    $("#quiz").hidden = false; document.body.classList.add("in-quiz");
    const p = GCArt.charById(state.partner);
    $("#quiz").innerHTML = '<div class="sum mock-intro"><div class="mock-badge">📝 模擬テスト</div><h2>' + esc(testNameOf(test)) + "</h2><p class=\"lead\">" + Q.n + " 問 ・ 登録した範囲から出すよ</p><div class=\"sum-char\">" + charHtml(p.id, 110, "bob r" + p.rarity) + '<div class="bubble">本番のつもりで、いってみよう！</div></div><div class="sum-act"><button type="button" class="btn primary block" data-q="card-go">はじめる</button><button type="button" class="btn ghost block" data-q="quit">もどる</button></div></div>';
    $("#quiz").scrollTop = 0;
  }
  function mockSummary() {
    const pct = Q.n ? Math.round(100 * Q.baseCorrect / Q.n) : 0;
    const mark = markOf(pct);
    const t = testsArr().find((x) => x.id === Q.testId);
    if (t) { t.lastMock = { t: now(), ok: Q.baseCorrect, n: Q.n, pct }; t.t = now(); save(); }
    const p = GCArt.charById(state.partner);
    const line = mark === "ok" ? "すごい！ この調子なら本番も安心だね！" : mark === "mid" ? "いい感じ！ にがてなところを復習して、もう一度やってみよう！" : "ここから伸びるよ。計画の単元をもう一度やってみよう！";
    let h = '<div class="sum"><div class="mock-hero"><div class="mock-badge">📝 模擬テスト</div><div class="mh-score"><span class="umark ' + (mark || "none") + ' big">' + markIcon(mark) + " " + pct + "%</span></div><div class=\"mh-n num\">" + Q.baseCorrect + " / " + Q.n + " 問正解</div></div>";
    h += '<div class="sum-char">' + charHtml(p.id, 110, "bob r" + p.rarity) + '<div class="bubble">' + esc(line) + "</div></div>";
    h += '<div class="sum-act">' + (t ? '<button type="button" class="btn primary block" data-q="mock-again">もう一度チャレンジ</button>' : "") + '<button type="button" class="btn ghost block" data-q="quit">もどる</button></div></div>';
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (Q.baseCorrect) { confetti(mark === "ok" ? 60 : 24); sound(mark === "ok" ? "fanfare" : "soft"); }
  }

  // ---------- v1.6.0 定期テスト（中間・期末） ----------
  let EX = null, exTimer = null;
  function examHistArr() { if (!Array.isArray(state.examHist)) state.examHist = []; return state.examHist; }
  function examCoinMap() { if (!state.examCoin || typeof state.examCoin !== "object") state.examCoin = {}; return state.examCoin; }
  function examDefaultGrade() { const g = prepGrade(); return g >= 7 && g <= 9 ? g : 7; }
  function examUnits(s, g) { return (S()[s] || {})[g] || []; }
  function examLabel(system, kind) { return (window.HMExam && HMExam.label(system, kind)) || ""; }
  function examSpec(s) { return HMExam.specOf(s); }
  function latestExam(s, g, system, kind) {
    const rows = examHistArr().filter((h) => h.s === s && h.g === g && String(h.system) === String(system) && h.kind === kind).sort((a, b) => (a.t || 0) - (b.t || 0));
    return rows.length ? rows[rows.length - 1] : null;
  }
  function fmtClock(sec) {
    const t = Math.max(0, Math.floor(sec || 0)), m = Math.floor(t / 60), s = t % 60;
    return m + ":" + String(s).padStart(2, "0");
  }
  function examScopeOf(system, kind, g, s, custom) {
    if (custom && custom.length) return custom.map((x) => resolveScope(x) || x).filter((x) => x && x.s === s);
    return HMExam.scopeItems(system, kind, g, s, examUnits(s, g));
  }
  function examCardSub() {
    const rows = examHistArr();
    if (!rows.length) return "中間・期末の問題用紙（100点）";
    const last = rows[rows.length - 1];
    return subjName(last.s, last.g) + " " + last.score + "点";
  }
  function viewExamHome() {
    const top = modeNav[modeNav.length - 1] || {};
    const g = (top.g >= 7 && top.g <= 9) ? top.g : examDefaultGrade();
    const system = String(top.system || "3");
    const terms = HMExam.termsOf(system);
    let kind = top.kind || terms[0].id;
    if (!terms.some((t) => t.id === kind)) kind = terms[0].id;
    top.g = g; top.system = system; top.kind = kind;
    const lab = examLabel(system, kind);
    const tot = HMExam.totals(examHistArr(), g, system, kind);
    let h = '<div class="ex-hero"><div class="eh-k">定期テスト</div><b>' + gradeName(g) + "の" + esc(lab) + "</b><small>実際の中間・期末に近い、100点満点の問題用紙だよ</small></div>";
    // 5教科・9教科の合計は、タブバーに隠れないように一番上（見出しのすぐ下）に出す
    if (tot.five.n || tot.nine.n) h += '<div class="ex-totals top">' + examTotBox("5教科", tot.five, 500) + examTotBox("9教科", tot.nine, 900) + "</div>";
    h += '<div class="sec2">学年</div><div class="chips wrap">' + [7, 8, 9].map((x) => '<button type="button" class="chip' + (x === g ? " on" : "") + '" data-act="ex-g" data-g="' + x + '">' + gradeName(x) + "</button>").join("") + "</div>";
    h += '<div class="sec2">学期のしくみ</div><div class="chips wrap"><button type="button" class="chip' + (system === "3" ? " on" : "") + '" data-act="ex-sys" data-sys="3">3学期制</button><button type="button" class="chip' + (system === "2" ? " on" : "") + '" data-act="ex-sys" data-sys="2">前期・後期</button></div>';
    h += '<div class="sec2">テストの種類</div><div class="chips wrap">' + terms.map((t) => '<button type="button" class="chip' + (t.id === kind ? " on" : "") + '" data-act="ex-kind" data-kind="' + t.id + '">' + esc(t.n) + "</button>").join("") + "</div>";
    h += '<div class="sec2">教科をえらぶ</div><div class="list">';
    HMExam.ALL9.forEach((s) => {
      if (!HMExam.offersSubject(system, kind, s)) return;
      const scope = examScopeOf(system, kind, g, s);
      const last = latestExam(s, g, system, kind);
      const spec = examSpec(s);
      const sb = subjById(s);
      h += '<button type="button" class="ex-sub" data-act="ex-open" data-s="' + s + '">' + HMIcons.icon(s, sb.c, 36) + '<span class="grow"><b>' + esc(subjName(s, g)) + "</b><small>" + scope.length + "単元 ・ " + spec.minutes + "分 ・ " + spec.max + "点満点</small></span><span class=\"ios-r\">" + (last ? last.score + "点" : "まだ") + "</span></button>";
    });
    h += "</div>";
    h += '<button type="button" class="btn primary block" data-act="ex-reg">この範囲でテストを登録</button>';
    h += '<button type="button" class="btn ghost block" data-act="ex-hist">履歴と点数の推移</button>';
    return h;
  }
  function examTotBox(title, pack, full) {
    let h = '<div class="ex-tot"><div class="k">' + title + '</div>';
    if (!pack.n) h += '<div class="n">—</div><div class="yet">まだ</div>';
    else if (pack.n < pack.need) {
      h += '<div class="n">' + pack.score + " <small>点</small></div>";
      h += '<div class="yet">' + pack.n + " / " + pack.need + " 教科</div>";
    } else {
      h += '<div class="n">' + pack.score + " <small>/ " + pack.max + " 点</small></div>";
    }
    return h + "</div>";
  }
  function viewExamScope() {
    const top = modeNav[modeNav.length - 1] || {};
    const s = top.s, g = top.g, system = String(top.system || "3"), kind = top.kind;
    const us = examUnits(s, g);
    if (!top.scope) top.scope = examScopeOf(system, kind, g, s);
    if (top.timerOn == null) top.timerOn = true;
    const lab = examLabel(system, kind);
    const spec = examSpec(s);
    let h = '<p class="lead">' + esc(gradeName(g) + " " + subjName(s, g) + "　" + lab) + "　" + spec.max + "点 ・ " + spec.minutes + "分</p>";
    h += '<div class="sec2">範囲（タップで入れる・はずす）</div><div class="list">';
    us.forEach((u, ui) => {
      const on = top.scope.some((x) => x.s === s && x.g === g && x.ui === ui);
      const r = unitRecord(s, g, ui);
      h += '<button type="button" class="row-btn' + (on ? " picked" : "") + '" data-act="ex-tog" data-ui="' + ui + '"><span class="un">' + (on ? "✓" : (ui + 1)) + '</span><span class="grow"><b>' + esc(u.n) + "</b></span>" + (r ? markLabel(r.mark, r.pct) : "") + "</button>";
    });
    h += "</div>";
    h += '<div class="sec2">タイマー</div><div class="chips wrap">';
    h += '<button type="button" class="chip' + (top.timerOn ? " on" : "") + '" data-act="ex-timer" data-on="1">使う（' + spec.minutes + '分）</button>';
    h += '<button type="button" class="chip' + (!top.timerOn ? " on" : "") + '" data-act="ex-timer" data-on="0">使わない</button></div>';
    h += '<div class="actions"><button type="button" class="btn primary block" data-act="ex-start">問題用紙をひらく</button></div>';
    return h;
  }
  function viewExamHist() {
    const top = modeNav[modeNav.length - 1] || {};
    const g = (top.g >= 7 && top.g <= 9) ? top.g : examDefaultGrade();
    const s = top.s || "";
    const all = examHistArr().filter((h) => h.g === g && (!s || h.s === s)).slice().reverse();
    let h = '<div class="sec2">学年</div><div class="chips wrap">' + [7, 8, 9].map((x) => '<button type="button" class="chip' + (x === g ? " on" : "") + '" data-act="ex-hist-g" data-g="' + x + '">' + gradeName(x) + "</button>").join("") + "</div>";
    h += '<div class="sec2">教科</div><div class="chips wrap">' + ['<button type="button" class="chip' + (!s ? " on" : "") + '" data-act="ex-hist-s" data-s="">すべて</button>'].concat(HMExam.ALL9.map((id) => '<button type="button" class="chip' + (id === s ? " on" : "") + '" data-act="ex-hist-s" data-s="' + id + '">' + esc(subjName(id, g)) + "</button>")).join("") + "</div>";
    const chartRows = (s ? examHistArr().filter((h) => h.g === g && h.s === s) : examHistArr().filter((h) => h.g === g && HMExam.isMain(h.s))).slice(-12);
    h += '<div class="ex-chart">' + examChartSvg(chartRows, s ? subjName(s, g) : "5教科") + "</div>";
    h += '<div class="sec2">履歴</div>';
    if (!all.length) h += '<p class="lead soft">まだ記録はないよ。受けたテストが、ここに残るよ。</p>';
    else {
      h += '<div class="list ex-hist">';
      all.slice(0, 40).forEach((r) => {
        const mark = markOf(r.max ? Math.round(100 * r.score / r.max) : 0);
        h += '<div class="row-btn"><span class="grow"><b>' + esc(subjName(r.s, r.g)) + "　" + esc(r.name || examLabel(r.system, r.kind)) + "</b><small>" + esc(new Date(r.t).toLocaleDateString("ja-JP")) + " ・ " + r.okN + "/" + r.n + " 問</small></span>" + markLabel(mark, r.max ? Math.round(100 * r.score / r.max) : 0) + "<b class=\"num\">" + r.score + "</b></div>";
      });
      h += "</div>";
    }
    return h;
  }
  function examChartSvg(rows, title) {
    const w = 320, h = 168, padL = 28, padR = 10, padT = 16, padB = 28;
    let out = '<div class="k" style="font-size:12px;font-weight:800;padding:0 8px 4px">' + esc(title) + "の点数の推移</div>";
    if (!rows.length) return out + '<p class="lead soft" style="padding:8px">まだグラフになる記録はないよ。</p>';
    const pcts = rows.map((r) => r.max ? Math.round(100 * r.score / r.max) : 0);
    const xs = rows.map((_, i) => padL + (rows.length === 1 ? (w - padL - padR) / 2 : i * (w - padL - padR) / (rows.length - 1)));
    const y = (v) => padT + (100 - v) / 100 * (h - padT - padB);
    const line = xs.map((x, i) => (i ? "L" : "M") + x.toFixed(1) + "," + y(pcts[i]).toFixed(1)).join(" ");
    let svg = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="点数の推移">';
    [0, 50, 100].forEach((v) => { svg += '<line class="grid" x1="' + padL + '" x2="' + (w - padR) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="2" y="' + (y(v) + 3) + '">' + v + "</text>"; });
    svg += '<path class="line" d="' + line + '"/>';
    xs.forEach((x, i) => { svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y(pcts[i]).toFixed(1) + '" r="3.5"/>'; });
    svg += "</svg>";
    return out + svg;
  }
  function examPaperable(q) {
    if (q && (q.t === "mc" || q.t === "ty") && !q.listen) return true;
    return paperable(q);
  }
  function examQHtml(q) {
    const s = String(q.q || "");
    if (/<[a-z/]/i.test(s)) return s;
    return fracHtml(s);
  }
  function gradeExamGiven(q, given) {
    if (q.t === "mc") return { ok: given != null && given !== "" && String(given) === String(q.a), empty: given == null || given === "" };
    if (q.t === "ty") {
      if (given == null || String(given).trim() === "") return { ok: false, empty: true };
      if (window.E4 && E4.judgeText) {
        const r = E4.judgeText(String(given), q.acc || [q.a]);
        return { ok: !!(r && r.ok), empty: !!r.empty };
      }
      const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
      return { ok: (q.acc || [q.a]).some((a) => norm(a) === norm(given)) };
    }
    return gradeColorGiven(q, given);
  }
  function examPool(scope, want) { return (collectScopeQuestions(scope, want || 240) || []).filter(examPaperable); }
  function examFill(s, g, scope) {
    const used = new Set((scope || []).map((x) => x.ui));
    const extra = examUnits(s, g).map((u, ui) => used.has(ui) ? null : { s, g, ui, un: u.n }).filter(Boolean);
    return examPool(extra, 160);
  }
  function startExamPaper(opts) {
    const s = opts.s, g = opts.g, system = String(opts.system || "3"), kind = opts.kind;
    const scope = (opts.scope && opts.scope.length) ? opts.scope : examScopeOf(system, kind, g, s);
    if (!scope.length) { toast("範囲の単元を1つ以上えらんでね"); return; }
    const pool = examPool(scope, 240), fill = examFill(s, g, scope);
    const paper = HMExam.buildPaper(s, pool, fill);
    if (!paper.n) { toast("この範囲では問題を作れなかったよ"); return; }
    paper.qs.forEach((q) => { if (q.t === "ch" || q.t === "mc") q.opts = HM.U.shuf((q.opts || [q.a].concat(q.o || [])).slice()); });
    const name = opts.name || (gradeName(g) + " " + subjName(s, g) + "　" + examLabel(system, kind));
    EX = { s, g, system, kind, name, scope, paper, ans: [], timerOn: !!opts.timerOn, remain: paper.minutes * 60, timeUp: false, graded: false, started: false, testId: opts.testId || "", coins: 0, rec: null };
    Q = { mode: "exam", backNav: modeNav.slice(), s, g, ui: null, si: null };
    $("#quiz").hidden = false; document.body.classList.add("in-quiz");
    renderExamIntro();
  }
  function renderExamIntro() {
    const p = drillPartner(), spec = EX.paper;
    const tline = EX.timerOn ? (spec.minutes + "分のタイマーつき") : "タイマーなし";
    $("#quiz").innerHTML = '<div class="sum mock-intro"><div class="mock-badge">📝 定期テスト</div><h2>' + esc(EX.name) + "</h2><p class=\"lead\">" + spec.n + " 問 ・ " + spec.max + "点満点 ・ " + tline + '</p><div class="sum-char">' + charHtml(p.id, 110, "bob r" + p.rarity) + '<div class="bubble">本番のつもりで、いってみよう！</div></div><div class="sum-act"><button type="button" class="btn primary block" data-ex="go">はじめる</button><button type="button" class="btn ghost block" data-q="quit">もどる</button></div></div>';
    $("#quiz").scrollTop = 0;
  }
  function clearExTimer() { if (exTimer) { clearInterval(exTimer); exTimer = null; } }
  function startExTimer() {
    clearExTimer();
    if (!EX || !EX.timerOn) return;
    exTimer = setInterval(() => {
      if (!EX || EX.graded || !EX.timerOn) { clearExTimer(); return; }
      EX.remain--;
      const el = $("#ex-clock");
      if (el) { el.textContent = fmtClock(Math.max(0, EX.remain)); el.classList.toggle("warn", EX.remain <= 60); }
      if (EX.remain <= 0) {
        EX.remain = 0; EX.timeUp = true; clearExTimer();
        const b = $("#ex-timeup"); if (b) b.hidden = false;
      }
    }, 1000);
  }
  function readExamInputs() {
    if (!EX) return;
    $$("[data-ex-in]").forEach((inp) => { EX.ans[+inp.getAttribute("data-ex-in")] = inp.value; });
  }
  function renderExamPaper() {
    const paper = EX.paper, graded = !!EX.graded;
    let h = '<div class="ex-sheet"><div class="ex-bar"><button type="button" class="ct-x" data-q="quit" aria-label="やめる">✕</button>';
    if (EX.timerOn) h += '<span class="ex-clock' + (EX.remain <= 60 ? " warn" : "") + '" id="ex-clock">' + fmtClock(Math.max(0, EX.remain)) + "</span>";
    h += "</div>";
    h += '<div id="ex-timeup" class="ex-timeup"' + (EX.timeUp && !graded ? "" : " hidden") + ">時間になったよ。採点する？</div>";
    h += '<div class="ex-paper"><div class="ex-head"><div class="ex-brand">ほしの学園　定期テスト</div><div class="ex-title">' + esc(EX.name) + "</div>";
    h += '<div class="ex-row"><span class="ex-meta">' + esc(gradeName(EX.g) + "　" + subjName(EX.s, EX.g)) + "　" + paper.n + '問</span><span class="ex-scorebox">得点　<b>' + (graded ? EX.rec.score : "　") + '</b> / ' + paper.max + '</span></div></div>';
    let qi = 0;
    paper.parts.forEach((part) => {
      if (!part.qs.length) return;
      h += '<div class="ex-part"><h3>' + esc(part.n) + "</h3><div class=\"ep-sub\">各問 " + part.pts + "点　（" + part.max + "点）</div>";
      part.qs.forEach((q) => {
        const idx = qi++, given = EX.ans[idx] == null ? "" : String(EX.ans[idx]);
        const res = graded ? gradeExamGiven(q, given) : null;
        h += '<div class="ex-q' + (graded ? " graded" : "") + '"><div class="eq-n">問' + (idx + 1) + "（" + q.pts + "点）</div>";
        if (graded) h += '<span class="ex-mark">' + (res.ok ? "◯" : "×") + "</span>";
        h += '<div class="eq-q">' + examQHtml(q) + "</div>";
        if (q.t === "ch" || q.t === "tf" || q.t === "mc" || ((q.opts || q.o) && q.t !== "ty")) {
          const opts = q.opts || (q.t === "tf" ? ["〇", "×"] : [q.a].concat(q.o || []));
          const seen = {};
          opts.forEach((o) => {
            if (o == null || seen[o]) return; seen[o] = 1;
            const on = given === String(o);
            h += '<button type="button" class="ex-opt' + (on ? " on" : "") + (graded && String(o) === String(q.a) ? " right" : "") + (graded && on && String(o) !== String(q.a) ? " wrong" : "") + '" data-ex="pick" data-i="' + idx + '" data-v="' + esc(String(o)) + '" ' + (graded ? "disabled" : "") + ">" + fracHtml(esc(String(o))) + "</button>";
          });
        } else {
          h += '<div class="ct-num"><input class="ex-in" data-ex-in="' + idx + '" inputmode="' + (q.t === 'ty' ? 'text' : 'decimal') + '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(given) + '" ' + (graded ? "readonly" : "") + ' placeholder="こたえ"></div>';
        }
        h += "</div>";
      });
      h += "</div>";
    });
    h += "</div>";
    if (!graded) h += '<div class="ex-foot"><button type="button" class="btn primary block" data-ex="grade">採点する（' + paper.max + "点満点）</button></div>";
    else h += '<div class="ex-foot"><button type="button" class="btn primary block" data-ex="result">結果を見る</button></div>';
    h += "</div>";
    const prevY = (EX.started && $("#quiz").scrollTop) || 0;
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = EX.graded ? 0 : prevY;
    $$("[data-ex-in]").forEach((inp) => {
      const sync = () => { EX.ans[+inp.getAttribute("data-ex-in")] = inp.value; };
      inp.addEventListener("input", sync); inp.addEventListener("change", sync);
    });
    if (!graded && EX.timerOn && EX.started) startExTimer();
  }
  function gradeExam() {
    if (!EX || EX.graded) return;
    readExamInputs();
    clearExTimer();
    const paper = EX.paper;
    let score = 0, okN = 0;
    const partScores = paper.parts.map((p) => ({ i: p.i, n: p.n, score: 0, max: p.max }));
    const miss = [], seenU = {};
    paper.qs.forEach((q, i) => {
      const r = gradeExamGiven(q, EX.ans[i]);
      if (r.ok) { score += q.pts; okN++; partScores[q.part].score += q.pts; }
      else if (q.__src) {
        const k = q.__src.s + "|" + q.__src.g + "|" + q.__src.ui;
        if (!seenU[k]) { seenU[k] = 1; miss.push({ s: q.__src.s, g: q.__src.g, ui: q.__src.ui, un: q.__src.un }); }
      }
    });
    EX.graded = true; EX.okN = okN;
    const rec = { t: now(), s: EX.s, g: EX.g, system: EX.system, kind: EX.kind, name: EX.name, score, max: paper.max, okN, n: paper.n, parts: partScores, miss, testId: EX.testId || "" };
    examHistArr().push(rec);
    if (examHistArr().length > 200) state.examHist = examHistArr().slice(-200);
    const ck = examCoinMap(), dayK = [EX.kind, EX.g, EX.s, today()].join("|");
    let coins = 0;
    if (!ck[dayK] && okN) { ck[dayK] = 1; coins = grantQuiet(okN); }
    EX.coins = coins; EX.rec = rec;
    save();
    renderExamResult();
  }
  function renderExamResult() {
    const rec = EX.rec, max = rec.max, pct = max ? Math.round(100 * rec.score / max) : 0, mark = markOf(pct);
    const tot = HMExam.totals(examHistArr(), EX.g, EX.system, EX.kind);
    const p = drillPartner();
    const line = pct >= 100 ? "100点！ 花丸だね！" : pct >= 90 ? "すばらしい！ 花丸だよ！" : pct >= 60 ? "いい調子！ にがてなところを復習して、もう一度やってみよう！" : "ここから伸びるよ。まちがえた単元を復習してみよう！";
    let h = '<div class="ex-result">';
    if (pct >= 90) h += '<div class="ct-hana' + (pct >= 100 ? " perfect" : "") + '"><span>花丸</span></div>';
    h += '<div class="ex-score-hero"><div class="k">定期テストの結果</div><div class="n"><b>' + rec.score + "</b><small> / " + max + " 点</small></div>" + markLabel(mark, pct) + "</div>";
    h += '<div class="ex-parts">';
    rec.parts.forEach((p2) => { if (p2.max) h += "<div><b>" + esc(p2.n) + "</b><span>" + p2.score + " / " + p2.max + " 点</span></div>"; });
    h += "<div><b>正解</b><span>" + rec.okN + " / " + rec.n + " 問</span></div></div>";
    if (tot.five.n) h += '<div class="ex-totals">' + examTotBox("5教科", tot.five, 500) + examTotBox("9教科", tot.nine, 900) + "</div>";
    if (EX.coins) h += '<p class="ct-coin">🪙 +' + EX.coins + " コイン（今日この教科の1回目）</p>";
    if (rec.miss && rec.miss.length) {
      h += '<div class="sec2">まちがえた問題の復習</div><div class="ex-rev">';
      rec.miss.forEach((u) => { h += '<button type="button" data-ex="review" data-s="' + u.s + '" data-g="' + u.g + '" data-ui="' + u.ui + '">' + esc(u.un) + "</button>"; });
      h += "</div>";
    }
    h += '<div class="sum-char">' + charHtml(p.id, 100, "bob r" + p.rarity) + '<div class="bubble">' + esc(line) + "</div></div>";
    const chartRows = examHistArr().filter((r) => r.s === EX.s && r.g === EX.g).slice(-12);
    h += '<div class="ex-chart">' + examChartSvg(chartRows, subjName(EX.s, EX.g)) + "</div>";
    h += '<div class="sum-act"><button type="button" class="btn primary block" data-ex="review-paper">赤ペンの答案を見る</button><button type="button" class="btn ghost block" data-ex="again">もう一度受ける</button><button type="button" class="btn ghost block" data-q="quit">もどる</button></div></div>';
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (pct >= 90) { confetti(pct >= 100 ? 80 : 50); sound("fanfare"); } else if (rec.score) sound("soft");
  }
  function startExamAgain() {
    const cur = EX;
    startExamPaper({ s: cur.s, g: cur.g, system: cur.system, kind: cur.kind, name: cur.name, scope: cur.scope, timerOn: cur.timerOn, testId: cur.testId });
  }
  function handleExam(act, el) {
    if (act === "go") {
      if (!EX) return true;
      EX.started = true;
      if (EX.timerOn) EX.remain = EX.paper.minutes * 60;
      renderExamPaper();
      return true;
    }
    if (!EX) return false;
    if (act === "pick") {
      if (EX.graded) return true;
      EX.ans[+el.dataset.i] = el.dataset.v;
      renderExamPaper();
      return true;
    }
    if (act === "grade") { gradeExam(); return true; }
    if (act === "result") { renderExamResult(); return true; }
    if (act === "review-paper") { renderExamPaper(); return true; }
    if (act === "again") { startExamAgain(); return true; }
    if (act === "review") {
      const s = el.dataset.s, g = +el.dataset.g, ui = +el.dataset.ui;
      quitQuiz();
      goUnit(s, g, ui);
      return true;
    }
    return false;
  }
  function registerExamTest() {
    const top = modeNav.find((x) => x.v === "exam") || modeNav[modeNav.length - 1] || {};
    const g = top.g || examDefaultGrade(), system = String(top.system || "3"), kind = top.kind;
    const lab = examLabel(system, kind);
    const scope = HMExam.allScope(system, kind, g, examUnits);
    if (!scope.length) { toast("この回の範囲はまだないよ"); return; }
    testDraft = newDraft();
    testDraft.name = gradeName(g) + "の" + lab;
    testDraft.scope = scope;
    testDraft.pickS = scope[0].s;
    testDraft.pickG = g;
    testDraft.system = system;
    testDraft.kind = kind;
    testDraft.examG = g;
    modeNav = [{ v: "test" }, { v: "test-new" }];
    navDir = "fwd";
    render(); window.scrollTo(0, 0);
  }
  function applyPresetToDraft() {
    readDraftInputs();
    const d = testDraft; if (!d) return;
    const g = (d.examG >= 7 && d.examG <= 9) ? d.examG : ((d.pickG >= 7 && d.pickG <= 9) ? d.pickG : 7);
    const system = String(d.system || "3");
    const terms = HMExam.termsOf(system);
    let kind = d.kind || terms[0].id;
    if (!terms.some((t) => t.id === kind)) kind = terms[0].id;
    d.examG = g; d.system = system; d.kind = kind; d.pickG = g;
    d.scope = HMExam.allScope(system, kind, g, examUnits);
    if (!String(d.name || "").trim()) d.name = gradeName(g) + "の" + examLabel(system, kind);
    toast("範囲を入れたよ（" + d.scope.length + "単元）");
    render();
  }
  function startExamFromTest(test, s) {
    const scope = (test.scope || []).map((x) => resolveScope(x) || x).filter((x) => x && x.s === s);
    if (!scope.length) { toast("この教科の範囲はないよ"); return; }
    const g = scope[0].g;
    const system = test.system || "3", kind = test.kind || "";
    startExamPaper({ s, g, system, kind, name: testNameOf(test) + "　" + subjName(s, g), scope, timerOn: true, testId: test.id });
  }


  // ---------- v1.4.0 カラーテスト・漢字50問 ----------
  const CT_OMOTE_N = 10, CT_URA_N = 5, CT_OMOTE_PT = 5, CT_URA_PT = 10; // 10*5 + 5*10 = 100
    const KJ_PRACTICE_N = 10;
  let CT = null, KJ = null;
  function drillPartner() {
    return GCArt.charById(state.partner) || GCArt.charById((state.gk && state.gk.partner) || "") || { id: "ren", rarity: 0 };
  }
  function grantQuiet(okN) {
    if (!okN) return 0;
    const g = (state.gk = state.gk || {});
    if (!g.coins || typeof g.coins !== "object") g.coins = { e: 0, s: 0 };
    g.coins.e = (+g.coins.e || 0) + okN * 10;
    g.correct = (+g.correct || 0) + okN;
    if (!g.bond || typeof g.bond !== "object") g.bond = {};
    if (g.partner) g.bond[g.partner] = (+g.bond[g.partner] || 0) + okN;
    return okN * 10;
  }
  function colorKey(s, g, un) { return s + "|" + g + "|" + un; }
  function colorRec(s, g, un) { const all = (state.colorTests = state.colorTests && typeof state.colorTests === "object" ? state.colorTests : {}); return all[colorKey(s, g, un)] || null; }
  function jhsUnits(s, g) { return ((S()[s] || {})[g] || []).map((u, ui) => ({ s, g, ui, un: u.n, rec: unitRecord(s, g, ui), ct: colorRec(s, g, u.n) })).filter((x) => x.rec); }
  function paperable(q) {
    if (!q || q.listen || q.t === "kanji" || q.t === "ord" || q.t === "match" || q.t === "pair" || q.t === "tap" || q.t === "sp") return false;
    return q.t === "ch" || q.t === "tf" || q.t === "num" || !q.t;
  }
  function collectColorQs(s, g, ui) {
    const want = CT_OMOTE_N + CT_URA_N;
    let pool = (collectScopeQuestions([{ s, g, ui }], 120) || []).filter(paperable);
    const seen = new Set(pool.map((q) => q.q + "|" + q.a));
    if (pool.length < want) {
      const us = (S()[s] || {})[g] || [];
      for (let i = 0; i < us.length && pool.length < want * 2; i++) {
        if (i === ui) continue;
        (collectScopeQuestions([{ s, g, ui: i }], 40) || []).filter(paperable).forEach((q) => {
          const k = q.q + "|" + q.a; if (seen.has(k)) return; seen.add(k); pool.push(q);
        });
      }
    }
    pool = HM.U.shuf(pool);
    const out = [];
    const used = new Set();
    for (let i = 0; i < pool.length && out.length < want; i++) {
      const k = String(pool[i].q).slice(0, 80);
      if (used.has(k)) continue; used.add(k); out.push(pool[i]);
    }
    return out;
  }
  function assignColorPts(qs) {
    const nO = Math.min(CT_OMOTE_N, qs.length);
    const nU = Math.min(CT_URA_N, Math.max(0, qs.length - nO));
    const omote = qs.slice(0, nO).map((q) => Object.assign({}, q, { pts: CT_OMOTE_PT, side: "omote" }));
    const ura = qs.slice(nO, nO + nU).map((q) => Object.assign({}, q, { pts: CT_URA_PT, side: "ura" }));
    // 足りないときは配点を100に合わせる
    const all = omote.concat(ura);
    const sum = all.reduce((t, q) => t + q.pts, 0);
    if (all.length && sum !== 100) {
      const last = all[all.length - 1];
      last.pts = Math.max(1, last.pts + (100 - sum));
    }
    return { omote, ura, all };
  }
  function gradeColorGiven(q, given) {
    if (given == null || given === "") return { ok: false, empty: true };
    if (q.t === "ch" || q.t === "tf") return { ok: given === q.a };
    const j = judgeNum(given, q.a);
    if (j.empty) return { ok: false, empty: true };
    return { ok: !!(j.ok || j.reduce) };
  }

  function viewColorHome() {
    const g0 = prepGrade() >= 7 ? prepGrade() : 7;
    const top = modeNav[modeNav.length - 1] || {};
    const g = top.g || g0, s = top.s || "math";
    let h = '<p class="lead">中学の単元を、小学校のカラーテストみたいな 100 点満点でやってみよう。おもて 10 問（各 5 点）とうら 5 問（各 10 点）。</p>';
    h += '<div class="chips wrap">' + [7, 8, 9].map((x) => '<button type="button" class="chip' + (x === g ? " on" : "") + '" data-act="ct-g" data-g="' + x + '">' + gradeName(x) + "</button>").join("") + "</div>";
    const subjs = SUBJ.filter((x) => x.id !== "life" && gradesOf(x.id).includes(g));
    h += '<div class="chips wrap">' + subjs.map((x) => '<button type="button" class="chip' + (x.id === s ? " on" : "") + '" data-act="ct-s" data-s="' + x.id + '">' + esc(subjName(x.id, g)) + "</button>").join("") + "</div>";
    const list = jhsUnits(s, g);
    if (!list.length) h += '<p class="lead soft">この教科・学年の単元はないよ。</p>';
    else h += '<div class="list">' + list.map((r) => {
      const sc = r.ct ? '<span class="umark ' + markOf(r.ct.best) + '">' + r.ct.best + "点</span>" : '<span class="umark none">まだ</span>';
      return '<button type="button" class="row-btn unit-row" data-act="ct-start" data-s="' + r.s + '" data-g="' + r.g + '" data-ui="' + r.ui + '">' + HMIcons.icon(r.s, subjById(r.s).c, 36) + '<span class="grow"><b>' + esc(r.un) + "</b><span class=\"small muted\">単元テスト 100点満点" + (r.ct ? " ・ ベスト " + r.ct.best + "点" : "") + "</span></span>" + sc + "</button>";
    }).join("") + "</div>";
    return h;
  }

  function startColorTest(s, g, ui) {
    const u = ((S()[s] || {})[g] || [])[ui]; if (!u) { toast("単元が見つからないよ"); return; }
    const raw = collectColorQs(s, g, ui);
    if (raw.length < 6) { toast("この単元では、まだテスト用の問題が足りないよ"); return; }
    const pack = assignColorPts(raw);
    CT = { s, g, ui, un: u.n, omote: pack.omote, ura: pack.ura, all: pack.all, ans: {}, side: "omote", graded: false, score: 0, coins: 0, extra: raw.length > (S()[s][g][ui].steps ? 0 : 0) && pack.all.some((q) => q.__src && q.__src.ui !== ui) };
    Q = { mode: "color", s, g, ui: null, backNav: [{ v: "color", s, g }] };
    $("#quiz").hidden = false; document.body.classList.add("in-quiz");
    renderColorCover();
  }
  function colorMax(ct) { return (ct.omote.reduce((t, q) => t + q.pts, 0) + ct.ura.reduce((t, q) => t + q.pts, 0)); }
  function renderColorCover() {
    const ct = CT, p = drillPartner();
    const max = colorMax(ct);
    let h = '<div class="ct-cover"><div class="ct-seal">ほしの学園</div><div class="ct-kicker">単元テスト</div>';
    h += "<h2>" + esc(subjName(ct.s, ct.g)) + " " + gradeName(ct.g) + "</h2><div class=\"ct-unit\">" + esc(ct.un) + "</div>";
    h += '<div class="ct-pts"><b>' + max + " 点満点</b><span>おもて " + ct.omote.length + " 問（各 " + CT_OMOTE_PT + " 点）＝ " + ct.omote.reduce((t, q) => t + q.pts, 0) + " 点</span><span>うら " + ct.ura.length + " 問（各 " + CT_URA_PT + " 点）＝ " + ct.ura.reduce((t, q) => t + q.pts, 0) + " 点</span></div>";
    if (ct.extra) h += '<p class="small">同じ学年の、ちかい単元の問題もすこし入っているよ。</p>';
    h += '<div class="sum-char">' + charHtml(p.id, 100, "bob r" + p.rarity) + '<div class="bubble">表と裏、両方やってから採点しよう！</div></div>';
    h += '<div class="sum-act"><button type="button" class="btn primary block" data-ct="open">おもてをひらく</button><button type="button" class="btn ghost block" data-q="quit">もどる</button></div></div>';
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
  }
  function qPrompt(q) { return fracHtml(q.q || ""); }
  function renderColorPaper() {
    const ct = CT, side = ct.side, list = side === "omote" ? ct.omote : ct.ura, start = side === "omote" ? 0 : ct.omote.length;
    const max = colorMax(ct), nick = (state.settings && state.settings.nick) || "";
    let h = '<div class="ct-sheet ' + (ct.graded ? "graded" : "") + ' side-' + side + '">';
    h += '<div class="ct-bar"><button type="button" class="ct-x" data-q="quit" aria-label="やめる">✕</button>';
    h += '<div class="ct-flip"><button type="button" class="ct-tab' + (side === "omote" ? " on" : "") + '" data-ct="side" data-side="omote">おもて</button><button type="button" class="ct-tab' + (side === "ura" ? " on" : "") + '" data-ct="side" data-side="ura">うら</button></div>';
    h += (ct.graded ? '<div class="ct-live">' + ct.score + " / " + max + "</div>" : "") + "</div>";
    h += '<div class="ct-paper"><div class="ct-head"><div class="ct-brand">ほしの学園　単元テスト</div><div class="ct-meta">' + esc(subjName(ct.s, ct.g) + "　" + gradeName(ct.g)) + "</div>";
    h += '<div class="ct-title">' + esc(ct.un) + "</div>";
    h += '<div class="ct-row"><span class="ct-name">なまえ <i>' + esc(nick) + '</i></span><span class="ct-scorebox">得点 <b>' + (ct.graded ? ct.score : "") + "</b> / " + max + "</span></div>";
    h += '<div class="ct-rule">この面　' + (side === "omote" ? "おもて　" + ct.omote.length + " 問（各 " + CT_OMOTE_PT + " 点）" : "うら　" + ct.ura.length + " 問（各 " + CT_URA_PT + " 点）") + "</div></div>";
    list.forEach((q, i) => {
      const idx = start + i, given = ct.ans[idx], res = ct.graded ? gradeColorGiven(q, given) : null;
      h += '<div class="ct-q' + (res ? (res.ok ? " ok" : " ng") : "") + '"><div class="ct-qn"><span class="ct-no">' + (idx + 1) + '</span><span class="ct-pt">' + q.pts + "点</span></div>";
      h += '<div class="ct-qp">' + qPrompt(q) + "</div>";
      if (q.t === "ch" || q.t === "tf") {
        const opts = q.opts || (q.t === "tf" ? ["〇", "×"] : [q.a].concat(q.o || []));
        h += '<div class="ct-opts">';
        opts.forEach((o) => {
          const on = given === o;
          h += '<button type="button" class="ct-opt' + (on ? " on" : "") + (ct.graded && o === q.a ? " right" : "") + (ct.graded && on && o !== q.a ? " wrong" : "") + '" data-ct="pick" data-i="' + idx + '" data-v="' + esc(o) + '" ' + (ct.graded ? "disabled" : "") + ">" + fracHtml(esc(o)) + "</button>";
        });
        h += "</div>";
      } else {
        h += '<div class="ct-num"><input class="ct-in" data-ct-in="' + idx + '" inputmode="decimal" autocomplete="off" value="' + esc(given || "") + '" ' + (ct.graded ? "readonly" : "") + ' placeholder="こたえ"></div>';
        if (ct.graded) h += '<div class="ct-ans">正解　' + esc(q.a) + "</div>";
      }
      if (res) h += '<i class="ct-mark">' + (res.ok ? "◯" : "／") + "</i>";
      h += "</div>";
    });
    h += "</div>";
    if (!ct.graded) {
      h += '<div class="ct-foot"><button type="button" class="btn ghost" data-ct="side" data-side="' + (side === "omote" ? "ura" : "omote") + '">' + (side === "omote" ? "うらを見る →" : "← おもてに戻る") + '</button><button type="button" class="btn primary" data-ct="grade">採点する（100点満点）</button></div>';
    } else {
      h += '<div class="ct-foot"><button type="button" class="btn ghost" data-ct="side" data-side="' + (side === "omote" ? "ura" : "omote") + '">' + (side === "omote" ? "うらを見る →" : "← おもてを見る") + '</button><button type="button" class="btn primary" data-ct="result">結果を見る</button></div>';
    }
    h += "</div>";
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (!ct.graded) {
      $$("[data-ct-in]").forEach((inp) => { inp.addEventListener("input", () => { CT.ans[+inp.getAttribute("data-ct-in")] = inp.value; }); inp.addEventListener("change", () => { CT.ans[+inp.getAttribute("data-ct-in")] = inp.value; }); });
    }
  }
  function readColorInputs() { $$("[data-ct-in]").forEach((inp) => { CT.ans[+inp.getAttribute("data-ct-in")] = inp.value; }); }
  function gradeColorTest() {
    readColorInputs();
    const ct = CT, max = colorMax(ct);
    let score = 0, okN = 0, blank = 0;
    ct.all.forEach((q, i) => {
      const r = gradeColorGiven(q, ct.ans[i]);
      if (r.empty) blank++;
      if (r.ok) { score += q.pts; okN++; }
    });
    ct.graded = true; ct.score = score; ct.okN = okN; ct.blank = blank;
    const day = today(), k = colorKey(ct.s, ct.g, ct.un);
    const all = (state.colorTests = state.colorTests || {});
    const prev = all[k] || { best: 0, plays: 0 };
    const rec = { best: Math.max(prev.best || 0, score), last: score, plays: (prev.plays || 0) + 1, t: now(), n: ct.all.length, max };
    all[k] = rec;
    // コイン・仲良し度：その単元は1日1回、正解1問につき10（通常と同じ）
    const ck = (state.colorCoin = state.colorCoin || {});
    const dayK = k + "|" + day;
    let coins = 0;
    if (!ck[dayK] && okN) { ck[dayK] = 1; coins = grantQuiet(okN); }
    ct.coins = coins;
    save();
    renderColorResult();
  }
  function renderColorResult() {
    const ct = CT, max = colorMax(ct), pct = Math.round(100 * ct.score / max), mark = markOf(pct);
    const omote = ct.omote.reduce((t, q, i) => t + (gradeColorGiven(q, ct.ans[i]).ok ? q.pts : 0), 0);
    const uraOff = ct.omote.length;
    const ura = ct.ura.reduce((t, q, i) => t + (gradeColorGiven(q, ct.ans[uraOff + i]).ok ? q.pts : 0), 0);
    const omoteMax = ct.omote.reduce((t, q) => t + q.pts, 0), uraMax = ct.ura.reduce((t, q) => t + q.pts, 0);
    const p = drillPartner();
    const line = pct >= 100 ? "100点！ 花丸だね！" : pct >= 90 ? "すばらしい！ 花丸だよ！" : pct >= 60 ? "いい調子！ もう一度やると、もっと伸びるよ。" : "ここから伸びるよ。範囲の単元を復習してみよう！";
    let h = '<div class="ct-result">';
    if (pct >= 90) h += '<div class="ct-hana' + (pct >= 100 ? " perfect" : "") + '"><span>花丸</span></div>';
    h += '<div class="ct-score-hero"><div class="ct-sh-k">単元テストの結果</div><div class="ct-sh-n"><b>' + ct.score + "</b><small> / " + max + " 点</small></div>" + markLabel(mark, pct) + "</div>";
    h += '<div class="ct-break"><div><b>おもて</b><span>' + omote + " / " + omoteMax + " 点</span></div><div><b>うら</b><span>" + ura + " / " + uraMax + " 点</span></div><div><b>正解</b><span>" + ct.okN + " / " + ct.all.length + " 問</span></div></div>";
    if (ct.coins) h += '<p class="ct-coin">🪙 +' + ct.coins + " コイン（今日この単元の1回目）</p>";
    h += '<div class="sum-char">' + charHtml(p.id, 100, "bob r" + p.rarity) + '<div class="bubble">' + esc(line) + "</div></div>";
    h += '<div class="sum-act"><button type="button" class="btn primary block" data-ct="review">赤ペンの答案を見る</button><button type="button" class="btn ghost block" data-ct="again">もう一度受ける</button><button type="button" class="btn ghost block" data-q="quit">もどる</button></div></div>';
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (pct >= 90) { confetti(pct >= 100 ? 80 : 50); sound("fanfare"); } else if (ct.score) sound("soft");
  }
  function handleColor(act, el) {
    if (!CT) return false;
    if (act === "open") { CT.side = "omote"; renderColorPaper(); return true; }
    if (act === "side") { readColorInputs(); CT.side = el.dataset.side; renderColorPaper(); return true; }
    if (act === "pick") {
      if (CT.graded) return true;
      CT.ans[+el.dataset.i] = el.dataset.v;
      const box = el.closest(".ct-q");
      if (box) box.querySelectorAll(".ct-opt").forEach((b) => b.classList.toggle("on", b === el));
      else renderColorPaper();
      return true;
    }
    if (act === "grade") { gradeColorTest(); return true; }
    if (act === "result") { renderColorResult(); return true; }
    if (act === "review") { CT.side = "omote"; renderColorPaper(); return true; }
    if (act === "again") { startColorTest(CT.s, CT.g, CT.ui); return true; }
    return false;
  }

  // ---- 漢字 ----
  function kjGrade() { const g = prepGrade(); return g >= 1 && g <= 9 ? g : 7; }
  const kjGName = (g) => (g === "M" ? "中学のまとめ" : gradeName(+g));
  function kjTermRec(key) { const all = (state.kjTerm = state.kjTerm && typeof state.kjTerm === "object" ? state.kjTerm : {}); return all[key] || null; }
  function kjBestAny(g) { let b = null; Object.keys(state.kjTerm || {}).forEach((k) => { if (k === String(g) || k.indexOf(g + "|") === 0) { const r = state.kjTerm[k]; if (r && (b == null || r.best > b)) b = r.best; } }); return b; }
  function kjList(g) { return (HM.KANJI_ENT && HM.KANJI_ENT[g]) || []; }
  function kjWrongArr() { if (!Array.isArray(state.kjWrong)) state.kjWrong = []; return state.kjWrong; }
  function kjBestOf(g) { const all = (state.kjBest = state.kjBest && typeof state.kjBest === "object" ? state.kjBest : {}); return all[String(g)] || null; }
  function kanaOnly(s) { return String(s || "").replace(/[ぁ-ん]/g, (c) => c).trim(); }
  function kjWordHtml(w, hideI) {
    if (!w) return "";
    const parts = Array.isArray(w.f) && w.f.length ? w.f : [[w.t || w.k || "", w.r || ""]];
    return '<span class="kjq big">' + parts.map((part, j) => {
      const ru = Array.isArray(part) ? part[0] : (part && part.ru) || "";
      const rt = Array.isArray(part) ? part[1] : (part && part.rt) || "";
      if (hideI && j === w.i) return "<ruby><span class=\"kj-box\"></span><rt>" + esc(rt) + "</rt></ruby>";
      return esc(ru);
    }).join("") + "</span>";
  }
  function pickKjQs(g, kind, n, preferWrong) {
    const list = kjList(g);
    const wrong = kjWrongArr().filter((x) => x.g === g && (!kind || x.kind === kind));
    const pool = [];
    const use = preferWrong && wrong.length ? wrong : [];
    const pushEnt = (e, wkind) => {
      if (!e || !e.words || !e.words.length) return;
      const w = e.words[Math.floor(Math.random() * e.words.length)] || e.words[0];
      pool.push({ kind: wkind, k: e.k, sc: e.sc, g, w });
    };
    if (use.length) {
      use.forEach((x) => {
        const e = list.find((it) => it.k === x.k) || { k: x.k, sc: x.sc || 0, words: x.w ? [x.w] : [] };
        if (!e.words.length && x.w) e.words = [x.w];
        pushEnt(e, x.kind || kind || "read");
      });
    }
    const shuf = HM.U.shuf(list.slice());
    shuf.forEach((e) => { if (pool.length >= n * 2) return; if (pool.some((p) => p.k === e.k && p.kind === (kind || p.kind))) return; pushEnt(e, kind || (pool.length % 2 ? "write" : "read")); });
    let out = HM.U.shuf(pool);
    if (kind) out = out.filter((q) => q.kind === kind);
    const uniq = []; const seen = new Set();
    out.forEach((q) => { const id = q.kind + ":" + q.k + ":" + q.w.t; if (seen.has(id)) return; seen.add(id); uniq.push(q); });
    return uniq.slice(0, n);
  }
  function kjReadOpts(q, g) {
    const correct = q.w.r;
    const pool = [];
    const list = kjList(g);
    list.forEach((e) => (e.words || []).forEach((w) => { if (w && w.r && w.r !== correct && pool.indexOf(w.r) < 0) pool.push(w.r); }));
    const opts = [correct].concat(HM.U.shuf(pool).slice(0, 3));
    while (opts.length < 4) opts.push(correct + "ん"); // should almost never happen
    return HM.U.shuf(Array.from(new Set(opts))).slice(0, 4);
  }
  function viewKjHome() {
    const K = HM.KJT, top = modeNav[modeNav.length - 1] || {};
    let g = top.g || kjGrade(); if (g !== "M") g = +g;
    let h = '<p class="lead">学年・学期・回をえらんでテスト。同じ回は、いつも同じ問題だよ。</p>';
    h += '<div class="chips wrap">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => '<button type="button" class="chip' + (x === g ? " on" : "") + '" data-act="kj-g" data-g="' + x + '">' + gradeName(x) + "</button>").join("") + '<button type="button" class="chip' + (g === "M" ? " on" : "") + '" data-act="kj-g" data-g="M">まとめ</button></div>';
    const rowBtn = (key, title, sub) => {
      const rec = kjTermRec(key), m = rec ? markOf(rec.best) : "";
      return '<button type="button" class="row-btn unit-row kj-round" data-act="kj-round" data-key="' + key + '"><span class="grow"><b>' + esc(title) + '</b><span class="small muted">' + esc(sub) + (rec ? " ・ ベスト " + rec.best + "点" + (rec.last != null && rec.last !== rec.best ? "（前回 " + rec.last + "点 " + markIcon(markOf(rec.last)) + "）" : "") : "") + "</span></span>" + (rec ? '<span class="umark ' + m + '">' + markIcon(m) + " " + rec.best + "点</span>" : '<span class="umark none">まだ</span>') + "</button>";
    };
    if (!K || !HM.KANJI_ENT) return h + '<p class="lead soft">漢字のデータがまだ読み込めていないよ。</p>';
    if (g === "M") {
      h += '<div class="kj-hero-card"><div class="kj-hk">中学のまとめ</div><b>70 問</b><small>中1〜中3のぜんぶの漢字から、まんべんなく 70 字。書き 56 問 → 読み 14 問。100点に換算するよ。</small></div>';
      h += '<div class="list">' + rowBtn("M", "中学のまとめテスト", "70問・中1〜中3の範囲") + "</div>";
    } else {
      const sp = K.spec(g), n = kjList(g).length, plan = K.plan(g);
      h += '<div class="kj-hero-card"><div class="kj-hk">' + gradeName(g) + "の漢字</div><b>" + n + " 字・" + plan.length + " 回</b><small>1回 " + sp.total + " 問：書き " + sp.write + " 問 → 読み " + sp.read + " 問" + (g >= 7 ? "（100点に換算）" : "（各 2 点・100点満点）") + "</small></div>";
      [1, 2, 3].forEach((tm) => {
        const rs = plan.filter((r) => r.t === tm); if (!rs.length) return;
        h += '<div class="sec2">' + tm + "学期</div><div class=\"list\">" + rs.map((r) => rowBtn(r.key, "第" + r.n + "回", "範囲 " + r.count + "字 ・ " + sp.total + "問")).join("") + "</div>";
      });
      const wrong = kjWrongArr().filter((x) => x.g === g).length;
      h += '<div class="sec2">れんしゅう</div><div class="drill-acts">';
      h += '<button type="button" class="btn block" data-act="kj-start" data-mode="read" data-g="' + g + '">📖 読みの練習（10問）</button>';
      h += '<button type="button" class="btn block" data-act="kj-start" data-mode="write" data-g="' + g + '">✍️ 書きの練習（10問）</button>';
      if (wrong) h += '<button type="button" class="btn block" data-act="kj-start" data-mode="retry" data-g="' + g + '">🔁 まちがえた漢字のやり直し（' + wrong + "）</button>";
      h += "</div>";
    }
    h += '<p class="small muted">書きは指で書いて、答えを見て自分で ⭕❌ をつけるよ。読みは 4 つのなかからえらぶよ。</p>';
    return h;
  }
  function startKj(mode, g) {
    g = +g;
    const kind = mode === "read" || mode === "write" ? mode : null;
    const prefer = mode === "retry";
    const n = KJ_PRACTICE_N;
    let qs;
    if (mode === "retry") {
      qs = pickKjQs(g, null, Math.min(20, Math.max(1, kjWrongArr().filter((x) => x.g === g).length || 10)), true);
      if (!qs.length) { toast("やり直しリストはからっぽだよ"); return; }
    } else qs = pickKjQs(g, kind, n, false);
    if (!qs.length) { toast("この学年の漢字データがないよ"); return; }
    qs.forEach((q) => { if (q.kind === "read") q.opts = kjReadOpts(q, g); });
    // れんしゅう：1問 10 点（10問で100点）
    const pt = Math.round(100 / qs.length); qs.forEach((q, i) => { q.pts = i === qs.length - 1 ? 100 - pt * (qs.length - 1) : pt; });
    KJ = { mode, g, qs, i: 0, results: [], revealed: false, self: null, score: 0, coins: 0 };
    Q = { mode: "kj50", s: "ja", g, ui: null, backNav: [{ v: "kj", g }] };
    $("#quiz").hidden = false; document.body.classList.add("in-quiz");
    renderKjQ();
  }
  // 学期・回のテスト（key は "学年|学期|回" か、まとめの "M"）。問題はいつも同じ
  function startKjRound(key) {
    const K = HM.KJT; if (!K || !HM.KANJI_ENT) { toast("漢字のデータが読み込めていないよ"); return; }
    let g = "M", idx = 0, label = "中学のまとめ", range = 70;
    if (key !== "M") {
      const [gg, tm, nn] = String(key).split("|").map(Number), plan = K.plan(gg);
      idx = plan.findIndex((r) => r.t === tm && r.n === nn);
      if (idx < 0) { toast("この回が見つからないよ"); return; }
      g = gg; label = plan[idx].label; range = plan[idx].count;
    }
    const qs = K.questions(g, idx), mid = K.isMid(g);
    if (!qs.length) { toast("この回の問題がまだないよ"); return; }
    qs.forEach((q) => { q.pts = mid ? 0 : 100 / qs.length; });
    KJ = { mode: "round", key, g, label, range, mid, qs, i: 0, results: [], revealed: false, self: null, score: 0, coins: 0 };
    Q = { mode: "kj50", s: "ja", g: g === "M" ? 7 : g, ui: null, backNav: [{ v: "kj", g }] };
    $("#quiz").hidden = false; document.body.classList.add("in-quiz");
    renderKjCover();
  }
  function renderKjCover() {
    const kj = KJ, p = drillPartner(), n = kj.qs.length;
    const w = kj.qs.filter((q) => q.kind === "write").length, r = n - w;
    let h = '<div class="kj-cover"><div class="ct-seal">ほしの学園</div><div class="ct-kicker">漢字テスト</div>';
    h += "<h2>" + esc(kjGName(kj.g)) + (kj.g === "M" ? "" : "　" + esc(kj.label)) + "</h2>";
    h += '<div class="ct-pts"><b>100 点満点</b>';
    if (kj.mid) h += "<span>書き " + w + " 問 → 読み " + r + " 問（全 " + n + " 問）</span><span>100点に換算（1問 約 1.4 点）</span>";
    else h += "<span>書き " + w + " 問（各 2 点）＝ " + w * 2 + " 点</span><span>読み " + r + " 問（各 2 点）＝ " + r * 2 + " 点</span><span>全 " + n + " 問</span>";
    h += "</div>";
    h += '<p class="small">' + (kj.g === "M" ? "中1〜中3の漢字からまんべんなく出るよ。" : "この回の範囲は " + kj.range + " 字。出る漢字はいつも同じだよ。") + "書きは指で書いたあと、答えを見て自分で ⭕❌ をつけるよ。</p>";
    h += '<div class="sum-char">' + charHtml(p.id, 100, "bob r" + p.rarity) + '<div class="bubble">' + n + " 問、いってみよう！</div></div>";
    h += '<div class="sum-act"><button type="button" class="btn primary block" data-kj="go">はじめる</button><button type="button" class="btn ghost block" data-q="quit">もどる</button></div></div>';
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
  }
  function renderKjQ() {
    const kj = KJ, q = kj.qs[kj.i], n = kj.qs.length;
    let h = '<div class="kj50"><div class="ct-bar"><button type="button" class="ct-x" data-q="quit" aria-label="やめる">✕</button><div class="qz-prog"><i style="width:' + Math.round((kj.i / n) * 100) + '%"></i></div><span class="qz-n num">' + (kj.i + 1) + "/" + n + "</span></div>";
    h += '<div class="kj50-body">';
    h += '<div class="kj50-kind">' + (q.kind === "read" ? "読み" : "書き") + "　" + (kj.mode === "round" ? (kj.mid ? "約1.4点" : "2点") : q.pts + "点") + "</div>";
    if (q.kind === "read") {
      h += '<p class="kj50-q">このことばの読みはどれ？</p>';
      h += '<div class="kj50-word">' + esc(q.w.t) + "</div>";
      h += '<div class="ct-opts">';
      (q.opts || []).forEach((o) => {
        const on = kj.pick === o;
        const show = kj.revealed;
        h += '<button type="button" class="ct-opt' + (on ? " on" : "") + (show && o === q.w.r ? " right" : "") + (show && on && o !== q.w.r ? " wrong" : "") + '" data-kj="pick" data-v="' + esc(o) + '">' + esc(o) + "</button>";
      });
      h += "</div>";
      if (!kj.revealed) h += '<button type="button" class="btn primary block" data-kj="lock">こたえる</button>';
      else h += '<div class="kj50-fb">' + (kj.pick === q.w.r ? "⭕ 正解" : "正解は「" + esc(q.w.r) + "」") + '</div><button type="button" class="btn primary block" data-kj="next">次へ</button>';
    } else {
      h += '<p class="kj50-q">□ に入る漢字を、指で書こう</p>';
      h += '<div class="kj50-word">' + kjWordHtml(q.w, true) + "</div>";
      h += '<p class="small muted center">「' + esc(q.w.t) + "（" + esc(q.w.r) + "）」　" + (q.sc ? q.sc + "画" : "") + "</p>";
      h += '<div class="kj-pad kj50-pad"><canvas class="kj-cv" id="kj50-cv"></canvas></div>';
      h += '<div class="kj-tools"><button type="button" class="kj-b" data-kj="undo">↩︎ 1画もどす</button><button type="button" class="kj-b" data-kj="clear">🧽 けす</button></div>';
      if (!kj.revealed) h += '<button type="button" class="btn primary block" data-kj="reveal">答えを見る</button>';
      else {
        h += '<div class="kj50-ans">正解　<span class="kj50-char">' + esc(q.k) + "</span></div>";
        if (kj.self == null) h += '<p class="lead">書けていたかな？ 自分でつけよう</p><div class="actions two"><button type="button" class="btn primary" data-kj="self" data-ok="1">⭕ 書けた</button><button type="button" class="btn" data-kj="self" data-ok="0">❌ ちがう</button></div>';
        else h += '<div class="kj50-fb">' + (kj.self ? "⭕ 書けた" : "❌ やり直しリストに入れるね") + '</div><button type="button" class="btn primary block" data-kj="next">次へ</button>';
      }
    }
    h += "</div></div>";
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (q.kind === "write") mountKjPad();
  }
  function mountKjPad() {
    const cv = $("#kj50-cv"); if (!cv) return;
    const pad = cv.parentElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let strokes = Array.isArray(KJ._strokes) ? KJ._strokes : [], cur = null;
    cv.style.touchAction = "none";
    function size() {
      const r = pad.getBoundingClientRect(), w = Math.max(180, r.width), h = Math.max(180, r.height || w);
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px";
      draw();
    }
    function draw() {
      const ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.scale(dpr, dpr);
      const w = cv.width / dpr, h = cv.height / dpr;
      ctx.fillStyle = "#fffdf7"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(196,30,58,.28)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w / 2, 8); ctx.lineTo(w / 2, h - 8); ctx.moveTo(8, h / 2); ctx.lineTo(w - 8, h / 2); ctx.stroke();
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      strokes.forEach((s) => { if (!s || !s.length || !s[0]) return; ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) if (s[i]) ctx.lineTo(s[i][0], s[i][1]); ctx.stroke(); });
      ctx.restore();
    }
    function pt(e) {
      const r = cv.getBoundingClientRect();
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || e;
      if (!t || t.clientX == null || !r.width || !r.height) return null;
      return [(t.clientX - r.left) * (cv.width / dpr) / r.width, (t.clientY - r.top) * (cv.height / dpr) / r.height];
    }
    const down = (e) => { if (!KJ || KJ.revealed) return; e.preventDefault(); const p = pt(e); if (!p) return; cur = [p]; strokes.push(cur); KJ._strokes = strokes; };
    const move = (e) => { if (!cur) return; e.preventDefault(); const p = pt(e); if (!p) return; cur.push(p); KJ._strokes = strokes; draw(); };
    const up = () => { cur = null; };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    KJ._pad = { undo: () => { strokes.pop(); KJ._strokes = strokes; draw(); }, clear: () => { strokes = []; KJ._strokes = strokes; draw(); }, cleanup: () => { window.removeEventListener("pointerup", up); } };
    size();
  }
  function kjAddWrong(q) {
    const arr = kjWrongArr();
    if (arr.some((x) => x.g === q.g && x.k === q.k && x.kind === q.kind)) return;
    arr.unshift({ g: q.g, k: q.k, kind: q.kind, w: q.w, sc: q.sc, t: now() });
    if (arr.length > 150) arr.length = 150;
  }
  function kjRemoveWrong(q) {
    state.kjWrong = kjWrongArr().filter((x) => !(x.g === q.g && x.k === q.k && x.kind === q.kind));
  }
  function kjCommit(ok) {
    const kj = KJ, q = kj.qs[kj.i];
    kj.results.push({ q, ok });
    if (ok) { kj.score += q.pts; kjRemoveWrong(q); }
    else kjAddWrong(q);
    kj.revealed = false; kj.pick = null; kj.self = null; kj._strokes = null;
    if (kj._pad && kj._pad.cleanup) kj._pad.cleanup();
    kj.i++;
    if (kj.i >= kj.qs.length) renderKjResult();
    else renderKjQ();
  }
  function renderKjResult() {
    const kj = KJ, max = 100, okN = kj.results.filter((r) => r.ok).length;
    if (kj.mode === "round") kj.score = HM.KJT.score(okN, kj.qs.length); // 100点への換算（四捨五入）
    const pct = kj.score, mark = markOf(pct);
    const readQs = kj.qs.filter((q) => q.kind === "read"), writeQs = kj.qs.filter((q) => q.kind === "write");
    const readOk = kj.results.filter((r) => r.q.kind === "read" && r.ok).length;
    const writeOk = kj.results.filter((r) => r.q.kind === "write" && r.ok).length;
    const p = drillPartner();
    const title = kj.mode === "round" ? "漢字テスト　" + kj.label : kj.mode === "retry" ? "やり直し" : (kj.mode === "read" ? "読みの練習" : "書きの練習");
    if (kj.mode === "round") {
      const all = (state.kjTerm = state.kjTerm && typeof state.kjTerm === "object" ? state.kjTerm : {});
      const prev = all[kj.key] || { best: 0 };
      all[kj.key] = { best: Math.max(prev.best || 0, kj.score), last: kj.score, ok: okN, n: kj.qs.length, t: now() };
    }
    const ck = (state.kjCoin = state.kjCoin || {});
    const dayK = kj.g + "|" + (kj.mode === "round" ? "test50" : kj.mode) + "|" + today();
    let coins = 0;
    if (!ck[dayK] && okN) { ck[dayK] = 1; coins = grantQuiet(okN); }
    kj.coins = coins;
    save();
    const line = pct >= 90 ? "花丸！ この調子だよ！" : pct >= 60 ? "いい感じ！ まちがえた字はやり直しリストに入っているよ。" : "だいじょうぶ。やり直しリストから、もう一度書いてみよう！";
    let h = '<div class="ct-result kj-result">';
    if (pct >= 90) h += '<div class="ct-hana' + (pct >= 100 ? " perfect" : "") + '"><span>花丸</span></div>';
    h += '<div class="ct-score-hero"><div class="ct-sh-k">' + esc(title) + "　" + esc(kjGName(kj.g)) + '</div><div class="ct-sh-n"><b>' + kj.score + "</b><small> / " + max + " 点</small></div>" + markLabel(mark, pct) + "</div>";
    h += '<div class="ct-break">';
    if (readQs.length) h += "<div><b>読み</b><span>" + readOk + " / " + readQs.length + " 問</span></div>";
    if (writeQs.length) h += "<div><b>書き</b><span>" + writeOk + " / " + writeQs.length + " 問</span></div>";
    h += "<div><b>正解</b><span>" + okN + " / " + kj.qs.length + " 問</span></div></div>";
    if (kj.mode === "round" && kj.mid) h += '<p class="small muted center">' + okN + " / " + kj.qs.length + " 問 ＝ 100点に換算して " + kj.score + " 点（正解数 ÷ 問題数 × 100、四捨五入）</p>";
    if (coins) h += '<p class="ct-coin">🪙 +' + coins + " コイン（今日このメニューの1回目）</p>";
    h += '<div class="sum-char">' + charHtml(p.id, 100, "bob r" + p.rarity) + '<div class="bubble">' + esc(line) + "</div></div>";
    h += '<div class="sum-act"><button type="button" class="btn primary block" data-kj="again">もう一度</button><button type="button" class="btn ghost block" data-q="quit">もどる</button></div>';
    const miss = kj.results.filter((r) => !r.ok);
    if (miss.length) {
      h += '<div class="sec2">もう一度やりたい漢字</div><div class="kj-miss">';
      miss.forEach((r) => { h += '<span class="kj-m">' + esc(r.q.k) + "<small>" + (r.q.kind === "read" ? "読み" : "書き") + "</small></span>"; });
      h += "</div>";
    }
    h += "</div>";
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (pct >= 90) { confetti(pct >= 100 ? 80 : 50); sound("fanfare"); } else if (kj.score) sound("soft");
  }
  function handleKj(act, el) {
    if (!KJ) return false;
    if (act === "go") { renderKjQ(); return true; }
    if (act === "pick") { if (KJ.revealed) return true; KJ.pick = el.dataset.v; renderKjQ(); return true; }
    if (act === "lock") { if (!KJ.pick) { toast("読みをえらんでね"); return true; } KJ.revealed = true; renderKjQ(); return true; }
    if (act === "reveal") { KJ.revealed = true; renderKjQ(); return true; }
    if (act === "self") { KJ.self = el.dataset.ok === "1"; renderKjQ(); return true; }
    if (act === "next") {
      const q = KJ.qs[KJ.i];
      if (q.kind === "read") kjCommit(KJ.pick === q.w.r);
      else kjCommit(!!KJ.self);
      return true;
    }
    if (act === "undo") { if (KJ._pad) KJ._pad.undo(); return true; }
    if (act === "clear") { if (KJ._pad) KJ._pad.clear(); return true; }
    if (act === "again") { if (KJ.mode === "round") startKjRound(KJ.key); else startKj(KJ.mode, KJ.g); return true; }
    return false;
  }

  function colorCardSub() {
    const g = prepGrade() >= 7 ? prepGrade() : 7;
    const recs = Object.values(state.colorTests || {});
    if (recs.length) { const b = recs.slice().sort((a, b) => (b.t || 0) - (a.t || 0))[0]; return "ベスト " + Math.max.apply(null, recs.map((r) => r.best || 0)) + "点"; }
    return "中学の単元　100点満点";
  }
  function kjCardSub() {
    const g = kjGrade(), b = kjBestAny(g);
    return b != null ? gradeName(g) + " ベスト " + b + "点" : gradeName(g) + "　学期ごとのテスト";
  }
  function homeDrillHtml() {
    return '<button type="button" class="drill-card exam" data-act="mode-exam"><span class="mc-ico">📝</span><b>定期テスト</b><small>' + esc(examCardSub()) + "</small></button>" +
      '<div class="drill2">' +
      '<button type="button" class="drill-card color" data-act="mode-color"><span class="mc-ico">🖍️</span><b>カラーテスト</b><small>' + esc(colorCardSub()) + "</small></button>" +
      '<button type="button" class="drill-card kj" data-act="mode-kj"><span class="mc-ico">🈶</span><b>漢字テスト</b><small>' + esc(kjCardSub()) + "</small></button>" +
      "</div>";
  }

  // 勉強タブ
  function viewStudy() {
    const top = nav[nav.length - 1];
    if (!top) {
      return { title: "学ぶ", html: (state.wrongBox && state.wrongBox.length ? '<button type="button" class="box-card" data-act="box"><span class="bx-i">📦</span><span class="grow"><b>まちがえた問題ボックス</b><small>' + state.wrongBox.length + " 問 ・ 正解すると消えるよ</small></span><span class=\"go\">▶</span></button>" : "") + '<p class="lead">教科をえらぼう</p><div class="subj-grid">' + SUBJ.map((s) => { const gs = gradesOf(s.id); return '<button type="button" class="subj" data-subj="' + s.id + '" style="--sc:' + s.c + '"><span class="se">' + HMIcons.icon(s.id, s.c, 54) + "</span><b>" + esc(s.n) + '</b><small>' + (gs.length ? gradeName(gs[0]) + "〜" + gradeName(gs[gs.length - 1]) : "") + "</small></button>"; }).join("") + "</div>" };
    }
    if (top.v === "grades") {
      const s = subjById(top.s);
      return { title: s.n, html: '<p class="lead">学年をえらぼう</p><div class="grade-grid">' + gradesOf(top.s).map((g) => { const us = S()[top.s][g]; let d = 0, t = 0; us.forEach((u, ui) => { const r = unitStats(top.s, g, ui); d += r.done; t += r.total; }); return '<button type="button" class="grade" data-grade="' + g + '" style="--sc:' + s.c + '"><b>' + gradeName(g) + "</b>" + (g === state.settings.grade ? '<span class="my-g">じぶんの学年</span>' : "") + "<small>" + esc(subjName(top.s, g)) + "</small>" + bar(d, t) + "</button>"; }).join("") + "</div>" };
    }
    if (top.v === "units") {
      const us = S()[top.s][top.g];
      return { title: subjName(top.s, top.g) + " " + gradeName(top.g), html: '<div class="units-page"><p class="lead">単元をえらぼう</p>' + markLegend() + '<div class="list">' + us.map((u, ui) => { const r = unitStats(top.s, top.g, ui); const mk = unitRecord(top.s, top.g, ui); const ct = top.g >= 7 ? colorRec(top.s, top.g, u.n) : null; return '<button type="button" class="row-btn unit-row" data-unit="' + ui + '"><span class="un">' + (ui + 1) + '</span><span class="grow"><b>' + esc(u.n) + '</b><span class="small muted">' + r.total + "ステップ ・ 合格 " + r.done + (ct ? " ・ テスト " + ct.best + "点" : "") + "</span>" + bar(r.done, r.total) + "</span>" + markLabel(mk.mark, mk.pct) + "</button>"; }).join("") + "</div></div>" };
    }
    if (top.v === "steps") {
      const u = S()[top.s][top.g][top.u], tk = dayRec(today()).steps, sb = subjById(top.s);
      const n = u.steps.length, info = u.steps.map((st, si) => { const k = stepKey(top.s, top.g, top.u, si), p = state.progress[k]; return { st, si, p, star: !!tk[k], done: !!(p && p.passed) }; });
      let cur = info.findIndex((x) => !x.done); const allDone = cur < 0;
      const X = [50, 76, 50, 24], GAP = 108, H = (n + 1) * GAP + 90, bk = "boss|" + top.s + "|" + top.g + "|" + u.n, won = !!(state.bossWins || {})[bk];
      const pos = (i) => [X[i % 4], 70 + i * GAP];
      let path = "", pathDone = "";
      for (let i = 0; i < n; i++) { const [x1, y1] = pos(i), [x2, y2] = pos(i + 1); const seg = "M" + x1 + " " + y1 + " C" + x1 + " " + (y1 + GAP / 2) + " " + x2 + " " + (y2 - GAP / 2) + " " + x2 + " " + y2 + " "; path += seg; if (info[i].done && (i + 1 >= n || info[i + 1].done || i + 1 === cur)) pathDone += seg; }
      const done = info.filter((x) => x.done).length;
      let h = '<div class="map-head" style="--sc:' + sb.c + '">' + HMIcons.icon(top.s, sb.c, 40) + '<div class="grow"><small>' + esc(subjName(top.s, top.g) + " " + gradeName(top.g)) + "</small><b>" + esc(u.n) + '</b>' + bar(done, n) + '</div><span class="map-cnt num">' + done + "/" + n + "</span></div>";
      h += '<div class="smap" style="height:' + H + "px;--sc:" + sb.c + '"><svg class="smap-path" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none"><path d="' + path + '" class="sp-all"/><path d="' + pathDone + '" class="sp-done"/></svg>';
      info.forEach((x) => { const [px, py] = pos(x.si); const isCur = x.si === cur; h += '<button type="button" class="map-node step ' + (x.done ? "done " : "") + (isCur ? "cur " : "") + (x.star ? "star" : "") + '" data-step="' + x.si + '" style="left:' + px + "%;top:" + py + 'px"><span class="mn-c">' + (x.star ? "⭐" : x.done ? "✓" : x.si + 1) + '</span><span class="mn-l"><b>' + SNH(x.st.n) + "</b><small>" + stepQCount(x.st) + "問" + (x.p ? " ・ ベスト " + x.p.best + "/" + x.p.n : "") + "</small></span>" + (isCur ? '<span class="mn-here">' + charHtml(state.partner, 40) + "</span>" : "") + "</button>"; });
      const [bx, by] = pos(n);
      h += '<button type="button" class="map-node boss ' + (won ? "won " : "") + (allDone ? "cur" : "") + '" data-boss="1" style="left:' + bx + "%;top:" + by + 'px"><span class="mn-c">' + bossSvg(bossLook(top.s, top.g, top.u), 58) + (won ? '<i class="mn-crown">👑</i>' : "") + '</span><span class="mn-l"><b>ボスバトル</b><small>' + (won ? "クリア！ もう一度も OK" : "単元のまとめ問題") + "</small></span></button>";
      h += "</div>";
      if (top.g >= 7) {
        const ct = colorRec(top.s, top.g, u.n);
        h += '<button type="button" class="box-card ct-enter" data-act="ct-start" data-s="' + top.s + '" data-g="' + top.g + '" data-ui="' + top.u + '"><span class="bx-i">🖍️</span><span class="grow"><b>カラーテスト（100点満点）</b><small>' + (ct ? "ベスト " + ct.best + " 点 " + markIcon(markOf(ct.best)) : "おもて 10問・うら 5問") + "</small></span><span class=\"go\">▶</span></button>";
      }
      if ((state.wrongBox || []).length) h += '<button type="button" class="box-card" data-act="box"><span class="bx-i">📦</span><span class="grow"><b>まちがえた問題ボックス</b><small>' + state.wrongBox.length + " 問 ・ 正解すると消えるよ</small></span><span class=\"go\">▶</span></button>";
      return { title: u.n, html: h };
    }
    return { title: "学ぶ", html: "" };
  }
  const bar = (d, t) => '<span class="pbar"><i style="width:' + (t ? Math.round((d / t) * 100) : 0) + '%"></i></span>';

  // ---------- クイズ ----------
  let Q = null, onAnswered = null;
  function startStep(s, g, ui, si, opt = {}) {
    const f = findStep(s, g, ui, si); if (!f) return;
    let qs;
    try { qs = HM.makeSet(f.step); } catch (e) { toast("問題を作れませんでした"); return; }
    if (!qs.length) return;
    Q = { s, g, ui, si, key: stepKey(s, g, ui, si), unit: f.unit, step: f.step, qs, i: 0, mode: "main", results: [], baseCorrect: 0, retryCorrect: 0, need: HM.passNeed(qs.length), n: qs.length, starGiven: false, shownAt: 0, answered: false, passOpen: true, combo: 0 };
    state.last = { s, g, u: ui, st: si, un: f.unit.n, sn: f.step.n }; save();
    $("#quiz").hidden = false; document.body.classList.add("in-quiz");
    if (opt.noCard) showQ(); else showCard();
  }
  function curList() { return Q.mode === "retry" ? Q.retry : Q.qs; }
  function showQ() {
    if (window.HMQ) HMQ.leave();
    Q.work = null;
    const list = curList(), q = list[Q.i];
    Q.answered = false; Q.input = "";
    const total = list.length;
    let h = '<div class="qz-head"><button type="button" class="qz-x" data-q="quit" aria-label="やめる">✕</button><div class="qz-prog"><i style="width:' + Math.round((Q.i / total) * 100) + '%"></i></div><span class="qz-n num">' + (Q.i + 1) + "/" + total + "</span></div>";
    h += comboHtml();
    h += '<div class="qz-body">';
    if (Q.mode === "boss") h += bossHtml();
    const src = q.__src || { s: Q.s, g: Q.g, sn: Q.step.n };
    h += '<div class="qz-meta">' + esc(subjName(src.s, src.g) + " " + gradeName(src.g) + " ／ " + SN(src.sn)) + (Q.mode === "retry" ? ' <span class="retry-tag">やり直し</span>' : Q.mode === "box" ? ' <span class="retry-tag box">📦 ボックス</span>' : Q.mode === "boss" ? ' <span class="retry-tag boss">👾 ボス</span>' : Q.mode === "mock" ? ' <span class="retry-tag mock">📝 模擬テスト</span>' : "") + (q.skill && window.HMQ && HMQ.skillBadge ? " " + HMQ.skillBadge(q) : "") + "</div>";
    if (q.pass) h += '<details class="passage"' + (Q.passOpen ? " open" : "") + '><summary>📄 文章を読む</summary><div class="ptext">' + esc(q.pass).replace(/\n/g, "<br>") + "</div></details>";
    const say = sayText(q);
    if (q.listen) h += '<div class="qz-q">' + q.q + "</div>" + (canSpeak() ? '<button type="button" class="say-big" data-q="say"><span>🔊</span><b>タップして聞こう</b><small>何回でも聞けるよ</small></button>' : '<div class="say-text">' + esc(say) + "</div>");
    else h += '<div class="qz-q">' + fracHtml(q.q) + (say && canSpeak() ? ' <button type="button" class="say-btn" data-q="say" aria-label="英語を聞く">🔊</button>' : "") + "</div>";
    Q.hintN = 0;
    if (state.settings.hint !== false && hintsFor(q).length) h += '<div class="hint-row"><button type="button" class="hint-btn" data-q="hint">💡 ヒント</button></div><div class="hint-box" id="hint-box"></div>';
    if (q.t === "ch") h += '<div class="opts">' + (q.opts || [q.a].concat(q.o)).map((o, i) => '<button type="button" class="opt" data-opt="' + i + '">' + fracHtml(esc(o)) + "</button>").join("") + "</div>";
    else if (q.t === "ord" || q.t === "match" || q.t === "pair" || q.t === "tap") h += workHtml(q);
    else if (window.HMQ && HMQ.has(q.t)) { Q.work = { plugin: true }; h += HMQ.html(q); }
    else h += '<div class="num-in"><div class="ans-box" id="ans-box"><span id="ans-val" class="num"></span><span class="caret"></span>' + (q.unit ? '<span class="ans-unit">' + esc(q.unit) + "</span>" : "") + "</div>" + keypad(q) + "</div>";
    h += '</div><div class="qz-foot" id="qz-foot"></div>';
    const el = $("#quiz");
    el.innerHTML = h;
    el.scrollTop = 0;
    Q.shownAt = performance.now();
    // 計算メモ：問題が変わるたびに自動でクリア（算数・数学と、数字の出る理科で表示）
    if (window.HMMemo) {
      HMMemo.onQuestion(src.s, q);
      if (!showQ.mo) { showQ.mo = new MutationObserver(() => { if (el.hidden || !el.querySelector(".qz-body")) HMMemo.off(); }); showQ.mo.observe(el, { childList: true, attributes: true, attributeFilter: ["hidden"] }); }
    }
    const pd = $(".passage", el); if (pd) pd.addEventListener("toggle", () => (Q.passOpen = pd.open));
    if (Q.work && Q.work.plugin) HMQ.mount(q, el, { ready: (on) => { const b = $("#work-ok"); if (b) b.disabled = !on || Q.answered; }, answer: (g) => answer(g), sound, toast: (m) => toast(esc(m)), haptic });
    else if (Q.work) renderWork();
  }
  // ---------- ヒント（3段階まで。答えそのものは出さない） ----------
  const HINT_TYPE = {
    tf: "文の中の、ことば・数・条件を1つずつたしかめよう。1か所でもちがえば ×。",
    sort: "1つずつ「どちらのなかまかな？」と考えて、自信のあるものから入れよう。",
    multi: "選択肢を1つずつ読んで、正しいものだけをえらぼう。1つとはかぎらないよ。",
    tiles: "文の初めにくることば（主語）を先に見つけよう。",
    nl: "目もり1つ分がいくつかを、先に数えよう。",
    kanji: "部首（へん・つくり）と、画の順番を思い出そう。",
    ord: "いちばん最初になるものを先に見つけよう。",
    match: "自信のあるペアからつないで、のこりをへらそう。",
    pair: "同じ意味・同じ答えになるカードをさがそう。",
    tap: "図の中の印（直角マーク・同じ長さの印・数字）をよく見よう。",
    tl: "まず主語（だれが）を見つけて、次に動詞（何をする）をならべよう。",
    ty: "主語と動詞を先に書いてから、残りの語をつづけよう。文の最初は大文字にするよ。",
    sp: "🐢 ゆっくりのお手本を聞いて、まねしてから 🎤 をタップしよう。",
    mc: "英文の中の、主語・動詞・時を表す語に注目しよう。",
  };
  function hintsFor(q) {
    if (q.__hints) return q.__hints;
    const out = [], ans = String(q.a == null ? "" : q.a).replace(/[{}]/g, "");
    const leaks = (x) => { const y = x.replace(/[{}]/g, ""); if (ans && y.includes(ans)) return true; if (/^-?[\d.]+$/.test(ans)) return new RegExp("(^|[^\\d.])" + ans.replace(/[.]/g, "\\.") + "($|[^\\d.])").test(y); return false; };
    if (HINT_TYPE[q.t]) out.push(HINT_TYPE[q.t]);
    else if (/<svg/.test(q.q || "")) out.push("図の数字や印（直角マーク・同じ長さの印・目もり）に注目しよう。");
    else if (q.t === "num" || q.t === "input" || (!q.t && !q.o)) out.push("わかっている数と、聞かれていることを書き出してから計算しよう。");
    else out.push("問題文のキーワードに注目して、ちがう選択肢から消していこう。");
    // リスニングは、聞く英文・会話をヒントに出さない（答えるまでかくす）
    if (q.skill === "L") { out.length = 0; out.push(q.dlg ? "だれが話しているかに注意して、質問に出てくる人の話をよく聞こう。" : "主語（だれが）と動詞（何をする）に注意して聞こう。", "🐢 ゆっくりで、もう一度聞いてみよう。"); q.__hints = out; return out; }
    const sent = String(q.ex || "").replace(/([。．！？\n])/g, "$1\u0001").split("\u0001").map((x) => x.trim()).filter((x) => x.length > 4 && !leaks(x));
    if (sent.length) out.push(sent[0]);
    if (q.t === "ch" && (q.opts || q.o || []).length >= 3) out.push("__elim");
    else if (sent.length > 1) out.push(sent[1]);
    q.__hints = out.slice(0, 3);
    return q.__hints;
  }
  function showHint() {
    const q = curList()[Q.i], hs = hintsFor(q); if (Q.answered || Q.hintN >= hs.length) return;
    const hv = hs[Q.hintN++], box = $("#hint-box"); if (!box) return;
    if (hv === "__elim") {
      const opts = q.opts || [q.a].concat(q.o); let n = 0;
      $$(".opt").forEach((b) => { if (n < Math.max(1, opts.length - 2) && opts[+b.dataset.opt] !== q.a && !b.disabled) { b.disabled = true; b.classList.add("elim"); n++; } });
      box.insertAdjacentHTML("beforeend", '<div class="hint-i"><b>ヒント' + Q.hintN + "</b>ちがう答えを" + n + "つ消したよ。</div>");
    } else box.insertAdjacentHTML("beforeend", '<div class="hint-i"><b>ヒント' + Q.hintN + "</b>" + fracHtml(esc(hv)) + "</div>");
    const b = $(".hint-btn"); if (b) { if (Q.hintN >= hs.length) { b.disabled = true; b.textContent = "💡 ヒントはここまで"; } else b.textContent = "💡 もう1つヒント（" + Q.hintN + "/" + hs.length + "）"; }
    sound("tap");
  }
  // ---------- 新しい問題形式（並べかえ・線でつなぐ・カード合わせ・図をタップ） ----------
  const PAIR_COL = ["#ff6b6b", "#4dabf7", "#51cf66", "#fcc419", "#cc5de8", "#ff922b"];
  const rshuf = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function workHtml(q) {
    Q.work = null;
    if (q.t === "tap") return '<div class="tapfig">' + q.svg + '</div><p class="small muted center">図の中をタップしてこたえよう</p>';
    const n = q.t === "ord" ? q.items.length : q.pairs.length;
    let order = rshuf([...Array(n).keys()]); if (n > 1) for (let k = 0; k < 6 && order.every((v, i) => v === i); k++) order = rshuf(order);
    if (q.t === "ord") Q.work = { pick: [], pool: order };
    else if (q.t === "match") Q.work = { right: order, sel: null, link: {} };
    else { const cards = rshuf([...Array(n).keys()].flatMap((i) => [[i, 0], [i, 1]])); Q.work = { cards, sel: null, mate: {} }; }
    const hint = q.t === "ord" ? "タップした順にならぶよ（もう一度タップでもどす）" : q.t === "match" ? "左→右の順にタップして線でつなごう" : "同じ組になるカードを2まいずつタップしよう";
    return '<div class="work work-' + q.t + (q.big ? " big-l" : "") + '" id="work"></div><p class="small muted center">' + hint + '</p><button type="button" class="btn primary block" data-q="submit" id="work-ok" disabled>こたえる</button>';
  }
  // 問題文の {3/4}・{1と2/3} を、たての分数で見せる
  function fracHtml(t) { return String(t).replace(/\{(-?\d+)と(\d+)\/(\d+)\}/g, '$1<span class="frac"><span>$2</span><span>$3</span></span>').replace(/\{(-?)(\d+)\/(\d+)\}/g, '$1<span class="frac"><span>$2</span><span>$3</span></span>'); }
  function workDone() { const w = Q.work, q = curList()[Q.i]; if (!w) return false; if (w.plugin) return HMQ.done(q); if (q.t === "ord") return w.pick.length === q.items.length; if (q.t === "match") return Object.keys(w.link).length === q.pairs.length; return Object.keys(w.mate).length === w.cards.length; }
  function renderWork() {
    const q = curList()[Q.i], w = Q.work, box = $("#work"); if (!box || !w) return;
    let h = "";
    if (q.t === "ord") {
      h += '<div class="ord-slots">' + q.items.map((_, k) => { const i = w.pick[k]; return '<button type="button" class="ord-slot ' + (i != null ? "on" : "") + '" data-os="' + k + '"><span class="ord-n">' + (k + 1) + "</span>" + (i != null ? esc(q.items[i]) : "") + "</button>"; }).join("") + "</div>";
      h += '<div class="ord-pool">' + w.pool.map((i) => w.pick.includes(i) ? '<span class="ord-chip ghost"></span>' : '<button type="button" class="ord-chip" data-ow="' + i + '">' + esc(q.items[i]) + "</button>").join("") + "</div>";
    } else if (q.t === "match") {
      const used = new Set(Object.values(w.link));
      h += '<div class="mt-cols"><div class="mt-col">' + q.pairs.map((p, i) => '<button type="button" class="mt-item L ' + (w.sel === i ? "sel " : "") + (w.link[i] != null ? "on" : "") + '" data-ml="' + i + '" style="--pc:' + (w.link[i] != null ? PAIR_COL[i % 6] : "transparent") + '">' + esc(p[0]) + "</button>").join("") + '</div><div class="mt-col">' + w.right.map((j) => { const li = Object.keys(w.link).find((k) => w.link[k] === j); return '<button type="button" class="mt-item R ' + (used.has(j) ? "on" : "") + '" data-mr="' + j + '" style="--pc:' + (li != null ? PAIR_COL[li % 6] : "transparent") + '">' + esc(q.pairs[j][1]) + "</button>"; }).join("") + '</div><svg class="mt-lines" id="mt-lines"></svg></div>';
    } else {
      h += '<div class="pc-grid">' + w.cards.map((c, k) => { const m = w.mate[k]; const g = m != null ? Math.min(k, m) : null; const gi = g != null ? Object.keys(w.mate).map(Number).filter((x) => x < w.mate[x]).sort((a, b) => a - b).indexOf(g) : -1; return '<button type="button" class="pc-card ' + (w.sel === k ? "sel " : "") + (m != null ? "on" : "") + '" data-pc="' + k + '" style="--pc:' + (gi >= 0 ? PAIR_COL[gi % 6] : "transparent") + '">' + esc(q.pairs[c[0]][c[1]]) + "</button>"; }).join("") + "</div>";
    }
    box.innerHTML = h;
    if (q.t === "match") drawLinks();
    const ok = $("#work-ok"); if (ok) ok.disabled = !workDone() || Q.answered;
  }
  function drawLinks(result) {
    const svg = $("#mt-lines"), w = Q.work; if (!svg) return; const r0 = svg.getBoundingClientRect(); let h = "";
    for (const [i, j] of Object.entries(w.link)) { const a = $('[data-ml="' + i + '"]').getBoundingClientRect(), b = $('[data-mr="' + j + '"]').getBoundingClientRect(); const col = result ? (+i === j ? "#2fb36a" : "#e5383b") : PAIR_COL[i % 6]; h += '<line x1="' + (a.right - r0.left) + '" y1="' + (a.top + a.height / 2 - r0.top) + '" x2="' + (b.left - r0.left) + '" y2="' + (b.top + b.height / 2 - r0.top) + '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/>'; }
    svg.innerHTML = h;
  }
  function workClick(t) {
    if (!Q || !Q.work || Q.answered || Q.mode === "color" || Q.mode === "kj50") return false;
    const list = curList(); if (!list || Q.i == null) return false;
    const q = list[Q.i], w = Q.work; if (!q) return false;
    let e;
    if ((e = t.closest("[data-ow]"))) { w.pick.push(+e.dataset.ow); sound("tap"); }
    else if ((e = t.closest("[data-os]"))) { const k = +e.dataset.os; if (w.pick[k] == null) return true; w.pick.splice(k, 1); }
    else if ((e = t.closest("[data-ml]"))) { const i = +e.dataset.ml; if (w.link[i] != null) { delete w.link[i]; w.sel = null; } else w.sel = w.sel === i ? null : i; }
    else if ((e = t.closest("[data-mr]"))) { const j = +e.dataset.mr; const owner = Object.keys(w.link).find((k) => w.link[k] === j); if (owner != null) delete w.link[owner]; else if (w.sel != null) { w.link[w.sel] = j; w.sel = null; sound("tap"); } else { toast("先に左をえらんでね"); return true; } }
    else if ((e = t.closest("[data-pc]"))) { const k = +e.dataset.pc; if (w.mate[k] != null) { const m = w.mate[k]; delete w.mate[k]; delete w.mate[m]; w.sel = null; } else if (w.sel == null) w.sel = k; else if (w.sel === k) w.sel = null; else { w.mate[k] = w.sel; w.mate[w.sel] = k; w.sel = null; sound("tap"); } }
    else return false;
    renderWork(); return true;
  }
  function workResult() {
    const q = curList()[Q.i], w = Q.work;
    if (w && w.plugin) return HMQ.result(q);
    if (q.t === "ord") { const text = w.pick.map((i) => q.items[i]).join(" → "); return { ok: text === q.items.join(" → "), text }; }
    if (q.t === "match") { const ok = q.pairs.every((_, i) => w.link[i] === i); return { ok, text: q.pairs.map((p, i) => p[0] + "－" + (w.link[i] != null ? q.pairs[w.link[i]][1] : "？")).join("、") }; }
    const ok = w.cards.every((c, k) => w.cards[w.mate[k]][0] === c[0]); return { ok, text: Object.keys(w.mate).map(Number).filter((k) => k < w.mate[k]).map((k) => q.pairs[w.cards[k][0]][w.cards[k][1]] + "－" + q.pairs[w.cards[w.mate[k]][0]][w.cards[w.mate[k]][1]]).join("、") };
  }
  function workShowResult(q, given) {
    const box = $("#work");
    if (Q.work && Q.work.plugin) { HMQ.show(q); return; }
    if (q.t === "tap") { $$("[data-hit]").forEach((el) => { if (el.dataset.hit === q.ans) el.classList.add("hit-ok"); else if (el.dataset.hit === given) el.classList.add("hit-ng"); }); return; }
    if (!box) return; box.classList.add("done");
    if (q.t === "ord") $$(".ord-slot").forEach((el, k) => el.classList.add(q.items[Q.work.pick[k]] === q.items[k] ? "right" : "wrong"));
    if (q.t === "match") { $$(".mt-item.L").forEach((el) => { const i = +el.dataset.ml; el.classList.add(Q.work.link[i] === i ? "right" : "wrong"); }); drawLinks(true); }
    if (q.t === "pair") $$(".pc-card").forEach((el) => { const k = +el.dataset.pc, c = Q.work.cards[k]; el.classList.add(Q.work.cards[Q.work.mate[k]][0] === c[0] ? "right" : "wrong"); });
    const ok = $("#work-ok"); if (ok) ok.hidden = true;
  }
  function keypad(q) {
    const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "/"];
    let h = '<div class="keypad">' + keys.map((k) => '<button type="button" class="key" data-key="' + k + '">' + (k === "/" ? "分数 /" : k) + "</button>").join("");
    h += '<button type="button" class="key" data-key="-">−</button><button type="button" class="key" data-key="del">⌫</button><button type="button" class="key ok" data-key="ok">こたえる</button></div>';
    if (/\//.test(q.a) || q.frac) h += '<p class="small muted center">分数は「3/4」のように入れてね（3 → 分数 / → 4）。</p>';
    return h;
  }
  function norm(s) { return String(s).trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[−ー－]/g, "-").replace(/／/g, "/").replace(/．/g, ".").replace(/\s+/g, ""); }
  function fracVal(s) { const m = /^(-?)(\d+)\/(\d+)$/.exec(s); if (!m || +m[3] === 0) return null; return (m[1] ? -1 : 1) * (+m[2] / +m[3]); }
  // 数の答えの判定：文字が同じ、または小数として同じ値（0.50 と 0.5）
  function judgeNum(input, a) {
    const x = norm(input), y = norm(a);
    if (!x) return { empty: true };
    if (x === y) return { ok: true };
    if (/^-?\d+(\.\d+)?$/.test(x) && /^-?\d+(\.\d+)?$/.test(y) && Math.abs(parseFloat(x) - parseFloat(y)) < 1e-9) return { ok: true };
    const fx = fracVal(x), fy = /\//.test(y) ? fracVal(y) : /^-?\d+(\.\d+)?$/.test(y) ? parseFloat(y) : null;
    if (fx != null && fy != null && Math.abs(fx - fy) < 1e-9) return { reduce: true };
    return { ok: false };
  }
  function tooFast() {
    if (performance.now() - Q.shownAt < READ_MS) { toast("📖 ちゃんと読んでね"); sound("block"); haptic(30); const b = $(".qz-q"); if (b) { b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); } return true; }
    return false;
  }
  // v1.6 スピーキングの「あとで話す」：まちがいにしない（その問題は数に入れない）
  function skipQ(q) {
    Q.answered = true; Q.skipped = (Q.skipped || 0) + 1; logUse(q.s || Q.s, false, performance.now() - Q.shownAt, false);
    if (Q.mode === "main") { Q.n = Math.max(1, Q.n - 1); Q.need = HM.passNeed(Q.n); Q.results.push({ q, ok: false, skip: true, given: "あとで話す" }); }
    else if (Q.mode === "retry") Q.retryRes.push({ q, ok: false, skip: true, given: "あとで話す" });
    workShowResult(q, null);
    let f = '<div class="fb skip"><div class="fb-h">⏭ あとで話そう</div><div class="fb-a">お手本：<b>' + esc(q.a) + "</b></div>";
    f += '<div class="fb-ex"><b>解説</b><p>' + esc(q.ex || "") + "</p></div>";
    f += '<div class="fb-act"><button type="button" class="link-btn" data-q="report">この問題おかしい？</button><button type="button" class="btn primary" data-q="next">次へ ›</button></div></div>';
    $("#qz-foot").innerHTML = f;
    const nb = $('[data-q="next"]'); if (nb) setTimeout(() => nb.focus && nb.focus({ preventScroll: true }), 50);
  }
  function answer(given) {
    const q = curList()[Q.i];
    if (Q.answered) return;
    if (given && given.skip) return skipQ(q);
    if (q.t !== "sp" && tooFast()) return;
    let ok, gtext = given;
    if (q.t === "ch") ok = given === q.a;
    else if (q.t === "tap") { ok = given === q.ans; const hl = (q.hits || []).find((x) => x[0] === given); gtext = hl ? hl[1] : given; }
    else if (given && typeof given === "object") { ok = given.ok; gtext = given.text; }
    else {
      const j = judgeNum(given, q.a);
      if (j.empty) { toast("答えを入れてね"); return; }
      if (j.reduce) { toast("おしい！ 値は同じだよ。答えの形（約分など）を見直してね"); return; }
      ok = j.ok;
    }
    Q.answered = true;
    logUse(q.s || Q.s, ok, performance.now() - Q.shownAt, true);
    if (Q.mode !== "retry") Q.results.push({ q, ok, given: gtext });
    else if (Q.mode === "retry") { Q.retryRes.push({ q, ok, given: gtext }); if (ok) Q.retryCorrect++; }
    afterAnswer(q, ok);
    if (typeof onAnswered === "function") onAnswered(q, ok);
    if (ok && (Q.mode === "main" || Q.mode === "mock")) Q.baseCorrect++;
    // 画面
    if (q.t === "ch") $$(".opt").forEach((b) => { const v = (q.opts || [q.a].concat(q.o))[+b.dataset.opt]; b.disabled = true; if (v === q.a) b.classList.add("right"); else if (v === given) b.classList.add("wrong"); });
    else if (q.t === "num") { const box = $("#ans-box"); box.classList.add(ok ? "right" : "wrong"); $$(".key").forEach((k) => (k.disabled = true)); }
    else workShowResult(q, given);
    if (ok) { bigMaru(); burstAt(innerWidth / 2, innerHeight * 0.42, 22); sound("pikon"); haptic(15); if (Q.mode === "boss") setTimeout(bossHit, 280); comboFx(); } else { sound("miss"); haptic([20, 40, 20]); }
    const cg = $("#combo"); if (cg) cg.outerHTML = comboHtml();
    let f = '<div class="fb ' + (ok ? "ok" : "ng") + '">';
    f += ok ? '<div class="fb-h">⭕ 正解！</div>' : '<div class="fb-h">✖ ざんねん</div><div class="fb-a">正解：<b>' + fracHtml(esc(q.a)) + (q.unit && q.t !== "ch" ? esc(q.unit) : "") + "</b></div>";
    const ex = '<div class="fb-ex"><b>解説</b><p>' + fracHtml(esc(q.ex || "")).replace(/\n/g, "<br>") + "</p></div>";
    f += ok ? '<button type="button" class="btn sm ghost" data-q="ex">💡 解説を見る</button><div class="ex-wrap" hidden>' + ex + "</div>" : ex;
    f += '<div class="fb-act"><button type="button" class="link-btn" data-q="report">この問題おかしい？</button><button type="button" class="btn primary" data-q="next">次へ ›</button></div></div>';
    $("#qz-foot").innerHTML = f;
    // 再挑戦中に6割に届いたら、その場で⭐
    if (Q.mode === "retry" && !Q.starGiven && Q.baseCorrect + Q.retryCorrect >= Q.need) { giveStar(); setTimeout(() => celebrateStar(true), 450); }
    const nb = $('[data-q="next"]'); if (nb) setTimeout(() => nb.focus && nb.focus({ preventScroll: true }), 50);
  }
  function bigMaru() {
    const fx = $("#fx-root"), d = document.createElement("div");
    d.className = "big-maru m-" + state.look.maru;
    d.innerHTML = maruSvg(state.look.maru);
    fx.appendChild(d); setTimeout(() => d.remove(), 900);
  }
  function burstAt(x, y, n) {
    const cols = ["#ff5fa2", "#ffd43b", "#22d3ee", "#8b5cf6", "#51cf66", "#ff922b"];
    for (let i = 0; i < (n || 18); i++) { const p = document.createElement("span"); p.className = "maru-burst"; const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 110; p.style.left = x + "px"; p.style.top = y + "px"; p.style.background = cols[i % cols.length]; p.style.setProperty("--dx", (Math.cos(a) * r).toFixed(0) + "px"); p.style.setProperty("--dy", (Math.sin(a) * r).toFixed(0) + "px"); document.body.appendChild(p); setTimeout(() => p.remove(), 750); }
  }
  function confetti(n) {
    const cols = ["#ff5fa2", "#ffd43b", "#22d3ee", "#8b5cf6", "#51cf66", "#ff922b"];
    for (let i = 0; i < (n || 60); i++) { const p = document.createElement("span"); p.className = "confetti-p"; p.style.left = Math.random() * 100 + "vw"; p.style.background = cols[i % cols.length]; p.style.animationDuration = (1.6 + Math.random() * 1.4).toFixed(2) + "s"; p.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s"; p.style.setProperty("--dx", (Math.random() * 120 - 60).toFixed(0) + "px"); p.style.setProperty("--rot", (Math.random() * 900 - 450).toFixed(0) + "deg"); document.body.appendChild(p); setTimeout(() => p.remove(), 3600); }
  }
  function maruSvg(id) {
    const col = { red: "#e5383b", blue: "#2f7fd8", star: "#e5383b", hanamaru: "#e5383b", rainbow: "url(#rg)", gold: "url(#gg)", myth: "url(#mg)" }[id] || "#e5383b";
    let x = '<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5f6d"/><stop offset=".25" stop-color="#ffc371"/><stop offset=".5" stop-color="#5ee07a"/><stop offset=".75" stop-color="#4facfe"/><stop offset="1" stop-color="#b06ab3"/></linearGradient><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#e0b030"/><stop offset="1" stop-color="#a87a10"/></linearGradient><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ad9"/><stop offset=".5" stop-color="#7a5cff"/><stop offset="1" stop-color="#36d1dc"/></linearGradient></defs>';
    if (id === "hanamaru") { x += '<path d="M100 30 C150 26 176 66 168 104 C160 150 110 170 70 156 C30 140 22 92 46 60 C66 36 108 44 124 70 C140 98 120 132 92 128 C66 124 64 92 86 86" fill="none" stroke="' + col + '" stroke-width="13" stroke-linecap="round"/>'; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; x += '<circle cx="' + (100 + Math.cos(a) * 88).toFixed(1) + '" cy="' + (100 + Math.sin(a) * 88).toFixed(1) + '" r="10" fill="#ff9fb0" opacity=".9"/>'; } }
    else x += '<circle cx="100" cy="100" r="70" fill="none" stroke="' + col + '" stroke-width="' + (id === "myth" ? 18 : 16) + '"/>';
    if (id === "star" || id === "gold" || id === "myth") for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; x += starPath(100 + Math.cos(a) * 92, 100 + Math.sin(a) * 92, 11, id === "star" ? "#ffcf3f" : "#fff6c2"); }
    if (id === "myth") x += '<circle cx="100" cy="100" r="88" fill="none" stroke="url(#rg)" stroke-width="3" stroke-dasharray="6 8"/>';
    return '<svg viewBox="0 0 200 200" width="230" height="230">' + x + "</svg>";
  }
  function starPath(cx, cy, r, fill) { let p = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; p += (i ? "L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1); } return '<path d="' + p + 'Z" fill="' + fill + '"/>'; }
  function next() {
    const list = curList();
    if (!Q.answered) return;
    if (Q.mode === "boss" && Q.hp <= 0) { finishRound(); return; }
    if (Q.i + 1 < list.length) { Q.i++; showQ(); return; }
    finishRound();
  }
  function finishRound() {
    if (Q.mode === "box") return boxSummary();
    if (Q.mode === "boss") return bossSummary();
    if (Q.mode === "mock") return mockSummary();
    if (Q.mode === "main") {
      const p = state.progress[Q.key] || { best: 0, n: Q.n, plays: 0, passed: false };
      Q.prevBest = p.plays ? p.best : null;
      p.plays++; p.n = Q.n; p.best = Math.max(p.best, Q.baseCorrect); p.last = Q.baseCorrect; p.t = now();
      state.progress[Q.key] = p;
      if (Q.baseCorrect >= Q.need) giveStar();
      save();
    } else {
      // 再挑戦：まちがいリストを更新
      Q.wrongLeft = Q.retryRes.filter((r) => !r.ok && !r.skip).map((r) => r.q);
    }
    summary();
    try { window.dispatchEvent(new Event("hm-step-end")); } catch (e) {}
  }
  // ⭐をあげる（同じステップは1日1回まで）。⭐やポイントがへることはない。
  function giveStar() {
    if (Q.starGiven) return;
    Q.starGiven = true;
    const p = state.progress[Q.key] || { best: 0, n: Q.n, plays: 1, passed: false };
    p.passed = true; state.progress[Q.key] = p;
    const d = dayRec(today());
    if (d.steps[Q.key]) { Q.starDup = true; save(); return; }
    d.steps[Q.key] = true; d.stars += 1;
    state.totalStars += 1; state.pulls += 1;
    Q.starNew = true;
    save();
  }
  function celebrateStar(inline) {
    sound("star");
    const fx = $("#fx-root"), d = document.createElement("div");
    d.className = "star-pop"; d.innerHTML = "<span>⭐</span><b>" + (Q && Q.starDup ? "合格！（このステップの⭐は今日もうもらったよ）" : "⭐ ゲット！") + "</b>";
    fx.appendChild(d); setTimeout(() => d.remove(), 1800);
    if (!(Q && Q.starDup)) { confetti(50); burstAt(innerWidth / 2, innerHeight * 0.45, 26); haptic([20, 30, 50]); }
    $("#top-stars").innerHTML = topStars();
  }
  const PRAISE = {
    perfect: ["全問正解！ 完ぺきだね！", "パーフェクト！ すごすぎる！", "1問もまちがえなかった！ 天才かも！"],
    pass: ["合格！ よくがんばったね！", "6割こえた！ その調子！", "いいね！ ちゃんと分かってきてる！"],
    up: ["前よりできるようになってる！", "成長してるのが分かるよ！"],
    not: ["おしい！ まちがえた問題だけやり直そう。", "大丈夫、やり直せば⭐がもらえるよ。", "解説を読んで、もう一回いってみよう！"],
  };
  const SPECIAL = { 4: "激レアのぼくも感心したよ！", 5: "伝説級のがんばりだ！", 6: "神話にきざまれる努力だね…！" };
  function summary() {
    const p = GCArt.charById(state.partner), combined = Q.baseCorrect + (Q.retryCorrect || 0), passed = combined >= Q.need;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    let kind = Q.mode === "main" && Q.baseCorrect === Q.n ? "perfect" : passed ? "pass" : "not";
    let line = (window.HMGK && HMGK.sumLine(kind)) || pick(PRAISE[kind]);
    if (Q.mode === "main" && Q.prevBest != null && Q.baseCorrect > Q.prevBest) line = pick(PRAISE.up) + " " + line;
    const wrong = Q.mode === "main" ? Q.results.filter((r) => !r.ok && !r.skip).map((r) => r.q) : Q.wrongLeft;
    const pct = Math.round((combined / Q.n) * 100);
    let h = '<div class="sum">';
    h += '<div class="sum-top"><div class="ring" style="--p:' + pct + '"><div><b class="num">' + combined + "</b><small>/" + Q.n + "</small></div></div>";
    h += '<div class="sum-r"><div class="sum-t">' + (kind === "perfect" ? "パーフェクト！" : passed ? "合格！" : "あと " + (Q.need - combined) + " 問で合格") + '</div><div class="small muted">合格ライン：' + Q.n + "問中 " + Q.need + "問（6割・切り上げ）</div>";
    if (Q.mode === "main" && Q.prevBest != null) h += '<div class="small">前回までのベスト ' + Q.prevBest + " → 今回 " + Q.baseCorrect + (Q.baseCorrect > Q.prevBest ? ' <b class="up">+' + (Q.baseCorrect - Q.prevBest) + "</b>" : "") + "</div>";
    if (Q.mode === "retry") h += '<div class="small">最初 ' + Q.baseCorrect + "問 ＋ やり直し " + Q.retryCorrect + "問</div>";
    h += "</div></div>";
    h += '<div class="sum-star ' + (Q.starGiven ? "got" : "") + '">' + (Q.starGiven ? (Q.starNew ? "⭐ を1こゲット！ 学園の空がまた明るくなったよ" : "合格！（このステップの⭐は今日もうもらったよ。ほかのステップで⭐を集めよう）") : "⭐ はまだ。まちがえた問題をやり直すと、合わせて6割で⭐！") + "</div>";
    h += '<div class="sum-char">' + charHtml(p.id, 110, "bob r" + p.rarity + (p.rarity >= 4 ? " glow" : "")) + '<div class="bubble">' + esc(line) + "</div></div>";
    h += '<div class="today-mini">今日の⭐ ' + topStars() + (gamesOpen() ? ' <span class="ok">🎮 ゲーム解放中</span>' : " あと" + (STARS_TO_UNLOCK - starsToday()) + "こでゲーム") + "</div>";
    h += '<div class="sum-act">';
    if (wrong && wrong.length) h += '<button type="button" class="btn ' + (passed ? "" : "primary") + ' block" data-q="retry">🔁 まちがえた ' + wrong.length + " 問をやり直す</button>";
    const nx = findStep(Q.s, Q.g, Q.ui, Q.si + 1);
    if (nx) h += '<button type="button" class="btn ' + (passed ? "primary" : "") + ' block" data-q="nextstep">次のステップ：' + esc(SN(nx.step.n)) + " ›</button>";
    h += '<button type="button" class="btn block" data-q="again">もう一度このステップ</button><button type="button" class="btn ghost block" data-q="quit">単元にもどる</button></div>';
    if (Q.results.length) h += '<details class="review"><summary>問題をふりかえる</summary>' + Q.results.map((r, i) => '<div class="rv ' + (r.ok ? "ok" : r.skip ? "skip" : "ng") + '"><b>' + (i + 1) + ". " + (r.ok ? "⭕" : r.skip ? "⏭" : "✖") + '</b> <span class="rq">' + strip(r.q.q).slice(0, 80) + "</span><br><span class=\"small\">正解：" + esc(r.q.a) + "</span></div>").join("") + "</details>";
    h += "</div>";
    Q.wrongForRetry = wrong;
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (Q.starNew && !Q.celebrated) { Q.celebrated = true; setTimeout(() => celebrateStar(), 200); }
  }
  // ---------- v1.2 まとめカード ----------
  const CARD_LINES = ["今日のポイントはこれ！ れいを見てからいこう。", "まずはここをおさえよう。", "れいの考え方をまねすれば大丈夫！", "ポイントを見たら、さっそくチャレンジ！", "ここが分かれば、ぐっと楽になるよ。"];
  function exampleFor(step, qs) {
    try {
      if (step.en4 && step.example) { for (let t = 0; t < 10; t++) { const e = step.example(); if (e && e.en) return { q: esc(e.ja), a: e.en, ex: "「" + e.ja + "」は英語で「" + e.en + "」。🎧聞く・🗣話す・✏️書く・📖読む の4つで練習するよ。" }; } return null; }
      if (typeof step.src === "function") { for (let t = 0; t < 30; t++) { const c = step.src(0.3, 1); if (c && !qs.some((q) => q.q === c.q && q.a === c.a)) return c; } return null; }
      const all = step.src.map((x) => (typeof x === "string" ? HM.parseBankLine(x) : x));
      const unused = all.filter((c) => !qs.some((q) => q.q === c.q && q.a === c.a));
      return (unused.length ? unused : all)[Math.floor(Math.random() * (unused.length || all.length))];
    } catch (e) { return null; }
  }
  function exAnswer(c) {
    if (c.t === "ord") return c.items.join(" → ");
    if (c.t === "match" || c.t === "pair") return c.pairs.map((p) => p[0] + "－" + p[1]).join("、");
    return c.a + (c.unit && c.t !== "ch" ? c.unit : "");
  }
  function showCard() {
    const p = GCArt.charById(state.partner), c = exampleFor(Q.step, Q.qs), sb = subjById(Q.s);
    const pts = (HM.POINTS && (HM.POINTS[Q.unit.n + "/" + Q.step.n] || HM.POINTS[Q.unit.n])) || "";
    let h = '<div class="qz-head"><button type="button" class="qz-x" data-q="quit" aria-label="やめる">✕</button><div class="qz-prog"><i style="width:0%"></i></div><span class="qz-n num">0/' + Q.n + "</span></div>";
    h += '<div class="card-pt" style="--sc:' + sb.c + '"><div class="cp-head">' + HMIcons.icon(Q.s, sb.c, 40) + '<div><small>' + esc(subjName(Q.s, Q.g) + " " + gradeName(Q.g) + " ／ " + Q.unit.n) + "</small><b>" + esc(SN(Q.step.n)) + '</b></div></div><div class="cp-tag">💡 今日のポイント</div>';
    if (pts) h += '<p class="cp-pt">' + esc(pts) + "</p>";
    if (c) { const cq = c.t === "tap" ? String(c.q).replace(/data-hit=/g, "data-x=") + (c.svg || "").replace(/data-hit=/g, "data-x=") : c.q; h += '<div class="cp-ex"><div class="cp-k">れい</div><div class="cp-q">' + (c.listen ? esc(c.say || "") : cq) + '</div><div class="cp-a">こたえ：<b>' + esc(exAnswer(c)) + '</b></div><div class="cp-why">' + esc(c.ex || "").replace(/\n/g, "<br>") + "</div></div>"; }
    h += '<div class="cp-char">' + charHtml(p.id, 84, "bob r" + p.rarity) + '<div class="bubble">' + esc(CARD_LINES[Math.floor(Math.random() * CARD_LINES.length)]) + "</div></div>";
    h += '<div class="cp-info">' + Q.n + "問 ・ 約" + STEP_MIN + "分 ・ " + Q.need + "問正解で⭐</div>";
    h += '<button type="button" class="btn primary block big" data-q="card-go">はじめる ▶</button></div>';
    Q.card = true; const el = $("#quiz"); el.innerHTML = h; el.scrollTop = 0;
  }
  // ---------- v1.2 コンボ ----------
  const comboNext = (n) => (n < 3 ? 3 : n < 5 ? 5 : n < 10 ? 10 : (Math.floor(n / 5) + 1) * 5);
  const comboPrev = (n) => (n < 3 ? 0 : n < 5 ? 3 : n < 10 ? 5 : Math.floor(n / 5) * 5);
  function comboHtml() {
    const n = (Q && Q.combo) || 0, a = comboPrev(n), b = comboNext(n), k = Math.round(((n - a) / (b - a)) * 100);
    return '<div class="combo ' + (n >= 10 ? "lv3" : n >= 5 ? "lv2" : n >= 3 ? "lv1" : "") + '" id="combo"><span class="cb-f">🔥</span><span class="cb-g"><i style="width:' + k + '%"></i></span><span class="cb-n num">' + (n ? n + " コンボ" : "コンボ") + "</span></div>";
  }
  function afterAnswer(q, ok) {
    Q.combo = ok ? (Q.combo || 0) + 1 : 0;
    if (Q.combo > (state.bestCombo || 0)) state.bestCombo = Q.combo;
    try { if (window.HMGK) HMGK.onAnswer(ok, Q.combo); } catch (e) {}
    if (!ok && Q.mode !== "box") boxAdd(q);
    if (ok && (Q.mode === "box" || Q.mode === "retry")) { if (boxRemove(q) && Q.mode === "box") Q.cleared = (Q.cleared || 0) + 1; }
    save();
  }
  function comboFx() {
    const n = Q.combo; if (!(n === 3 || n === 5 || n === 10 || (n > 10 && n % 5 === 0))) return;
    const lv = n >= 10 ? 3 : n >= 5 ? 2 : 1;
    const fx = $("#fx-root"), d = document.createElement("div");
    d.className = "combo-pop lv" + lv; d.innerHTML = "<b>" + n + "</b><span>コンボ！</span>" + (lv >= 2 ? "<i>🔥</i>" : "");
    fx.appendChild(d); setTimeout(() => d.remove(), 1400 + lv * 200);
    setTimeout(() => { sound("r" + Math.min(6, lv + 1)); burstAt(innerWidth / 2, innerHeight * 0.3, 14 + lv * 12); if (lv === 3) confetti(60); haptic(lv === 3 ? [20, 30, 20, 30, 60] : [15, 25, 15]); }, 250);
    if (lv === 3) { document.body.classList.remove("combo-flash"); void document.body.offsetWidth; document.body.classList.add("combo-flash"); setTimeout(() => document.body.classList.remove("combo-flash"), 900); }
  }
  // ---------- v1.2 まちがえた問題ボックス ----------
  const boxKey = (s, g, un, q) => s + "|" + g + "|" + un + "|" + strip(q.q).slice(0, 120) + "|" + q.a;
  function boxAdd(q) {
    const src = q.__src || { s: Q.s, g: Q.g, un: Q.unit.n, sn: Q.step.n };
    const k = q.__k || boxKey(src.s, src.g, src.un, q);
    state.wrongBox = state.wrongBox || [];
    if (state.wrongBox.some((x) => x.k === k)) return;
    const c = Object.assign({}, q); delete c.opts; delete c.__src; delete c.__k;
    state.wrongBox.push({ k, s: src.s, g: src.g, un: src.un, sn: src.sn, q: c, t: now() });
    if (state.boxGone) delete state.boxGone[k];
    while (state.wrongBox.length > 150) state.wrongBox.shift();
  }
  function boxRemove(q) {
    const src = q.__src || { s: Q.s, g: Q.g, un: Q.unit ? Q.unit.n : "" };
    const k = q.__k || boxKey(src.s, src.g, src.un, q);
    const i = (state.wrongBox || []).findIndex((x) => x.k === k); if (i < 0) return false;
    state.wrongBox.splice(i, 1);
    // ほかの端末と合わせたときに、クリアした問題がもどってこないように印を残す
    state.boxGone = state.boxGone || {}; state.boxGone[k] = now();
    const ks = Object.keys(state.boxGone); if (ks.length > 400) ks.sort((a, b) => state.boxGone[a] - state.boxGone[b]).slice(0, ks.length - 400).forEach((x) => delete state.boxGone[x]);
    return true;
  }
  function startBox() {
    const b = state.wrongBox || []; if (!b.length) { toast("ボックスはからっぽ！ 全部クリアしてるよ"); return; }
    const pickN = HM.U.shuf(b.slice()).slice(0, 10);
    const qs = pickN.map((x) => Object.assign({}, x.q, { __k: x.k, __src: { s: x.s, g: x.g, un: x.un, sn: x.sn }, opts: x.q.t === "ch" ? HM.U.shuf([x.q.a].concat(x.q.o)) : undefined }));
    Q = { s: pickN[0].s, g: pickN[0].g, ui: null, si: null, key: null, unit: { n: "" }, step: { n: "まちがえた問題ボックス" }, qs, i: 0, mode: "box", results: [], baseCorrect: 0, need: 0, n: qs.length, shownAt: 0, answered: false, passOpen: true, combo: 0, cleared: 0 };
    $("#quiz").hidden = false; document.body.classList.add("in-quiz"); showQ();
  }
  function boxSummary() {
    const p = GCArt.charById(state.partner), cl = Q.cleared || 0, left = (state.wrongBox || []).length;
    state.boxCleared = (state.boxCleared || 0) + cl; save();
    const line = cl === Q.n ? "全部クリア！ にがてを1つずつ消していくの、かっこいい！" : cl ? cl + "問クリア！ 前にまちがえた問題ができるようになったね！" : "いっしょに解説を読んで、またチャレンジしよう！";
    let h = '<div class="sum"><div class="box-hero"><div class="bx-ico">📦</div><div class="bx-t">ボックスから <b class="num">' + cl + "</b> 問クリア</div><div class=\"small muted\">のこり " + left + " 問 ・ これまでのクリア " + state.boxCleared + " 問</div></div>";
    h += '<div class="sum-char">' + charHtml(p.id, 110, "bob r" + p.rarity) + '<div class="bubble">' + esc(line) + "</div></div>";
    h += '<div class="sum-act">' + (left ? '<button type="button" class="btn primary block" data-q="box-again">📦 つづけてボックスの問題</button>' : "") + '<button type="button" class="btn ghost block" data-q="quit">もどる</button></div></div>';
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (cl) { confetti(cl === Q.n ? 60 : 24); sound(cl === Q.n ? "fanfare" : "soft"); }
  }
  // ---------- v1.2 ボス ----------
  const BOSS_NAMES = ["モヤモヤン", "ナゾナゾドン", "ムズカシーガ", "ウッカリング", "ワスレーヌ", "マチガイーダ", "ハテナゴン", "ヨミトバシー"];
  function bossLook(s, g, ui) { let hsh = 0; const k = s + g + ui; for (let i = 0; i < k.length; i++) hsh = (hsh * 31 + k.charCodeAt(i)) >>> 0; return { hue: hsh % 360, name: BOSS_NAMES[hsh % BOSS_NAMES.length], v: hsh % 3 }; }
  function bossSvg(L, size) {
    const c = "hsl(" + L.hue + ",70%,58%)", d = "hsl(" + L.hue + ",60%,38%)", l = "hsl(" + ((L.hue + 40) % 360) + ",85%,78%)";
    const horns = L.v === 0 ? '<path d="M38 34 L30 8 L50 28Z M82 34 L90 8 L70 28Z" fill="' + l + '" stroke="' + d + '" stroke-width="3" stroke-linejoin="round"/>' : L.v === 1 ? '<circle cx="34" cy="22" r="9" fill="' + l + '" stroke="' + d + '" stroke-width="3"/><circle cx="86" cy="22" r="9" fill="' + l + '" stroke="' + d + '" stroke-width="3"/>' : '<path d="M60 6 L68 28 L52 28Z" fill="' + l + '" stroke="' + d + '" stroke-width="3" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size + '" class="boss-svg">' + horns + '<path d="M18 70 C18 36 40 24 60 24 C80 24 102 36 102 70 C102 98 86 110 60 110 C34 110 18 98 18 70Z" fill="' + c + '" stroke="' + d + '" stroke-width="4"/><path d="M10 74 L22 66 L22 86Z M110 74 L98 66 L98 86Z" fill="' + c + '" stroke="' + d + '" stroke-width="3" stroke-linejoin="round"/><ellipse cx="60" cy="88" rx="26" ry="14" fill="' + l + '" opacity=".55"/><ellipse cx="45" cy="60" rx="10" ry="12" fill="#fff" stroke="' + d + '" stroke-width="2.5"/><ellipse cx="75" cy="60" rx="10" ry="12" fill="#fff" stroke="' + d + '" stroke-width="2.5"/><circle cx="47" cy="62" r="5" fill="#222"/><circle cx="73" cy="62" r="5" fill="#222"/><path d="M36 46 L54 52 M84 46 L66 52" stroke="' + d + '" stroke-width="4" stroke-linecap="round"/><path d="M46 82 Q60 92 74 82" fill="none" stroke="' + d + '" stroke-width="3.5" stroke-linecap="round"/><path d="M52 85 L55 91 L58 86 M62 86 L65 91 L68 85" fill="#fff" stroke="' + d + '" stroke-width="1.5"/></svg>';
  }
  function bossHtml() {
    const L = bossLook(Q.s, Q.g, Q.ui), k = Math.max(0, Q.hp) / Q.maxHp;
    return '<div class="boss-panel ' + (Q.hp <= 0 ? "down" : "") + '" id="boss-panel"><div class="bp-mon" id="bp-mon">' + bossSvg(L, 96) + '</div><div class="bp-r"><b>' + esc(L.name) + '</b><div class="bp-hp"><i id="bp-hp" style="width:' + Math.round(k * 100) + '%"></i></div><small class="num">HP ' + Math.max(0, Q.hp) + " / " + Q.maxHp + "</small></div></div>";
  }
  function bossHit() {
    if (!Q || Q.mode !== "boss") return;
    Q.hp = Math.max(0, Q.hp - 1);
    const mon = $("#bp-mon"), bar = $("#bp-hp"), pn = $("#boss-panel"); if (!mon) return;
    const r = mon.getBoundingClientRect(), fx = $("#fx-root");
    const shot = document.createElement("div"); shot.className = "boss-shot"; shot.textContent = "⭐";
    shot.style.left = innerWidth / 2 + "px"; shot.style.top = innerHeight * 0.62 + "px"; shot.style.setProperty("--tx", (r.left + r.width / 2 - innerWidth / 2) + "px"); shot.style.setProperty("--ty", (r.top + r.height / 2 - innerHeight * 0.62) + "px");
    fx.appendChild(shot); setTimeout(() => shot.remove(), 520);
    setTimeout(() => {
      mon.classList.remove("hit"); void mon.offsetWidth; mon.classList.add("hit");
      if (bar) bar.style.width = Math.round((Q.hp / Q.maxHp) * 100) + "%";
      const sm = $("#boss-panel small"); if (sm) sm.textContent = "HP " + Q.hp + " / " + Q.maxHp;
      const dmg = document.createElement("div"); dmg.className = "boss-dmg"; dmg.textContent = "ヒット！"; dmg.style.left = r.left + r.width / 2 + "px"; dmg.style.top = r.top + "px"; fx.appendChild(dmg); setTimeout(() => dmg.remove(), 900);
      burstAt(r.left + r.width / 2, r.top + r.height / 2, 16); sound("tap"); haptic([10, 20, 30]);
      if (Q.hp <= 0) { pn && pn.classList.add("down"); sound("fanfare"); confetti(70); const nb = $('[data-q="next"]'); if (nb) nb.textContent = "ボスをたおした！ ›"; }
    }, 480);
  }
  function startBoss(s, g, ui) {
    const u = (S()[s] || {})[g] && S()[s][g][ui]; if (!u) return;
    let pool = [];
    u.steps.forEach((st) => { try { const set = HM.makeSet(st); pool.push(...set.slice(-2)); } catch (e) {} });
    if (pool.length < 6) u.steps.forEach((st) => { try { pool.push(...HM.makeSet(st).slice(0, 3)); } catch (e) {} });
    const seen = new Set(); pool = HM.U.shuf(pool).filter((q) => { const k = q.q + "|" + q.a; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
    if (!pool.length) return;
    pool.forEach((q) => { if (q.t === "ch") q.opts = HM.U.shuf([q.a].concat(q.o)); });
    const need = HM.passNeed(pool.length);
    Q = { s, g, ui, si: null, key: "boss|" + s + "|" + g + "|" + u.n, unit: u, step: { n: "ボスバトル" }, qs: pool, i: 0, mode: "boss", results: [], baseCorrect: 0, need, n: pool.length, hp: need, maxHp: need, shownAt: 0, answered: false, passOpen: true, combo: 0 };
    $("#quiz").hidden = false; document.body.classList.add("in-quiz");
    const L = bossLook(s, g, ui);
    $("#quiz").innerHTML = '<div class="boss-intro"><div class="bi-mon">' + bossSvg(L, 150) + '</div><b>' + esc(L.name) + ' があらわれた！</b><small>' + esc(u.n) + ' のまとめ問題 ・ ' + pool.length + '問 ・ ' + need + 'ヒットでたおせる</small><span class="spinner"></span></div>';
    sound("block"); setTimeout(() => { if (Q && Q.mode === "boss" && Q.i === 0 && !Q.answered) showQ(); }, 1100);
  }
  function bossSummary() {
    const p = GCArt.charById(state.partner), L = bossLook(Q.s, Q.g, Q.ui), win = Q.hp <= 0, first = win && !(state.bossWins || {})[Q.key];
    if (win) { state.bossWins = state.bossWins || {}; state.bossWins[Q.key] = state.bossWins[Q.key] || today(); save(); try { window.dispatchEvent(new Event("hm-milestone")); } catch (e) {} }
    const nw = Object.keys(state.bossWins || {}).length;
    const line = win ? (first ? "やったー！ " + L.name + "をたおしたよ！ この単元、もうバッチリだね！" : "また勝った！ 強すぎる！") : "あと " + Q.hp + " ヒットだった！ 解説を読んで、もう一回いこう！";
    let h = '<div class="sum"><div class="boss-end ' + (win ? "win" : "") + '"><div class="be-mon">' + bossSvg(L, 120) + (win ? '<span class="be-crown">👑</span>' : "") + '</div><div class="be-t">' + (win ? "ボスをたおした！" : L.name + "とのバトル") + "</div>";
    h += '<div class="small muted">' + esc(subjName(Q.s, Q.g) + " " + gradeName(Q.g) + " ／ " + Q.unit.n) + "</div>";
    if (win) h += '<div class="be-prize">🏆 単元マップにかんむりがつきました' + (nw === 1 ? "<br>称号「ボスハンター」がえらべるようになったよ" : nw === 10 ? "<br>称号「ボスマスター」がえらべるようになったよ" : "") + "</div>";
    h += "</div>";
    h += '<div class="sum-char">' + charHtml(p.id, 110, "bob r" + p.rarity) + '<div class="bubble">' + esc(line) + "</div></div>";
    h += '<div class="sum-act"><button type="button" class="btn ' + (win ? "" : "primary") + ' block" data-q="boss-again">👾 もう一度ボスと戦う</button><button type="button" class="btn ghost block" data-q="quit">マップにもどる</button></div>';
    if (Q.results.length) h += '<details class="review"><summary>問題をふりかえる</summary>' + Q.results.map((r, i) => '<div class="rv ' + (r.ok ? "ok" : r.skip ? "skip" : "ng") + '"><b>' + (i + 1) + ". " + (r.ok ? "⭕" : r.skip ? "⏭" : "✖") + '</b> <span class="rq">' + strip(r.q.q).slice(0, 80) + "</span><br><span class=\"small\">正解：" + esc(r.q.a) + "</span></div>").join("") + "</details>";
    h += "</div>";
    $("#quiz").innerHTML = h; $("#quiz").scrollTop = 0;
    if (win) { confetti(80); sound("fanfare"); }
  }
  function sayText(q) { if (q.skill) return null; return q.say || (typeof q.en === "string" && /^[A-Za-z][A-Za-z .,'?!-]*$/.test(q.en) ? q.en : null); }
  const strip = (html) => esc(String(html).replace(/<svg[\s\S]*?<\/svg>/g, "［図］").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  function startRetry() {
    const w = Q.wrongForRetry || []; if (!w.length) return;
    Q.mode = "retry"; Q.i = 0; Q.retryRes = [];
    if (Q.retryCorrect == null) Q.retryCorrect = 0;
    Q.retry = w.map((q) => Object.assign({}, q, { opts: q.t === "ch" ? HM.U.shuf([q.a].concat(q.o)) : undefined }));
    showQ();
  }
  function quitQuiz() {
    $("#quiz").hidden = true; $("#quiz").innerHTML = ""; document.body.classList.remove("in-quiz");
    try { if (canSpeak()) speechSynthesis.cancel(); } catch (e) {}
    if (KJ && KJ._pad && KJ._pad.cleanup) try { KJ._pad.cleanup(); } catch (e) {}
    clearExTimer();
    if (Q && Q.mode === "exam") {
      const back = Q.backNav; EX = null; Q = null;
      if (back) { tab = "home"; modeNav = back; navDir = "back"; }
      render(); return;
    }
    if (Q && (Q.mode === "color" || Q.mode === "kj50")) {
      const back = Q.backNav; CT = null; KJ = null; Q = null;
      if (back) { tab = "home"; modeNav = back; navDir = "back"; }
      render(); return;
    }
    if (Q && Q.ui != null) { nav = [{ v: "grades", s: Q.s }, { v: "units", s: Q.s, g: Q.g }, { v: "steps", s: Q.s, g: Q.g, u: Q.ui }]; tab = "study"; navDir = "back"; }
    CT = null; KJ = null; Q = null; render();
  }
  function reportQ() {
    const q = curList()[Q.i];
    openSheet('<h2>この問題おかしい？</h2><p class="small muted">気づいたことを書いてね。この端末の中だけに保存されます（どこにも送信しません）。設定の「問題の報告」から一覧を見たり書き出したりできます。</p><div class="rep-q">' + strip(q.q) + "<br><small>アプリの正解：" + esc(q.a) + "</small></div>" +
      '<div class="chips">' + ["答えがちがう", "正解が2つある", "問題文が分かりにくい", "解説がおかしい", "その他"].map((c) => '<button type="button" class="chip" data-c="' + c + '">' + c + "</button>").join("") + '</div><textarea class="input" id="rep-note" rows="3" maxlength="300" placeholder="くわしく（なくてもOK）"></textarea><div class="actions"><button type="button" class="btn primary block" id="rep-save">保存する</button></div>', {
      label: "問題の報告",
      mount: (sh) => {
        let kind = "";
        sh.addEventListener("click", (e) => { const c = e.target.closest("[data-c]"); if (c) { kind = c.dataset.c; $$(".chip", sh).forEach((x) => x.classList.toggle("on", x === c)); } });
        $("#rep-save", sh).addEventListener("click", () => {
          const r = curList()[Q.i] && Q.mode === "main" ? Q.results[Q.i] : null;
          state.reports.unshift({ t: now(), app: VERSION, subj: Q.s, grade: Q.g, unit: Q.unit.n, step: Q.step.n, q: strip(q.q), a: q.a, opts: q.t === "ch" ? [q.a].concat(q.o) : null, given: r ? r.given : null, kind: kind || "未選択", note: $("#rep-note", sh).value.trim() });
          state.reports = state.reports.slice(0, 500); save(); closeSheet(); toast("ありがとう！ 報告を保存しました");
        });
      },
    });
  }

  // ---------- ゲーム ----------
  const GENRES = [["all", "すべて", "✨"], ["sports", "スポーツ", "⚽"], ["race", "レース", "🏁"], ["shoot", "シューティング", "🎯"], ["action", "アクション", "🏃"], ["puzzle", "パズル", "🧩"], ["battle", "バトル", "⚔️"], ["board", "ボード", "♟️"], ["card", "カード", "🃏"]];
  const GENRE_OF = { baseball: "sports", golf: "sports", soccer: "sports", bowling: "sports", basket: "sports", hockey: "sports", climb: "sports",
    racing: "race", runner: "race", highway: "race", starfighter: "shoot", meteor: "shoot", bubble: "shoot",
    breakout: "action", mole: "action", flappy: "action", snake: "action", tower: "action", fall: "action",
    g2048: "puzzle", sudoku: "puzzle", coin: "puzzle", slide: "puzzle", lights: "puzzle", hanoi: "puzzle", nonogram: "puzzle", flood: "puzzle", pipes: "puzzle", blockfit: "puzzle", make10: "puzzle", mines: "puzzle", simon: "puzzle",
    arena: "battle", royale: "battle",
    chess: "board", reversi: "board", gomoku: "board", shogi: "board", connect4: "board", ultimate: "board", dots: "board", mancala: "board", checkers: "board", hex: "board", battleship: "board", hasami: "board",
    memory: "card", pyramid: "card", sevens: "card", oldmaid: "card" };
  const genreOf = (g) => (window.HMCatalog && HMCatalog.genreOf(g)) || g.genre || GENRE_OF[g.id] || "action";
  let gameGenre = "all";
  function gamesList() { return (window.HMCatalog && HMCatalog.entries(GAMES)) || GAMES; }
  function viewGames() {
    const open = gamesOpen(), n = starsToday();
    const all = gamesList();
    const list = all.filter((g) => gameGenre === "all" || genreOf(g) === gameGenre);
    let h = '<div class="gate ' + (open ? "open" : "") + '">' + (open ? "🎮 今日はゲームで遊べるよ！（⭐" + n + "）" : "🔒 今日の⭐が " + STARS_TO_UNLOCK + " こになるとひらきます（今 " + n + " こ）") + "</div>";
    h += '<div class="genre-bar" role="tablist" aria-label="ジャンル">' + GENRES.map(([k, l, e]) => { const c = k === "all" ? all.length : all.filter((g) => genreOf(g) === k).length; return c ? '<button type="button" role="tab" class="genre-chip' + (gameGenre === k ? " on" : "") + '" aria-selected="' + (gameGenre === k) + '" data-genre="' + k + '"><span>' + e + "</span>" + l + "<small>" + c + "</small></button>" : ""; }).join("") + "</div>";
    h += '<div class="app-grid">' + list.map((g, i) => '<button type="button" class="app-ic ' + (open ? "" : "locked") + '" data-game="' + g.id + '" style="--i:' + (i % 24) + '"><span class="ai">' + HMIcons.icon(g.id, g.c, 62, g.e) + (g.fresh ? '<span class="newb">NEW</span>' : "") + (open ? "" : '<span class="lock">🔒</span>') + "</span><span class=\"an\"" + anFit(g.n) + ">" + esc(g.n) + (g.group ? '<small class="an-sub">' + g.members.length + "種目</small>" : "") + "</span></button>").join("") + "</div>";
    h += '<p class="foot">全' + all.length + "ゲーム</p>";
    return h;
  }
  function gameRank(id) {
    const rec = state.games[id] || {}; let pt = 0;
    DIFFS.forEach((d) => { pt += ((rec[d.id] || {}).wins || 0) * RANK_PT[d.id]; });
    let i = 0; while (i + 1 < RANKS.length && pt >= RANKS[i + 1][0]) i++;
    return { pt, i, name: RANKS[i][1], color: RANKS[i][2], next: RANKS[i + 1] ? { need: RANKS[i + 1][0] - pt, name: RANKS[i + 1][1] } : null };
  }
  const fmtNum = (v) => (Math.round(v * 10) / 10).toLocaleString("ja-JP");
  function bestText(m) { return m && m.best != null ? fmtNum(m.best) + (m.unit || "") : null; }
  // 強さごとのランク（A/B/C）：A＝3勝以上で勝率6割以上、B＝1勝以上、C＝まだ勝っていない（あそんだことがある）
  function diffRank(r) { if (!r || !r.plays) return null; const w = r.wins || 0; if (w >= 3 && w / r.plays >= 0.6) return "A"; if (w >= 1) return "B"; return "C"; }
  const DCOL = { easy: "green", normal: "blue", hard: "red", ultra: "purple" };
  function closeModeSel(instant) { const el = document.getElementById("mode-sel"); if (!el) return; if (instant) { el.remove(); return; } el.classList.add("out"); setTimeout(() => el.remove(), 220); }
  function openGameMenu(id) {
    const pack = (window.HMCatalog && HMCatalog.find(GAMES, id)) || GAMES.find((x) => x.id === id); if (!pack) return;
    if (!gamesOpen()) { toast("🔒 今日の⭐をあと " + (STARS_TO_UNLOCK - starsToday()) + " こ集めるとひらくよ"); return; }
    closeModeSel(true);
    let playId = pack.group ? pack.members[0].id : pack.id;
    let lapsPick = 2;
    const paint = () => {
      const g = pack.group ? pack.members.find((x) => x.id === playId) || pack.members[0] : pack;
      playId = g.id;
      const rec = state.games[playId] || {};
      const btns = DIFFS.map((d, i) => { const r = rec[d.id] || {}, bt = bestText(r.m), rk = diffRank(r);
        return '<div class="ms-slot" style="--i:' + i + '"><button type="button" class="ms-btn ms-' + DCOL[d.id] + '" data-diff="' + d.id + '">' + d.name + '</button><div class="ms-rec"><span class="ms-best num">' + (bt ? esc(bt) : "－") + '</span><span class="ms-rank' + (rk ? " r" + rk : "") + '">' + (rk || "－") + "</span></div></div>"; }).join("");
      let courses = "";
      if (pack.group) {
        courses = '<div class="ms-courses">' + pack.members.map((m) => '<button type="button" class="ms-course' + (m.id === playId ? " on" : "") + '" data-course="' + m.id + '">' + (m.e || "") + " " + esc(m.n) + "</button>").join("") + "</div>";
      }
      if (window.HMRace3d && HMRace3d.hasLaps && HMRace3d.hasLaps(playId)) {
        courses += '<div class="ms-courses ms-laps"><span class="ms-lab">周回</span>' +
          [2, 3].map((n) => '<button type="button" class="ms-course' + (lapsPick === n ? " on" : "") + '" data-laps="' + n + '">' + n + "周</button>").join("") + "</div>";
      }
      el.querySelector(".ms-panel").innerHTML = '<h2 class="ms-title">モード選択</h2><div class="ms-game"><span>' + HMIcons.icon(g.id, g.c, 28, g.e) + esc(pack.group ? pack.n + " ／ " + g.n : g.n) + "</span></div>" + courses + btns;
    };
    const el = document.createElement("div"); el.id = "mode-sel"; el.className = "mode-sel"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", pack.n + " モード選択");
    el.innerHTML = '<div class="ms-panel"></div><button type="button" class="ms-top" data-ms="top"><span class="ms-home">⌂</span>トップにもどる</button>';
    document.body.appendChild(el);
    paint();
    el.addEventListener("click", (e) => {
      const c = e.target.closest("[data-course]"); if (c) { sound("tap"); playId = c.dataset.course; paint(); return; }
      const lp = e.target.closest("[data-laps]"); if (lp) { sound("tap"); lapsPick = +lp.dataset.laps === 3 ? 3 : 2; if (window.HMRace3d) HMRace3d.pendingLaps = lapsPick; paint(); return; }
      const b = e.target.closest("[data-diff]"); if (b) { sound("tap"); if (window.HMRace3d && HMRace3d.hasLaps && HMRace3d.hasLaps(playId)) HMRace3d.pendingLaps = lapsPick; closeModeSel(true); startGame(playId, b.dataset.diff); return; }
      if (e.target.closest('[data-ms="top"]') || e.target === el) { sound("tap"); closeModeSel(); }
    });
  }
  function startGame(id, diff) {
    if (!gamesOpen()) return;
    try {
      if (id === "climb") window.GFGames.openClimb(diff);
      else if (id === "arena") window.GFGames.openArena(diff);
      else if (id === "chess") window.GFChess.open({ diff });
      else if (window.GCGames && GCGames.open[id]) GCGames.open[id](diff);
      else return;
    } catch (e) { console.error(e); toast("ゲームを開けませんでした"); }
  }
  let layerOnClose = null;
  function openLayer(title, onClose) {
    if (layerOnClose) { const f = layerOnClose; layerOnClose = null; try { f(); } catch (e) {} }
    $("#gl-title").textContent = title;
    $("#gl-result").hidden = true; $("#gl-result").className = "gl-result"; $("#game-layer").classList.remove("rs-dim-lose", "rs-dim-win");
    const oldBody = $("#gl-body"), freshEl = oldBody.cloneNode(false);
    oldBody.replaceWith(freshEl);
    $("#game-layer").hidden = false;
    document.body.classList.add("in-game");
    layerOnClose = onClose || null;
    return $("#gl-body");
  }
  function closeLayer() {
    if (layerOnClose) { const f = layerOnClose; layerOnClose = null; try { f(); } catch (e) {} }
    if (window.GFGames) try { GFGames.stop(); } catch (e) {}
    if (window.GCGames) try { GCGames.stop(); } catch (e) {}
    $("#game-layer").hidden = true; $("#gl-body").innerHTML = ""; $("#gl-result").hidden = true; $("#gl-result").className = "gl-result"; $("#game-layer").classList.remove("rs-dim-lose", "rs-dim-win");
    document.body.classList.remove("in-game");
    render();
  }
  let lastRes = null;
  function showResult(o) {
    const box = $("#gl-result"), layer = $("#game-layer");
    const R = lastRes && Date.now() - lastRes.t < 8000 ? lastRes : null; lastRes = null;
    const kind = o.win ? "win" : o.draw ? "draw" : "lose";
    const p = GCArt.charById(state.partner) || { id: "mori" };
    const stats = [];
    if (R) {
      const m = R.metric, u = m ? m.unit || "" : "";
      if (m && m.winOnly && kind !== "win") {
        if (m.gap) stats.push([m.gap[0], m.gap[1], "down"]);
        if (R.prevBest != null) stats.push(["ベスト記録", fmtNum(R.prevBest) + u, ""]);
      } else if (m && m.v != null) {
        stats.push([m.label || "今回", fmtNum(m.v) + u, ""]);
        if (R.newBest && R.prevBest != null) stats.push(["ベスト更新", "+" + fmtNum(Math.abs(m.v - R.prevBest)) + u, "up"]);
        else if (R.newBest) stats.push(["ベスト", "はじめての記録", "up"]);
        else if (R.prevBest != null) stats.push(["ベスト " + fmtNum(R.prevBest) + u, "あと " + fmtNum(Math.abs(R.prevBest - m.v)) + u, kind === "win" ? "" : "down"]);
      }
      if (kind === "win") {
        if (R.after.wins === 1) stats.push([R.diffName + "で", "はじめての勝ち！", "up"]);
        if (R.after.streak >= 2) stats.push(["連勝", R.after.streak + "連勝中", "up"]);
      } else if (kind === "lose") {
        if (R.before.streak >= 2) stats.push(["連勝ストップ", R.before.streak + "連勝で止まった", "down"]);
      }
      stats.push([R.diffName + "の記録", R.after.wins + "勝 / " + R.after.plays + "回", ""]);
    }
    const rk = R ? gameRank(R.game) : null, rankUp = R && R.rankBefore != null && rk && rk.i > R.rankBefore;
    const statHtml = stats.map((x) => '<div class="rs-row ' + x[2] + '"><span>' + esc(x[0]) + '</span><b class="num">' + esc(x[1]) + "</b></div>").join("");
    const rankHtml = rk ? '<div class="rs-rank' + (rankUp ? " up" : "") + '" style="--rc:' + rk.color + '"><span>🏅 ' + (rankUp ? "ランクアップ！ " : "ランク ") + "<b>" + rk.name + "</b></span>" + (rk.next ? '<span class="num">次の' + rk.next.name + "まで " + rk.next.need + "pt</span>" : '<span>いちばん上のランク</span>') + "</div>" : "";
    const head = kind === "win" ? '<div class="rs-rays"></div><div class="rs-trophy">🏆</div>' : kind === "draw" ? '<div class="rs-trophy">🤝</div>' : '<div class="rs-cloud"><span>☁️</span><i></i><i></i><i></i><i></i><i></i></div>';
    const sub = kind === "win" ? "やったね！" : kind === "draw" ? "いい勝負！" : "おしい…！";
    box.className = "gl-result rs-" + kind;
    box.innerHTML = (kind === "lose" ? '<div class="rs-rain">' + Array.from({ length: 26 }, (_, i) => '<i style="--x:' + ((i * 37) % 100) + "%;--d:" + (0.6 + ((i * 13) % 7) / 10) + "s;--dl:" + ((i * 7) % 10) / 10 + 's"></i>').join("") + "</div>" : "") +
      '<div class="res-card rs-card" role="dialog" aria-label="結果">' + head +
      '<div class="rs-char">' + charHtml(p.id, 104, "rs-ch") + (kind === "lose" ? '<span class="rs-tear">💧</span>' : kind === "win" ? '<span class="rs-spark">✨</span>' : "") + "</div>" +
      '<p class="rs-sub">' + sub + "</p><h3 class=\"rs-title\">" + esc(o.title) + "</h3>" + (o.text ? '<p class="rs-text">' + esc(o.text) + "</p>" : "") +
      (R && R.newBest && R.prevBest != null ? '<div class="rs-best">👑 ベスト更新！</div>' : "") +
      (statHtml ? '<div class="rs-stats">' + statHtml + "</div>" : "") + rankHtml +
      '<div class="rs-acts"><button type="button" class="btn primary rs-again" id="res-retry">🔁 もう一回</button><button type="button" class="btn rs-list" id="res-close">ゲーム一覧へ</button></div></div>';
    box.hidden = false;
    layer.classList.remove("rs-dim-lose", "rs-dim-win"); void layer.offsetWidth;
    layer.classList.add(kind === "lose" ? "rs-dim-lose" : "rs-dim-win");
    $("#res-close").addEventListener("click", () => { layer.classList.remove("rs-dim-lose", "rs-dim-win"); closeLayer(); });
    $("#res-retry").addEventListener("click", () => { sound("tap"); layer.classList.remove("rs-dim-lose", "rs-dim-win"); box.hidden = true; box.className = "gl-result"; if (o.onRetry) o.onRetry(); });
    if (kind === "win") { sound("victory"); confetti(rankUp || (R && R.newBest) ? 120 : 80); setTimeout(() => { if (!box.hidden) confetti(40); }, 900); haptic([30, 40, 60, 40, 90]); }
    else if (kind === "draw") { sound("soft"); haptic(20); }
    else { sound("sad"); haptic([80, 60, 160]); }
  }
  // 記録：勝ち数・回数・連勝・ベスト（metric = { v, unit, lower:小さいほど良い, winOnly:勝ったときだけ記録 }）
  function reportGame(game, diff, win, extra) {
    state.games[game] = state.games[game] || {};
    const rankBefore = gameRank(game).i;
    const r = state.games[game][diff] || { plays: 0, wins: 0 };
    const before = { plays: r.plays || 0, wins: r.wins || 0, streak: r.streak || 0 };
    r.plays = before.plays + 1; if (win) r.wins = before.wins + 1;
    r.streak = win ? before.streak + 1 : 0; r.maxStreak = Math.max(r.maxStreak || 0, r.streak);
    const metric = extra && extra.metric && isFinite(extra.metric.v) ? extra.metric : null;
    let prevBest = r.m && r.m.best != null ? r.m.best : null, newBest = false;
    if (metric && (!metric.winOnly || win)) {
      const better = prevBest == null || (metric.lower ? metric.v < prevBest : metric.v > prevBest);
      if (better) { r.m = { best: metric.v, unit: metric.unit || "", lower: !!metric.lower }; newBest = true; }
    }
    state.games[game][diff] = r; save();
    lastRes = { t: Date.now(), game, diff, diffName: (DIFFS.find((d) => d.id === diff) || DIFFS[1]).name, win: !!win, before, after: { plays: r.plays, wins: r.wins, streak: r.streak }, metric, prevBest, newBest, rankBefore };
    return null; // ゲームではごほうびなし
  }
  function copyText(text) {
    const done = () => toast("コピーしました");
    const fb = () => { const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { toast("長押しでコピーしてください"); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(fb); else fb();
  }
  // ゲームの有利・不利はなし（全部0）
  const NO_ADV = Object.freeze({ level: 1, ratio: 0, partnerBonus: 0, climbSec: 0, chessHints: 0, chessUndo: 0, arenaHp: 0, arenaDmg: 0, hints: 0, undos: 0, peek: 0, paddle: 0, moleSec: 0, lives: 0, undo2048: 0, sudokuHints: 0, coinMoves: 0 });
  window.GF = {
    toast: (m) => toast(esc(m)), esc,
    advantage: () => Object.assign({ partner: state.partner }, NO_ADV),
    charImage: () => GCArt.charImage(state.partner, charLevelFor(state.partner)),
    diffName: (id) => (DIFFS.find((d) => d.id === id) || DIFFS[1]).name,
    DIFFS, openLayer, closeLayer, showResult, reportGame, copyText,
    getNick: () => state.settings.nick || "",
    sound: (k) => sound(k), haptic: (p) => haptic(p),
  };

  // ---------- ガチャ・図鑑 ----------
  function rnd01() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } }
  function drawRarity(rates, u) { let acc = 0; for (let i = 0; i < rates.length; i++) { acc += rates[i]; if (u * 100 < acc) return i; } for (let i = rates.length - 1; i >= 0; i--) if (rates[i] > 0) return i; return 0; }
  function drawChar(sr, rnd) { const r = drawRarity(sr ? GACHA_RATES_SR : GACHA_RATES, rnd()); const pool = GCArt.CHARACTERS.filter((c) => c.rarity === r); return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))]; }
  function gachaPull(n, rnd) {
    n = n === 10 ? 10 : 1;
    if (pullsLeft() < n) return { error: "ガチャ回数が足りません（⭐をとると1回ふえます）" };
    rnd = typeof rnd === "function" ? rnd : rnd01;
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = drawChar(n === 10 && i === 9, rnd);
      const had = !!state.chars[c.id];
      const e = state.chars[c.id] || { n: 0, shards: 0, star: 0, t: now() };
      e.n += 1; let shards = 0;
      if (had) { shards = SHARD_DUP[c.rarity]; e.shards += shards; }
      state.chars[c.id] = e;
      out.push({ id: c.id, rarity: c.rarity, isNew: !had, shards });
    }
    state.pullsUsed += n;
    state.gachaLog.unshift({ t: now(), ids: out.map((o) => o.id) }); state.gachaLog = state.gachaLog.slice(0, 50);
    save();
    try { window.dispatchEvent(new Event("hm-milestone")); } catch (e) {}
    return { results: out };
  }
  function viewGacha() {
    const left = pullsLeft(), owned = Object.keys(state.chars).length;
    let h = '<section class="card gacha-top"><div class="capsule-machine">🎁</div><div class="grow"><b>なかまガチャ</b><div class="small muted">⭐をとるたびに1回。お金では引けません（課金なし）。</div><div class="pulls">のこり <b class="num">' + left + "</b> 回</div></div></section>";
    h += '<div class="actions two"><button type="button" class="btn primary" data-gacha="1" ' + (left >= 1 ? "" : "disabled") + '>1回ひく</button><button type="button" class="btn gold" data-gacha="10" ' + (left >= 10 ? "" : "disabled") + ">10回ひく</button></div>";
    h += '<p class="small muted center">10回ひくと、10回目はスーパーレア以上が確定。<button type="button" class="link-btn" data-gacha="rates">確率を見る</button></p>';
    h += '<div class="sec">図鑑 <span class="muted">' + owned + "/" + GCArt.CHARACTERS.length + "</span></div>";
    h += '<div class="zukan">' + GCArt.CHARACTERS.map((c) => { const e = state.chars[c.id]; if (!e) return '<div class="zk none"><div class="sil">？</div><small>' + GCArt.RARITIES[c.rarity].s + "</small></div>"; return '<button type="button" class="zk r' + c.rarity + (c.rarity >= 5 ? " goldf" : "") + (state.partner === c.id ? " partner" : "") + '" data-char="' + c.id + '">' + charHtml(c.id, 64) + "<small>" + esc(c.name) + "</small>" + starMarks(e.star || 0) + (c.rarity >= 5 ? '<i class="spk s1"></i><i class="spk s2"></i><i class="spk s3"></i>' : "") + "</button>"; }).join("") + "</div>";
    h += '<div class="sec">見た目（なかまのレア度でふえる）</div>';
    const mr = maxRarity();
    h += '<div class="look"><b>背景</b><div class="chips">' + BGS.map((b) => '<button type="button" class="chip ' + (state.look.bg === b.id ? "on" : "") + '" data-bg="' + b.id + '" ' + (mr >= b.r ? "" : "disabled") + ">" + (mr >= b.r ? "" : "🔒") + esc(b.n) + "</button>").join("") + "</div>";
    h += "<b>⭕のデザイン</b><div class=\"chips\">" + MARUS.map((b) => '<button type="button" class="chip ' + (state.look.maru === b.id ? "on" : "") + '" data-maru="' + b.id + '" ' + (mr >= b.r ? "" : "disabled") + ">" + (mr >= b.r ? "" : "🔒") + esc(b.n) + "</button>").join("") + "</div>";
    const tc = titleCtx();
    h += "<b>称号</b><div class=\"chips\">" + TITLES.map((t) => '<button type="button" class="chip ' + (state.look.title === t.id ? "on" : "") + '" data-title="' + t.id + '" ' + (t.ok(tc) ? "" : "disabled") + ' title="' + esc(t.how) + '">' + (t.ok(tc) ? "" : "🔒") + esc(t.n) + "</button>").join("") + "</div></div>";
    return h;
  }
  function openRates() {
    const R = GCArt.RARITIES, cnt = R.map((r) => GCArt.CHARACTERS.filter((c) => c.rarity === r.id).length);
    const pct = (x) => (Math.round(x * 1000) / 1000).toString() + "%";
    const head = "<tr><th>レア度</th><th>確率</th><th>種類</th></tr>";
    const row = (rates) => R.map((r, i) => '<tr><td><span class="rdot" style="background:' + r.c + '"></span>' + r.n + '</td><td class="num">' + pct(rates[i]) + '</td><td class="num">' + cnt[i] + "</td></tr>").join("");
    openSheet('<h2>ガチャの確率</h2><p class="small"><b>1回ひく／10回ひくの1〜9回目</b></p><table class="ga-table" id="rates-normal">' + head + row(GACHA_RATES) + '</table><p class="small" style="margin-top:12px"><b>10回ひくの10回目（スーパーレア以上確定）</b></p><table class="ga-table" id="rates-sr">' + head + row(GACHA_RATES_SR) + "</table>" +
      '<details class="ga-all"><summary>なかま別の確率（全' + GCArt.CHARACTERS.length + "種）</summary>" + R.map((r, i) => '<p class="small"><b>' + r.n + "</b>（1体あたり " + pct(GACHA_RATES[i] / cnt[i]) + "）：" + GCArt.CHARACTERS.filter((c) => c.rarity === i).map((c) => esc(c.name)).join("、") + "</p>").join("") + '</details><p class="small muted">同じなかまが出たら「かけら」になり、図鑑で★（見た目のかざり）を上げられます。全部そろえても特別なごほうびはありません（コンプガチャなし）。お金では引けません。</p>', { label: "確率" });
  }
  function doGacha(n) {
    const r = gachaPull(n);
    if (!r || r.error) { toast(esc(r ? r.error : "ひけません")); return; }
    const res = r.results, best = Math.max(...res.map((x) => x.rarity));
    const R = GCArt.RARITIES;
    const fx = document.createElement("div"); fx.className = "gacha-show"; fx.id = "gacha-show";
    const capCls = (x) => (x >= 4 ? "rainbow" : "r" + x);
    fx.innerHTML = '<div class="gs-in"><div class="capsule ' + capCls(best) + '" id="cap"><div class="cap-top"></div><div class="cap-bot"></div></div><p class="gs-hint">タップしてあける</p></div>';
    document.body.appendChild(fx);
    sound("soft");
    let opened = false;
    const open = () => {
      if (opened) return; opened = true;
      sound("r" + best); haptic(best >= 4 ? [30, 40, 30, 40, 80] : 20);
      fx.classList.add("lv" + best);
      fx.innerHTML = '<div class="gs-res ' + (best >= 4 ? "rainbow-bg" : "") + '"><h2>' + (best >= 4 ? "🌈 " : "") + (n === 10 ? "10連の結果" : "結果") + '</h2><div class="gs-grid n' + n + '">' + res.map((x, i) => { const c = GCArt.charById(x.id); return '<div class="gs-card r' + x.rarity + (x.rarity >= 4 ? " shine" : "") + '" style="animation-delay:' + i * 0.08 + 's;--rc:' + R[x.rarity].c + '">' + charHtml(c.id, n === 10 ? 58 : 130) + "<b>" + esc(c.name) + '</b><span class="rtag" style="--rc:' + R[x.rarity].c + '">' + R[x.rarity].n + "</span>" + (x.isNew ? '<span class="new">NEW</span>' : '<span class="dup">かけら+' + x.shards + "</span>") + "</div>"; }).join("") + '</div><div class="actions two"><button type="button" class="btn" id="gs-close">とじる</button>' + (pullsLeft() >= n ? '<button type="button" class="btn primary" id="gs-again">もう' + (n === 10 ? "10" : "1") + "回</button>" : '<button type="button" class="btn primary" id="gs-zukan">図鑑を見る</button>') + "</div></div>";
      $("#gs-close", fx).addEventListener("click", () => { fx.remove(); render(); });
      const ag = $("#gs-again", fx); if (ag) ag.addEventListener("click", () => { fx.remove(); doGacha(n); });
      const zk = $("#gs-zukan", fx); if (zk) zk.addEventListener("click", () => { fx.remove(); tab = "gacha"; render(); });
    };
    fx.addEventListener("click", (e) => { if (!opened) open(); });
    setTimeout(() => { const c = $("#cap", fx); if (c) c.classList.add("wiggle"); }, 100);
  }
  function openChar(id) {
    const c = GCArt.charById(id), e = state.chars[id]; if (!e) return;
    const st = e.star || 0, cost = STAR_COST[st];
    openSheet('<div class="cd ' + (c.rarity >= 5 ? "goldf" : "") + '">' + charHtml(id, 150, "bob r" + c.rarity + (c.rarity >= 4 ? " glow" : "")) + "</div><h2>" + esc(c.name) + " " + rarityTag(c.rarity) + starMarks(st) + '</h2><p class="small">' + esc(c.desc) + '</p><p class="small muted">出た回数 ' + e.n + " ・ かけら " + e.shards + (cost ? "（★" + (st + 1) + "まで " + cost + "）" : "（★MAX）") + '</p><div class="actions two"><button type="button" class="btn primary" id="cd-partner" ' + (state.partner === id ? "disabled" : "") + ">" + (state.partner === id ? "ホームのなかま" : "ホームに出す") + '</button><button type="button" class="btn gold" id="cd-star" ' + (cost && e.shards >= cost ? "" : "disabled") + ">★を上げる" + (cost ? "（かけら" + cost + "）" : "") + '</button></div><p class="small muted">★は見た目（成長した姿・キラキラ）が変わるだけです。</p>', {
      label: c.name,
      mount: (sh) => {
        $("#cd-partner", sh).addEventListener("click", () => { state.partner = id; save(); closeSheet(); toast(esc(c.name) + " がホームに来たよ"); render(); });
        $("#cd-star", sh).addEventListener("click", () => { const e2 = state.chars[id], cst = STAR_COST[e2.star || 0]; if (!cst || e2.shards < cst) return; e2.shards -= cst; e2.star = (e2.star || 0) + 1; save(); sound("fanfare"); closeSheet(true); openChar(id); render(); });
      },
    });
  }

  // ---------- 設定 ----------
  function viewSettings() {
    const p = GCArt.charById(state.partner), nb = Object.keys(state.bossWins || {}).length, nd = Object.values(state.progress).filter((x) => x.passed).length, st = state.settings;
    const ic = (e, c) => '<span class="ios-ic" style="background:' + c + '">' + e + "</span>";
    const tg = (k) => '<input type="checkbox" class="ios-sw" data-set="' + k + '" ' + (st[k] ? "checked" : "") + ">";
    const row = (e, c, label, right, opt = {}) => "<" + (opt.tag || "div") + ' class="ios-row' + (opt.cls ? " " + opt.cls : "") + '"' + (opt.attr || "") + ">" + ic(e, c) + '<span class="ios-l">' + label + (opt.sub ? "<small>" + opt.sub + "</small>" : "") + '</span><span class="ios-r">' + (right || "") + "</span></" + (opt.tag || "div") + ">";
    const nav = (e, c, label, act, val, sub) => row(e, c, label, (val ? '<span class="ios-v">' + val + "</span>" : "") + '<span class="ios-chev">›</span>', { tag: "button", attr: ' type="button" data-act="' + act + '"', sub });
    const grp = (title, rows, foot) => (title ? '<div class="ios-h">' + title + "</div>" : "") + '<div class="ios-group">' + rows.join("") + "</div>" + (foot ? '<p class="ios-f">' + foot + "</p>" : "");
    const gradeLabel = st.grade ? gradeName(st.grade) : "えらばない";
    let h = '<button type="button" class="ios-profile" data-act="set-profile">' + charHtml(p.id, 64, "r" + p.rarity) + '<span class="grow"><b class="me-n">' + esc(st.nick || "なまえ未設定") + '</b><span class="chip-t">🏅 ' + esc(titleName()) + '</span><small class="ios-sub">' + esc(gradeLabel) + " ・ プロフィールを編集</small></span><span class=\"ios-chev\">›</span></button>";
    h += '<div class="me-stats"><div><b class="num">' + state.totalStars + "</b><small>累計⭐</small></div><div><b class=\"num\">" + nd + "</b><small>合格ステップ</small></div><div><b class=\"num\">" + nb + "</b><small>ボス撃破</small></div><div><b class=\"num\">" + (state.bestCombo || 0) + "</b><small>最高コンボ</small></div></div>";
    if ((state.wrongBox || []).length) h += '<button type="button" class="box-card" data-act="box"><span class="bx-i">📦</span><span class="grow"><b>まちがえた問題ボックス</b><small>' + state.wrongBox.length + " 問 ・ これまでのクリア " + (state.boxCleared || 0) + ' 問</small></span><span class="go">▶</span></button>';
    h += '<div class="ios-h">アカウント</div><div id="acct-sec">' + (window.HMAuthUI ? HMAuthUI.sectionHtml() : "") + "</div>";
    const vol = st.vol == null ? 0.8 : st.vol, bv = st.bgmVol == null ? 0.5 : st.bgmVol;
    h += grp("サウンド", [
      row("🔔", "#ff6b6b", "効果音", tg("sound")),
      row("🔈", "#ff922b", "効果音の音量", '<input type="range" class="ios-range" min="0" max="1" step="0.1" id="vol" value="' + vol + '"><b class="ios-pct" id="vol-v">' + Math.round(vol * 100) + "</b>", { cls: "rng" }),
      row("🎵", "#cc5de8", "BGM", tg("bgm"), { sub: "メニューで流れるオリジナル曲" }),
      row("🎚️", "#845ef7", "BGMの音量", '<input type="range" class="ios-range" min="0" max="1" step="0.1" id="bgmvol" value="' + bv + '"><b class="ios-pct" id="bgmvol-v">' + Math.round(bv * 100) + "</b>", { cls: "rng" }),
      row("📳", "#5c7cfa", "振動", tg("haptic"), { sub: "対応している端末で、正解やミスのときにふるえます" }),
    ]);
    const perm = "Notification" in window ? Notification.permission : "none";
    h += grp("通知", [
      row("⏰", "#fab005", "毎日のおしらせ", tg("remind"), { sub: "その日の⭐が0のとき、時刻をすぎたらおしらせ" }),
      row("🕔", "#fd7e14", "おしらせの時刻", '<input type="time" class="ios-time" id="remind-at" value="' + esc(st.remindAt || "17:00") + '">'),
    ].concat(perm === "default" ? [nav("📣", "#20c997", "端末の通知を使う", "notif-perm", "", "アプリを開いていないタブのときも通知でおしらせ")] : perm === "granted" ? [row("📣", "#20c997", "端末の通知", '<span class="ios-v">オン</span>')] : []));
    const seg = (k, opts) => '<span class="ios-seg">' + opts.map(([v, l]) => '<button type="button" data-seg="' + k + '" data-v="' + v + '" class="' + (String(st[k]) === String(v) ? "on" : "") + '">' + l + "</button>").join("") + "</span>";
    h += grp("表示", [
      row("🔤", "#339af0", "文字の大きさ", seg("fs", [["s", "小"], ["m", "ふつう"], ["l", "大"], ["xl", "特大"]]), { cls: "segrow" }),
      row("🌀", "#22b8cf", "動きをへらす", tg("rmotion"), { sub: "アニメーションを短くします" }),
    ]);
    h += grp("学習", [
      nav("🎒", "#51cf66", "自分の学年", "set-grade", gradeLabel, "教科をえらぶと、その学年の単元がすぐ開きます"),
      row("💡", "#fcc419", "ヒントボタン", tg("hint"), { sub: "問題で「💡ヒント」を3段階まで出せます" }),
    ].concat((state.wrongBox || []).length ? [nav("📦", "#ff8787", "まちがえた問題ボックス", "box", state.wrongBox.length + "問")] : []));
    h += grp("データ", [
      nav("📤", "#4dabf7", "バックアップを書き出す", "backup", "", "記録をファイルに保存します"),
      nav("📥", "#748ffc", "バックアップから戻す", "restore", ""),
      row("🗑️", "#fa5252", '<span class="danger-t">すべてのデータを消す</span>', '<span class="ios-chev">›</span>', { tag: "button", attr: ' type="button" data-act="reset"' }),
    ]) + '<input type="file" id="restore-file" accept="application/json,.json" hidden>';
    h += grp("サポート", [
      nav("✉️", "#15aabf", "お問い合わせ", "contact", "", "メールで質問・ご意見を送れます"),
      nav("🚩", "#e8590c", "問題の報告", "reports", state.reports.length + "件", "「この問題おかしい？」で保存した報告"),
    ]);
    const cs = window.HM_CONSENT && HM_CONSENT.get ? HM_CONSENT.get() : null;
    h += grp("このアプリについて", [
      row("🔒", "#495057", "プライバシーポリシー", '<span class="ios-chev">›</span>', { tag: "a", attr: ' href="./privacy.html"', sub: cs && cs.t ? new Date(cs.t).toLocaleDateString("ja-JP") + "に同意" : "" }),
      row("📄", "#495057", "利用規約", '<span class="ios-chev">›</span>', { tag: "a", attr: ' href="./terms.html"' }),
      row("⚖️", "#495057", "ライセンス・表記", '<span class="ios-chev">›</span>', { tag: "a", attr: ' href="./legal.html"' }),
      nav("ℹ️", "#5c7cfa", "バージョン情報", "about", "v" + VERSION),
    ], "ほしの学園 v" + VERSION + " ・ 課金・広告なし");
    return h;
  }
  function openAbout() {
    openSheet('<h2>ほしの学園 <small class="muted">v' + VERSION + '</small></h2><p>小1〜中3の算数・数学、国語（漢字の書き練習）、生活、理科、社会、英語と、中学の技術・家庭・音楽・美術・保健体育。学習指導要領（平成29年告示）の内容にそって作っています。中学の中間・期末に合わせた100点満点の定期テストも用意しています。</p><p>⭐は1ステップ6割以上（切り上げ）で1こ（同じステップは1日1回）。⭐4こで、その日のゲームがひらきます。⭐はへりません。なかまや着せかえは見た目だけのごほうびです。</p><p><b>データの保存</b>：ログインしないときは、この端末の中（ブラウザ）にだけ保存します。ログインすると、記録を Firebase に保存して、ほかの端末と同期します。</p><p class="small muted">算数・数学の問題はプログラムで作り、答えを別の計算で確かめています。まちがいを見つけたら「この問題おかしい？」で教えてください。</p><p class="small legal-links"><a href="./privacy.html">プライバシーポリシー</a> ・ <a href="./terms.html">利用規約</a> ・ <a href="./legal.html">ライセンス・表記</a></p>', { label: "バージョン情報" });
  }
  function openProfile() {
    const st = state.settings;
    openSheet('<h2>プロフィール</h2><label class="field"><span>なまえ（マイページとチェスの友だち対戦で表示・12文字まで）</span><input class="input" id="nick" maxlength="12" value="' + esc(st.nick) + '"></label><div class="field"><span>学年</span>' + gradePicker() + '</div><p class="small muted">パートナーと称号は「なかま」でかえられます。</p><div class="actions"><button type="button" class="btn primary block" data-act="sheet-done">OK</button></div>', { label: "プロフィール", onClose: render });
  }
  function gradePicker() {
    const g = state.settings.grade || 0;
    return '<div class="grade-pick">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => '<button type="button" data-pick-grade="' + n + '" class="' + (n === g ? "on" : "") + '">' + (n ? gradeName(n) : "えらばない") + "</button>").join("") + "</div>";
  }
  function openReports() {
    let h = '<h2>問題の報告 <small class="muted">' + state.reports.length + "件</small></h2>";
    if (!state.reports.length) h += '<p class="small muted">「この問題おかしい？」で保存した報告がここに出ます。</p>';
    else h += '<div class="reports">' + state.reports.slice(0, 50).map((r, i) => '<div class="rep"><div class="small muted">' + new Date(r.t).toLocaleString("ja-JP") + " ・ " + esc(subjName(r.subj, r.grade) + gradeName(r.grade)) + " ・ " + esc(r.unit + "／" + r.step) + "</div><div>" + r.q + '</div><div class="small">アプリの正解：' + esc(r.a) + " ・ " + esc(r.kind) + (r.note ? " ・ " + esc(r.note) : "") + '</div><button type="button" class="link-btn" data-rep-del="' + i + '">消す</button></div>').join("") + "</div>";
    h += '<div class="actions two"><button type="button" class="btn" data-act="rep-copy" ' + (state.reports.length ? "" : "disabled") + '>報告をコピー</button><button type="button" class="btn" data-act="rep-dl" ' + (state.reports.length ? "" : "disabled") + ">ファイルに書き出す</button></div>";
    h += '<div class="actions"><button type="button" class="btn primary block" data-act="rep-mail" ' + (state.reports.length ? "" : "disabled") + ">メールで送る</button></div>";
    openSheet(h, { label: "問題の報告", onClose: render });
  }
  const CONTACT = "huishilichuan@gmail.com";
  function mailto(subject, body) { location.href = "mailto:" + CONTACT + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body); }
  function envText() { return "\n\n----\nほしの学園 v" + VERSION + "\n" + navigator.userAgent; }
  function openContact() {
    openSheet('<h2>お問い合わせ</h2><p class="small">質問・ご意見・不具合のお知らせは、メールで受けつけています。</p><div class="ios-group">' +
      '<button type="button" class="ios-row" data-mail="q"><span class="ios-ic" style="background:#15aabf">❓</span><span class="ios-l">質問・ご意見</span><span class="ios-r"><span class="ios-chev">›</span></span></button>' +
      '<button type="button" class="ios-row" data-mail="bug"><span class="ios-ic" style="background:#fa5252">🐞</span><span class="ios-l">不具合のお知らせ</span><span class="ios-r"><span class="ios-chev">›</span></span></button>' +
      '<button type="button" class="ios-row" data-mail="del"><span class="ios-ic" style="background:#495057">🗑️</span><span class="ios-l">データ削除の依頼</span><span class="ios-r"><span class="ios-chev">›</span></span></button>' +
      '</div><p class="small muted">送り先：' + CONTACT + "</p>", { label: "お問い合わせ" });
  }

  function download(name, text) {
    const blob = new Blob([text], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const reportText = () => state.reports.map((r) => [new Date(r.t).toLocaleString("ja-JP"), subjName(r.subj, r.grade) + gradeName(r.grade), r.unit + "／" + r.step, "問題：" + r.q.replace(/&[a-z#0-9]+;/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }[m] || m)), "アプリの正解：" + r.a, "種類：" + r.kind, r.note ? "メモ：" + r.note : ""].filter(Boolean).join("\n")).join("\n\n");

  // ---------- イベント ----------
  document.addEventListener("click", (e) => {
    const t = e.target;
    const tb = t.closest(".tab"); if (tb) { setTab(tb.dataset.tab); return; }
    if (t.closest("button")) haptic(6);
    if (t.closest("#back-btn")) {
      if (tab === "home" && modeNav.length) {
        const top = modeNav[modeNav.length - 1];
        if (top && (top.v === "test-new" || top.v === "test-edit")) readDraftInputs();
        modeNav.pop(); navDir = "back"; render(); window.scrollTo(0, 0); return;
      }
      nav.pop(); navDir = "back"; render(); window.scrollTo(0, 0); return;
    }
    if (t.closest("#gl-close")) { closeLayer(); return; }
    // クイズ
    if (t.closest("#quiz")) {
      const ctEl = t.closest("[data-ct]"); if (ctEl && handleColor(ctEl.dataset.ct, ctEl)) return;
      const kjEl = t.closest("[data-kj]"); if (kjEl && handleKj(kjEl.dataset.kj, kjEl)) return;
      const exEl = t.closest("[data-ex]"); if (exEl && handleExam(exEl.dataset.ex, exEl)) return;
      if (Q && (Q.mode === "color" || Q.mode === "kj50" || Q.mode === "exam")) {
        const a = t.closest("[data-q]"); if (a && a.dataset.q === "quit") quitQuiz();
        return;
      }
      const o = t.closest("[data-opt]"); if (o && Q) { const q = curList()[Q.i]; answer((q.opts || [q.a].concat(q.o))[+o.dataset.opt]); return; }
      if (Q && Q.card) { const cb = t.closest("[data-q]"); if (cb && cb.dataset.q === "card-go") { Q.card = false; showQ(); } else if (cb && cb.dataset.q === "quit") quitQuiz(); return; }
      if (Q && !Q.answered) { const hit = t.closest("[data-hit]"); if (hit && curList()[Q.i].t === "tap") { answer(hit.dataset.hit); return; } if (workClick(t)) return; }
      const k = t.closest("[data-key]");
      if (k && Q && !Q.answered) {
        const v = k.dataset.key;
        if (v === "ok") { answer(Q.input); return; }
        if (v === "del") Q.input = Q.input.slice(0, -1);
        else if (v === "-") Q.input = Q.input.startsWith("-") ? Q.input.slice(1) : "-" + Q.input;
        else if (Q.input.length < 12) Q.input += v;
        $("#ans-val").textContent = Q.input.replace(/^-/, "−");
        return;
      }
      const a = t.closest("[data-q]"); if (!a || !Q) return;
      const act = a.dataset.q;
      if (act === "say") { const q = curList()[Q.i]; speak(sayText(q)); a.classList.remove("on"); void a.offsetWidth; a.classList.add("on"); return; }
      if (act === "box-again") { startBox(); return; }
      if (act === "mock-again") { const t2 = testsArr().find((x) => x.id === Q.testId); if (t2) startMock(t2); return; }
      if (act === "hint") { showHint(); return; }
      if (act === "boss-again") { const b = [Q.s, Q.g, Q.ui]; startBoss(...b); return; }
      if (act === "submit") { if (!Q.answered && workDone()) answer(workResult()); }
      else if (act === "next") next();
      else if (act === "ex") { const w = $(".ex-wrap"); w.hidden = !w.hidden; a.textContent = w.hidden ? "💡 解説を見る" : "解説をとじる"; }
      else if (act === "report") reportQ();
      else if (act === "retry") startRetry();
      else if (act === "again") { const s = [Q.s, Q.g, Q.ui, Q.si]; startStep(...s, { noCard: true }); }
      else if (act === "nextstep") { const s = [Q.s, Q.g, Q.ui, Q.si + 1]; startStep(...s); }
      else if (act === "gacha") { quitQuiz(); tab = "gacha"; render(); doGacha(1); }
      else if (act === "quit") { if (Q.mode === "main" && Q.results.length && Q.results.length < Q.n && $(".qz-head")) { if (!confirm("やめますか？（このステップの結果は記録されません）")) return; } quitQuiz(); }
      return;
    }
    const m = t.closest("#main"); if (!m) return;
    const sb = t.closest("[data-subj]");
    if (sb) { tab = "study"; const my = state.settings.grade; nav = [{ v: "grades", s: sb.dataset.subj }]; if (my && gradesOf(sb.dataset.subj).includes(my)) nav.push({ v: "units", s: sb.dataset.subj, g: my }); render(); window.scrollTo(0, 0); return; }
    const gb = t.closest("[data-grade]"); if (gb) { const top = nav[nav.length - 1]; nav.push({ v: "units", s: top.s, g: +gb.dataset.grade }); render(); window.scrollTo(0, 0); return; }
    const ub = t.closest("[data-unit]"); if (ub) { const top = nav[nav.length - 1]; nav.push({ v: "steps", s: top.s, g: top.g, u: +ub.dataset.unit }); render(); window.scrollTo(0, 0); return; }
    const bb = t.closest("[data-boss]"); if (bb) { const top = nav[nav.length - 1]; startBoss(top.s, top.g, top.u); return; }
    const stb = t.closest("[data-step]"); if (stb) { const top = nav[nav.length - 1]; startStep(top.s, top.g, top.u, +stb.dataset.step); return; }
    const gm = t.closest("[data-game]"); if (gm) { openGameMenu(gm.dataset.game); return; }
    // ガチャ回数は data-gacha（1 / 10 / rates）。data-g は学年用なので、ここでは見ない
    const ga = t.closest("[data-gacha]"); if (ga) { if (ga.dataset.gacha === "rates") openRates(); else doGacha(+ga.dataset.gacha); return; }
    const ch = t.closest("[data-char]"); if (ch) { openChar(ch.dataset.char); return; }
    const bg = t.closest("button[data-bg]"); if (bg) { state.look.bg = bg.dataset.bg; save(); render(); return; }
    const mr = t.closest("button[data-maru]"); if (mr) { state.look.maru = mr.dataset.maru; save(); render(); bigMaru(); return; }
    const ti = t.closest("[data-title]"); if (ti) { state.look.title = ti.dataset.title; save(); render(); return; }
    const rd = t.closest("[data-rep-del]"); if (rd) { state.reports.splice(+rd.dataset.repDel, 1); save(); if (t.closest("#sheet-root")) openReports(); else render(); return; }
    const sg = t.closest("[data-seg]"); if (sg) { state.settings[sg.dataset.seg] = sg.dataset.v; save(); applyDisplay(); render(); return; }
    const pg = t.closest("[data-pick-grade]"); if (pg) { state.settings.grade = +pg.dataset.pickGrade; save(); $$("[data-pick-grade]").forEach((b) => b.classList.toggle("on", b === pg)); toast(state.settings.grade ? "🎒 " + gradeName(state.settings.grade) + "にしました" : "学年は「えらばない」にしました"); return; }
    const ml = t.closest("[data-mail]"); if (ml) { const k = ml.dataset.mail; mailto(k === "bug" ? "ほしの学園 不具合のお知らせ" : k === "del" ? "ほしの学園 データ削除の依頼" : "ほしの学園 質問・ご意見", (k === "bug" ? "どの画面で、何をしたら、どうなったか：\n" : k === "del" ? "削除したいアカウントのメールアドレス：\n" : "") + envText()); return; }
    const gn = t.closest("[data-genre]"); if (gn) { gameGenre = gn.dataset.genre; render(); return; }
    const ac = t.closest("[data-act]");
    if (ac) {
      const a = ac.dataset.act;
      if (a === "cont" && state.last) { const L = resolveLast(); startStep(L.s, L.g, L.u, L.st); }
      else if (a === "gacha") { tab = "gacha"; render(); }
      else if (a === "box") startBox();
      else if (a === "rep-copy") copyText(reportText());
      else if (a === "rep-dl") download("hoshigakuen-reports-" + today() + ".json", JSON.stringify({ app: "ほしの学園", version: VERSION, exported: new Date().toISOString(), reports: state.reports }, null, 1));
      else if (a === "about") openAbout();
      else if (a === "set-profile") openProfile();
      else if (a === "set-grade") openSheet("<h2>自分の学年</h2><p class=\"small muted\">教科をえらぶと、この学年の単元がすぐ開きます。</p>" + gradePicker(), { label: "学年", onClose: render });
      else if (a === "sheet-done") closeSheet();
      else if (a === "reports") openReports();
      else if (a === "contact") openContact();
      else if (a === "rep-mail") mailto("ほしの学園 問題の報告（" + state.reports.length + "件）", reportText() + envText());
      else if (a === "notif-perm") { try { Notification.requestPermission().then(() => render()); } catch (e) {} }
      else if (a === "backup") download("hoshigakuen-backup-" + today() + ".json", JSON.stringify(state));
      else if (a === "restore") $("#restore-file").click();
      else if (a === "reset") { if (confirm("すべてのデータ（⭐・なかま・記録）を消します。よろしいですか？") && confirm("本当に消しますか？もとに戻せません。")) { state = fresh(); save(); render(); toast("データを消しました"); } }
      else if (a === "mode-review") { modeNav = [{ v: "review" }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "mode-prep") { modeNav = [{ v: "prep" }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "mode-test") { modeNav = [{ v: "test" }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "mode-marks") { modeNav = modeNav.length ? modeNav.concat([{ v: "marks", s: "", g: prepGrade() }]) : [{ v: "marks", s: "", g: prepGrade() }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "mode-test-new") { testDraft = newDraft(); modeNav = [{ v: "test" }, { v: "test-new" }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "mode-test-edit") { const t2 = testsArr().find((x) => x.id === ac.dataset.id); if (!t2) return; testDraft = draftFromTest(t2); modeNav = [{ v: "test" }, { v: "test-one", id: t2.id }, { v: "test-edit" }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "mode-test-one") { modeNav = [{ v: "test" }, { v: "test-one", id: ac.dataset.id }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "prep-grade") { state.settings.grade = +ac.dataset.g; save(); toast("🎒 " + gradeName(state.settings.grade) + "にしました"); render(); }
      else if (a === "marks-g") { const cur = modeNav[modeNav.length - 1]; if (cur && cur.v === "marks") { cur.g = +ac.dataset.g; render(); } }
      else if (a === "marks-s") { const cur = modeNav[modeNav.length - 1]; if (cur && cur.v === "marks") { cur.s = ac.dataset.s || ""; render(); } }
      else if (a === "go-unit" || a === "go-unit-start") { goUnit(ac.dataset.s, +ac.dataset.g, +ac.dataset.ui, a === "go-unit-start"); }
      else if (a === "td-s") { readDraftInputs(); testDraft.pickS = ac.dataset.s; const gs = gradesOf(testDraft.pickS); if (!gs.includes(testDraft.pickG)) testDraft.pickG = gs[0] || testDraft.pickG; render(); }
      else if (a === "td-g") { readDraftInputs(); testDraft.pickG = +ac.dataset.g; render(); }
      else if (a === "td-tog") {
        readDraftInputs();
        const s = ac.dataset.s, g = +ac.dataset.g, ui = +ac.dataset.ui;
        const u = ((S()[s] || {})[g] || [])[ui]; if (!u) return;
        const i = testDraft.scope.findIndex((x) => x.s === s && x.g === g && (x.ui === ui || x.un === u.n));
        if (i >= 0) testDraft.scope.splice(i, 1); else testDraft.scope.push({ s, g, ui, un: u.n });
        render();
      }
      else if (a === "td-rm") { readDraftInputs(); testDraft.scope.splice(+ac.dataset.i, 1); render(); }
      else if (a === "td-save") saveDraftTest();
      else if (a === "test-del") { if (confirm("このテストを削除しますか？")) { state.tests = testsArr().filter((x) => x.id !== ac.dataset.id); save(); modeNav = [{ v: "test" }]; render(); toast("削除したよ"); } }
      else if (a === "mock-start") { const t2 = testsArr().find((x) => x.id === ac.dataset.id); if (t2) startMock(t2); }
      else if (a === "mode-color") { modeNav = [{ v: "color", s: "math", g: (prepGrade() >= 7 ? prepGrade() : 7) }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "mode-kj") { modeNav = [{ v: "kj", g: kjGrade() }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "mode-exam") { modeNav = [{ v: "exam", g: examDefaultGrade(), system: "3", kind: "mid1" }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "ex-g") { const top = modeNav[modeNav.length - 1]; if (top) { top.g = +ac.dataset.g; if (top.v === "exam-scope") top.scope = null; } render(); }
      else if (a === "ex-sys") { const top = modeNav.find((x) => x.v === "exam") || modeNav[modeNav.length - 1]; if (top) { top.system = ac.dataset.sys; const terms = HMExam.termsOf(top.system); if (!terms.some((x) => x.id === top.kind)) top.kind = terms[0].id; } render(); }
      else if (a === "ex-kind") { const top = modeNav.find((x) => x.v === "exam") || modeNav[modeNav.length - 1]; if (top) top.kind = ac.dataset.kind; render(); }
      else if (a === "ex-open") { const root = modeNav.find((x) => x.v === "exam") || { v: "exam", g: examDefaultGrade(), system: "3", kind: "mid1" }; modeNav = [root, { v: "exam-scope", s: ac.dataset.s, g: root.g, system: root.system, kind: root.kind }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "ex-tog") { const top = modeNav[modeNav.length - 1]; if (!top || top.v !== "exam-scope") return; const ui = +ac.dataset.ui, s = top.s, g = top.g, us = examUnits(s, g); if (!top.scope) top.scope = []; const i = top.scope.findIndex((x) => x.ui === ui); if (i >= 0) top.scope.splice(i, 1); else top.scope.push({ s, g, ui, un: us[ui].n }); render(); }
      else if (a === "ex-timer") { const top = modeNav[modeNav.length - 1]; if (top) top.timerOn = ac.dataset.on === "1"; render(); }
      else if (a === "ex-start") { const top = modeNav[modeNav.length - 1]; startExamPaper({ s: top.s, g: top.g, system: top.system, kind: top.kind, scope: top.scope, timerOn: top.timerOn !== false }); }
      else if (a === "ex-reg") registerExamTest();
      else if (a === "ex-hist") { const root = modeNav.find((x) => x.v === "exam") || { v: "exam", g: examDefaultGrade(), system: "3", kind: "mid1" }; modeNav = [root, { v: "exam-hist", g: root.g, s: "" }]; navDir = "fwd"; render(); window.scrollTo(0, 0); }
      else if (a === "ex-hist-g") { const top = modeNav[modeNav.length - 1]; if (top) top.g = +ac.dataset.g; render(); }
      else if (a === "ex-hist-s") { const top = modeNav[modeNav.length - 1]; if (top) top.s = ac.dataset.s; render(); }
      else if (a === "ex-from-test") { const t2 = testsArr().find((x) => x.id === ac.dataset.id); if (t2) startExamFromTest(t2, ac.dataset.s); }
      else if (a === "td-sys") { readDraftInputs(); if (testDraft) { testDraft.system = ac.dataset.sys; const terms = HMExam.termsOf(testDraft.system); if (!terms.some((x) => x.id === testDraft.kind)) testDraft.kind = terms[0].id; } render(); }
      else if (a === "td-kind") { readDraftInputs(); if (testDraft) testDraft.kind = ac.dataset.kind; render(); }
      else if (a === "td-exam-g") { readDraftInputs(); if (testDraft) testDraft.examG = +ac.dataset.g; render(); }
      else if (a === "td-preset") applyPresetToDraft();
      else if (a === "ct-g") { const cur = modeNav[modeNav.length - 1]; if (cur && cur.v === "color") { cur.g = +ac.dataset.g; const gs = gradesOf(cur.s || "math"); if (!gs.includes(cur.g)) { const f = SUBJ.find((x) => x.id !== "life" && gradesOf(x.id).includes(cur.g)); if (f) cur.s = f.id; } render(); } }
      else if (a === "ct-s") { const cur = modeNav[modeNav.length - 1]; if (cur && cur.v === "color") { cur.s = ac.dataset.s; render(); } }
      else if (a === "ct-start") { startColorTest(ac.dataset.s, +ac.dataset.g, +ac.dataset.ui); }
      else if (a === "kj-g") { const cur = modeNav[modeNav.length - 1]; if (cur && cur.v === "kj") { cur.g = ac.dataset.g === "M" ? "M" : +ac.dataset.g; render(); } }
      else if (a === "kj-round") { startKjRound(ac.dataset.key); }
      else if (a === "kj-start") { startKj(ac.dataset.mode, +ac.dataset.g); }
    }
  });
  document.addEventListener("change", (e) => {
    const s = e.target.closest("[data-set]"); if (s) { state.settings[s.dataset.set] = s.checked; if (s.dataset.set === "remind") state.settings.remindDone = null; save(); applyDisplay(); bgmUpdate(); return; }
    if (e.target.id === "vol") { state.settings.vol = +e.target.value; save(); sound("tap"); return; }
    if (e.target.id === "bgmvol") { state.settings.bgmVol = +e.target.value; save(); bgmUpdate(); return; }
    if (e.target.id === "remind-at") { state.settings.remindAt = e.target.value || "17:00"; state.settings.remindDone = null; save(); return; }
    if (e.target.id === "nick") { state.settings.nick = e.target.value.trim().slice(0, 12); save(); return; }
    if (e.target.id === "tm-name" || e.target.id === "tm-date") { readDraftInputs(); return; }
    if (e.target.id === "restore-file") {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((txt) => { const d = JSON.parse(txt); if (!d || typeof d !== "object" || !d.chars) throw new Error("bad"); state = migrate(d); save(); render(); toast("バックアップから戻しました"); }).catch(() => toast("読みこめませんでした"));
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "vol" || e.target.id === "bgmvol") { const v = $("#" + e.target.id + "-v"); if (v) v.textContent = Math.round(e.target.value * 100); if (e.target.id === "bgmvol") { state.settings.bgmVol = +e.target.value; bgmUpdate(); } }
  });
  document.addEventListener("keydown", (e) => {
    if (!Q || $("#quiz").hidden) return;
    if (e.key === "Enter" && Q.answered) { next(); e.preventDefault(); }
  });
  // 日付が変わったら表示を更新（⭐は日ごとに0から）
  let lastDay = today();
  setInterval(() => { if (today() !== lastDay) { lastDay = today(); render(); } }, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && today() !== lastDay) { lastDay = today(); render(); } });

  // ---------- ゲーム一覧（50） ----------
  const DROPPED = ["stroop", "calcbattle", "highlow", "nim", "hitblow", "memgrid", "pk", "shooter"];
  const GAMES = [
    { id: "climb", e: "🧗", n: "クライミング", c: "#6d8f5a", d: "左手・右手を交互に押して、CPUより先に頂上へ。落石に注意。" },
    { id: "chess", e: "♟️", n: "チェス", c: "#55606b", d: "キャスリングや昇格もある本格ルール。友だちとリンクで対戦も。" },
    { id: "arena", e: "⚔️", n: "アリーナバトル", c: "#b4664b", d: "ドラッグで動いて撃ち合う1対1。草むらに隠れて必殺技も。" },
    { id: "reversi", e: "⚫", n: "リバーシ", c: "#2e7d5b", d: "はさんで裏返す陣取り。角を取ると有利。" },
    { id: "gomoku", e: "⚪", n: "五目並べ", c: "#a8804f", d: "縦・横・ななめに5つ並べたら勝ち。" },
    { id: "shogi", e: "☗", n: "ミニ将棋", c: "#c9a227", d: "5×5の盤で遊ぶ将棋。取った駒は打てます。" },
    { id: "memory", e: "🃏", n: "神経衰弱", c: "#8a5cd6", d: "CPUと交代でめくって、同じ絵のペアを多く集めます。" },
    { id: "breakout", e: "🧱", n: "ブロック崩し", c: "#d9534f", d: "CPUより先にブロックを全部消せたら勝ち。" },
    { id: "mole", e: "🔨", n: "もぐらたたき", c: "#8d6e63", d: "出てきたもぐらをたたいて、CPUより高い点数を。" },
    { id: "runner", e: "🏃", n: "ランナー", c: "#ef8a3a", d: "タップでジャンプ。障害物をよけてCPUより先にゴール。" },
    { id: "g2048", e: "🔢", n: "2048", c: "#e0a030", d: "同じ数字を合体。CPUより少ない手数で目標の数字へ。" },
    { id: "sudoku", e: "🔠", n: "ナンプレ", c: "#3f8fd2", d: "縦・横・3×3に1〜9を1つずつ。CPUより先に解けたら勝ち。" },
    { id: "coin", e: "🪙", n: "コインパズル", c: "#c9a227", d: "同じコインを3つ並べて消す。CPUより高い得点で勝ち。" },
  ];
  (() => { const ext = ((window.HMGames && HMGames.list) || []).filter((g) => !DROPPED.includes(g.id)); for (let i = 0; i < GAMES.length; i++) { const r = ext.find((x) => x.id === GAMES[i].id); if (r) GAMES[i] = r; } ext.forEach((x) => { if (!GAMES.some((y) => y.id === x.id)) GAMES.push(x); }); })();
  // スプラッシュ（起動画面）を消す
  (() => { const sp = document.getElementById("splash"); if (!sp) return; const hide = () => { sp.classList.add("out"); setTimeout(() => sp.remove(), 500); }; setTimeout(hide, Math.max(150, 650 - performance.now())); })();
  window.HM_APP = { state: () => state, save, render, today, dkey, setClockOffset: (ms) => { clockOffset = ms; render(); }, GAMES, gachaPull, rates: () => ({ normal: GACHA_RATES.slice(), sr: GACHA_RATES_SR.slice() }), drawRarity, startStep, findStep, judgeNum, passNeed: HM.passNeed, STARS_TO_UNLOCK, READ_MS, starsToday, gamesOpen, pullsLeft, startGame, openGameMenu, gameRank, version: VERSION, quiz: () => Q, showQ: () => showQ(), tab: () => tab, exportState: () => JSON.parse(JSON.stringify(state)), importState: (d) => { state = migrate(JSON.parse(JSON.stringify(d))); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} render(); },
    // プロフィール（保存場所）を切りかえる。data があればそれを使い、なければその場所の記録を読む
    useProfile: (key, data, opt) => { KEY = key || GUEST_KEY; let d = data; if (d === undefined) { try { d = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { d = null; } } state = migrate(d ? JSON.parse(JSON.stringify(d)) : null); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} if (Q && !$("#quiz").hidden) { try { quitQuiz(); } catch (e) {} } if (opt && opt.home) { tab = "home"; nav = []; navDir = "tab"; } render(); },
    setAcct: (a) => { if (!a || !a.uid) return; const cur = state.acct || {}; if (cur.uid === a.uid && cur.email === a.email && cur.name === a.name && cur.provider === a.provider) return; state.acct = { uid: a.uid, email: a.email || "", name: a.name || "", provider: a.provider || "" }; save(); },
    profileKey: () => KEY, GUEST_KEY, charHtml, setTab: (t) => { tab = t; nav = []; render(); }, _ans: (ok) => { const q = curList()[Q.i]; Q.shownAt = -1e9; answer(q.t === "ch" ? (ok ? q.a : "__x__") : { ok, text: ok ? q.a : "x" }); }, sound, toast, haptic, openSheet, closeSheet, startBox, startBoss, startStep, speak, canSpeak, startColorTest, startKj, colorRec, kjGrade };

  // テスト用：?clock=+86400000 のように時計をずらせる
  try { const c = new URLSearchParams(location.search).get("clock"); if (c) clockOffset = +c || 0; } catch (e) {}
  render();
  // 新しい版：見つけたらすぐ入れかえる。勉強中・ゲーム中なら終わってから（すぐ更新するボタンも出す）
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const hadCtl = !!navigator.serviceWorker.controller; let reloading = false, pending = false;
    const busy = () => { const q = $("#quiz"), g = $(".game-layer"); return !!((q && !q.hidden) || (g && !g.hidden) || $("#consent")); };
    const apply = () => { if (reloading) return; reloading = true; try { if (window.HMSync) HMSync.flush("hidden"); } catch (e) {} setTimeout(() => location.reload(), 150); };
    const bar = () => {
      if ($("#upd-bar")) return;
      const d = document.createElement("div"); d.id = "upd-bar"; d.className = "upd-bar"; d.setAttribute("role", "status");
      d.innerHTML = '<span>✨ 新しいバージョンがあります</span><button type="button" class="upd-go">更新する</button>';
      d.querySelector(".upd-go").addEventListener("click", apply); document.body.appendChild(d);
    };
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadCtl || reloading) return;
      if (!busy()) return apply();
      pending = true; bar();
      const iv = setInterval(() => { if (pending && !busy()) { clearInterval(iv); apply(); } }, 1500);
    });
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      const chk = () => { try { reg.update().catch(() => {}); } catch (e) {} };
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") chk(); });
      setInterval(chk, 20 * 60000);
    }).catch(() => {});
  }
})();
