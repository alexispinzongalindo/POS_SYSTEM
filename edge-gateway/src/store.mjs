import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const configPath = path.join(dataDir, "config.json");
const outboxPath = path.join(dataDir, "outbox.jsonl");
const printQueuePath = path.join(dataDir, "print-queue.json");

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function atomicWriteJson(filePath, data) {
  ensureDataDir();
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function readConfig() {
  try {
    ensureDataDir();
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConfig(cfg) {
  ensureDataDir();
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
}

export function appendOutboxEvent(evt) {
  ensureDataDir();
  fs.appendFileSync(outboxPath, `${JSON.stringify(evt)}\n`, "utf8");
}

export function readOutboxEvents(limit = 500) {
  try {
    ensureDataDir();
    if (!fs.existsSync(outboxPath)) return [];
    const raw = fs.readFileSync(outboxPath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const slice = lines.slice(0, Math.max(0, limit));
    const events = [];
    for (const line of slice) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === "object") events.push(parsed);
      } catch {
        // ignore
      }
    }
    return events;
  } catch {
    return [];
  }
}

export function dropOutboxEvents(count) {
  try {
    ensureDataDir();
    if (!fs.existsSync(outboxPath)) return;
    const raw = fs.readFileSync(outboxPath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const remaining = lines.slice(Math.max(0, count));
    fs.writeFileSync(outboxPath, remaining.length ? `${remaining.join("\n")}\n` : "", "utf8");
  } catch {
    // ignore
  }
}

export function readPrintQueue() {
  try {
    ensureDataDir();
    if (!fs.existsSync(printQueuePath)) return [];
    const raw = fs.readFileSync(printQueuePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePrintQueue(queue) {
  atomicWriteJson(printQueuePath, Array.isArray(queue) ? queue : []);
}

export function enqueuePrintJob(job) {
  const queue = readPrintQueue();
  queue.push(job);
  writePrintQueue(queue);
  return job;
}

export function updatePrintJob(id, patch) {
  const queue = readPrintQueue();
  const idx = queue.findIndex((j) => j && typeof j === "object" && j.id === id);
  if (idx < 0) return null;

  const prev = queue[idx];
  const next = { ...prev, ...patch };
  queue[idx] = next;
  writePrintQueue(queue);
  return next;
}

export function cancelPrintJob(id) {
  return updatePrintJob(id, { status: "canceled", updatedAt: new Date().toISOString() });
}

export function prunePrintQueue({ keepLast = 250, maxAgeDays = 7 } = {}) {
  const queue = readPrintQueue();
  if (queue.length <= keepLast) return;

  const now = Date.now();
  const maxAgeMs = Math.max(1, Number(maxAgeDays) || 7) * 24 * 60 * 60 * 1000;

  const isTerminal = (s) => s === "succeeded" || s === "failed" || s === "canceled";
  const keep = [];
  const sorted = queue
    .slice()
    .filter(Boolean)
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));

  const tail = sorted.slice(Math.max(0, sorted.length - keepLast));
  for (const j of tail) keep.push(j);

  // For everything else, keep only recent non-terminal jobs.
  for (const j of sorted.slice(0, Math.max(0, sorted.length - keepLast))) {
    const status = j?.status;
    if (!isTerminal(status)) {
      keep.push(j);
      continue;
    }
    const updated = Date.parse(j?.updatedAt ?? j?.createdAt ?? "");
    const ageOk = Number.isFinite(updated) ? now - updated <= maxAgeMs : false;
    if (ageOk) keep.push(j);
  }

  // De-dupe by id (last write wins)
  const byId = new Map();
  for (const j of keep) {
    if (!j?.id) continue;
    byId.set(j.id, j);
  }
  writePrintQueue(Array.from(byId.values()));
}
