#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { 
  runShell, 
  readFile, 
  writeFile, 
  ensureDir, 
  detectBlackFrames, 
  detectErrorFrames,
  generateNeutralSlide,
  createSRT,
  fileExists
} from './utils.mjs';
import { generateTTS } from './generate_tts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    source: null,
    lang: 'en',
    out: './out/videos/tour.mp4',
    dryRun: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        options.source = args[++i];
        break;
      case '--lang':
        options.lang = args[++i];
        break;
      case '--out':
        options.out = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        if (!args[i].startsWith('--')) {
          console.warn(`Unknown argument: ${args[i]}`);
        }
    }
  }
  
  return options;
}

/**
 * Perform dry-run validation
 */
async function dryRunValidation() {
  console.log('=== Dry-run validation ===');
  
  // Check Node version
  const nodeVersion = process.version;
  console.log(`✓ Node version: ${nodeVersion}`);
  
  // Check for ffmpeg
  try {
    await runShell('ffmpeg -version');
    console.log('✓ ffmpeg is installed');
  } catch (error) {
    console.error('✗ ffmpeg is not installed or not in PATH');
    throw new Error('ffmpeg is required');
  }
  
  // Check for required scripts
  const scriptsDir = __dirname;
  const requiredFiles = [
    'script_tour_en.txt',
    'script_tour_es.txt',
    'utils.mjs',
    'generate_tts.mjs'
  ];
  
  for (const file of requiredFiles) {
    const path = join(scriptsDir, file);
    if (await fileExists(path)) {
      console.log(`✓ Found: ${file}`);
    } else {
      console.error(`✗ Missing: ${file}`);
      throw new Error(`Required file not found: ${file}`);
    }
  }
  
  console.log('✓ All dry-run checks passed');
  return true;
}

/**
 * Process source video to remove black frames and error frames
 */
async function processSourceVideo(sourcePath, workspaceDir) {
  console.log('=== Processing source video ===');
  
  if (!await fileExists(sourcePath)) {
    console.log('No source video provided, will generate slides-only video');
    return null;
  }
  
  // Detect black frames
  const blackSegments = await detectBlackFrames(sourcePath);
  
  // Detect error frames (basic heuristic)
  const errorFrames = await detectErrorFrames(sourcePath);
  
  // For now, we'll use the source as-is if no major issues
  // In production, you'd actually cut out bad segments and insert neutral slides
  
  if (blackSegments.length > 0 || errorFrames.length > 0) {
    console.log(`Found ${blackSegments.length} black segments and ${errorFrames.length} error frames`);
    console.log('Note: Advanced segment removal will be implemented in future version');
    console.log('Using source video as-is for now');
  }
  
  return sourcePath;
}

/**
 * Extract frames from video or generate slides
 */
async function prepareSlides(processedVideo, lang, workspaceDir) {
  console.log('=== Preparing slides ===');
  
  const slidesDir = join(workspaceDir, 'slides');
  await ensureDir(slidesDir);
  
  if (processedVideo) {
    // Extract keyframes from video
    console.log('Extracting keyframes from video...');
    const extractCmd = `ffmpeg -i "${processedVideo}" -vf "select='eq(pict_type,I)',scale=1920:1080" -vsync vfr "${slidesDir}/slide_%04d.png"`;
    await runShell(extractCmd);
    
    // Count extracted frames
    const countCmd = `ls -1 "${slidesDir}"/slide_*.png 2>/dev/null | wc -l`;
    const count = await runShell(countCmd);
    console.log(`Extracted ${count} keyframes`);
  } else {
    // Generate placeholder slides
    console.log('Generating placeholder slides...');
    
    const slideTexts = [
      'Welcome to IslaPOS',
      'Admin Dashboard',
      'Floor Plan',
      'Orders',
      'Reports',
      'Inventory',
      'Reservations',
      'Staff Management',
      'Support',
      'Training',
      'POS Screen',
      'Tables',
      'Kitchen Display',
      'Order History',
      'Thank You'
    ];
    
    for (let i = 0; i < slideTexts.length; i++) {
      const slidePath = join(slidesDir, `slide_${String(i + 1).padStart(4, '0')}.png`);
      await generateNeutralSlide(slideTexts[i], slidePath);
    }
  }
  
  return slidesDir;
}

/**
 * Generate video from slides and audio
 */
async function generateVideo(slidesDir, audioPath, outputPath, scriptLines) {
  console.log('=== Generating video ===');
  
  // Get list of slides
  const slidesListCmd = `ls -1 "${slidesDir}"/slide_*.png | sort`;
  const slidesList = await runShell(slidesListCmd);
  const slides = slidesList.split('\n').filter(s => s);
  
  if (slides.length === 0) {
    throw new Error('No slides found to generate video');
  }
  
  console.log(`Found ${slides.length} slides`);
  
  // Get audio duration
  let audioDuration = 0;
  try {
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    audioDuration = parseFloat(await runShell(durationCmd));
    console.log(`Audio duration: ${audioDuration}s`);
  } catch (error) {
    console.warn('Could not get audio duration, using default');
    audioDuration = slides.length * 5; // 5 seconds per slide default
  }
  
  // Calculate slide duration
  const slideDuration = audioDuration / slides.length;
  console.log(`Slide duration: ${slideDuration}s`);
  
  // Create a file list for concat
  const fileListPath = join(dirname(outputPath), 'slides_list.txt');
  let fileListContent = '';
  for (const slide of slides) {
    fileListContent += `file '${slide}'\n`;
    fileListContent += `duration ${slideDuration}\n`;
  }
  // Last slide needs to be repeated for concat demuxer
  if (slides.length > 0) {
    fileListContent += `file '${slides[slides.length - 1]}'\n`;
  }
  
  await writeFile(fileListPath, fileListContent);
  
  // Generate video with slides
  const tempVideoPath = outputPath.replace('.mp4', '_temp.mp4');
  const slideVideoCmd = `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -vf "fps=30,format=yuv420p,scale=1920:1080" -c:v libx264 -preset medium "${tempVideoPath}"`;
  await runShell(slideVideoCmd);
  
  // Combine with audio
  const finalCmd = `ffmpeg -y -i "${tempVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}"`;
  await runShell(finalCmd);
  
  // Cleanup temp files
  await runShell(`rm "${tempVideoPath}" "${fileListPath}"`);
  
  console.log(`Video generated: ${outputPath}`);
  
  // Generate SRT file
  const srtPath = outputPath.replace('.mp4', '.srt');
  const slideTimings = [];
  for (let i = 0; i < scriptLines.length; i++) {
    slideTimings.push({
      start: i * slideDuration,
      end: (i + 1) * slideDuration
    });
  }
  
  await createSRT(slideTimings, scriptLines, srtPath);
  
  return outputPath;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  console.log('Video Generation Tool');
  console.log('Options:', options);
  
  // Dry-run validation
  if (options.dryRun) {
    await dryRunValidation();
    console.log('\n✓ Dry-run validation successful');
    process.exit(0);
  }
  
  // Validate language
  if (options.lang !== 'en' && options.lang !== 'es') {
    throw new Error('Language must be "en" or "es"');
  }
  
  // Setup workspace
  const workspaceDir = join(process.cwd(), 'workspace', options.lang);
  await ensureDir(workspaceDir);
  await ensureDir(dirname(options.out));
  
  // Get script path
  const scriptPath = join(__dirname, `script_tour_${options.lang}.txt`);
  if (!await fileExists(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  
  // Read script lines
  const scriptContent = await readFile(scriptPath);
  const scriptLines = scriptContent.split('\n').filter(line => line.trim());
  
  // Process source video (if provided)
  const processedVideo = options.source 
    ? await processSourceVideo(options.source, workspaceDir)
    : null;
  
  // Prepare slides
  const slidesDir = await prepareSlides(processedVideo, options.lang, workspaceDir);
  
  // Generate TTS audio
  const audioPath = join(workspaceDir, 'narration.mp3');
  await generateTTS(scriptPath, options.lang, audioPath);
  
  // Generate final video
  await generateVideo(slidesDir, audioPath, options.out, scriptLines);
  
  console.log('\n✓ Video generation complete!');
  console.log(`Output: ${options.out}`);
  console.log(`Subtitles: ${options.out.replace('.mp4', '.srt')}`);
}

// Run main if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

export default main;
