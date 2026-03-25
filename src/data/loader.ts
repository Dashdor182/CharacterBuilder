/**
 * Data Loader
 *
 * Fetches PF2e game data from jsDelivr CDN (mirrors Foundry VTT PF2e GitHub).
 * Directory enumeration uses GitHub Contents API; file content uses jsDelivr (no rate limits).
 * Data is cached in localStorage (Tier 1) and sessionStorage (Tier 2/3) with 24hr TTL.
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

const JSDELIVR = 'https://cdn.jsdelivr.net/gh/foundryvtt/pf2e@master';
const GITHUB_CONTENTS = 'https://api.github.com/repos/foundryvtt/pf2e/contents';
const LS_MANIFEST_KEY = 'pf2e_manifest_v2';
const LS_DATA_KEY = 'pf2e_gamedata_v2';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export type LoadProgress = {
  stage: string;
  current: number;
  total: number;
};

type ProgressCallback = (p: LoadProgress) => void;

// ——— File path manifest (cached from GitHub API) ———

interface Manifest {
  fetchedAt: number;
  packs: Record<string, string[]>; // pack name → array of file paths relative to repo root
}

async function getOrFetchManifest(forceRefresh: boolean): Promise<Manifest> {
  if (!forceRefresh) {
    const raw = localStorage.getItem(LS_MANIFEST_KEY);
    if (raw) {
      const m = JSON.parse(raw) as Manifest;
      if (Date.now() - m.fetchedAt < CACHE_TTL) return m;
    }
  }

  const packDirs = [
    'ancestries', 'heritages', 'backgrounds', 'classes',
    'classfeatures', 'ancestryfeatures', 'feats',
    'spells', 'equipment', 'armor', 'weapons',
  ];

  const packs: Record<string, string[]> = {};

  // Fetch all directory listings in parallel (GitHub API, 60 req/hr limit but we batch here)
  await Promise.all(
    packDirs.map(async (dir) => {
      packs[dir] = await fetchDirectoryPaths(`packs/${dir}`);
    })
  );

  const manifest: Manifest = { fetchedAt: Date.now(), packs };
  try { localStorage.setItem(LS_MANIFEST_KEY, JSON.stringify(manifest)); } catch { /* quota */ }
  return manifest;
}

async function fetchDirectoryPaths(path: string): Promise<string[]> {
  try {
    const res = await fetch(`${GITHUB_CONTENTS}/${path}`);
    if (!res.ok) return [];
    const items = await res.json() as Array<{ type: string; path: string; name: string }>;
    if (!Array.isArray(items)) return [];

    const paths: string[] = [];
    for (const item of items) {
      if (item.type === 'file' && item.name.endsWith('.json')) {
        paths.push(item.path);
      } else if (item.type === 'dir') {
        // One level of recursion (e.g. heritages/elf/)
        const sub = await fetchDirectoryPaths(item.path);
        paths.push(...sub);
      }
    }
    return paths;
  } catch {
    return [];
  }
}

// ——— File fetching via jsDelivr CDN ———

async function fetchFile(path: string): Promise<FoundryItem | null> {
  const cacheKey = `pf2e_file:${path}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as FoundryItem;
  } catch { /* quota or unavailable */ }

  try {
    const res = await fetch(`${JSDELIVR}/${path}`);
    if (!res.ok) return null;
    const data = await res.json() as FoundryItem;
    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* quota */ }
    return data;
  } catch {
    return null;
  }
}

async function fetchPack<T extends FoundryItem>(
  paths: string[],
  onProgress?: (n: number, total: number) => void,
  concurrency = 10,
): Promise<T[]> {
  const results: T[] = [];
  let done = 0;
  const total = paths.length;

  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const fetched = await Promise.all(batch.map(p => fetchFile(p)));
    for (const item of fetched) {
      if (item) results.push(item as T);
    }
    done += batch.length;
    onProgress?.(done, total);
    // Small breathing room between batches
    if (i + concurrency < paths.length) {
      await new Promise(r => setTimeout(r, 30));
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
      onProgress?.({ stage: 'Looking for bundled data…', current: 5, total: 100 });
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

  // 3. Fetch from CDN
  onProgress?.({ stage: 'Loading file manifest…', current: 5, total: 100 });
  const manifest = await getOrFetchManifest(forceRefresh);

  const packs = manifest.packs;
  const packList: Array<[string, string[]]> = [
    ['ancestries', packs.ancestries ?? []],
    ['heritages', packs.heritages ?? []],
    ['backgrounds', packs.backgrounds ?? []],
    ['classes', packs.classes ?? []],
    ['classfeatures', packs.classfeatures ?? []],
    ['ancestryfeatures', packs.ancestryfeatures ?? []],
    ['feats', packs.feats ?? []],
    ['spells', packs.spells ?? []],
    ['equipment', packs.equipment ?? []],
    ['armor', packs.armor ?? []],
    ['weapons', packs.weapons ?? []],
  ];

  const totalFiles = packList.reduce((s, [, paths]) => s + paths.length, 0) || 1;
  let filesLoaded = 0;
  const baseProgress = 10;
  const progressRange = 85;

  const report = (stage: string, loaded: number, _packTotal: number) => {
    filesLoaded += loaded;
    onProgress?.({
      stage,
      current: baseProgress + Math.floor((filesLoaded / totalFiles) * progressRange),
      total: 100,
    });
  };

  const fetchedPacks = await Promise.all(
    packList.map(([name, paths]) =>
      fetchPack(paths, (n) => report(`Loading ${name}…`, n, paths.length))
    )
  );

  const [
    ancestriesRaw, heritagesRaw, backgroundsRaw, classesRaw,
    classFeaturesRaw, ancestryFeaturesRaw, featsRaw,
    spellsRaw, equipmentRaw, armorRaw, weaponsRaw,
  ] = fetchedPacks;

  onProgress?.({ stage: 'Building indexes…', current: 96, total: 100 });

  const gameData: GameData = {
    ancestries: ancestriesRaw.filter(i => i.type === 'ancestry') as PF2eAncestry[],
    backgrounds: backgroundsRaw.filter(i => i.type === 'background') as PF2eBackground[],
    classes: classesRaw.filter(i => i.type === 'class') as PF2eClass[],
    classFeatures: [
      ...classFeaturesRaw,
      ...ancestryFeaturesRaw,
      ...heritagesRaw,
    ].filter(i => i.type === 'feat') as PF2eClassFeature[],
    ancestryFeatures: [
      ...ancestryFeaturesRaw,
      ...heritagesRaw,
    ].filter(i => i.type === 'feat') as PF2eFeat[],
    feats: featsRaw.filter(i => i.type === 'feat') as PF2eFeat[],
    spells: spellsRaw.filter(i => i.type === 'spell') as PF2eSpell[],
    armor: armorRaw.filter(i => i.type === 'armor') as PF2eArmor[],
    weapons: weaponsRaw.filter(i => i.type === 'weapon') as PF2eWeapon[],
    equipment: equipmentRaw.filter(i => i.type === 'equipment') as PF2eEquipment[],
    loadedAt: Date.now(),
    version: new Date().toISOString().split('T')[0],
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
  // Also clear session storage file cache
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith('pf2e_file:')) keys.push(k);
  }
  keys.forEach(k => sessionStorage.removeItem(k));
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
