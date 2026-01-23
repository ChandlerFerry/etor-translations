import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sevenZip from '7zip-min';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');
const buildDir = join(rootDir, 'build');
const extractDir = join(buildDir, 'extracted');
const etorDir = join(extractDir, 'etor'); // The archive contains an 'etor' folder at root
const resourcesDir = join(etorDir, 'resources');
const appDir = join(resourcesDir, 'app');
const asarPath = join(resourcesDir, 'app.asar');

const DOWNLOAD_URL = 'https://drive.usercontent.google.com/u/0/uc?id=1M8LGVXfD8DuQRS8prOuA9iDw3n2amVOZ&export=download';
const ARCHIVE_NAME = 'etor.7z';

function run(cmd: string, cwd?: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function cleanup() {
  if (existsSync(extractDir)) {
    console.log('Cleaning up extracted directory...');
    rmSync(extractDir, { recursive: true });
  }
  const zipPath = join(buildDir, 'etor-english.zip');
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }
}

function setupBuildDir() {
  console.log('Setting up build directory...');
  mkdirSync(buildDir, { recursive: true });
}

function downloadArchive() {
  const archivePath = join(buildDir, ARCHIVE_NAME);
  if (!existsSync(archivePath)) {
    run(`curl -L -o "${archivePath}" "${DOWNLOAD_URL}"`, buildDir);
  }
  return archivePath;
}

async function extractArchive(archivePath: string): Promise<void> {
  console.log('Extracting etor.7z...');
  mkdirSync(extractDir, { recursive: true });
  return new Promise((resolve, reject) => {
    sevenZip.unpack(archivePath, extractDir, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function extractAsar() {
  console.log('Extracting app.asar...');
  run(`npx @electron/asar extract "${asarPath}" "${appDir}"`, rootDir);
}

function injectScript() {
  const preloadPath = join(appDir, 'build', 'obf-app', 'preload.js');
  const translationScriptPath = join(rootDir, 'etor-english-script.js');

  if (!existsSync(preloadPath)) {
    throw new Error(`preload.js not found at ${preloadPath}`);
  }

  if (!existsSync(translationScriptPath)) {
    throw new Error(`etor-english-script.js not found. Run 'npm run pull' first.`);
  }

  console.log('Reading translation script...');
  const translationScript = readFileSync(translationScriptPath, 'utf-8');

  // Inline the script content directly (fs not available in sandboxed preload)
  const injection = `
(function() {
  let injected = false;
  const tryInject = setInterval(() => {
    if (injected) return;
    if (document && document.head) {
      injected = true;
      clearInterval(tryInject);
      const s = document.createElement('script');
      s.textContent = ${JSON.stringify(translationScript)};
      document.head.appendChild(s);
    }
  }, 100);
})();
`;

  console.log('Injecting script into preload.js...');
  const content = readFileSync(preloadPath, 'utf-8');
  const injectedContent = injection + '\n' + content;

  writeFileSync(preloadPath, injectedContent, 'utf-8');
  console.log('Script injected successfully');
}

function repackAsar() {
  console.log('Repacking app.asar...');
  rmSync(asarPath);
  run(`npx @electron/asar pack "${appDir}" "${asarPath}"`, rootDir);
  rmSync(appDir, { recursive: true });
}

async function createZip(): Promise<string> {
  const zipPath = join(buildDir, 'etor-english.zip');
  console.log('Creating final zip archive...');
  return new Promise((resolve, reject) => {
    sevenZip.pack(etorDir, zipPath, (err: Error | null) => {
      if (err) reject(err);
      else resolve(zipPath);
    });
  });
}

async function main() {
  console.log('=== ETOR English Release Build ===\n');

  cleanup();
  setupBuildDir();

  const archivePath = downloadArchive();
  await extractArchive(archivePath);
  extractAsar();
  injectScript();
  repackAsar();
  const zipPath = await createZip();

  console.log('\n=== Build Complete ===');
  console.log(`Output: ${zipPath}`);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
