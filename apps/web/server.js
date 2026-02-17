/**
 * Minimal production static server for Railway.
 * Serves the Vite build output (dist/) with SPA fallback.
 * Uses only Node.js built-ins — zero external dependencies.
 */
import { createServer } from "node:http";
import { readFile, stat, access } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { constants } from "node:fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
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
    const s = await stat(filePath);
    if (s.isFile()) {
      return await readFile(filePath);
    }
  } catch {
    /* file not found */
  }
  return null;
}

async function handler(req, res) {
  try {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);

    // Health check endpoint
    if (pathname === "/_health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, dist: DIST, port: PORT }));
      return;
    }

    // Try exact file in dist
    let body = await tryFile(join(DIST, pathname));
    let servePath = pathname;

    // Try directory index
    if (!body && !extname(pathname)) {
      body = await tryFile(join(DIST, pathname, "index.html"));
      if (body) servePath = join(pathname, "index.html");
    }

    // SPA fallback: serve index.html for any unmatched route
    if (!body) {
      body = await tryFile(join(DIST, "index.html"));
      if (body) servePath = "/index.html";
    }

    if (!body) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const ext = extname(servePath).toLowerCase();
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
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}

// Verify dist folder exists before starting
try {
  await access(join(DIST, "index.html"), constants.R_OK);
  console.log(`Dist folder verified: ${DIST}`);
} catch {
  console.error(`ERROR: ${join(DIST, "index.html")} not found!`);
  console.error(`DIST path: ${DIST}`);
  console.error(`__dirname: ${__dirname}`);
  console.error(`CWD: ${process.cwd()}`);
  // Don't exit — still start the server so Railway can show the error
}

const server = createServer(handler);

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server listening on 0.0.0.0:${PORT}`);
  console.log(`Serving from: ${DIST}`);
  console.log(`PID: ${process.pid}`);
});
