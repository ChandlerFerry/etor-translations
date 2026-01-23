import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

type TranslationDictionary = Record<string, string>;

interface SearchResult {
  cn: string;
  en: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = join(__dirname, '..');

const translationsPath = join(srcDir, 'translations.js');

if (!existsSync(translationsPath)) {
  console.error('Error: translations.js not found. Run "npm run build" first.');
  process.exit(1);
}

// Parse the JavaScript file to extract itemNames object
const translationsContent = readFileSync(translationsPath, 'utf-8');
const match = translationsContent.match(/const itemNames = \{([\s\S]*)\};/);
if (!match) {
  console.error('Error: Could not parse translations.js');
  process.exit(1);
}

// Parse the object content
const cnToEn: TranslationDictionary = {};
const objectContent = match[1];
const lineRegex = /^\s*"([^"]+)":\s*"([^"]+)"/gm;
let lineMatch: RegExpExecArray | null;

while ((lineMatch = lineRegex.exec(objectContent)) !== null) {
  cnToEn[lineMatch[1]] = lineMatch[2];
}

const enToCn: TranslationDictionary = Object.fromEntries(
  Object.entries(cnToEn).map(([cn, en]) => [en, cn])
);

function translateCnToEn(text: string): string | null {
  return cnToEn[text] || null;
}

function translateEnToCn(text: string): string | null {
  return enToCn[text] || null;
}

function search(query: string): SearchResult[] {
  const lower = query.toLowerCase();
  return Object.entries(cnToEn)
    .filter(([cn, en]) => cn.toLowerCase().includes(lower) || en.toLowerCase().includes(lower))
    .map(([cn, en]) => ({ cn, en }));
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('TLIDB Translator');
  console.log('================');
  console.log('Usage:');
  console.log('  npm run translate -- --cn "中文"      CN -> EN');
  console.log('  npm run translate -- --en "English"   EN -> CN');
  console.log('  npm run translate -- --search "text"  Search');
  console.log(`\nTotal pairs: ${Object.keys(cnToEn).length}`);
  process.exit(0);
}

let i = 0;
while (i < args.length) {
  const arg = args[i];

  if (arg === '--cn' && args[i + 1]) {
    const result = translateCnToEn(args[i + 1]);
    console.log(result ? `"${args[i + 1]}" -> "${result}"` : `Not found: "${args[i + 1]}"`);
    i += 2;
  } else if (arg === '--en' && args[i + 1]) {
    const result = translateEnToCn(args[i + 1]);
    console.log(result ? `"${args[i + 1]}" -> "${result}"` : `Not found: "${args[i + 1]}"`);
    i += 2;
  } else if (arg === '--search' && args[i + 1]) {
    const results = search(args[i + 1]);
    console.log(`Results for "${args[i + 1]}":`);
    results.slice(0, 20).forEach(r => console.log(`  ${r.cn} -> ${r.en}`));
    if (results.length > 20) console.log(`  ... and ${results.length - 20} more`);
    i += 2;
  } else {
    i++;
  }
}

export { cnToEn, enToCn, translateCnToEn, translateEnToCn, search };
