# v1.11.1：野球の作り直しのテスト。python tools/test_baseball11.py [BASE]
# ・投げ始めで予告マーカーが出る（ミットに届く 2 秒以上前）／球が手から見える
# ・ボール球なし（ぜんぶストライクゾーン）／球速（リリース→ミット）が 普通 で約 1 秒・弱い で もっと遅い
# ・指（タップ）のいちにカーソルがつく／タップで振れる／ボットがジャストで打てる
import sys, json, os
from playwright.sync_api import sync_playwright
NOAUTH = ("window.__HM_NO_GK = true; Object.defineProperty(window, 'HM_FIREBASE', { configurable: true, get() { return { enabled: false }; }, set() {} }); try{localStorage.setItem('hoshigakuen:consent',JSON.stringify({v:'2026-11-21',t:1}))}catch(e){} try{localStorage.setItem('hoshigakuen-auth-seen','1')}catch(e){}")
args = [a for a in sys.argv[1:] if not a.startswith("--")]
BASE = args[0] if args else "http://localhost:18473/"
SHOTS = os.environ.get("R11_SHOTS", "")
BOTS = open(os.path.join(os.path.dirname(__file__), "r8_bots.js"), encoding="utf-8").read()
fails = []
def ok(name, cond, info=""):
    if not cond: fails.append(name)
    print(("OK  " if cond else "NG  ") + name, "" if cond else info, flush=True)
def open_game(pg, diff):
    pg.evaluate("d => GCGames.open.baseball(d)", diff)
    pg.wait_for_function("window.__G3D && window.__G3D.game && !window.__G3D.dead", timeout=20000)
def close_game(pg):
    pg.evaluate("() => { if (window.GF && GF.closeLayer) GF.closeLayer(); }"); pg.wait_for_timeout(400)
def dbg(pg): return pg.evaluate("window.__G3D.game.dbg()")
def collect_pitches(pg, n):
    """windup・pitch を観察して n 球ぶんの記録をとる"""
    out, cur = [], None
    for _ in range(4000):
        d = dbg(pg)
        w, pi = d["wind"], d["pitch"]
        if w:
            if cur is None or cur.get("done"): cur = {"first": None, "ballOn": False, "tt": w["Tt"]}; out.append(cur)
            if cur["first"] is None and w["op"] > 0.1: cur["first"] = w["lead"]; cur["mk"] = (w["u"], w["v"])
            cur["ballOn"] = cur["ballOn"] or w["ballOn"]
        if pi and cur:
            cur["done"] = True; cur["inZone"] = pi["inZone"]; cur["u"], cur["v"] = pi["u"], pi["v"]; cur["Tt"] = pi["Tt"]
            if len(out) >= n and d["phase"] == "pitch": break
        pg.wait_for_timeout(20)
    return out
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    VID = os.environ.get("R11_VIDEO", "")
    kw = {"record_video_dir": VID, "record_video_size": {"width": 390, "height": 760}} if VID else {}
    ctx = br.new_context(viewport={"width": 390, "height": 760}, is_mobile=True, has_touch=True, service_workers="block", **kw)
    ctx.add_init_script(NOAUTH); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "index.html"); pg.wait_for_timeout(1500)
    for sel in ["#consent .btn", ".auth-skip", ".greet .btn"]:
        if pg.locator(sel).count():
            try: pg.locator(sel).first.click(timeout=800)
            except Exception: pass
    pg.add_script_tag(content=BOTS)
    res = {}
    for diff in ["easy", "normal", "ultra"]:
        open_game(pg, diff); pg.wait_for_timeout(1500)
        ps = collect_pitches(pg, 3)
        ps = [x for x in ps if x.get("done")]
        res[diff] = ps
        ok(f"{diff}: 予告マーカーが投げ始めから出て、ミットまで 2 秒以上ある", all(x["first"] is not None and x["first"] >= 2.0 for x in ps) and len(ps) >= 2, [(x.get("first")) for x in ps])
        ok(f"{diff}: 球が手の中から見えている", all(x["ballOn"] for x in ps), ps)
        ok(f"{diff}: ぜんぶストライクゾーン（ボール球なし）", all(x["inZone"] and abs(x["u"]) <= 0.25 and 0.5 <= x["v"] <= 1.12 for x in ps), [(x["u"], x["v"]) for x in ps])
        print("    リリース→ミット:", [round(x["Tt"], 2) for x in ps], "秒")
        close_game(pg)
    ok("普通の球速は約 0.9〜1.1 秒", all(0.8 <= x["Tt"] <= 1.3 for x in res["normal"]), [x["Tt"] for x in res["normal"]])
    ok("弱いは普通より遅い・強いは普通より速い", min(x["Tt"] for x in res["easy"]) > max(x["Tt"] for x in res["normal"]) * 0.95 and max(x["Tt"] for x in res["ultra"]) < min(x["Tt"] for x in res["normal"]) * 1.02, {k: [round(x["Tt"], 2) for x in v] for k, v in res.items()})
    # ---- 指（タップ）でカーソル ----
    open_game(pg, "normal"); pg.wait_for_timeout(1500)
    for (fx, fy) in [(150, 480), (240, 540)]:
        pg.touchscreen.tap(fx, fy); pg.wait_for_timeout(120)
        sc = pg.evaluate("""() => { const s = window.__G3D, d = s.game.dbg(), v = new s.camera.position.constructor(-d.cu, d.cv, 0.35); s.camera.updateMatrixWorld(); v.project(s.camera); const r = s.renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }""")
        ok(f"タップした場所 {fx},{fy} にカーソルがつく", abs(sc[0] - fx) < 12 and abs(sc[1] - fy) < 12, sc)
    # ---- タップで振れる ----
    for _ in range(600):
        if dbg(pg)["pitch"]: break
        pg.wait_for_timeout(20)
    pg.touchscreen.tap(195, 330); pg.wait_for_timeout(500)
    d = dbg(pg)
    ok("タップで振れる（スイング判定が出る）", d["lastSwing"] is not None, d["lastSwing"])
    close_game(pg)
    # ---- ボット（ジャスト）で 1 ゲーム ----
    open_game(pg, "normal"); pg.wait_for_timeout(500)
    pg.evaluate("() => { window.__botErrU = 0; window.__botErrV = 0; window.__botErrT = 0; window.__R8BOTS.baseball(); }")
    swings, shot_marker, shot_swing = [], False, False
    for _ in range(3000):
        d = dbg(pg)
        ls = d["lastSwing"]
        if ls and (not swings or swings[-1]["e"] != ls["e"]): swings.append(ls)
        if SHOTS and not shot_marker and d["wind"] and d["wind"]["t"] > 0.9 and d["n"] >= 1:
            pg.screenshot(path=SHOTS + "-marker.png"); shot_marker = True
        if SHOTS and not shot_swing and d["pitch"] and d["pitch"]["t"] > d["pitch"]["Tt"] - 0.075 and d["pitch"]["t"] < d["pitch"]["Tt"] and d["n"] >= 2:
            pg.screenshot(path=SHOTS + "-swing.png"); shot_swing = True
        if pg.evaluate("!!(window.__G3D && window.__G3D.done)"): break
        pg.wait_for_timeout(40)
    d = dbg(pg); log = d["log"]
    print("    log:", log)
    just = sum(1 for s in swings if s["tm"] == "just")
    ok("ボットがジャストで打てる（ジャスト 7 回以上）", just >= 7, [s["tm"] for s in swings])
    hrs = [l for l in log if l.startswith("HR")]
    ok("ジャストはよく飛ぶ（ホームラン 3 本以上）", len(hrs) >= 3, log)
    ok("ボール球の判定が出ない", not any(l.startswith("B") for l in log), log)
    ok("エラーなし", not errs, errs[:3])
    br.close()
print("\nNG %d" % len(fails))
for f in fails: print("NG:", f)
sys.exit(1 if fails else 0)
