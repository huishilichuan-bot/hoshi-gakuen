// hm-merge.js の単体テスト（node tools/test_merge.js）
const M = require("../hm-merge.js"); let n = 0, f = 0;
const ok = (name, c, info) => { n++; if (!c) f++; console.log((c ? "PASS " : "FAIL ") + name + (c ? "" : " :: " + JSON.stringify(info))); };
const fresh = { totalStars: 0, pulls: 0, pullsUsed: 0, days: { "2026-11-17": { stars: 0, steps: {} } }, progress: {}, chars: { mori: { n: 1 } }, partner: "mori", settings: { nick: "", sound: true }, wrongBox: [], updatedAt: 999 };
const cloud = { totalStars: 12, pulls: 12, pullsUsed: 4, progress: { a: { best: 5, passed: true } }, chars: { mori: { n: 2 }, kitsune: { n: 1 } }, partner: "kitsune", settings: { nick: "テストくん", sound: false }, wrongBox: [{ k: "q" }], updatedAt: 10 };
let m = M.mergeStates(fresh, cloud);
ok("まっさらな端末ではクラウドをそのまま使う", m.settings.nick === "テストくん" && m.partner === "kitsune" && m.settings.sound === false && m.totalStars === 12, m);
const used = Object.assign({}, fresh, { totalStars: 3, pulls: 3, days: { d: { stars: 3, steps: { x: 1, y: 1, z: 1 } } } });
m = M.mergeStates(used, cloud);
ok("両方に記録：⭐は多い方・名前は空でうめる", m.totalStars === 15 || m.totalStars >= 12, m.totalStars);
ok("名前は空なら相手からうめる", m.settings.nick === "テストくん", m.settings);
ok("なかまは両方", m.chars.kitsune && m.chars.mori.n === 2);
ok("ガチャのこりはへらない", m.pulls - m.pullsUsed === 8, [m.pulls, m.pullsUsed]);
ok("ステップの記録は残る", m.progress.a.passed && m.days.d.steps.x);
m = M.mergeStates(used, null); ok("クラウドが空なら端末のまま", m.totalStars === 3);
const A = { totalStars: 5, wrongBox: [{ k: "a", t: 1 }, { k: "b", t: 1 }], boxGone: {}, days: { d: { stars: 1, steps: { s1: 1 } } }, updatedAt: 5 };
const Bx = { totalStars: 5, wrongBox: [{ k: "b", t: 1 }], boxGone: { a: 9 }, days: { d: { stars: 1, steps: { s2: 1 } } }, updatedAt: 6 };
m = M.mergeStates(A, Bx);
ok("ほかの端末でクリアした問題はもどってこない", m.wrongBox.map((x) => x.k).join() === "b" && m.boxGone.a === 9, m.wrongBox);
ok("2台で別のステップの⭐ → 両方数える（⭐はへらない）", m.days.d.stars === 2, m.days);
ok("まっさらの判定：ボス勝利やなかまがあれば空ではない", !M.isBlank({ bossWins: { x: 1 } }) && !M.isBlank({ chars: { mori: {}, neko: {} } }) && M.isBlank({ chars: { mori: {} } }));
// 漢字テストの学期・回の記録（kjTerm）：ベストは大きい方、前回は新しい方。記録だけある端末は空ではない
const KA = { totalStars: 1, kjTerm: { "7|1|1": { best: 80, last: 80, ok: 56, n: 70, t: 10 }, "1|1|1": { best: 60, last: 60, ok: 30, n: 50, t: 5 } }, updatedAt: 1 };
const KB = { totalStars: 1, kjTerm: { "7|1|1": { best: 70, last: 70, ok: 49, n: 70, t: 20 }, M: { best: 90, last: 90, ok: 63, n: 70, t: 7 } }, updatedAt: 2 };
m = M.mergeStates(KA, KB);
ok("kjTerm：ベストは大きい方・前回は新しい方", m.kjTerm["7|1|1"].best === 80 && m.kjTerm["7|1|1"].last === 70 && m.kjTerm["1|1|1"].best === 60 && m.kjTerm.M.best === 90, m.kjTerm);
ok("kjTerm があれば空ではない", !M.isBlank({ kjTerm: { "1|1|1": { best: 10 } } }) && M.isBlank({ kjTerm: {} }));
console.log(`\n${n - f}/${n} passed`); process.exit(f ? 1 : 0);
