# CopyLoad

<div align="center">
  <img src="icons/icon128.png" alt="CopyLoad Logo" width="128" height="128">
  <h3>Chrome / Edge 剪贴板历史扩展</h3>
  <p>在本地保存复制的文本与图片，支持搜索、置顶、从历史粘贴，以及 PIN 锁定 —— 数据不离开你的设备。</p>

  [![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/anhhackta/CopyLoad-Extension/releases/latest)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)](manifest.json)
</div>

<p align="center">
  <a href="README.md">English</a>
  · <a href="README_VN.md">Tiếng Việt</a>
  · <b>中文</b>
  · <a href="README_JP.md">日本語</a>
  · <a href="https://anhhackta.github.io/CopyLoad-Extension/">Website</a>
  · <a href="https://github.com/anhhackta/CopyLoad-Extension/releases">Releases</a>
</p>

---

## 为什么用 CopyLoad？

浏览器不会长期记住你复制过的内容。CopyLoad 在本地保存文本与图片历史，便于查找、置顶和再次粘贴，**不会**把剪贴板内容上传到服务器。

**当前主线：** `v1.0.2`（分支 `main`，长期更新）。  
**首个公开版：** [`Ver1.1.1`](https://github.com/anhhackta/CopyLoad-Extension/releases/tag/Ver1.1.1)（分支 `legacy-old`，仅文本、旧架构）。

---

## 功能一览

| 类别 | 说明 |
|------|------|
| **采集** | Ctrl+C / 剪切 / 粘贴时自动保存（可开关）；右键 → *保存到 CopyLoad* / *保存图片到 CopyLoad* |
| **文本** | 搜索、分类（文本 / 链接 / 邮箱 / 数字 / 代码）、置顶、批量选择、临时 / 永久存储 |
| **图片** | 右键保存或从系统剪贴板粘贴；缩略图；置顶 / 删除 |
| **Paste Multi** | 在输入框按 Ctrl+V 打开历史选择（建议框或快捷键 `1`–`0`）；Ctrl+Shift+V 为普通粘贴 |
| **安全** | 可选 4–6 位 PIN，锁定弹窗、管理页与 Paste Multi；超时自动锁定 |
| **数据** | 导入 / 导出 JSON（可选密码加密）、导出 `.txt`、自动清理旧项、清空全部 |
| **界面** | 浅色 / 深色 / 跟随系统；应用内越南语与英语；弹窗 + 完整管理页 |
| **存储** | 历史使用 IndexedDB；设置使用 `chrome.storage`；无分析、无剪贴板联网请求 |

---

## 安装（ZIP / 加载已解压的扩展）

1. 从 [Releases](https://github.com/anhhackta/CopyLoad-Extension/releases/latest) 下载 **Latest**（`CopyLoad-1.0.2.zip`）。
2. 解压到文件夹（保持目录结构）。
3. 打开 `chrome://extensions` 或 `edge://extensions`。
4. 开启 **开发者模式**。
5. 点击 **加载已解压的扩展程序**，选择包含 `manifest.json` 的文件夹。

> 尚未上架 Chrome 网上应用店 / Edge 加载项。

---

## 快速上手

| 操作 | 方法 |
|------|------|
| 保存文本 | Ctrl+C（若已启用）或右键 → 保存到 CopyLoad |
| 保存图片 | 右键图片，或「图片」页 → 粘贴图片 |
| 从历史粘贴 | 启用 Paste Multi → 聚焦输入框 → Ctrl+V → 选择条目 |
| 普通粘贴 | Ctrl+Shift+V 或页面右键粘贴 |
| 打开管理页 | 弹窗标题栏的外部链接按钮 |
| 锁定 | 设置 → 启用 PIN |

---

## 项目结构

```
CopyLoad/
├── manifest.json
├── icons/
├── src/
│   ├── background/   # service worker
│   ├── content/      # 复制/粘贴 + Paste Multi
│   ├── app/          # 弹窗 + 管理界面
│   └── shared/       # constants, i18n, db, settings, lock, crypto
├── index.html
├── README.md         # English
├── README_VN.md
├── README_ZH.md      # 中文（本文件）
├── README_JP.md
└── LICENSE           # MIT
```

---

## 隐私

- 剪贴板数据仅保存在本机（IndexedDB / `chrome.storage`）。
- 无遥测、无广告、无云端剪贴板同步。
- PIN 为界面锁（PBKDF2）。IndexedDB 本身未做全库加密；导出 JSON 时可选用 AES-GCM 密码加密。

---

## 星级历史

<a href="https://www.star-history.com/?repos=anhhackta%2Fcopyload-extension&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=anhhackta/copyload-extension&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=anhhackta/copyload-extension&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=anhhackta/copyload-extension&type=date&legend=top-left" />
 </picture>
</a>

## 许可证

[MIT](LICENSE) — 可自由使用、修改与再分发，但须**保留版权声明 / 注明作者**。

---

## 作者

**Nguyễn Bá Hoàng** ([@anhhackta](https://github.com/anhhackta))

- 网站：[anhhackta.com](https://anhhackta.com) · [GitHub Pages](https://anhhackta.github.io/CopyLoad-Extension/)
- Facebook：[anhhackta.official](https://facebook.com/anhhackta.official)
- 支持：[Paypal](https://www.paypal.com/paypalme/bahoang2k2)
- Crypto: `BNB` (BSC/BEP20) · `0xfc988e0a632d0ed7c88dbf2d17e021b36de6890a`