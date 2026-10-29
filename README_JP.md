# CopyLoad

<div align="center">
  <img src="icons/icon128.png" alt="CopyLoad ロゴ" width="128" height="128">
  <h3>クリップボード履歴 — テキスト＆画像</h3>
  <p>Chrome/Edge 拡張機能（Manifest V3）。データは端末内のみ。サーバーへ送信しません。</p>

  [![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/anhhackta/CopyLoad-Extension/releases)
  [![ライセンス](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![言語](https://img.shields.io/badge/VI-red.svg)](README.md)
  [![言語](https://img.shields.io/badge/EN-blue.svg)](README_EN.md)
  [![言語](https://img.shields.io/badge/JP-orange.svg)](README_JP.md)
</div>

<p align="center">
  <a href="README.md">Tiếng Việt</a> · <a href="README_EN.md">English</a> · <b>日本語</b>
  · <a href="https://anhhackta.github.io/CopyLoad-Extension/">Website</a>
  · <a href="https://github.com/anhhackta/CopyLoad-Extension/releases">Releases</a>
</p>

---

## 機能（v1.0.2）

- **テキスト保存**: Ctrl+C / 切り取り / 貼り付けで自動保存、または右クリック → *CopyLoad に保存*
- **画像保存**: 右クリック → *画像を CopyLoad に保存*、またはポップアップからクリップボード画像を貼り付け
- **分類＆ピン**: text / link / email / 数字 / code；重要項目をピン留め
- **一時／永続**: 「永続保存」オフでセッション限りのテキスト（画像も保存されない）
- **Paste Multi**: 入力欄で Ctrl+V すると履歴から選択（候補ボックス、または 1–0 のクイックモード）
- **PIN ロック**: 4〜6桁の PIN でポップアップ／管理画面／Paste Multi を保護
- **データ**: JSON の書き出し／読み込み（任意でパスワード暗号化）、.txt 書き出し、古い項目の自動削除、一括削除
- **UI**: ライト／ダーク／システム；ベトナム語＆英語；ポップアップ＋フル管理ページ
- **ストレージ**: 履歴は IndexedDB；設定は sync/local；分析なし・通信なし

---

## ZIP からインストール

1. [Releases](https://github.com/anhhackta/CopyLoad-Extension/releases/latest) から最新版をダウンロード
2. ZIP を解凍
3. `chrome://extensions`（または `edge://extensions`）を開く
4. **デベロッパーモード**をオン
5. **パッケージ化されていない拡張機能を読み込む** → `manifest.json` があるフォルダを選択

> まだ Chrome ウェブストア / Edge アドオンには未公開です。

---

## 使い方（短縮）

| 操作 | 方法 |
|------|------|
| テキスト保存 | Ctrl+C（設定で有効時）または右クリック |
| 画像保存 | 画像を右クリック、または「画像」タブ → 貼り付け |
| 履歴から貼り付け | Paste Multi をオン → 入力欄で Ctrl+V |
| 通常の貼り付け | Ctrl+Shift+V または右クリックの貼り付け |
| 管理画面 | ポップアップの「管理を開く」 |
| ロック | 設定で PIN を有効化 |

---

## 構成

```
CopyLoad/
├── manifest.json
├── icons/
├── src/
│   ├── background/     # service worker
│   ├── content/        # コピー／貼り付け + Paste Multi
│   ├── app/            # ポップアップ + 管理 UI
│   └── shared/         # constants, i18n, db, settings, lock, crypto
├── index.html          # ランディング（GitHub Pages）
├── README.md / README_EN.md / README_JP.md
└── LICENSE             # MIT
```

`legacy-old` ブランチには初期公開版（v1.1.1・テキストのみ・旧アーキテクチャ）があります。

---

## プライバシー

クリップボードデータは端末内のみ（IndexedDB / `chrome.storage`）。外部送信なし。PIN は UI ロック（PBKDF2）で、IndexedDB 全体は暗号化しません。書き出しファイルはパスワード指定時に AES-GCM で暗号化できます。

---

## ライセンス

[MIT](LICENSE) — 著作権表示／作者クレジットを残す限り、利用・改変・再配布が可能です。

---

## 作者

**Nguyễn Bá Hoàng** ([@anhhackta](https://github.com/anhhackta))

- Website: [anhhackta.com](https://anhhackta.com) · [GitHub Pages](https://anhhackta.github.io/CopyLoad-Extension/)
- Facebook: [@anhhackta.official](https://facebook.com/anhhackta.official)
- Support: [Buy Me a Coffee](https://www.buymeacoffee.com/anhhackta)
