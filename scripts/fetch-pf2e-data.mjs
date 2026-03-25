#!/usr/bin/env node
/**
 * fetch-pf2e-data.mjs
 *
 * Downloads and bundles PF2e game data from the Foundry VTT PF2e GitHub repository
 * into a single public/data/pf2e-data.json file for fast app startup.
 *
 * Usage:
 *   node scripts/fetch-pf2e-data.mjs
 *   node scripts/fetch-pf2e-data.mjs --force   # re-fetch even if output exists
 *
 * Requires Node.js 18+ (for native fetch).
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GITHUB_CONTENTS = 'https://api.github.com/repos/foundryvtt/pf2e/contents';
const JSDELIVR = 'https://cdn.jsdelivr.net/gh/foundryvtt/pf2e@master';
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'pf2e-data.json');

const PACK_DIRS = [
  'packs/ancestries',
  'packs/heritages',
  'packs/backgrounds',
  'packs/classes',
  'packs/classfeatures',
  'packs/ancestryfeatures',
  'packs/feats',
  'packs/spells',
  'packs/equipment',
  'packs/armor',
  'packs/weapons',
];

const force = process.argv.includes('--force');

if (!force && existsSync(OUTPUT_FILE)) {
  console.log(`Output already exists: ${OUTPUT_FILE}`);
  console.log('Use --force to re-fetch.');
  process.exit(0);
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'pf2e-character-builder' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function listDirectory(path) {
  const items = await fetchJSON(`${GITHUB_CONTENTS}/${path}`);
  const files = [];
  for (const item of items) {
    if (item.type === 'file' && item.name.endsWith('.json')) {
      files.push(item.path);
    } else if (item.type === 'dir') {
      // One level recursion
      try {
        const sub = await listDirectory(item.path);
        files.push(...sub);
      } catch (e) {
        console.warn(`  Skipping subdir ${item.path}: ${e.message}`);
      }
      // Small delay to avoid rate limiting
      await sleep(100);
    }
  }
  return files;
}

async function fetchFileBatch(paths, concurrency = 8) {
  const results = [];
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const fetched = await Promise.all(
      batch.map(async (path) => {
        try {
          const data = await fetchJSON(`${JSDELIVR}/${path}`);
          return data;
        } catch (e) {
          console.warn(`  Failed: ${path} — ${e.message}`);
          return null;
        }
      })
    );
    results.push(...fetched.filter(Boolean));
    process.stdout.write(`\r  ${Math.min(i + concurrency, paths.length)}/${paths.length}`);
    await sleep(50);
  }
  console.log();
  return results;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('PF2e Data Fetcher');
  console.log('=================\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const allData = {
    ancestries: [],
    backgrounds: [],
    classes: [],
    classFeatures: [],
    ancestryFeatures: [],
    feats: [],
    spells: [],
    armor: [],
    weapons: [],
    equipment: [],
    loadedAt: Date.now(),
    version: new Date().toISOString().split('T')[0],
  };

  const packTypeMap = {
    'packs/ancestries': 'ancestries',
    'packs/heritages': 'ancestryFeatures',
    'packs/backgrounds': 'backgrounds',
    'packs/classes': 'classes',
    'packs/classfeatures': 'classFeatures',
    'packs/ancestryfeatures': 'ancestryFeatures',
    'packs/feats': 'feats',
    'packs/spells': 'spells',
    'packs/equipment': 'equipment',
    'packs/armor': 'armor',
    'packs/weapons': 'weapons',
  };

  for (const packDir of PACK_DIRS) {
    const key = packTypeMap[packDir];
    console.log(`Listing ${packDir}…`);
    let files;
    try {
      files = await listDirectory(packDir);
    } catch (e) {
      console.warn(`  Error listing ${packDir}: ${e.message}`);
      continue;
    }
    console.log(`  Found ${files.length} files. Fetching…`);
    const items = await fetchFileBatch(files);
    console.log(`  Got ${items.length} items.`);
    if (key === 'ancestryFeatures') {
      allData.ancestryFeatures.push(...items);
    } else if (key === 'classFeatures') {
      allData.classFeatures.push(...items);
    } else {
      allData[key].push(...items);
    }
    await sleep(200);
  }

  // Deduplicate ancestryFeatures by _id
  const seen = new Set();
  allData.ancestryFeatures = allData.ancestryFeatures.filter(item => {
    if (seen.has(item._id)) return false;
    seen.add(item._id);
    return true;
  });

  const stats = {
    ancestries: allData.ancestries.length,
    backgrounds: allData.backgrounds.length,
    classes: allData.classes.length,
    classFeatures: allData.classFeatures.length,
    ancestryFeatures: allData.ancestryFeatures.length,
    feats: allData.feats.length,
    spells: allData.spells.length,
    armor: allData.armor.length,
    weapons: allData.weapons.length,
    equipment: allData.equipment.length,
  };

  console.log('\nStats:');
  for (const [key, count] of Object.entries(stats)) {
    console.log(`  ${key}: ${count}`);
  }

  console.log(`\nWriting ${OUTPUT_FILE}…`);
  writeFileSync(OUTPUT_FILE, JSON.stringify(allData));

  const size = (JSON.stringify(allData).length / 1024 / 1024).toFixed(1);
  console.log(`Done! File size: ${size} MB`);
  console.log('\nTip: Run this script periodically to refresh game data from the source.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
