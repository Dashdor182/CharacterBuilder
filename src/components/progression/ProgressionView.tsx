import React from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { useDataStore } from '../../store/dataStore';
import {
  getClassFeatLevels, getAncestryFeatLevels, getGeneralFeatLevels, getSkillFeatLevels,
  getSkillIncreaseLevels, ABILITY_SHORT,
} from '../../utils/calculations';
import type { Ability } from '../../types/pf2e';

export const ProgressionView: React.FC = () => {
  const { character, setCurrentLevel } = useCharacterStore();
  const { gameData } = useDataStore();

  const cls = gameData?.classes.find(c => c._id === character.classId);

  const classFeatLevels = getClassFeatLevels(cls ?? null);
  const ancestryFeatLevels = getAncestryFeatLevels(cls ?? null, character.variantRules.ancestryParagon);
  const generalFeatLevels = getGeneralFeatLevels(cls ?? null);
  const skillFeatLevels = getSkillFeatLevels(cls ?? null);
  const skillIncreaseLevels = getSkillIncreaseLevels(cls ?? null);

  // Class features by level
  const classFeaturesByLevel = React.useMemo(() => {
    if (!gameData || !cls) return {} as Record<number, string[]>;
    const byLevel: Record<number, string[]> = {};
    // Find class features from classFeatures pack
    for (const feature of gameData.classFeatures) {
      const traits = feature.system.traits?.value ?? [];
      const isForClass = cls && traits.some(t => cls.name.toLowerCase() === t.toLowerCase());
      if (!isForClass) continue;
      const lvl = feature.system.level?.value ?? 1;
      if (!byLevel[lvl]) byLevel[lvl] = [];
      byLevel[lvl].push(feature.name);
    }
    return byLevel;
  }, [gameData, cls]);

  const BOOST_LEVELS = [1, 5, 10, 15, 20];

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-lg font-bold text-amber-400 mb-4">Level Progression</h2>

      {!cls && (
        <p className="text-stone-500 text-sm">Select a class to see the progression timeline.</p>
      )}

      <div className="space-y-2">
        {Array.from({ length: 20 }, (_, i) => {
          const lvl = i + 1;
          const levelData = character.levels[i];
          const isCurrentLevel = lvl === character.currentLevel;
          const isFuture = lvl > character.currentLevel;

          // Gather everything happening at this level
          const classFeatures = classFeaturesByLevel[lvl] ?? [];
          const featsHere = (levelData?.feats ?? []).filter(f => f.selectedFeatId);
          const selectedFeats = featsHere.map(f => ({
            ...f,
            feat: gameData?.feats.find(feat => feat._id === f.selectedFeatId),
          }));

          const hasClassFeat = classFeatLevels.includes(lvl);
          const hasAncestryFeat = ancestryFeatLevels.includes(lvl);
          const hasGeneralFeat = generalFeatLevels.includes(lvl);
          const hasSkillFeat = skillFeatLevels.includes(lvl);
          const hasSkillIncrease = skillIncreaseLevels.includes(lvl);
          const hasAbilityBoost = BOOST_LEVELS.includes(lvl);
          const hasFreeArchetype = character.variantRules.freeArchetype && lvl % 2 === 0;

          // Ability boosts taken at this level
          const boostSource = lvl === 1 ? 'level1' :
                              lvl === 5 ? 'level5' :
                              lvl === 10 ? 'level10' :
                              lvl === 15 ? 'level15' :
                              lvl === 20 ? 'level20' : null;

          const boostsTaken = boostSource
            ? Object.entries((character.abilityBoosts as any)[boostSource] ?? {})
                .filter(([, v]) => v)
                .map(([k]) => ABILITY_SHORT[k as Ability])
            : [];

          return (
            <div
              key={lvl}
              className={`rounded-lg border transition-all cursor-pointer ${
                isCurrentLevel
                  ? 'border-amber-500/50 bg-amber-900/10'
                  : isFuture
                    ? 'border-stone-800/50 bg-stone-900/20 opacity-70'
                    : 'border-stone-700/30 bg-stone-900/30 hover:border-stone-600'
              }`}
              onClick={() => setCurrentLevel(lvl)}
            >
              <div className="flex items-start gap-3 p-3">
                {/* Level badge */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCurrentLevel
                    ? 'bg-amber-600 text-white'
                    : isFuture
                      ? 'bg-stone-800 text-stone-600'
                      : 'bg-stone-700 text-stone-400'
                }`}>
                  {lvl}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Slot tags */}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {hasClassFeat && <SlotTag label="Class Feat" color="blue" filled={featsHere.some(f => f.type === 'class')} />}
                    {hasAncestryFeat && <SlotTag label="Ancestry Feat" color="green" filled={featsHere.some(f => f.type === 'ancestry')} />}
                    {hasGeneralFeat && <SlotTag label="General Feat" color="stone" filled={featsHere.some(f => f.type === 'general')} />}
                    {hasSkillFeat && <SlotTag label="Skill Feat" color="teal" filled={featsHere.some(f => f.type === 'skill')} />}
                    {hasFreeArchetype && <SlotTag label="Archetype Feat" color="purple" filled={featsHere.some(f => f.type === 'archetype')} />}
                    {hasSkillIncrease && <SlotTag label="Skill Increase" color="sky" filled={Object.keys(levelData?.skillIncreases ?? {}).length > 0} />}
                    {hasAbilityBoost && <SlotTag label={`Ability Boosts${boostsTaken.length > 0 ? ` (${boostsTaken.join(', ')})` : ''}`} color="amber" filled={boostsTaken.length === 4 || (lvl === 1 && boostsTaken.length > 0)} />}
                  </div>

                  {/* Class features */}
                  {classFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {classFeatures.slice(0, 4).map(f => (
                        <span key={f} className="text-xs text-stone-500 italic">{f}</span>
                      ))}
                      {classFeatures.length > 4 && (
                        <span className="text-xs text-stone-600">+{classFeatures.length - 4} more</span>
                      )}
                    </div>
                  )}

                  {/* Selected feats */}
                  {selectedFeats.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedFeats.map((sf, i) => sf.feat && (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300"
                        >
                          {sf.feat.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SlotTag: React.FC<{ label: string; color: string; filled: boolean }> = ({ label, color, filled }) => {
  const colors: Record<string, string> = {
    blue: filled ? 'bg-blue-900/50 text-blue-300 border-blue-700/50' : 'bg-blue-900/20 text-blue-600 border-blue-900/30',
    green: filled ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-green-900/20 text-green-600 border-green-900/30',
    stone: filled ? 'bg-stone-700 text-stone-300 border-stone-600' : 'bg-stone-800/50 text-stone-600 border-stone-700/30',
    teal: filled ? 'bg-teal-900/50 text-teal-300 border-teal-700/50' : 'bg-teal-900/20 text-teal-600 border-teal-900/30',
    purple: filled ? 'bg-purple-900/50 text-purple-300 border-purple-700/50' : 'bg-purple-900/20 text-purple-600 border-purple-900/30',
    sky: filled ? 'bg-sky-900/50 text-sky-300 border-sky-700/50' : 'bg-sky-900/20 text-sky-600 border-sky-900/30',
    amber: filled ? 'bg-amber-900/50 text-amber-300 border-amber-700/50' : 'bg-amber-900/20 text-amber-600 border-amber-900/30',
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${colors[color] ?? colors.stone}`}>
      {label}
    </span>
  );
};
