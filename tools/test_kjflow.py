# 漢字テスト（学年→学期→回）の通し：書き→読みの順・点数・記録・毎回同じ問題・まとめ
# 使い方: python tools/test_kjflow.py   （BASE=公開URL を付けると、その URL で動かす）
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

NOAUTH = (
    "window.__HM_NO_GK = true; "
    "Object.defineProperty(window, 'HM_FIREBASE', { configurable: true, get() { return { enabled: false }; }, set() {} }); "
    "try{localStorage.setItem('hoshigakuen:consent',JSON.stringify({v:'2026-11-21',t:1}))}catch(e){}"
    "try{localStorage.setItem('hoshigakuen-auth-seen','1')}catch(e){}"
)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get("BASE")
PORT = 8783
srv = None
if not BASE:
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    BASE = f"http://localhost:{PORT}/"
results, errors = [], []


def ok(name, cond, info=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ((" :: " + str(info)) if info else ""))


try:
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        ctx.add_init_script(NOAUTH)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(BASE + "index.html")
        pg.wait_for_timeout(1500)
        E = pg.evaluate

        def seed(grade):
            E("""(g) => { const st = HM_APP.exportState(); st.settings = st.settings || {}; st.settings.grade = g; st.settings.sound = false; st.settings.haptic = false; if (!st.partner) st.partner = (st.gk && st.gk.partner) || 'ren'; HM_APP.importState(st); }""", grade)
            pg.wait_for_timeout(300)

        for sel in ["#consent .btn", "#consent button", ".auth-skip", ".greet .btn"]:
            loc = pg.locator(sel)
            if loc.count():
                try: loc.first.click(timeout=800)
                except Exception: pass
        seed(1)

        def tap(sel):
            loc = pg.locator(sel).first
            loc.scroll_into_view_if_needed(timeout=8000)
            loc.click(timeout=8000)
            pg.wait_for_timeout(120)

        def open_round(g, key):
            if pg.locator('#quiz:not([hidden]) [data-q="quit"]').count():
                tap('#quiz [data-q="quit"]')
            pg.locator('.tab[data-tab="home"]').click(); pg.wait_for_timeout(250)
            tap('[data-act="mode-kj"]')
            tap('[data-act="kj-g"][data-g="%s"]' % g)
            tap('[data-act="kj-round"][data-key="%s"]' % key)
            tap('[data-kj="go"]')

        def run(g, idx, key, ok_fn):
            """全問を解く。ok_fn(i, kind) が True ならせいかい。戻り値＝(順番ごとの kind, 最初の問題の文)"""
            qs = E("([g, i]) => HM.KJT.questions(g, i).map(q => ({kind: q.kind, r: q.w.r}))", [g, idx])
            kinds, first = [], None
            for i, q in enumerate(qs):
                kind = "read" if "読み" in pg.inner_text(".kj50-kind") else "write"
                kinds.append(kind)
                if i == 0: first = pg.inner_text(".kj50-body")
                good = ok_fn(i, q["kind"])
                if kind == "read":
                    if good: tap('[data-kj="pick"][data-v="%s"]' % q["r"])
                    else:
                        wrong = E("() => { const o = [...document.querySelectorAll('[data-kj=pick]')].map(e => e.dataset.v); return o; }")
                        tap('[data-kj="pick"][data-v="%s"]' % [o for o in wrong if o != q["r"]][0])
                    tap('[data-kj="lock"]'); tap('[data-kj="next"]')
                else:
                    tap('[data-kj="reveal"]'); tap('[data-kj="self"][data-ok="%d"]' % (1 if good else 0)); tap('[data-kj="next"]')
            return kinds, first, qs

        # 小1 第1回：50問・書き40→読み10・全問正解で100点
        open_round(1, "1|1|1")
        kinds, first1, qs = run(1, 0, "1|1|1", lambda i, k: True)
        ok("小1第1回は 50 問", len(kinds) == 50, len(kinds))
        ok("書き40問のあとに読み10問（まざらない）", kinds[:40] == ["write"] * 40 and kinds[40:] == ["read"] * 10, "".join(k[0] for k in kinds))
        res = pg.inner_text("#quiz")
        ok("全問正解で 100 点", "100" in res and E("HM_APP.state().kjTerm['1|1|1'].best") == 100, res[:60].replace("\n", " "))
        ok("記録に best/last/ok/n が入る", E("JSON.stringify(HM_APP.state().kjTerm['1|1|1'])").find('"ok":50') > 0)
        # 同じ回をもう一度：同じ問題、読みだけ全部まちがえる → 80点（ベストは100のまま）
        tap('[data-kj="again"]'); tap('[data-kj="go"]')
        kinds2, first2, _ = run(1, 0, "1|1|1", lambda i, k: k == "write")
        ok("同じ回は最初の問題が同じ", first1 == first2)
        t = E("HM_APP.state().kjTerm['1|1|1']")
        ok("書きだけ正解で 80 点、ベストは 100 のまま", t["last"] == 80 and t["best"] == 100, t)

        # 中1 第1回（70問）：52問正解 → 52/70 = 74.3 → 74点
        pg.locator('#quiz [data-q="quit"]').first.click(); pg.wait_for_timeout(200)
        open_round(7, "7|1|1")
        kinds3, _, _ = run(7, 0, "7|1|1", lambda i, k: i < 52)
        ok("中1第1回は 70 問・書き56→読み14", len(kinds3) == 70 and kinds3[:56] == ["write"] * 56 and kinds3[56:] == ["read"] * 14)
        t = E("HM_APP.state().kjTerm['7|1|1']")
        ok("52/70 は 74 点に換算", t["best"] == 74 and t["ok"] == 52 and t["n"] == 70, t)
        ok("結果に換算のせつめいが出る", "74" in pg.inner_text("#quiz") and "換算" in pg.inner_text("#quiz"))

        # 中学のまとめ
        pg.locator('#quiz [data-q="quit"]').first.click(); pg.wait_for_timeout(200)
        open_round("M", "M")
        kinds4, _, _ = run("M", 0, "M", lambda i, k: True)
        ok("まとめは 70 問・全問正解 100 点", len(kinds4) == 70 and E("HM_APP.state().kjTerm['M'].best") == 100)
        # コインは1日1回（学年ごと）：2回目の同じメニューでは増えない
        c1 = E("HM_APP.state().gk.coins.e")
        pg.locator('#quiz [data-q="quit"]').first.click(); pg.wait_for_timeout(200)
        open_round(1, "1|1|1")
        run(1, 0, "1|1|1", lambda i, k: True)
        pg.locator('#quiz [data-q="quit"]').first.click(); pg.wait_for_timeout(200)
        c2 = E("HM_APP.state().gk.coins.e")
        open_round(1, "1|1|1")
        run(1, 0, "1|1|1", lambda i, k: True)
        c3 = E("HM_APP.state().gk.coins.e")
        ok("コインは1日1回だけ（同じ学年・同じメニュー）", c3 == c2, [c1, c2, c3])
        ok("ページ全体でJSエラーなし", not errors, errors[:3])
        br.close()
finally:
    if srv: srv.terminate()
bad = [n for n, c in results if not c]
print("\n%d/%d passed" % (len(results) - len(bad), len(results)))
sys.exit(1 if bad else 0)
