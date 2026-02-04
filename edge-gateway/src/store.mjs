import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const configPath = path.join(dataDir, "config.json");
const outboxPath = path.join(dataDir, "outbox.jsonl");

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
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
