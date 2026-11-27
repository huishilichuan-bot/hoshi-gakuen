/* ほしの学園 — 中学の技術・家庭・音楽・美術・保健体育向けの問題づくり部品 */
(function (root) {
  "use strict";
  const HM = root.HM, U = HM.U;
  const { pick, shuf, ch, R } = U;

  function retry(fn) {
    return function (d, i) {
      let last = null;
      for (let k = 0; k < 40; k++) {
        const q = fn(d, i, k);
        if (q && q.a != null && Array.isArray(q.o) && q.o.length >= 3 && q.ex && String(q.ex).length >= 4 && q.o.indexOf(String(q.a)) < 0) return q;
        last = q;
      }
      throw new Error("jhs quiz failed: " + (last && last.q));
    };
  }

  // 表の1列を答えにする選択問題（答えの値は表の中で複数行にあっても、同じ値はまちがいから除く）
  function fieldQuiz(rows, spec) {
    return retry(function () {
      const pool = spec.filter ? rows.filter(spec.filter) : rows;
      const it = pick(pool);
      const ans = String(typeof spec.a === "function" ? spec.a(it) : it[spec.a]);
      const wrongs = [];
      shuf(pool).forEach(function (x) {
        const w = String(typeof spec.a === "function" ? spec.a(x) : x[spec.a]);
        if (w && w !== ans && wrongs.indexOf(w) < 0) wrongs.push(w);
      });
      return ch(spec.q(it), ans, wrongs, spec.ex(it, ans));
    });
  }

  // 固定の四択（行は {q,a,o,ex}）。出題のたびに選択肢を混ぜる
  function bankGen(items) {
    return retry(function () {
      const it = pick(items);
      return ch(it.q, it.a, it.o, it.ex);
    });
  }

  function mix(gens) {
    return retry(function (d, i, k) {
      return gens[(i + k) % gens.length](d, i);
    });
  }

  // 正しい文／正しくない文（facts: {t, ok} または {t: true/false}）
  function trueFalseQuiz(facts, askWrong) {
    return retry(function () {
      const good = facts.filter(function (f) { return f.ok; });
      const bad = facts.filter(function (f) { return !f.ok; });
      if (askWrong) {
        const it = pick(bad);
        const wrongs = shuf(good).map(function (f) { return f.t; });
        return ch("次のうち、正しくないものはどれ？", it.t, wrongs, it.ex || ("「" + it.t + "」は正しくないよ。" + (it.why || "")));
      }
      const it = pick(good);
      const wrongs = shuf(bad).map(function (f) { return f.t; });
      return ch("次のうち、正しいものはどれ？", it.t, wrongs, it.ex || ("「" + it.t + "」が正しいよ。" + (it.why || "")));
    });
  }

  HM.JHS = { retry, fieldQuiz, bankGen, mix, trueFalseQuiz, ch: ch, pick: pick, shuf: shuf, R: R };
})(typeof window !== "undefined" ? window : globalThis);
