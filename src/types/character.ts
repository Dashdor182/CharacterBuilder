import type { Ability, ProficiencyRank } from './pf2e';

// ——— Ability Score Boosts ———
export interface AbilityBoostState {
  ancestryFixed: Partial<Record<Ability, boolean>>; // auto-applied fixed boosts from ancestry
  ancestryFlawFixed: Partial<Record<Ability, boolean>>; // auto-applied fixed flaws from ancestry
  ancestry: Partial<Record<Ability, boolean>>;    // user's free boost choices from ancestry
  ancestryFlaw: Partial<Record<Ability, boolean>>; // user's free flaw choices from ancestry
  background: Partial<Record<Ability, boolean>>;  // from background
  class: Partial<Record<Ability, boolean>>;       // from class key ability
  level1: Partial<Record<Ability, boolean>>;      // 4 free boosts at level 1
  level5: Partial<Record<Ability, boolean>>;      // 4 free boosts at level 5
  level10: Partial<Record<Ability, boolean>>;     // 4 free boosts at level 10
  level15: Partial<Record<Ability, boolean>>;     // 4 free boosts at level 15
  level20: Partial<Record<Ability, boolean>>;     // 4 free boosts at level 20
}

// ——— Skill Proficiencies ———
export type SkillName =
  | 'acrobatics' | 'arcana' | 'athletics' | 'crafting' | 'deception'
  | 'diplomacy' | 'intimidation' | 'lore' | 'medicine' | 'nature'
  | 'occultism' | 'performance' | 'religion' | 'society' | 'stealth'
  | 'survival' | 'thievery';

export type SkillProficiencies = Partial<Record<SkillName, ProficiencyRank>>;

export interface LoreSkill {
  name: string;
  rank: ProficiencyRank;
}

// ——— Feats at a Level ———
export interface FeatSlot {
  id: string;           // unique slot identifier
  type: 'ancestry' | 'class' | 'skill' | 'general' | 'archetype' | 'bonus';
  level: number;
  selectedFeatId: string | null;
}

// ——— Spells ———
export interface SpellSlotInfo {
  rank: number;          // spell rank (1-10)
  slots: number;         // slots per day
  prepared: string[];    // IDs of prepared spells (for prepared casters)
}

export interface SpellcastingEntry {
  tradition: string;
  type: 'prepared' | 'spontaneous' | 'innate' | 'focus';
  ability: Ability;
  spellSlots: SpellSlotInfo[];
  knownSpells: string[]; // spell IDs
  focusPoints?: number;
}

// ——— Equipment ———
export type CarryType = 'worn' | 'held' | 'stowed' | 'dropped';

export interface EquipmentEntry {
  id: string;              // character-specific entry id
  itemId: string;          // Foundry item _id
  quantity: number;
  carryType: CarryType;
  invested?: boolean;
  customName?: string;
  // weapon/armor runes
  potencyRune?: number;
  strikingRune?: number;
  propertyRunes?: string[];
  notes?: string;
}

export interface Currency {
  pp: number;
  gp: number;
  sp: number;
  cp: number;
}

// ——— Level Data (choices made at each level) ———
export interface LevelData {
  level: number;
  abilityBoosts: Partial<Record<Ability, boolean>>; // 4 free boosts at 5/10/15/20
  skillIncreases: Partial<Record<string, ProficiencyRank>>;
  feats: FeatSlot[];
  spellsLearned: string[]; // spell IDs learned this level
  classFeatures: string[]; // class feature IDs gained (read-only, derived)
}

// ——— Variant Rules ———
export interface VariantRules {
  freeArchetype: boolean;       // bonus archetype feat at every even level
  ancestryParagon: boolean;     // bonus ancestry feat at every odd level
  pointBuy?: boolean;           // optional: point buy ability scores
  abilityVariant?: 'boosts' | 'pointbuy' | 'manual'; // ability score method
}

// ——— Full Character State ———
export interface CharacterState {
  // Identity
  name: string;
  playerName: string;
  campaign: string;
  deity?: string;
  alignment?: string;
  ethnicity?: string;
  nationality?: string;
  age?: string;
  gender?: string;
  height?: string;
  weight?: string;
  appearance?: string;
  backstory?: string;

  // Core choices
  ancestryId: string | null;
  heritageId: string | null;     // versatile heritage or ancestry heritage
  backgroundId: string | null;
  classId: string | null;
  keyAbility: Ability | null;    // chosen from class options
  backgroundBoostGroups: (Ability | null)[];  // one selection per background boost group

  // Ability Scores
  abilityBoosts: AbilityBoostState;
  manualAbilityScores?: Partial<Record<Ability, number>>; // only for manual variant

  // Skills
  skillProficiencies: SkillProficiencies;
  loreSkills: LoreSkill[];
  backgroundSkill?: SkillName | null;
  backgroundSkill2?: SkillName | null;

  // Level planning (1–20)
  currentLevel: number;   // selected level in the UI
  levels: LevelData[];    // choices for each level

  // Feats (organized by level - see LevelData.feats)
  // globalFeats: bonus feats from sources not tied to a level
  bonusFeats: FeatSlot[];

  // Spells
  spellcasting: SpellcastingEntry[];

  // Equipment
  equipment: EquipmentEntry[];
  currency: Currency;
  investedItems: string[];

  // Variant rules
  variantRules: VariantRules;

  // Meta
  createdAt: number;
  updatedAt: number;
  version: string;
}

// ——— Computed / Derived Stats (not stored, calculated on the fly) ———
export interface ComputedStats {
  // Ability Scores
  abilities: Record<Ability, number>;
  abilityModifiers: Record<Ability, number>;

  // Core
  level: number;
  maxHP: number;
  ac: number;
  speed: number;
  size: string;

  // Saves
  fortitude: { rank: ProficiencyRank; bonus: number };
  reflex: { rank: ProficiencyRank; bonus: number };
  will: { rank: ProficiencyRank; bonus: number };

  // Perception
  perception: { rank: ProficiencyRank; bonus: number };

  // Skills
  skills: Record<string, { rank: ProficiencyRank; bonus: number; ability: Ability }>;

  // Attacks
  unarmedAttack: number;
  weaponAttacks?: { name: string; attack: number; damage: string }[];

  // Spellcasting
  spellAttack?: number;
  spellDC?: number;
  classDC?: number;

  // Proficiencies
  weaponProficiencies: Record<string, ProficiencyRank>;
  armorProficiencies: Record<string, ProficiencyRank>;

  // Bulk
  totalBulk: number;
  bulkLimit: number;
  encumberedAt: number;
}

export const EMPTY_CHARACTER: CharacterState = {
  name: '',
  playerName: '',
  campaign: '',
  ancestryId: null,
  heritageId: null,
  backgroundId: null,
  classId: null,
  keyAbility: null,
  backgroundBoostGroups: [],
  abilityBoosts: {
    ancestryFixed: {},
    ancestryFlawFixed: {},
    ancestry: {},
    ancestryFlaw: {},
    background: {},
    class: {},
    level1: {},
    level5: {},
    level10: {},
    level15: {},
    level20: {},
  },
  skillProficiencies: {},
  loreSkills: [],
  backgroundSkill: null,
  backgroundSkill2: null,
  currentLevel: 1,
  levels: Array.from({ length: 20 }, (_, i) => ({
    level: i + 1,
    abilityBoosts: {},
    skillIncreases: {},
    feats: [],
    spellsLearned: [],
    classFeatures: [],
  })),
  bonusFeats: [],
  spellcasting: [],
  equipment: [],
  currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
  investedItems: [],
  variantRules: {
    freeArchetype: false,
    ancestryParagon: false,
    abilityVariant: 'boosts',
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: '1.0.0',
};
