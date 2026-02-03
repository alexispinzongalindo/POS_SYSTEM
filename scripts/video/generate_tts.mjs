import { promises as fs } from 'fs';
import { join } from 'path';
import { logger, ensureDir, readFile, fileExists, getProjectRoot, parseArgs } from './utils.mjs';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Rachel voice (English)
const SPANISH_VOICE_ID = 'VR6AewLTigWG4xSOukaG'; // Maria voice (Spanish)

/**
 * Generate TTS audio using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} outputPath - Path to save the audio file
 * @param {string} language - Language code (en or es)
 */
async function generateTTS(text, outputPath, language = 'en') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    logger.warn('ELEVENLABS_API_KEY not found in environment');
    logger.info('Creating placeholder audio file for testing');
    await createPlaceholderAudio(outputPath);
    return;
  }

  const voiceId = language === 'es' ? SPANISH_VOICE_ID : DEFAULT_VOICE_ID;
  const url = `${ELEVENLABS_API_URL}/${voiceId}`;

  logger.info(`Generating TTS for ${language} (${text.length} characters)...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    await ensureDir(join(outputPath, '..'));
    await fs.writeFile(outputPath, Buffer.from(audioBuffer));
    
    logger.success(`Generated TTS audio: ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to generate TTS: ${error.message}`);
    logger.info('Creating placeholder audio instead');
    await createPlaceholderAudio(outputPath);
  }
}

/**
 * Create a placeholder silent audio file for testing
 * @param {string} outputPath - Path to save the audio file
 */
async function createPlaceholderAudio(outputPath) {
  // Create a 5-second silent MP3 using ffmpeg
  const { runCommand } = await import('./utils.mjs');
  await ensureDir(join(outputPath, '..'));
  
  try {
    runCommand(
      `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 5 -q:a 9 -acodec libmp3lame "${outputPath}" -y`,
      { silent: true }
    );
    logger.info(`Created placeholder audio: ${outputPath}`);
  } catch (error) {
    logger.warn(`Could not create placeholder audio: ${error.message}`);
  }
}

/**
 * Process all script files and generate TTS audio
 */
async function generateAllTTS() {
  const projectRoot = getProjectRoot();
  const scriptsDir = join(projectRoot, 'scripts/video');
  const audioDir = join(projectRoot, 'out/audio');
  
  await ensureDir(audioDir);

  const scriptFiles = [
    { file: 'script_tour_en.txt', output: 'tour_en.mp3', lang: 'en' },
    { file: 'script_tour_es.txt', output: 'tour_es.mp3', lang: 'es' },
    { file: 'script_training_en.txt', output: 'training_en.mp3', lang: 'en' },
    { file: 'script_training_es.txt', output: 'training_es.mp3', lang: 'es' }
  ];

  logger.info('Starting TTS generation for all scripts...');
  
  for (const script of scriptFiles) {
    const scriptPath = join(scriptsDir, script.file);
    const audioPath = join(audioDir, script.output);
    
    if (await fileExists(scriptPath)) {
      const text = await readFile(scriptPath);
      
      if (text.trim().length > 0) {
        logger.info(`Processing ${script.file}...`);
        await generateTTS(text, audioPath, script.lang);
      } else {
        logger.warn(`Script file ${script.file} is empty, skipping`);
      }
    } else {
      logger.warn(`Script file not found: ${script.file}`);
    }
  }

  logger.success('TTS generation completed!');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs();
  
  if (args.help) {
    console.log(`
Usage: node generate_tts.mjs [options]

Options:
  --help          Show this help message
  
Environment Variables:
  ELEVENLABS_API_KEY    API key for ElevenLabs TTS service

Description:
  Generates TTS audio files from script text files using ElevenLabs API.
  If API key is not provided, creates placeholder silent audio files for testing.
  
  Script files processed:
    - scripts/video/script_tour_en.txt → out/audio/tour_en.mp3
    - scripts/video/script_tour_es.txt → out/audio/tour_es.mp3
    - scripts/video/script_training_en.txt → out/audio/training_en.mp3
    - scripts/video/script_training_es.txt → out/audio/training_es.mp3
`);
    process.exit(0);
  }

  generateAllTTS().catch(error => {
    logger.error('TTS generation failed:', error);
    process.exit(1);
  });
}

export { generateTTS, generateAllTTS };
