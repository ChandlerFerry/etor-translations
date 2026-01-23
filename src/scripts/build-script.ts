import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = join(__dirname, '..');
const rootDir = join(__dirname, '../..');

// Read the three source files
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

// Combine all parts
const finalScript = [
  '// UI Translations',
  uiTranslations.trim(),
  '',
  '// Item Names from TLIDB',
  translations.trim(),
  '',
  '// Translation Logic and Mutation Observer',
  mutationObserver.trim()
].join('\n');

// Write to output file
const outputPath = join(rootDir, 'etor-english-script.js');
writeFileSync(outputPath, finalScript, 'utf-8');

console.log(`\nSuccessfully built: etor-english-script.js`);
console.log(`Total size: ${finalScript.length} characters`);
