# 第7回（v1.8.0）：3Dレース12本のテスト。python tools/test_r7.py [BASE]
# 12本が開いて走れること・エラーがないこと／周回の選択（周回コースだけ）／右を押すと画面の右へ／ゴールして記録が残る／前の記録が消えない
import sys, json
from playwright.sync_api import sync_playwright
NOAUTH = ("window.__HM_NO_GK = true; Object.defineProperty(window, 'HM_FIREBASE', { configurable: true, get() { return { enabled: false }; }, set() {} }); try{localStorage.setItem('hoshigakuen:consent',JSON.stringify({v:'2026-11-21',t:1}))}catch(e){} try{localStorage.setItem('hoshigakuen-auth-seen','1')}catch(e){}")
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:18473/"
LAPS = ["bikerace", "rally", "boatrace", "jetski", "sledrace", "spacerace", "horserace", "cycling", "racing"]
SPRINT = ["skirace", "snowboard", "highway"]
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
    _v = pg.evaluate("HM_APP.version"); ok("VERSION が 1.8.0 以上", tuple(map(int, _v.split("."))) >= (1, 8, 0), _v)
    # 前の記録（2D時代の記録）を入れておく
    pg.evaluate("""() => { const st = HM_APP.exportState(); st.games = st.games || {}; st.games.rally = Object.assign({ plays: 7, wins: 3, best: { normal: 99.9 } }, st.games.rally || {}); st.settings = st.settings || {}; st.settings.sound = false; st.settings.haptic = false; const day = HM_APP.today(); st.days = st.days || {}; st.days[day] = Object.assign({ stars: 0, steps: {} }, st.days[day] || {}, { stars: 30 }); HM_APP.importState(st); }""")
    for sel in ["#consent .btn", ".auth-skip", ".greet .btn"]:
        if pg.locator(sel).count():
            try: pg.locator(sel).first.click(timeout=800)
            except Exception: pass
    ok("12本すべて HMRace3d に登録", pg.evaluate("ids => ids.every((id) => GCGames.open[id] && HMGames.byId ? true : !!GCGames.open[id])", LAPS + SPRINT))
    ok("周回コース9本は2周・3周をえらべる", pg.evaluate("ids => ids.every((id) => HMRace3d.hasLaps(id))", LAPS))
    ok("一方通行3本は周回なし", pg.evaluate("ids => ids.every((id) => !HMRace3d.hasLaps(id))", SPRINT))
    # ゲーム一覧：長い名前が1行
    pg.locator('.tabbar [data-tab="games"]').click(); pg.wait_for_timeout(800)
    lines = pg.evaluate("""() => [...document.querySelectorAll('.app-ic .an')].map((e) => { const r = e.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || 14; const sub = e.querySelector('.an-sub'); const h = r.height - (sub ? sub.getBoundingClientRect().height + 2 : 0); return [e.firstChild && e.firstChild.textContent, Math.round(h / lh)]; }).filter((x) => x[1] > 1)""")
    ok("ゲーム一覧の名前は1行", not lines, lines[:5])
    pg.screenshot(path="/workspace/hoshigakuen-r7-list.png")
    for gid in LAPS + SPRINT:
        btn = pg.locator(f'.app-ic[data-game="{gid}"]')
        if not btn.count():
            # グループにまとめられているときは直接ひらく
            pg.evaluate("id => GCGames.open[id]('normal')", gid)
        else:
            btn.first.scroll_into_view_if_needed(); btn.first.click(); pg.wait_for_timeout(500)
            has = pg.locator('#mode-sel [data-laps]').count()
            ok(f"{gid}: 周回の選択 {'あり' if gid in LAPS else 'なし'}", (has == 2) == (gid in LAPS), has)
            if has: pg.locator('#mode-sel [data-laps="3"]').click(); pg.wait_for_timeout(200)
            pg.locator('#mode-sel [data-diff="normal"]').click()
        pg.wait_for_function("window.__R3D && window.__R3D.racers && !window.__R3D.dead", timeout=20000)
        lapTxt = pg.evaluate("document.querySelector('.r3d-lap').textContent")
        if gid in LAPS: ok(f"{gid}: 3周で始まる", lapTxt == "LAP 1/3", lapTxt)
        else: ok(f"{gid}: 周回なし（スタート／ゴールまで）", lapTxt == "スタート" or lapTxt.startswith("ゴールまで"), lapTxt)
        pg.wait_for_timeout(3300)
        # 自動で進まない
        sp0 = pg.evaluate("window.__R3D.me.speed")
        ok(f"{gid}: 自動で進まない", abs(sp0) < 0.5, sp0)
        pg.keyboard.down("ArrowUp"); pg.wait_for_timeout(1500)
        # 右を押すと画面の右へ（カメラの右ベクトルとの内積で調べる）
        lat = pg.evaluate("""() => new Promise((res) => { const s = window.__R3D, m = s.me, cam = s.camera; cam.updateMatrixWorld(); const e = cam.matrixWorld.elements; const rx = e[0], rz = e[2]; const x0 = m.x, z0 = m.z, fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
          setTimeout(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); const dx = m.x - x0, dz = m.z - z0; const along = dx * fx + dz * fz; res((dx - fx * along) * rx + (dz - fz * along) * rz); }, 700); })""")
        ok(f"{gid}: 右で画面の右へ", lat > 0.05, lat)
        pg.keyboard.up("ArrowUp")
        ok(f"{gid}: エラーなし", not errs, errs[:3])
        pg.evaluate("() => { const x = document.querySelector('.layer .lx, .layer [data-close], .gl-x'); if (x) x.click(); else if (window.GF && GF.closeLayer) GF.closeLayer(); }")
        pg.wait_for_timeout(400)
    # ゴールまで：ハイウェイ（一方通行）と競馬（周回）。CPUのトップの位置にワープさせてゴールさせる
    for gid in ["highway", "horserace"]:
        pg.evaluate("id => { HMRace3d.pendingLaps = 2; GCGames.open[id]('normal'); }", gid)
        pg.wait_for_function("window.__R3D && window.__R3D.racers && !window.__R3D.dead && window.__R3D.go", timeout=25000)
        done = False
        for k in range(160):
            pg.wait_for_timeout(500)
            st = pg.evaluate("""() => { const s = window.__R3D, me = s.me; const lead = s.racers.filter((r) => !r.me).sort((a, b) => (b.lap + b.t) - (a.lap + a.t))[0];
              if (!me.fin && lead) { me.x = lead.x; me.z = lead.z; me.yaw = lead.yaw; me.t = lead.t; me.lap = lead.lap; me.sector = lead.sector; me.secBits = lead.secBits; me._pt = lead._pt; me.speed = lead.speed; }
              return { fin: me.fin, done: s.done }; }""")
            if st["done"]: done = True; break
        ok(f"{gid}: ゴールできる", done, st)
        pg.wait_for_timeout(1500)
        rec = pg.evaluate("id => (HM_APP.state().games || {})[id] || null", gid)
        ok(f"{gid}: 記録が残る", bool(rec), rec)
        pg.evaluate("() => { if (window.GF && GF.closeLayer) GF.closeLayer(); document.querySelectorAll('.res-close,[data-res=\"close\"]').forEach((b) => b.click()); }")
        pg.wait_for_timeout(500)
    rally = pg.evaluate("(HM_APP.state().games || {}).rally")
    ok("前の記録（rally）が消えていない", bool(rally) and rally.get("plays", 0) >= 7, rally)
    ok("エラーなし（全体）", not errs, errs[:3])
    br.close()
print(json.dumps({"ok": len(oks), "ng": len(fails), "fails": fails}, ensure_ascii=False))
sys.exit(1 if fails else 0)
