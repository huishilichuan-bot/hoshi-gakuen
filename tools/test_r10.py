# 第10回（v1.11.0）：全ゲームを「普通」で少し遊んで（ランダムなタップ・キー）エラー・「準備中」がないか、3D は描けているかを確かめる。
# python tools/test_r10.py [BASE] [--secs N] [--only id,id]
import json, os, random, sys, time
from playwright.sync_api import sync_playwright
NOAUTH = ("window.__HM_NO_GK = true; Object.defineProperty(window, 'HM_FIREBASE', { configurable: true, get() { return { enabled: false }; }, set() {} }); "
          "try{localStorage.setItem('hoshigakuen:consent',JSON.stringify({v:'2026-11-21',t:1}))}catch(e){} try{localStorage.setItem('hoshigakuen-auth-seen','1')}catch(e){}")
args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and sys.argv[i - 1] not in ("--secs", "--only")]
BASE = args[0] if args else "http://127.0.0.1:18473"
SECS = float(sys.argv[sys.argv.index("--secs") + 1]) if "--secs" in sys.argv else 3.5
ONLY = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
SHOTS = os.environ.get("R10_SHOTS", "")
random.seed(10)
results = []
def ok(name, cond, info=""):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name + ((" :: " + str(info)[:300]) if info and not cond else ""), flush=True)
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = br.new_context(viewport={"width": 390, "height": 760}, is_mobile=True, has_touch=True, service_workers="block")
    ctx.add_init_script(NOAUTH); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "favicon" not in m.text and "Failed to load resource" not in m.text else None)
    pg.goto(BASE + "/index.html"); pg.wait_for_timeout(1500)
    pg.evaluate("""() => { const st = HM_APP.exportState(); st.settings = st.settings || {}; st.settings.sound = false; const day = HM_APP.today(); st.days = st.days || {}; st.days[day] = Object.assign({ stars: 0, steps: {} }, st.days[day] || {}, { stars: 60 }); HM_APP.importState(st); }""")
    ids = pg.evaluate("HM_APP.GAMES.map(g => g.id)")
    ok("ゲームの一覧がある（%d本）" % len(ids), len(ids) >= 50, len(ids))
    before = pg.evaluate("JSON.stringify(HM_APP.exportState().games || {})")
    if ONLY: ids = [i for i in ids if i in ONLY]
    for gid in ids:
        eb = len(errs)
        pg.evaluate("window.__R3D = null; window.__G3D = null;")
        pg.evaluate(f"HM_APP.startGame('{gid}','normal')"); pg.wait_for_timeout(400)
        txt = pg.evaluate("document.body.innerText")
        t0 = time.time(); shot = False; drew = None
        while time.time() - t0 < SECS:
            bx = pg.locator("#gl-body").bounding_box()
            if bx and bx["width"] > 0:
                x = bx["x"] + random.random() * bx["width"]; y = bx["y"] + 30 + random.random() * max(10, min(bx["height"], 700) - 40)
                if random.random() < .7: pg.mouse.click(x, y)
                else: pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + random.randint(-40, 40), y + random.randint(-40, 40), steps=2); pg.mouse.up()
            if random.random() < .5: pg.keyboard.press(random.choice(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"]))
            pg.wait_for_timeout(random.randint(40, 160))
            if not shot and time.time() - t0 > 2.0:
                drew = pg.evaluate("() => { const s = window.__R3D || window.__G3D; if (!s || !s.renderer) return null; const i = s.renderer.info.render; return { calls: i.calls, tris: i.triangles }; }")
                if SHOTS: pg.screenshot(path=os.path.join(SHOTS, gid + ".png"))
                shot = True
        txt += pg.evaluate("document.body.innerText")
        if gid == "basket":
            ok("basket: パワーゲージ（緑のゾーン★）が見える", pg.evaluate("() => [...document.querySelectorAll('#gl-body div')].some((d) => d.textContent === '★' && d.offsetWidth > 5 && d.getBoundingClientRect().height > 10)"))
        pg.evaluate("() => { const c = document.getElementById('gl-close'); if (c) c.click(); }"); pg.wait_for_timeout(250)
        e = errs[eb:]
        ok(f"{gid}: エラーなし", not e, e[:2])
        if "準備中" in txt: ok(f"{gid}: 「準備中」を出さない", False, "準備中")
        if drew is not None: ok(f"{gid}: 3Dが描けている", drew["calls"] > 3 and drew["tris"] > 50, drew)
    after = pg.evaluate("JSON.parse(JSON.stringify(HM_APP.exportState().games || {}))")
    old = json.loads(before)
    ok("前からの記録が消えていない", all(k in after for k in old), [k for k in old if k not in after][:5])
    br.close()
bad = [n for n, c in results if not c]
print(f"\n{len(results) - len(bad)}/{len(results)} PASS", flush=True)
sys.exit(1 if bad else 0)
