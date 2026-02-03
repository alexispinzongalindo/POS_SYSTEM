#!/usr/bin/env node

import { readFile, writeFile } from './utils.mjs';
import { writeFile as fsWriteFile } from 'node:fs/promises';

/**
 * Generate TTS audio using ElevenLabs API
 * @param {string} scriptPath - Path to text script file
 * @param {string} language - Language code (en or es)
 * @param {string} outputPath - Output MP3 file path
 */
export async function generateTTS(scriptPath, language, outputPath) {
  const ttsProvider = process.env.TTS_PROVIDER || 'elevenlabs';
  
  console.log(`Generating TTS with provider: ${ttsProvider}, language: ${language}`);
  
  if (ttsProvider === 'none') {
    console.log('TTS_PROVIDER set to "none", skipping TTS generation');
    // Create a silent audio file as placeholder
    await createSilentAudio(outputPath, 10);
    return;
  }
  
  if (ttsProvider !== 'elevenlabs') {
    throw new Error(`Unsupported TTS provider: ${ttsProvider}. Currently only 'elevenlabs' and 'none' are supported.`);
  }
  
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required when using ElevenLabs TTS provider');
  }
  
  // Read the script text
  const scriptText = await readFile(scriptPath);
  
  // Choose voice based on language
  // These are placeholder voice IDs - replace with actual ElevenLabs voice IDs from your account
  // Rachel voice (21m00Tcm4TlvDq8ikWAM) is multilingual and supports both English and Spanish
  // For production, you may want to use different voices for each language
  const voiceId = language === 'es' 
    ? process.env.ELEVENLABS_VOICE_ID_ES || '21m00Tcm4TlvDq8ikWAM'  // Spanish voice (or use Rachel multilingual)
    : process.env.ELEVENLABS_VOICE_ID_EN || '21m00Tcm4TlvDq8ikWAM';  // English voice (Rachel)
  
  console.log(`Using voice ID: ${voiceId} for language: ${language}`);
  
  // Call ElevenLabs API with retries
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to generate TTS...`);
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: scriptText,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          }),
          signal: AbortSignal.timeout(60000) // 60 second timeout
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
      }
      
      // Save the audio data
      const audioBuffer = await response.arrayBuffer();
      await fsWriteFile(outputPath, Buffer.from(audioBuffer));
      
      console.log(`TTS audio generated successfully: ${outputPath}`);
      return;
      
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed to generate TTS after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Create a silent audio file (placeholder when TTS is disabled)
 * @param {string} outputPath - Output MP3 file path
 * @param {number} duration - Duration in seconds
 */
async function createSilentAudio(outputPath, duration) {
  const { runShell } = await import('./utils.mjs');
  const cmd = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${duration} -q:a 9 -acodec libmp3lame -y "${outputPath}"`;
  await runShell(cmd);
  console.log(`Created silent audio placeholder: ${outputPath}`);
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node generate_tts.mjs <script-path> <language> <output-path>');
    console.error('Example: node generate_tts.mjs script_tour_en.txt en output.mp3');
    process.exit(1);
  }
  
  const [scriptPath, language, outputPath] = args;
  
  generateTTS(scriptPath, language, outputPath)
    .then(() => {
      console.log('TTS generation complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('TTS generation failed:', error.message);
      process.exit(1);
    });
}

export default generateTTS;
