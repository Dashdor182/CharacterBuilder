import React, { useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import {
  ALL_SKILLS, SKILL_LABELS, SKILLS_BY_ABILITY, ABILITY_SHORT,
  computeAbilityScores, abilityModifier, proficiencyBonus, PROF_RANK_LABELS,
  getSkillIncreaseLevels,
} from '../../../utils/calculations';
import { formatModifier } from '../../../utils/calculations';
import type { SkillName } from '../../../types/character';
import type { ProficiencyRank } from '../../../types/pf2e';

const RANK_COLORS = [
  'text-stone-500', // Untrained
  'text-blue-400',  // Trained
  'text-green-400', // Expert
  'text-amber-400', // Master
  'text-purple-400', // Legendary
];

export const SkillsSection: React.FC = () => {
  const { character, setSkillProficiency, addLoreSkill, removeLoreSkill } = useCharacterStore();
  const { gameData } = useDataStore();
  const level = character.currentLevel;

  const scores = useMemo(
    () => computeAbilityScores(character.abilityBoosts, character.manualAbilityScores),
    [character.abilityBoosts, character.manualAbilityScores]
  );

  const cls = gameData?.classes.find(c => c._id === character.classId);

  // Starting trained skills from class
  const classTrainedSkills = useMemo(() => {
    if (!cls) return new Set<string>();
    return new Set(cls.system.trainedSkills?.value ?? []);
  }, [cls]);

  // Starting trained skills from background (non-choice)
  const bgTrainedSkills = useMemo(() => {
    if (!gameData || !character.backgroundId) return new Set<string>();
    const bg = gameData.backgrounds.find(b => b._id === character.backgroundId);
    return new Set((bg?.system.trainedSkills?.value ?? []).filter(s => s !== 'any'));
  }, [gameData, character.backgroundId]);

  const skillIncreaseLevels = useMemo(() => getSkillIncreaseLevels(cls ?? null), [cls]);
  const skillIncreaseCount = skillIncreaseLevels.filter(l => l <= level).length;

  const getMinRank = (skill: SkillName): ProficiencyRank => {
    if (classTrainedSkills.has(skill) || bgTrainedSkills.has(skill)) return 1;
    if (skill === character.backgroundSkill || skill === character.backgroundSkill2) return 1;
    return 0;
  };

  const handleRankChange = (skill: SkillName, rank: ProficiencyRank) => {
    const minRank = getMinRank(skill);
    setSkillProficiency(skill, Math.max(rank, minRank) as ProficiencyRank);
  };

  const [newLore, setNewLore] = React.useState('');

  return (
    <div className="space-y-4">
      {/* Skill increases available */}
      <div className="flex items-center gap-3 text-xs text-stone-400 bg-stone-900/40 rounded p-2.5">
        <span>Skill increases available: <strong className="text-amber-400">{skillIncreaseCount}</strong></span>
        {skillIncreaseLevels.filter(l => l > level && l <= 20).length > 0 && (
          <span className="text-stone-600">
            Next at level {skillIncreaseLevels.find(l => l > level)}
          </span>
        )}
      </div>

      {/* Skill table */}
      <div className="space-y-0.5">
        {ALL_SKILLS.map(skill => {
          const rank = (character.skillProficiencies[skill] ?? getMinRank(skill)) as ProficiencyRank;
          const ability = SKILLS_BY_ABILITY[skill];
          const mod = abilityModifier(scores[ability]);
          const bonus = mod + proficiencyBonus(level, rank);
          const minRank = getMinRank(skill);
          const isLocked = minRank > 0 && rank === minRank;

          return (
            <div key={skill} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-stone-800/30">
              {/* Skill name */}
              <span className="w-28 text-sm text-stone-300 capitalize flex-shrink-0">{SKILL_LABELS[skill]}</span>

              {/* Ability */}
              <span className="w-7 text-xs text-stone-500 font-mono">{ABILITY_SHORT[ability]}</span>

              {/* Proficiency rank selector */}
              <div className="flex gap-0.5">
                {([0, 1, 2, 3, 4] as ProficiencyRank[]).map(r => {
                  const isActive = rank >= r && r > 0;
                  const isPossible = r <= 2 || (r === 3 && level >= 7) || (r === 4 && level >= 15);
                  // Max rank depends on level: Expert at 3+, Master at 7+, Legendary at 15+
                  const maxRank: ProficiencyRank = level >= 15 ? 4 : level >= 7 ? 3 : level >= 3 ? 2 : 2;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        if (r === 0) handleRankChange(skill, minRank);
                        else if (r <= maxRank) handleRankChange(skill, r);
                      }}
                      disabled={r > maxRank || (isLocked && r === 0)}
                      title={PROF_RANK_LABELS[r]}
                      className={`w-4 h-4 rounded-sm border transition-colors ${
                        r === 0
                          ? rank === 0
                            ? 'border-stone-600 bg-stone-600/30'
                            : 'border-stone-700 bg-transparent'
                          : isActive && isPossible
                            ? `border-current ${RANK_COLORS[r]} bg-current/20`
                            : r === rank
                              ? `border-current ${RANK_COLORS[r]}`
                              : 'border-stone-700 bg-transparent hover:border-stone-500'
                      } ${r > maxRank ? 'opacity-30 cursor-not-allowed' : ''}`}
                    />
                  );
                })}
              </div>

              {/* Rank label */}
              <span className={`text-xs w-16 ${RANK_COLORS[rank]}`}>
                {PROF_RANK_LABELS[rank]}
              </span>

              {/* Bonus */}
              <span className={`text-sm font-mono ml-auto w-8 text-right ${bonus >= 0 ? 'text-stone-200' : 'text-red-400'}`}>
                {formatModifier(bonus)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Lore skills */}
      <div className="border-t border-stone-700/40 pt-4">
        <label className="text-xs text-stone-400 font-medium uppercase tracking-wide block mb-3">
          Lore Skills
        </label>

        {character.loreSkills.map(lore => {
          const bonus = abilityModifier(scores.int) + proficiencyBonus(level, lore.rank);
          return (
            <div key={lore.name} className="flex items-center gap-2 mb-2">
              <span className="text-sm text-stone-300">{lore.name} Lore</span>
              <span className={`text-xs ${RANK_COLORS[lore.rank]}`}>{PROF_RANK_LABELS[lore.rank]}</span>
              <span className="text-sm font-mono text-stone-200 ml-auto">{formatModifier(bonus)}</span>
              <button
                onClick={() => removeLoreSkill(lore.name)}
                className="text-stone-600 hover:text-red-400 ml-1"
              >
                ×
              </button>
            </div>
          );
        })}

        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newLore}
            onChange={e => setNewLore(e.target.value)}
            placeholder="Lore subject (e.g. Warfare)"
            className="flex-1 px-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-sm text-stone-300
                       placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            onKeyDown={e => {
              if (e.key === 'Enter' && newLore.trim()) {
                addLoreSkill({ name: newLore.trim(), rank: 1 });
                setNewLore('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newLore.trim()) {
                addLoreSkill({ name: newLore.trim(), rank: 1 });
                setNewLore('');
              }
            }}
            className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded text-sm transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
