import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import { useUiStore } from '../../../store/uiStore';
import { SearchBar } from '../../shared/SearchBar';
import { TooltipTrigger } from '../../shared/Tooltip';
import { ABILITY_SHORT } from '../../../utils/calculations';
import type { Ability } from '../../../types/pf2e';

export const BackgroundSection: React.FC = () => {
  const { character, setBackground, toggleAbilityBoost, setBackgroundSkill } = useCharacterStore();
  const { gameData } = useDataStore();
  const { showTooltip, hideTooltip } = useUiStore();
  const [search, setSearch] = useState('');

  const backgrounds = useMemo(() => {
    if (!gameData) return [];
    const q = search.toLowerCase();
    return gameData.backgrounds
      .filter(b => !q || b.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [gameData, search]);

  const selected = gameData?.backgrounds.find(b => b._id === character.backgroundId) ?? null;

  if (!gameData) return <p className="text-stone-500 text-sm">Loading data…</p>;

  return (
    <div className="space-y-5">
      <SearchBar value={search} onChange={setSearch} placeholder="Search backgrounds…" />

      {/* Background list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {backgrounds.map(b => {
          const isSelected = b._id === character.backgroundId;
          const trainedSkills = b.system.trainedSkills?.value ?? [];

          return (
            <TooltipTrigger
              key={b._id}
              item={b}
              onShow={(item, rect) => showTooltip(item, rect)}
              className="block"
            >
              <button
                onClick={() => setBackground(isSelected ? null : b._id)}
                onMouseLeave={hideTooltip}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm
                  ${isSelected
                    ? 'border-amber-500 bg-amber-600/20 text-amber-300'
                    : 'border-stone-700/50 bg-stone-900/50 text-stone-400 hover:border-stone-600 hover:text-stone-300 hover:bg-stone-800/50'
                  }
                `}
              >
                <div className="font-medium">{b.name}</div>
                {trainedSkills.length > 0 && (
                  <div className="text-xs text-stone-500 mt-0.5 capitalize">
                    {trainedSkills.join(', ')}
                  </div>
                )}
              </button>
            </TooltipTrigger>
          );
        })}
      </div>

      {/* Selected background details */}
      {selected && (
        <div className="space-y-4 border-t border-stone-700/50 pt-4">
          <h3 className="text-amber-400 font-semibold">{selected.name}</h3>

          {/* Ability boosts */}
          {Object.values(selected.system.boosts ?? {}).length > 0 && (
            <div>
              <label className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-2 block">
                Background Ability Boosts
              </label>
              <div className="space-y-2">
                {Object.values(selected.system.boosts ?? {}).map((group, i) => {
                  const options = group.value ?? [];
                  const isFree = options.length === 0 || options.includes('anything' as Ability);
                  const abilities: Ability[] = isFree
                    ? ['str', 'dex', 'con', 'int', 'wis', 'cha']
                    : (options as Ability[]);

                  return (
                    <div key={i} className="flex flex-wrap gap-1.5">
                      {abilities.map(ab => {
                        const isSelected2 = character.abilityBoosts.background[ab];
                        return (
                          <button
                            key={ab}
                            onClick={() => toggleAbilityBoost('background', ab)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              isSelected2
                                ? 'bg-amber-600 text-white'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                            }`}
                          >
                            {ABILITY_SHORT[ab]}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
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
                  const isChoiceSkill = skill === 'any';
                  return isChoiceSkill ? (
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
