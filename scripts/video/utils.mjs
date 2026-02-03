import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Execute a shell command and return the output
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 * @returns {string} Command output
 */
export function runCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return output;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    if (options.ignoreError) {
      return '';
    }
    throw error;
  }
}

/**
 * Ensure a directory exists, create if it doesn't
 * @param {string} dirPath - Directory path
 */
export async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Read a text file
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} File contents
 */
export async function readFile(filePath) {
  return await fs.readFile(filePath, 'utf8');
}

/**
 * Write a text file
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 */
export async function writeFile(filePath, content) {
  await ensureDir(dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} True if file exists
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all files in a directory matching a pattern
 * @param {string} dirPath - Directory path
 * @param {RegExp} pattern - Pattern to match
 * @returns {Promise<string[]>} Array of file paths
 */
export async function getFiles(dirPath, pattern = null) {
  try {
    const files = await fs.readdir(dirPath);
    if (pattern) {
      return files.filter(f => pattern.test(f)).map(f => join(dirPath, f));
    }
    return files.map(f => join(dirPath, f));
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}:`, error.message);
    return [];
  }
}

/**
 * Simple logger with timestamps
 */
export const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  success: (msg, ...args) => console.log(`[SUCCESS] ✅ ${msg}`, ...args),
};

/**
 * Get the project root directory
 * @returns {string} Project root path
 */
export function getProjectRoot() {
  return join(__dirname, '../..');
}

/**
 * Parse command line arguments
 * @returns {object} Parsed arguments
 */
export function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value === undefined ? true : value;
    }
  });
  return args;
}

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format duration in seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
