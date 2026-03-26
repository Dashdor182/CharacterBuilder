/**
 * Data Loader
 *
 * Fetches PF2e game data from jsDelivr CDN (mirrors Foundry VTT PF2e GitHub).
 * Path discovery uses jsDelivr's flat listing API — no GitHub API rate limits.
 * File content fetched via jsDelivr CDN.
 * Data is cached in localStorage with 24hr TTL.
 */

import type {
  GameData,
  PF2eAncestry,
  PF2eBackground,
  PF2eClass,
  PF2eFeat,
  PF2eClassFeature,
  PF2eSpell,
  PF2eArmor,
  PF2eWeapon,
  PF2eEquipment,
  FoundryItem,
} from '../types/pf2e';

// Pinned to a known stable PF2e system release
const PF2E_TAG = 'pf2e-7.11.3';
const JSDELIVR = `https://cdn.jsdelivr.net/gh/foundryvtt/pf2e@${PF2E_TAG}`;
// jsDelivr's own package file listing — no GitHub API rate limits
const JSDELIVR_FLAT = `https://data.jsdelivr.com/v1/packages/gh/foundryvtt/pf2e@${PF2E_TAG}/flat`;

const LS_MANIFEST_KEY = 'pf2e_manifest_v3';
const LS_DATA_KEY = 'pf2e_gamedata_v3';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export type LoadProgress = {
  stage: string;
  current: number;
  total: number;
};

type ProgressCallback = (p: LoadProgress) => void;

// Pack directories to load (under packs/pf2e/ in the repo)
const PACK_NAMES = [
  'ancestries',
  'ancestry-features',
  'heritages',
  'backgrounds',
  'classes',
  'class-features',
  'feats',
  'spells',
  'equipment', // includes armor, weapons, and general equipment
] as const;

const RELEVANT_PACK_DIRS = new Set(
  PACK_NAMES.map(p => `packs/pf2e/${p}`)
);

// ——— Manifest (file path index) ———

interface Manifest {
  fetchedAt: number;
  tag: string;
  packs: Record<string, string[]>; // pack short name → array of file paths
}

function getCachedManifest(): Manifest | null {
  try {
    const raw = localStorage.getItem(LS_MANIFEST_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Manifest;
    if (Date.now() - m.fetchedAt > CACHE_TTL) return null;
    if (m.tag !== PF2E_TAG) return null;
    // Verify manifest has actual data
    const totalFiles = Object.values(m.packs).reduce((s, a) => s + a.length, 0);
    if (totalFiles === 0) return null;
    return m;
  } catch { return null; }
}

async function fetchManifest(onProgress?: ProgressCallback): Promise<Manifest> {
  onProgress?.({ stage: 'Downloading file index…', current: 3, total: 100 });

  const res = await fetch(JSDELIVR_FLAT);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch file index (HTTP ${res.status}). ` +
      'Check your internet connection and try again.'
    );
  }

  const data = await res.json() as { files: Array<{ name: string }> };

  if (!data.files || !Array.isArray(data.files)) {
    throw new Error('Unexpected response from jsDelivr file listing API');
  }

  onProgress?.({ stage: 'Indexing pack files…', current: 8, total: 100 });

  const packs: Record<string, string[]> = {};
  for (const packName of PACK_NAMES) {
    packs[packName] = [];
  }

  for (const file of data.files) {
    // jsDelivr names start with '/', e.g. "/packs/pf2e/ancestries/human.json"
    const normalized = file.name.startsWith('/') ? file.name.slice(1) : file.name;

    if (!normalized.endsWith('.json')) continue;

    // Skip metadata files like _folders.json
    const basename = normalized.split('/').pop() ?? '';
    if (basename.startsWith('_')) continue;

    // Match format: packs/pf2e/{pack}/{file}.json (no deeper nesting)
    const parts = normalized.split('/');
    if (parts.length !== 4) continue; // must be exactly packs/pf2e/{pack}/{file}

    const packDir = `${parts[0]}/${parts[1]}/${parts[2]}`; // packs/pf2e/{pack}
    if (!RELEVANT_PACK_DIRS.has(packDir)) continue;

    const packName = parts[2] as string; // e.g. 'ancestries', 'class-features'
    if (!packs[packName]) packs[packName] = [];
    packs[packName].push(normalized);
  }

  const totalFound = Object.values(packs).reduce((s, a) => s + a.length, 0);
  if (totalFound === 0) {
    throw new Error(
      `No pack files found in jsDelivr listing for tag "${PF2E_TAG}". ` +
      'The tag or directory structure may have changed.'
    );
  }

  const manifest: Manifest = { fetchedAt: Date.now(), tag: PF2E_TAG, packs };
  try { localStorage.setItem(LS_MANIFEST_KEY, JSON.stringify(manifest)); } catch { /* quota */ }
  return manifest;
}

// ——— File fetching via jsDelivr CDN ———

async function fetchFile(path: string): Promise<FoundryItem | null> {
  try {
    const res = await fetch(`${JSDELIVR}/${path}`);
    if (!res.ok) return null;
    return await res.json() as FoundryItem;
  } catch {
    return null;
  }
}

async function fetchPack<T extends FoundryItem>(
  paths: string[],
  onProgress?: (n: number, total: number) => void,
  concurrency = 12,
): Promise<T[]> {
  const results: T[] = [];
  let done = 0;

  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const fetched = await Promise.all(batch.map(p => fetchFile(p)));
    for (const item of fetched) {
      if (item) results.push(item as T);
    }
    done += batch.length;
    onProgress?.(done, paths.length);
    if (i + concurrency < paths.length) {
      await new Promise(r => setTimeout(r, 20));
    }
  }

  return results;
}

// ——— Main entry point ———

export async function loadGameData(
  onProgress?: ProgressCallback,
  forceRefresh = false,
): Promise<GameData> {
  // 1. Check localStorage cache
  if (!forceRefresh) {
    const cached = loadFromCache();
    if (cached) {
      onProgress?.({ stage: 'Loaded from cache', current: 100, total: 100 });
      return cached;
    }
  }

  // 2. Try pre-bundled public/data/pf2e-data.json
  if (!forceRefresh) {
    try {
      onProgress?.({ stage: 'Checking for bundled data…', current: 2, total: 100 });
      const res = await fetch('/data/pf2e-data.json');
      if (res.ok) {
        const data = await res.json() as GameData;
        data.loadedAt = Date.now();
        saveToCache(data);
        onProgress?.({ stage: 'Ready!', current: 100, total: 100 });
        return data;
      }
    } catch { /* not available */ }
  }

  // 3. Get file manifest via jsDelivr listing API (no GitHub rate limits)
  let manifest: Manifest;
  if (!forceRefresh) {
    const cached = getCachedManifest();
    manifest = cached ?? await fetchManifest(onProgress);
  } else {
    manifest = await fetchManifest(onProgress);
  }

  // 4. Fetch all packs from jsDelivr CDN
  const packs = manifest.packs;

  type PackEntry = [keyof typeof packs, string[]];
  const packList: PackEntry[] = [
    ['ancestries', packs['ancestries'] ?? []],
    ['heritages', packs['heritages'] ?? []],
    ['ancestry-features', packs['ancestry-features'] ?? []],
    ['backgrounds', packs['backgrounds'] ?? []],
    ['classes', packs['classes'] ?? []],
    ['class-features', packs['class-features'] ?? []],
    ['feats', packs['feats'] ?? []],
    ['spells', packs['spells'] ?? []],
    ['equipment', packs['equipment'] ?? []],
  ];

  const totalFiles = packList.reduce((s, [, paths]) => s + paths.length, 0) || 1;
  let filesLoaded = 0;
  const baseProgress = 10;
  const progressRange = 85;

  const report = (stage: string, n: number) => {
    filesLoaded += n;
    onProgress?.({
      stage,
      current: baseProgress + Math.floor((filesLoaded / totalFiles) * progressRange),
      total: 100,
    });
  };

  // Fetch packs in parallel groups
  const [
    ancestriesRaw, heritagesRaw, ancestryFeaturesRaw, backgroundsRaw,
    classesRaw, classFeaturesRaw, featsRaw,
    spellsRaw, equipmentRaw,
  ] = await Promise.all([
    fetchPack(packList[0][1], n => report('Loading ancestries…', n)),
    fetchPack(packList[1][1], n => report('Loading heritages…', n)),
    fetchPack(packList[2][1], n => report('Loading ancestry features…', n)),
    fetchPack(packList[3][1], n => report('Loading backgrounds…', n)),
    fetchPack(packList[4][1], n => report('Loading classes…', n)),
    fetchPack(packList[5][1], n => report('Loading class features…', n)),
    fetchPack(packList[6][1], n => report('Loading feats…', n)),
    fetchPack(packList[7][1], n => report('Loading spells…', n)),
    fetchPack(packList[8][1], n => report('Loading equipment…', n)),
  ]);

  onProgress?.({ stage: 'Building indexes…', current: 96, total: 100 });

  // Equipment pack contains all item types (armor, weapons, gear, etc.)
  const gameData: GameData = {
    ancestries: ancestriesRaw.filter(i => i.type === 'ancestry') as PF2eAncestry[],
    backgrounds: backgroundsRaw.filter(i => i.type === 'background') as PF2eBackground[],
    classes: classesRaw.filter(i => i.type === 'class') as PF2eClass[],
    classFeatures: [
      ...classFeaturesRaw,
      ...heritagesRaw,
    ].filter(i => i.type === 'feat') as PF2eClassFeature[],
    ancestryFeatures: [
      ...ancestryFeaturesRaw,
      ...heritagesRaw,
    ].filter(i => i.type === 'feat') as PF2eFeat[],
    feats: featsRaw.filter(i => i.type === 'feat') as PF2eFeat[],
    spells: spellsRaw.filter(i => i.type === 'spell') as PF2eSpell[],
    armor: equipmentRaw.filter(i => i.type === 'armor') as PF2eArmor[],
    weapons: equipmentRaw.filter(i => i.type === 'weapon') as PF2eWeapon[],
    equipment: equipmentRaw.filter(
      i => i.type !== 'armor' && i.type !== 'weapon'
    ) as PF2eEquipment[],
    loadedAt: Date.now(),
    version: PF2E_TAG,
  };

  saveToCache(gameData);
  onProgress?.({ stage: 'Ready!', current: 100, total: 100 });
  return gameData;
}

// ——— Cache helpers ———

function saveToCache(data: GameData): void {
  try { localStorage.setItem(LS_DATA_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

export function loadFromCache(): GameData | null {
  try {
    const raw = localStorage.getItem(LS_DATA_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameData;
    if (!data.loadedAt || Date.now() - data.loadedAt > CACHE_TTL) return null;
    if (!data.ancestries?.length || !data.classes?.length) return null;
    return data;
  } catch { return null; }
}

export function clearCache(): void {
  localStorage.removeItem(LS_DATA_KEY);
  localStorage.removeItem(LS_MANIFEST_KEY);
  // Clear legacy keys too
  localStorage.removeItem('pf2e_gamedata_v2');
  localStorage.removeItem('pf2e_manifest_v2');
}

export function getCacheInfo(): { age: number | null; itemCount: number | null } {
  try {
    const raw = localStorage.getItem(LS_DATA_KEY);
    if (!raw) return { age: null, itemCount: null };
    const data = JSON.parse(raw) as GameData;
    const itemCount = (data.feats?.length ?? 0) + (data.spells?.length ?? 0) + (data.classes?.length ?? 0);
    return {
      age: data.loadedAt ? Date.now() - data.loadedAt : null,
      itemCount,
    };
  } catch { return { age: null, itemCount: null }; }
}
