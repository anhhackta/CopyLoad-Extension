# CopyLoad

<div align="center">
  <img src="icons/icon128.png" alt="CopyLoad Logo" width="128" height="128">
  <h3>Lịch sử clipboard cho Chrome &amp; Edge</h3>
  <p>Lưu văn bản và ảnh đã copy, tìm lại, dán từ lịch sử, khóa PIN — dữ liệu chỉ ở trên máy bạn.</p>

  [![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/anhhackta/CopyLoad-Extension/releases/latest)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)](manifest.json)
</div>

<p align="center">
  <a href="README.md">English</a>
  · <b>Tiếng Việt</b>
  · <a href="README_ZH.md">中文</a>
  · <a href="README_JP.md">日本語</a>
  · <a href="https://anhhackta.github.io/CopyLoad-Extension/">Website</a>
  · <a href="https://github.com/anhhackta/CopyLoad-Extension/releases">Releases</a>
</p>

---

## CopyLoad là gì?

Trình duyệt quên nội dung bạn vừa copy. CopyLoad giữ **lịch sử local** (văn bản + ảnh) để tìm, ghim và dán lại — không gửi clipboard lên server.

**Dòng hiện tại:** `v1.0.2` trên nhánh `main` (cập nhật lâu dài).  
**Bản công khai đầu:** [`Ver1.1.1`](https://github.com/anhhackta/CopyLoad-Extension/releases/tag/Ver1.1.1) trên nhánh `legacy-old` (chỉ text, kiến trúc cũ).

---

## Tính năng

| Nhóm | Chi tiết |
|------|----------|
| **Ghi nhận** | Tự lưu khi Ctrl+C / cắt / dán (bật-tắt được); chuột phải → *Lưu vào CopyLoad* / *Lưu ảnh vào CopyLoad* |
| **Văn bản** | Tìm kiếm, phân loại (text / link / email / số / code), ghim, chọn hàng loạt, tạm / vĩnh viễn |
| **Ảnh** | Lưu từ menu chuột phải hoặc dán từ clipboard hệ thống; thumbnail; ghim / xóa |
| **Paste Multi** | Ctrl+V trong ô nhập mở hộp chọn lịch sử (hoặc phím nhanh `1`–`0`); Ctrl+Shift+V để dán bình thường |
| **Bảo mật** | PIN 4–6 số cho popup, trang quản lý và Paste Multi; tự khóa theo thời gian |
| **Dữ liệu** | Xuất / nhập JSON (tuỳ chọn mã hóa mật khẩu), tải `.txt`, tự xóa mục cũ, xóa tất cả |
| **Giao diện** | Sáng / tối / theo hệ thống; VI & EN trong app; popup + trang quản lý |
| **Lưu trữ** | IndexedDB cho lịch sử; `chrome.storage` cho cài đặt; không analytics, không gọi mạng cho clipboard |

---

## Cài đặt (ZIP / Load unpacked)

1. Tải **Latest** tại [Releases](https://github.com/anhhackta/CopyLoad-Extension/releases/latest) (`CopyLoad-1.0.2.zip`).
2. Giải nén (giữ cấu trúc thư mục).
3. Mở `chrome://extensions` hoặc `edge://extensions`.
4. Bật **Developer mode**.
5. **Load unpacked** → chọn thư mục có `manifest.json`.

> Chưa có trên Chrome Web Store / Edge Add-ons.

---

## Dùng nhanh

| Việc | Cách |
|------|------|
| Lưu text | Ctrl+C (nếu bật) hoặc chuột phải → Lưu vào CopyLoad |
| Lưu ảnh | Chuột phải ảnh, hoặc tab Ảnh → Dán ảnh |
| Dán từ lịch sử | Bật Paste Multi → focus ô nhập → Ctrl+V → chọn mục |
| Dán thường | Ctrl+Shift+V hoặc Paste trên menu chuột phải |
| Mở manager | Nút mở trang lớn trên header popup |
| Khóa | Cài đặt → bật PIN |

---

## Cấu trúc dự án

```
CopyLoad/
├── manifest.json
├── icons/
├── src/
│   ├── background/   # service worker
│   ├── content/      # copy/paste + Paste Multi
│   ├── app/          # popup + manager
│   └── shared/       # constants, i18n, db, settings, lock, crypto
├── index.html
├── README.md         # English
├── README_VN.md      # Tiếng Việt (file này)
├── README_ZH.md
├── README_JP.md
└── LICENSE           # MIT
```

---

## Quyền riêng tư

- Clipboard chỉ lưu trên máy (IndexedDB / `chrome.storage`).
- Không telemetry, không quảng cáo, không đồng bộ clipboard lên mây.
- PIN là khóa giao diện (PBKDF2). IndexedDB không mã hóa toàn bộ; file xuất JSON có thể dùng AES-GCM nếu bạn đặt mật khẩu.

---

## Sao ủng hộ

<a href="https://www.star-history.com/?repos=anhhackta%2Fcopyload-extension&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=anhhackta/copyload-extension&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=anhhackta/copyload-extension&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=anhhackta/copyload-extension&type=date&legend=top-left" />
 </picture>
</a>

## License

[MIT](LICENSE) — dùng, sửa, phân phối tự do nếu **giữ dòng copyright / ghi nguồn tác giả**.

---

## Tác giả

**Nguyễn Bá Hoàng** ([@anhhackta](https://github.com/anhhackta))

- Website: [anhhackta.com](https://anhhackta.com) · [GitHub Pages](https://anhhackta.github.io/CopyLoad-Extension/)
- Facebook: [anhhackta.official](https://facebook.com/anhhackta.official)
- Ủng hộ: [Paypal](https://www.paypal.com/paypalme/bahoang2k2)
- Crypto: `BNB` (BSC/BEP20) · `0xfc988e0a632d0ed7c88dbf2d17e021b36de6890a`