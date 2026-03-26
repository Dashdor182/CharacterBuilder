import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import { useUiStore } from '../../../store/uiStore';
import { SearchBar } from '../../shared/SearchBar';
import { TooltipTrigger } from '../../shared/Tooltip';
import type { PF2eAncestry } from '../../../types/pf2e';
import { ABILITY_SHORT } from '../../../utils/calculations';
import type { Ability } from '../../../types/pf2e';

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, unique: 3 };

export const AncestrySection: React.FC = () => {
  const { character, setAncestry, setHeritage, toggleAbilityBoost } = useCharacterStore();
  const { gameData } = useDataStore();
  const { showTooltip, hideTooltip } = useUiStore();
  const [search, setSearch] = useState('');

  const ancestries = useMemo(() => {
    if (!gameData) return [];
    const q = search.toLowerCase();
    return gameData.ancestries
      .filter(a =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.system.traits?.value ?? []).some(t => t.includes(q))
      )
      .sort((a, b) => {
        const ra = RARITY_ORDER[a.system.traits?.rarity as keyof typeof RARITY_ORDER ?? 'common'] ?? 0;
        const rb = RARITY_ORDER[b.system.traits?.rarity as keyof typeof RARITY_ORDER ?? 'common'] ?? 0;
        return ra - rb || a.name.localeCompare(b.name);
      });
  }, [gameData, search]);

  const selected = gameData?.ancestries.find(a => a._id === character.ancestryId) ?? null;

  // Heritages for selected ancestry
  const heritages = useMemo(() => {
    if (!gameData || !selected) return [];
    const ancestryName = selected.name.toLowerCase().replace(/\s+/g, '-');
    return gameData.ancestryFeatures.filter(f =>
      (f.system.featType?.value as string) === 'heritage' &&
      (f.system.traits?.value ?? []).some(t =>
        t.toLowerCase() === ancestryName ||
        t.toLowerCase().includes(ancestryName.split('-')[0])
      )
    );
  }, [gameData, selected]);

  const selectedHeritage = heritages.find(h => h._id === character.heritageId) ?? null;

  const handleSelect = (a: PF2eAncestry) => {
    if (a._id === character.ancestryId) {
      setAncestry(null);
    } else {
      setAncestry(a._id);
    }
  };

  if (!gameData) return <p className="text-stone-500 text-sm">Loading data…</p>;

  return (
    <div className="space-y-5">
      {/* Search */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search ancestries…" />

      {/* Ancestry grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {ancestries.map(a => {
          const isSelected = a._id === character.ancestryId;
          const rarity = a.system.traits?.rarity ?? 'common';

          return (
            <TooltipTrigger
              key={a._id}
              item={a}
              onShow={(item, rect) => showTooltip(item, rect)}
              className="block"
            >
              <button
                onClick={() => handleSelect(a)}
                onMouseLeave={hideTooltip}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm
                  ${isSelected
                    ? 'border-amber-500 bg-amber-600/20 text-amber-300'
                    : rarity !== 'common'
                      ? 'border-stone-600 bg-stone-800/50 text-stone-300 hover:border-stone-500 hover:bg-stone-800'
                      : 'border-stone-700/50 bg-stone-900/50 text-stone-400 hover:border-stone-600 hover:text-stone-300 hover:bg-stone-800/50'
                  }
                `}
              >
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {a.system.hp} HP · {a.system.speed} ft
                  {rarity !== 'common' && (
                    <span className={`ml-1 ${rarity === 'rare' ? 'text-blue-400' : 'text-amber-500'}`}>
                      [{rarity}]
                    </span>
                  )}
                </div>
              </button>
            </TooltipTrigger>
          );
        })}
      </div>

      {/* Selected ancestry details */}
      {selected && (
        <div className="space-y-4 border-t border-stone-700/50 pt-4">
          <div className="flex items-center gap-3">
            <h3 className="text-amber-400 font-semibold">{selected.name}</h3>
            <div className="text-xs text-stone-400">
              {selected.system.hp} HP · Speed {selected.system.speed} ft · {selected.system.size.toUpperCase()}
            </div>
          </div>

          {/* Heritage selection */}
          {heritages.length > 0 && (
            <div>
              <label className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-2 block">
                Heritage
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {heritages.map(h => (
                  <TooltipTrigger
                    key={h._id}
                    item={h}
                    onShow={(item, rect) => showTooltip(item, rect)}
                    className="block"
                  >
                    <button
                      onClick={() => setHeritage(h._id === character.heritageId ? null : h._id)}
                      onMouseLeave={hideTooltip}
                      className={`
                        w-full text-left px-3 py-2 rounded border text-xs transition-all
                        ${h._id === character.heritageId
                          ? 'border-amber-500 bg-amber-600/20 text-amber-300'
                          : 'border-stone-700/50 bg-stone-900 text-stone-400 hover:border-stone-600 hover:text-stone-300'
                        }
                      `}
                    >
                      {h.name}
                    </button>
                  </TooltipTrigger>
                ))}
              </div>
              {selectedHeritage && (
                <p className="text-xs text-stone-500 mt-2">Selected: {selectedHeritage.name}</p>
              )}
            </div>
          )}

          {/* Ability boosts from ancestry */}
          <AncestryBoosts ancestry={selected} character={character} onToggle={toggleAbilityBoost} />

          {/* Languages */}
          {selected.system.languages?.value?.length > 0 && (
            <div>
              <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">Languages</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(selected.system.languages?.value ?? []).map(lang => (
                  <span key={lang} className="px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-300 capitalize">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Traits */}
          {(selected.system.traits?.value?.length ?? 0) > 0 && (
            <div>
              <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">Traits</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(selected.system.traits?.value ?? []).map(t => (
                  <span key={t} className="px-2 py-0.5 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300 capitalize">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AncestryBoosts: React.FC<{
  ancestry: PF2eAncestry;
  character: { abilityBoosts: { ancestry: Record<string, boolean>; ancestryFlaw: Record<string, boolean> } };
  onToggle: (source: 'ancestry' | 'ancestryFlaw', ability: Ability) => void;
}> = ({ ancestry, character, onToggle }) => {
  const boostGroups = ancestry.system.boosts ?? [];
  const flawGroups = ancestry.system.flaws ?? [];

  return (
    <div className="space-y-3">
      {/* Boosts */}
      {boostGroups.map((group, i) => {
        const options = group.value ?? [];
        // If "anything" (empty or contains 'anything'), show all abilities
        const isFree = options.length === 0 || options.includes('anything' as Ability);
        const abilities: Ability[] = isFree
          ? ['str', 'dex', 'con', 'int', 'wis', 'cha']
          : options;

        return (
          <div key={i}>
            <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">
              Ancestry Boost {boostGroups.length > 1 ? i + 1 : ''}
              {isFree && ' (Free)'}
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {abilities.map(ab => {
                const isSelected = character.abilityBoosts.ancestry[ab];
                return (
                  <button
                    key={ab}
                    onClick={() => onToggle('ancestry', ab)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-amber-600 text-white'
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

      {/* Flaws */}
      {flawGroups.length > 0 && (
        <div>
          <label className="text-xs text-red-400 font-medium uppercase tracking-wide">
            Ancestry Flaw (−2)
          </label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {flawGroups.map((group, i) => {
              const options = (group.value ?? []) as Ability[];
              const isFree = options.length === 0;
              const abilities: Ability[] = isFree
                ? ['str', 'dex', 'con', 'int', 'wis', 'cha']
                : options;
              return abilities.map(ab => (
                <button
                  key={`${i}-${ab}`}
                  onClick={() => onToggle('ancestryFlaw', ab)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    character.abilityBoosts.ancestryFlaw[ab]
                      ? 'bg-red-700 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {ABILITY_SHORT[ab]}
                </button>
              ));
            })}
          </div>
        </div>
      )}
    </div>
  );
};
