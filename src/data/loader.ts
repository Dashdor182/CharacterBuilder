/**
 * Data Loader
 *
 * Cache strategy (fastest to slowest):
 *   1. Pre-bundled /data/pf2e-data.json  — instant, no network (run `npm run fetch-data`)
 *   2. IndexedDB assembled cache         — ~10ms, return visits after first load
 *   3. IndexedDB per-pack cache          — fetches only packs not yet stored
 *   4. GitHub API + raw.githubusercontent — first load only
 *
 * Data is pinned to PF2E_TAG (a release tag) so it never changes.
 * No TTL — the cache is valid forever as long as the tag matches.
 * Changing PF2E_TAG in code automatically invalidates all cached data.
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

export type LoadProgress = {
  stage: string;
  current: number;
  total: number;
};

type ProgressCallback = (p: LoadProgress) => void;

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

// ——— IndexedDB helpers ———

const IDB_NAME = 'pf2e-builder';
const IDB_VER  = 1;
const PACK_STORE = 'packs';   // key: `{tag}:{packName}` → FoundryItem[]
const META_STORE = 'meta';    // key: `manifest:{tag}`   → Manifest
                              //      `assembled:{tag}`  → GameData

let _db: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!_db) {
    _db = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VER);
      req.onupgradeneeded = e => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(PACK_STORE)) db.createObjectStore(PACK_STORE);
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      };
      req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
      req.onerror  = () => { _db = null; reject(req.error); };
    });
  }
  return _db;
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch { return null; }
}

async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readwrite').objectStore(store).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch { /* ignore write failures */ }
}

// ——— Manifest ———

interface Manifest {
  tag: string;
  packs: Record<string, string[]>;
}

async function getCachedManifest(): Promise<Manifest | null> {
  const m = await idbGet<Manifest>(META_STORE, `manifest:${PF2E_TAG}`);
  if (!m || m.tag !== PF2E_TAG) return null;
  const total = Object.values(m.packs).reduce((s, a) => s + a.length, 0);
  return total > 0 ? m : null;
}

async function githubGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get('X-RateLimit-Reset');
      const resetTime = reset
        ? ` Rate limit resets at ${new Date(Number(reset) * 1000).toLocaleTimeString()}.`
        : '';
      throw new Error(
        `GitHub API rate limit exceeded.${resetTime} ` +
        'Please wait and try again, or run "npm run fetch-data" to pre-bundle game data.'
      );
    }
    throw new Error(`GitHub API error ${res.status}: ${body.slice(0, 100)}`);
  }
  return res.json() as Promise<T>;
}

async function buildManifest(onProgress: ProgressCallback): Promise<Manifest> {
  onProgress({ stage: 'Fetching pack directory listing…', current: 3, total: 100 });

  type ContentItem = { type: string; name: string; sha: string };
  const packsDirItems = await githubGet<ContentItem[]>(
    `${GITHUB_API}/contents/packs/pf2e?ref=${PF2E_TAG}`
  );

  const relevantDirs = packsDirItems.filter(
    item => item.type === 'dir' && WANTED_PACKS.has(item.name)
  );

  if (relevantDirs.length === 0) {
    throw new Error(`No pack directories found for tag "${PF2E_TAG}". Repository structure may have changed.`);
  }

  const packs: Record<string, string[]> = {};
  let done = 0;

  await Promise.all(relevantDirs.map(async dir => {
    type TreeItem = { type: string; path: string };
    type TreeResponse = { tree: TreeItem[] };
    const treeRes = await githubGet<TreeResponse>(`${GITHUB_API}/git/trees/${dir.sha}`);
    packs[dir.name] = treeRes.tree
      .filter(i => i.type === 'blob' && i.path.endsWith('.json') && !i.path.startsWith('_'))
      .map(i => `packs/pf2e/${dir.name}/${i.path}`);
    done++;
    onProgress({ stage: `Indexing ${dir.name}… (${done}/${relevantDirs.length})`, current: 5 + Math.floor((done / relevantDirs.length) * 23), total: 100 });
  }));

  const totalFiles = Object.values(packs).reduce((s, a) => s + a.length, 0);
  if (totalFiles === 0) throw new Error('No game data files found.');

  const manifest: Manifest = { tag: PF2E_TAG, packs };
  await idbSet(META_STORE, `manifest:${PF2E_TAG}`, manifest);
  return manifest;
}

// ——— File fetching ———

async function fetchFile(path: string): Promise<FoundryItem | null> {
  try {
    const res = await fetch(`${RAW_CDN}/${path}`);
    if (!res.ok) return null;
    return await res.json() as FoundryItem;
  } catch { return null; }
}

/**
 * Fetches a pack from IDB cache, falling back to raw.githubusercontent.com.
 * Cached packs are stored indefinitely (tag-versioned key, no TTL).
 */
async function fetchPackCached<T extends FoundryItem>(
  packName: string,
  paths: string[],
  onProgress: (delta: number) => void,
  concurrency = 20,
): Promise<T[]> {
  const cacheKey = `${PF2E_TAG}:${packName}`;

  // Return from IDB if already cached for this tag
  const cached = await idbGet<T[]>(PACK_STORE, cacheKey);
  if (cached && cached.length > 0) {
    onProgress(paths.length); // advance progress bar as if fetched
    return cached;
  }

  // Fetch from CDN in parallel batches
  const results: T[] = [];
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const fetched = await Promise.all(batch.map(p => fetchFile(p)));
    for (const item of fetched) {
      if (item) results.push(item as T);
    }
    onProgress(batch.length);
    if (i + concurrency < paths.length) {
      await new Promise(r => setTimeout(r, 10));
    }
  }

  // Persist to IDB (fire-and-forget — don't block the return)
  if (results.length > 0) {
    idbSet(PACK_STORE, cacheKey, results).catch(() => {});
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

  // 1. Pre-bundled static JSON (run `npm run fetch-data` to generate)
  if (!forceRefresh) {
    try {
      report('Checking for bundled data…', 2);
      const res = await fetch('/data/pf2e-data.json');
      if (res.ok) {
        const data = await res.json() as GameData;
        data.loadedAt = Date.now();
        report('Ready!', 100);
        // Warm IDB from the bundle so subsequent loads are instant even without the file
        idbSet(META_STORE, `assembled:${PF2E_TAG}`, data).catch(() => {});
        return data;
      }
    } catch { /* not available */ }
  }

  // 2. Assembled GameData in IDB — instant on return visits
  if (!forceRefresh) {
    report('Checking cache…', 3);
    const assembled = await idbGet<GameData>(META_STORE, `assembled:${PF2E_TAG}`);
    if (assembled && assembled.feats?.length && assembled.ancestries?.length && assembled.classes?.length) {
      assembled.loadedAt = Date.now();
      report('Loaded from cache', 100);
      return assembled;
    }
  }

  // 3. Build (or load cached) manifest
  const manifest = !forceRefresh
    ? (await getCachedManifest() ?? await buildManifest(onProgress ?? (() => {})))
    : await buildManifest(onProgress ?? (() => {}));

  const p = manifest.packs;
  const totalFiles = Object.values(p).reduce((s, a) => s + a.length, 0) || 1;
  let loaded = 0;

  const BASE = 30, RANGE = 65;
  const tick = (packName: string, n: number) => {
    loaded += n;
    report(`Loading ${packName}…`, BASE + Math.floor((loaded / totalFiles) * RANGE));
  };

  // 4. Fetch all packs (IDB-cached packs return instantly, others fetched from CDN)
  const [
    ancestriesRaw, heritagesRaw, ancestryFeaturesRaw, backgroundsRaw,
    classesRaw, classFeaturesRaw, featsRaw, spellsRaw, equipmentRaw,
  ] = await Promise.all([
    fetchPackCached('ancestries',        p['ancestries']        ?? [], n => tick('ancestries', n)),
    fetchPackCached('heritages',         p['heritages']         ?? [], n => tick('heritages', n)),
    fetchPackCached('ancestry-features', p['ancestry-features'] ?? [], n => tick('ancestry features', n)),
    fetchPackCached('backgrounds',       p['backgrounds']       ?? [], n => tick('backgrounds', n)),
    fetchPackCached('classes',           p['classes']           ?? [], n => tick('classes', n)),
    fetchPackCached('class-features',    p['class-features']    ?? [], n => tick('class features', n)),
    fetchPackCached('feats',             p['feats']             ?? [], n => tick('feats', n)),
    fetchPackCached('spells',            p['spells']            ?? [], n => tick('spells', n)),
    fetchPackCached('equipment',         p['equipment']         ?? [], n => tick('equipment', n)),
  ]);

  report('Building indexes…', 96);

  const gameData: GameData = {
    ancestries:       ancestriesRaw.filter(i => i.type === 'ancestry') as PF2eAncestry[],
    backgrounds:      backgroundsRaw.filter(i => i.type === 'background') as PF2eBackground[],
    classes:          classesRaw.filter(i => i.type === 'class') as PF2eClass[],
    classFeatures:    [...classFeaturesRaw, ...heritagesRaw].filter(i => i.type === 'feat') as PF2eClassFeature[],
    ancestryFeatures: [...ancestryFeaturesRaw, ...heritagesRaw].filter(i => i.type === 'feat') as PF2eFeat[],
    feats:            featsRaw.filter(i => i.type === 'feat') as PF2eFeat[],
    spells:           spellsRaw.filter(i => i.type === 'spell') as PF2eSpell[],
    armor:            equipmentRaw.filter(i => i.type === 'armor') as PF2eArmor[],
    weapons:          equipmentRaw.filter(i => i.type === 'weapon') as PF2eWeapon[],
    equipment:        equipmentRaw.filter(i => i.type !== 'armor' && i.type !== 'weapon') as PF2eEquipment[],
    loadedAt:         Date.now(),
    version:          PF2E_TAG,
  };

  // Persist the assembled result so next visit is instant
  idbSet(META_STORE, `assembled:${PF2E_TAG}`, gameData).catch(() => {});

  report('Ready!', 100);
  return gameData;
}

// ——— Cache management ———

export async function clearCache(): Promise<void> {
  // Delete the entire IDB database
  _db = null;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(IDB_NAME);
    req.onsuccess = () => resolve();
    req.onerror   = () => resolve(); // resolve anyway
    req.onblocked = () => resolve();
  });
  // Clear any legacy localStorage keys
  for (const key of [
    'pf2e_gamedata_v2', 'pf2e_gamedata_v3', 'pf2e_gamedata_v4',
    'pf2e_manifest_v2', 'pf2e_manifest_v3', 'pf2e_manifest_v4',
  ]) {
    localStorage.removeItem(key);
  }
}

export async function getCacheInfo(): Promise<{ hasAssembled: boolean; packsStored: string[] }> {
  try {
    const assembled = await idbGet<GameData>(META_STORE, `assembled:${PF2E_TAG}`);
    const hasAssembled = !!(assembled?.feats?.length);

    const db = await openDB();
    const keys = await new Promise<string[]>((resolve, reject) => {
      const req = db.transaction(PACK_STORE, 'readonly').objectStore(PACK_STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror   = () => reject(req.error);
    });
    const packsStored = keys
      .filter(k => k.startsWith(`${PF2E_TAG}:`))
      .map(k => k.slice(PF2E_TAG.length + 1));

    return { hasAssembled, packsStored };
  } catch {
    return { hasAssembled: false, packsStored: [] };
  }
}

// Synchronous version kept for legacy callers — always returns null now (use loadGameData)
export function loadFromCache(): GameData | null { return null; }
