/**
 * Minimal production static server for Railway.
 * Serves the Vite build output (dist/) with SPA fallback.
 * CommonJS — zero external dependencies, maximum compatibility.
 */
const http = require("node:http");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");

const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

async function tryFile(filePath) {
  try {
    const s = await fsPromises.stat(filePath);
    if (s.isFile()) {
      return await fsPromises.readFile(filePath);
    }
  } catch {
    /* not found */
  }
  return null;
}

async function handler(req, res) {
  try {
    const url = new URL(req.url || "/", "http://localhost:" + PORT);
    const pathname = decodeURIComponent(url.pathname);

    // Health check
    if (pathname === "/_health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, dist: DIST, port: PORT }));
      return;
    }

    let body = await tryFile(path.join(DIST, pathname));
    let servePath = pathname;

    // Directory index
    if (!body && !path.extname(pathname)) {
      body = await tryFile(path.join(DIST, pathname, "index.html"));
      if (body) servePath = path.join(pathname, "index.html");
    }

    // SPA fallback
    if (!body) {
      body = await tryFile(path.join(DIST, "index.html"));
      if (body) servePath = "/index.html";
    }

    if (!body) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(servePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const isHashed = servePath.startsWith("/assets/");
    const cacheControl = isHashed
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": body.length,
      "Cache-Control": cacheControl,
    });
    res.end(body);
  } catch (err) {
    console.error("Request error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  }
}

// Startup
console.log("=== REIT Web Server Starting ===");
console.log("Node version:", process.version);
console.log("DIST path:", DIST);
console.log("PORT:", PORT);
console.log("CWD:", process.cwd());
console.log("__dirname:", __dirname);

// Check dist exists
const indexPath = path.join(DIST, "index.html");
if (fs.existsSync(indexPath)) {
  console.log("OK: dist/index.html found (" + fs.statSync(indexPath).size + " bytes)");
} else {
  console.error("ERROR: dist/index.html NOT FOUND at", indexPath);
  // List what IS in the directory
  try {
    const entries = fs.readdirSync(DIST);
    console.error("Contents of", DIST, ":", entries);
  } catch (e) {
    console.error("Cannot read DIST directory:", e.message);
    // Try listing parent
    try {
      const parentEntries = fs.readdirSync(__dirname);
      console.error("Contents of", __dirname, ":", parentEntries);
    } catch (e2) {
      console.error("Cannot read __dirname:", e2.message);
    }
  }
}

const server = http.createServer(handler);

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Web server listening on 0.0.0.0:" + PORT);
});
