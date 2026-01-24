#!/usr/bin/env npx tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ETOR_JS_URL = 'https://etor-beta.710421059.xyz/assets/index-BO2XGuE-.js'; // UPDATE THIS PRIOR TO RUNNIN THE SCRIPT
const ATLAS_TALENTS_PATH = path.join(__dirname, '../src/atlas-talents.ts');

const JSON_PATTERN = /JSON\.parse\('\[\{"id":"connections".*?\}\]\}]'\)/g;

interface RawTooltip {
    type: string;
    mods: string[];
}

interface NodeData {
    rawTooltip?: RawTooltip;
}

interface AtlasData {
    id: string;
    data: NodeData[];
}

type Translations = Record<string, { en: string }>;

async function fetchAtlasData(): Promise<AtlasData[][]> {
    console.log(`Fetching data from ${ETOR_JS_URL}...`);

    const response = await fetch(ETOR_JS_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const jsContent = await response.text();
    const matches = jsContent.matchAll(JSON_PATTERN);
    const allMatches = [...matches];

    if (allMatches.length === 0) {
        throw new Error('Could not find atlas JSON data in the JS file');
    }

    console.log(`Found ${allMatches.length} atlas data sections`);

    const allData: AtlasData[][] = [];
    for (const match of allMatches) {
        // Extract the JSON string from JSON.parse('...')
        const jsonMatch = match[0].match(/JSON\.parse\('(.*)'\)/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[1];
            allData.push(JSON.parse(jsonStr));
        }
    }

    return allData;
}

function extractKeysFromAtlasData(allData: AtlasData[][]): Set<string> {
    const keys = new Set<string>();

    for (const data of allData) {
        // Find the nodes section in each atlas data
        const nodesData = data.find(d => d.id === 'nodes');
        if (!nodesData) {
            continue;
        }

        for (const node of nodesData.data) {
            if (node.rawTooltip) {
                if (node.rawTooltip.type) {
                    keys.add(node.rawTooltip.type);
                }
                if (node.rawTooltip.mods) {
                    for (const mod of node.rawTooltip.mods) {
                        keys.add(mod);
                    }
                }
            }
        }
    }

    return keys;
}

function parseExistingTranslations(filePath: string): Translations {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract the atlasTypes object content
    const match = content.match(/const atlasTypes = \{([\s\S]*?)\n\}/);
    if (!match) {
        console.log('No existing atlasTypes found, starting fresh');
        return {};
    }

    const objContent = match[1];
    const translations: Translations = {};

    // Parse each entry: "key": { en: "value" } or "key": { "en": "value" }
    const entryRegex = /"([^"]+)":\s*\{\s*(?:"en"|en):\s*"([^"]+)"\s*\}/g;
    let entryMatch;

    while ((entryMatch = entryRegex.exec(objContent)) !== null) {
        const key = entryMatch[1];
        const enValue = entryMatch[2];
        translations[key] = { en: enValue };
    }

    return translations;
}

function generateAtlasTalentsFile(translations: Translations, allKeys: Set<string>): string {
    const lines: string[] = [
        'import { Translations } from "./translations.types"\n\nexport const atlasTalentTranslations: Translations = {'
    ];

    // Sort keys: types first (short ones), then mods (longer ones)
    const sortedKeys = [...allKeys].sort((a, b) => {
        // Types are shorter (起始节点, 小型节点, 中型节点)
        const aIsType = a.length <= 4;
        const bIsType = b.length <= 4;
        if (aIsType && !bIsType) return -1;
        if (!aIsType && bIsType) return 1;
        return a.localeCompare(b, 'zh');
    });

    for (const key of sortedKeys) {
        const existing = translations[key];
        if (existing) {
            lines.push(`    "${key}": {`);
            lines.push(`        en: "${existing.en}"`);
            lines.push(`    },`);
        } else {
            // New key - add with TODO placeholder
            lines.push(`    "${key}": {`);
            lines.push(`        en: "TODO: ${key}"`);
            lines.push(`    },`);
        }
    }

    lines.push('}');

    return lines.join('\n');
}

async function main() {
    try {
        // Fetch and parse atlas data
        const atlasData = await fetchAtlasData();
        console.log('Successfully fetched atlas data');

        // Extract all unique keys (types and mods)
        const allKeys = extractKeysFromAtlasData(atlasData);
        console.log(`Found ${allKeys.size} unique keys (types + mods)`);

        // Parse existing translations
        const existingTranslations = parseExistingTranslations(ATLAS_TALENTS_PATH);
        console.log(`Found ${Object.keys(existingTranslations).length} existing translations`);

        // Find new keys
        const newKeys = [...allKeys].filter(key => !existingTranslations[key]);
        if (newKeys.length > 0) {
            console.log(`\nNew keys found (${newKeys.length}):`);
            for (const key of newKeys) {
                console.log(`  - ${key}`);
            }
        } else {
            console.log('\nNo new keys found');
        }

        // Generate updated file
        const updatedContent = generateAtlasTalentsFile(existingTranslations, allKeys);

        // Write to file
        fs.writeFileSync(ATLAS_TALENTS_PATH, updatedContent);
        console.log(`\nUpdated ${ATLAS_TALENTS_PATH}`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
