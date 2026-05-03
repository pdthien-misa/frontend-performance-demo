/**
 * Dev server giả lập độ trễ mạng cho demo preload hero image.
 *
 * - Phục vụ file tĩnh từ thư mục hiện tại, assets nằm trong src.
 * - Cố ý delay /src/style.css và /src/hero_bg.jpg để mô phỏng mạng chậm,
 *   nhờ đó khác biệt giữa bg-before.html và bg-after.html lộ ra rõ rệt.
 * - Lần đầu được yêu cầu /hero_bg.jpg, server sẽ tự tải ảnh từ
 *   picsum.photos về và cache lại trên disk. Các lần sau đọc thẳng
 *   từ disk (nhưng vẫn giữ nguyên độ trễ giả lập).
 *
 * Chạy:   node server.js
 * Mở:     http://localhost:3000/
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;

// ===== Cấu hình độ trễ giả lập (ms) =====
const DELAYS = {
  "/src/style.css": 500,
  "/src/hero_bg.jpg": 500,
};

// URL gốc để lazy-download ảnh hero lần đầu chạy server
const HERO_SOURCE_URL =
  "https://fastly.picsum.photos/id/1018/1920/1080.jpg?hmac=Z-0vPrMvqfkGFzkq3vnamIQKXBk0KSXVxNIKXKCtW4I";
const HERO_LOCAL_PATH = path.join(ROOT, "src", "hero_bg.jpg");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tải ảnh hero lần đầu nếu chưa có trên disk
function ensureHeroImage() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(HERO_LOCAL_PATH)) return resolve();
    console.log("[server] Đang tải hero_bg.jpg từ picsum.photos ...");
    const file = fs.createWriteStream(HERO_LOCAL_PATH);
    https
      .get(HERO_SOURCE_URL, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(HERO_LOCAL_PATH, () => {});
          return reject(
            new Error(`Không tải được ảnh (status ${res.statusCode})`)
          );
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            console.log("[server] Đã cache hero_bg.jpg");
            resolve();
          });
        });
      })
      .on("error", (err) => {
        file.close();
        fs.unlink(HERO_LOCAL_PATH, () => {});
        reject(err);
      });
  });
}

function safeJoin(root, urlPath) {
  // Ngăn path traversal
  const clean = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(root, clean);
  if (!full.startsWith(root)) return null;
  return full;
}

async function serveFile(req, res, filePath) {
  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found: " + req.url);
  }
}

const server = http.createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // Giả lập độ trễ
  const delay = DELAYS[urlPath];
  if (delay) {
    console.log(`[server] ${urlPath}  (delay ${delay}ms)`);
    await sleep(delay);
  } else {
    console.log(`[server] ${urlPath}`);
  }

  // Lazy-download hero image nếu cần
  if (urlPath === "/src/hero_bg.jpg" && !fs.existsSync(HERO_LOCAL_PATH)) {
    try {
      await ensureHeroImage();
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Không tải được ảnh hero: " + err.message);
      return;
    }
  }

  const filePath = safeJoin(ROOT, urlPath);
  if (!filePath) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  await serveFile(req, res, filePath);
});

server.listen(PORT, async () => {
  try {
    await ensureHeroImage();
  } catch (err) {
    console.warn("[server] Cảnh báo: chưa tải được hero_bg.jpg -", err.message);
    console.warn("       Server vẫn chạy, sẽ thử lại khi có request tới ảnh.");
  }
  console.log(`\n  Demo preload hero background`);
  console.log(`  → http://localhost:${PORT}/`);
  console.log(`  → http://localhost:${PORT}/src/bg-before.html`);
  console.log(`  → http://localhost:${PORT}/src/bg-after.html\n`);
  console.log(`  Độ trễ giả lập:`);
  for (const [p, ms] of Object.entries(DELAYS)) {
    console.log(`    ${p.padEnd(16)} ${ms} ms`);
  }
  console.log("");
});
