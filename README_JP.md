# CopyLoad

<div align="center">
  <img src="icons/icon128.png" alt="CopyLoad ロゴ" width="128" height="128">
  <h3>Chrome / Edge 向けクリップボード履歴</h3>
  <p>コピーしたテキストと画像を端末内に保存。検索・ピン留め・履歴からの貼り付け・PIN ロックに対応。サーバーへは送信しません。</p>

  [![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/anhhackta/CopyLoad-Extension/releases/latest)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)](manifest.json)
</div>

<p align="center">
  <a href="README.md">English</a>
  · <a href="README_VN.md">Tiếng Việt</a>
  · <a href="README_ZH.md">中文</a>
  · <b>日本語</b>
  · <a href="https://anhhackta.github.io/CopyLoad-Extension/">Website</a>
  · <a href="https://github.com/anhhackta/CopyLoad-Extension/releases">Releases</a>
</p>

---

## CopyLoad とは

ブラウザはコピー内容を長く覚えません。CopyLoad はテキストと画像の履歴を**ローカル**に残し、検索・ピン留め・再貼り付けを可能にします。クリップボードをサーバーへ送りません。

**現行ライン：** `v1.0.2`（ブランチ `main`、長期更新）。  
**初回公開版：** [`Ver1.1.1`](https://github.com/anhhackta/CopyLoad-Extension/releases/tag/Ver1.1.1)（ブランチ `legacy-old`、テキストのみ・旧アーキテクチャ）。

---

## 機能

| 区分 | 内容 |
|------|------|
| **取得** | Ctrl+C / 切り取り / 貼り付けで自動保存（切替可）；右クリック → *CopyLoad に保存* / *画像を CopyLoad に保存* |
| **テキスト** | 検索、分類（text / link / email / 数字 / code）、ピン、一括選択、一時 / 永続 |
| **画像** | 右クリック保存またはシステムクリップボードから貼り付け；サムネイル；ピン / 削除 |
| **Paste Multi** | 入力欄で Ctrl+V すると履歴ピッカー（候補ボックスまたは `1`–`0`）；通常貼り付けは Ctrl+Shift+V |
| **セキュリティ** | 任意の 4〜6 桁 PIN；ポップアップ / 管理画面 / Paste Multi；タイムアウトで自動ロック |
| **データ** | JSON の書き出し / 読み込み（任意でパスワード暗号化）、`.txt` 書き出し、古い項目の自動削除、全削除 |
| **UI** | ライト / ダーク / システム；アプリ内はベトナム語・英語；ポップアップ＋管理ページ |
| **保存** | 履歴は IndexedDB；設定は `chrome.storage`；分析なし・クリップボード用の通信なし |

---

## インストール（ZIP / パッケージ化されていない拡張機能）

1. [Releases](https://github.com/anhhackta/CopyLoad-Extension/releases/latest) から **Latest**（`CopyLoad-1.0.2.zip`）をダウンロード
2. 解凍（フォルダ構成を維持）
3. `chrome://extensions` または `edge://extensions` を開く
4. **デベロッパーモード**をオン
5. **パッケージ化されていない拡張機能を読み込む** → `manifest.json` があるフォルダを選択

> Chrome ウェブストア / Edge アドオンには未公開です。

---

## クイックスタート

| 操作 | 方法 |
|------|------|
| テキスト保存 | Ctrl+C（有効時）または右クリック → CopyLoad に保存 |
| 画像保存 | 画像を右クリック、または「画像」タブ → 貼り付け |
| 履歴から貼り付け | Paste Multi をオン → 入力欄で Ctrl+V → 選択 |
| 通常の貼り付け | Ctrl+Shift+V または右クリックの貼り付け |
| 管理画面 | ポップアップ見出しの外部リンクボタン |
| ロック | 設定 → PIN を有効化 |

---

## 構成

```
CopyLoad/
├── manifest.json
├── icons/
├── src/
│   ├── background/   # service worker
│   ├── content/      # コピー／貼り付け + Paste Multi
│   ├── app/          # ポップアップ + 管理 UI
│   └── shared/       # constants, i18n, db, settings, lock, crypto
├── index.html
├── README.md         # English
├── README_VN.md
├── README_ZH.md
├── README_JP.md      # 日本語（このファイル）
└── LICENSE           # MIT
```

---

## プライバシー

- クリップボードデータは端末内のみ（IndexedDB / `chrome.storage`）。
- テレメトリ・広告・クラウド同期なし。
- PIN は UI ロック（PBKDF2）。IndexedDB 全体は暗号化しません。書き出し JSON はパスワード指定時に AES-GCM 可能です。

---

## ライセンス

[MIT](LICENSE) — 著作権表示／作者クレジットを残す限り、利用・改変・再配布が可能です。

---

## 作者

**Nguyễn Bá Hoàng** ([@anhhackta](https://github.com/anhhackta))

- Website: [anhhackta.com](https://anhhackta.com) · [GitHub Pages](https://anhhackta.github.io/CopyLoad-Extension/)
- Facebook: [anhhackta.official](https://facebook.com/anhhackta.official)
- Support: [Buy Me a Coffee](https://www.buymeacoffee.com/anhhackta)
