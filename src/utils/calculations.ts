/**
 * PF2e Rules Calculations
 * All derived statistics are computed here from character state + game data.
 */

import type { CharacterState, ComputedStats, SkillName, AbilityBoostState } from '../types/character';
import type { Ability, ProficiencyRank, GameData, PF2eClass, PF2eAncestry } from '../types/pf2e';

export const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITY_LABELS: Record<Ability, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

export const ABILITY_SHORT: Record<Ability, string> = {
  str: 'Str', dex: 'Dex', con: 'Con', int: 'Int', wis: 'Wis', cha: 'Cha',
};

export const PROF_RANK_LABELS = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'];
export const PROF_RANK_BONUS: Record<ProficiencyRank, number> = { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8 };

export const SKILLS_BY_ABILITY: Record<SkillName, Ability> = {
  acrobatics: 'dex', arcana: 'int', athletics: 'str', crafting: 'int',
  deception: 'cha', diplomacy: 'cha', intimidation: 'cha', lore: 'int',
  medicine: 'wis', nature: 'wis', occultism: 'int', performance: 'cha',
  religion: 'wis', society: 'int', stealth: 'dex', survival: 'wis', thievery: 'dex',
};

export const ALL_SKILLS: SkillName[] = Object.keys(SKILLS_BY_ABILITY) as SkillName[];

export const SKILL_LABELS: Record<string, string> = {
  acrobatics: 'Acrobatics', arcana: 'Arcana', athletics: 'Athletics',
  crafting: 'Crafting', deception: 'Deception', diplomacy: 'Diplomacy',
  intimidation: 'Intimidation', lore: 'Lore', medicine: 'Medicine',
  nature: 'Nature', occultism: 'Occultism', performance: 'Performance',
  religion: 'Religion', society: 'Society', stealth: 'Stealth',
  survival: 'Survival', thievery: 'Thievery',
};

export function proficiencyBonus(level: number, rank: ProficiencyRank): number {
  if (rank === 0) return 0; // Untrained: no level bonus
  return level + PROF_RANK_BONUS[rank];
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function computeAbilityScores(
  boosts: AbilityBoostState,
  manualScores?: Partial<Record<Ability, number>>,
): Record<Ability, number> {
  if (manualScores) {
    return {
      str: manualScores.str ?? 10,
      dex: manualScores.dex ?? 10,
      con: manualScores.con ?? 10,
      int: manualScores.int ?? 10,
      wis: manualScores.wis ?? 10,
      cha: manualScores.cha ?? 10,
    };
  }

  // Start at 10
  const scores: Record<Ability, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

  // Apply all boost sources
  const allBoostSources = [
    boosts.ancestry,
    boosts.background,
    boosts.class,
    boosts.level1,
  ] as const;

  for (const source of allBoostSources) {
    for (const [ability, active] of Object.entries(source)) {
      if (active) applyBoost(scores, ability as Ability);
    }
  }

  // Apply flaws first (before higher-level boosts so flaws reduce the base)
  for (const [ability, active] of Object.entries(boosts.ancestryFlaw)) {
    if (active) scores[ability as Ability] -= 2;
  }

  // Level 5, 10, 15, 20 boosts
  for (const source of [boosts.level5, boosts.level10, boosts.level15, boosts.level20]) {
    for (const [ability, active] of Object.entries(source)) {
      if (active) applyBoost(scores, ability as Ability);
    }
  }

  return scores;
}

function applyBoost(scores: Record<Ability, number>, ability: Ability): void {
  // PF2e rule: boosts below 18 give +2; at 18+ give +1
  scores[ability] = scores[ability] < 18 ? scores[ability] + 2 : scores[ability] + 1;
}

export function computeStats(
  character: CharacterState,
  gameData: GameData,
  atLevel?: number,
): ComputedStats {
  const level = atLevel ?? character.currentLevel;
  const ancestry = gameData.ancestries.find(a => a._id === character.ancestryId);
  const cls = gameData.classes.find(c => c._id === character.classId);

  const abilityScoresRaw = computeAbilityScoresUpToLevel(character, level);
  const modifiers = {} as Record<Ability, number>;
  for (const ab of ABILITIES) {
    modifiers[ab] = abilityModifier(abilityScoresRaw[ab]);
  }

  // HP
  const maxHP = computeHP(character, gameData, level, ancestry, cls, modifiers.con);

  // AC
  const equippedArmor = getEquippedArmor(character, gameData);
  const armorBonus = equippedArmor?.system.acBonus ?? 0;
  const armorDexCap = equippedArmor?.system.dexCap ?? 99;
  const armorCategory = equippedArmor?.system.category ?? 'unarmored';
  const armorProfRank = getArmorProficiency(character, gameData, armorCategory, level);
  const dexForAC = Math.min(modifiers.dex, armorDexCap);
  const ac = 10 + armorBonus + dexForAC + proficiencyBonus(level, armorProfRank);

  // Saves
  const fortRank = getClassSaveRank(cls, 'fortitude', level);
  const refRank = getClassSaveRank(cls, 'reflex', level);
  const willRank = getClassSaveRank(cls, 'will', level);
  const fortitude = { rank: fortRank, bonus: modifiers.con + proficiencyBonus(level, fortRank) };
  const reflex = { rank: refRank, bonus: modifiers.dex + proficiencyBonus(level, refRank) };
  const will = { rank: willRank, bonus: modifiers.wis + proficiencyBonus(level, willRank) };

  // Perception
  const percRank = getClassPerceptionRank(cls, level);
  const perception = { rank: percRank, bonus: modifiers.wis + proficiencyBonus(level, percRank) };

  // Skills
  const skills = computeSkills(character, gameData, modifiers, level);

  // Speed
  const speed = ancestry?.system.speed ?? 25;

  // Class DC
  const keyAbility = character.keyAbility ?? cls?.system.keyAbility?.value?.[0] ?? 'str';
  const classDCRank = cls ? getClassDCRank(cls, level) : 0 as ProficiencyRank;
  const classDC = classDCRank > 0
    ? 10 + modifiers[keyAbility as Ability] + proficiencyBonus(level, classDCRank)
    : undefined;

  // Spell attack / DC (simplified - use spellcasting ability)
  let spellAttack: number | undefined;
  let spellDC: number | undefined;
  if (character.spellcasting.length > 0) {
    const firstEntry = character.spellcasting[0];
    const spellMod = modifiers[firstEntry.ability];
    const spellProfRank: ProficiencyRank = 2; // trained minimum
    spellAttack = spellMod + proficiencyBonus(level, spellProfRank);
    spellDC = 10 + spellMod + proficiencyBonus(level, spellProfRank);
  }

  // Weapon proficiencies
  const weaponProficiencies = computeWeaponProficiencies(cls, level);
  const armorProficiencies = computeArmorProficiencies(cls, level);

  // Bulk
  const { total: totalBulk } = computeBulk(character, gameData);
  const bulkLimit = 5 + modifiers.str;
  const encumberedAt = bulkLimit - 5; // actually encumbered when over (limit - 5)

  return {
    abilities: abilityScoresRaw,
    abilityModifiers: modifiers,
    level,
    maxHP,
    ac,
    speed,
    size: ancestry?.system.size ?? 'med',
    fortitude,
    reflex,
    will,
    perception,
    skills,
    unarmedAttack: modifiers.str + proficiencyBonus(level, 2 as ProficiencyRank),
    spellAttack,
    spellDC,
    classDC,
    weaponProficiencies,
    armorProficiencies,
    totalBulk,
    bulkLimit,
    encumberedAt,
  };
}

function computeAbilityScoresUpToLevel(
  character: CharacterState,
  level: number,
): Record<Ability, number> {
  const boosts = { ...character.abilityBoosts };
  // Only apply level-gated boosts up to the current level
  if (level < 5) {
    boosts.level5 = {};
    boosts.level10 = {};
    boosts.level15 = {};
    boosts.level20 = {};
  } else if (level < 10) {
    boosts.level10 = {};
    boosts.level15 = {};
    boosts.level20 = {};
  } else if (level < 15) {
    boosts.level15 = {};
    boosts.level20 = {};
  } else if (level < 20) {
    boosts.level20 = {};
  }
  return computeAbilityScores(boosts, character.manualAbilityScores);
}

function computeHP(
  _character: CharacterState,
  _gameData: GameData,
  level: number,
  ancestry: PF2eAncestry | undefined,
  cls: PF2eClass | undefined,
  conMod: number,
): number {
  const ancestryHP = ancestry?.system.hp ?? 0;
  const classHP = cls?.system.hp ?? 0;
  // Level 1: ancestry HP + class HP + Con mod
  // Each subsequent level: class HP + Con mod
  if (!cls) return ancestryHP;
  return ancestryHP + (classHP + conMod) * level;
}

function getEquippedArmor(character: CharacterState, gameData: GameData) {
  const worn = character.equipment.find(e => e.carryType === 'worn');
  if (!worn) return null;
  return gameData.armor.find(a => a._id === worn.itemId) ?? null;
}

function getArmorProficiency(
  character: CharacterState,
  gameData: GameData,
  category: string,
  _level: number,
): ProficiencyRank {
  const cls = gameData.classes.find(c => c._id === character.classId);
  if (!cls) return 0;
  const base = cls.system.defenses?.[category]?.rank ?? 0;
  return base as ProficiencyRank;
}

function getClassSaveRank(cls: PF2eClass | undefined, save: 'fortitude' | 'reflex' | 'will', level: number): ProficiencyRank {
  if (!cls) return 0;
  const base = cls.system.savingThrows?.[save]?.rank ?? 0;
  // Classes improve saves at higher levels (approximation)
  if (base >= 2 && level >= 7) return Math.min(base + 1, 4) as ProficiencyRank;
  if (base >= 1 && level >= 11) return Math.min(base + 1, 4) as ProficiencyRank;
  return base as ProficiencyRank;
}

function getClassPerceptionRank(cls: PF2eClass | undefined, level: number): ProficiencyRank {
  if (!cls) return 0;
  const base = cls.system.perception?.rank ?? 0;
  if (base >= 2 && level >= 7) return Math.min(base + 1, 4) as ProficiencyRank;
  return base as ProficiencyRank;
}

function getClassDCRank(cls: PF2eClass, level: number): ProficiencyRank {
  const base = cls.system.classDC?.rank ?? 1;
  if (level >= 9 && base >= 1) return Math.min(base + 1, 4) as ProficiencyRank;
  return base as ProficiencyRank;
}

function computeSkills(
  character: CharacterState,
  _gameData: GameData,
  modifiers: Record<Ability, number>,
  level: number,
): ComputedStats['skills'] {
  const result: ComputedStats['skills'] = {};

  for (const skill of ALL_SKILLS) {
    const rank = (character.skillProficiencies[skill] ?? 0) as ProficiencyRank;
    const ability = SKILLS_BY_ABILITY[skill];
    const bonus = modifiers[ability] + proficiencyBonus(level, rank);
    result[skill] = { rank, bonus, ability };
  }

  // Lore skills
  for (const lore of character.loreSkills) {
    const rank = lore.rank as ProficiencyRank;
    const bonus = modifiers.int + proficiencyBonus(level, rank);
    result[`lore:${lore.name}`] = { rank, bonus, ability: 'int' };
  }

  return result;
}

function computeWeaponProficiencies(cls: PF2eClass | undefined, _level: number): Record<string, ProficiencyRank> {
  if (!cls) return {};
  const profs: Record<string, ProficiencyRank> = {};
  for (const [key, val] of Object.entries(cls.system.attacks ?? {})) {
    profs[key] = (val as { rank: number }).rank as ProficiencyRank;
  }
  return profs;
}

function computeArmorProficiencies(cls: PF2eClass | undefined, _level: number): Record<string, ProficiencyRank> {
  if (!cls) return {};
  const profs: Record<string, ProficiencyRank> = {};
  for (const [key, val] of Object.entries(cls.system.defenses ?? {})) {
    profs[key] = (val as { rank: number }).rank as ProficiencyRank;
  }
  return profs;
}

export function computeBulk(character: CharacterState, gameData: GameData): { total: number; limit: number } {
  let total = 0;

  for (const entry of character.equipment) {
    const item =
      gameData.armor.find(a => a._id === entry.itemId) ??
      gameData.weapons.find(w => w._id === entry.itemId) ??
      gameData.equipment.find(e => e._id === entry.itemId);

    if (!item) continue;

    const rawBulk = item.system.bulk?.value ?? 0;
    let bulk = typeof rawBulk === 'string' ? (rawBulk === 'L' ? 0.1 : 0) : rawBulk;

    // Stowed items count at full bulk; worn items at their bulk value
    if (entry.carryType === 'stowed') {
      bulk = bulk; // full bulk
    }

    total += bulk * entry.quantity;
  }

  return { total: Math.round(total * 10) / 10, limit: 99 };
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function formatBulk(bulk: number): string {
  if (bulk === 0) return '—';
  if (bulk === 0.1) return 'L';
  return String(bulk);
}

export function parseBulkValue(raw: string | number | undefined): number {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === 'number') return raw;
  if (raw === 'L') return 0.1;
  if (raw === '—' || raw === '-') return 0;
  return parseFloat(raw) || 0;
}

export function formatPrice(price: { gp?: number; sp?: number; cp?: number; pp?: number } | undefined): string {
  if (!price) return '—';
  const parts: string[] = [];
  if (price.pp) parts.push(`${price.pp} pp`);
  if (price.gp) parts.push(`${price.gp} gp`);
  if (price.sp) parts.push(`${price.sp} sp`);
  if (price.cp) parts.push(`${price.cp} cp`);
  return parts.join(', ') || '—';
}

// Skill increase levels for all classes (standard PF2e rule: every 2 levels after 1)
export function getSkillIncreaseLevels(cls: PF2eClass | null): number[] {
  if (!cls) return [];
  const fromClass = cls.system.skillIncreaseLevels?.value ?? [];
  if (fromClass.length > 0) return fromClass;
  // Default: levels 3, 5, 7, 9, 11, 13, 15, 17, 19
  return [3, 5, 7, 9, 11, 13, 15, 17, 19];
}

export function getClassFeatLevels(cls: PF2eClass | null): number[] {
  if (!cls) return [];
  return cls.system.classFeatLevels?.value ?? [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
}

export function getAncestryFeatLevels(cls: PF2eClass | null, ancestryParagon: boolean): number[] {
  const base = cls?.system.ancestryFeatLevels?.value ?? [1, 5, 9, 13, 17];
  if (ancestryParagon) {
    // Add odd levels not already included
    const odd = [1,3,5,7,9,11,13,15,17,19];
    return [...new Set([...base, ...odd])].sort((a,b) => a-b);
  }
  return base;
}

export function getGeneralFeatLevels(cls: PF2eClass | null): number[] {
  if (!cls) return [];
  return cls.system.generalFeatLevels?.value ?? [3, 7, 11, 15, 19];
}

export function getSkillFeatLevels(cls: PF2eClass | null): number[] {
  if (!cls) return [];
  return cls.system.skillFeatLevels?.value ?? [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
}

export function getAbilityBoostLevels(): number[] {
  return [1, 5, 10, 15, 20];
}
