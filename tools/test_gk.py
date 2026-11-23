# ほしの学園 v1.1.0 相棒システムのテスト（iPhone / iPad）。使い方: python tools/test_gk.py [URL]
import sys, os, subprocess, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOT = "/workspace/hoshi-gakuen-shots"
URL = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not URL:
    srv = subprocess.Popen([sys.executable, "-m", "http.server", "8799"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    URL = "http://localhost:8799/index.html"
TAG = "live" if "github.io" in URL else "local"
INIT = "Object.defineProperty(window, 'HM_FIREBASE', { configurable: true, get() { return { enabled: false }; }, set() {} }); try{localStorage.setItem('hoshigakuen:consent',JSON.stringify({v:'2026-11-21',t:1}))}catch(e){}"
res = []
def ok(name, cond, info=""):
    res.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (" :: " + str(info) if info != "" else ""), flush=True)

def run(p, devname, short, pick):
    b = p.webkit.launch()
    ctx = b.new_context(**p.devices[devname], service_workers="block")
    ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    E = pg.evaluate
    def shot(n): pg.screenshot(path=f"{SHOT}/v110-{TAG}-{short}-{n}.png")
    pg.goto(URL); pg.wait_for_selector(".gk-intro", timeout=15000); pg.wait_for_timeout(900)
    ok(f"[{short}] はじめての案内", pg.locator(".gk-intro").count() == 1); shot("01-intro")
    for _ in range(5):
        if pg.locator(".gk-in-grid").count(): break
        pg.click('[data-gk="in-next"]'); pg.wait_for_timeout(500)
    ok(f"[{short}] 8人から相棒をえらぶ", pg.locator(".gk-in-c").count() == 8)
    pg.click(f'[data-gk="in-sel"][data-c="{pick}"]'); pg.wait_for_timeout(700); shot("02-pick")
    pg.click('[data-gk="in-go"]'); pg.wait_for_selector(".gk-greet", timeout=8000); pg.wait_for_timeout(900)
    ok(f"[{short}] 相棒が決まる", E("HMGK.G().partner") == pick)
    ok(f"[{short}] あいさつ＋ログインボーナス+30", E("HMGK.bal()") == 30, E("HMGK.bal()")); shot("03-greet")
    pg.click('#gk-ov [data-gk="ovclose"]'); pg.wait_for_timeout(900)
    ok(f"[{short}] ホームに学園の空と相棒", pg.locator(".gk-hero .gk-body").count() == 1 and pg.locator(".gk-sky svg").count() == 1); shot("04-home")
    pg.click("#gk-partner"); pg.wait_for_timeout(500)
    ok(f"[{short}] タップで話す", len(pg.inner_text("#gk-bub")) > 3)
    # 勉強：仲良し度 99 → 正解で Lv2
    E(f"(()=>{{HMGK.G().bond['{pick}']=99;HM_APP.save();}})()")
    E("HM_APP.startStep('math',1,0,0,{noCard:true})"); pg.wait_for_timeout(500)
    c0 = E("HMGK.bal()"); n = E("HM_APP.quiz().n"); dl = []; tgt0 = E("HMGK.rivalTarget()")
    for i in range(n):
        a = E("HMGK.bal()"); E("HM_APP._ans(true)"); pg.wait_for_timeout(250); dl.append(E("HMGK.bal()") - a)
        if i == 0:
            pg.wait_for_timeout(300); shot("05-quiz-cheer")
            ok(f"[{short}] 正解でコイン+10", E("HMGK.bal()") == c0 + 10, E("HMGK.bal()") - c0)
            ok(f"[{short}] 仲良し度 Lv2 に", E(f"HMGK.lvOf('{pick}')") == 2)
            ok(f"[{short}] 勉強中は大きな演出で止めない", pg.locator("#gk-ov").count() == 0)
        if i == 4:
            pg.wait_for_timeout(200); shot("06-combo5")
        pg.click('[data-q="next"]'); pg.wait_for_timeout(150)
    exp = c0 + 10 * n + (20 if n >= 5 else 0) + (50 if n >= 10 else 0) + (100 if n >= tgt0 else 0)
    ok(f"[{short}] {n}問全問正解のコイン（5連続+20・10連続+50・ライバル+100）", E("HMGK.bal()") == exp, f'{E("HMGK.bal()") - c0} / {exp - c0} {dl}')
    won_in_quiz = n >= tgt0
    shot("07-summary")
    # まとめを閉じてホームへ → Lvアップ演出
    E("HM_APP.setTab('home')"); E("(()=>{const q=document.getElementById('quiz'); if(q) q.hidden=true;})()"); E("HM_APP.render()")
    pg.wait_for_selector(".gk-lv", timeout=8000); pg.wait_for_timeout(1000)
    ok(f"[{short}] Lvアップ演出（称号つき）", "顔見知り" in pg.inner_text(".gk-lv")); shot("08-levelup")
    pg.click('#gk-ov [data-gk="ovclose"]'); pg.wait_for_timeout(800)
    if won_in_quiz:
        pg.wait_for_selector(".gk-lv.rival", timeout=8000); pg.wait_for_timeout(900)
        ok(f"[{short}] 勉強のあとにライバル勝利の演出", pg.locator(".gk-lv.rival").count() == 1); shot("09-rival-win")
        pg.click('#gk-ov [data-gk="ovclose"]'); pg.wait_for_timeout(800)
        E("(()=>{const r=HMGK.rivalRec(); r.won=0; r.best=0; HM_APP.save();})()")
    # ライバル：10連続で今週の勝負に勝つ
    b0 = E("HMGK.bal()"); tgt = E("HMGK.rivalTarget()")
    E(f"HMGK.onAnswer(true,{tgt})"); E("HM_APP.save(); HM_APP.render()")
    pg.wait_for_selector(".gk-lv.rival", timeout=8000); pg.wait_for_timeout(900)
    ok(f"[{short}] ライバル勝利 +100（＋10連続+50）", E("HMGK.bal()") - b0 == 10 + 100 + (50 if tgt % 10 == 0 else 0), E("HMGK.bal()") - b0); shot("09b-rival-win")
    pg.click('#gk-ov [data-gk="ovclose"]'); pg.wait_for_timeout(800)
    ok(f"[{short}] 今週は勝利済み", E("HMGK.rivalRec().won") == 1)
    # きせかえ：コインで交換 → 着がえ
    E("(()=>{HMGK.G().coins.e+=1000;HM_APP.save();})()"); E("HM_APP.setTab('gacha')"); pg.wait_for_timeout(600); shot("10-partner-tab")
    bb = E("HMGK.bal()")
    pg.click('.gk-oc[data-o="summer"]'); pg.wait_for_selector(".gk-buy", timeout=5000); pg.wait_for_timeout(500); shot("11-buy")
    pg.click('[data-gk="buyok"]'); pg.wait_for_timeout(900)
    ok(f"[{short}] 夏服を300で交換して着る", bb - E("HMGK.bal()") == 300 and E(f"HMGK.wearing('{pick}')") == "summer", bb - E("HMGK.bal()"))
    E("(()=>{const x=document.querySelector('.sheet-close'); if(x) x.click();})()"); pg.wait_for_timeout(400)
    pg.click('.gk-oc[data-o="base"]'); pg.wait_for_timeout(400)
    ok(f"[{short}] もってる服に自由に着がえ", E(f"HMGK.wearing('{pick}')") == "base")
    pg.click('.gk-oc[data-o="summer"]'); pg.wait_for_timeout(500); shot("12-wear-summer")
    ok(f"[{short}] 着がえはお金がかからない", bb - E("HMGK.bal()") == 300)
    # ストーリー：仲良し度 Lv4 で第1話
    ok(f"[{short}] 第1話はロック中", pg.locator(".gk-st.lock").count() == 3)
    E(f"(()=>{{HMGK.G().bond['{pick}']=305;HM_APP.save();HM_APP.render();}})()"); pg.wait_for_timeout(500)
    ok(f"[{short}] Lv4 で第1話が開く", pg.locator(".gk-st.lock").count() == 2)
    pg.click('.gk-st[data-gk="story"]'); pg.wait_for_selector(".gk-story", timeout=5000); pg.wait_for_timeout(2600); shot("13-story")
    E("(()=>{const x=document.querySelector('.sheet-close'); if(x) x.click();})()"); pg.wait_for_timeout(400)
    # Lv5 で星の制服が無料
    E(f"(()=>{{HMGK.G().bond['{pick}']=400;HM_APP.save();HM_APP.render();}})()"); pg.wait_for_timeout(500)
    ok(f"[{short}] Lv5 で星の制服が無料", pg.locator('.gk-oc[data-o="staruni"][data-gk="wear"]').count() == 1)
    pg.click('.gk-oc[data-o="staruni"]'); pg.wait_for_timeout(500)
    pg.evaluate("window.scrollTo(0,0)"); shot("14-staruni")
    # 相棒の変更
    other = "shota" if pick != "shota" else "mirai"
    E("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(300)
    pg.click(f'.gk-pc[data-c="{other}"]'); pg.wait_for_timeout(700); shot("15-profile")
    if pg.locator('.gk-prof [data-gk="pick"]').count(): pg.click('.gk-prof [data-gk="pick"]'); pg.wait_for_timeout(600)
    ok(f"[{short}] 相棒はいつでも変えられる", E("HMGK.G().partner") == other)
    # 翌日：7日連続ログイン +200
    E("(()=>{const g=HMGK.G(); const d=new Date(Date.now()-86400000); g.login.last=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); g.login.streak=6; HM_APP.save();})()")
    b1 = E("HMGK.bal()")
    pg.reload(); pg.wait_for_selector(".gk-greet", timeout=10000); pg.wait_for_timeout(900)
    ok(f"[{short}] 7日連続ログイン +30+200", E("HMGK.bal()") - b1 == 230, E("HMGK.bal()") - b1); shot("16-greet-7days")
    pg.click('#gk-ov [data-gk="ovclose"]'); pg.wait_for_timeout(700)
    E("HM_APP.setTab('home')"); pg.wait_for_timeout(700); shot("17-home-after")
    ok(f"[{short}] JSエラーなし", not errs, errs[:3])
    b.close()

with sync_playwright() as p:
    run(p, "iPhone 14", "iphone", "himuro")
    run(p, "iPad Pro 11", "ipad", "mirai")
if srv: srv.terminate()
print(f"{sum(res)}/{len(res)} passed")
sys.exit(0 if all(res) else 1)
