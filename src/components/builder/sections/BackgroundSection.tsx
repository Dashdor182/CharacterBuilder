import React, { useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import { ItemPicker } from '../../shared/ItemPicker';
import { ABILITY_SHORT } from '../../../utils/calculations';
import type { Ability } from '../../../types/pf2e';

const ALL_ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const BackgroundSection: React.FC = () => {
  const { character, setBackground, setBackgroundBoostGroup, setBackgroundSkill } = useCharacterStore();
  const { gameData } = useDataStore();

  const backgroundItems = useMemo(() => {
    if (!gameData) return [];
    return gameData.backgrounds
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(b => {
        const skills = b.system.trainedSkills?.value ?? [];
        return {
          id: b._id,
          name: b.name,
          subtitle: skills.length > 0 ? skills.join(', ') : undefined,
          rawItem: b,
        };
      });
  }, [gameData]);

  const selected = gameData?.backgrounds.find(b => b._id === character.backgroundId) ?? null;
  const boostGroups = selected ? Object.values(selected.system.boosts ?? {}) : [];
  const boostSelections = character.backgroundBoostGroups ?? [];

  if (!gameData) return <p className="text-stone-500 text-sm">Loading data…</p>;

  return (
    <div className="space-y-4">
      <ItemPicker
        items={backgroundItems}
        selectedId={character.backgroundId}
        onSelect={id => setBackground(id)}
        placeholder="Choose a background…"
        modalTitle="Select Background"
        searchPlaceholder="Search backgrounds…"
      />

      {selected && (
        <div className="space-y-4 border-t border-stone-700/50 pt-4">
          <h3 className="text-amber-400 font-semibold">{selected.name}</h3>

          {/* Ability boosts — one selection per group */}
          {boostGroups.length > 0 && (
            <div className="space-y-3">
              {boostGroups.map((group, groupIndex) => {
                const options = (group.value ?? []) as Ability[];
                const isFree = options.length === 0 || options.includes('anything' as Ability) || options.length >= 6;
                const abilities: Ability[] = isFree ? ALL_ABILITIES : options;

                const currentSelection = boostSelections[groupIndex] ?? null;
                // Other groups' selections that should be disabled (can't boost same ability twice)
                const otherSelections = new Set(
                  boostSelections.filter((ab, i) => i !== groupIndex && ab != null) as Ability[]
                );

                const label = isFree
                  ? 'Free Ability Boost'
                  : `Ability Boost (${abilities.map(ab => ABILITY_SHORT[ab]).join(' or ')})`;

                return (
                  <div key={groupIndex}>
                    <label className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-1.5 block">
                      {label} <span className="text-stone-500 normal-case">(choose 1)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {abilities.map(ab => {
                        const isSelected = currentSelection === ab;
                        const isDisabled = !isSelected && otherSelections.has(ab);
                        return (
                          <button
                            key={ab}
                            onClick={() => setBackgroundBoostGroup(groupIndex, isSelected ? null : ab)}
                            disabled={isDisabled}
                            title={isDisabled ? 'Already boosted by another selection' : undefined}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              isDisabled
                                ? 'bg-stone-800/40 text-stone-600 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-amber-600 text-white ring-1 ring-amber-400'
                                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                            }`}
                          >
                            {ABILITY_SHORT[ab]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trained skills */}
          {(selected.system.trainedSkills?.value?.length ?? 0) > 0 && (
            <div>
              <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">
                Trained Skills
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(selected.system.trainedSkills?.value ?? []).map(skill => {
                  const isChoice = skill === 'any';
                  return isChoice ? (
                    <SkillChoiceDropdown
                      key={skill}
                      label="Choose a skill"
                      value={character.backgroundSkill ?? ''}
                      onChange={v => setBackgroundSkill(v as Parameters<typeof setBackgroundSkill>[0] || null, 1)}
                    />
                  ) : (
                    <span key={skill} className="px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-300 capitalize">
                      {skill}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lore skill */}
          {selected.system.trainedLore && (
            <div>
              <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">
                Trained Lore
              </label>
              <span className="ml-2 text-xs text-stone-300">{selected.system.trainedLore} Lore</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ALL_SKILLS = [
  'acrobatics', 'arcana', 'athletics', 'crafting', 'deception', 'diplomacy',
  'intimidation', 'medicine', 'nature', 'occultism', 'performance', 'religion',
  'society', 'stealth', 'survival', 'thievery',
] as const;

const SkillChoiceDropdown: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="px-2 py-0.5 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300 capitalize
               focus:outline-none focus:ring-1 focus:ring-amber-500"
  >
    <option value="">{label}</option>
    {ALL_SKILLS.map(s => (
      <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
    ))}
  </select>
);
