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
 * Optional: set GITHUB_TOKEN env var for higher API rate limits (5000 req/hr vs 60/hr)
 *   GITHUB_TOKEN=ghp_xxx node scripts/fetch-pf2e-data.mjs
 *
 * Requires Node.js 18+ (for native fetch).
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use the same pinned tag as the browser app
const PF2E_TAG = 'pf2e-7.11.3';
const GITHUB_CONTENTS = `https://api.github.com/repos/foundryvtt/pf2e/contents`;
const RAW_BASE = `https://raw.githubusercontent.com/foundryvtt/pf2e/${PF2E_TAG}`;
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'pf2e-data.json');

const PACK_DIRS = [
  'packs/pf2e/ancestries',
  'packs/pf2e/heritages',
  'packs/pf2e/ancestry-features',
  'packs/pf2e/backgrounds',
  'packs/pf2e/classes',
  'packs/pf2e/class-features',
  'packs/pf2e/feats',
  'packs/pf2e/spells',
  'packs/pf2e/equipment',
];

const PACK_TYPE_MAP = {
  'packs/pf2e/ancestries': 'ancestries',
  'packs/pf2e/heritages': 'ancestryFeatures',
  'packs/pf2e/ancestry-features': 'ancestryFeatures',
  'packs/pf2e/backgrounds': 'backgrounds',
  'packs/pf2e/classes': 'classes',
  'packs/pf2e/class-features': 'classFeatures',
  'packs/pf2e/feats': 'feats',
  'packs/pf2e/spells': 'spells',
  'packs/pf2e/equipment': '_equipment_raw',
};

const force = process.argv.includes('--force');
const githubToken = process.env.GITHUB_TOKEN;

if (!force && existsSync(OUTPUT_FILE)) {
  console.log(`Output already exists: ${OUTPUT_FILE}`);
  console.log('Use --force to re-fetch.');
  process.exit(0);
}

function githubHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'pf2e-character-builder',
  };
  if (githubToken) headers['Authorization'] = `token ${githubToken}`;
  return headers;
}

async function fetchJSON(url, headers = {}) {
  const res = await fetch(url, { headers: { ...githubHeaders(), ...headers } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 403 && body.includes('rate limit')) {
      throw new Error(
        `GitHub API rate limit exceeded.\n` +
        `Set GITHUB_TOKEN env var for higher limits (5000 req/hr):\n` +
        `  GITHUB_TOKEN=ghp_xxx node scripts/fetch-pf2e-data.mjs`
      );
    }
    throw new Error(`HTTP ${res.status}: ${url}\n${body.slice(0, 200)}`);
  }
  return res.json();
}

async function listDirectory(path) {
  const url = `${GITHUB_CONTENTS}/${path}?ref=${PF2E_TAG}&per_page=1000`;
  const items = await fetchJSON(url);

  if (!Array.isArray(items)) {
    throw new Error(`Expected array from GitHub API for path: ${path}`);
  }

  const files = [];
  for (const item of items) {
    if (item.type === 'file' && item.name.endsWith('.json') && !item.name.startsWith('_')) {
      files.push(item.path);
    } else if (item.type === 'dir') {
      const sub = await listDirectory(item.path);
      files.push(...sub);
      await sleep(150);
    }
  }
  return files;
}

async function fetchRawFile(path) {
  const res = await fetch(`${RAW_BASE}/${path}`, {
    headers: { 'User-Agent': 'pf2e-character-builder' },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchFileBatch(paths, concurrency = 8) {
  const results = [];
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const fetched = await Promise.all(
      batch.map(path => fetchRawFile(path).catch(() => null))
    );
    results.push(...fetched.filter(Boolean));
    process.stdout.write(`\r  ${Math.min(i + concurrency, paths.length)}/${paths.length}`);
    await sleep(30);
  }
  console.log();
  return results;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('PF2e Data Fetcher');
  console.log(`Tag: ${PF2E_TAG}`);
  if (githubToken) {
    console.log('Using GitHub token (5000 req/hr limit)');
  } else {
    console.log('No GITHUB_TOKEN set — using unauthenticated API (60 req/hr limit)');
    console.log('Tip: Set GITHUB_TOKEN for faster fetching without rate limit errors');
  }
  console.log('');

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
    version: PF2E_TAG,
  };

  for (const packDir of PACK_DIRS) {
    const key = PACK_TYPE_MAP[packDir];
    console.log(`Listing ${packDir}…`);
    let files;
    try {
      files = await listDirectory(packDir);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
      if (e.message.includes('rate limit')) process.exit(1);
      continue;
    }

    console.log(`  Found ${files.length} files. Fetching…`);
    const items = await fetchFileBatch(files);
    console.log(`  Got ${items.length} items.`);

    if (key === '_equipment_raw') {
      // Split equipment by item type
      for (const item of items) {
        if (item.type === 'armor') allData.armor.push(item);
        else if (item.type === 'weapon') allData.weapons.push(item);
        else allData.equipment.push(item);
      }
    } else if (key === 'ancestryFeatures') {
      allData.ancestryFeatures.push(...items);
    } else if (key === 'classFeatures') {
      allData.classFeatures.push(...items);
    } else {
      allData[key].push(...items);
    }

    await sleep(300);
  }

  // Deduplicate ancestryFeatures by _id
  const seen = new Set();
  allData.ancestryFeatures = allData.ancestryFeatures.filter(item => {
    if (seen.has(item._id)) return false;
    seen.add(item._id);
    return true;
  });

  const stats = Object.fromEntries(
    ['ancestries','backgrounds','classes','classFeatures','ancestryFeatures',
     'feats','spells','armor','weapons','equipment']
      .map(k => [k, allData[k].length])
  );

  console.log('\nStats:');
  for (const [k, count] of Object.entries(stats)) {
    console.log(`  ${k}: ${count}`);
  }

  const json = JSON.stringify(allData);
  console.log(`\nWriting ${OUTPUT_FILE}…`);
  writeFileSync(OUTPUT_FILE, json);

  const sizeMB = (json.length / 1024 / 1024).toFixed(1);
  console.log(`Done! File size: ${sizeMB} MB`);
  console.log('\nAdd public/data/pf2e-data.json to .gitignore or commit if you want bundled data.');
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
