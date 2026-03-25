/**
 * Save / Share utilities
 * - URL encoding using lz-string
 * - JSON export / import
 */

import LZString from 'lz-string';
import type { CharacterState } from '../types/character';
import { EMPTY_CHARACTER } from '../types/character';

const URL_PARAM = 'c';
const CURRENT_VERSION = '1.0.0';

// ——— URL Sharing ———

export function encodeCharacterToURL(character: CharacterState): string {
  const json = JSON.stringify(character);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const url = new URL(window.location.href);
  url.searchParams.set(URL_PARAM, compressed);
  return url.toString();
}

export function decodeCharacterFromURL(): CharacterState | null {
  const url = new URL(window.location.href);
  const compressed = url.searchParams.get(URL_PARAM);
  if (!compressed) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const character = JSON.parse(json) as CharacterState;
    return migrateCharacter(character);
  } catch {
    return null;
  }
}

export function copyURLToClipboard(character: CharacterState): Promise<void> {
  const url = encodeCharacterToURL(character);
  return navigator.clipboard.writeText(url);
}

// ——— JSON Export / Import ———

export function exportCharacterJSON(character: CharacterState): void {
  const json = JSON.stringify(character, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${character.name || 'character'}.pf2e.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importCharacterJSON(file: File): Promise<CharacterState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const character = JSON.parse(json) as CharacterState;
        resolve(migrateCharacter(character));
      } catch (err) {
        reject(new Error('Invalid character file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ——— Migration / Version Handling ———

function migrateCharacter(character: Partial<CharacterState>): CharacterState {
  // Merge with defaults to fill in any missing fields from older versions
  const merged: CharacterState = {
    ...EMPTY_CHARACTER,
    ...character,
    abilityBoosts: {
      ...EMPTY_CHARACTER.abilityBoosts,
      ...character.abilityBoosts,
    },
    variantRules: {
      ...EMPTY_CHARACTER.variantRules,
      ...character.variantRules,
    },
    currency: {
      ...EMPTY_CHARACTER.currency,
      ...character.currency,
    },
    levels: character.levels?.length === 20
      ? character.levels
      : EMPTY_CHARACTER.levels.map((defaultLevel, i) => ({
          ...defaultLevel,
          ...(character.levels?.[i] ?? {}),
        })),
    version: CURRENT_VERSION,
    updatedAt: Date.now(),
  };
  return merged;
}

// ——— Auto-save to localStorage ———

const AUTOSAVE_KEY = 'pf2e_current_character';

export function autosaveCharacter(character: CharacterState): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(character));
  } catch {
    // Storage full, ignore
  }
}

export function loadAutosavedCharacter(): CharacterState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return migrateCharacter(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

// ——— Multiple character slots ———

const SAVED_CHARACTERS_KEY = 'pf2e_saved_characters';

export interface SavedCharacterMeta {
  id: string;
  name: string;
  className: string;
  level: number;
  savedAt: number;
}

export function listSavedCharacters(): SavedCharacterMeta[] {
  try {
    const raw = localStorage.getItem(SAVED_CHARACTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCharacterSlot(character: CharacterState, id?: string): string {
  const charId = id ?? `char_${Date.now()}`;
  const key = `pf2e_char_${charId}`;
  localStorage.setItem(key, JSON.stringify(character));

  const meta: SavedCharacterMeta = {
    id: charId,
    name: character.name || 'Unnamed',
    className: '', // Would look up class name from gameData
    level: character.currentLevel,
    savedAt: Date.now(),
  };

  const list = listSavedCharacters().filter(m => m.id !== charId);
  list.unshift(meta);
  localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(list));
  return charId;
}

export function loadCharacterSlot(id: string): CharacterState | null {
  try {
    const raw = localStorage.getItem(`pf2e_char_${id}`);
    if (!raw) return null;
    return migrateCharacter(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function deleteCharacterSlot(id: string): void {
  localStorage.removeItem(`pf2e_char_${id}`);
  const list = listSavedCharacters().filter(m => m.id !== id);
  localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(list));
}
