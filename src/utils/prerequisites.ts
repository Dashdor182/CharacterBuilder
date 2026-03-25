/**
 * PF2e Prerequisite Checker
 * Determines if a feat, spell, or other item is available to a character.
 */

import type { CharacterState, ComputedStats } from '../types/character';
import type { GameData, PF2eFeat, PF2eSpell } from '../types/pf2e';
import type { Ability } from '../types/pf2e';
import { ABILITY_SHORT } from './calculations';

export interface PrerequisiteResult {
  met: boolean;
  reasons: string[]; // reasons why NOT met (empty if met)
}

const ABILITY_SCORE_REGEX = /^(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)$/i;
const PROFICIENCY_REGEX = /^(trained|expert|master|legendary)\s+in\s+(.+)$/i;

export function checkFeatPrerequisites(
  feat: PF2eFeat,
  character: CharacterState,
  computed: ComputedStats,
  gameData: GameData,
  selectedLevel: number,
): PrerequisiteResult {
  const reasons: string[] = [];

  // Level check
  const featLevel = feat.system.level?.value ?? 1;
  if (featLevel > selectedLevel) {
    reasons.push(`Requires level ${featLevel}`);
  }

  // Feat type checks
  const featType = feat.system.featType?.value;
  const traits = feat.system.traits?.value ?? [];

  // Class feat: must have the class
  if (featType === 'class') {
    const classTraits = traits.filter(t =>
      gameData.classes.some(c => c.name.toLowerCase() === t.toLowerCase())
    );
    if (classTraits.length > 0) {
      const hasClass = gameData.classes.find(c =>
        c._id === character.classId &&
        classTraits.some(t => c.name.toLowerCase() === t.toLowerCase())
      );
      if (!hasClass) {
        // Check if it could be from an archetype
        const dedicationFeat = getAllSelectedFeats(character, gameData)
          .find(f => f.system.traits?.value?.includes('dedication') &&
            classTraits.some(t => f.name.toLowerCase().includes(t.toLowerCase())));
        if (!dedicationFeat) {
          const classNames = classTraits.map(t =>
            t.charAt(0).toUpperCase() + t.slice(1)
          ).join(' or ');
          reasons.push(`Requires ${classNames} class or dedication`);
        }
      }
    }
  }

  // Archetype / dedication
  if (featType === 'archetype' || traits.includes('archetype')) {
    // For dedication feats: must not already have a dedication unless meeting the rule
    if (traits.includes('dedication')) {
      const existingDedications = getAllSelectedFeats(character, gameData)
        .filter(f => f.system.traits?.value?.includes('dedication'));

      // Rule: must have 2 feats from current archetype before taking another dedication
      // Simplified check
      if (existingDedications.length > 0) {
        const alreadyDedicated = existingDedications.some(f =>
          f.name === feat.name
        );
        if (alreadyDedicated) {
          reasons.push('Already have this dedication');
        }
      }
    }
  }

  // Prerequisites from the feat itself
  const prereqs = feat.system.prerequisites?.value ?? [];
  for (const prereq of prereqs) {
    const reqText = prereq.value?.trim();
    if (!reqText) continue;

    const result = checkPrerequisiteText(reqText, character, computed, gameData, selectedLevel);
    if (!result) {
      reasons.push(`Prerequisite not met: ${reqText}`);
    }
  }

  return { met: reasons.length === 0, reasons };
}

function checkPrerequisiteText(
  text: string,
  character: CharacterState,
  computed: ComputedStats,
  gameData: GameData,
  _level: number,
): boolean {
  // Handle OR conditions
  if (text.includes(' or ')) {
    const parts = text.split(/\s+or\s+/i);
    return parts.some(p =>
      checkPrerequisiteText(p.trim(), character, computed, gameData, _level)
    );
  }

  // Ability score requirement: "Str 16" etc.
  const abilityMatch = text.match(ABILITY_SCORE_REGEX);
  if (abilityMatch) {
    const abilityKey = Object.entries(ABILITY_SHORT).find(
      ([, short]) => short.toLowerCase() === abilityMatch[1].toLowerCase()
    )?.[0] as Ability | undefined;
    if (abilityKey) {
      return computed.abilities[abilityKey] >= parseInt(abilityMatch[2]);
    }
  }

  // Proficiency requirement: "trained in Arcana"
  const profMatch = text.match(PROFICIENCY_REGEX);
  if (profMatch) {
    const rankRequired = {
      trained: 1, expert: 2, master: 3, legendary: 4,
    }[profMatch[1].toLowerCase()] ?? 1;
    const target = profMatch[2].toLowerCase();

    // Check skills
    for (const [skillName, skillData] of Object.entries(computed.skills)) {
      if (skillName.toLowerCase().includes(target) ||
          target.includes(skillName.toLowerCase())) {
        if (skillData.rank >= rankRequired) return true;
      }
    }
    return false;
  }

  // Feat requirement: check if character has the feat selected
  const selectedFeats = getAllSelectedFeats(character, gameData);
  const textLower = text.toLowerCase();

  // Check if it matches a feat name
  const hasFeat = selectedFeats.some(f =>
    f.name.toLowerCase() === textLower ||
    f.name.toLowerCase().includes(textLower)
  );
  if (hasFeat) return true;

  // Check for class requirement
  if (text.toLowerCase().startsWith('class:') || text.toLowerCase().includes('class feature')) {
    return true; // Simplified: don't block on class feature prereqs
  }

  // Spellcasting requirement
  if (textLower.includes('spellcasting') || textLower.includes('spell slots')) {
    return character.spellcasting.length > 0;
  }

  // Default: assume met if we can't parse it (avoid blocking valid choices)
  return true;
}

export function getAllSelectedFeats(character: CharacterState, gameData: GameData): PF2eFeat[] {
  const featIds = new Set<string>();

  for (const levelData of character.levels) {
    for (const slot of levelData.feats) {
      if (slot.selectedFeatId) featIds.add(slot.selectedFeatId);
    }
  }
  for (const slot of character.bonusFeats) {
    if (slot.selectedFeatId) featIds.add(slot.selectedFeatId);
  }

  const feats: PF2eFeat[] = [];
  for (const id of featIds) {
    const feat = gameData.feats.find(f => f._id === id);
    if (feat) feats.push(feat);
  }
  return feats;
}

export function checkSpellAvailability(
  spell: PF2eSpell,
  character: CharacterState,
  _computed: ComputedStats,
  _gameData: GameData,
  _selectedLevel: number,
): PrerequisiteResult {
  const reasons: string[] = [];

  // Check spell rank vs character level
  const spellRank = spell.system.level?.value ?? 1;
  const maxSpellRank = Math.ceil(_selectedLevel / 2);
  if (spellRank > maxSpellRank) {
    reasons.push(`Requires level ${spellRank * 2 - 1} to cast rank ${spellRank} spells`);
  }

  // Check tradition
  const traditions = spell.system.traits?.traditions ?? [];
  if (traditions.length > 0 && character.spellcasting.length > 0) {
    const characterTraditions = character.spellcasting.map(e => e.tradition);
    const hasMatchingTradition = traditions.some(t => characterTraditions.includes(t));
    if (!hasMatchingTradition) {
      reasons.push(`Requires ${traditions.join(' or ')} tradition`);
    }
  }

  return { met: reasons.length === 0, reasons };
}

export function getInvalidReason(
  prereqResult: PrerequisiteResult,
): string {
  if (prereqResult.met) return '';
  return prereqResult.reasons.join('; ');
}

// Helper to check if we can take more feats of a type at a given level
export function hasFeatSlotAtLevel(
  character: CharacterState,
  level: number,
  slotType: string,
): boolean {
  const levelData = character.levels[level - 1];
  if (!levelData) return false;
  return levelData.feats.some(
    slot => slot.type === slotType && slot.selectedFeatId === null
  );
}
