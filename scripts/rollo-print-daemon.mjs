#!/usr/bin/env node
/**
 * Minimal local print relay for Rollo 3×2 on macOS.
 * Chrome window.print() cannot set CUPS media; lp can.
 *
 * Start: npm run rollo-print
 * Health: GET http://127.0.0.1:3927/health
 * Print:  POST http://127.0.0.1:3927/print  { pngBase64, mediaSize? }
 */

import http from "node:http";
import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PORT = Number.parseInt(process.env.ROLLO_PRINT_PORT ?? "3927", 10);
const PRINTER_CACHE_TTL_MS = 45_000;

let printerCache = "";
let printerCacheAt = 0;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function cupsMediaArgs(media) {
  const normalized = String(media ?? "3x2")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "");
  if (normalized === "2x3" || normalized === "2x3in") {
    return ["-o", "media=Custom.2x3in", "-o", "PageSize=Custom.2x3in"];
  }
  return ["-o", "media=Custom.3x2in", "-o", "PageSize=Custom.3x2in"];
}

async function defaultPrinter(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && printerCache && now - printerCacheAt < PRINTER_CACHE_TTL_MS) {
    return printerCache;
  }

  try {
    const { stdout } = await execFileAsync("lpstat", ["-d"]);
    const marker = "system default destination:";
    const idx = stdout.toLowerCase().indexOf(marker);
    if (idx >= 0) {
      printerCache = stdout.slice(idx + marker.length).trim();
    } else {
      printerCache = stdout.trim();
    }
  } catch {
    printerCache = "";
  }

  printerCacheAt = now;
  return printerCache;
}

async function printPngFile(filePath, mediaSize) {
  const printer = await defaultPrinter();
  const args = [
    ...cupsMediaArgs(mediaSize),
    "-n",
    "1",
    "-o",
    "fit-to-page=false",
    "-o",
    "scaling=100",
  ];
  if (printer) args.push("-d", printer);
  args.push(filePath);
  await execFileAsync("lp", args);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url?.split("?")[0] ?? "/";

  if (req.method === "GET" && (url === "/" || url === "/health")) {
    const printer = await defaultPrinter(true);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "rollo-print-daemon",
        printer: printer || null,
        port: PORT,
      })
    );
    return;
  }

  if (req.method === "POST" && url === "/print") {
    let tempPath = null;
    try {
      const raw = await readBody(req);
      let pngBase64 = "";
      let mediaSize = "3x2";

      try {
        const json = JSON.parse(raw.toString("utf8"));
        pngBase64 = String(json.pngBase64 ?? "");
        mediaSize = String(json.mediaSize ?? "3x2");
      } catch {
        pngBase64 = raw.toString("base64");
      }

      if (!pngBase64) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "pngBase64 required" }));
        return;
      }

      tempPath = join(tmpdir(), `rollo-label-${Date.now()}.png`);
      await writeFile(tempPath, Buffer.from(pngBase64, "base64"));
      await printPngFile(tempPath, mediaSize);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: message }));
    } finally {
      if (tempPath) {
        await unlink(tempPath).catch(() => {});
      }
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Rollo print daemon listening on http://127.0.0.1:${PORT}`);
});
