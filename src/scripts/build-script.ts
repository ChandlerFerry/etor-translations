// Simple build script, will be replaced with ESBuild once we have more complex needs such as multi-language builds
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = join(__dirname, '..');
const rootDir = join(__dirname, '../..');

const uiTranslationsPath = join(srcDir, 'ui-translations.js');
const translationsPath = join(srcDir, 'translations.js');
const mutationObserverPath = join(srcDir, 'mutation-observer.js');

const uiTranslations = readFileSync(uiTranslationsPath, 'utf-8');
const translations = readFileSync(translationsPath, 'utf-8');
const mutationObserver = readFileSync(mutationObserverPath, 'utf-8');

console.log(`Building etor-english-script.js from:`);
console.log(`  - ui-translations.js (${uiTranslations.length} chars)`);
console.log(`  - translations.js (${translations.length} chars)`);
console.log(`  - mutation-observer.js (${mutationObserver.length} chars)`);

const finalScript = [
  uiTranslations.trim(),
  '',
  translations.trim(),
  '',
  mutationObserver.trim()
].join('\n');

const outputPath = join(rootDir, 'etor-english-script.js');
writeFileSync(outputPath, finalScript, 'utf-8');