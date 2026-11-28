/* 漢字テスト（学期・回）のテスト：どの回も範囲の漢字が1回はぜんぶ出る／同じことばは1回だけ／書き→読みの順／毎回同じ問題／点数の換算 */
"use strict";
const path = require("path"), ROOT = path.join(__dirname, "..");
function load() {
  global.window = global; global.HM = { SUBJECTS: {}, unit: (n, s) => ({ n, steps: [] }), U: { rng: Math.random } };
  for (const f of ["q-kanji-data.js", "q-kanji.js", "kj-term.js"]) { const p = path.join(ROOT, f); delete require.cache[require.resolve(p)]; require(p); }
  return global.HM;
}
let HM = load(), K = HM.KJT, pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { if (c) pass++; else { fail++; bad.push(m); } };
const E = HM.KANJI_ENT;
// 学年ごとの字数（中学は370字ずつ・合計1110）
const want = { 1: 80, 2: 160, 3: 200, 4: 202, 5: 193, 6: 191, 7: 370, 8: 370, 9: 370 };
for (const g in want) ok(E[g].length === want[g], "字数 " + g + " " + E[g].length);
ok(E[7].length + E[8].length + E[9].length === 1110, "中学の字数 1110");
for (const g in E) { const ks = E[g].map((e) => e.k); ok(new Set(ks).size === ks.length, "字のかぶり " + g); ok(E[g].every((e) => e.words.length >= 1 && e.sc > 0), "ことば・画数 " + g); }
// 回数
const rounds = { 1: 3, 2: 4, 3: 4, 4: 5, 5: 4, 6: 4, 7: 6, 8: 6, 9: 6 };
const info = [];
for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  const plan = K.plan(g); ok(plan.length === rounds[g], "回数 " + g + " " + plan.length);
  const terms = [1, 2, 3].map((t) => plan.filter((r) => r.t === t).length);
  const wantT = { 1: [1, 1, 1], 2: [1, 2, 1], 3: [1, 2, 1], 4: [2, 2, 1], 5: [1, 2, 1], 6: [1, 2, 1], 7: [2, 2, 2], 8: [2, 2, 2], 9: [2, 2, 2] }[g];
  ok(JSON.stringify(terms) === JSON.stringify(wantT), "学期ごとの回数 " + g + " " + terms);
  // 範囲はすきまなく重ならず、学年の字をぜんぶふくむ
  const all = []; plan.forEach((r, i) => K.chars(g, i).forEach((e) => all.push(e.k)));
  ok(all.length === want[g] && new Set(all).size === want[g] && E[g].every((e) => all.includes(e.k)), "範囲が学年の字をぜんぶふくむ " + g);
  const counts = plan.map((r) => r.count); ok(Math.max.apply(null, counts) - Math.min.apply(null, counts) <= 1, "範囲が均等 " + g + " " + counts);
  info.push(g + ":" + counts.join("/"));
  const sp = K.spec(g);
  plan.forEach((r, idx) => {
    const qs = K.questions(g, idx), nm = g + "-" + r.label;
    ok(qs.length === sp.total, nm + " 問題数 " + qs.length);
    const w = qs.filter((q) => q.kind === "write").length, rd = qs.filter((q) => q.kind === "read").length;
    ok(w === sp.write && rd === sp.read, nm + " 書き" + w + " 読み" + rd);
    ok(qs.slice(0, sp.write).every((q) => q.kind === "write") && qs.slice(sp.write).every((q) => q.kind === "read"), nm + " 書き→読みの順");
    const seen = new Set(qs.map((q) => q.k));
    ok(K.chars(g, idx).every((e) => seen.has(e.k)), nm + " 範囲の漢字がぜんぶ出る");
    ok(qs.every((q) => K.chars(g, idx).some((e) => e.k === q.k)), nm + " 範囲の外の字は出ない");
    const ts = qs.map((q) => q.w.t); ok(new Set(ts).size === ts.length, nm + " ことばのかぶり " + ts.filter((t, i) => ts.indexOf(t) !== i).join(","));
    ok(qs.every((q) => q.w.f[q.w.i] && q.w.f[q.w.i][0] === q.k), nm + " 答えの字が□の位置にある");
    ok(qs.every((q) => q.w.f.map(([ru, rt]) => rt || ru).join("") === q.w.r && q.w.f.map((x) => x[0]).join("") === q.w.t), nm + " ことばと読みの整合");
    ok(qs.filter((q) => q.kind === "read").every((q) => q.opts.length === 4 && new Set(q.opts).size === 4 && q.opts.includes(q.w.r)), nm + " 読みの4つ");
    for (let i = 1; i < sp.write; i++) if (qs[i].k === qs[i - 1].k) ok(false, nm + " 同じ字が続く " + i);
  });
}
// まとめ
const m = K.questions("M"), mk = new Set(m.map((q) => q.k));
ok(m.length === 70 && m.filter((q) => q.kind === "write").length === 56 && m.slice(0, 56).every((q) => q.kind === "write") && m.slice(56).every((q) => q.kind === "read"), "まとめ 70問・書き56→読み14");
ok(mk.size === 70, "まとめ 70字");
ok(new Set(m.map((q) => q.w.t)).size === 70, "まとめ ことばのかぶり");
[7, 8, 9].forEach((g) => K.plan(g).forEach((r, i) => { const n = K.chars(g, i).filter((e) => mk.has(e.k)).length; ok(n >= 3 && n <= 4, "まとめ 範囲" + g + "-" + r.label + " " + n); }));
ok(m.every((q) => q.kind !== "read" || (q.opts.length === 4 && q.opts.includes(q.w.r))), "まとめ 読みの4つ");
// いつも同じ問題（読み込みなおしても）
const snap = JSON.stringify([K.questions(2, 1), K.questions(8, 3), K.questions("M")]);
HM = load(); K = HM.KJT;
ok(snap === JSON.stringify([K.questions(2, 1), K.questions(8, 3), K.questions("M")]), "毎回同じ問題");
ok(K.questions(2, 1).map((q) => q.k).join() !== K.questions(2, 2).map((q) => q.k).join(), "回がちがえば問題もちがう");
// 点数の換算（中学70問を100点に）
ok(K.score(70, 70) === 100 && K.score(0, 70) === 0 && K.score(63, 70) === 90 && K.score(42, 70) === 60 && K.score(41, 70) === 59 && K.score(62, 70) === 89, "70問の換算");
ok(K.score(50, 50) === 100 && K.score(45, 50) === 90 && K.score(30, 50) === 60 && K.score(29, 50) === 58, "50問の換算");
console.log("回ごとの字数", info.join("  "));
console.log("kjterm pass", pass, "fail", fail);
if (bad.length) console.log(bad.slice(0, 40).join("\n"));
process.exit(fail ? 1 : 0);
