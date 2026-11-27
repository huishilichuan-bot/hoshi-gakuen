/* ほしの学園 — 相棒（8人）・コイン・きせかえ・仲良し度・ログインのあいさつ・ライバル・ストーリー・学園の空 */
(() => {
  "use strict";
  const D = window.HMGK_DATA || { CHARS: [] };
  const CHARS = D.CHARS;
  const A = () => window.HM_APP;
  const S = () => A().state();
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fmtN = (n) => Number(n || 0).toLocaleString("ja-JP");
  const byId = (id) => CHARS.find((c) => c.id === id) || null;
  const img = (id) => "./img/gk/" + id + ".webp";
  const faceImg = (id) => "./img/gk/" + id + "-face.webp";

  // 学習単元の合格数に応じた「すがた」段階（きせかえ・仲良し度とは別。全相棒で同じレベル）
  const LOOK = {
    per: 50, max: 10,
    names: ["ねぼすけ", "よれたシャツ", "きてみた制服", "きちんと通学", "決まりはじめ", "自信のまなざし", "赤いジャージ", "星のきざし", "星の制服", "星の英雄"],
    teacherNames: ["ねぼすけ", "よれたシャツ", "きてみたベスト", "きちんと出勤", "決まりはじめ", "自信のまなざし", "赤いジャージ", "星のきざし", "星の制服", "星の英雄"],
  };
  function passedSections() {
    try {
      const p = (S() || {}).progress || {};
      return Object.values(p).filter((x) => x && x.passed).length;
    } catch (e) { return 0; }
  }
  function lookLv(n) {
    const s = n == null ? passedSections() : n;
    return Math.min(LOOK.max, 1 + Math.floor(s / LOOK.per));
  }
  function lookName(cid, lv) {
    const c = byId(cid);
    const names = c && c.role === "t" ? LOOK.teacherNames : LOOK.names;
    return names[Math.max(0, Math.min(names.length - 1, (lv || 1) - 1))];
  }
  const lookPad = (lv) => String(lv).padStart(2, "0");
  const lookSrc = (id, lv) => "./img/gk/look/" + id + "-lv" + lookPad(lv) + ".webp";
  const lookFaceSrc = (id, lv) => "./img/gk/look/" + id + "-lv" + lookPad(lv) + "-face.webp";
  function lookProg(cid) {
    const s = passedSections(), lv = lookLv(s), maxed = s >= (LOOK.max - 1) * LOOK.per;
    const into = maxed ? LOOK.per : (s % LOOK.per);
    return { s, lv, name: lookName(cid, lv), into, per: LOOK.per, maxed };
  }
  function lookBarHtml(cid) {
    const p = lookProg(cid);
    let h = '<div class="gk-look"><div class="gk-look-h">すがた <b>Lv' + p.lv + "</b> " + esc(p.name) + "</div>";
    h += '<span class="gk-bar" aria-hidden="true"><i style="width:' + Math.round((p.maxed ? 1 : p.into / p.per) * 100) + '%"></i></span>';
    h += "<small>" + (p.maxed ? String(p.s) : (p.into + "/" + p.per)) + "</small></div>";
    return h;
  }

  // ---------- ルール（固定の数字） ----------
  const R = { correct: 10, c5: 20, c10: 50, daily: 30, week7: 200, rivalWin: 100, bondCorrect: 1, bondC10: 10, perLv: 100, maxLv: 10 };
  const TITLES = ["はじめまして", "顔見知り", "知り合い", "なかよし", "信頼できる仲", "息ぴったり", "心強い味方", "大切な仲間", "かけがえのない存在", "最高の相棒"];
  const STORY_LV = [4, 7, 10];
  const UNLOCKS = [
    [2, "💬", "新しいセリフ"], [3, "🔊", "声で話してくれる"], [4, "📖", "ストーリー 第1話"], [5, "⭐", "星の制服（無料でもらえる）"],
    [7, "📖", "ストーリー 第2話"], [10, "📖", "ストーリー 第3話"], [10, "😊", "最高の笑顔"], [10, "🌌", "特別衣装「星座のマント」"],
  ];
  // きせかえ（ガチャなし・コインで直接交換。持っている衣装はいつでも自由に着がえられる）
  const OUTFITS = [
    { id: "base", n: "いつもの服", cat: "base", price: 0, fx: ["✨"], d: "いつものすがた" },
    { id: "casual", n: "私服", cat: "normal", price: 300, fx: ["☕", "🎧", "✨"], d: "休日の街あるきコーデ" },
    { id: "summer", n: "夏服", cat: "normal", price: 300, fx: ["🌻", "☀️", "🫧"], d: "半そでTシャツとひざ丈ハーフパンツの夏コーデ" },
    { id: "winter", n: "冬服", cat: "normal", price: 300, fx: ["❄️", "⛄", "✨"], d: "あったかいコートとマフラー" },
    { id: "jersey", n: "ジャージ", cat: "normal", price: 300, fx: ["⚽", "🏅", "💨"], d: "体育祭の学園ジャージ" },
    { id: "yukata", n: "浴衣", cat: "special", price: 800, fx: ["🎆", "🏮", "🎐"], d: "夏祭りの浴衣と花火" },
    { id: "party", n: "パーティー服", cat: "special", price: 800, fx: ["🎉", "🎈", "✨"], d: "学園パーティーのおめかし" },
    { id: "staruni", n: "星の制服", cat: "special", price: 800, freeLv: 5, fx: ["⭐", "🌟", "💫"], d: "星の紋章つきの特別な制服（仲良し度Lv5で無料）" },
    { id: "sakura", n: "桜の春コーデ", cat: "season", price: 1500, months: [3, 4, 5], fx: ["🌸", "🌸", "✨"], d: "春だけの限定・桜色のコート" },
    { id: "tanabata", n: "天の川の甚平", cat: "season", price: 1500, months: [6, 7, 8], fx: ["🎋", "🌠", "✨"], d: "夏だけの限定・七夕の甚平" },
    { id: "tsukimi", n: "お月見の羽織", cat: "season", price: 1500, months: [9, 10, 11], fx: ["🌕", "🍡", "🍂"], d: "秋だけの限定・月夜の羽織" },
    { id: "seiya", n: "聖夜のケープ", cat: "season", price: 1500, months: [12, 1, 2], fx: ["❄️", "🎄", "🌟"], d: "冬だけの限定・あたたかいケープ" },
    { id: "best", n: "星座のマント", cat: "bond", price: 0, freeLv: 10, fx: ["🌌", "💖", "🌟"], d: "最高の相棒だけの特別衣装（仲良し度Lv10）" },
  ];
  const CAT_N = { base: "", normal: "ふつうの衣装", special: "特別な衣装", season: "季節限定", bond: "仲良し限定" };
  const outfitById = (id) => OUTFITS.find((o) => o.id === id) || OUTFITS[0];

  // ---------- 保存（state.gk） ----------
  function G() {
    const st = S();
    let g = st.gk;
    if (!g || typeof g !== "object") g = st.gk = {};
    if (!g.coins || typeof g.coins !== "object") g.coins = { e: 0, s: 0 };
    for (const k of ["owned", "wear", "bond", "rival", "seen"]) if (!g[k] || typeof g[k] !== "object" || Array.isArray(g[k])) g[k] = {};
    if (!g.login || typeof g.login !== "object") g.login = { last: "", streak: 0, best: 0 };
    g.correct = +g.correct || 0;
    if (g.partner && !byId(g.partner)) g.partner = null;
    return g;
  }
  const bal = () => { const g = G(); return Math.max(0, (+g.coins.e || 0) - (+g.coins.s || 0)); };
  const earn = (n) => { G().coins.e = (+G().coins.e || 0) + n; };
  const partner = () => byId(G().partner);
  const bondOf = (id) => +G().bond[id] || 0;
  const lvOf = (id) => Math.min(R.maxLv, 1 + Math.floor(bondOf(id) / R.perLv));
  const lvProg = (id) => (lvOf(id) >= R.maxLv ? 1 : (bondOf(id) % R.perLv) / R.perLv);
  const titleOf = (lv) => TITLES[Math.max(0, Math.min(9, lv - 1))];
  const today = () => A().today();
  const dateOf = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const keyOf = (dt) => A().dkey(dt.getTime());
  const month = () => dateOf(today()).getMonth() + 1;
  function weekKey() { const d = dateOf(today()); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return keyOf(d); }
  function weekLeft() { const d = dateOf(today()); return 7 - ((d.getDay() + 6) % 7); }
  const userLv = () => { const c = G().correct; return c < 300 ? 0 : c < 1500 ? 1 : 2; };
  const rivalTarget = () => [10, 15, 20][userLv()];
  const rivalRec = () => { const g = G(), k = weekKey(); return (g.rival[k] = g.rival[k] || { best: 0, won: 0 }); };
  function owned(cid, oid) {
    const o = outfitById(oid);
    if (o.id === "base") return true;
    if (o.freeLv && lvOf(cid) >= o.freeLv) return true;
    return (G().owned[cid] || []).includes(oid);
  }
  const wearing = (cid) => { const w = G().wear[cid]; return w && owned(cid, w) ? w : "base"; };
  const inSeason = (o) => !o.months || o.months.includes(month());
  const nick = () => String((S().settings || {}).nick || "").trim();
  function fill(c, t, extra) {
    return String(t).replace(/\{y\}/g, c.you(nick())).replace(/\{d\}/g, (extra && extra.d) || G().login.streak || 1).replace(/\{c\}/g, (extra && extra.c) || 0).replace(/\{t\}/g, rivalTarget());
  }
  const line = (c, k, extra) => { const a = c.L[k]; return a ? fill(c, Array.isArray(a) ? pick(a) : a, extra) : ""; };

  // 学園の空：正解するほど星が増えて明るくなる
  const SKY_AT = [0, 10, 30, 60, 100, 160, 250, 400, 600, 900];
  const skyLv = () => { const c = G().correct; let lv = 1; SKY_AT.forEach((t, i) => { if (c >= t) lv = i + 1; }); return lv; };
  function skySvg(lv, n) {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cnt = Math.min(160, 6 + n);
    let s = '<svg class="gk-sky-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
      '<radialGradient id="gk-glow" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="#ffd6a5" stop-opacity="' + (0.04 + lv * 0.035).toFixed(2) + '"/><stop offset="1" stop-color="#ffd6a5" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="gk-mw" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#c5b3ff" stop-opacity="0"/><stop offset=".5" stop-color="#e5dbff" stop-opacity="' + (lv >= 6 ? 0.22 + (lv - 6) * 0.06 : 0) + '"/><stop offset="1" stop-color="#c5b3ff" stop-opacity="0"/></linearGradient></defs>' +
      '<rect width="400" height="300" fill="url(#gk-glow)"/>' + (lv >= 6 ? '<rect x="-60" y="60" width="520" height="70" fill="url(#gk-mw)" transform="rotate(-18 200 150)"/>' : "");
    for (let i = 0; i < cnt; i++) {
      const x = (rnd() * 400).toFixed(1), y = (rnd() * 230).toFixed(1), big = i < 6 + lv * 2 && rnd() < 0.5, r = big ? 1.6 + rnd() * 1.2 : 0.5 + rnd() * 0.9;
      const tw = rnd() < 0.35 ? ' class="tw" style="animation-delay:' + (rnd() * 4).toFixed(2) + 's"' : "";
      s += big ? '<path' + tw + ' d="M' + x + " " + (y - r * 2.2) + "L" + (+x + r * 0.5) + " " + (y - r * 0.5) + "L" + (+x + r * 2.2) + " " + y + "L" + (+x + r * 0.5) + " " + (+y + r * 0.5) + "L" + x + " " + (+y + r * 2.2) + "L" + (x - r * 0.5) + " " + (+y + r * 0.5) + "L" + (x - r * 2.2) + " " + y + "L" + (x - r * 0.5) + " " + (y - r * 0.5) + 'Z" fill="#fff6d6"/>' : "<circle" + tw + ' cx="' + x + '" cy="' + y + '" r="' + r.toFixed(2) + '" fill="#fff"/>';
    }
    if (lv >= 4) s += '<g class="gk-moon"><circle cx="338" cy="52" r="20" fill="#fff4c2"/><circle cx="346" cy="46" r="18" fill="#2b2a6b" opacity=".0"/><circle cx="338" cy="52" r="30" fill="#fff4c2" opacity=".12"/></g>';
    s += "</svg>";
    if (lv >= 7) s += '<i class="gk-shoot"></i><i class="gk-shoot s2"></i>';
    return s;
  }
  function schoolSvg(lv) {
    const win = [];
    const lit = Math.min(18, 3 + lv * 2);
    let k = 0;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) { const x = 92 + col * 36 + (col > 2 ? 44 : 0), y = 232 + row * 18; win.push('<rect x="' + x + '" y="' + y + '" width="14" height="9" rx="1.5" class="' + (k++ < lit ? "on" : "") + '"/>'); }
    return '<svg class="gk-school-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<path d="M0 300 L0 268 Q60 252 120 262 Q200 246 280 258 Q340 250 400 262 L400 300Z" fill="#141336"/>' +
      '<rect x="80" y="222" width="240" height="78" fill="#1d1b4a"/><rect x="176" y="176" width="48" height="124" fill="#232158"/>' +
      '<path d="M170 178 L200 150 L230 178Z" fill="#232158"/><circle cx="200" cy="196" r="11" fill="#fff3bf" class="clock"/><path d="M200 189 V196 H205" stroke="#232158" stroke-width="2" fill="none"/>' +
      '<path d="M200 150 V138" stroke="#fff3bf" stroke-width="2"/><path d="M200 128 l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7-5.9-3.7-5.9 3.7 1.7-6.7-5.3-4.4 6.9-.5z" fill="#ffd43b" class="topstar"/>' +
      '<g class="gk-win">' + win.join("") + "</g></svg>";
  }

  // ---------- 見た目の部品 ----------
  function face(size, cls, cid, lv) {
    const c = byId(cid || G().partner) || CHARS[0];
    const src = lookFaceSrc(c.id, lv || lookLv());
    return '<span class="gk-face ' + (cls || "") + '" style="width:' + size + "px;height:" + size + "px;--gc:" + c.color + '"><img src="' + src + '" alt="' + esc(c.name) + '" loading="lazy" decoding="async"></span>';
  }
  function fxSpans(o, n) { let h = '<span class="gk-fx" aria-hidden="true">'; for (let i = 0; i < n; i++) h += '<i style="--i:' + i + ";--x:" + ((i * 37) % 100) + "%;--d:" + (4 + (i % 4) * 1.3).toFixed(1) + 's">' + o.fx[i % o.fx.length] + "</i>"; return h + "</span>"; }
  function stage(c, opt) {
    opt = opt || {};
    const oid = opt.outfit || wearing(c.id), o = outfitById(oid), lv = lvOf(c.id), best = lv >= R.maxLv && (oid === "best" || opt.best);
    const useLook = oid === "base";
    const src = useLook ? lookSrc(c.id, opt.look || lookLv()) : img(c.id);
    return '<div class="gk-stage o-' + o.id + (best ? " best" : "") + (useLook ? " look" + (opt.look || lookLv()) : "") + (opt.cls ? " " + opt.cls : "") + '" style="--gc:' + c.color + '">' + '<span class="gk-aura"></span>' + fxSpans(o, opt.fxn || 8) +
      '<img class="gk-body" src="' + src + '" alt="' + esc(c.name) + '" decoding="async"' + (opt.eager ? "" : ' loading="lazy"') + ">" + (o.id !== "base" ? '<span class="gk-coord">' + esc(o.n) + "</span>" : "") + "</div>";
  }
  function hearts(cid, small) {
    const lv = lvOf(cid), p = lvProg(cid);
    let h = '<div class="gk-bond' + (small ? " sm" : "") + '"><div class="gk-hearts" aria-label="仲良し度 Lv' + lv + '">';
    for (let i = 1; i <= 10; i++) h += '<i class="' + (i <= lv ? "on" : "") + '">♥</i>';
    h += '</div><div class="gk-bond-r"><b>Lv' + lv + " " + esc(titleOf(lv)) + "</b>" + (lv < R.maxLv ? '<span class="gk-bar"><i style="width:' + Math.round(p * 100) + '%"></i></span><small>次まで ' + (R.perLv - (bondOf(cid) % R.perLv)) + "</small>" : "<small>最高の相棒！</small>") + "</div></div>";
    return h;
  }
  const coinChip = () => '<span class="gk-chip coin" data-gk="rules">🪙 <b>' + fmtN(bal()) + "</b></span>";

  // ---------- ホーム ----------
  function homeHero() {
    const c = partner();
    if (!c) return '<section class="gk-hero empty"><div class="gk-sky">' + skySvg(1, 0) + '</div><div class="gk-school">' + schoolSvg(1) + '</div><div class="gk-empty"><b>相棒をえらぼう</b><button type="button" class="btn primary" data-gk="intro">えらぶ</button></div></section>';
    const lv = lvOf(c.id), sl = skyLv(), g = G();
    const ln = lv >= 2 && Math.random() < 0.5 ? line(c, "tap2") : line(c, lv >= 5 ? "high" : timeKey());
    return '<section class="gk-hero sky' + sl + '" style="--gc:' + c.color + '"><div class="gk-sky">' + skySvg(sl, g.correct) + '</div><div class="gk-school">' + schoolSvg(sl) + "</div>" +
      '<div class="gk-top">' + coinChip() + '<span class="gk-chip">✨ 学園の空 Lv' + sl + "</span></div>" +
      '<div class="gk-bub" id="gk-bub">' + esc(ln) + "</div>" +
      '<button type="button" class="gk-stand" id="gk-partner" data-gk="tap" aria-label="' + esc(c.call) + 'にタッチ">' + stage(c, { eager: true, fxn: 6 }) + "</button>" +
      '<div class="gk-plate"><div class="gk-name"><b>' + esc(c.name) + "</b><small>" + esc(c.roleN) + "</small></div>" + hearts(c.id, true) + lookBarHtml(c.id) + "</div>" +
      '<div class="gk-skycap">正解すると、学園の空に星が増えていくよ ・ 星 ' + fmtN(Math.min(160, 6 + g.correct)) + "こ</div></section>" + rivalCard();
  }
  function rivalCard() {
    const r = rivalRec(), t = rivalTarget(), sh = byId("shota"), k = Math.min(1, r.best / t);
    return '<button type="button" class="gk-rival' + (r.won ? " won" : "") + '" data-gk="rival">' + face(48, "", "shota") + '<span class="grow"><b>' + (r.won ? "🏆 今週の勝負に勝った！" : "🔥 翔太からの挑戦状") + "</b><small>" +
      (r.won ? "+" + R.rivalWin + " コインゲット ・ 来週もまた勝負っす！" : "今週の最高連続正解 " + r.best + " / " + t + " 問 ・ のこり" + weekLeft() + "日") + '</small><span class="gk-rbar"><i style="width:' + Math.round(k * 100) + '%"></i></span></span><span class="go">▶</span></button>' + (sh ? "" : "");
  }
  function timeKey() { const h = new Date(Date.now()).getHours(); return h >= 5 && h < 10 ? "morning" : h < 17 && h >= 10 ? "day" : h >= 17 && h < 20 ? "evening" : "night"; }

  // ---------- 相棒タブ ----------
  function view() {
    const c = partner();
    if (!c) return '<div class="gk-pv"><p class="muted">相棒をえらぶと、ここで着がえやストーリーが見られるよ。</p><button type="button" class="btn primary block" data-gk="intro">相棒をえらぶ</button></div>';
    const lv = lvOf(c.id);
    let h = '<div class="gk-pv"><section class="gk-card" style="--gc:' + c.color + '"><div class="gk-card-top">' + coinChip() + '<button type="button" class="gk-chip" data-gk="rules">❔ コインのため方</button></div>' +
      '<div class="gk-card-stage">' + stage(c, { eager: true, fxn: 10 }) + "</div>" +
      '<div class="gk-card-info"><div class="gk-name lg"><b>' + esc(c.name) + "</b><small>" + esc(c.kana) + " ・ " + esc(c.roleN) + '</small></div><div class="gk-tag">' + esc(c.tag) + "</div>" + hearts(c.id) + lookBarHtml(c.id) +
      '<div class="gk-say" id="gk-say">「' + esc(line(c, lv >= 2 ? "tap2" : "tap1")) + "」</div>" +
      '<div class="gk-row-btns"><button type="button" class="btn sm ghost" data-gk="talk">💬 話しかける</button>' + (lv >= 3 ? '<button type="button" class="btn sm ghost" data-gk="voice">' + (G().voice === 0 ? "🔇 声：オフ" : "🔊 声：オン") + "</button>" : "") + '<button type="button" class="btn sm ghost" data-gk="prof" data-c="' + c.id + '">📝 プロフィール</button></div></div></section>';
    // きせかえ
    h += '<div class="sec">きせかえ <span class="muted small">持っている服はいつでも着がえられるよ</span></div><div class="gk-outfits">';
    for (const o of OUTFITS) {
      const have = owned(c.id, o.id), on = wearing(c.id) === o.id, season = o.cat === "season", avail = inSeason(o);
      if (season && !avail && !have) continue;
      let st = "";
      if (on) st = '<span class="gk-ost on">着ている</span>';
      else if (have) st = '<span class="gk-ost have">着がえる</span>';
      else if (o.freeLv) st = '<span class="gk-ost lock">Lv' + o.freeLv + "で無料</span>";
      else st = '<span class="gk-ost buy' + (bal() >= o.price ? "" : " short") + '">🪙 ' + fmtN(o.price) + "</span>";
      h += '<button type="button" class="gk-oc o-' + o.id + (on ? " on" : "") + (have ? " have" : "") + '" data-gk="' + (have ? "wear" : o.freeLv ? "lockinfo" : "buy") + '" data-o="' + o.id + '">' +
        '<span class="gk-oc-prev">' + fxSpans(o, 3) + face(46, "", c.id) + "</span><b>" + esc(o.n) + "</b>" + (CAT_N[o.cat] ? '<small class="gk-cat c-' + o.cat + '">' + CAT_N[o.cat] + (season ? " " + o.months.join("・") + "月" : "") + "</small>" : "<small>&nbsp;</small>") + st + "</button>";
    }
    h += "</div>";
    h += lookZukan(c.id);
    // ストーリー
    h += '<div class="sec">' + esc(c.call) + "のストーリー</div><div class=\"gk-stories\">";
    c.story.forEach((ch, i) => { const ok = lv >= STORY_LV[i], read = G().seen["st:" + c.id + ":" + i]; h += '<button type="button" class="gk-st' + (ok ? "" : " lock") + '" data-gk="' + (ok ? "story" : "lockinfo") + '" data-ch="' + i + '" data-need="' + STORY_LV[i] + '"><span class="gk-st-n">' + (ok ? "📖" : "🔒") + '</span><span class="grow"><b>' + esc(ch.t) + "</b><small>" + (ok ? (read ? "読んだ" : "NEW！ 読めるよ") : "仲良し度 Lv" + STORY_LV[i] + " で解放") + "</small></span></button>"; });
    h += "</div>";
    // 解放リスト
    h += '<div class="sec">仲良し度で解放されること</div><div class="gk-unl">' + UNLOCKS.map((u) => '<div class="gk-u' + (lv >= u[0] ? " ok" : "") + '"><span>' + u[1] + "</span><b>Lv" + u[0] + "</b><em>" + esc(u[2]) + "</em><i>" + (lv >= u[0] ? "✔" : "") + "</i></div>").join("") + "</div>";
    // 相棒をかえる
    h += '<div class="sec">相棒をかえる <span class="muted small">いつでも変えられるよ・仲良し度は人ごとに残る</span></div><div class="gk-pick">' +
      CHARS.map((x) => '<button type="button" class="gk-pc' + (x.id === c.id ? " on" : "") + '" data-gk="prof" data-c="' + x.id + '" style="--gc:' + x.color + '">' + face(64, "", x.id) + "<b>" + esc(x.name) + "</b><small>" + esc(x.roleN) + '</small><span class="gk-pc-lv">♥ Lv' + lvOf(x.id) + "</span></button>").join("") + "</div>";
    h += '<p class="foot">コインは勉強でたまるよ（課金はありません）</p></div>';
    return h;
  }

  function lookZukan(cid) {
    const cur = lookLv();
    let h = '<div class="sec">すがたずかん <span class="muted small">いま すがた Lv' + cur + " " + esc(lookName(cid, cur)) + '</span></div><div class="gk-zukan">';
    for (let i = 1; i <= LOOK.max; i++) {
      const ok = i <= cur, nm = lookName(cid, i);
      if (ok) {
        h += '<button type="button" class="gk-zk" data-gk="look" data-lv="' + i + '" data-c="' + cid + '"><img src="' + lookFaceSrc(cid, i) + '" alt="Lv' + i + " " + esc(nm) + '"><b>Lv' + i + "</b><small>" + esc(nm) + "</small></button>";
      } else {
        h += '<button type="button" class="gk-zk is-lock" data-gk="looklock" data-lv="' + i + '"><img class="sil" src="' + lookFaceSrc(cid, i) + '" alt=""><b>Lv' + i + "</b><small>　</small></button>";
      }
    }
    return h + "</div>";
  }
  function lookSheet(cid, lv) {
    const c = byId(cid) || partner();
    if (!c || lv < 1 || lv > lookLv()) return;
    A().openSheet('<div class="gk-looksheet" style="--gc:' + c.color + '">' + stage(c, { eager: true, fxn: 8, outfit: "base", look: lv, cls: "prof" }) +
      "<h2>すがた <b>Lv" + lv + "</b></h2><p>" + esc(lookName(c.id, lv)) + "</p></div>", { label: "すがた Lv" + lv });
  }

  // ---------- 声（仲良し度Lv3から） ----------
  function say(c, text) {
    try {
      if (!c || lvOf(c.id) < 3 || G().voice === 0 || !S().settings.sound) return;
      if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[「」]/g, ""));
      u.lang = "ja-JP"; u.pitch = c.pitch || 1; u.rate = c.rate || 1; u.volume = Math.max(0.2, +S().settings.vol || 0.8);
      const v = (speechSynthesis.getVoices() || []).find((x) => /^ja/i.test(x.lang)); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- 正解・まちがいのとき ----------
  let lastCheer = 0;
  function onAnswer(ok, combo) {
    const g = G(), c = partner(), ev = { coins: 0, lvUp: 0, rivalWin: false, bonus: [] };
    if (!ok) { if (c && Math.random() < 0.6) cheer(c, line(c, "ng")); return ev; }
    const lv0 = c ? lvOf(c.id) : 0;
    g.correct++; earn(R.correct); ev.coins += R.correct;
    if (c) g.bond[c.id] = bondOf(c.id) + R.bondCorrect;
    if (combo === 5) { earn(R.c5); ev.coins += R.c5; ev.bonus.push("5問連続ボーナス +" + R.c5); }
    if (combo > 0 && combo % 10 === 0) { earn(R.c10); ev.coins += R.c10; ev.bonus.push(combo + "問連続ボーナス +" + R.c10); if (c) g.bond[c.id] = bondOf(c.id) + R.bondC10; }
    const r = rivalRec(); if (combo > r.best) r.best = combo;
    if (!r.won && r.best >= rivalTarget()) { r.won = 1; earn(R.rivalWin); ev.coins += R.rivalWin; ev.rivalWin = true; }
    if (c && lvOf(c.id) > lv0) ev.lvUp = lvOf(c.id);
    // 画面の演出（Lvアップ・勝利の大きな演出は、問題が終わってから）
    if (c) {
      if (ev.lvUp) { const lv = ev.lvUp; queue.push(() => levelUp(c, lv)); cheer(c, "💖 仲良し度 Lv" + lv + "！ " + line(c, "lvup"), true); }
      else if (combo === 5 || combo === 10 || (combo > 10 && combo % 10 === 0)) cheer(c, line(c, combo >= 10 ? "c10" : "c5"), true);
      else if (Date.now() - lastCheer > 9000 && Math.random() < 0.45) cheer(c, line(c, "ok"));
    }
    if (ev.rivalWin) { queue.push(rivalWin); ev.bonus.push("🏆 ライバルに勝利 +" + R.rivalWin); }
    coinPop(ev.coins, ev.bonus);
    return ev;
  }
  function coinPop(n, bonus) {
    if (!n) return;
    const d = document.createElement("div"); d.className = "gk-coinpop"; d.innerHTML = "+" + n + " 🪙" + (bonus && bonus.length ? "<small>" + bonus.map(esc).join("<br>") + "</small>" : "");
    document.body.appendChild(d); setTimeout(() => d.remove(), 1700);
  }
  function cheer(c, text, big) {
    lastCheer = Date.now();
    document.querySelectorAll(".gk-cheer").forEach((x) => x.remove());
    const d = document.createElement("div"); d.className = "gk-cheer" + (big ? " big" : ""); d.style.setProperty("--gc", c.color);
    d.innerHTML = face(52, "", c.id) + '<span class="gk-cheer-b">' + esc(text) + "</span>";
    document.body.appendChild(d); setTimeout(() => { d.classList.add("out"); setTimeout(() => d.remove(), 350); }, big ? 2800 : 2300);
    say(c, text);
  }
  function levelUp(c, lv) {
    const un = UNLOCKS.filter((u) => u[0] === lv);
    if (lv === 5) toastSafe("⭐ 「星の制服」をもらった！");
    overlay('<div class="gk-lv" style="--gc:' + c.color + '"><div class="gk-lv-h">💖 仲良し度 Lv' + lv + "！</div>" + '<div class="gk-lv-t">' + esc(titleOf(lv)) + "</div>" + stage(c, { eager: true, fxn: 10, best: lv >= 10, outfit: lv >= 10 ? "best" : undefined }) +
      '<div class="gk-lv-say">「' + esc(line(c, lv >= 10 ? "best" : "lvup")) + "」</div>" + (un.length ? '<div class="gk-lv-un">' + un.map((u) => "<span>" + u[1] + " " + esc(u[2]) + "</span>").join("") + "</div>" : "") +
      '<button type="button" class="btn primary block" data-gk="ovclose">やったね！</button></div>', "lv");
    try { A().sound("fanfare"); } catch (e) {}
  }
  function rivalWin() {
    const c = byId("shota");
    overlay('<div class="gk-lv rival" style="--gc:' + c.color + '"><div class="gk-lv-h">🏆 今週の勝負に勝利！</div>' + stage(c, { eager: true, fxn: 8 }) + '<div class="gk-lv-say">「' + esc(line(c, "rivalWin")) + '」</div><div class="gk-lv-un"><span>🪙 +' + R.rivalWin + ' コイン</span></div><button type="button" class="btn primary block" data-gk="ovclose">来週も受けて立つ！</button></div>', "rival");
    try { A().sound("victory"); } catch (e) {}
  }
  const toastSafe = (m) => { try { A().toast(m); } catch (e) {} };
  function sumLine(kind) { const c = partner(); return c ? line(c, kind) : ""; }

  // ---------- オーバーレイ（あいさつ・はじめての案内・レベルアップ） ----------
  function overlay(html, kind) {
    closeOverlay(true);
    const d = document.createElement("div"); d.id = "gk-ov"; d.className = "gk-ov " + (kind || ""); d.innerHTML = '<div class="gk-ov-in">' + html + "</div>";
    document.body.appendChild(d); requestAnimationFrame(() => d.classList.add("show"));
    return d;
  }
  function closeOverlay(instant) { const d = document.getElementById("gk-ov"); if (!d) return; if (instant) return d.remove(); d.classList.remove("show"); setTimeout(() => d.remove(), 320); }

  function greet() {
    const g = G(), c = partner(); if (!c) return;
    const t = today(); if (g.login.last === t) return;
    const y = new Date(dateOf(t)); y.setDate(y.getDate() - 1);
    g.login.streak = g.login.last === keyOf(y) ? (+g.login.streak || 0) + 1 : 1;
    g.login.best = Math.max(+g.login.best || 0, g.login.streak);
    g.login.last = t;
    earn(R.daily); const rewards = ["🪙 今日のログイン +" + R.daily];
    if (g.login.streak % 7 === 0) { earn(R.week7); rewards.push("🎁 " + g.login.streak + "日連続ボーナス +" + R.week7); }
    A().save();
    const lv = lvOf(c.id);
    let ln = line(c, timeKey());
    if (g.login.streak >= 2) ln = line(c, "streak", { d: g.login.streak }) + " " + ln;
    else if (lv >= 5) ln = line(c, "high");
    const r = rivalRec(), rv = !r.won && c.id !== "shota" ? '<div class="gk-g-rv">' + face(30, "", "shota") + "<span>「" + esc(fill(byId("shota"), pick(byId("shota").L.rival))) + "」</span></div>" : "";
    overlay('<div class="gk-greet" style="--gc:' + c.color + '"><div class="gk-g-sky">' + skySvg(skyLv(), G().correct) + "</div>" + '<div class="gk-g-day">' + (g.login.streak >= 2 ? "🔥 " + g.login.streak + "日連続ログイン" : "✨ 今日もようこそ") + "</div>" +
      stage(c, { eager: true, fxn: 8 }) + '<div class="gk-g-bub"><b>' + esc(c.call) + "</b><p>" + esc(ln) + "</p></div>" + '<div class="gk-g-rw">' + rewards.map((x) => "<span>" + esc(x) + "</span>").join("") + "</div>" + rv +
      '<button type="button" class="btn primary block" data-gk="ovclose" data-say="1">今日もがんばる！</button></div>', "greet");
    greetText = ln;
    try { A().sound("star"); } catch (e) {}
  }
  let greetText = "";

  // はじめての案内：夜の学園 → 星のルール → 相棒えらび
  const INTRO = [
    ["🌙", "夜になると、星が光る学園がある。", "その名は「ほしの学園」。"],
    ["⭐", "問題に正解するたび、", "学園の空に星がひとつずつ増えていく。"],
    ["🤝", "いっしょに空をかがやかせる", "相棒をえらぼう。"],
  ];
  let introStep = 0, introSel = null;
  function intro() {
    introStep = 0; introSel = null;
    overlay('<div class="gk-intro" id="gk-intro"></div>', "intro full");
    drawIntro();
  }
  function drawIntro() {
    const el = document.getElementById("gk-intro"); if (!el) return;
    if (introStep < INTRO.length) {
      const s = INTRO[introStep];
      el.innerHTML = '<div class="gk-in-sky">' + skySvg(1 + introStep * 4, introStep * 60) + '</div><div class="gk-in-school">' + schoolSvg(1 + introStep * 4) + "</div>" +
        '<div class="gk-in-txt" key="' + introStep + '"><div class="gk-in-ic">' + s[0] + "</div><p>" + esc(s[1]) + "<br>" + esc(s[2]) + "</p></div>" +
        '<div class="gk-in-dots">' + INTRO.map((_, i) => '<i class="' + (i === introStep ? "on" : "") + '"></i>').join("") + "</div>" +
        '<div class="gk-in-act"><button type="button" class="btn primary block" data-gk="in-next">' + (introStep < INTRO.length - 1 ? "つぎへ" : "相棒をえらぶ") + "</button>" + (introStep === 0 ? '<button type="button" class="link-btn" data-gk="in-skip">スキップ</button>' : "") + "</div>";
      return;
    }
    const sel = byId(introSel);
    el.innerHTML = '<div class="gk-in-sky">' + skySvg(6, 120) + '</div><div class="gk-in-pick"><h2>相棒をえらぼう</h2><p class="gk-in-sub">先生4人・生徒4人。あとからいつでも変えられるよ。</p>' +
      '<div class="gk-in-grid">' + CHARS.map((c) => '<button type="button" class="gk-in-c' + (introSel === c.id ? " on" : "") + '" data-gk="in-sel" data-c="' + c.id + '" style="--gc:' + c.color + '">' + face(66, "", c.id) + "<b>" + esc(c.name.split(" ")[1] || c.name) + "</b><small>" + (c.role === "t" ? "先生" : "生徒") + "</small></button>").join("") + "</div>" +
      (sel ? '<div class="gk-in-det" style="--gc:' + sel.color + '">' + stage(sel, { eager: true, fxn: 5, cls: "mini" }) + '<div class="gk-in-dt"><b>' + esc(sel.name) + "</b><small>" + esc(sel.roleN) + " ・ " + esc(sel.tag) + "</small><p>「" + esc(fill(sel, sel.L.pick)) + '」</p></div></div><button type="button" class="btn primary block" data-gk="in-go">' + esc(sel.call) + "と はじめる</button>" : '<div class="gk-in-hint">気になる人をタップしてね</div>') + "</div>";
  }
  function setPartner(id, fromIntro) {
    const g = G(); g.partner = id; A().save(); closeOverlay(); A().render();
    const c = byId(id);
    if (fromIntro) setTimeout(greet, 380); else { toastSafe(esc(c.name) + "が相棒になったよ"); }
  }

  // ---------- シート ----------
  function profSheet(id) {
    const c = byId(id), cur = G().partner === id;
    A().openSheet('<div class="gk-prof" style="--gc:' + c.color + '">' + stage(c, { eager: true, fxn: 6, cls: "prof" }) + '<div class="gk-name lg"><b>' + esc(c.name) + "</b><small>" + esc(c.kana) + " ・ " + esc(c.roleN) + "</small></div>" + hearts(c.id) +
      '<div class="gk-tag">' + esc(c.tag) + "</div><p>" + esc(fill(c, c.profile)) + '</p><p class="small muted">話し方：' + esc(c.speech) + '</p><div class="gk-say">「' + esc(fill(c, c.L.pick)) + "」</div>" +
      (cur ? '<div class="gk-now">いまの相棒です</div>' : '<button type="button" class="btn primary block" data-gk="pick" data-c="' + c.id + '">' + esc(c.call) + "を相棒にする</button>") + "</div>", { label: c.name });
  }
  function storySheet(i) {
    const c = partner(), ch = c.story[i];
    G().seen["st:" + c.id + ":" + i] = 1; A().save();
    A().openSheet('<div class="gk-story" style="--gc:' + c.color + '"><div class="gk-story-h">' + face(56, "", c.id) + "<div><small>" + esc(c.call) + "のストーリー</small><b>" + esc(ch.t) + "</b></div></div>" +
      ch.p.map((p, k) => '<p style="--k:' + k + '">' + esc(fill(c, p)) + "</p>").join("") + '<div class="gk-story-end">' + (i < 2 ? "つづく…（仲良し度 Lv" + STORY_LV[i + 1] + " で次の話）" : "おしまい") + "</div></div>", { label: ch.t });
    A().render();
  }
  function rulesSheet() {
    A().openSheet('<div class="gk-rules"><h2>🪙 コインのため方</h2><ul>' +
      ["正解するたび +" + R.correct, "5問連続で正解 +" + R.c5 + "（ボーナス）", "10問連続で正解 +" + R.c10 + "（ボーナス）", "その日はじめて開いたとき +" + R.daily, "7日連続で開いたとき +" + R.week7, "翔太との週間勝負に勝つ +" + R.rivalWin].map((x) => "<li>" + esc(x) + "</li>").join("") +
      '</ul><h2>👗 きせかえ</h2><ul><li>ふつうの衣装（私服・夏服・冬服・ジャージ） 300</li><li>特別な衣装（浴衣・パーティー服・星の制服） 800</li><li>季節限定の衣装 1500</li><li>ガチャはなし。ほしい服を選んで交換できるよ</li></ul>' +
      '<h2>✨ すがた</h2><ul><li>学習の単元を合格すると、カウントが増える</li><li>50 クリアごとに、すがたが 1 段階アップ</li><li>Lv10 は 450 クリア</li></ul>' +
      '<h2>💖 仲良し度</h2><ul><li>相棒といっしょに正解 +' + R.bondCorrect + "</li><li>10問連続で正解 +" + R.bondC10 + "</li><li>" + R.perLv + "ごとにレベルアップ（最高Lv" + R.maxLv + "）</li></ul>" +
      '<h2>🔥 翔太との週間勝負</h2><ul><li>月曜〜日曜の「最高連続正解」で勝負</li><li>今週の目標：連続正解 ' + rivalTarget() + " 問</li><li>勝つと +" + R.rivalWin + " コイン</li></ul></div>", { label: "コインのため方" });
  }
  function rivalSheet() {
    const c = byId("shota"), r = rivalRec(), t = rivalTarget();
    A().openSheet('<div class="gk-rv" style="--gc:' + c.color + '">' + stage(c, { eager: true, fxn: 6, cls: "prof" }) + "<h2>" + (r.won ? "🏆 今週は先輩の勝ち！" : "🔥 今週の勝負") + "</h2>" +
      '<div class="gk-say">「' + esc(r.won ? line(c, "rivalWin") : r.best >= t - 3 && r.best > 0 ? line(c, "rivalNear") : fill(c, pick(c.L.rival))) + "」</div>" +
      '<div class="gk-rv-n"><div><small>今週の最高連続正解</small><b>' + r.best + '</b></div><div><small>翔太の目標</small><b>' + t + '</b></div><div><small>のこり</small><b>' + weekLeft() + "日</b></div></div>" +
      '<span class="gk-rbar lg"><i style="width:' + Math.round(Math.min(1, r.best / t) * 100) + '%"></i></span><p class="small muted">勝つと 🪙 +' + R.rivalWin + "。毎週月曜日に新しい勝負が始まるよ。</p></div>", { label: "週間勝負" });
  }
  function buySheet(oid) {
    const c = partner(), o = outfitById(oid), ok = bal() >= o.price;
    A().openSheet('<div class="gk-buy" style="--gc:' + c.color + '">' + stage(c, { eager: true, fxn: 10, outfit: o.id, cls: "prof" }) + "<h2>" + esc(o.n) + "</h2><p class=\"muted\">" + esc(o.d) + "</p>" +
      '<div class="gk-buy-p">🪙 ' + fmtN(o.price) + ' <small>（いま ' + fmtN(bal()) + "）</small></div>" +
      (ok ? '<button type="button" class="btn primary block" data-gk="buyok" data-o="' + o.id + '">交換して着がえる</button>' : '<div class="gk-buy-short">あと 🪙 ' + fmtN(o.price - bal()) + " で交換できるよ。正解してためよう！</div>") + "</div>", { label: o.n });
  }
  function buy(oid) {
    const c = partner(), o = outfitById(oid), g = G();
    if (!c || owned(c.id, oid) || bal() < o.price || !inSeason(o) || o.freeLv) return false;
    g.coins.s = (+g.coins.s || 0) + o.price;
    (g.owned[c.id] = g.owned[c.id] || []).push(oid);
    g.wear[c.id] = oid; A().save();
    A().closeSheet(true); A().render();
    try { A().sound("fanfare"); } catch (e) {}
    const lnn = pick(["似合ってる？", "どうかな…？", "ありがとう！ 大切にするね。"]);
    cheer(c, o.n + "、" + lnn, true);
    return true;
  }

  // ---------- クリック（画面のどこでも data-gk で受ける） ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-gk]"); if (!b) return;
    const act = b.dataset.gk, c = partner();
    if (act === "tap" && c) {
      const lv = lvOf(c.id), t = line(c, lv >= 2 && Math.random() < 0.6 ? "tap2" : "tap1"), bub = document.getElementById("gk-bub");
      if (bub) { bub.textContent = t; bub.classList.remove("pop"); void bub.offsetWidth; bub.classList.add("pop"); }
      const st = b.querySelector(".gk-stage"); if (st) { st.classList.remove("hop"); void st.offsetWidth; st.classList.add("hop"); }
      const r = b.getBoundingClientRect(); for (let i = 0; i < 6; i++) { const s = document.createElement("span"); s.className = "heart-p"; s.textContent = ["💖", "✨", "⭐"][i % 3]; s.style.left = r.left + r.width / 2 + "px"; s.style.top = r.top + r.height * 0.3 + "px"; s.style.setProperty("--dx", (Math.random() * 140 - 70).toFixed(0) + "px"); s.style.setProperty("--dy", (-50 - Math.random() * 70).toFixed(0) + "px"); document.body.appendChild(s); setTimeout(() => s.remove(), 1100); }
      try { A().sound("soft"); A().haptic(12); } catch (x) {}
      say(c, t);
    } else if (act === "talk" && c) { const t = line(c, lvOf(c.id) >= 2 && Math.random() < 0.6 ? "tap2" : "tap1"); const el = document.getElementById("gk-say"); if (el) el.textContent = "「" + t + "」"; say(c, t); }
    else if (act === "voice") { G().voice = G().voice === 0 ? 1 : 0; A().save(); A().render(); }
    else if (act === "wear" && c) { G().wear[c.id] = b.dataset.o; A().save(); A().render(); try { A().sound("tap"); } catch (x) {} }
    else if (act === "buy") buySheet(b.dataset.o);
    else if (act === "buyok") buy(b.dataset.o);
    else if (act === "lockinfo") toastSafe(b.dataset.need ? "仲良し度 Lv" + b.dataset.need + " で読めるよ" : "仲良し度 Lv" + outfitById(b.dataset.o).freeLv + " でもらえるよ");
    else if (act === "story") storySheet(+b.dataset.ch);
    else if (act === "prof") profSheet(b.dataset.c);
    else if (act === "pick") { A().closeSheet(true); setPartner(b.dataset.c); }
    else if (act === "look") lookSheet(b.dataset.c, +b.dataset.lv);
    else if (act === "looklock") toastSafe("Lv" + b.dataset.lv + " は " + ((+b.dataset.lv - 1) * LOOK.per) + " クリアで");
    else if (act === "rules") rulesSheet();
    else if (act === "rival") rivalSheet();
    else if (act === "intro") intro();
    else if (act === "in-next") { introStep++; drawIntro(); try { A().sound("tap"); } catch (x) {} }
    else if (act === "in-skip") { introStep = INTRO.length; drawIntro(); }
    else if (act === "in-sel") { introSel = b.dataset.c; drawIntro(); try { A().sound("soft"); } catch (x) {} }
    else if (act === "in-go" && introSel) setPartner(introSel, true);
    else if (act === "ovclose") { if (b.dataset.say && c) say(c, greetText); closeOverlay(); A().render(); }
  });

  // ---------- 起動・画面を描いたあと ----------
  let checking = false;
  const queue = [];
  // ログイン画面（はじめての案内・ログイン中）が出ているあいだは、相棒の案内を出さない
  function authBusy() {
    const L = document.getElementById("auth-layer"); if (L && !L.hidden && L.innerHTML.trim()) return true;
    const U = window.HMAuthUI; if (!U || !U.enabled) return false;
    let seen = ""; try { seen = localStorage.getItem("hoshigakuen-auth-seen"); } catch (e) {}
    let user = null; try { user = U.state().user; } catch (e) {}
    return !seen && !user;
  }
  function afterRender(tab) {
    if (checking) return;
    const busy = () => !!(document.getElementById("consent") || document.getElementById("gk-ov") || document.querySelector("#quiz:not([hidden])") || document.querySelector(".game-layer:not([hidden])") || document.querySelector(".auth-ov,#auth-ov") || document.getElementById("splash") || authBusy() || window.__HM_NO_GK);
    const go = () => {
      checking = false;
      if (busy()) { checking = true; return setTimeout(go, 700); }
      const g = G();
      if (!g.partner) { if (!g.seen.intro) { g.seen.intro = 1; } intro(); return; }
      if (g.login.last !== today()) return greet();
      if (queue.length) queue.shift()();
    };
    checking = true; setTimeout(go, 450);
  }
  // 古い「なかま（もりっこ等）」の称号やきせかえの解放：仲良し度の最高レベルで決める
  function maxRank() { const lv = Math.max(1, ...CHARS.map((c) => lvOf(c.id))); return lv >= 10 ? 6 : lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : lv >= 3 ? 2 : lv >= 2 ? 1 : 0; }

  window.HMGK = { CHARS, OUTFITS, R, TITLES, LOOK, G, bal, partner, lvOf, bondOf, titleOf, skyLv, rivalTarget, rivalRec, weekKey, owned, wearing, inSeason,
    passedSections, lookLv, lookName, lookProg, homeHero, view, face, onAnswer, sumLine, afterRender, intro, greet, maxRank, buy, setPartner: (id) => setPartner(id), closeOverlay };
})();
