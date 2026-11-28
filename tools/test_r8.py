# 第8回（v1.9.0）：3Dスポーツ5本のテスト。python tools/test_r8.py [BASE] [--quick]
# 5本が開けること・エラーがないこと／何もしないと動かない（自動操作なし）／右を押すと画面の右へ／さいごまで遊べて記録が残る／前の記録が消えない
import sys, json, os
from playwright.sync_api import sync_playwright
NOAUTH = ("window.__HM_NO_GK = true; Object.defineProperty(window, 'HM_FIREBASE', { configurable: true, get() { return { enabled: false }; }, set() {} }); try{localStorage.setItem('hoshigakuen:consent',JSON.stringify({v:'2026-11-21',t:1}))}catch(e){} try{localStorage.setItem('hoshigakuen-auth-seen','1')}catch(e){}")
args = [a for a in sys.argv[1:] if not a.startswith("--")]
BASE = args[0] if args else "http://localhost:18473/"
QUICK = "--quick" in sys.argv
SHOTS = os.environ.get("R8_SHOTS", "")
GAMES = ["baseball", "pingpong", "tennis", "basket", "bowling"]
BOT = {"baseball": "baseball", "pingpong": "rally", "tennis": "rally", "basket": "basket", "bowling": "bowling"}
# 右を押したときに動くもの（世界の座標）
PT = {
    "baseball": "d => [-d.cu, d.cv, 0.35]",
    "pingpong": "d => [d.px, 1, d.PZ]", "tennis": "d => [d.px, 1, d.PZ]",
    "basket": "d => [d.px, 1, d.pz]",
    "bowling": "d => [d.ball.x, 0.1, d.ball.z]",
}
BOTS = open(os.path.join(os.path.dirname(__file__), "r8_bots.js"), encoding="utf-8").read()
fails, oks = [], []
def ok(name, cond, info=""):
    (oks if cond else fails).append(name + ("" if cond else " → " + str(info)))
    print(("OK  " if cond else "NG  ") + name, "" if cond else info, flush=True)
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = br.new_context(viewport={"width": 390, "height": 760}, is_mobile=True, has_touch=True, service_workers="block")
    ctx.add_init_script(NOAUTH); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "index.html"); pg.wait_for_timeout(1500)
    ok("VERSION が 1.9.0", pg.evaluate("HM_APP.version") == "1.9.0", pg.evaluate("HM_APP.version"))
    # 前の記録（2D時代の記録）を入れておく
    pg.evaluate("""() => { const st = HM_APP.exportState(); st.games = st.games || {}; ['baseball','pingpong','tennis','basket','bowling'].forEach((id) => { st.games[id] = Object.assign({ easy: { plays: 4, wins: 2, streak: 0, maxStreak: 2 } }, st.games[id] || {}); }); st.settings = st.settings || {}; st.settings.sound = false; st.settings.haptic = false; const day = HM_APP.today(); st.days = st.days || {}; st.days[day] = Object.assign({ stars: 0, steps: {} }, st.days[day] || {}, { stars: 30 }); HM_APP.importState(st); }""")
    for sel in ["#consent .btn", ".auth-skip", ".greet .btn"]:
        if pg.locator(sel).count():
            try: pg.locator(sel).first.click(timeout=800)
            except Exception: pass
    ok("5本が HM3D で登録", pg.evaluate("ids => ids.every((id) => !!GCGames.open[id]) && !!window.HM3D", GAMES))
    pg.locator('.tabbar [data-tab="games"]').click(); pg.wait_for_timeout(800)
    ok("「準備中」が出ない", "準備中" not in pg.evaluate("document.body.innerText"))
    if SHOTS: pg.screenshot(path=SHOTS + "-list.png")
    pg.add_script_tag(content=BOTS)
    for gid in GAMES:
        errs.clear()
        btn = pg.locator(f'.app-ic[data-game="{gid}"]')
        if btn.count():
            btn.first.scroll_into_view_if_needed(); btn.first.click(); pg.wait_for_timeout(500)
            if pg.locator('#mode-sel [data-diff="normal"]').count(): pg.locator('#mode-sel [data-diff="normal"]').click()
        else:
            pg.evaluate("id => GCGames.open[id]('normal')", gid)
        pg.wait_for_function("window.__G3D && window.__G3D.game && !window.__G3D.dead", timeout=20000)
        pg.wait_for_timeout(2500)
        d0 = pg.evaluate("JSON.stringify(window.__G3D.game.dbg())")
        pg.wait_for_timeout(1500)
        d1 = pg.evaluate("JSON.stringify(window.__G3D.game.dbg())")
        # 何もしないと動かない：位置・スコア・投球数が変わらない
        keys = {"baseball": ["cu", "cv", "score"], "pingpong": ["px", "my", "op", "rallyN"], "tennis": ["px", "my", "op", "rallyN"], "basket": ["si", "shots", "score"], "bowling": ["bx", "phase", "fi"]}[gid]
        a, b = json.loads(d0), json.loads(d1)
        ok(f"{gid}: 自動で動かない", all(a[k] == b[k] for k in keys), [(k, a[k], b[k]) for k in keys if a[k] != b[k]])
        # 右を押すと画面の右へ
        hold = 120 if gid == "basket" else 600
        lat = pg.evaluate("""([f, hold]) => new Promise((res) => { const s = window.__G3D, pt = eval(f); const scr = () => { const d = s.game.dbg(), w = pt(d), v = new s.camera.position.constructor(w[0], w[1], w[2]); s.camera.updateMatrixWorld(); v.project(s.camera); return v.x; };
          const x0 = scr(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
          setTimeout(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); setTimeout(() => res(scr() - x0), 700); }, hold); })""", [PT[gid], hold])
        ok(f"{gid}: 右で画面の右へ", lat > 0.01, lat)
        if SHOTS: pg.screenshot(path=f"{SHOTS}-{gid}.png")
        if QUICK:
            pg.evaluate("() => { if (window.GF && GF.closeLayer) GF.closeLayer(); }"); pg.wait_for_timeout(400)
            ok(f"{gid}: エラーなし", not errs, errs[:3]); continue
        # さいごまで（テスト用ボット）
        pg.evaluate("k => { window.__botErr = 1.2; window.__botSmash = 1; window.__R8BOTS[k](); }", BOT[gid])
        done = False
        for k in range(150):
            pg.wait_for_timeout(1000)
            if pg.evaluate("!!(window.__G3D && window.__G3D.done)"): done = True; break
        fps = pg.evaluate("Math.round(window.__G3D.fps)")
        ok(f"{gid}: さいごまで遊べる（fps {fps}）", done, pg.evaluate("JSON.stringify(window.__G3D.game.dbg())"))
        pg.wait_for_timeout(1500)
        rec = pg.evaluate("id => (HM_APP.state().games || {})[id] || null", gid)
        ok(f"{gid}: 記録が残る", bool(rec and rec.get("normal") and rec["normal"].get("plays", 0) >= 1), rec)
        ok(f"{gid}: 前の記録が消えない", bool(rec and rec.get("easy") and rec["easy"].get("plays") == 4), rec)
        ok(f"{gid}: エラーなし", not errs, errs[:3])
        pg.evaluate("() => { if (window.GF && GF.closeLayer) GF.closeLayer(); document.querySelectorAll('.res-close,[data-res=\"close\"]').forEach((b) => b.click()); }")
        pg.reload(); pg.wait_for_timeout(1500)
        pg.locator('.tabbar [data-tab="games"]').click(); pg.wait_for_timeout(600)
        pg.add_script_tag(content=BOTS)
    br.close()
print("\n%d OK / %d NG" % (len(oks), len(fails)))
for f in fails: print("NG:", f)
sys.exit(1 if fails else 0)
