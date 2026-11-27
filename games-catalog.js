/* ほしの学園 — ゲーム一覧の分類と、似たゲームのまとめ。中身のゲームはどれも遊べる */
(function (root) {
  "use strict";
  // 似たしくみのゲームを1つの入口にまとめる。members の id はそのまま遊べ、記録も id ごとに残る。
  const GROUPS = [
    { id: "pack-parkour", e: "🏃", n: "学園パルクール", c: "#ef8a3a", genre: "action",
      d: "コースを選んで走ろう。ジャンプとスライディングで障害物をかわして、CPUより先にゴールへ。",
      members: ["parkour", "runner", "ninjarun", "dinorun", "catrun", "junglerun", "castlerun", "xcountry", "hurdles"] },
    { id: "pack-sportsday", e: "🏅", n: "学園体育祭", c: "#2f9e62", genre: "sports",
      d: "100m、競泳、カヌー、綱引き。種目を選んで、リズムよく力を出そう。",
      members: ["dash100", "swim", "canoe", "tugwar"] },
    { id: "pack-shooter", e: "🚀", n: "スターストライカー", c: "#5f3dc4", genre: "shoot",
      d: "ステージを選んで、空や海や宇宙の敵から守ろう。",
      members: ["starfighter", "galaxy", "skyace", "subhunt", "dragonrider", "bugbuster"] },
    { id: "pack-field", e: "🏟️", n: "陸上フィールド", c: "#e8590c", genre: "sports",
      d: "やり投げ、砲丸、ハンマー、走り幅跳び、スキージャンプ。角度とタイミングで記録を伸ばそう。",
      members: ["javelin", "shotput", "hammer", "longjump", "skijump"] },
    { id: "pack-racket", e: "🎾", n: "ラケット部", c: "#2f9e62", genre: "sports",
      d: "テニス、卓球、バドミントン、ビーチバレー。種目を選んでラリーを続けよう。",
      members: ["tennis", "pingpong", "badminton", "beachvolley"] },
    { id: "pack-club", e: "🥋", n: "部活たいけつ", c: "#c92a2a", genre: "battle",
      d: "ボクシング、剣道、フェンシング、おすもう。相手の動きを見て、カウンター！",
      members: ["boxing", "kendo", "fencing", "sumo"] },
    { id: "pack-stall", e: "🎯", n: "お祭り屋台", c: "#e8590c", genre: "shoot",
      d: "射的、クレー射撃、ダーツ。屋台を選んで、的をねらおう。",
      members: ["shooting", "clay", "darts"] },
    { id: "pack-dodge", e: "☄️", n: "よけまくれ！", c: "#e8590c", genre: "action",
      d: "上から落ちてくるものを、ドラッグでよけつづけよう。",
      members: ["dodge", "meteor"] },
    { id: "pack-royale", e: "❄️", n: "ロイヤルバトル", c: "#4dabf7", genre: "battle",
      d: "雪合戦、水鉄砲、サバイバル、スペースロイヤル。ルールは同じ、舞台を選んで残ろう。",
      members: ["snowfight", "waterfight", "royale", "spaceroyale"] }
  ];

  const GENRE_FALLBACK = {
    climb: "sports", chess: "board", arena: "battle", reversi: "board", gomoku: "board", shogi: "board",
    memory: "card", breakout: "action", mole: "action", runner: "action", g2048: "puzzle", sudoku: "puzzle",
    coin: "puzzle", connect4: "board", ultimate: "board", dots: "board", mancala: "board", checkers: "board",
    hex: "board", battleship: "board", hasami: "board", mines: "puzzle", slide: "puzzle", lights: "puzzle",
    hanoi: "puzzle", nonogram: "puzzle", flood: "puzzle", pipes: "puzzle", blockfit: "puzzle", make10: "puzzle",
    fall: "puzzle", simon: "puzzle", snake: "action", flappy: "action", hockey: "sports", tower: "action",
    highway: "race", bubble: "puzzle", pyramid: "card", sevens: "card", oldmaid: "card", baseball: "sports",
    golf: "sports", soccer: "sports", bowling: "sports", basket: "sports", racing: "race", kart: "race",
    climber: "action", skydive: "action", slash: "action", rhythm: "action", archery: "sports", tankbattle: "battle",
    ninjabattle: "battle", zombie: "battle"
  };

  const ORDER = ["race", "sports", "action", "shoot", "battle", "puzzle", "board", "card"];

  function genreOf(g) { return g.genre || GENRE_FALLBACK[g.id] || "action"; }

  function entries(all) {
    const byId = {};
    (all || []).forEach((g) => { if (g && g.id) byId[g.id] = g; });
    const used = {}, out = [];
    GROUPS.forEach((g) => {
      const members = g.members.map((id) => byId[id]).filter(Boolean);
      if (!members.length) return;
      members.forEach((m) => { used[m.id] = 1; });
      out.push({
        id: g.id, e: g.e, n: g.n, c: g.c, d: g.d, genre: g.genre,
        group: true, members: members, fresh: !!g.fresh, pro: members.some((m) => m.pro)
      });
    });
    (all || []).forEach((g) => {
      if (used[g.id]) return;
      out.push(Object.assign({ genre: genreOf(g), group: false }, g));
    });
    out.sort((a, b) => {
      if (a.fresh && !b.fresh) return -1;
      if (!a.fresh && b.fresh) return 1;
      const ga = ORDER.indexOf(genreOf(a)), gb = ORDER.indexOf(genreOf(b));
      const oa = ga < 0 ? 99 : ga, ob = gb < 0 ? 99 : gb;
      if (oa !== ob) return oa - ob;
      return String(a.n).localeCompare(String(b.n), "ja");
    });
    return out;
  }

  function find(all, id) {
    const list = entries(all);
    return list.find((x) => x.id === id) || (all || []).find((x) => x.id === id) || null;
  }

  function playable(all, id) {
    const g = find(all, id);
    if (g && g.group) return g.members.slice();
    const one = (all || []).find((x) => x.id === id);
    return one ? [one] : [];
  }

  root.HMCatalog = { GROUPS: GROUPS, entries: entries, find: find, playable: playable, genreOf: genreOf };
})(typeof window !== "undefined" ? window : globalThis);
