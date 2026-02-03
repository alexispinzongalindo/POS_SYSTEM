#!/usr/bin/env node

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile as writeFileCallback, readFile as readFileCallback, mkdir } from 'node:fs';
import { access } from 'node:fs/promises';

const execAsync = promisify(exec);
const writeFileAsync = promisify(writeFileCallback);
const readFileAsync = promisify(readFileCallback);
const mkdirAsync = promisify(mkdir);

/**
 * Run a shell command and return stdout
 * @param {string} cmd - Command to execute
 * @param {object} options - Options for exec
 * @returns {Promise<string>} stdout
 */
export async function runShell(cmd, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024, ...options });
    if (stderr && !options.ignoreStderr) {
      console.warn('Shell stderr:', stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Shell command failed: ${cmd}`);
    console.error(error.message);
    throw error;
  }
}

/**
 * Write a file with UTF-8 encoding
 * @param {string} path - File path
 * @param {string} content - File content
 */
export async function writeFile(path, content) {
  await writeFileAsync(path, content, 'utf-8');
}

/**
 * Read a file with UTF-8 encoding
 * @param {string} path - File path
 * @returns {Promise<string>} File content
 */
export async function readFile(path) {
  return await readFileAsync(path, 'utf-8');
}

/**
 * Ensure a directory exists
 * @param {string} dir - Directory path
 */
export async function ensureDir(dir) {
  try {
    await access(dir);
  } catch {
    await mkdirAsync(dir, { recursive: true });
  }
}

/**
 * Detect black frames in a video using ffmpeg blackdetect filter
 * @param {string} videoPath - Path to video file
 * @param {number} threshold - Black pixel threshold (0.0-1.0)
 * @param {number} duration - Minimum duration in seconds
 * @returns {Promise<Array<{start: number, end: number}>>} Array of black frame segments
 */
export async function detectBlackFrames(videoPath, threshold = 0.1, duration = 0.5) {
  const cmd = `ffmpeg -i "${videoPath}" -vf blackdetect=d=${duration}:pix_th=${threshold} -an -f null - 2>&1`;
  const output = await runShell(cmd, { ignoreStderr: true });
  
  const blackSegments = [];
  const regex = /black_start:([\d.]+) black_end:([\d.]+)/g;
  let match;
  
  while ((match = regex.exec(output)) !== null) {
    blackSegments.push({
      start: parseFloat(match[1]),
      end: parseFloat(match[2])
    });
  }
  
  console.log(`Detected ${blackSegments.length} black frame segments`);
  return blackSegments;
}

/**
 * Detect error frames using basic heuristic (high contrast regions)
 * This is a simple implementation that looks for potential error overlays
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Array<{timestamp: number}>>} Array of potential error frames
 */
export async function detectErrorFrames(videoPath) {
  // Simple heuristic: extract frames and check for high-contrast rectangular regions
  // For now, we'll use a placeholder implementation
  // In production, you'd analyze frames for text overlays, red error boxes, etc.
  
  console.log('Running error frame detection (basic heuristic)...');
  
  // Extract 1 frame per second for analysis
  const tempDir = join(tmpdir(), 'frame_analysis');
  await ensureDir(tempDir);
  
  try {
    // Get video duration
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    const durationStr = await runShell(durationCmd);
    const duration = parseFloat(durationStr);
    
    if (isNaN(duration)) {
      console.log('Could not determine video duration, skipping error detection');
      return [];
    }
    
    // For now, return empty array - actual implementation would analyze frames
    // This is a placeholder for the full error detection logic
    console.log(`Video duration: ${duration}s - error detection placeholder (no errors found)`);
    return [];
  } catch (error) {
    console.warn('Error frame detection failed:', error.message);
    return [];
  }
}

/**
 * Generate a neutral slide with text using ffmpeg drawtext
 * @param {string} text - Text to display on slide
 * @param {string} outpath - Output path for the slide
 * @param {string} bgColor - Background color (default: gray)
 */
export async function generateNeutralSlide(text, outpath, bgColor = '#333333') {
  const cmd = `ffmpeg -f lavfi -i color=c=${bgColor}:s=1920x1080:d=2 \
    -vf "drawtext=text='${text.replace(/'/g, "\\'")}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2" \
    -frames:v 1 -y "${outpath}"`;
  
  await runShell(cmd);
  console.log(`Generated neutral slide: ${outpath}`);
}

/**
 * Create an SRT subtitle file from slide timings and texts
 * @param {Array<{start: number, end: number}>} slideTimings - Array of timing objects
 * @param {Array<string>} texts - Array of caption texts
 * @param {string} outpath - Output SRT file path
 */
export async function createSRT(slideTimings, texts, outpath) {
  let srtContent = '';
  
  for (let i = 0; i < slideTimings.length; i++) {
    const { start, end } = slideTimings[i];
    const text = texts[i] || '';
    
    // SRT index (1-based)
    srtContent += `${i + 1}\n`;
    
    // Timestamp format: HH:MM:SS,mmm
    srtContent += `${formatSRTTime(start)} --> ${formatSRTTime(end)}\n`;
    
    // Caption text
    srtContent += `${text}\n\n`;
  }
  
  await writeFile(outpath, srtContent);
  console.log(`Created SRT file: ${outpath}`);
}

/**
 * Format seconds to SRT timestamp format (HH:MM:SS,mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted timestamp
 */
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

/**
 * Check if a file exists
 * @param {string} path - File path
 * @returns {Promise<boolean>} True if file exists
 */
export async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
