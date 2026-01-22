import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const CN_URL = 'https://tlidb.com/i18n/autocomplete_cn.json';
const EN_URL = 'https://tlidb.com/i18n/autocomplete_en.json';

console.log('Fetching translation data from TLIDB API...');

// Fetch both autocomplete files from API
const [cnResponse, enResponse] = await Promise.all([
  fetch(CN_URL),
  fetch(EN_URL)
]);

if (!cnResponse.ok) {
  throw new Error(`Failed to fetch CN data: ${cnResponse.status} ${cnResponse.statusText}`);
}
if (!enResponse.ok) {
  throw new Error(`Failed to fetch EN data: ${enResponse.status} ${enResponse.statusText}`);
}

const cnData = await cnResponse.json();
const enData = await enResponse.json();

console.log(`Fetched ${cnData.length} CN entries and ${enData.length} EN entries`);

// Create lookup map for EN by value
const enByValue = new Map(enData.map(item => [item.value, item]));

// Build simple CN -> EN translation dictionary
const translations = {};
let matched = 0;

for (const cnItem of cnData) {
  const { value, label: cnLabel } = cnItem;
  const enItem = enByValue.get(value);

  if (enItem) {
    translations[cnLabel] = enItem.label;
    matched++;
  }
}

// Write the translation file
writeFileSync(
  join(rootDir, 'translations.json'),
  JSON.stringify(translations, null, 2),
  'utf-8'
);

console.log('Translation Build Complete!');
console.log(`Matched pairs: ${matched}`);
console.log('Output: translations.json');
