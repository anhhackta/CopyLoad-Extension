# CopyLoad

<div align="center">
  <img src="icons/icon128.png" alt="CopyLoad Logo" width="128" height="128">
  <h3>Quản lý lịch sử clipboard — văn bản & ảnh</h3>
  <p>Extension Chrome/Edge (Manifest V3). Dữ liệu chỉ lưu trên máy, không gửi lên server.</p>

  [![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/anhhackta/CopyLoad-Extension/releases)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Language](https://img.shields.io/badge/VI-red.svg)](README.md)
  [![Language](https://img.shields.io/badge/EN-blue.svg)](README_EN.md)
  [![Language](https://img.shields.io/badge/JP-orange.svg)](README_JP.md)
</div>

<p align="center">
  <b>Tiếng Việt</b> · <a href="README_EN.md">English</a> · <a href="README_JP.md">日本語</a>
  · <a href="https://anhhackta.github.io/CopyLoad-Extension/">Website</a>
  · <a href="https://github.com/anhhackta/CopyLoad-Extension/releases">Releases</a>
</p>

---

## Tính năng (v1.0.2)

- **Lưu văn bản**: tự động khi Ctrl+C / cắt / dán; hoặc chuột phải → *Lưu vào CopyLoad*
- **Lưu ảnh**: chuột phải → *Lưu ảnh vào CopyLoad*, hoặc dán ảnh từ clipboard trong popup
- **Phân loại**: text / link / email / số / code; ghim mục quan trọng
- **Tạm / vĩnh viễn**: tắt “Lưu vĩnh viễn” → mục tạm (mất khi đóng trình duyệt); ảnh cũng không lưu khi tắt
- **Paste Multi**: Ctrl+V trong ô nhập để chọn đoạn đã lưu (hộp gợi ý hoặc chế độ nhanh 1–0)
- **PIN**: khóa popup / manager / Paste Multi bằng mã 4–6 số
- **Dữ liệu**: xuất/nhập JSON (tuỳ chọn mã hóa mật khẩu), tải .txt, tự xóa mục cũ, xóa hàng loạt
- **Giao diện**: sáng / tối / theo hệ thống; tiếng Việt & English; popup + trang quản lý đầy đủ
- **Lưu trữ**: IndexedDB cho lịch sử; cài đặt sync/local; không analytics, không mạng

---

## Cài đặt (từ ZIP)

1. Tải bản mới nhất tại [Releases](https://github.com/anhhackta/CopyLoad-Extension/releases/latest)
2. Giải nén thư mục extension
3. Mở `chrome://extensions` (hoặc `edge://extensions`)
4. Bật **Developer mode**
5. **Load unpacked** → chọn thư mục vừa giải nén (có `manifest.json`)

> Chưa có trên Chrome Web Store / Edge Add-ons.

---

## Dùng nhanh

| Việc | Cách |
|------|------|
| Lưu text | Ctrl+C (nếu bật trong Cài đặt) hoặc chuột phải |
| Lưu ảnh | Chuột phải ảnh, hoặc tab Ảnh → Dán ảnh |
| Dán từ lịch sử | Bật Paste Multi → Ctrl+V trong ô nhập |
| Dán bình thường | Ctrl+Shift+V hoặc chuột phải Paste |
| Mở trang lớn | Nút mở manager trên popup |
| Khóa | Bật PIN trong Cài đặt |

---

## Cấu trúc

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

Nhánh `legacy-old` giữ bản đầu (v1.1.1, chỉ text, kiến trúc cũ).

---

## Quyền riêng tư

Clipboard chỉ lưu local (IndexedDB / `chrome.storage`). Không gửi dữ liệu ra ngoài. PIN là lớp khóa giao diện (PBKDF2); IndexedDB không mã hóa toàn bộ — file xuất có thể mã hóa AES-GCM nếu bạn chọn.

---

## License

[MIT](LICENSE) — được dùng, sửa, phân phối miễn là **giữ nguyên dòng copyright / ghi nguồn tác giả**.

---

## Tác giả

**Nguyễn Bá Hoàng** ([@anhhackta](https://github.com/anhhackta))

- Website: [anhhackta.com](https://anhhackta.com) · [GitHub Pages](https://anhhackta.github.io/CopyLoad-Extension/)
- Facebook: [@anhhackta.official](https://facebook.com/anhhackta.official)
- Ủng hộ: [Buy Me a Coffee](https://www.buymeacoffee.com/anhhackta)
