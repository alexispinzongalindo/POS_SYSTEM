#!/usr/bin/env node

import { join } from "node:path";
import { tmpdir } from "node:os";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { ensureDir, runShell, writeFile } from "./utils.mjs";
import { generateTTS } from "./generate_tts.mjs";

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    lang: "en",
    totalSeconds: Number(process.env.TRAINING_TOTAL_SECONDS || 180),
    slidesDir: null,
    outVideo: null,
    outAudio: null,
  };

  for (let i = 0; i < args.length; i += 1) {
    switch (args[i]) {
      case "--lang":
        options.lang = args[++i] || "en";
        break;
      case "--slides":
        options.slidesDir = args[++i];
        break;
      case "--out-video":
        options.outVideo = args[++i];
        break;
      case "--out-audio":
        options.outAudio = args[++i];
        break;
      case "--total":
        options.totalSeconds = Number(args[++i] || 180);
        break;
      default:
        break;
    }
  }

  return options;
}

async function listSlides(slidesDir) {
  const entries = await readdir(slidesDir);
  return entries
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => join(slidesDir, f));
}

async function buildVideoFromSlides({ slides, audioPath, outputPath, seconds }) {
  const perSlide = Math.max(4, seconds / slides.length);
  const listPath = join(tmpdir(), `islapos_training_slides_${Date.now()}.txt`);

  let listContent = "";
  for (const slide of slides) {
    listContent += `file '${slide}'\n`;
    listContent += `duration ${perSlide}\n`;
  }
  listContent += `file '${slides[slides.length - 1]}'\n`;

  await writeFile(listPath, listContent);

  const tempVideo = outputPath.replace(/\.mp4$/i, "_temp.mp4");
  const slideCmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -vf "fps=30,format=yuv420p,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset medium "${tempVideo}"`;
  await runShell(slideCmd);

  const muxCmd = `ffmpeg -y -i "${tempVideo}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}"`;
  await runShell(muxCmd);

  await runShell(`rm -f "${tempVideo}" "${listPath}"`);
}

async function main() {
  const options = parseArgs();
  const lang = options.lang === "es" ? "es" : "en";

  const repoRoot = process.cwd();
  const slidesDir = options.slidesDir || join(repoRoot, "public", "islapos-training", lang);
  const outVideo = options.outVideo || join(repoRoot, "public", "videos", `islapos-training-${lang}.mp4`);
  const outAudio = options.outAudio || join(repoRoot, "public", "videos", `islapos-training-${lang}.mp3`);

  const scriptPath = join(repoRoot, "scripts", "video", `script_training_${lang}.txt`);

  await ensureDir(join(repoRoot, "public", "videos"));
  const slides = await listSlides(slidesDir);

  if (!slides.length) {
    throw new Error(`No slides found in ${slidesDir}`);
  }

  await generateTTS(scriptPath, lang, outAudio);
  await buildVideoFromSlides({
    slides,
    audioPath: outAudio,
    outputPath: outVideo,
    seconds: options.totalSeconds,
  });

  console.log(`Training video created: ${outVideo}`);
}

const isDirectRun = (() => {
  try {
    if (!process.argv[1]) return false;
    return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main().catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Training build failed: ${msg}`);
    process.exit(1);
  });
}
