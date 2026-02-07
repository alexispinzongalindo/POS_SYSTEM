import fs from "node:fs";
import path from "node:path";
import { chromium, firefox } from "playwright";
import {
  getCredentials,
  getRecordingBaseUrl,
  getRecordingLang,
  ensureAuthState,
  gotoTourStep,
} from "./record-utils.mjs";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeFileBase(id, index) {
  const safeId = String(id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const n = String(index + 1).padStart(3, "0");
  return `frame-${n}-${safeId}`;
}

async function screenshotToPng(page, outPath, { minBytes = 25_000 } = {}) {
  const buf = await page.screenshot({ type: "png" });
  if (!buf || buf.length < minBytes) return false;
  fs.writeFileSync(outPath, buf);
  return true;
}

function isFatalUrl(url, { allowLogin = false } = {}) {
  if (!url) return true;
  if (!allowLogin && /\/login(\?|$)/.test(url)) return true;
  if (/\/error(\?|$)/.test(url)) return true;
  return false;
}

async function hasFatalUi(page) {
  const errorBanner = page.locator("div.border-red-200.bg-red-50.text-red-700");
  const runtimeError = page.getByText("Unhandled Runtime Error", { exact: true });
  const appError = page.getByText("Application error", { exact: false });

  const checks = [
    errorBanner.first().isVisible().catch(() => false),
    runtimeError.first().isVisible().catch(() => false),
    appError.first().isVisible().catch(() => false),
  ];
  const res = await Promise.all(checks);
  return res.some(Boolean);
}

async function launchSlidesContext({ lang, storageState }) {
  const headless = (process.env.RECORD_HEADLESS ?? "true").toLowerCase().trim() !== "false";
  const browserType = (process.env.RECORD_BROWSER ?? "chromium").toLowerCase() === "firefox" ? firefox : chromium;
  const browser = await browserType.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
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

  return { browser, context, page };
}

async function captureLoginSlide({ baseUrl, lang, outDir }) {
  const { browser, context, page } = await launchSlidesContext({ lang });
  try {
    await gotoTourStep(page, {
      url: `${baseUrl}/login?mode=signin`,
      readySelector: '[data-tour="login.email"]',
      holdMs: 900,
      retries: 1,
    });

    const url = page.url();
    if (isFatalUrl(url, { allowLogin: true })) return null;
    if (await hasFatalUi(page)) return null;

    const imgName = safeFileBase("login", 0);
    const imgRel = `/islapos-tour/${lang}/${imgName}.png`;
    const imgPath = path.join(outDir, `${imgName}.png`);

    const ok = await screenshotToPng(page, imgPath, { minBytes: 18_000 });
    if (!ok) return null;

    return {
      id: "login",
      img: imgRel,
      title: { en: "Sign in", es: "Iniciar sesión" },
      body: {
        en: "Sign in with your email and password to access Admin and POS.",
        es: "Entra con tu email y contraseña para acceder a Admin y POS.",
      },
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function captureAuthedSlides({ baseUrl, lang, outDir, storageState }) {
  const { browser, context, page } = await launchSlidesContext({ lang, storageState });

  const slides = [];
  const steps = [
    {
      id: "admin",
      url: `${baseUrl}/admin`,
      h1Text: "Admin",
      title: { en: "Admin dashboard", es: "Panel de Admin" },
      body: {
        en: "Manage your restaurant: setup, users, reports, and tools.",
        es: "Maneja tu restaurante: setup, usuarios, reportes y herramientas.",
      },
    },
    {
      id: "support",
      url: `${baseUrl}/admin/support`,
      h1Text: "Support Station",
      title: { en: "Support AI", es: "Soporte con AI" },
      body: {
        en: "Ask for help troubleshooting devices and gateway issues, with guided steps.",
        es: "Pide ayuda para diagnosticar dispositivos y problemas del gateway, con pasos guiados.",
      },
    },
    {
      id: "edge-gateway",
      url: `${baseUrl}/admin/edge-gateway`,
      h1Text: "Edge Gateway",
      title: { en: "Edge Gateway", es: "Edge Gateway" },
      body: {
        en: "Pair a Windows gateway for offline-tolerant printing and device connectivity.",
        es: "Empareja un gateway Windows para impresión y conectividad con tolerancia offline.",
      },
    },
    {
      id: "pos",
      url: `${baseUrl}/pos`,
      readySelector: '[data-tour="pos.tables"]',
      title: { en: "Point of Sale", es: "Punto de venta" },
      body: {
        en: "Open the POS to take orders quickly.",
        es: "Abre el POS para tomar órdenes rápido.",
      },
    },
    {
      id: "tables",
      url: `${baseUrl}/pos/tables`,
      h1Text: "Tables",
      title: { en: "Tables", es: "Mesas" },
      body: {
        en: "Table service workflow: open tables, create tickets, and manage checks.",
        es: "Flujo de mesas: abre mesas, crea tickets y maneja cuentas.",
      },
    },
    {
      id: "kitchen",
      url: `${baseUrl}/pos/kitchen`,
      h1Text: "Kitchen Display",
      title: { en: "Kitchen Display", es: "Pantalla de cocina" },
      body: {
        en: "Track tickets and kitchen status in real time.",
        es: "Sigue tickets y estado de cocina en tiempo real.",
      },
    },
    {
      id: "history",
      url: `${baseUrl}/pos/history`,
      h1Text: "Order History",
      title: { en: "Order history", es: "Historial" },
      body: {
        en: "Review past orders and resolve issues quickly.",
        es: "Revisa órdenes pasadas y resuelve problemas rápido.",
      },
    },
  ];

  try {
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      try {
        await gotoTourStep(page, {
          url: step.url,
          h1Text: step.h1Text,
          readySelector: step.readySelector,
          holdMs: 1600,
          retries: 1,
        });

        const url = page.url();
        if (isFatalUrl(url)) throw new Error(`Redirected to login/error: ${url}`);
        if (await hasFatalUi(page)) throw new Error("UI error detected");

        const imgName = safeFileBase(step.id, i + 1);
        const imgRel = `/islapos-tour/${lang}/${imgName}.png`;
        const imgPath = path.join(outDir, `${imgName}.png`);

        const ok = await screenshotToPng(page, imgPath, { minBytes: 25_000 });
        if (!ok) throw new Error("Blank/black frame detected");

        slides.push({
          id: step.id,
          img: imgRel,
          title: step.title,
          body: step.body,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(`SKIP_SLIDE_${step.id}=${msg}\n`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return slides;
}

async function main() {
  const argLang = (process.argv[2] ?? "").trim().toLowerCase();
  if (argLang === "en" || argLang === "es") process.env.RECORD_LANG = argLang;

  const baseUrl = getRecordingBaseUrl();
  const lang = getRecordingLang();
  const { email, password } = getCredentials();

  const publicDir = path.join(process.cwd(), "public");
  const outDir = path.join(publicDir, "islapos-tour", lang);
  ensureDir(outDir);

  const loginSlide = await captureLoginSlide({ baseUrl, lang, outDir }).catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`SKIP_SLIDE_login=${msg}\n`);
    return null;
  });

  const storageState = await ensureAuthState({ lang, baseUrl, email, password });
  const authedSlides = await captureAuthedSlides({ baseUrl, lang, outDir, storageState });

  const slides = [loginSlide, ...authedSlides].filter(Boolean);

  const manifestPath = path.join(outDir, "slides.json");
  fs.writeFileSync(manifestPath, JSON.stringify(slides, null, 2) + "\n", "utf8");

  process.stdout.write(`\nTOUR_SLIDES_LANG=${lang}\n`);
  process.stdout.write(`TOUR_SLIDES_DIR=${outDir}\n`);
  process.stdout.write(`TOUR_SLIDES_COUNT=${slides.length}\n`);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`\nCapture slides failed: ${msg}\n`);
  process.exit(1);
});
