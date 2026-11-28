// ほしの学園 国語：漢字テスト（学期・回ごとの固定テスト）
// 小1〜小6：1回50問（書き40→読み10・各2点）／中1〜中3：1回70問（書き56→読み14・100点に換算）／中学のまとめ：70問
// 同じ回はいつも同じ漢字・同じことば・同じえらびかた（シードで固定）。画面の外でも動く（テストできる）ように、画面の処理は入れない。
(function (root) {
  const HM = root.HM = root.HM || {};
  const T = HM.KJT = {};
  // 学年ごとの回数：[1学期の回数, 2学期の回数, 3学期の回数]
  const TERMS = { 1: [1, 1, 1], 2: [1, 2, 1], 3: [1, 2, 1], 4: [2, 2, 1], 5: [1, 2, 1], 6: [1, 2, 1], 7: [2, 2, 2], 8: [2, 2, 2], 9: [2, 2, 2] };
  const SPEC = { elem: { total: 50, write: 40, read: 10 }, mid: { total: 70, write: 56, read: 14 } };
  const MATOME = "M";
  T.TERMS = TERMS; T.SPEC = SPEC; T.MATOME = MATOME;
  T.isMid = (g) => g === MATOME || +g >= 7;
  T.spec = (g) => (T.isMid(g) ? SPEC.mid : SPEC.elem);
  T.termName = (t) => t + "学期";
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(seed) { let a = hash(seed) || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  T.rng = rng; T.shuffle = shuffle;
  // 100 点への換算：正解数 ÷ 問題数 × 100 を四捨五入（50問は1問2点、70問は1問およそ1.43点、70問ぜんぶ正解で100点）
  T.score = (ok, total) => (total ? Math.round((ok * 100) / total) : 0);

  const ENT = () => HM.KANJI_ENT || {};
  let KGc = null, CROSS = null;
  function KG() { if (KGc) return KGc; KGc = {}; const E = ENT(); for (const g in E) E[g].forEach((e) => { KGc[e.k] = +g; }); return KGc; }
  const isKanji = (c) => /[\u3400-\u9fff\u{20000}-\u{2ffff}]/u.test(c);
  const maxG = (w) => { const kg = KG(); let m = 0; w.f.forEach(([ru]) => { Array.from(ru).forEach((c) => { if (isKanji(c)) m = Math.max(m, kg[c] || 99); }); }); return m; };
  // ほかの字のことばのなかにある字も、「ちがうことば」として使える（その字の学年より上の字を使うことばは除く）
  function cross() {
    if (CROSS) return CROSS; CROSS = {};
    const kg = KG(), E = ENT();
    for (const g in E) E[g].forEach((e) => e.words.forEach((w) => {
      const mg = maxG(w);
      w.f.forEach(([ru, rt], j) => {
        if (j === w.i || !rt || Array.from(ru).length !== 1 || !isKanji(ru) || !kg[ru] || mg > kg[ru]) return;
        (CROSS[ru] = CROSS[ru] || []).push({ t: w.t, r: w.r, i: j, f: w.f });
      });
    }));
    for (const k in CROSS) CROSS[k].sort((a, b) => Math.abs(a.t.length - 2) - Math.abs(b.t.length - 2) || (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
    return CROSS;
  }
  const cand = (e) => { const seen = new Set(), out = []; e.words.concat(cross()[e.k] || []).forEach((w) => { if (!seen.has(w.t)) { seen.add(w.t); out.push({ t: w.t, r: w.r, i: w.i, f: w.f }); } }); return out; };

  // ---- 範囲 ----
  // 学年の漢字を、出てくる多さの順（もとの並び）にして、あとから足した字をまんべんなくまぜる（どの回にもむずかしい字がかたよらない）
  const orderCache = {};
  function order(g) {
    if (orderCache[g]) return orderCache[g];
    const list = ENT()[g] || [], leg = (HM.KANJI_LEGACY || {})[g];
    if (!leg || leg >= list.length) return (orderCache[g] = list.slice());
    const base = list.slice(0, leg), ext = list.slice(leg), N = list.length, slot = new Set(ext.map((_, j) => Math.floor(((j + 0.5) * N) / ext.length)));
    const out = []; let bi = 0, ei = 0;
    for (let i = 0; i < N; i++) out.push(slot.has(i) && ei < ext.length ? ext[ei++] : base[bi++] || ext[ei++]);
    return (orderCache[g] = out);
  }
  T.order = order;
  const flatRounds = (g) => { const out = []; TERMS[g].forEach((c, ti) => { for (let n = 1; n <= c; n++) out.push({ t: ti + 1, n }); }); return out; };
  // 学年ごとの回の一覧（まとめは別）
  T.plan = (g) => {
    g = +g; const rs = flatRounds(g), L = (ENT()[g] || []).length, R = rs.length;
    return rs.map((r, idx) => { const a = Math.floor((idx * L) / R), b = Math.floor(((idx + 1) * L) / R); return { g, idx, t: r.t, n: r.n, key: g + "|" + r.t + "|" + r.n, label: r.t + "学期 第" + r.n + "回", from: a, to: b, count: b - a }; });
  };
  T.roundByKey = (key) => { if (key === MATOME) return T.matomeInfo(); const [g, t, n] = key.split("|").map(Number); return (TERMS[g] ? T.plan(g) : []).find((r) => r.t === t && r.n === n) || null; };
  T.chars = (g, idx) => { const r = T.plan(g)[idx]; return order(+g).slice(r.from, r.to); };
  // 中学のまとめ：中1〜中3の18回の範囲から、まんべんなく70字（回ごとに3〜4字）
  const MM = SPEC.mid.total;
  T.matomeInfo = () => ({ g: MATOME, key: MATOME, label: "中学のまとめ", count: MM });
  T.matomeChars = () => {
    const rounds = []; [7, 8, 9].forEach((g) => T.plan(g).forEach((r) => rounds.push(r)));
    const out = [], R = rounds.length;
    rounds.forEach((r, j) => {
      const q = Math.floor(((j + 1) * MM) / R) - Math.floor((j * MM) / R);
      const pool = order(r.g).slice(r.from, r.to);
      out.push.apply(out, shuffle(pool, rng("kj|M|pick|" + r.key)).slice(0, q));
    });
    return out;
  };

  // ---- 問題づくり ----
  // chars の字をぜんぶ最低1回出し、足りない分は同じ字のちがうことば（音読み・訓読み）で埋める。同じことばは1回だけ。
  function build(chars, W, Rd, seed) {
    const r = rng(seed), total = W + Rd, used = new Set(), items = [];
    const order0 = shuffle(chars, r), cands = new Map(); order0.forEach((e) => cands.set(e, cand(e)));
    const take = (e) => { const w = cands.get(e).find((x) => !used.has(x.t)); if (!w) return null; used.add(w.t); return w; };
    const firstW = Math.min(order0.length, W);
    // ことばの少ない字から先に決める（2字が同じことばを取り合わないように）。書き・読みの割りふりは、まぜた順で決める
    order0.map((e, i) => [e, i]).sort((a, b) => cands.get(a[0]).length - cands.get(b[0]).length || a[1] - b[1]).forEach(([e, i]) => { const w = take(e); if (w) items.push({ kind: i < firstW ? "write" : "read", e, w }); });
    let need = total - items.length, guard = 0;
    while (need > 0 && guard++ < 50) {
      let added = 0;
      for (const e of order0) { if (need <= 0) break; const w = take(e); if (w) { items.push({ kind: null, e, w }); need--; added++; } }
      if (!added) break;
    }
    let wn = items.filter((x) => x.kind === "write").length;
    items.forEach((x) => { if (!x.kind) { if (wn < W) { x.kind = "write"; wn++; } else x.kind = "read"; } });
    const fix = (arr) => { for (let i = 1; i < arr.length; i++) if (arr[i].e.k === arr[i - 1].e.k) { const j = arr.findIndex((x, jj) => jj > i && x.e.k !== arr[i - 1].e.k && (jj + 1 >= arr.length || x.e.k !== arr[jj + 1].e.k)); if (j > 0) { const x = arr[i]; arr[i] = arr[j]; arr[j] = x; } } return arr; };
    const pick = (kind) => fix(shuffle(items.filter((x) => x.kind === kind), r));
    return pick("write").concat(pick("read")).map((x) => ({ kind: x.kind, k: x.e.k, sc: x.e.sc, g: KG()[x.e.k], w: x.w }));
  }
  T.build = build;

  // 読みの4つのえらびかた（ただしいもの＋似た長さのまちがい3つ。順番もシードで固定）
  const poolCache = {};
  function readPool(g) {
    const key = T.isMid(g) ? "mid" : String(g); if (poolCache[key]) return poolCache[key];
    const gs = T.isMid(g) ? [7, 8, 9] : [+g], seen = new Set(), out = [];
    gs.forEach((x) => (ENT()[x] || []).forEach((e) => e.words.forEach((w) => { if (w.r && !seen.has(w.r)) { seen.add(w.r); out.push(w.r); } })));
    out.sort(); return (poolCache[key] = out);
  }
  function optsFor(q, g, seed) {
    const c = q.w.r, r = rng(seed), pool = readPool(g).filter((x) => x !== c);
    const near = pool.filter((x) => Math.abs(x.length - c.length) <= 1);
    const d = shuffle(near.length >= 3 ? near : pool, r).slice(0, 3);
    return shuffle([c].concat(d), r);
  }
  const cache = {};
  // 1回ぶんの問題（いつも同じ）。g は 1〜9 か "M"、idx は回の番号（0から）
  T.questions = (g, idx) => {
    const key = g === MATOME ? MATOME : g + "|" + idx;
    if (cache[key]) return cache[key].map((q) => Object.assign({}, q));
    const sp = T.spec(g);
    const chars = g === MATOME ? T.matomeChars() : T.chars(g, idx);
    const rd = g === MATOME ? null : T.plan(g)[idx];
    const seed = g === MATOME ? "kj|M" : "kj|" + g + "|" + rd.t + "|" + rd.n;
    const qs = build(chars, sp.write, sp.read, seed);
    qs.forEach((q, i) => { if (q.kind === "read") q.opts = optsFor(q, g, seed + "|o|" + i); });
    cache[key] = qs;
    return qs.map((q) => Object.assign({}, q));
  };
  T.chars_ = (g, idx) => (g === MATOME ? T.matomeChars() : T.chars(g, idx));
  // 〇△×用のランク（アプリ側の markOf に合わせる：90以上○ 60〜89△ 59以下×）
})(typeof window !== "undefined" ? window : globalThis);
