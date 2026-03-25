import React, { useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import {
  ABILITIES, ABILITY_LABELS, ABILITY_SHORT,
  computeAbilityScores, abilityModifier, formatModifier,
} from '../../../utils/calculations';
import type { Ability } from '../../../types/pf2e';

const BOOST_SOURCES = [
  { key: 'level5', label: 'Level 5 Boosts', minLevel: 5 },
  { key: 'level10', label: 'Level 10 Boosts', minLevel: 10 },
  { key: 'level15', label: 'Level 15 Boosts', minLevel: 15 },
  { key: 'level20', label: 'Level 20 Boosts', minLevel: 20 },
] as const;

export const AbilityScoresSection: React.FC = () => {
  const { character, toggleAbilityBoost, setManualAbilityScore } = useCharacterStore();
  const { gameData } = useDataStore();
  const level = character.currentLevel;

  const isManual = character.variantRules.abilityVariant === 'manual';

  const finalScores = useMemo(() =>
    computeAbilityScores(character.abilityBoosts, character.manualAbilityScores),
    [character.abilityBoosts, character.manualAbilityScores]
  );

  const cls = gameData?.classes.find(c => c._id === character.classId);

  // Count boosts used in each source
  const boostCounts = {
    ancestry: Object.values(character.abilityBoosts.ancestry).filter(Boolean).length,
    background: Object.values(character.abilityBoosts.background).filter(Boolean).length,
    class: Object.values(character.abilityBoosts.class).filter(Boolean).length,
    level1: Object.values(character.abilityBoosts.level1).filter(Boolean).length,
  };

  return (
    <div className="space-y-6">
      {/* Final scores display */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ABILITIES.map(ab => {
          const score = finalScores[ab];
          const mod = abilityModifier(score);
          const isHigh = score >= 18;
          const isLow = score <= 8;

          return (
            <div
              key={ab}
              className={`rounded-lg border text-center p-3 ${
                isHigh ? 'border-amber-600/50 bg-amber-900/20' :
                isLow ? 'border-red-700/50 bg-red-900/20' :
                'border-stone-700/50 bg-stone-900/50'
              }`}
            >
              <div className="text-xs text-stone-400 uppercase tracking-wider font-medium">
                {ABILITY_SHORT[ab]}
              </div>
              {isManual ? (
                <input
                  type="number"
                  min={3} max={30}
                  value={character.manualAbilityScores?.[ab] ?? 10}
                  onChange={e => setManualAbilityScore(ab, parseInt(e.target.value) || 10)}
                  className="w-full text-center text-xl font-bold bg-transparent border-0 text-stone-100
                             focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
                />
              ) : (
                <div className="text-2xl font-bold text-stone-100 my-1">{score}</div>
              )}
              <div className={`text-sm font-semibold ${
                mod >= 0 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {formatModifier(mod)}
              </div>
              <div className="text-xs text-stone-600 uppercase tracking-wide mt-1">
                {ABILITY_LABELS[ab].slice(0, 3)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Boost allocation panels */}
      {!isManual && (
        <div className="space-y-4">
          {/* Level 1 free boosts */}
          <BoostPanel
            label="Level 1 Free Boosts (pick 4)"
            source="level1"
            boosts={character.abilityBoosts.level1}
            maxBoosts={4}
            usedBoosts={boostCounts.level1}
            onToggle={toggleAbilityBoost}
          />

          {/* Level-gated boosts */}
          {BOOST_SOURCES.map(({ key, label, minLevel }) => {
            if (level < minLevel) return null;
            const boosts = character.abilityBoosts[key];
            const used = Object.values(boosts).filter(Boolean).length;
            return (
              <BoostPanel
                key={key}
                label={`${label} (pick 4)`}
                source={key}
                boosts={boosts}
                maxBoosts={4}
                usedBoosts={used}
                onToggle={toggleAbilityBoost}
              />
            );
          })}

          {/* Ancestry/Background/Class boosts (read-only) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BoostSummary
              label="Ancestry Boosts"
              activeAbilities={Object.entries(character.abilityBoosts.ancestry)
                .filter(([, v]) => v).map(([k]) => k as Ability)}
              flawAbilities={Object.entries(character.abilityBoosts.ancestryFlaw)
                .filter(([, v]) => v).map(([k]) => k as Ability)}
            />
            <BoostSummary
              label="Background Boosts"
              activeAbilities={Object.entries(character.abilityBoosts.background)
                .filter(([, v]) => v).map(([k]) => k as Ability)}
            />
            <BoostSummary
              label="Class Boost"
              activeAbilities={character.keyAbility ? [character.keyAbility] : []}
              note={cls?.name}
            />
          </div>
        </div>
      )}

      {/* Boost source breakdown table */}
      <BoostBreakdown scores={finalScores} character={character} />
    </div>
  );
};

const BoostPanel: React.FC<{
  label: string;
  source: keyof typeof ABILITIES[number] extends Ability ? never : string;
  boosts: Record<string, boolean>;
  maxBoosts: number;
  usedBoosts: number;
  onToggle: (source: any, ability: Ability) => void;
}> = ({ label, source, boosts, maxBoosts, usedBoosts, onToggle }) => {
  const remaining = maxBoosts - usedBoosts;

  return (
    <div className="bg-stone-900/60 rounded-lg p-3 border border-stone-700/30">
      <div className="flex items-center justify-between mb-2.5">
        <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">
          {label}
        </label>
        <span className={`text-xs font-mono ${remaining === 0 ? 'text-green-400' : 'text-amber-400'}`}>
          {usedBoosts}/{maxBoosts}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ABILITIES.map(ab => {
          const isActive = boosts[ab] ?? false;
          const canToggle = isActive || remaining > 0;
          return (
            <button
              key={ab}
              onClick={() => canToggle && onToggle(source, ab)}
              disabled={!canToggle}
              title={`${ABILITY_LABELS[ab]}${isActive ? ' (click to remove)' : ''}`}
              className={`flex-1 min-w-[50px] py-2 rounded text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-amber-600 text-white'
                  : canToggle
                    ? 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                    : 'bg-stone-900 text-stone-600 cursor-not-allowed'
              }`}
            >
              {ABILITY_SHORT[ab]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const BoostSummary: React.FC<{
  label: string;
  activeAbilities: Ability[];
  flawAbilities?: Ability[];
  note?: string;
}> = ({ label, activeAbilities, flawAbilities = [], note }) => (
  <div className="bg-stone-900/40 rounded-lg p-3 border border-stone-700/20">
    <label className="text-xs text-stone-500 uppercase tracking-wide block mb-2">{label}</label>
    {note && <div className="text-xs text-stone-400 mb-1.5">{note}</div>}
    <div className="flex flex-wrap gap-1.5">
      {activeAbilities.length === 0 && flawAbilities.length === 0 && (
        <span className="text-xs text-stone-600">—</span>
      )}
      {activeAbilities.map(ab => (
        <span key={ab} className="px-2 py-0.5 bg-amber-900/40 text-amber-400 rounded text-xs font-medium">
          +{ABILITY_SHORT[ab]}
        </span>
      ))}
      {flawAbilities.map(ab => (
        <span key={ab} className="px-2 py-0.5 bg-red-900/40 text-red-400 rounded text-xs font-medium">
          −{ABILITY_SHORT[ab]}
        </span>
      ))}
    </div>
  </div>
);

const BoostBreakdown: React.FC<{
  scores: Record<Ability, number>;
  character: { abilityBoosts: any; keyAbility: Ability | null };
}> = ({ scores }) => (
  <div>
    <label className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-2 block">
      Final Ability Scores
    </label>
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-stone-400">
        <thead>
          <tr className="border-b border-stone-700">
            <th className="text-left py-1.5 text-stone-500">Ability</th>
            <th className="text-center py-1.5 text-stone-500">Score</th>
            <th className="text-center py-1.5 text-stone-500">Mod</th>
          </tr>
        </thead>
        <tbody>
          {ABILITIES.map(ab => (
            <tr key={ab} className="border-b border-stone-800">
              <td className="py-1.5 text-stone-300">{ABILITY_LABELS[ab]}</td>
              <td className="py-1.5 text-center font-mono text-stone-200">{scores[ab]}</td>
              <td className={`py-1.5 text-center font-mono ${abilityModifier(scores[ab]) >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {formatModifier(abilityModifier(scores[ab]))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
