import os from "os";
import net from "net";

import cors from "cors";
import express from "express";
import QRCode from "qrcode";

import * as crypto from "crypto";

import {
  appendOutboxEvent,
  dropOutboxEvents,
  readConfig,
  readOutboxEvents,
  writeConfig,
  readPrintQueue,
  writePrintQueue,
  enqueuePrintJob,
  updatePrintJob,
  cancelPrintJob,
  prunePrintQueue,
} from "./store.mjs";

const PORT = Number(process.env.EDGE_GATEWAY_PORT ?? "9123");

function resolveCloudBaseUrl() {
  const fromEnv = (process.env.CLOUD_BASE_URL ?? "").trim();
  if (fromEnv) return fromEnv;
  const cfg = readConfig();
  const fromCfg = typeof cfg?.cloudBaseUrl === "string" ? cfg.cloudBaseUrl.trim() : "";
  return fromCfg;
}

function getLanAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name] ?? [];
    for (const a of addrs) {
      if (!a) continue;
      if (a.family !== "IPv4") continue;
      if (a.internal) continue;
      return a.address;
    }
  }
  return null;
}

function getGatewayUrl(req) {
  const ip = getLanAddress();
  if (ip) return `http://${ip}:${PORT}`;

  const host = req.headers.host;
  if (typeof host === "string" && host.trim()) {
    return `http://${host}`;
  }

  return `http://localhost:${PORT}`;
}

function htmlEscape(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

function normalizePrinters(cfg) {
  const list = Array.isArray(cfg?.printers) ? cfg.printers : [];
  return list
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      id: typeof p.id === "string" ? p.id : "",
      name: typeof p.name === "string" ? p.name : "",
      ip: typeof p.ip === "string" ? p.ip : "",
      port: typeof p.port === "number" ? p.port : Number(p.port),
      createdAt: typeof p.createdAt === "string" ? p.createdAt : null,
    }))
    .filter((p) => p.id && p.ip && Number.isFinite(p.port));
}

function normalizePrintRoutes(cfg) {
  const r = cfg?.printRoutes;
  const receiptPrinterId = typeof r?.receiptPrinterId === "string" ? r.receiptPrinterId.trim() : "";
  const kitchenPrinterId = typeof r?.kitchenPrinterId === "string" ? r.kitchenPrinterId.trim() : "";
  return {
    receiptPrinterId: receiptPrinterId || null,
    kitchenPrinterId: kitchenPrinterId || null,
  };
}

function resolvePrinterIdForJob({ cfg, job }) {
  const explicit = typeof job?.printerId === "string" ? job.printerId.trim() : "";
  if (explicit) return explicit;

  const routes = normalizePrintRoutes(cfg);
  const kind = typeof job?.kind === "string" ? job.kind.trim() : "";
  if (kind === "kitchen") return routes.kitchenPrinterId;
  return routes.receiptPrinterId;
}

function buildPrintData({ protocol, template, rawBase64 }) {
  const p = (protocol || "").toLowerCase();
  if (p === "raw") {
    if (!rawBase64) throw new Error("Missing rawBase64");
    return Buffer.from(String(rawBase64), "base64");
  }

  const lines = Array.isArray(template?.lines) ? template.lines.map((l) => String(l)) : [];
  if (p === "pcl") return buildPclTestTicket({ lines });
  if (p === "text") return buildPlainTextTestTicket({ lines });

  const title = typeof template?.title === "string" ? template.title : "ISLAPOS";
  const subtitle = typeof template?.subtitle === "string" ? template.subtitle : "";
  return buildEscposTestTicket({ title, subtitle, lines });
}

function computeBackoffMs(attempt) {
  const a = Math.max(0, Number(attempt) || 0);
  const base = 1500;
  const ms = Math.min(120_000, base * Math.pow(2, a));
  return Math.max(1500, ms);
}

let printWorkerRunning = false;
async function processPrintQueueTick() {
  if (printWorkerRunning) return { ok: true, skipped: true };
  printWorkerRunning = true;
  try {
    const cfg = readConfig() ?? {};
    const printers = normalizePrinters(cfg);
    const now = Date.now();

    const queue = readPrintQueue();
    const idx = queue.findIndex((j) => {
      if (!j || typeof j !== "object") return false;
      const status = j.status;
      if (status !== "queued") return false;
      const next = Date.parse(j.nextAttemptAt ?? j.createdAt ?? "");
      if (!Number.isFinite(next)) return true;
      return next <= now;
    });

    if (idx < 0) {
      prunePrintQueue({ keepLast: 350, maxAgeDays: 10 });
      return { ok: true, processed: 0 };
    }

    const job = queue[idx];
    const id = String(job.id || "");
    if (!id) {
      queue.splice(idx, 1);
      writePrintQueue(queue);
      return { ok: true, processed: 0 };
    }

    const updatedAt = new Date().toISOString();
    queue[idx] = { ...job, status: "printing", updatedAt };
    writePrintQueue(queue);

    const printerId = resolvePrinterIdForJob({ cfg, job });
    const printer = printerId ? printers.find((p) => p.id === printerId) ?? null : null;
    if (!printer) {
      const attempts = Math.max(0, Number(job.attempts) || 0) + 1;
      const maxAttempts = Math.max(1, Number(job.maxAttempts) || 10);
      const terminal = attempts >= maxAttempts;
      const nextAttemptAt = terminal ? null : new Date(Date.now() + computeBackoffMs(attempts - 1)).toISOString();

      updatePrintJob(id, {
        status: terminal ? "failed" : "queued",
        attempts,
        maxAttempts,
        lastError: "Printer not found (check routes or printerId)",
        nextAttemptAt,
        updatedAt: new Date().toISOString(),
      });
      return { ok: true, processed: 1, failed: 1 };
    }

    const protocol = typeof job.protocol === "string" ? job.protocol : "escpos";
    const data = buildPrintData({ protocol, template: job.template, rawBase64: job.rawBase64 });

    try {
      await sendRawTcp({ ip: printer.ip, port: printer.port, data });
      updatePrintJob(id, {
        status: "succeeded",
        updatedAt: new Date().toISOString(),
        lastError: null,
        nextAttemptAt: null,
      });
      prunePrintQueue({ keepLast: 350, maxAgeDays: 10 });
      return { ok: true, processed: 1, succeeded: 1 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Print failed";
      const attempts = Math.max(0, Number(job.attempts) || 0) + 1;
      const maxAttempts = Math.max(1, Number(job.maxAttempts) || 10);
      const terminal = attempts >= maxAttempts;
      const nextAttemptAt = terminal ? null : new Date(Date.now() + computeBackoffMs(attempts - 1)).toISOString();

      updatePrintJob(id, {
        status: terminal ? "failed" : "queued",
        attempts,
        maxAttempts,
        lastError: msg,
        nextAttemptAt,
        updatedAt: new Date().toISOString(),
      });
      prunePrintQueue({ keepLast: 350, maxAgeDays: 10 });
      return { ok: true, processed: 1, failed: 1 };
    }
  } finally {
    printWorkerRunning = false;
  }
}

function buildEscposTestTicket({ title, subtitle, lines }) {
  const parts = [];
  parts.push(Buffer.from([0x1b, 0x40]));
  parts.push(Buffer.from([0x1b, 0x61, 0x01]));
  parts.push(Buffer.from([0x1b, 0x45, 0x01]));
  parts.push(Buffer.from(`${title}\n`, "utf8"));
  parts.push(Buffer.from([0x1b, 0x45, 0x00]));
  if (subtitle) parts.push(Buffer.from(`${subtitle}\n`, "utf8"));
  parts.push(Buffer.from("\n", "utf8"));
  parts.push(Buffer.from([0x1b, 0x61, 0x00]));

  for (const line of lines) {
    parts.push(Buffer.from(`${line}\n`, "utf8"));
  }

  parts.push(Buffer.from("\n\n\n", "utf8"));
  parts.push(Buffer.from([0x1d, 0x56, 0x00]));
  return Buffer.concat(parts);
}

function buildPlainTextTestTicket({ lines }) {
  const parts = [];
  // Some network printers accept plain text on 9100; add a form feed to try to force output.
  parts.push(Buffer.from("\r\n\r\n", "utf8"));
  for (const line of lines) {
    parts.push(Buffer.from(`${line}\r\n`, "utf8"));
  }
  parts.push(Buffer.from("\r\n\r\n\f", "utf8"));
  return Buffer.concat(parts);
}

function buildPclTestTicket({ lines }) {
  const parts = [];
  // Universal Exit Language
  parts.push(Buffer.from("\x1B%-12345X", "binary"));
  // PJL header
  parts.push(Buffer.from("@PJL JOB NAME=\"ISLAPOS\"\r\n", "ascii"));
  parts.push(Buffer.from("@PJL ENTER LANGUAGE=PCL\r\n", "ascii"));
  // PCL reset
  parts.push(Buffer.from([0x1b, 0x45]));
  // Text
  for (const line of lines) {
    parts.push(Buffer.from(`${line}\r\n`, "utf8"));
  }
  // Form feed to eject page
  parts.push(Buffer.from("\f", "binary"));
  // PJL end
  parts.push(Buffer.from("\r\n@PJL EOJ\r\n", "ascii"));
  parts.push(Buffer.from("\x1B%-12345X", "binary"));
  return Buffer.concat(parts);
}

function sendRawTcp({ ip, port, data, timeoutMs = 4000 }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    function done(err) {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      if (err) reject(err);
      else resolve();
    }

    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => done(new Error("Printer connection timed out")));
    socket.on("error", (e) => done(e instanceof Error ? e : new Error("Printer connection error")));
    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        if (err) return done(err);
        socket.end(() => done(null));
      });
    });
  });
}

function listLanIpsFor24() {
  const ip = getLanAddress();
  if (!ip) return [];
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return [];
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
  const out = [];
  for (let i = 1; i <= 254; i += 1) {
    const candidate = `${prefix}${i}`;
    if (candidate === ip) continue;
    out.push(candidate);
  }
  return out;
}

function probeTcp(ip, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    function finish(ok) {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(ok);
    }

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, ip, () => finish(true));
  });
}

async function scanLanForPort({ port, timeoutMs, concurrency }) {
  const ips = listLanIpsFor24();
  const results = [];

  let idx = 0;
  async function worker() {
    while (idx < ips.length) {
      const current = ips[idx];
      idx += 1;
      // eslint-disable-next-line no-await-in-loop
      const ok = await probeTcp(current, port, timeoutMs);
      if (ok) results.push({ ip: current, port });
    }
  }

  const workers = [];
  const n = Math.max(1, Math.min(200, Number(concurrency) || 50));
  for (let i = 0; i < n; i += 1) workers.push(worker());
  await Promise.all(workers);

  results.sort((a, b) => a.ip.localeCompare(b.ip));
  return results;
}

app.get("/health", (req, res) => {
  const cfg = readConfig();
  res.json({
    ok: true,
    bound: Boolean(cfg?.gatewayId && cfg?.secret && cfg?.restaurantId),
    gatewayId: cfg?.gatewayId ?? null,
    restaurantId: cfg?.restaurantId ?? null,
    gatewayUrl: getGatewayUrl(req),
    lanAddress: getLanAddress(),
    cloudBaseUrl: resolveCloudBaseUrl() || null,
    time: new Date().toISOString(),
  });
});

app.get("/qr", async (req, res) => {
  const gatewayUrl = getGatewayUrl(req);
  const payload = {
    gatewayUrl,
    v: 1,
  };

  try {
    const dataUrl = await QRCode.toDataURL(JSON.stringify(payload));
    res.json({ dataUrl, payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    res.status(500).json({ error: msg });
  }
});

app.get("/print/routes", (_req, res) => {
  const cfg = readConfig() ?? {};
  res.json({ ok: true, routes: normalizePrintRoutes(cfg) });
});

app.post("/print/routes", (req, res) => {
  const receiptPrinterId = typeof req.body?.receiptPrinterId === "string" ? req.body.receiptPrinterId.trim() : "";
  const kitchenPrinterId = typeof req.body?.kitchenPrinterId === "string" ? req.body.kitchenPrinterId.trim() : "";

  const cfg = readConfig() ?? {};
  writeConfig({
    ...cfg,
    printRoutes: {
      receiptPrinterId: receiptPrinterId || null,
      kitchenPrinterId: kitchenPrinterId || null,
    },
  });
  res.json({ ok: true });
});

app.get("/print/jobs", (req, res) => {
  const status = typeof req.query?.status === "string" ? req.query.status.trim() : "";
  const limit = Math.max(1, Math.min(1000, Number(req.query?.limit ?? 200)));
  const queue = readPrintQueue();
  const filtered = status ? queue.filter((j) => j && typeof j === "object" && j.status === status) : queue;
  res.json({ ok: true, jobs: filtered.slice(-limit) });
});

app.post("/print/enqueue", async (req, res) => {
  try {
    const kind = typeof req.body?.kind === "string" ? req.body.kind.trim() : "receipt";
    const protocol = typeof req.body?.protocol === "string" ? req.body.protocol.trim() : "escpos";
    const printerId = typeof req.body?.printerId === "string" ? req.body.printerId.trim() : "";
    const rawBase64 = typeof req.body?.rawBase64 === "string" ? req.body.rawBase64.trim() : null;
    const template = req.body?.template && typeof req.body.template === "object" ? req.body.template : null;
    const maxAttempts = Math.max(1, Math.min(25, Number(req.body?.maxAttempts ?? 10)));

    if (!rawBase64 && !template) return res.status(400).json({ error: "Missing template or rawBase64" });

    const nowIso = new Date().toISOString();
    const job = {
      id: crypto.randomUUID(),
      kind,
      protocol,
      printerId: printerId || null,
      template,
      rawBase64,
      status: "queued",
      attempts: 0,
      maxAttempts,
      nextAttemptAt: nowIso,
      lastError: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    enqueuePrintJob(job);
    const processed = await processPrintQueueTick();
    res.json({ ok: true, job, processed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    res.status(400).json({ error: msg });
  }
});

app.post("/print/process", async (_req, res) => {
  const result = await processPrintQueueTick().catch((e) => ({ ok: false, error: e instanceof Error ? e.message : "Failed" }));
  res.json(result);
});

app.post("/print/jobs/:id/cancel", (req, res) => {
  const id = typeof req.params?.id === "string" ? req.params.id.trim() : "";
  if (!id) return res.status(400).json({ error: "Missing id" });
  const job = cancelPrintJob(id);
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, job });
});

app.post("/print/jobs/:id/retry", (req, res) => {
  const id = typeof req.params?.id === "string" ? req.params.id.trim() : "";
  if (!id) return res.status(400).json({ error: "Missing id" });
  const job = updatePrintJob(id, {
    status: "queued",
    nextAttemptAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, job });
});

app.get("/", async (req, res) => {
  const cfg = readConfig();
  const gatewayUrl = getGatewayUrl(req);
  const bound = Boolean(cfg?.gatewayId && cfg?.secret && cfg?.restaurantId);

  let qrDataUrl = "";
  try {
    const payload = JSON.stringify({ gatewayUrl, v: 1 });
    qrDataUrl = await QRCode.toDataURL(payload);
  } catch {
    qrDataUrl = "";
  }

  const resolvedCloud = resolveCloudBaseUrl();
  const cloud = resolvedCloud ? htmlEscape(resolvedCloud) : "(not set)";

  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>IslaPOS Edge Gateway</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; color: #0f172a; }
      .card { max-width: 720px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.06); }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .muted { color: #475569; }
      input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 16px; }
      select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 16px; background: white; }
      button { padding: 10px 12px; border: 0; border-radius: 10px; font-size: 16px; background: #16a34a; color: white; cursor: pointer; }
      button.secondary { background: #0ea5e9; }
      button.danger { background: #dc2626; }
      .status { font-weight: 700; }
      .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #f1f5f9; }
      pre { background: #0b1220; color: #e2e8f0; padding: 12px; border-radius: 12px; overflow: auto; }
      img { max-width: 240px; border: 1px solid #e2e8f0; border-radius: 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1 style="margin-top:0">IslaPOS Edge Gateway</h1>
      <div class="row">
        <div style="flex:1; min-width: 320px;">
          <div class="muted">Gateway URL</div>
          <div><span class="pill">${htmlEscape(gatewayUrl)}</span></div>
          <div class="muted" style="margin-top:8px">Cloud Base URL</div>
          <div><span class="pill">${cloud}</span></div>
          <div style="margin-top:12px">
            <div class="muted">Status</div>
            <div class="status">${bound ? "BOUND" : "NOT BOUND"}</div>
          </div>
          ${bound ? `<div style="margin-top:12px"><div class="muted">Gateway ID</div><div><span class="pill">${htmlEscape(cfg.gatewayId)}</span></div></div>` : ""}
          ${bound ? `<div style="margin-top:8px"><div class="muted">Restaurant ID</div><div><span class="pill">${htmlEscape(cfg.restaurantId)}</span></div></div>` : ""}
        </div>
        <div style="min-width: 260px;">
          <div class="muted">Scan on iPad/iPhone to connect</div>
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : `<div class="muted">QR not available</div>`}
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0; margin: 16px 0" />

      <h2>Cloud Base URL</h2>
      <div class="muted">Where should this gateway sync events to? Example: http://localhost:3000</div>
      <div style="margin-top:10px">
        <label class="muted">Cloud Base URL</label>
        <input id="cloud" placeholder="http://localhost:3000" value="${cloud === "(not set)" ? "" : cloud}" />
      </div>
      <div style="margin-top:12px" class="row">
        <button class="secondary" onclick="saveCloud()">Save cloud URL</button>
      </div>

      <h2>Pair this Gateway</h2>
      <div class="muted">Get a pairing code from the Admin app, then enter it here.</div>
      <div style="margin-top:10px">
        <label class="muted">Pair Code</label>
        <input id="code" placeholder="ABC12345" />
      </div>
      <div style="margin-top:10px">
        <label class="muted">Gateway Name (optional)</label>
        <input id="name" placeholder="Front Counter PC" />
      </div>
      <div style="margin-top:12px" class="row">
        <button onclick="pair()">Pair</button>
        <button class="secondary" onclick="queueTest()">Queue test event</button>
        <button class="secondary" onclick="push()">Push queued events</button>
        <button class="danger" onclick="resetCfg()">Reset config</button>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0; margin: 16px 0" />

      <h2>Printers (LAN ESC/POS)</h2>
      <div class="muted">Add a printer by IP (usually port 9100), then click Test Print.</div>

      <div class="row" style="margin-top:10px">
        <div style="flex:1; min-width: 220px;">
          <label class="muted">Printer name</label>
          <input id="pname" placeholder="Receipt Printer" />
        </div>
        <div style="flex:1; min-width: 220px;">
          <label class="muted">Printer IP</label>
          <input id="pip" placeholder="192.168.0.50" />
        </div>
        <div style="width: 140px;">
          <label class="muted">Port</label>
          <input id="pport" placeholder="9100" />
        </div>
      </div>

      <div style="margin-top:12px" class="row">
        <button class="secondary" onclick="addPrinter()">Add printer</button>
        <button class="secondary" onclick="refreshPrinters()">Refresh list</button>
        <button class="secondary" onclick="discoverPrinters()">Find printers</button>
      </div>

      <div style="margin-top:14px">
        <div class="muted">Default printer (Receipt + Kitchen)</div>
        <div class="row" style="margin-top:8px; align-items: center">
          <div style="flex:1; min-width: 220px;">
            <select id="defaultPrinter"></select>
          </div>
          <button class="secondary" onclick="saveDefaultPrinter()">Save default</button>
          <button class="secondary" onclick="queueDefaultTest()">Queue test print</button>
          <button class="secondary" onclick="viewQueue()">View queue</button>
        </div>
      </div>

      <div style="margin-top:12px" class="muted">Configured printers</div>
      <div id="plist" class="muted" style="margin-top:6px">Loading...</div>

      <div style="margin-top:12px" class="muted">Discovered printers (port 9100)</div>
      <div id="pdiscover" class="muted" style="margin-top:6px">None</div>

      <div style="margin-top:12px" class="muted">Output</div>
      <pre id="out"></pre>
    </div>

    <script>
      let _printers = [];
      let _routes = null;

      async function pair() {
        const code = document.getElementById('code').value.trim();
        const name = document.getElementById('name').value.trim();
        const out = document.getElementById('out');
        out.textContent = 'Pairing...';
        const res = await fetch('/pair/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, name }) });
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
      }

      async function push() {
        const out = document.getElementById('out');
        out.textContent = 'Pushing...';
        const res = await fetch('/sync/push', { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
      }

      async function queueTest() {
        const out = document.getElementById('out');
        out.textContent = 'Queueing test event...';
        const res = await fetch('/events/test', { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
      }

      async function saveCloud() {
        const out = document.getElementById('out');
        out.textContent = 'Saving cloud URL...';
        const cloudBaseUrl = document.getElementById('cloud').value.trim();
        const res = await fetch('/config/cloud', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cloudBaseUrl }),
        });
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
        if (res.ok) {
          location.reload();
        }
      }

      function renderPrinters(printers) {
        const root = document.getElementById('plist');
        if (!Array.isArray(printers) || printers.length === 0) {
          root.textContent = 'No printers configured.';
          return;
        }

        root.innerHTML = '';
        for (const p of printers) {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.gap = '8px';
          row.style.alignItems = 'center';
          row.style.marginBottom = '8px';

          const label = document.createElement('div');
          label.style.flex = '1';
          const isDefault = _routes && _routes.receiptPrinterId && _routes.receiptPrinterId === p.id;
          label.textContent = (p.name || '(unnamed)') + (isDefault ? ' (default)' : '') + ' — ' + p.ip + ':' + p.port;

          const testBtn = document.createElement('button');
          testBtn.className = 'secondary';
          testBtn.textContent = 'Test Print';
          testBtn.onclick = async () => {
            const out = document.getElementById('out');
            out.textContent = 'Printing...';
            const res = await fetch('/print/test', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ printerId: p.id }),
            });
            const json = await res.json().catch(() => ({}));
            out.textContent = JSON.stringify(json, null, 2);
          };

          const textBtn = document.createElement('button');
          textBtn.className = 'secondary';
          textBtn.textContent = 'Test Text';
          textBtn.onclick = async () => {
            const out = document.getElementById('out');
            out.textContent = 'Printing (plain text)...';
            const res = await fetch('/print/test-text', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ printerId: p.id }),
            });
            const json = await res.json().catch(() => ({}));
            out.textContent = JSON.stringify(json, null, 2);
          };

          const pclBtn = document.createElement('button');
          pclBtn.className = 'secondary';
          pclBtn.textContent = 'Test PCL';
          pclBtn.onclick = async () => {
            const out = document.getElementById('out');
            out.textContent = 'Printing (PCL)...';
            const res = await fetch('/print/test-pcl', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ printerId: p.id }),
            });
            const json = await res.json().catch(() => ({}));
            out.textContent = JSON.stringify(json, null, 2);
          };

          const delBtn = document.createElement('button');
          delBtn.className = 'danger';
          delBtn.textContent = 'Remove';
          delBtn.onclick = async () => {
            const out = document.getElementById('out');
            out.textContent = 'Removing...';
            const res = await fetch('/printers/' + encodeURIComponent(p.id), { method: 'DELETE' });
            const json = await res.json().catch(() => ({}));
            out.textContent = JSON.stringify(json, null, 2);
            await refreshPrinters();
          };

          row.appendChild(label);
          row.appendChild(testBtn);
          row.appendChild(textBtn);
          row.appendChild(pclBtn);
          row.appendChild(delBtn);
          root.appendChild(row);
        }
      }

      function renderRoutes() {
        const sel = document.getElementById('defaultPrinter');
        if (!sel) return;

        sel.innerHTML = '';
        const optNone = document.createElement('option');
        optNone.value = '';
        optNone.textContent = '(not set)';
        sel.appendChild(optNone);

        for (const p of _printers) {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = (p.name || '(unnamed)') + ' — ' + p.ip + ':' + p.port;
          sel.appendChild(opt);
        }

        const current = _routes && _routes.receiptPrinterId ? _routes.receiptPrinterId : '';
        sel.value = current;
      }

      async function loadRoutes() {
        const res = await fetch('/print/routes');
        const json = await res.json().catch(() => ({}));
        _routes = json?.routes ?? null;
      }

      async function saveDefaultPrinter() {
        const sel = document.getElementById('defaultPrinter');
        const printerId = sel ? String(sel.value || '').trim() : '';
        const out = document.getElementById('out');
        out.textContent = 'Saving default printer...';

        const res = await fetch('/print/routes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ receiptPrinterId: printerId || null, kitchenPrinterId: printerId || null }),
        });
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
        await refreshPrinters();
      }

      async function queueDefaultTest() {
        const out = document.getElementById('out');
        out.textContent = 'Queueing test print...';

        const res = await fetch('/print/enqueue', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            kind: 'receipt',
            protocol: 'escpos',
            template: {
              title: 'ISLAPOS',
              subtitle: 'QUEUED TEST',
              lines: [
                'This is a queued print job',
                'It will retry automatically if the printer is offline',
                'Time: ' + new Date().toISOString(),
              ],
            },
          }),
        });

        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
      }

      async function viewQueue() {
        const out = document.getElementById('out');
        out.textContent = 'Loading print queue...';
        const res = await fetch('/print/jobs?limit=50');
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
      }

      async function refreshPrinters() {
        const res = await fetch('/printers');
        const json = await res.json().catch(() => ({}));
        _printers = Array.isArray(json?.printers) ? json.printers : [];
        await loadRoutes().catch(() => {});
        renderRoutes();
        renderPrinters(_printers);
      }

      async function addPrinter() {
        const name = document.getElementById('pname').value.trim();
        const ip = document.getElementById('pip').value.trim();
        const portRaw = document.getElementById('pport').value.trim();
        const port = portRaw ? Number(portRaw) : 9100;

        const out = document.getElementById('out');
        out.textContent = 'Adding printer...';

        const res = await fetch('/printers', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, ip, port }),
        });
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
        await refreshPrinters();
      }

      function renderDiscovered(printers) {
        const root = document.getElementById('pdiscover');
        if (!Array.isArray(printers) || printers.length === 0) {
          root.textContent = 'None found.';
          return;
        }

        root.innerHTML = '';
        for (const p of printers) {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.gap = '8px';
          row.style.alignItems = 'center';
          row.style.marginBottom = '8px';

          const label = document.createElement('div');
          label.style.flex = '1';
          label.textContent = p.ip + ':' + p.port;

          const addBtn = document.createElement('button');
          addBtn.className = 'secondary';
          addBtn.textContent = 'Add';
          addBtn.onclick = async () => {
            document.getElementById('pip').value = p.ip;
            document.getElementById('pport').value = String(p.port);
            document.getElementById('pname').value = 'Receipt Printer';
            await addPrinter();
          };

          row.appendChild(label);
          row.appendChild(addBtn);
          root.appendChild(row);
        }
      }

      async function discoverPrinters() {
        const out = document.getElementById('out');
        out.textContent = 'Scanning LAN for printers on port 9100...';
        const res = await fetch('/printers/discover');
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
        renderDiscovered(json?.printers ?? []);
      }

      Promise.all([refreshPrinters()]).catch(() => {
        const root = document.getElementById('plist');
        root.textContent = 'Failed to load printers.';
      });

      async function resetCfg() {
        const out = document.getElementById('out');
        out.textContent = 'Resetting...';
        const res = await fetch('/config/reset', { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        out.textContent = JSON.stringify(json, null, 2);
      }
    </script>
  </body>
</html>`);
});

app.post("/pair/claim", async (req, res) => {
  try {
    const cloudBaseUrl = resolveCloudBaseUrl();
    if (!cloudBaseUrl) {
      return res.status(400).json({ error: "Missing CLOUD_BASE_URL" });
    }

    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!code) return res.status(400).json({ error: "Missing code" });

    const url = `${cloudBaseUrl.replace(/\/$/, "")}/api/edge/pair/complete`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, name }),
    });

    const json = await r.json().catch(() => null);
    if (!r.ok) {
      return res.status(r.status).json({ error: json?.error ?? "Pairing failed" });
    }

    if (!json?.gatewayId || !json?.secret || !json?.restaurantId) {
      return res.status(400).json({ error: "Invalid pairing response" });
    }

    writeConfig({
      gatewayId: String(json.gatewayId),
      secret: String(json.secret),
      restaurantId: String(json.restaurantId),
      cloudBaseUrl,
      boundAt: new Date().toISOString(),
    });

    return res.json({ ok: true, gatewayId: json.gatewayId, restaurantId: json.restaurantId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return res.status(500).json({ error: msg });
  }
});

app.post("/events", (req, res) => {
  const cfg = readConfig();
  if (!cfg?.gatewayId) return res.status(400).json({ error: "Gateway not paired" });

  const events = Array.isArray(req.body?.events) ? req.body.events : null;
  if (!events) return res.status(400).json({ error: "Missing events" });

  const accepted = [];
  for (const ev of events) {
    const id = typeof ev?.id === "string" ? ev.id.trim() : "";
    const type = typeof ev?.type === "string" ? ev.type.trim() : "";
    const createdAt = typeof ev?.createdAt === "string" ? ev.createdAt.trim() : "";

    if (!id || !type) continue;

    const record = {
      id,
      deviceId: typeof ev?.deviceId === "string" ? ev.deviceId.trim() : null,
      type,
      payload: ev?.payload ?? {},
      createdAt: createdAt && !Number.isNaN(new Date(createdAt).valueOf()) ? new Date(createdAt).toISOString() : new Date().toISOString(),
    };

    appendOutboxEvent(record);
    accepted.push(id);
  }

  res.json({ ok: true, accepted: accepted.length, ids: accepted });
});

app.post("/events/test", (_req, res) => {
  const cfg = readConfig();
  if (!cfg?.gatewayId) return res.status(400).json({ error: "Gateway not paired" });

  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  appendOutboxEvent({
    id,
    deviceId: null,
    type: "test_event",
    payload: { ok: true },
    createdAt: nowIso,
  });

  res.json({ ok: true, queued: 1, id });
});

app.get("/printers", (_req, res) => {
  const cfg = readConfig() ?? {};
  const printers = normalizePrinters(cfg);
  res.json({ printers });
});

app.post("/printers", (req, res) => {
  const cfg = readConfig() ?? {};
  const printers = normalizePrinters(cfg);

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const ip = typeof req.body?.ip === "string" ? req.body.ip.trim() : "";
  const port = typeof req.body?.port === "number" ? req.body.port : Number(req.body?.port ?? 9100);

  if (!ip) return res.status(400).json({ error: "Missing ip" });
  if (!Number.isFinite(port) || port <= 0) return res.status(400).json({ error: "Invalid port" });

  const printer = {
    id: crypto.randomUUID(),
    name,
    ip,
    port,
    createdAt: new Date().toISOString(),
  };

  writeConfig({
    ...cfg,
    printers: [...printers, printer],
  });

  res.json({ ok: true, printer });
});

app.delete("/printers/:id", (req, res) => {
  const id = typeof req.params?.id === "string" ? req.params.id.trim() : "";
  if (!id) return res.status(400).json({ error: "Missing id" });

  const cfg = readConfig() ?? {};
  const printers = normalizePrinters(cfg);
  const next = printers.filter((p) => p.id !== id);

  writeConfig({
    ...cfg,
    printers: next,
  });

  res.json({ ok: true, removed: printers.length - next.length });
});

app.post("/print/test", async (req, res) => {
  try {
    const cfg = readConfig() ?? {};
    const printers = normalizePrinters(cfg);
    const printerId = typeof req.body?.printerId === "string" ? req.body.printerId.trim() : "";

    const printer = printerId ? printers.find((p) => p.id === printerId) ?? null : null;
    if (!printer) return res.status(400).json({ error: "Printer not found" });

    const ticket = buildEscposTestTicket({
      title: "ISLAPOS",
      subtitle: "TEST PRINT",
      lines: [
        `Printer: ${printer.name || "(unnamed)"}`,
        `IP: ${printer.ip}:${printer.port}`,
        `Time: ${new Date().toISOString()}`,
      ],
    });

    await sendRawTcp({ ip: printer.ip, port: printer.port, data: ticket });
    res.json({ ok: true, mode: "escpos" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Print failed";
    res.status(400).json({ error: msg });
  }
});

app.post("/print/test-pcl", async (req, res) => {
  try {
    const cfg = readConfig() ?? {};
    const printers = normalizePrinters(cfg);
    const printerId = typeof req.body?.printerId === "string" ? req.body.printerId.trim() : "";

    const printer = printerId ? printers.find((p) => p.id === printerId) ?? null : null;
    if (!printer) return res.status(400).json({ error: "Printer not found" });

    const ticket = buildPclTestTicket({
      lines: [
        "ISLAPOS - TEST PCL",
        `Printer: ${printer.name || "(unnamed)"}`,
        `IP: ${printer.ip}:${printer.port}`,
        `Time: ${new Date().toISOString()}`,
      ],
    });

    await sendRawTcp({ ip: printer.ip, port: printer.port, data: ticket });
    res.json({ ok: true, mode: "pcl" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Print failed";
    res.status(400).json({ error: msg });
  }
});

app.post("/print/test-text", async (req, res) => {
  try {
    const cfg = readConfig() ?? {};
    const printers = normalizePrinters(cfg);
    const printerId = typeof req.body?.printerId === "string" ? req.body.printerId.trim() : "";

    const printer = printerId ? printers.find((p) => p.id === printerId) ?? null : null;
    if (!printer) return res.status(400).json({ error: "Printer not found" });

    const ticket = buildPlainTextTestTicket({
      lines: [
        "ISLAPOS - TEST TEXT",
        `Printer: ${printer.name || "(unnamed)"}`,
        `IP: ${printer.ip}:${printer.port}`,
        `Time: ${new Date().toISOString()}`,
      ],
    });

    await sendRawTcp({ ip: printer.ip, port: printer.port, data: ticket });
    res.json({ ok: true, mode: "text" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Print failed";
    res.status(400).json({ error: msg });
  }
});

app.get("/printers/discover", async (req, res) => {
  try {
    const timeoutMs = Math.max(50, Math.min(2000, Number(req.query?.timeoutMs ?? 250)));
    const concurrency = Math.max(1, Math.min(200, Number(req.query?.concurrency ?? 50)));
    const port = 9100;

    const printers = await scanLanForPort({ port, timeoutMs, concurrency });
    res.json({ ok: true, printers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Scan failed";
    res.status(400).json({ error: msg });
  }
});

app.post("/sync/push", async (_req, res) => {
  try {
    const cfg = readConfig();
    if (!cfg?.gatewayId || !cfg?.secret) return res.status(400).json({ error: "Gateway not paired" });
    const cloudBaseUrl = resolveCloudBaseUrl();
    if (!cloudBaseUrl) return res.status(400).json({ error: "Missing CLOUD_BASE_URL" });

    const batch = readOutboxEvents(500);
    if (batch.length === 0) return res.json({ ok: true, pushed: 0 });

    const url = `${cloudBaseUrl.replace(/\/$/, "")}/api/edge/push-events`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gateway-id": String(cfg.gatewayId),
        "x-gateway-secret": String(cfg.secret),
      },
      body: JSON.stringify({ events: batch }),
    });

    const json = await r.json().catch(() => null);
    if (!r.ok) {
      return res.status(r.status).json({ error: json?.error ?? "Push failed" });
    }

    const accepted = Number(json?.accepted ?? 0);
    const duplicate = Number(json?.duplicate ?? 0);
    const totalAck = accepted + duplicate;

    if (totalAck > 0) {
      dropOutboxEvents(totalAck);
    }

    res.json({ ok: true, pushed: totalAck, accepted, duplicate });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    res.status(500).json({ error: msg });
  }
});

app.post("/config/reset", (_req, res) => {
  writeConfig({});
  res.json({ ok: true });
});

app.post("/config/cloud", (req, res) => {
  const cloudBaseUrl = typeof req.body?.cloudBaseUrl === "string" ? req.body.cloudBaseUrl.trim() : "";
  if (!cloudBaseUrl) return res.status(400).json({ error: "Missing cloudBaseUrl" });

  const cfg = readConfig() ?? {};
  writeConfig({
    ...cfg,
    cloudBaseUrl,
  });

  res.json({ ok: true, cloudBaseUrl });
});

app.listen(PORT, () => {
  const ip = getLanAddress();
  const url = ip ? `http://${ip}:${PORT}` : `http://localhost:${PORT}`;
  console.log(`[edge-gateway] listening on ${url}`);

  const tickMs = Math.max(500, Math.min(5000, Number(process.env.PRINT_WORKER_TICK_MS ?? 1500)));
  setInterval(() => {
    processPrintQueueTick().catch(() => {});
  }, tickMs);
});
