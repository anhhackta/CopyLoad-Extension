# CopyLoad

<div align="center">
  <img src="icons/icon128.png" alt="CopyLoad Logo" width="128" height="128">
  <h3>Clipboard history — text & images</h3>
  <p>Chrome/Edge extension (Manifest V3). Data stays on your device; nothing is uploaded.</p>

  [![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/anhhackta/CopyLoad-Extension/releases)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Language](https://img.shields.io/badge/VI-red.svg)](README.md)
  [![Language](https://img.shields.io/badge/EN-blue.svg)](README_EN.md)
  [![Language](https://img.shields.io/badge/JP-orange.svg)](README_JP.md)
</div>

<p align="center">
  <a href="README.md">Tiếng Việt</a> · <b>English</b> · <a href="README_JP.md">日本語</a>
  · <a href="https://anhhackta.github.io/CopyLoad-Extension/">Website</a>
  · <a href="https://github.com/anhhackta/CopyLoad-Extension/releases">Releases</a>
</p>

---

## Features (v1.0.2)

- **Text capture**: auto-save on Ctrl+C / cut / paste; or right-click → *Save to CopyLoad*
- **Images**: right-click → *Save image to CopyLoad*, or paste from the system clipboard in the popup
- **Classify & pin**: text / link / email / number / code; pin important items
- **Temp vs permanent**: turn off “Save permanently” for session-only text (and no image saves)
- **Paste Multi**: Ctrl+V in an input to pick a saved snippet (suggestion box or quick 1–0 mode)
- **PIN lock**: 4–6 digit PIN for popup / manager / Paste Multi
- **Data tools**: export/import JSON (optional password encryption), plain .txt export, auto-delete old items, bulk delete
- **UI**: light / dark / system; Vietnamese & English; compact popup + full manager page
- **Storage**: IndexedDB for history; sync/local settings; no analytics, no network calls

---

## Install from ZIP

1. Download the latest build from [Releases](https://github.com/anhhackta/CopyLoad-Extension/releases/latest)
2. Unzip the folder
3. Open `chrome://extensions` (or `edge://extensions`)
4. Enable **Developer mode**
5. **Load unpacked** → select the folder that contains `manifest.json`

> Not on the Chrome Web Store / Edge Add-ons yet.

---

## Quick usage

| Task | How |
|------|-----|
| Save text | Ctrl+C (if enabled) or right-click |
| Save image | Right-click image, or Images tab → Paste image |
| Paste from history | Enable Paste Multi → Ctrl+V in an input |
| Normal paste | Ctrl+Shift+V or right-click Paste |
| Full manager | Open-manager button in the popup |
| Lock | Enable PIN in Settings |

---

## Layout

```
CopyLoad/
├── manifest.json
├── icons/
├── src/
│   ├── background/     # service worker
│   ├── content/        # copy/paste + Paste Multi picker
│   ├── app/            # popup + manager UI
│   └── shared/         # constants, i18n, db, settings, lock, crypto
├── index.html          # landing (GitHub Pages)
├── README.md / README_EN.md / README_JP.md
└── LICENSE             # MIT
```

The `legacy-old` branch keeps the first public build (v1.1.1, text-only, older architecture).

---

## Privacy

Clipboard data stays local (IndexedDB / `chrome.storage`). Nothing is sent off-device. PIN is a UI lock (PBKDF2); IndexedDB itself is not fully encrypted — optional AES-GCM applies to export files when you set a password.

---

## License

[MIT](LICENSE) — use, modify, and redistribute freely as long as you **keep the copyright notice / credit the author**.

---

## Author

**Nguyễn Bá Hoàng** ([@anhhackta](https://github.com/anhhackta))

- Website: [anhhackta.com](https://anhhackta.com) · [GitHub Pages](https://anhhackta.github.io/CopyLoad-Extension/)
- Facebook: [@anhhackta.official](https://facebook.com/anhhackta.official)
- Support: [Buy Me a Coffee](https://www.buymeacoffee.com/anhhackta)
