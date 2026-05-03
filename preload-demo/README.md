# Demo Preload

Demo đơn giản cho thấy khác biệt giữa preload ảnh nền và preload web font.

## Cấu trúc
- index.html (trang tổng quan)
- src/
  - bg-before.html / bg-after.html (demo ảnh nền)
  - font-before.html / font-after.html (demo font)
  - style.css
  - hero_bg.jpg

## Chạy
1. Cài Node.js nếu máy chưa có.
2. Tại thư mục gốc dự án:

```bash
node server.js
```

Sau đó mở:
- http://localhost:3000/
- http://localhost:3000/src/bg-before.html
- http://localhost:3000/src/bg-after.html
- http://localhost:3000/src/font-before.html
- http://localhost:3000/src/font-after.html

## Ghi chú
- Dev server cố ý delay /src/style.css và /src/hero_bg.jpg.
- hero_bg.jpg sẽ được tải ở lần request đầu và cache lại trên ổ đĩa.
