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
    speechRate: Number(process.env.TRAINING_SPEECH_RATE || 1),
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
      case "--speech-rate":
        options.speechRate = Number(args[++i] || 1);
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

function escapeForConcat(path) {
  return path.replace(/'/g, "'\\''");
}

async function probeDurationSeconds(mediaPath) {
  const out = await runShell(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mediaPath}"`,
    { ignoreStderr: true },
  );
  const seconds = Number.parseFloat(out);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Could not read media duration: ${mediaPath}`);
  }
  return seconds;
}

async function readScriptLines(scriptPath) {
  const scriptText = await runShell(`cat "${scriptPath}"`);
  return scriptText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function applyAudioRate(audioPath, rate) {
  if (Math.abs(rate - 1) < 0.001) return;
  if (!Number.isFinite(rate) || rate < 0.5 || rate > 2) {
    throw new Error(`TRAINING_SPEECH_RATE must be between 0.5 and 2. Received: ${rate}`);
  }
  const adjustedPath = audioPath.replace(/\.mp3$/i, ".adjusted.mp3");
  await runShell(
    `ffmpeg -y -i "${audioPath}" -filter:a "atempo=${rate}" -c:a libmp3lame -q:a 2 "${adjustedPath}"`,
  );
  await runShell(`mv "${adjustedPath}" "${audioPath}"`);
}

async function generateSegmentAudio({ lines, lang, outAudio, speechRate }) {
  const tempDir = join(tmpdir(), `islapos_training_segments_${lang}_${Date.now()}`);
  await ensureDir(tempDir);

  const segments = [];
  for (let i = 0; i < lines.length; i += 1) {
    const index = String(i + 1).padStart(3, "0");
    const scriptPath = join(tempDir, `line-${index}.txt`);
    const audioPath = join(tempDir, `line-${index}.mp3`);
    await writeFile(scriptPath, `${lines[i]}\n`);
    await generateTTS(scriptPath, lang, audioPath);
    await applyAudioRate(audioPath, speechRate);
    const duration = await probeDurationSeconds(audioPath);
    segments.push({ audioPath, duration });
  }

  const listPath = join(tempDir, "audio_concat.txt");
  let listContent = "";
  for (const segment of segments) {
    listContent += `file '${escapeForConcat(segment.audioPath)}'\n`;
  }
  await writeFile(listPath, listContent);

  await runShell(
    `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:a libmp3lame -q:a 2 "${outAudio}"`,
  );

  return { segments, tempDir };
}

async function buildVideoFromSlides({ slides, slideDurations, audioPath, outputPath }) {
  if (slides.length !== slideDurations.length) {
    throw new Error(
      `Slide/audio mismatch: slides=${slides.length}, lines=${slideDurations.length}`,
    );
  }

  const listPath = join(tmpdir(), `islapos_training_slides_${Date.now()}.txt`);

  let listContent = "";
  for (let i = 0; i < slides.length; i += 1) {
    const slide = slides[i];
    const duration = Math.max(1.2, slideDurations[i]);
    listContent += `file '${escapeForConcat(slide)}'\n`;
    listContent += `duration ${duration}\n`;
  }
  listContent += `file '${escapeForConcat(slides[slides.length - 1])}'\n`;

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
  const lines = await readScriptLines(scriptPath);

  if (!slides.length) {
    throw new Error(`No slides found in ${slidesDir}`);
  }

  if (lines.length !== slides.length) {
    throw new Error(
      `Training script lines (${lines.length}) must match slides (${slides.length}) in ${lang}.`,
    );
  }

  const { segments, tempDir } = await generateSegmentAudio({
    lines,
    lang,
    outAudio,
    speechRate: options.speechRate,
  });

  await buildVideoFromSlides({
    slides,
    slideDurations: segments.map((s) => s.duration),
    audioPath: outAudio,
    outputPath: outVideo,
  });

  await runShell(`rm -rf "${tempDir}"`);

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
