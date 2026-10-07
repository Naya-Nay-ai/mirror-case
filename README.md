# MIRROR CASE — shell

ゲーム内容を決める前の最小Webシェルです。

## 現在入っているもの

- レスポンシブなホーム画面
- 「事件をはじめる / つづきから / 事件記録 / 設定」の入口だけ
- version付き localStorage の土台 (`mirror-case:app:v1`)
- Vercelでそのまま静的配信できる `vercel.json`
- 外部API / DB / ログイン / ゲームロジックは未実装

## まだ入れていないもの

- 事件生成
- カード
- マップ
- 推理提出
- AI連携
- 対戦
- Plugin / MCP

## ローカル確認

このフォルダを静的HTTPサーバーで配信してください。例:

```bash
python -m http.server 8000
```

その後 `http://localhost:8000` を開きます。
