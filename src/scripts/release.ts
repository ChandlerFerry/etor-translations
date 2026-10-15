import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sevenZip from '7zip-min';
import { transform } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');
const buildDir = join(rootDir, 'build');
const extractDir = join(buildDir, 'extracted');
const etorDir = join(extractDir, 'etor');
const resourcesDir = join(etorDir, 'resources');
const appDir = join(resourcesDir, 'app');
const asarPath = join(resourcesDir, 'app.asar');

// $PLUGINSDIR/app-64.7z from 易火-ETor Setup 1.0.6.exe (sha256 d76bee60ff136100c027ebfb18e7c141db64b6d6739c2024f25019f362ca41df).
// ipc-guard.cjs was audited against this exact build; re-audit app.asar before bumping the hash.
const SOURCE_URL = 'https://github.com/ChandlerFerry/etor-translations/releases/download/upstream-1.0.6/app-64.7z';
const SOURCE_SHA256 = '624a758fd3a2ab7388a586f93ad450b0f6adacad637ff94f548082066a8ad25e';
const ARCHIVE_NAME = 'app-64.7z';

const LANGUAGES = ['en', 'ko', 'ja', 'ru'] as const;
type Language = typeof LANGUAGES[number];

const LANG_NAMES: Record<Language, string> = {
  en: 'english',
  ko: 'korean',
  ja: 'japanese',
  ru: 'russian',
};

function run(cmd: string, cwd?: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function cleanup() {
  if (existsSync(extractDir)) {
    console.log('Cleaning up extracted directory...');
    rmSync(extractDir, { recursive: true });
  }
}

function setupBuildDir() {
  console.log('Setting up build directory...');
  mkdirSync(buildDir, { recursive: true });
}

function downloadArchive() {
  const archivePath = join(buildDir, ARCHIVE_NAME);
  if (!existsSync(archivePath)) {
    run(`curl -fL -o "${archivePath}" "${SOURCE_URL}"`, buildDir);
  }
  const sha256 = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
  if (sha256 !== SOURCE_SHA256) {
    rmSync(archivePath);
    throw new Error(`${ARCHIVE_NAME} sha256 mismatch: expected ${SOURCE_SHA256}, got ${sha256}`);
  }
  return archivePath;
}

async function extractArchive(archivePath: string): Promise<void> {
  console.log(`Extracting ${ARCHIVE_NAME}...`);
  mkdirSync(etorDir, { recursive: true });
  return new Promise((resolve, reject) => {
    sevenZip.unpack(archivePath, etorDir, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function extractAsar() {
  console.log('Extracting app.asar...');
  run(`npx @electron/asar extract "${asarPath}" "${appDir}"`, rootDir);
}

async function injectScript(lang: Language) {
  const langName = LANG_NAMES[lang];
  const preloadPath = join(appDir, 'build', 'obf-app', 'preload.js');
  const translationScriptPath = join(rootDir, `etor-${langName}.js`);

  if (!existsSync(preloadPath)) {
    throw new Error(`preload.js not found at ${preloadPath}`);
  }

  if (!existsSync(translationScriptPath)) {
    throw new Error(`etor-${langName}.js not found. Run 'npm run pull' first.`);
  }

  const translationScript = readFileSync(translationScriptPath, 'utf-8');

  const minified = await transform(translationScript, {
    minify: true,
    loader: 'js',
  });

  const injection = `
(function() {
  let injected = false;
  const tryInject = setInterval(() => {
    if (injected) return;
    if (document && document.head) {
      injected = true;
      clearInterval(tryInject);
      const s = document.createElement('script');
      s.textContent = ${JSON.stringify(minified.code)};
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

function injectIpcGuard() {
  console.log('Injecting IPC guard into main.js...');
  const mainPath = join(appDir, 'build', 'obf-app', 'main.js');
  const guard = readFileSync(join(rootDir, 'src', 'ipc-guard.cjs'), 'utf-8');
  writeFileSync(mainPath, guard + '\n' + readFileSync(mainPath, 'utf-8'), 'utf-8');
}

function repackAsar() {
  rmSync(asarPath);
  run(`npx @electron/asar pack "${appDir}" "${asarPath}"`, rootDir);
  rmSync(appDir, { recursive: true });
}

async function createZip(lang: Language): Promise<string> {
  const langName = LANG_NAMES[lang];
  const zipPath = join(buildDir, `etor-${langName}.zip`);

  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  return new Promise((resolve, reject) => {
    sevenZip.pack(etorDir, zipPath, (err: Error | null) => {
      if (err) reject(err);
      else resolve(zipPath);
    });
  });
}

async function buildLanguage(lang: Language, archivePath: string): Promise<string> {
  const langName = LANG_NAMES[lang];
  console.log(`\n--- Building ${langName} release ---\n`);

  cleanup();
  await extractArchive(archivePath);
  extractAsar();
  await injectScript(lang);
  injectIpcGuard();
  repackAsar();
  return await createZip(lang);
}

async function main() {
  setupBuildDir();
  const archivePath = downloadArchive();

  const outputs: string[] = [];

  for (const lang of LANGUAGES) {
    const zipPath = await buildLanguage(lang, archivePath);
    outputs.push(zipPath);
  }

  cleanup();

  for (const output of outputs) {
    console.log(`  ${output}`);
  }
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
