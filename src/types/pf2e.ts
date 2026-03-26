// Foundry VTT PF2e data types

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type ProficiencyRank = 0 | 1 | 2 | 3 | 4; // Untrained, Trained, Expert, Master, Legendary
export type Size = 'tiny' | 'sm' | 'med' | 'lg' | 'huge' | 'grg';

export interface FoundryItem {
  _id: string;
  name: string;
  type: string;
  img?: string;
  system: Record<string, unknown>;
  effects?: unknown[];
  folder?: string | null;
}

export interface PF2eDescription {
  value: string;
  gm?: string;
}

export interface PF2eTraits {
  value: string[];
  rarity?: string;
  custom?: string;
}

export interface PF2eAncestry extends FoundryItem {
  type: 'ancestry';
  system: {
    description: PF2eDescription;
    hp: number;
    size: Size;
    speed: number;
    boosts: Record<string, { value: Ability[] }>;
    flaws: Record<string, { value: Ability[] }>;
    languages: { value: string[]; custom?: string };
    additionalLanguages?: { count: number; value: string[] };
    traits: PF2eTraits;
    vision?: string;
    items?: Record<string, unknown>;
  };
}

export interface PF2eBackground extends FoundryItem {
  type: 'background';
  system: {
    description: PF2eDescription;
    boosts: Record<string, { value: Ability[] }>;
    trainedSkills: { value: string[]; additional?: { value: string[] } };
    trainedLore?: string;
    feats?: { value: string }[];
    traits?: PF2eTraits;
    items?: Record<string, unknown>;
  };
}

export interface PF2eClassProficiency {
  rank: ProficiencyRank;
  name?: string;
}

export interface PF2eClass extends FoundryItem {
  type: 'class';
  system: {
    description: PF2eDescription;
    hp: number;
    keyAbility: { value: Ability[] };
    perception: { rank: ProficiencyRank };
    savingThrows: {
      fortitude: PF2eClassProficiency;
      reflex: PF2eClassProficiency;
      will: PF2eClassProficiency;
    };
    attacks: Record<string, PF2eClassProficiency>;
    defenses: Record<string, PF2eClassProficiency>;
    classDC: { rank: ProficiencyRank };
    spellcasting?: string;
    trainedSkills: { value: string[]; additional?: number };
    traits: PF2eTraits;
    items?: Record<string, { uuid: string; level?: number }>;
    ancestryFeatLevels?: { value: number[] };
    classFeatLevels?: { value: number[] };
    generalFeatLevels?: { value: number[] };
    skillFeatLevels?: { value: number[] };
    skillIncreaseLevels?: { value: number[] };
    abilityBoostLevels?: { value: number[] };
  };
}

export type FeatType =
  | 'ancestry' | 'ancestryfeature' | 'ancestryfeatures'
  | 'class' | 'classfeature'
  | 'skill' | 'general'
  | 'archetype' | 'dedication'
  | 'heritage'
  | 'bonus';

export interface PF2eFeat extends FoundryItem {
  type: 'feat';
  system: {
    description: PF2eDescription;
    prerequisites: { value: { value: string }[] };
    traits: PF2eTraits;
    featType?: { value: FeatType };   // legacy field (older versions)
    category?: FeatType;              // current field (pf2e 7.x+)
    level: { value: number };
    actionType?: { value: string };
    actions?: { value: number | string | null };
    frequency?: { max: number; per: string };
    maxTakable?: number;
    onlyLevel1?: boolean;
    trigger?: string;
    rules?: unknown[];
  };
}

export interface PF2eClassFeature extends FoundryItem {
  type: 'feat';
  system: {
    description: PF2eDescription;
    featType?: { value: 'classfeature' };
    category?: string;
    level: { value: number };
    traits: PF2eTraits;
    rules?: unknown[];
  };
}

export type SpellTradition = 'arcane' | 'divine' | 'occult' | 'primal';
export type SpellSchool =
  | 'abjuration' | 'conjuration' | 'divination' | 'enchantment'
  | 'evocation' | 'illusion' | 'necromancy' | 'transmutation';

export interface PF2eSpell extends FoundryItem {
  type: 'spell';
  system: {
    description: PF2eDescription;
    level: { value: number };
    traits: PF2eTraits & { traditions?: SpellTradition[] };
    school?: { value: SpellSchool };
    spellType?: { value: string };
    actionType?: { value: string };
    actions?: { value: string | number | null };
    area?: { value: number; type: string } | null;
    range?: { value: string };
    duration?: { value: string; sustained?: boolean };
    target?: { value: string };
    components?: { value: { somatic?: boolean; verbal?: boolean; material?: boolean } };
    save?: { basic: boolean; statistic: string };
    sustained?: boolean;
    damage?: Record<string, unknown>;
    heightening?: { type: string; interval?: number; damage?: Record<string, unknown> };
    overlays?: Record<string, unknown>;
  };
}

export type ArmorCategory = 'unarmored' | 'light' | 'medium' | 'heavy';

export interface PF2eArmor extends FoundryItem {
  type: 'armor';
  system: {
    description: PF2eDescription;
    traits: PF2eTraits;
    category: ArmorCategory;
    group?: string;
    baseItem?: string;
    acBonus: number;
    dexCap?: number;
    checkPenalty?: number;
    speedPenalty?: number;
    strength?: number | null;
    bulkCapacity?: string;
    bulk: { value: number | string };
    price: { value: { gp?: number; sp?: number; cp?: number; pp?: number } };
    level: { value: number };
    runes?: { potency?: number; resilient?: number; property?: unknown[] };
    equipped?: { carryType: string };
  };
}

export type WeaponCategory = 'simple' | 'martial' | 'advanced' | 'unarmed';
export type WeaponGroup = 'sword' | 'axe' | 'bow' | 'crossbow' | 'dart' | 'flail' | 'hammer' | 'knife' | 'pick' | 'polearm' | 'shield' | 'sling' | 'spear' | 'staff' | 'brawling' | 'club' | string;

export interface PF2eWeapon extends FoundryItem {
  type: 'weapon';
  system: {
    description: PF2eDescription;
    traits: PF2eTraits;
    category: WeaponCategory;
    group?: WeaponGroup;
    baseItem?: string;
    damage: { dice: number; die: string; damageType: string };
    range?: number | null;
    reload?: { value: string };
    bulk: { value: number | string };
    price: { value: { gp?: number; sp?: number; cp?: number; pp?: number } };
    level: { value: number };
    runes?: { potency?: number; striking?: number; property?: unknown[] };
    equipped?: { carryType: string };
  };
}

export interface PF2eEquipment extends FoundryItem {
  type: 'equipment';
  system: {
    description: PF2eDescription;
    traits: PF2eTraits;
    bulk: { value: number | string };
    price: { value: { gp?: number; sp?: number; cp?: number; pp?: number } };
    level: { value: number };
    stackGroup?: string;
    quantity: number;
    equipped?: { carryType: string };
  };
}

export type PF2eItem =
  | PF2eAncestry
  | PF2eBackground
  | PF2eClass
  | PF2eFeat
  | PF2eSpell
  | PF2eArmor
  | PF2eWeapon
  | PF2eEquipment;

export type ItemType = PF2eItem['type'];

export interface GameData {
  ancestries: PF2eAncestry[];
  backgrounds: PF2eBackground[];
  classes: PF2eClass[];
  classFeatures: PF2eClassFeature[];
  ancestryFeatures: PF2eFeat[];
  feats: PF2eFeat[];
  spells: PF2eSpell[];
  armor: PF2eArmor[];
  weapons: PF2eWeapon[];
  equipment: PF2eEquipment[];
  loadedAt?: number;
  version?: string;
}
