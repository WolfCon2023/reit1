/**
 * Minimal production static server for Railway.
 * Serves the Vite build output (dist/) with SPA fallback.
 * Uses only Node.js built-ins — no external dependencies needed at runtime.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".txt":  "text/plain; charset=utf-8",
  ".map":  "application/json",
};

async function tryFile(filePath) {
  try {
    const s = await stat(filePath);
    if (s.isFile()) {
      const body = await readFile(filePath);
      return body;
    }
  } catch { /* not found */ }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // Try exact file
  let body = await tryFile(join(DIST, pathname));

  // Try with /index.html for directory paths
  if (!body && !extname(pathname)) {
    body = await tryFile(join(DIST, pathname, "index.html"));
    if (body) pathname = join(pathname, "index.html");
  }

  // SPA fallback: serve index.html for any non-file route
  if (!body) {
    body = await tryFile(join(DIST, "index.html"));
    if (body) pathname = "/index.html";
  }

  if (!body) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const ext = extname(pathname).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  // Cache hashed assets aggressively, everything else short-lived
  const isHashed = pathname.startsWith("/assets/");
  const cacheControl = isHashed
    ? "public, max-age=31536000, immutable"
    : "public, max-age=0, must-revalidate";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": body.length,
    "Cache-Control": cacheControl,
  });
  res.end(body);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server listening on 0.0.0.0:${PORT}`);
});
