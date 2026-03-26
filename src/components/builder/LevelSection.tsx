import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { TooltipTrigger } from '../shared/Tooltip';
import { FeatPickerModal } from './sections/FeatsSection';
import {
  getClassFeatLevels, getAncestryFeatLevels, getGeneralFeatLevels, getSkillFeatLevels,
  getSkillIncreaseLevels, ABILITIES, ABILITY_SHORT,
} from '../../utils/calculations';
import type { FeatSlot } from '../../types/character';
import type { Ability } from '../../types/pf2e';

type ExpandedSlot = FeatSlot & { levelIndex: number };

const FEAT_LABEL: Record<string, string> = {
  class: 'Class', ancestry: 'Ancestry', general: 'General',
  skill: 'Skill', archetype: 'Archetype', bonus: 'Bonus',
};

const FEAT_COLOR: Record<string, string> = {
  class:     'bg-blue-900/40 text-blue-400 border-blue-900/40',
  ancestry:  'bg-green-900/40 text-green-400 border-green-900/40',
  general:   'bg-stone-700/60 text-stone-400 border-stone-700/40',
  skill:     'bg-teal-900/40 text-teal-400 border-teal-900/40',
  archetype: 'bg-purple-900/40 text-purple-400 border-purple-900/40',
};

const BOOST_KEY: Record<number, keyof import('../../types/character').AbilityBoostState> = {
  1: 'level1', 5: 'level5', 10: 'level10', 15: 'level15', 20: 'level20',
};

export const LevelSection: React.FC<{ level: number }> = ({ level }) => {
  const { character, setFeat, toggleAbilityBoost } = useCharacterStore();
  const { gameData } = useDataStore();
  const { showTooltip, hideTooltip } = useUiStore();

  // Default open only for level 1 (or expand on demand)
  const [open, setOpen] = useState(level === 1);
  const [pickerSlot, setPickerSlot] = useState<ExpandedSlot | null>(null);

  const cls = gameData?.classes.find(c => c._id === character.classId) ?? null;
  const ancestry = gameData?.ancestries.find(a => a._id === character.ancestryId) ?? null;

  // Which feat types appear at this level
  const slotsForLevel = useMemo((): ExpandedSlot[] => {
    const classFeatLvls   = getClassFeatLevels(cls);
    const ancestryFeatLvls = getAncestryFeatLevels(cls, character.variantRules.ancestryParagon);
    const generalFeatLvls  = getGeneralFeatLevels(cls);
    const skillFeatLvls    = getSkillFeatLevels(cls);

    const types: Array<{ type: FeatSlot['type']; id: string }> = [];
    if (classFeatLvls.includes(level))   types.push({ type: 'class',     id: `class-${level}` });
    if (ancestryFeatLvls.includes(level)) types.push({ type: 'ancestry',  id: `ancestry-${level}` });
    if (generalFeatLvls.includes(level))  types.push({ type: 'general',   id: `general-${level}` });
    if (skillFeatLvls.includes(level))    types.push({ type: 'skill',     id: `skill-${level}` });
    if (character.variantRules.freeArchetype && level % 2 === 0)
      types.push({ type: 'archetype', id: `archetype-${level}` });

    const li = level - 1;
    const stored = character.levels[li]?.feats ?? [];
    return types.map(({ type, id }) => ({
      id,
      type,
      level,
      levelIndex: li,
      selectedFeatId: stored.find(f => f.id === id)?.selectedFeatId ?? null,
    }));
  }, [cls, ancestry, character.variantRules, character.levels, level]);

  // Ability boosts
  const boostKey = BOOST_KEY[level] ?? null;
  const boosts = boostKey ? character.abilityBoosts[boostKey] as Partial<Record<Ability, boolean>> : null;
  const boostCount = boosts ? Object.values(boosts).filter(Boolean).length : 0;

  // Skill increases
  const skillIncreaseLevels = useMemo(() => getSkillIncreaseLevels(cls), [cls]);
  const hasSkillIncrease = skillIncreaseLevels.includes(level);

  // Pending count (only meaningful if a class/ancestry is chosen)
  const hasAnyContent = slotsForLevel.length > 0 || boostKey !== null;
  const pendingFeats   = slotsForLevel.filter(s => !s.selectedFeatId).length;
  const pendingBoosts  = boostKey ? Math.max(0, 4 - boostCount) : 0;
  const totalPending   = pendingFeats + pendingBoosts;

  return (
    <div className={`rounded-lg border transition-colors ${
      open ? 'border-stone-700/60' : 'border-stone-800/40'
    }`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-800/20 rounded-lg transition-colors"
      >
        {/* Level label */}
        <span className="text-xs font-bold text-stone-500 w-14 flex-shrink-0 uppercase tracking-wide">
          Lv {level}
        </span>

        {/* Status badge */}
        {hasAnyContent ? (
          totalPending > 0 ? (
            <span className="flex-shrink-0 flex items-center gap-1 text-xs text-amber-500/80 font-medium">
              <span>⚠</span>
              <span>{totalPending} pending</span>
            </span>
          ) : (
            <span className="flex-shrink-0 text-xs text-green-600 font-medium">✓</span>
          )
        ) : (
          <span className="flex-shrink-0 text-xs text-stone-800">—</span>
        )}

        {/* Summary chips */}
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {slotsForLevel.map(slot => {
            const feat = slot.selectedFeatId
              ? gameData?.feats.find(f => f._id === slot.selectedFeatId)
              : null;
            const color = FEAT_COLOR[slot.type] ?? 'bg-stone-800 text-stone-500';
            return (
              <span
                key={slot.id}
                className={`text-xs px-1.5 py-0.5 rounded border ${color} ${!feat ? 'opacity-40' : ''}`}
              >
                {feat ? feat.name : `${FEAT_LABEL[slot.type]} feat`}
              </span>
            );
          })}
          {boostKey && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${
              boostCount >= 4
                ? 'bg-amber-900/30 text-amber-500 border-amber-900/30'
                : 'bg-stone-800/40 text-stone-600 border-stone-800/30'
            }`}>
              Boosts {boostCount}/4
            </span>
          )}
          {hasSkillIncrease && (
            <span className="text-xs px-1.5 py-0.5 rounded border bg-stone-800/30 text-stone-600 border-stone-800/20">
              Skill+
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-stone-600 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-stone-800/40">

          {/* Empty state: no class/ancestry selected */}
          {slotsForLevel.length === 0 && !boostKey && (
            <p className="text-xs text-stone-700 py-2">
              {level === 1
                ? 'Select an ancestry and class to see feat slots.'
                : 'No choices available at this level with current selections.'}
            </p>
          )}

          {/* Feat slots */}
          {slotsForLevel.map(slot => {
            const feat = slot.selectedFeatId
              ? gameData?.feats.find(f => f._id === slot.selectedFeatId) ?? null
              : null;
            const color = FEAT_COLOR[slot.type] ?? 'bg-stone-800 text-stone-500';
            return (
              <div key={slot.id} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium uppercase tracking-wide flex-shrink-0 ${color}`}>
                  {FEAT_LABEL[slot.type]}
                </span>

                {feat ? (
                  <TooltipTrigger
                    item={feat}
                    onShow={(item, rect) => showTooltip(item, rect)}
                    className="flex-1 min-w-0"
                  >
                    <button
                      onClick={() => setPickerSlot(slot)}
                      onMouseLeave={hideTooltip}
                      className="w-full text-left px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded text-sm text-stone-200 transition-colors"
                    >
                      {feat.name}
                      <span className="text-stone-500 text-xs ml-2">Lv {feat.system.level?.value}</span>
                    </button>
                  </TooltipTrigger>
                ) : (
                  <button
                    onClick={() => setPickerSlot(slot)}
                    className="flex-1 text-left px-3 py-1.5 border border-dashed border-stone-700 hover:border-stone-500 rounded text-sm text-stone-600 hover:text-stone-400 transition-colors"
                  >
                    + Choose {FEAT_LABEL[slot.type]} Feat
                  </button>
                )}

                {feat && (
                  <button
                    onClick={() => setFeat(slot.levelIndex, slot.id, null)}
                    className="text-stone-700 hover:text-red-400 flex-shrink-0 text-sm px-1 transition-colors"
                    title="Remove feat"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* Ability boost panel */}
          {boostKey && boosts !== null && (
            <div className="mt-1 bg-stone-900/60 rounded-lg p-3 border border-stone-700/30">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs text-stone-400 font-medium uppercase tracking-wide">
                  Ability Boosts — choose 4
                </span>
                <span className={`text-xs font-mono ${boostCount >= 4 ? 'text-green-400' : 'text-amber-400'}`}>
                  {boostCount}/4
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ABILITIES.map(ab => {
                  const active = !!(boosts as Record<string, boolean>)[ab];
                  const canPick = active || boostCount < 4;
                  return (
                    <button
                      key={ab}
                      onClick={() => canPick && toggleAbilityBoost(boostKey, ab)}
                      disabled={!canPick}
                      className={`flex-1 min-w-[48px] py-2 rounded text-xs font-bold transition-colors ${
                        active
                          ? 'bg-amber-600 text-white'
                          : canPick
                            ? 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                            : 'bg-stone-900 text-stone-700 cursor-not-allowed'
                      }`}
                    >
                      {ABILITY_SHORT[ab]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skill increase note */}
          {hasSkillIncrease && (
            <p className="text-xs text-stone-600 flex items-center gap-1.5 pt-1">
              <span>📚</span>
              <span>Skill increase available — use the <strong className="text-stone-500">Skills</strong> button above.</span>
            </p>
          )}
        </div>
      )}

      {/* Feat picker modal */}
      {pickerSlot && gameData && (
        <FeatPickerModal
          slot={pickerSlot}
          character={character}
          gameData={gameData}
          onSelect={featId => { setFeat(pickerSlot.levelIndex, pickerSlot.id, featId); setPickerSlot(null); }}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
};
