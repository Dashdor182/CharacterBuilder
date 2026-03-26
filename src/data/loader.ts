/**
 * Data Loader
 *
 * Fetches PF2e game data from GitHub (Foundry VTT PF2e repository).
 *
 * Path discovery strategy:
 *   1. GET /contents/packs/pf2e?ref={tag}  → 1 API call, returns tree SHAs for subdirectories
 *   2. GET /git/trees/{sha} for each pack   → 9 API calls, returns all files (no pagination limit)
 *   Total: 10 GitHub API calls, cached 24 hours in localStorage → 0 calls on subsequent loads
 *
 * File content: fetched from raw.githubusercontent.com (separate CDN rate limit)
 * Data: cached in localStorage with 24hr TTL
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

const PF2E_TAG = 'pf2e-7.11.3';
const GITHUB_API = 'https://api.github.com/repos/foundryvtt/pf2e';
const RAW_CDN = `https://raw.githubusercontent.com/foundryvtt/pf2e/${PF2E_TAG}`;

const LS_MANIFEST_KEY = 'pf2e_manifest_v4';
const LS_DATA_KEY = 'pf2e_gamedata_v4';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export type LoadProgress = {
  stage: string;
  current: number;
  total: number;
};

type ProgressCallback = (p: LoadProgress) => void;

// The pack directory names under packs/pf2e/ that we care about
const WANTED_PACKS = new Set([
  'ancestries',
  'ancestry-features',
  'heritages',
  'backgrounds',
  'classes',
  'class-features',
  'feats',
  'spells',
  'equipment',
]);

// ——— Manifest ———

interface Manifest {
  fetchedAt: number;
  tag: string;
  // pack short name → array of full repo-relative paths (e.g. "packs/pf2e/feats/fighter.json")
  packs: Record<string, string[]>;
}

function getCachedManifest(): Manifest | null {
  try {
    const raw = localStorage.getItem(LS_MANIFEST_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Manifest;
    if (Date.now() - m.fetchedAt > CACHE_TTL) return null;
    if (m.tag !== PF2E_TAG) return null;
    const total = Object.values(m.packs).reduce((s, a) => s + a.length, 0);
    if (total === 0) return null;
    return m;
  } catch { return null; }
}

async function githubGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github.v3+json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get('X-RateLimit-Reset');
      const resetTime = reset
        ? ` Rate limit resets at ${new Date(Number(reset) * 1000).toLocaleTimeString()}.`
        : '';
      throw new Error(
        `GitHub API rate limit exceeded.${resetTime} ` +
        'Please wait an hour and try again, or run "npm run fetch-data" locally to pre-bundle game data.'
      );
    }
    throw new Error(`GitHub API error ${res.status}: ${body.slice(0, 100)}`);
  }
  return res.json() as Promise<T>;
}

async function buildManifest(onProgress: ProgressCallback): Promise<Manifest> {
  onProgress({ stage: 'Fetching pack directory listing…', current: 3, total: 100 });

  // Step 1: list packs/pf2e/ to get tree SHA for each subdirectory (1 API call)
  type ContentItem = { type: string; name: string; sha: string; path: string };
  const packsDirItems = await githubGet<ContentItem[]>(
    `${GITHUB_API}/contents/packs/pf2e?ref=${PF2E_TAG}`
  );

  // Filter to only the packs we care about
  const relevantDirs = packsDirItems.filter(
    item => item.type === 'dir' && WANTED_PACKS.has(item.name)
  );

  if (relevantDirs.length === 0) {
    throw new Error(
      `No expected pack directories found in packs/pf2e/ for tag "${PF2E_TAG}". ` +
      'The repository structure may have changed.'
    );
  }

  const packs: Record<string, string[]> = {};
  const total = relevantDirs.length;
  let done = 0;

  // Step 2: for each pack dir, fetch its git tree (no pagination limits) — 9 API calls
  await Promise.all(
    relevantDirs.map(async dir => {
      type TreeItem = { type: string; path: string };
      type TreeResponse = { tree: TreeItem[]; truncated?: boolean };

      const treeRes = await githubGet<TreeResponse>(
        `${GITHUB_API}/git/trees/${dir.sha}`
      );

      const files = treeRes.tree
        .filter(item => item.type === 'blob' && item.path.endsWith('.json') && !item.path.startsWith('_'))
        .map(item => `packs/pf2e/${dir.name}/${item.path}`);

      packs[dir.name] = files;
      done++;
      onProgress({
        stage: `Indexing ${dir.name}… (${done}/${total})`,
        current: 3 + Math.floor((done / total) * 7),
        total: 100,
      });
    })
  );

  const totalFiles = Object.values(packs).reduce((s, a) => s + a.length, 0);
  if (totalFiles === 0) {
    throw new Error('No game data files found. The repository structure may have changed.');
  }

  const manifest: Manifest = { fetchedAt: Date.now(), tag: PF2E_TAG, packs };
  try { localStorage.setItem(LS_MANIFEST_KEY, JSON.stringify(manifest)); } catch { /* quota */ }
  return manifest;
}

// ——— File fetching via raw.githubusercontent.com ———

async function fetchFile(path: string): Promise<FoundryItem | null> {
  try {
    const res = await fetch(`${RAW_CDN}/${path}`);
    if (!res.ok) return null;
    return await res.json() as FoundryItem;
  } catch {
    return null;
  }
}

async function fetchPack<T extends FoundryItem>(
  paths: string[],
  onProgress?: (n: number) => void,
  concurrency = 15,
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
    onProgress?.(done);
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
  const report = (stage: string, current: number) =>
    onProgress?.({ stage, current, total: 100 });

  // 1. Check localStorage cache
  if (!forceRefresh) {
    const cached = loadFromCache();
    if (cached) {
      report('Loaded from cache', 100);
      return cached;
    }
  }

  // 2. Try pre-bundled public/data/pf2e-data.json
  if (!forceRefresh) {
    try {
      report('Checking for bundled data…', 2);
      const res = await fetch('/data/pf2e-data.json');
      if (res.ok) {
        const data = await res.json() as GameData;
        data.loadedAt = Date.now();
        saveToCache(data);
        report('Ready!', 100);
        return data;
      }
    } catch { /* not available */ }
  }

  // 3. Build manifest from GitHub API (10 total API calls, cached 24h)
  const manifest = forceRefresh || !getCachedManifest()
    ? await buildManifest(onProgress ?? (() => { }))
    : getCachedManifest()!;

  const p = manifest.packs;

  // 4. Fetch all pack files from raw.githubusercontent.com
  const totalFiles = Object.values(p).reduce((s, a) => s + a.length, 0) || 1;
  let loaded = 0;
  const BASE = 12;
  const RANGE = 83;

  const tick = (packName: string, n: number) => {
    loaded += n;
    report(`Loading ${packName}…`, BASE + Math.floor((loaded / totalFiles) * RANGE));
  };

  const [
    ancestriesRaw, heritagesRaw, ancestryFeaturesRaw, backgroundsRaw,
    classesRaw, classFeaturesRaw, featsRaw, spellsRaw, equipmentRaw,
  ] = await Promise.all([
    fetchPack(p['ancestries'] ?? [],        n => tick('ancestries', n)),
    fetchPack(p['heritages'] ?? [],         n => tick('heritages', n)),
    fetchPack(p['ancestry-features'] ?? [], n => tick('ancestry features', n)),
    fetchPack(p['backgrounds'] ?? [],       n => tick('backgrounds', n)),
    fetchPack(p['classes'] ?? [],           n => tick('classes', n)),
    fetchPack(p['class-features'] ?? [],    n => tick('class features', n)),
    fetchPack(p['feats'] ?? [],             n => tick('feats', n)),
    fetchPack(p['spells'] ?? [],            n => tick('spells', n)),
    fetchPack(p['equipment'] ?? [],         n => tick('equipment', n)),
  ]);

  report('Building indexes…', 96);

  const gameData: GameData = {
    ancestries:      ancestriesRaw.filter(i => i.type === 'ancestry') as PF2eAncestry[],
    backgrounds:     backgroundsRaw.filter(i => i.type === 'background') as PF2eBackground[],
    classes:         classesRaw.filter(i => i.type === 'class') as PF2eClass[],
    classFeatures:   [...classFeaturesRaw, ...heritagesRaw].filter(i => i.type === 'feat') as PF2eClassFeature[],
    ancestryFeatures:[...ancestryFeaturesRaw, ...heritagesRaw].filter(i => i.type === 'feat') as PF2eFeat[],
    feats:           featsRaw.filter(i => i.type === 'feat') as PF2eFeat[],
    spells:          spellsRaw.filter(i => i.type === 'spell') as PF2eSpell[],
    armor:           equipmentRaw.filter(i => i.type === 'armor') as PF2eArmor[],
    weapons:         equipmentRaw.filter(i => i.type === 'weapon') as PF2eWeapon[],
    equipment:       equipmentRaw.filter(i => i.type !== 'armor' && i.type !== 'weapon') as PF2eEquipment[],
    loadedAt:        Date.now(),
    version:         PF2E_TAG,
  };

  saveToCache(gameData);
  report('Ready!', 100);
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
  // Clear legacy cache keys
  for (const key of ['pf2e_gamedata_v2', 'pf2e_gamedata_v3', 'pf2e_manifest_v2', 'pf2e_manifest_v3']) {
    localStorage.removeItem(key);
  }
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
