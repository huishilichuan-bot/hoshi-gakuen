# 第10回：弱い・普通・強いで手ごたえが変わるか（テスト用ボットで タンクバトル・パルクール を遊ぶ）。python tools/test_r10_diff.py [BASE] [回数]
import json, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOAUTH = ("window.__HM_NO_GK = true; Object.defineProperty(window, 'HM_FIREBASE', { configurable: true, get() { return { enabled: false }; }, set() {} }); "
          "try{localStorage.setItem('hoshigakuen:consent',JSON.stringify({v:'2026-11-21',t:1}))}catch(e){} try{localStorage.setItem('hoshigakuen-auth-seen','1')}catch(e){}")
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:18473"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 2
BOTS = open(os.path.join(ROOT, "tools", "r9_bots.js")).read()
GAMES = os.environ.get("R10_GAMES", "tankbattle,parkour").split(",")
out = {}
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = br.new_context(viewport={"width": 390, "height": 760}, is_mobile=True, has_touch=True, service_workers="block")
    ctx.add_init_script(NOAUTH); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "/index.html"); pg.wait_for_timeout(1500)
    pg.evaluate("""() => { const st = HM_APP.exportState(); st.settings = st.settings || {}; st.settings.sound = false; const day = HM_APP.today(); st.days = st.days || {}; st.days[day] = Object.assign({ stars: 0, steps: {} }, st.days[day] || {}, { stars: 60 }); HM_APP.importState(st); }""")
    pg.add_script_tag(content=BOTS)
    for gid in GAMES:
        for diff in ["easy", "normal", "hard"]:
            for k in range(N):
                pg.evaluate("window.__G3D = null"); pg.evaluate("([id, d]) => GCGames.open[id](d)", [gid, diff])
                pg.wait_for_function("window.__G3D && window.__G3D.game && !window.__G3D.dead", timeout=20000); pg.wait_for_timeout(2500)
                pg.evaluate("k => { window.__botErr = 1.2; window.__botSmash = 1; window.__R9BOTS[k](); }", gid)
                done = False
                for s in range(150):
                    pg.wait_for_timeout(1000)
                    if pg.evaluate("!!(window.__G3D && window.__G3D.done)"): done = True; break
                pg.wait_for_timeout(800)
                res = pg.evaluate("() => { const r = document.getElementById('gl-result'); return r && !r.hidden ? r.innerText.replace(/\\s+/g, ' ').slice(0, 80) : ''; }")
                dbg = pg.evaluate("JSON.stringify(window.__G3D.game.dbg())")
                d = json.loads(dbg)
                row = {"done": done, "res": res, "hp": d.get("hp"), "rank": d.get("rank")}
                out.setdefault(gid, {}).setdefault(diff, []).append(row)
                print(gid, diff, json.dumps(row, ensure_ascii=False), flush=True)
                pg.evaluate("() => { const c = document.getElementById('gl-close'); if (c) c.click(); if (window.GF && GF.closeLayer) GF.closeLayer(); }"); pg.wait_for_timeout(600)
    print("errs", errs[:3])
    br.close()
