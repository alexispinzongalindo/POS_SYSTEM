import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright";

try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
} catch {
}

function requiredEnv(name) {
  const val = process.env[name];
  if (!val || !String(val).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(val).trim();
}

export function getRecordingBaseUrl() {
  return (process.env.RECORD_BASE_URL ?? "http://localhost:3000").trim();
}

export function getRecordingLang() {
  const raw = (process.env.RECORD_LANG ?? "en").toLowerCase().trim();
  return raw === "es" ? "es" : "en";
}

export function getOutputDir() {
  const out = (process.env.RECORD_OUT_DIR ?? "recordings").trim();
  fs.mkdirSync(out, { recursive: true });
  return out;
}

export function getAuthStatePath(lang) {
  const safeLang = lang === "es" ? "es" : "en";
  return path.join(getOutputDir(), `auth-state-${safeLang}.json`);
}

function findPlaywrightFfmpeg() {
  const direct = (process.env.RECORD_FFMPEG ?? "").trim();
  if (direct && fs.existsSync(direct)) return direct;

  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  if (!fs.existsSync(cache)) return null;

  const entries = fs
    .readdirSync(cache, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("ffmpeg-"))
    .map((e) => e.name)
    .sort()
    .reverse();

  for (const dir of entries) {
    const root = path.join(cache, dir);
    const rootCandidates = [path.join(root, "ffmpeg"), path.join(root, "ffmpeg-mac")];
    for (const c of rootCandidates) {
      if (fs.existsSync(c)) return c;
    }
    try {
      const sub = fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
      for (const s of sub) {
        const candidates = [path.join(root, s, "ffmpeg"), path.join(root, s, "ffmpeg-mac")];
        for (const c of candidates) {
          if (fs.existsSync(c)) return c;
        }
      }
    } catch {
    }
  }

  return null;
}

function findSystemFfmpeg() {
  try {
    const res = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    if (res.status === 0) return "ffmpeg";
  } catch {
  }
  return null;
}

function canConvertToMp4(ffmpegPath) {
  if (!ffmpegPath) return false;
  if (typeof ffmpegPath === "string" && ffmpegPath.endsWith("ffmpeg-mac")) return false;
  return true;
}

export async function maybeConvertToMp4(inputPath) {
  if (!inputPath) return null;
  if (inputPath.toLowerCase().endsWith(".mp4")) return inputPath;

  const ffmpeg = (process.env.RECORD_FFMPEG ?? "").trim() || findSystemFfmpeg() || findPlaywrightFfmpeg();
  if (!ffmpeg) return inputPath;
  if (!canConvertToMp4(ffmpeg)) return inputPath;

  const outPath = inputPath.replace(/\.[^.]+$/, ".mp4");
  if (fs.existsSync(outPath)) return outPath;

  const args = [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    outPath,
  ];

  try {
    await new Promise((resolve, reject) => {
      const p = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
      let err = "";
      p.stderr.on("data", (d) => {
        err += String(d);
      });
      p.on("error", reject);
      p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(err || `ffmpeg exit ${code}`))));
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`FFMPEG_CONVERT_FAILED=${msg}\n`);
    return inputPath;
  }

  return fs.existsSync(outPath) ? outPath : inputPath;
}

export function getCredentials() {
  const email = requiredEnv("RECORD_EMAIL");
  const password = requiredEnv("RECORD_PASSWORD");
  return { email, password };
}

export async function launchRecorderContext({ lang, width = 1920, height = 1080, label, storageState }) {
  const outDir = getOutputDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const videoDir = path.join(outDir, `${stamp}-${label}`);
  fs.mkdirSync(videoDir, { recursive: true });

  const headless = (process.env.RECORD_HEADLESS ?? "true").toLowerCase().trim() !== "false";

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: videoDir, size: { width, height } },
    ...(storageState ? { storageState } : {}),
  });

  await context.addInitScript((l) => {
    try {
      window.localStorage.setItem("islapos_lang", l);
      document.documentElement.lang = l;
    } catch {
    }
  }, lang);

  const page = await context.newPage();
  page.setDefaultTimeout(60_000);

  return { browser, context, page, videoDir };
}

export async function ensureAuthState({ lang, baseUrl, email, password }) {
  const storagePath = getAuthStatePath(lang);
  try {
    fs.unlinkSync(storagePath);
  } catch {
  }

  const headless = (process.env.RECORD_HEADLESS ?? "true").toLowerCase().trim() !== "false";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  await context.addInitScript((l) => {
    try {
      window.localStorage.setItem("islapos_lang", l);
      document.documentElement.lang = l;
    } catch {
    }
  }, lang);

  const page = await context.newPage();
  page.setDefaultTimeout(60_000);

  try {
    await login(page, { baseUrl, email, password });
    await context.storageState({ path: storagePath });
  } finally {
    await context.close();
    await browser.close();
  }

  return storagePath;
}

export async function login(page, { baseUrl, email, password }) {
  await page.goto(`${baseUrl}/login?mode=signin`, { waitUntil: "networkidle" });

  await page.waitForSelector('[data-tour="login.email"]');
  await page.fill('[data-tour="login.email"]', email);
  await page.fill('[data-tour="login.password"]', password);
  await page.click('[data-tour="login.submit"]');

  // Wait until we are inside the app.
  await page.waitForURL(/\/(admin|pos|setup)/, { timeout: 60_000 });
}

export async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}

export async function safeGoto(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    return true;
  } catch {
    return false;
  }
}

export async function waitForUiReady(
  page,
  { h1Text, readySelector, alternateTexts, timeoutMs = 60_000, retries = 1 } = {},
) {
  const errorBanner = page.locator("div.border-red-200.bg-red-50.text-red-700");
  const loadingTexts = ["Loading...", "Loading kitchen display..."];

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => {});

    for (const text of loadingTexts) {
      await page
        .getByText(text, { exact: true })
        .waitFor({ state: "hidden", timeout: Math.min(30_000, timeoutMs) })
        .catch(() => {});
    }

    const waits = [];
    if (h1Text) {
      waits.push(page.locator("h1", { hasText: h1Text }).first().waitFor({ state: "visible", timeout: timeoutMs }));
    }
    if (readySelector) {
      waits.push(page.locator(readySelector).first().waitFor({ state: "visible", timeout: timeoutMs }));
    }
    const alts = Array.isArray(alternateTexts) ? alternateTexts : [];
    for (const t of alts) {
      if (!t || !String(t).trim()) continue;
      waits.push(page.getByText(String(t), { exact: true }).first().waitFor({ state: "visible", timeout: timeoutMs }));
    }

    if (waits.length) {
      await new Promise((resolve, reject) => {
        let pending = waits.length;
        let done = false;
        for (const p of waits) {
          p.then(() => {
            if (done) return;
            done = true;
            resolve();
          }).catch((e) => {
            pending -= 1;
            if (pending <= 0 && !done) reject(e);
          });
        }
      });
    }

    const hasError = await errorBanner.first().isVisible().catch(() => false);
    if (!hasError) return;

    if (attempt < retries) {
      await page.reload({ waitUntil: "networkidle" }).catch(() => {});
      continue;
    }

    throw new Error("UI error banner detected while recording");
  }
}

export async function gotoTourStep(
  page,
  { url, h1Text, readySelector, alternateTexts, holdMs = 10_000, timeoutMs = 60_000, retries = 1 } = {},
) {
  const ok = await safeGoto(page, url);
  if (!ok) {
    await settle(page, 1200);
    const ok2 = await safeGoto(page, url);
    if (!ok2) throw new Error(`Navigation failed: ${url}`);
  }

  await waitForUiReady(page, { h1Text, readySelector, alternateTexts, timeoutMs, retries });
  await settle(page, holdMs);
}
