# ほしの学園 — 学習・テスト・ゲーム・ガチャの主要ボタンが正しい画面を開くこと
# （v1.7.2: 学年の data-g がガチャと取り違えられないこと／v1.7.3: 漢字テストの学年→学期→回）
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

NOAUTH = (
    "window.__HM_NO_GK = true; "
    "Object.defineProperty(window, 'HM_FIREBASE', { configurable: true, get() { return { enabled: false }; }, set() {} }); "
    "try{localStorage.setItem('hoshigakuen:consent',JSON.stringify({v:'2026-11-21',t:1}))}catch(e){}"
    "try{localStorage.setItem('hoshigakuen-auth-seen','1')}catch(e){}"
)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOT = os.path.join(ROOT, "screenshots", "v173")
os.makedirs(SHOT, exist_ok=True)
PORT = 8782
srv = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(0.8)
results = []
errors = []


def ok(name, cond, info=""):
    results.append((name, bool(cond), info if isinstance(info, str) else str(info)))
    print(("PASS " if cond else "FAIL ") + name + ((" :: " + str(info)) if info else ""))


try:
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        ctx.add_init_script(NOAUTH)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        pg.goto(f"http://localhost:{PORT}/index.html")
        pg.wait_for_timeout(1500)
        E = pg.evaluate

        def dismiss():
            for sel in ["#consent .btn", "#consent button", "[data-consent-ok]", ".auth-skip", "#auth-sheet .btn", ".greet .btn", "[data-auth='later']", "[data-auth='skip']"]:
                loc = pg.locator(sel)
                if loc.count():
                    try:
                        loc.first.click(timeout=800)
                        pg.wait_for_timeout(200)
                    except Exception:
                        pass

        def seed():
            E("""() => {
              const st = HM_APP.exportState();
              st.pulls = 10; st.pullsUsed = 0; st.totalStars = 10;
              st.settings = st.settings || {};
              st.settings.grade = 7; st.settings.sound = false; st.settings.haptic = false;
              const day = HM_APP.today();
              st.days = st.days || {};
              st.days[day] = Object.assign({ stars: 0, steps: {} }, st.days[day] || {}, { stars: 4 });
              if (!st.partner) st.partner = (st.gk && st.gk.partner) || 'ren';
              HM_APP.importState(st);
            }""")
            pg.wait_for_timeout(300)

        def gacha_on():
            return E("!!document.getElementById('gacha-show')") or pg.locator(".gacha-show").count() > 0

        def toast_text():
            try:
                return pg.locator("#toast-root").inner_text(timeout=200)
            except Exception:
                return ""

        def no_gacha(name):
            t = toast_text()
            ok(name + " でガチャが出ない", (not gacha_on()) and ("ガチャ" not in t), t)

        def close_quiz():
            if E("document.getElementById('quiz') && !document.getElementById('quiz').hidden"):
                q = pg.locator('#quiz [data-q="quit"]')
                if q.count():
                    q.first.click()
                    pg.wait_for_timeout(200)
                else:
                    E("HM_APP.setTab('home')")
                    pg.wait_for_timeout(200)

        def go_home():
            close_quiz()
            if gacha_on():
                E("document.getElementById('gacha-show') && document.getElementById('gacha-show').remove()")
            pg.locator('.tab[data-tab="home"]').click()
            pg.wait_for_timeout(250)

        def tap(sel, timeout=8000):
            loc = pg.locator(sel).first
            loc.scroll_into_view_if_needed(timeout=timeout)
            loc.click(timeout=timeout)
            pg.wait_for_timeout(250)

        dismiss()
        seed()
        dismiss()
        ver = E("HM_APP.version")
        ok("VERSION が 1.10.0", ver == "1.10.0", ver)
        ok("ガチャ回数が残っている（再現用）", E("HM_APP.pullsLeft()") >= 1, E("HM_APP.pullsLeft()"))
        ok("ホームにテスト入口がある", pg.locator('[data-act="mode-kj"]').count() == 1 and pg.locator('[data-act="mode-color"]').count() == 1 and pg.locator('[data-act="mode-exam"]').count() == 1)

        # ---- 漢字テスト（学年→学期→回） ----
        tap('[data-act="mode-kj"]')
        no_gacha("漢字テストの入口")
        ok("漢字の学年チップが 小1〜中3 とまとめ", pg.locator('[data-act="kj-g"]').count() == 10 and pg.locator('[data-act="kj-g"][data-g="M"]').count() == 1)
        ok("中1（6回）の回ボタンが並ぶ", pg.locator('[data-act="kj-round"]').count() == 6 and "1学期" in pg.inner_text("#main") and "3学期" in pg.inner_text("#main"))
        tap('[data-act="kj-g"][data-g="4"]')
        no_gacha("漢字の学年チップ")
        ok("学年チップで小4になる（5回）", pg.locator('[data-act="kj-g"][data-g="4"].on').count() == 1 and pg.locator('[data-act="kj-round"]').count() == 5)
        tap('[data-act="kj-g"][data-g="8"]')
        ok("学年チップで中2になる（6回）", pg.locator('[data-act="kj-g"][data-g="8"].on').count() == 1 and pg.locator('[data-act="kj-round"]').count() == 6)
        tap('[data-act="kj-round"][data-key="8|2|1"]')
        no_gacha("漢字テスト第1回スタート")
        cover = pg.locator(".kj-cover").count() == 1 and "漢字テスト" in pg.inner_text("#quiz") and "書き 56 問" in pg.inner_text("#quiz")
        quiz_mode = E("HM_APP.quiz() && HM_APP.quiz().mode")
        ok("漢字テストの表紙が開く", cover and quiz_mode == "kj50", quiz_mode)
        pg.screenshot(path=os.path.join(SHOT, "kanji50.png"))
        pg.screenshot(path="/workspace/hoshigakuen-fix-kanji50.png")
        # 読み・書きの練習ボタンも
        close_quiz()
        if pg.locator('[data-act="kj-start"][data-mode="read"]').count() == 0:
            go_home(); tap('[data-act="mode-kj"]')
        tap('[data-act="kj-start"][data-mode="read"]')
        no_gacha("漢字の読み練習")
        ok("漢字の読み練習が開く", E("!!HM_APP.quiz() && HM_APP.quiz().mode==='kj50'") and pg.locator(".kj50, .kj-cover").count() > 0)
        close_quiz()
        if pg.locator('[data-act="kj-start"][data-mode="write"]').count() == 0:
            go_home(); tap('[data-act="mode-kj"]')
        tap('[data-act="kj-start"][data-mode="write"]')
        no_gacha("漢字の書き練習")
        ok("漢字の書き練習が開く", E("!!HM_APP.quiz() && HM_APP.quiz().mode==='kj50'"))
        close_quiz()

        # ---- カラーテスト ----
        go_home()
        tap('[data-act="mode-color"]')
        no_gacha("カラーテストの入口")
        ok("カラーテストの学年チップがある", pg.locator('[data-act="ct-g"]').count() >= 3)
        tap('[data-act="ct-g"][data-g="7"]')
        no_gacha("カラーテストの学年チップ")
        started = False
        n_units = pg.locator('[data-act="ct-start"]').count()
        ok("カラーテストの単元がある", n_units >= 1, n_units)
        for i in range(min(n_units, 6)):
            pg.locator('[data-act="ct-start"]').nth(i).scroll_into_view_if_needed()
            pg.locator('[data-act="ct-start"]').nth(i).click()
            pg.wait_for_timeout(300)
            no_gacha(f"カラーテスト開始#{i+1}")
            if pg.locator(".ct-cover").count() and E("HM_APP.quiz() && HM_APP.quiz().mode==='color'"):
                started = True
                break
            # 問題不足のトーストなら次の単元へ
        ok("カラーテストの表紙が開く", started)
        if started:
            pg.screenshot(path=os.path.join(SHOT, "color.png"))
        close_quiz()

        # ---- 定期テスト（模試・中間期末） ----
        go_home()
        tap('[data-act="mode-exam"]')
        no_gacha("定期テストの入口")
        ok("定期テストの画面（学年・教科）", pg.locator(".ex-hero").count() == 1 and pg.locator('[data-act="ex-g"]').count() >= 3)
        tap('[data-act="ex-g"][data-g="8"]')
        no_gacha("定期テストの学年チップ")
        ok("定期テストの学年が中2", "中2" in pg.inner_text(".ex-hero") or pg.locator('[data-act="ex-g"][data-g="8"].on').count() == 1)
        ok("教科ボタンがある", pg.locator('[data-act="ex-open"]').count() >= 1)
        tap('[data-act="ex-open"]')
        no_gacha("定期テストの教科")
        ok("範囲画面から問題用紙を開ける", pg.locator('[data-act="ex-start"]').count() == 1)
        tap('[data-act="ex-start"]')
        no_gacha("定期テスト開始")
        ok("定期テストの導入が開く", pg.locator(".mock-intro").count() == 1 and E("HM_APP.quiz() && HM_APP.quiz().mode==='exam'"), E("HM_APP.quiz() && HM_APP.quiz().mode"))
        tap('[data-ex="go"]')
        no_gacha("定期テストのはじめる")
        ok("定期テストの問題用紙が開く", pg.locator(".ex-sheet, .ex-paper").count() >= 1)
        if pg.locator(".ex-sheet").count():
            pg.screenshot(path=os.path.join(SHOT, "exam.png"))
        close_quiz()

        # ---- テスト対策・復習・予習（学年や単元の data-g） ----
        go_home()
        tap('[data-act="mode-test"]')
        no_gacha("テスト対策")
        ok("テスト対策の画面", "テスト" in pg.inner_text("#main") and pg.locator(".gacha-show").count() == 0)
        # 模試（登録テスト）への入口と定期テストへの入口
        if pg.locator('[data-act="mode-exam"]').count():
            # テスト対策内の定期テストボタン（data-g は無いが経路確認）
            pass
        go_home()
        tap('[data-act="mode-review"]')
        no_gacha("復習")
        if pg.locator('[data-act="go-unit"], [data-act="go-unit-start"]').count():
            tap('[data-act="go-unit"], [data-act="go-unit-start"]')
            no_gacha("復習の単元")
            ok("復習の単元が開く（ガチャではない）", not gacha_on() and (pg.locator("[data-step], .map-node, .units-page, #quiz:not([hidden])").count() > 0 or E("document.getElementById('quiz') && !document.getElementById('quiz').hidden")))
        go_home()
        tap('[data-act="mode-prep"]')
        no_gacha("予習")
        ok("予習の学年チップがある", pg.locator('[data-act="prep-grade"]').count() >= 7)
        tap('[data-act="prep-grade"][data-g="7"]')
        no_gacha("予習の学年チップ")
        ok("予習画面のまま", pg.locator('[data-act="prep-grade"]').count() >= 1 and not gacha_on())
        if pg.locator('[data-act="go-unit-start"]').count():
            tap('[data-act="go-unit-start"]')
            no_gacha("予習の単元開始")
            close_quiz()

        # ---- 学ぶタブ ----
        go_home()
        E("""() => { const st = HM_APP.exportState(); st.settings.grade = 0; HM_APP.importState(st); }""")
        pg.wait_for_timeout(250)
        tap('.tab[data-tab="study"]')
        no_gacha("学ぶタブ")
        ok("教科一覧", pg.locator("[data-subj]").count() >= 8)
        tap('[data-subj="math"]')
        no_gacha("教科")
        ok("学年一覧", pg.locator("[data-grade]").count() >= 6)
        tap('[data-grade="7"]')
        no_gacha("学年")
        ok("単元一覧", pg.locator("[data-unit]").count() >= 1)
        tap("[data-unit]")
        no_gacha("単元")
        ok("ステップ一覧", pg.locator("[data-step]").count() >= 1)
        # 中学単元のカラーテスト入口（data-g あり）
        if pg.locator('[data-act="ct-start"]').count():
            tap('[data-act="ct-start"]')
            no_gacha("単元ページのカラーテスト")
            close_quiz()

        # ---- ゲーム ----
        go_home()
        tap('.tab[data-tab="games"]')
        no_gacha("ゲームタブ")
        ok("ゲームが解放されている", E("HM_APP.gamesOpen()") is True)
        ok("ゲーム一覧がある", pg.locator("[data-game]").count() >= 5)
        # カート（あれば）と、別の普通のゲーム
        target = "kart" if pg.locator('[data-game="kart"]').count() else None
        if not target:
            target = E("document.querySelector('[data-game]') && document.querySelector('[data-game]').dataset.game")
        tap(f'[data-game="{target}"]')
        no_gacha("ゲームを開く")
        ok("ゲームの難易度メニューが開く", pg.locator("#mode-sel, .ms-btn, [data-diff]").count() >= 1)
        # メニューを閉じて別ゲームも
        if pg.locator("#mode-sel").count() or pg.locator("#gl-close").count() == 0:
            E("document.getElementById('mode-sel') && document.getElementById('mode-sel').remove()")
            pg.wait_for_timeout(100)
        other = E("""(() => {
          const ks = [...document.querySelectorAll('[data-game]')].map(b => b.dataset.game).filter(id => id && id !== 'kart');
          return ks[0] || '';
        })()""")
        if other:
            tap(f'[data-game="{other}"]')
            no_gacha("別のゲームを開く")
            ok("別ゲームのメニューも開く", pg.locator("#mode-sel, .ms-btn, [data-diff]").count() >= 1)
            E("document.getElementById('mode-sel') && document.getElementById('mode-sel').remove()")

        # ---- 相棒タブ（旧ガチャタブ）。ガチャ演出は出さない ----
        go_home()
        tap('.tab[data-tab="gacha"]')
        no_gacha("相棒タブを開くだけ")
        partner_ui = pg.locator(".gk-hero, .gk-pv, .gk-card, [data-gk]").count() > 0
        old_gacha = pg.locator('[data-gacha], .gacha-top, .capsule-machine').count() > 0
        ok("相棒の画面が開く（ガチャ画面ではない）", partner_ui and not gacha_on(), f"partner={partner_ui} old={old_gacha}")

        # ---- 属性の取り違え防止：data-g はガチャにしない / data-gacha だけがガチャ ----
        go_home()
        pulls0 = E("HM_APP.pullsLeft()")
        E("""() => {
          const m = document.getElementById('main');
          const a = document.createElement('button');
          a.id = 't-fake-grade'; a.setAttribute('data-g', '1'); a.textContent = 'fake-g';
          const b = document.createElement('button');
          b.id = 't-real-pull'; b.setAttribute('data-gacha', '1'); b.textContent = 'real-pull';
          m.appendChild(a); m.appendChild(b);
        }""")
        tap("#t-fake-grade")
        no_gacha("data-g だけのボタン")
        ok("data-g だけではガチャ回数を消費しない", E("HM_APP.pullsLeft()") == pulls0, E("HM_APP.pullsLeft()"))
        tap("#t-real-pull")
        ok("data-gacha のボタンだけがガチャを開く", gacha_on())
        if gacha_on():
            E("document.getElementById('gacha-show') && document.getElementById('gacha-show').remove()")
        ok("ガチャ回数は data-gacha のときだけ減る", E("HM_APP.pullsLeft()") == pulls0 - 1, E("HM_APP.pullsLeft()"))

        js_err = [e for e in errors if "Failed to load" not in e and "net::" not in e]
        ok("ページ全体でJSエラーなし", not js_err, js_err[:5])
        br.close()
finally:
    srv.terminate()

passed = sum(1 for r in results if r[1])
print(f"\n{passed}/{len(results)} passed")
out = os.path.join(ROOT, "tools", "test-buttons-report.json")
json.dump({"passed": passed, "total": len(results), "results": results, "errors": errors[:20]}, open(out, "w"), ensure_ascii=False, indent=1)
sys.exit(0 if passed == len(results) else 1)
