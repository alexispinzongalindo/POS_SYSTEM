#!/usr/bin/env node

import { spawn } from "node:child_process";

try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.training.local" });
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
} catch {
  // ignore if dotenv is unavailable
}

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runStep(label, args) {
  return new Promise((resolve, reject) => {
    process.stdout.write(`\n[training-workflow] ${label}\n`);
    const child = spawn(npmCmd(), args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", (err) => reject(err));
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} failed with exit code ${code ?? 1}`));
      }
    });
  });
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(value).trim();
}

function validateCaptureEnv() {
  requiredEnv("RECORD_BASE_URL");
  requiredEnv("RECORD_EMAIL");
  requiredEnv("RECORD_PASSWORD");
}

function validateBuildEnv() {
  const provider = (process.env.TTS_PROVIDER ?? "elevenlabs").trim().toLowerCase();
  if (provider === "none") return;
  requiredEnv("ELEVENLABS_API_KEY");
}

function parseArgs() {
  const lang = (process.argv[2] ?? "all").trim().toLowerCase();
  const captureOnly = process.argv.includes("--capture-only");
  const buildOnly = process.argv.includes("--build-only");

  if (!["en", "es", "all"].includes(lang)) {
    throw new Error("Usage: node scripts/run-training-workflow.mjs <en|es|all> [--capture-only|--build-only]");
  }
  if (captureOnly && buildOnly) {
    throw new Error("Use only one: --capture-only or --build-only");
  }

  return { lang, captureOnly, buildOnly };
}

function langsToRun(lang) {
  return lang === "all" ? ["en", "es"] : [lang];
}

async function main() {
  const { lang, captureOnly, buildOnly } = parseArgs();
  const langs = langsToRun(lang);

  if (!buildOnly) validateCaptureEnv();
  if (!captureOnly) validateBuildEnv();

  for (const l of langs) {
    if (!buildOnly) {
      await runStep(`Capture slides (${l})`, ["run", `capture:training:slides:${l}`]);
    }
    if (!captureOnly) {
      await runStep(`Build narrated video (${l})`, ["run", `build:training:${l}`]);
    }
  }

  process.stdout.write("\n[training-workflow] Completed successfully.\n");
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`\n[training-workflow] Failed: ${msg}\n`);
  process.exit(1);
});
