#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const FRAMES_PER_SECOND = 5; // 1 frame every 5 seconds
const RED_THRESHOLD = 100; // simple red pixel count threshold for error banners

function ocrText(imagePath) {
  try {
    const text = execSync(`tesseract "${imagePath}" stdout -l eng+spa`, { encoding: 'utf-8' });
    return text.toLowerCase();
  } catch {
    return '';
  }
}

function hasRedErrorBanner(imagePath) {
  // Disabled: too aggressive. Only rely on OCR for now.
  return false;
}

function scanFrames(framesDir) {
  const frames = [];
  const files = execSync(`ls -1 "${framesDir}"/*.png | sort`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  for (const file of files) {
    const text = ocrText(file);
    const hasLoading = text.includes('loading');
    const hasError = hasRedErrorBanner(file);
    frames.push({ file, hasLoading, hasError });
  }
  return frames;
}

function buildCleanVideo(frames, inputVideo, outputPath) {
  // Create a list of good frame timestamps
  const goodFrames = frames.filter(f => !f.hasLoading && !f.hasError);
  if (goodFrames.length === 0) {
    console.error('ERROR: No clean frames found!');
    return;
  }
  // Build a concat demuxer file with only good segments
  const concatFile = outputPath.replace('.mp4', '.txt');
  const segmentDuration = 1 / FRAMES_PER_SECOND;
  let concatContent = '';
  for (let i = 0; i < goodFrames.length; i++) {
    const frameIndex = parseInt(goodFrames[i].file.match(/(\d+)\.png$/)[1]) - 1;
    const startTime = frameIndex * segmentDuration;
    concatContent += `file '${inputVideo}'\n`;
    concatContent += `inpoint ${startTime}\n`;
    concatContent += `outpoint ${startTime + segmentDuration}\n`;
  }
  writeFileSync(concatFile, concatContent);
  // Re-encode clean video
  execSync(`ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}"`, { stdio: 'inherit' });
  console.log(`Clean video written to: ${outputPath}`);
}

function main() {
  const [,, inputVideoEn, inputVideoEs] = process.argv;
  if (!inputVideoEn || !inputVideoEs) {
    console.error('Usage: node clean-video.mjs <input-en.mp4> <input-es.mp4>');
    process.exit(1);
  }

  const framesDirEn = 'public/_scan_frames_en';
  const framesDirEs = 'public/_scan_frames_es';

  console.log('Scanning EN frames...');
  const framesEn = scanFrames(framesDirEn);
  console.log('Scanning ES frames...');
  const framesEs = scanFrames(framesDirEs);

  console.log(`EN: ${framesEn.filter(f => f.hasLoading).length} loading frames, ${framesEn.filter(f => f.hasError).length} error frames`);
  console.log(`ES: ${framesEs.filter(f => f.hasLoading).length} loading frames, ${framesEs.filter(f => f.hasError).length} error frames`);

  console.log('Building clean EN video...');
  buildCleanVideo(framesEn, inputVideoEn, 'public/videos/islapos-en-clean.mp4');
  console.log('Building clean ES video...');
  buildCleanVideo(framesEs, inputVideoEs, 'public/videos/islapos-es-clean.mp4');
}

main();
