import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { CharacterState, LevelData, FeatSlot, SkillName, LoreSkill, EquipmentEntry, SpellcastingEntry } from '../types/character';
import type { Ability, ProficiencyRank } from '../types/pf2e';
import { EMPTY_CHARACTER } from '../types/character';
import { autosaveCharacter, decodeCharacterFromURL, loadAutosavedCharacter } from '../utils/sharing';

interface CharacterStore {
  character: CharacterState;
  view: 'builder' | 'sheet' | 'progression';
  dirtyFields: Set<string>;

  // Loading
  initCharacter: () => void;
  resetCharacter: () => void;
  loadCharacter: (character: CharacterState) => void;

  // View
  setView: (view: 'builder' | 'sheet' | 'progression') => void;

  // Identity
  updateIdentity: (fields: Partial<Pick<CharacterState,
    'name' | 'playerName' | 'campaign' | 'deity' | 'alignment' |
    'ethnicity' | 'nationality' | 'age' | 'gender' | 'height' |
    'weight' | 'appearance' | 'backstory'
  >>) => void;

  // Core choices
  setAncestry: (id: string | null, fixedBoosts?: Partial<Record<Ability, boolean>>, fixedFlaws?: Partial<Record<Ability, boolean>>) => void;
  selectAncestryFreeBoost: (ability: Ability | null) => void;
  selectAncestryFreeFlaw: (ability: Ability | null) => void;
  setHeritage: (id: string | null) => void;
  setBackground: (id: string | null) => void;
  setBackgroundBoostGroup: (groupIndex: number, ability: Ability | null) => void;
  setClass: (id: string | null, clearDependents?: boolean) => void;
  setKeyAbility: (ability: Ability | null) => void;

  // Ability scores
  toggleAbilityBoost: (source: keyof CharacterState['abilityBoosts'], ability: Ability) => void;
  setManualAbilityScore: (ability: Ability, score: number) => void;

  // Level
  setCurrentLevel: (level: number) => void;

  // Skills
  setSkillProficiency: (skill: SkillName, rank: ProficiencyRank) => void;
  addLoreSkill: (lore: LoreSkill) => void;
  removeLoreSkill: (name: string) => void;
  setBackgroundSkill: (skill: SkillName | null, slot?: 1 | 2) => void;

  // Feats
  setFeat: (levelIndex: number, slotId: string, featId: string | null) => void;
  addFeatSlot: (levelIndex: number, slot: FeatSlot) => void;
  initializeFeatSlots: (slots: LevelData[]) => void;

  // Spells
  addSpellcastingEntry: (entry: SpellcastingEntry) => void;
  updateSpellcastingEntry: (index: number, entry: Partial<SpellcastingEntry>) => void;
  removeSpellcastingEntry: (index: number) => void;
  addSpellToEntry: (entryIndex: number, spellId: string) => void;
  removeSpellFromEntry: (entryIndex: number, spellId: string) => void;

  // Equipment
  addEquipment: (entry: EquipmentEntry) => void;
  updateEquipment: (id: string, update: Partial<EquipmentEntry>) => void;
  removeEquipment: (id: string) => void;
  setCurrency: (currency: Partial<CharacterState['currency']>) => void;

  // Variant rules
  setVariantRule: (rule: keyof CharacterState['variantRules'], value: boolean | string) => void;

  // Internal
  _markDirty: (field: string) => void;
}

function initLevels(): LevelData[] {
  return Array.from({ length: 20 }, (_, i) => ({
    level: i + 1,
    abilityBoosts: {},
    skillIncreases: {},
    feats: [],
    spellsLearned: [],
    classFeatures: [],
  }));
}

export const useCharacterStore = create<CharacterStore>()(
  subscribeWithSelector((set, _get) => ({
    character: { ...EMPTY_CHARACTER, levels: initLevels() },
    view: 'builder',
    dirtyFields: new Set(),

    initCharacter: () => {
      // Try URL first, then autosave
      const fromURL = decodeCharacterFromURL();
      if (fromURL) {
        set({ character: fromURL });
        return;
      }
      const autosaved = loadAutosavedCharacter();
      if (autosaved) {
        set({ character: autosaved });
      }
    },

    resetCharacter: () => {
      set({ character: { ...EMPTY_CHARACTER, levels: initLevels(), createdAt: Date.now(), updatedAt: Date.now() } });
    },

    loadCharacter: (character) => {
      set({ character: { ...character, updatedAt: Date.now() } });
    },

    setView: (view) => set({ view }),

    updateIdentity: (fields) => {
      set(state => ({
        character: { ...state.character, ...fields, updatedAt: Date.now() },
      }));
    },

    setAncestry: (id, fixedBoosts = {}, fixedFlaws = {}) => {
      set(state => ({
        character: {
          ...state.character,
          ancestryId: id,
          heritageId: null,
          abilityBoosts: {
            ...state.character.abilityBoosts,
            ancestryFixed: id ? fixedBoosts : {},
            ancestryFlawFixed: id ? fixedFlaws : {},
            ancestry: {},       // reset free boost selection
            ancestryFlaw: {},   // reset free flaw selection
          },
          updatedAt: Date.now(),
        },
      }));
    },

    selectAncestryFreeBoost: (ability) => {
      set(state => ({
        character: {
          ...state.character,
          abilityBoosts: {
            ...state.character.abilityBoosts,
            ancestry: ability ? { [ability]: true } : {},
          },
          updatedAt: Date.now(),
        },
      }));
    },

    selectAncestryFreeFlaw: (ability) => {
      set(state => ({
        character: {
          ...state.character,
          abilityBoosts: {
            ...state.character.abilityBoosts,
            ancestryFlaw: ability ? { [ability]: true } : {},
          },
          updatedAt: Date.now(),
        },
      }));
    },

    setHeritage: (id) => {
      set(state => ({
        character: { ...state.character, heritageId: id, updatedAt: Date.now() },
      }));
    },

    setBackground: (id) => {
      set(state => ({
        character: {
          ...state.character,
          backgroundId: id,
          backgroundBoostGroups: [],
          abilityBoosts: {
            ...state.character.abilityBoosts,
            background: {},
          },
          backgroundSkill: null,
          backgroundSkill2: null,
          updatedAt: Date.now(),
        },
      }));
    },

    setBackgroundBoostGroup: (groupIndex, ability) => {
      set(state => {
        const groups = [...(state.character.backgroundBoostGroups ?? [])];
        groups[groupIndex] = ability;
        // Rebuild background boosts from all group selections
        const background: Partial<Record<Ability, boolean>> = {};
        for (const ab of groups) {
          if (ab) background[ab] = true;
        }
        return {
          character: {
            ...state.character,
            backgroundBoostGroups: groups,
            abilityBoosts: {
              ...state.character.abilityBoosts,
              background,
            },
            updatedAt: Date.now(),
          },
        };
      });
    },

    setClass: (id, clearDependents = true) => {
      set(state => {
        const updates: Partial<CharacterState> = {
          classId: id,
          updatedAt: Date.now(),
        };
        if (clearDependents) {
          updates.abilityBoosts = {
            ...state.character.abilityBoosts,
            class: {},
          };
          updates.keyAbility = null;
          // Reset class feats
          updates.levels = state.character.levels.map(l => ({
            ...l,
            feats: l.feats.filter(f => f.type !== 'class'),
            classFeatures: [],
          }));
          updates.spellcasting = [];
        }
        return { character: { ...state.character, ...updates } };
      });
    },

    setKeyAbility: (ability) => {
      set(state => ({
        character: {
          ...state.character,
          keyAbility: ability,
          abilityBoosts: {
            ...state.character.abilityBoosts,
            class: ability ? { [ability]: true } : {},
          },
          updatedAt: Date.now(),
        },
      }));
    },

    toggleAbilityBoost: (source, ability) => {
      set(state => {
        const current = state.character.abilityBoosts[source];
        return {
          character: {
            ...state.character,
            abilityBoosts: {
              ...state.character.abilityBoosts,
              [source]: {
                ...current,
                [ability]: !current[ability],
              },
            },
            updatedAt: Date.now(),
          },
        };
      });
    },

    setManualAbilityScore: (ability, score) => {
      set(state => ({
        character: {
          ...state.character,
          manualAbilityScores: {
            ...state.character.manualAbilityScores,
            [ability]: score,
          },
          updatedAt: Date.now(),
        },
      }));
    },

    setCurrentLevel: (level) => {
      set(state => ({
        character: { ...state.character, currentLevel: level, updatedAt: Date.now() },
      }));
    },

    setSkillProficiency: (skill, rank) => {
      set(state => ({
        character: {
          ...state.character,
          skillProficiencies: {
            ...state.character.skillProficiencies,
            [skill]: rank,
          },
          updatedAt: Date.now(),
        },
      }));
    },

    addLoreSkill: (lore) => {
      set(state => ({
        character: {
          ...state.character,
          loreSkills: [...state.character.loreSkills.filter(l => l.name !== lore.name), lore],
          updatedAt: Date.now(),
        },
      }));
    },

    removeLoreSkill: (name) => {
      set(state => ({
        character: {
          ...state.character,
          loreSkills: state.character.loreSkills.filter(l => l.name !== name),
          updatedAt: Date.now(),
        },
      }));
    },

    setBackgroundSkill: (skill, slot = 1) => {
      set(state => ({
        character: {
          ...state.character,
          [slot === 1 ? 'backgroundSkill' : 'backgroundSkill2']: skill,
          updatedAt: Date.now(),
        },
      }));
    },

    setFeat: (levelIndex, slotId, featId) => {
      set(state => {
        const levels = state.character.levels.map((l, i) => {
          if (i !== levelIndex) return l;
          return {
            ...l,
            feats: l.feats.map(slot =>
              slot.id === slotId ? { ...slot, selectedFeatId: featId } : slot
            ),
          };
        });
        return { character: { ...state.character, levels, updatedAt: Date.now() } };
      });
    },

    addFeatSlot: (levelIndex, slot) => {
      set(state => {
        const levels = state.character.levels.map((l, i) => {
          if (i !== levelIndex) return l;
          // Avoid duplicates
          if (l.feats.some(f => f.id === slot.id)) return l;
          return { ...l, feats: [...l.feats, slot] };
        });
        return { character: { ...state.character, levels, updatedAt: Date.now() } };
      });
    },

    initializeFeatSlots: (newLevels) => {
      set(state => ({
        character: { ...state.character, levels: newLevels, updatedAt: Date.now() },
      }));
    },

    addSpellcastingEntry: (entry) => {
      set(state => ({
        character: {
          ...state.character,
          spellcasting: [...state.character.spellcasting, entry],
          updatedAt: Date.now(),
        },
      }));
    },

    updateSpellcastingEntry: (index, update) => {
      set(state => ({
        character: {
          ...state.character,
          spellcasting: state.character.spellcasting.map((e, i) =>
            i === index ? { ...e, ...update } : e
          ),
          updatedAt: Date.now(),
        },
      }));
    },

    removeSpellcastingEntry: (index) => {
      set(state => ({
        character: {
          ...state.character,
          spellcasting: state.character.spellcasting.filter((_, i) => i !== index),
          updatedAt: Date.now(),
        },
      }));
    },

    addSpellToEntry: (entryIndex, spellId) => {
      set(state => ({
        character: {
          ...state.character,
          spellcasting: state.character.spellcasting.map((e, i) => {
            if (i !== entryIndex) return e;
            if (e.knownSpells.includes(spellId)) return e;
            return { ...e, knownSpells: [...e.knownSpells, spellId] };
          }),
          updatedAt: Date.now(),
        },
      }));
    },

    removeSpellFromEntry: (entryIndex, spellId) => {
      set(state => ({
        character: {
          ...state.character,
          spellcasting: state.character.spellcasting.map((e, i) =>
            i === entryIndex
              ? { ...e, knownSpells: e.knownSpells.filter(id => id !== spellId) }
              : e
          ),
          updatedAt: Date.now(),
        },
      }));
    },

    addEquipment: (entry) => {
      set(state => ({
        character: {
          ...state.character,
          equipment: [...state.character.equipment, entry],
          updatedAt: Date.now(),
        },
      }));
    },

    updateEquipment: (id, update) => {
      set(state => ({
        character: {
          ...state.character,
          equipment: state.character.equipment.map(e =>
            e.id === id ? { ...e, ...update } : e
          ),
          updatedAt: Date.now(),
        },
      }));
    },

    removeEquipment: (id) => {
      set(state => ({
        character: {
          ...state.character,
          equipment: state.character.equipment.filter(e => e.id !== id),
          updatedAt: Date.now(),
        },
      }));
    },

    setCurrency: (currency) => {
      set(state => ({
        character: {
          ...state.character,
          currency: { ...state.character.currency, ...currency },
          updatedAt: Date.now(),
        },
      }));
    },

    setVariantRule: (rule, value) => {
      set(state => ({
        character: {
          ...state.character,
          variantRules: {
            ...state.character.variantRules,
            [rule]: value,
          },
          updatedAt: Date.now(),
        },
      }));
    },

    _markDirty: (field) => {
      set(state => {
        const dirty = new Set(state.dirtyFields);
        dirty.add(field);
        return { dirtyFields: dirty };
      });
    },
  }))
);

// Auto-save whenever character changes
useCharacterStore.subscribe(
  state => state.character,
  (character) => {
    autosaveCharacter(character);
  },
  { equalityFn: (a, b) => a.updatedAt === b.updatedAt }
);
