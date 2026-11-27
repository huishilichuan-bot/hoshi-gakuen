/* ほしの学園 — 中学の定期テスト（中間・期末）プリセットと問題用紙の組み立て */
(function (root) {
  "use strict";
  const MAIN = ["math", "ja", "sci", "soc", "en"];
  const PRACT = ["tech", "home", "music", "art", "pe"];
  const ALL9 = MAIN.concat(PRACT);

  const T3 = [
    { id: "mid1", n: "1学期中間", mid: true },
    { id: "end1", n: "1学期期末", mid: false },
    { id: "mid2", n: "2学期中間", mid: true },
    { id: "end2", n: "2学期期末", mid: false },
    { id: "end3", n: "3学期期末", mid: false }
  ];
  const T2 = [
    { id: "preMid", n: "前期中間", mid: true },
    { id: "preEnd", n: "前期期末", mid: false },
    { id: "postMid", n: "後期中間", mid: true },
    { id: "postEnd", n: "後期期末", mid: false }
  ];

  // 教科書順の典型的な範囲（単元の通し番号、0始まり）。実技は期末のみ。
  const R3 = {
    math: {
      7: { mid1: [0, 1], end1: [0, 1, 2], mid2: [3], end2: [3, 4], end3: [5, 6] },
      8: { mid1: [0], end1: [0, 1], mid2: [2], end2: [2, 3], end3: [4, 5, 6] },
      9: { mid1: [0, 1], end1: [0, 1, 2], mid2: [3, 4], end2: [3, 4, 5], end3: [6, 7, 8] }
    },
    ja: {
      7: { mid1: [0, 1, 2, 10, 12], end1: [0, 1, 2, 3, 4, 10, 12], mid2: [5, 6, 11, 14], end2: [5, 6, 7, 11, 14], end3: [8, 9, 10, 13, 15] },
      8: { mid1: [0, 1, 2, 9, 10], end1: [0, 1, 2, 3, 4, 9, 10], mid2: [5, 6, 11], end2: [5, 6, 7, 11, 12], end3: [8, 9, 12, 13] },
      9: { mid1: [0, 1, 2, 8, 9], end1: [0, 1, 2, 3, 8, 9], mid2: [4, 5, 10], end2: [4, 5, 6, 10], end3: [7, 8, 11, 12] }
    },
    sci: {
      7: { mid1: [0], end1: [0, 1, 8, 9], mid2: [2], end2: [2, 3, 10], end3: [4, 5, 6, 7, 11, 12] },
      8: { mid1: [0], end1: [0, 7], mid2: [1], end2: [1, 2, 8], end3: [3, 4, 5, 6, 9] },
      9: { mid1: [0], end1: [0, 7], mid2: [1, 2], end2: [1, 2, 6], end3: [3, 4, 5, 8, 9] }
    },
    soc: {
      7: { mid1: [0, 1], end1: [0, 1, 2], mid2: [3], end2: [3, 4], end3: [5, 6] },
      8: { mid1: [0, 1], end1: [0, 1, 2], mid2: [3], end2: [3, 4], end3: [4, 5] },
      9: { mid1: [0], end1: [0, 1], mid2: [2], end2: [1, 2], end3: [2, 3] }
    },
    en: {
      7: { mid1: [0, 1, 2], end1: [0, 1, 2, 3, 4, 5], mid2: [6, 7, 8], end2: [6, 7, 8, 9, 10], end3: [11, 12, 13] },
      8: { mid1: [0, 1, 2], end1: [0, 1, 2, 3, 4, 5, 6], mid2: [7, 8, 9], end2: [7, 8, 9, 10, 11, 12], end3: [13, 14] },
      9: { mid1: [0, 1, 2], end1: [0, 1, 2, 3, 4], mid2: [5, 6, 7, 8], end2: [5, 6, 7, 8, 9, 10, 11], end3: [12, 13, 14, 15] }
    }
  };

  function practRange(endKey) {
    const m = { end1: [0, 1], end2: [2, 3], end3: [4, 5] };
    return m[endKey] || [];
  }
  PRACT.forEach(function (s) {
    R3[s] = { 7: {}, 8: {}, 9: {} };
    [7, 8, 9].forEach(function (g) {
      R3[s][g] = { mid1: [], end1: practRange("end1"), mid2: [], end2: practRange("end2"), end3: practRange("end3") };
    });
  });

  function uniq(arr) {
    const out = [], seen = {};
    (arr || []).forEach(function (x) { if (x == null || seen[x]) return; seen[x] = 1; out.push(x); });
    return out;
  }
  function range3(subj, grade, kind) {
    const t = ((R3[subj] || {})[grade] || {});
    return (t[kind] || []).slice();
  }
  function rangeOf(system, kind, subj, grade) {
    if (String(system) === "2") {
      const a = range3(subj, grade, "mid1"), b = range3(subj, grade, "end1"), c = range3(subj, grade, "mid2"), d = range3(subj, grade, "end2"), e = range3(subj, grade, "end3");
      if (kind === "preMid") return a;
      if (kind === "preEnd") return uniq(a.concat(b, c));
      if (kind === "postMid") return uniq(c.concat(d));
      if (kind === "postEnd") return uniq(d.concat(e));
      return [];
    }
    return range3(subj, grade, kind);
  }

  function isPractical(s) { return PRACT.indexOf(s) >= 0; }
  function isMain(s) { return MAIN.indexOf(s) >= 0; }
  function termsOf(system) { return String(system) === "2" ? T2 : T3; }
  function termOf(system, kind) { return termsOf(system).find(function (x) { return x.id === kind; }) || null; }
  function label(system, kind) { const t = termOf(system, kind); return t ? t.n : ""; }
  function offersSubject(system, kind, subj) {
    if (!isPractical(subj)) return true;
    const t = termOf(system, kind);
    return !!(t && !t.mid);
  }

  // 主要教科：大問5・26問・100点・50分。実技：大問3・20問・100点・30分。
  const SPEC_MAIN = {
    minutes: 50,
    max: 100,
    parts: [
      { n: "大問1　基礎の確認", nQ: 8, pts: 3 },
      { n: "大問2　用語と知識", nQ: 6, pts: 4 },
      { n: "大問3　内容の理解", nQ: 5, pts: 4 },
      { n: "大問4　応用", nQ: 4, pts: 5 },
      { n: "大問5　まとめ", nQ: 3, pts: 4 }
    ]
  };
  const SPEC_PRACT = {
    minutes: 30,
    max: 100,
    parts: [
      { n: "大問1　基礎", nQ: 6, pts: 5 },
      { n: "大問2　確認", nQ: 6, pts: 5 },
      { n: "大問3　活用", nQ: 8, pts: 5 }
    ]
  };
  function specOf(subj) { return isPractical(subj) ? SPEC_PRACT : SPEC_MAIN; }

  function scopeItems(system, kind, grade, subj, units) {
    const us = units || [];
    return rangeOf(system, kind, subj, grade).filter(function (ui) { return us[ui]; }).map(function (ui) {
      return { s: subj, g: grade, ui: ui, un: us[ui].n };
    });
  }
  function allScope(system, kind, grade, getUnits) {
    const out = [];
    ALL9.forEach(function (s) {
      if (!offersSubject(system, kind, s)) return;
      out.push.apply(out, scopeItems(system, kind, grade, s, getUnits(s, grade)));
    });
    return out;
  }

  function takeUnique(pool, n, used) {
    const out = [];
    for (let i = 0; i < pool.length && out.length < n; i++) {
      const q = pool[i], k = String(q.q || "") + "|" + String(q.a || "");
      if (used[k]) continue;
      used[k] = 1;
      out.push(q);
    }
    return out;
  }

  // pool: 範囲から集めた問題（__src つき）。足りなければ fill も使う。
  function buildPaper(subj, pool, fill) {
    const spec = specOf(subj);
    const used = {};
    const parts = [];
    let all = [];
    const src = (pool || []).slice();
    const extra = (fill || []).slice();
    spec.parts.forEach(function (p, pi) {
      let qs = takeUnique(src, p.nQ, used);
      if (qs.length < p.nQ) qs = qs.concat(takeUnique(extra, p.nQ - qs.length, used));
      const items = qs.map(function (q) { return Object.assign({}, q, { pts: p.pts, part: pi }); });
      const got = items.length;
      // 点が100になるよう、実際に出た問の配点を保つ（足りないときは残りの大問で調整しない。得点は実配点の合計を満点にする）
      parts.push({ n: p.n, i: pi, nQ: got, pts: p.pts, max: got * p.pts, qs: items });
      all = all.concat(items);
    });
    const max = parts.reduce(function (t, p) { return t + p.max; }, 0);
    return { parts: parts, qs: all, max: max, minutes: spec.minutes, wantMax: spec.max, n: all.length };
  }

  function totals(hist, grade, system, kind) {
    const latest = {};
    (hist || []).filter(function (h) {
      return h.g === grade && String(h.system) === String(system) && h.kind === kind;
    }).sort(function (a, b) { return (a.t || 0) - (b.t || 0); }).forEach(function (h) { latest[h.s] = h; });
    function sum(ids) {
      let score = 0, max = 0, n = 0, done = [];
      ids.forEach(function (s) {
        const h = latest[s];
        if (!h) return;
        score += h.score; max += h.max; n++; done.push(h);
      });
      return { score: score, max: max, n: n, need: ids.length, latest: latest, done: done };
    }
    return { five: sum(MAIN), nine: sum(ALL9), latest: latest };
  }

  root.HMExam = {
    MAIN: MAIN, PRACT: PRACT, ALL9: ALL9,
    T3: T3, T2: T2, termsOf: termsOf, termOf: termOf, label: label,
    isPractical: isPractical, isMain: isMain, offersSubject: offersSubject,
    rangeOf: rangeOf, scopeItems: scopeItems, allScope: allScope,
    specOf: specOf, buildPaper: buildPaper, totals: totals, uniq: uniq
  };
})(typeof window !== "undefined" ? window : globalThis);
