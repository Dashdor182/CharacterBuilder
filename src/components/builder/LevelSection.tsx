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

/* Tonal chips — no border, background shift only */
const FEAT_CHIP: Record<string, string> = {
  class:     'bg-blue-950/60 text-blue-300',
  ancestry:  'bg-emerald-950/60 text-emerald-300',
  general:   'bg-ledger-surface-highest text-ledger-text-dim',
  skill:     'bg-teal-950/60 text-teal-300',
  archetype: 'bg-purple-950/60 text-purple-300',
};

const BOOST_KEY: Record<number, keyof import('../../types/character').AbilityBoostState> = {
  1: 'level1', 5: 'level5', 10: 'level10', 15: 'level15', 20: 'level20',
};

export const LevelSection: React.FC<{ level: number }> = ({ level }) => {
  const { character, setFeat, toggleAbilityBoost } = useCharacterStore();
  const { gameData } = useDataStore();
  const { showTooltip, hideTooltip } = useUiStore();

  const [open, setOpen] = useState(level === 1);
  const [pickerSlot, setPickerSlot] = useState<ExpandedSlot | null>(null);

  const cls = gameData?.classes.find(c => c._id === character.classId) ?? null;
  const ancestry = gameData?.ancestries.find(a => a._id === character.ancestryId) ?? null;

  const slotsForLevel = useMemo((): ExpandedSlot[] => {
    const classFeatLvls    = getClassFeatLevels(cls);
    const ancestryFeatLvls = getAncestryFeatLevels(cls, character.variantRules.ancestryParagon);
    const generalFeatLvls  = getGeneralFeatLevels(cls);
    const skillFeatLvls    = getSkillFeatLevels(cls);

    const types: Array<{ type: FeatSlot['type']; id: string }> = [];
    if (classFeatLvls.includes(level))    types.push({ type: 'class',     id: `class-${level}` });
    if (ancestryFeatLvls.includes(level)) types.push({ type: 'ancestry',  id: `ancestry-${level}` });
    if (generalFeatLvls.includes(level))  types.push({ type: 'general',   id: `general-${level}` });
    if (skillFeatLvls.includes(level))    types.push({ type: 'skill',     id: `skill-${level}` });
    if (character.variantRules.freeArchetype && level % 2 === 0)
      types.push({ type: 'archetype', id: `archetype-${level}` });

    const li = level - 1;
    const stored = character.levels[li]?.feats ?? [];
    return types.map(({ type, id }) => ({
      id, type, level, levelIndex: li,
      selectedFeatId: stored.find(f => f.id === id)?.selectedFeatId ?? null,
    }));
  }, [cls, ancestry, character.variantRules, character.levels, level]);

  const boostKey = BOOST_KEY[level] ?? null;
  const boosts = boostKey ? character.abilityBoosts[boostKey] as Partial<Record<Ability, boolean>> : null;
  const boostCount = boosts ? Object.values(boosts).filter(Boolean).length : 0;

  const skillIncreaseLevels = useMemo(() => getSkillIncreaseLevels(cls), [cls]);
  const hasSkillIncrease = skillIncreaseLevels.includes(level);

  const hasAnyContent = slotsForLevel.length > 0 || boostKey !== null;
  const pendingFeats  = slotsForLevel.filter(s => !s.selectedFeatId).length;
  const pendingBoosts = boostKey ? Math.max(0, 4 - boostCount) : 0;
  const totalPending  = pendingFeats + pendingBoosts;
  const isComplete    = hasAnyContent && totalPending === 0;

  /* Tonal surface: pending = warm amber wash, complete = cool green, none = flat */
  const containerBg = !hasAnyContent
    ? 'bg-ledger-surface'
    : totalPending > 0
      ? open ? 'bg-[#1e1a12]' : 'bg-[#1a1710]'
      : open ? 'bg-[#111a13]' : 'bg-[#0f1710]';

  const levelNumColor = !hasAnyContent
    ? 'text-ledger-text-muted'
    : totalPending > 0
      ? 'text-ledger-gold'
      : 'text-ledger-success';

  const levelLabel = level === 1 ? 'ORIGIN' : isComplete ? 'DONE' : 'LEVEL';

  return (
    <div className={`rounded-sm overflow-hidden transition-colors ${containerBg}`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-5 px-5 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Large editorial level number */}
        <div className="flex-shrink-0 w-10 flex flex-col items-end">
          <span className={`font-serif font-bold leading-none ${levelNumColor} ${level < 10 ? 'text-2xl' : 'text-xl'}`}>
            {String(level).padStart(2, '0')}
          </span>
          <span className="text-[8px] font-sans font-semibold tracking-[0.12em] text-ledger-text-muted mt-0.5">
            {levelLabel}
          </span>
        </div>

        {/* Status + chips */}
        <div className="flex-1 flex items-center gap-2 min-w-0 flex-wrap">
          {hasAnyContent && totalPending > 0 && (
            <span className="flex-shrink-0 text-[10px] font-sans font-semibold text-ledger-gold tracking-wide">
              {totalPending} pending
            </span>
          )}
          {hasAnyContent && totalPending === 0 && (
            <span className="flex-shrink-0 text-[10px] font-sans font-semibold text-ledger-success tracking-wide">✓</span>
          )}
          {!hasAnyContent && (
            <span className="flex-shrink-0 text-[10px] text-ledger-text-muted">—</span>
          )}

          {slotsForLevel.map(slot => {
            const feat = slot.selectedFeatId
              ? gameData?.feats.find(f => f._id === slot.selectedFeatId)
              : null;
            const chip = FEAT_CHIP[slot.type] ?? 'bg-ledger-surface-highest text-ledger-text-dim';
            return (
              <span
                key={slot.id}
                className={`text-[10px] font-sans px-2 py-0.5 rounded-sm ${chip} ${!feat ? 'opacity-40' : ''}`}
              >
                {feat ? feat.name : `${FEAT_LABEL[slot.type]} feat`}
              </span>
            );
          })}

          {boostKey && (
            <span className={`text-[10px] font-sans px-2 py-0.5 rounded-sm ${
              boostCount >= 4
                ? 'bg-ledger-gold/15 text-ledger-gold'
                : 'bg-ledger-surface-highest text-ledger-text-muted'
            }`}>
              Boosts {boostCount}/4
            </span>
          )}
          {hasSkillIncrease && (
            <span className="text-[10px] font-sans px-2 py-0.5 rounded-sm bg-ledger-surface-highest text-ledger-text-muted">
              Skill+
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-ledger-text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-2 bg-ledger-surface-lowest/40">

          {slotsForLevel.length === 0 && !boostKey && (
            <p className="text-xs font-sans text-ledger-text-muted py-3">
              {level === 1
                ? 'Select an ancestry and class to see feat slots.'
                : 'No choices at this level with current selections.'}
            </p>
          )}

          {/* Feat slots */}
          {slotsForLevel.map(slot => {
            const feat = slot.selectedFeatId
              ? gameData?.feats.find(f => f._id === slot.selectedFeatId) ?? null
              : null;
            const chip = FEAT_CHIP[slot.type] ?? 'bg-ledger-surface-highest text-ledger-text-dim';
            return (
              <div key={slot.id} className="flex items-center gap-3">
                <span className={`text-[9px] font-sans font-semibold px-2 py-1 rounded-sm tracking-[0.08em] uppercase flex-shrink-0 ${chip}`}>
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
                      className="w-full text-left px-3 py-2 bg-ledger-surface hover:bg-ledger-surface-high rounded-sm text-sm font-sans text-ledger-text transition-colors"
                    >
                      {feat.name}
                      <span className="text-ledger-text-muted text-xs ml-2 font-normal">
                        Lv {feat.system.level?.value}
                      </span>
                    </button>
                  </TooltipTrigger>
                ) : (
                  <button
                    onClick={() => setPickerSlot(slot)}
                    className="flex-1 text-left px-3 py-2 bg-ledger-surface-lowest hover:bg-ledger-surface-low
                               rounded-sm text-sm font-sans text-ledger-text-muted hover:text-ledger-text-dim transition-colors"
                  >
                    + Choose {FEAT_LABEL[slot.type]} Feat
                  </button>
                )}

                {feat && (
                  <button
                    onClick={() => setFeat(slot.levelIndex, slot.id, null)}
                    className="text-ledger-text-muted hover:text-ledger-error flex-shrink-0 text-sm px-1 transition-colors"
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
            <div className="mt-1 bg-ledger-surface rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-ledger-text-dim">
                  Ability Boosts
                </span>
                <span className={`text-xs font-serif font-bold ${boostCount >= 4 ? 'text-ledger-gold' : 'text-ledger-text-muted'}`}>
                  {boostCount} / 4
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
                      className={`flex-1 min-w-[44px] py-2 rounded-sm text-xs font-sans font-semibold tracking-wide transition-colors ${
                        active
                          ? 'text-ledger-on-gold'
                          : canPick
                            ? 'bg-ledger-surface-high text-ledger-text-dim hover:bg-ledger-surface-highest hover:text-ledger-text'
                            : 'bg-ledger-surface-lowest text-ledger-text-muted cursor-not-allowed'
                      }`}
                      style={active ? { background: 'linear-gradient(135deg, #e9c176, #c5a059)' } : undefined}
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
            <p className="text-[11px] font-sans text-ledger-text-muted flex items-center gap-2 pt-1">
              <span className="text-ledger-gold/60">◆</span>
              <span>Skill increase available — use the <strong className="text-ledger-text-dim">Skills</strong> button above.</span>
            </p>
          )}
        </div>
      )}

      {/* Feat picker */}
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
