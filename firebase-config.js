/* ほしの学園 — Firebase の設定（無料の Spark プランだけで使います。お金のかかる機能は使いません）
   enabled: false にすると、ログイン画面を出さず、今までどおり端末の中だけに保存します（Web の apiKey は公開してよい値。データは firestore.rules で本人だけに限定）。 */
window.HM_FIREBASE = {
  enabled: true,
  sdk: "12.6.0",
  config: {
    apiKey: "AIzaSyBwgS3DnEhABKgTcRHL3S8Dt11KM5yUQcI",
    authDomain: "huishilichuan-bot.github.io", // ログイン用ヘルパーを同じオリジンで配信（https://huishilichuan-bot.github.io/__/auth/）。iPhone の Safari でもログインできる
    projectId: "hoshi-gakuen",
    storageBucket: "hoshi-gakuen.firebasestorage.app",
    messagingSenderId: "260767197064",
    appId: "1:260767197064:web:0be3e1724f5da11b93bc3d",
  },
};
