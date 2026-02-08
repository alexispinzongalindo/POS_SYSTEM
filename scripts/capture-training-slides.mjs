import fs from "node:fs";
import path from "node:path";
import { chromium, firefox } from "playwright";
import {
  getCredentials,
  getRecordingBaseUrl,
  getRecordingLang,
  ensureAuthState,
  gotoTourStep,
  login,
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

function isLoginUrl(url) {
  return /\/login(\?|$)/.test(String(url ?? ""));
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
      // ignore
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

    const imgName = safeFileBase("login-setup", 0);
    const imgRel = `/islapos-training/${lang}/${imgName}.png`;
    const imgPath = path.join(outDir, `${imgName}.png`);

    const ok = await screenshotToPng(page, imgPath, { minBytes: 18_000 });
    if (!ok) return null;

    return {
      id: "login-setup",
      img: imgRel,
      title: { en: "Login and Setup", es: "Login y Configuración" },
      body: {
        en: "Sign in and complete your business setup before opening service.",
        es: "Inicia sesión y completa la configuración del negocio antes de abrir servicio.",
      },
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function captureAuthedSlides({ baseUrl, lang, outDir, storageState, email, password }) {
  const { browser, context, page } = await launchSlidesContext({ lang, storageState });

  const slides = [];
  const steps = [
    {
      id: "admin-overview",
      url: `${baseUrl}/admin`,
      readySelector: "h1",
      title: { en: "Admin Overview", es: "Resumen de Admin" },
      body: {
        en: "Use Admin to manage operations, settings, users, and business controls.",
        es: "Usa Admin para gestionar operaciones, ajustes, usuarios y controles del negocio.",
      },
    },
    {
      id: "restaurants",
      url: `${baseUrl}/admin/restaurants`,
      readySelector: "h1",
      title: { en: "Restaurants and Branches", es: "Restaurantes y Sucursales" },
      body: {
        en: "Configure each location with its own setup, staff, and data.",
        es: "Configura cada ubicación con su propio setup, personal y datos.",
      },
    },
    {
      id: "menu-products",
      url: `${baseUrl}/pos/menu`,
      readySelector: "h1",
      title: { en: "Menu and Products", es: "Menú y Productos" },
      body: {
        en: "Create menu items, categories, prices, and modifiers for faster ordering.",
        es: "Crea artículos, categorías, precios y modificadores para ordenar más rápido.",
      },
    },
    {
      id: "pos-orders",
      url: `${baseUrl}/pos`,
      readySelector: '[data-tour="pos.tables"]',
      title: { en: "POS Order Flow", es: "Flujo de Órdenes POS" },
      body: {
        en: "Open tickets, add products, adjust quantities, and finalize payment.",
        es: "Abre tickets, agrega productos, ajusta cantidades y finaliza pagos.",
      },
    },
    {
      id: "customers",
      url: `${baseUrl}/admin/customers`,
      readySelector: "h1",
      title: { en: "Customers and Receipts", es: "Clientes y Recibos" },
      body: {
        en: "Store customer contact details and connect them to receipts and order history.",
        es: "Guarda datos del cliente y conéctalos con recibos e historial de órdenes.",
      },
    },
    {
      id: "tables-floorplan",
      url: `${baseUrl}/admin/floor`,
      readySelector: "h1",
      title: { en: "Tables and Floor Plan", es: "Mesas y Plano de Piso" },
      body: {
        en: "Manage table layout, sections, and table configuration for service.",
        es: "Gestiona layout de mesas, áreas y configuración para el servicio.",
      },
    },
    {
      id: "tables-live",
      url: `${baseUrl}/pos/tables`,
      readySelector: "h1",
      title: { en: "Live Table Service", es: "Servicio de Mesas en Vivo" },
      body: {
        en: "Monitor active tables, open checks, and table status in real time.",
        es: "Monitorea mesas activas, cuentas abiertas y estado en tiempo real.",
      },
    },
    {
      id: "kds",
      url: `${baseUrl}/pos/kitchen`,
      readySelector: "h1",
      title: { en: "Kitchen Display System", es: "KDS de Cocina" },
      body: {
        en: "Push tickets to kitchen and track preparation progress live.",
        es: "Envía tickets a cocina y sigue el progreso de preparación en vivo.",
      },
    },
    {
      id: "orders-history",
      url: `${baseUrl}/pos/history`,
      readySelector: "h1",
      title: { en: "Order History", es: "Historial de Órdenes" },
      body: {
        en: "Search prior tickets, review details, and validate completed transactions.",
        es: "Busca tickets previos, revisa detalles y valida transacciones completadas.",
      },
    },
    {
      id: "reports",
      url: `${baseUrl}/admin/reports`,
      readySelector: "h1",
      title: { en: "Reports and Analytics", es: "Reportes y Analítica" },
      body: {
        en: "Review sales performance and business trends for better decisions.",
        es: "Revisa rendimiento de ventas y tendencias para mejores decisiones.",
      },
    },
    {
      id: "food-cost",
      url: `${baseUrl}/admin/food-cost`,
      readySelector: "h1",
      title: { en: "Food Cost", es: "Costo de Comida" },
      body: {
        en: "Monitor margins with ingredient cost and profitability controls.",
        es: "Monitorea márgenes con costos de ingredientes y controles de rentabilidad.",
      },
    },
    {
      id: "inventory",
      url: `${baseUrl}/admin/inventory`,
      readySelector: "h1",
      title: { en: "Inventory and Recipes", es: "Inventario y Recetas" },
      body: {
        en: "Track stock movement, recipes, and purchases to avoid shortages.",
        es: "Controla inventario, recetas y compras para evitar faltantes.",
      },
    },
    {
      id: "staff-payroll",
      url: `${baseUrl}/admin/payroll`,
      readySelector: "h1",
      title: { en: "Staff, Time Clock, Payroll", es: "Personal, Reloj y Nómina" },
      body: {
        en: "Manage shifts, labor records, and payroll review in one place.",
        es: "Gestiona turnos, registros laborales y revisión de nómina en un solo lugar.",
      },
    },
    {
      id: "integrations",
      url: `${baseUrl}/admin/integrations/delivery`,
      readySelector: "h1",
      timeoutMs: 120_000,
      title: { en: "Integrations and Delivery", es: "Integraciones y Delivery" },
      body: {
        en: "Connect delivery channels and monitor integration status.",
        es: "Conecta canales de delivery y monitorea el estado de integración.",
      },
    },
    {
      id: "support",
      url: `${baseUrl}/admin/support`,
      readySelector: "h1",
      timeoutMs: 120_000,
      title: { en: "Support Station", es: "Estación de Soporte" },
      body: {
        en: "Create, update, and close support cases with notes and resolution.",
        es: "Crea, actualiza y cierra casos de soporte con notas y resolución.",
      },
    },
    {
      id: "training",
      url: `${baseUrl}/admin/training`,
      readySelector: "h1",
      title: { en: "Training Library", es: "Biblioteca de Entrenamiento" },
      body: {
        en: "Use guided content to onboard staff and standardize operations.",
        es: "Usa contenido guiado para entrenar personal y estandarizar operaciones.",
      },
    },
  ];

  try {
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          await gotoTourStep(page, {
            url: step.url,
            readySelector: step.readySelector,
            holdMs: 1500,
            timeoutMs: step.timeoutMs ?? 60_000,
            retries: 1,
          });

          const currentUrl = page.url();
          if (isLoginUrl(currentUrl) && attempt === 0) {
            process.stderr.write(`AUTH_REFRESH_${step.id}=login required; re-authenticating\n`);
            await login(page, { baseUrl, email, password });
            continue;
          }
          break;
        }

        const url = page.url();
        if (isFatalUrl(url)) throw new Error(`Redirected to login/error: ${url}`);
        if (await hasFatalUi(page)) throw new Error("UI error detected");

        const imgName = safeFileBase(step.id, i + 1);
        const imgRel = `/islapos-training/${lang}/${imgName}.png`;
        const imgPath = path.join(outDir, `${imgName}.png`);

        const ok = await screenshotToPng(page, imgPath, { minBytes: 22_000 });
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
  const outDir = path.join(publicDir, "islapos-training", lang);
  ensureDir(outDir);

  const loginSlide = await captureLoginSlide({ baseUrl, lang, outDir }).catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`SKIP_SLIDE_login-setup=${msg}\n`);
    return null;
  });

  const storageState = await ensureAuthState({ lang, baseUrl, email, password });
  const authedSlides = await captureAuthedSlides({ baseUrl, lang, outDir, storageState, email, password });

  const slides = [loginSlide, ...authedSlides].filter(Boolean);

  const manifestPath = path.join(outDir, "slides.json");
  fs.writeFileSync(manifestPath, JSON.stringify(slides, null, 2) + "\n", "utf8");

  process.stdout.write(`\nTRAINING_SLIDES_LANG=${lang}\n`);
  process.stdout.write(`TRAINING_SLIDES_DIR=${outDir}\n`);
  process.stdout.write(`TRAINING_SLIDES_COUNT=${slides.length}\n`);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`\nCapture training slides failed: ${msg}\n`);
  process.exit(1);
});
