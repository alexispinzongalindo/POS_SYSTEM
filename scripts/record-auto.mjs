import { spawn } from "node:child_process";

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function nodeCmd() {
  return process.platform === "win32" ? "node.exe" : "node";
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttpOk(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (true) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return;
    } catch {
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for ${url}`);
    }
    await sleep(800);
  }
}

function spawnLogged(cmd, args, env) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  return child;
}

async function runChild(cmd, args, env) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

  const code = await new Promise((resolve) => {
    child.on("exit", (c) => resolve(c ?? 1));
  });

  if (code !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with exit code ${code}`);
  }
}

async function main() {
  const target = (process.argv[2] ?? "").trim();
  const lang = (process.argv[3] ?? "").trim();

  if (!target || (target !== "tour" && target !== "training")) {
    throw new Error("Usage: node scripts/record-auto.mjs <tour|training> <en|es>");
  }
  if (!lang || (lang !== "en" && lang !== "es")) {
    throw new Error("Usage: node scripts/record-auto.mjs <tour|training> <en|es>");
  }

  const baseUrl = (process.env.RECORD_BASE_URL ?? "http://localhost:3000").trim();
  const shouldStartDevServer = baseUrl === "http://localhost:3000" || baseUrl === "http://127.0.0.1:3000";

  let dev = null;
  try {
    if (shouldStartDevServer) {
      dev = spawnLogged(npmCmd(), ["run", "dev", "--", "-p", "3000"], { PORT: "3000" });
      await waitForHttpOk("http://localhost:3000");
    }

    if (target === "tour") {
      await runChild(nodeCmd(), ["scripts/record-tour.mjs"], { RECORD_LANG: lang });
    } else {
      await runChild(nodeCmd(), ["scripts/record-training.mjs"], { RECORD_LANG: lang });
    }
  } finally {
    if (dev) {
      try {
        dev.kill("SIGTERM");
      } catch {
      }
    }
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`\nRecorder failed: ${msg}\n`);
  process.exit(1);
});
