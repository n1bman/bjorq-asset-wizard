import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "../node_modules/esbuild/lib/main.js";
import { chromium } from "playwright-core";
import sharp from "../server/node_modules/sharp/lib/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const catalogRoot = path.join(repoRoot, "catalog-seed");
const rendererPath = path.join(__dirname, "thumbnail-renderer.html");
const rendererEntryPath = path.join(__dirname, "thumbnail-renderer.entry.js");
const tempDir = path.join(repoRoot, ".tmp-thumbgen");
const host = "127.0.0.1";
const port = 4177;
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findBrowser() {
  for (const candidate of browserCandidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error("Kunde inte hitta Edge eller Chrome för thumbnail-rendering.");
}

async function collectModels(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectModels(fullPath, results);
    } else if (entry.isFile() && entry.name === "model.glb") {
      results.push(fullPath);
    }
  }
  return results;
}

async function runBrowser(browserPath, url, pngOutputPath, timeoutMs = 7000) {
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--hide-scrollbars",
    ],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 192, height: 192 },
      deviceScaleFactor: 1,
    });

    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
    await page.waitForFunction(() => document.body?.dataset?.status === "ready", { timeout: timeoutMs });
    await page.screenshot({ path: pngOutputPath, type: "png", omitBackground: false });

    if (errors.length > 0) {
      console.warn(errors.join("\n"));
    }
  } finally {
    await browser.close();
  }
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".glb":
      return "model/gltf-binary";
    case ".gltf":
      return "model/gltf+json";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function startStaticServer(rootDir) {
  const server = createServer(async (req, res) => {
    try {
      const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (requestPath === "/favicon.ico") {
        res.writeHead(204).end();
        return;
      }
      const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
      let filePath = path.join(rootDir, safePath);

      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403).end("Forbidden");
        return;
      }

      if (await exists(filePath)) {
        const fileStats = await stat(filePath);
        if (fileStats.isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }
      }

      if (!(await exists(filePath))) {
        res.writeHead(404).end("Not found");
        return;
      }

      res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
      createReadStream(filePath).pipe(res);
    } catch (error) {
      res.writeHead(500).end(error.message);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  return server;
}

async function main() {
  const browserPath = await findBrowser();
  const args = new Map(process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }));
  const limit = Number(args.get("limit") || "0");
  const pattern = args.get("pattern");

  let models = await collectModels(catalogRoot);
  if (pattern) {
    const match = pattern.toLowerCase();
    models = models.filter((modelPath) => modelPath.toLowerCase().includes(match));
  }
  if (limit > 0) {
    models = models.slice(0, limit);
  }
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await build({
    entryPoints: [rendererEntryPath],
    outfile: path.join(tempDir, "thumbnail-renderer.bundle.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    sourcemap: false,
    minify: true,
  });
  const server = await startStaticServer(repoRoot);

  console.log(`Found ${models.length} models`);
  console.log(`Using browser: ${browserPath}`);
  console.log(`Serving repo on http://${host}:${port}`);

  let success = 0;
  try {
    for (let index = 0; index < models.length; index += 1) {
      const modelPath = models[index];
      const assetDir = path.dirname(modelPath);
      const pngPath = path.join(tempDir, `${index + 1}.png`);
      const webpPath = path.join(assetDir, "thumb.webp");
      const modelUrlPath = `/${path.relative(repoRoot, modelPath).replace(/\\/g, "/")}`;
      const rendererUrl = `http://${host}:${port}/scripts/thumbnail-renderer.html?model=${encodeURIComponent(modelUrlPath)}&size=192&bg=transparent`;

      process.stdout.write(`[${index + 1}/${models.length}] ${path.relative(catalogRoot, assetDir)} ... `);
      try {
        await rm(pngPath, { force: true });
        await runBrowser(browserPath, rendererUrl, pngPath, 5000);
        await sharp(pngPath)
          .resize(384, 384, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 90 })
          .toFile(webpPath);
        success += 1;
        process.stdout.write("ok\n");
      } catch (error) {
        process.stdout.write(`failed: ${error.message}\n`);
      }
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }

  await rm(tempDir, { recursive: true, force: true });
  console.log(`Done. Generated ${success}/${models.length} thumbnails.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
