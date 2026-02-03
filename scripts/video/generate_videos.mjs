import { join } from 'path';
import { promises as fs } from 'fs';
import {
  logger,
  ensureDir,
  runCommand,
  fileExists,
  getFiles,
  getProjectRoot,
  parseArgs,
  formatDuration
} from './utils.mjs';

const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;
const VIDEO_FPS = 30;
const SLIDE_DURATION = 5; // seconds per slide by default

/**
 * Extract frames from a video file
 * @param {string} videoPath - Path to source video
 * @param {string} outputDir - Directory to save frames
 */
async function extractFrames(videoPath, outputDir) {
  logger.info(`Extracting frames from ${videoPath}...`);
  await ensureDir(outputDir);
  
  // Extract one frame every 2 seconds
  runCommand(
    `ffmpeg -i "${videoPath}" -vf "fps=1/2,scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}" "${outputDir}/frame_%04d.png" -y`,
    { silent: false }
  );
  
  const frames = await getFiles(outputDir, /\.png$/);
  logger.success(`Extracted ${frames.length} frames`);
  return frames;
}

/**
 * Generate subtitle file (.srt) from script text
 * @param {string} scriptText - Script content
 * @param {number} duration - Total audio duration in seconds
 * @param {string} outputPath - Path to save SRT file
 */
async function generateSubtitles(scriptText, duration, outputPath) {
  logger.info('Generating subtitle file...');
  
  // Split script into sentences
  const sentences = scriptText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  if (sentences.length === 0) {
    logger.warn('No sentences found in script');
    return;
  }

  const timePerSentence = duration / sentences.length;
  let srtContent = '';
  
  sentences.forEach((sentence, index) => {
    const startTime = index * timePerSentence;
    const endTime = (index + 1) * timePerSentence;
    
    srtContent += `${index + 1}\n`;
    srtContent += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
    srtContent += `${sentence}\n\n`;
  });
  
  await fs.writeFile(outputPath, srtContent, 'utf8');
  logger.success(`Generated subtitles: ${outputPath}`);
}

/**
 * Format time in SRT format (HH:MM:SS,mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

/**
 * Get audio duration using ffprobe
 * @param {string} audioPath - Path to audio file
 * @returns {number} Duration in seconds
 */
function getAudioDuration(audioPath) {
  try {
    const output = runCommand(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { silent: true }
    );
    return parseFloat(output.trim());
  } catch (error) {
    logger.warn(`Could not get audio duration: ${error.message}`);
    return 30; // Default 30 seconds
  }
}

/**
 * Create slideshow video from images
 * @param {string[]} images - Array of image paths
 * @param {string} audioPath - Path to audio file
 * @param {string} outputPath - Path to save video
 * @param {string} srtPath - Path to subtitle file
 */
async function createSlideshowVideo(images, audioPath, outputPath, srtPath) {
  logger.info('Creating slideshow video...');
  
  if (images.length === 0) {
    logger.error('No images provided for slideshow');
    return;
  }

  const audioDuration = await fileExists(audioPath) ? getAudioDuration(audioPath) : 30;
  const durationPerSlide = audioDuration / images.length;
  
  logger.info(`Creating video with ${images.length} slides, ${audioDuration.toFixed(2)}s total`);

  // Create a temporary file list for ffmpeg concat
  const fileListPath = join(outputPath, '../filelist.txt');
  const fileListContent = images.map(img => 
    `file '${img}'\nduration ${durationPerSlide}\n`
  ).join('');
  
  await fs.writeFile(fileListPath, fileListContent + `file '${images[images.length - 1]}'`);

  // Create video from images
  const videoNoAudio = outputPath.replace('.mp4', '_temp.mp4');
  
  runCommand(
    `ffmpeg -f concat -safe 0 -i "${fileListPath}" -vf "fps=${VIDEO_FPS},format=yuv420p,scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}" -c:v libx264 -preset medium "${videoNoAudio}" -y`,
    { silent: false }
  );

  // Add audio if exists
  if (await fileExists(audioPath)) {
    runCommand(
      `ffmpeg -i "${videoNoAudio}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}" -y`,
      { silent: false }
    );
    
    // Clean up temp file
    await fs.unlink(videoNoAudio).catch(() => {});
  } else {
    await fs.rename(videoNoAudio, outputPath);
  }

  // Clean up file list
  await fs.unlink(fileListPath).catch(() => {});
  
  logger.success(`Video created: ${outputPath}`);
}

/**
 * Generate videos for a specific type (tour or training)
 * @param {string} type - Video type (tour or training)
 * @param {string} language - Language code (en or es)
 */
async function generateVideo(type, language) {
  const projectRoot = getProjectRoot();
  const slidesDir = join(projectRoot, `public/slides/${type}`);
  const audioPath = join(projectRoot, `out/audio/${type}_${language}.mp3`);
  const scriptPath = join(projectRoot, `scripts/video/script_${type}_${language}.txt`);
  const outputPath = join(projectRoot, `out/videos/${type}_${language}.mp4`);
  const srtPath = join(projectRoot, `out/videos/${type}_${language}.srt`);

  logger.info(`\n=== Generating ${type} video (${language}) ===`);

  // Check for slides
  let slides = await getFiles(slidesDir, /\.(png|jpg|jpeg)$/);
  
  if (slides.length === 0) {
    logger.warn(`No slides found in ${slidesDir}, creating placeholder`);
    await ensureDir(slidesDir);
    await createPlaceholderSlide(join(slidesDir, 'slide_001.png'), `${type} - ${language}`);
    slides = await getFiles(slidesDir, /\.png$/);
  }

  slides.sort(); // Ensure proper order
  logger.info(`Found ${slides.length} slide(s)`);

  // Generate subtitles if script exists
  if (await fileExists(scriptPath) && await fileExists(audioPath)) {
    const scriptText = await fs.readFile(scriptPath, 'utf8');
    const duration = getAudioDuration(audioPath);
    await generateSubtitles(scriptText, duration, srtPath);
  }

  // Create video
  await createSlideshowVideo(slides, audioPath, outputPath, srtPath);
  
  logger.success(`Completed ${type} video (${language})`);
}

/**
 * Create a placeholder slide image
 * @param {string} outputPath - Path to save image
 * @param {string} text - Text to display
 */
async function createPlaceholderSlide(outputPath, text) {
  logger.info(`Creating placeholder slide: ${text}`);
  
  runCommand(
    `ffmpeg -f lavfi -i color=c=black:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=1 ` +
    `-vf "drawtext=text='${text}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2" ` +
    `-frames:v 1 "${outputPath}" -y`,
    { silent: true }
  );
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs();
  
  if (args.help) {
    console.log(`
Usage: node generate_videos.mjs [options]

Options:
  --type=TYPE     Video type to generate (tour, training, or all) [default: all]
  --dry-run       Test mode - don't generate videos
  --help          Show this help message

Description:
  Generates slideshow videos with voiceover and subtitles.
  
  Required:
    - Slide images in public/slides/tour/ and public/slides/training/
    - Audio files in out/audio/ (generated by generate_tts.mjs)
    - Script text files in scripts/video/
`);
    process.exit(0);
  }

  if (args['dry-run']) {
    logger.info('DRY RUN MODE - Testing configuration only');
    const projectRoot = getProjectRoot();
    logger.info(`Project root: ${projectRoot}`);
    logger.info('Script execution successful');
    return;
  }

  const videoType = args.type || 'all';
  const languages = ['en', 'es'];

  logger.info('Starting video generation...\n');

  if (videoType === 'all' || videoType === 'tour') {
    for (const lang of languages) {
      await generateVideo('tour', lang);
    }
  }

  if (videoType === 'all' || videoType === 'training') {
    for (const lang of languages) {
      await generateVideo('training', lang);
    }
  }

  logger.success('\n✅ All videos generated successfully!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logger.error('Video generation failed:', error);
    process.exit(1);
  });
}

export { generateVideo, extractFrames, generateSubtitles };
