import React, { useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import { useUiStore } from '../../../store/uiStore';
import { ItemPicker } from '../../shared/ItemPicker';
import { TooltipTrigger } from '../../shared/Tooltip';
import type { PF2eAncestry } from '../../../types/pf2e';
import { ABILITY_SHORT } from '../../../utils/calculations';
import type { Ability } from '../../../types/pf2e';

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, unique: 3 };
const ALL_ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const AncestrySection: React.FC = () => {
  const { character, setAncestry, setHeritage, selectAncestryFreeBoost, selectAncestryFreeFlaw } = useCharacterStore();
  const { gameData } = useDataStore();
  const { showTooltip, hideTooltip } = useUiStore();

  const ancestryItems = useMemo(() => {
    if (!gameData) return [];
    return gameData.ancestries
      .sort((a, b) => {
        const ra = RARITY_ORDER[a.system.traits?.rarity as keyof typeof RARITY_ORDER ?? 'common'] ?? 0;
        const rb = RARITY_ORDER[b.system.traits?.rarity as keyof typeof RARITY_ORDER ?? 'common'] ?? 0;
        return ra - rb || a.name.localeCompare(b.name);
      })
      .map(a => {
        const rarity = a.system.traits?.rarity ?? 'common';
        return {
          id: a._id,
          name: a.name,
          subtitle: `${a.system.hp} HP · ${a.system.speed} ft`,
          tag: rarity !== 'common' ? rarity : undefined,
          tagColor: rarity === 'rare'
            ? 'bg-blue-900/50 text-blue-400'
            : rarity === 'uncommon'
              ? 'bg-amber-900/50 text-amber-500'
              : undefined,
          rawItem: a,
        };
      });
  }, [gameData]);

  const selected = gameData?.ancestries.find(a => a._id === character.ancestryId) ?? null;

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

  const handleSelectAncestry = (id: string | null) => {
    if (!id || !gameData) { setAncestry(id); return; }
    const ancestry = gameData.ancestries.find(a => a._id === id);
    if (!ancestry) { setAncestry(id); return; }

    // Auto-apply fixed boosts/flaws (single-option groups)
    const fixedBoosts: Partial<Record<Ability, boolean>> = {};
    const fixedFlaws: Partial<Record<Ability, boolean>> = {};

    for (const group of Object.values(ancestry.system.boosts ?? {})) {
      const v = (group.value ?? []) as Ability[];
      if (v.length === 1 && v[0] !== ('anything' as Ability)) {
        fixedBoosts[v[0]] = true;
      }
    }
    for (const group of Object.values(ancestry.system.flaws ?? {})) {
      const v = (group.value ?? []) as Ability[];
      if (v.length === 1) {
        fixedFlaws[v[0]] = true;
      }
    }

    setAncestry(id, fixedBoosts, fixedFlaws);
  };

  if (!gameData) return <p className="text-stone-500 text-sm">Loading data…</p>;

  return (
    <div className="space-y-4">
      <ItemPicker
        items={ancestryItems}
        selectedId={character.ancestryId}
        onSelect={handleSelectAncestry}
        placeholder="Choose an ancestry…"
        modalTitle="Select Ancestry"
        searchPlaceholder="Search ancestries…"
      />

      {selected && (
        <div className="space-y-4 border-t border-stone-700/50 pt-4">
          <div className="flex items-center gap-3 flex-wrap">
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
            </div>
          )}

          {/* Ability boosts */}
          <AncestryBoosts
            ancestry={selected}
            freeBoostSelection={Object.keys(character.abilityBoosts.ancestry).find(
              ab => character.abilityBoosts.ancestry[ab as Ability]
            ) as Ability | undefined}
            freeFlawSelection={Object.keys(character.abilityBoosts.ancestryFlaw).find(
              ab => character.abilityBoosts.ancestryFlaw[ab as Ability]
            ) as Ability | undefined}
            onSelectFreeBoost={selectAncestryFreeBoost}
            onSelectFreeFlaw={selectAncestryFreeFlaw}
          />

          {/* Languages */}
          {(selected.system.languages?.value?.length ?? 0) > 0 && (
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
  freeBoostSelection: Ability | undefined;
  freeFlawSelection: Ability | undefined;
  onSelectFreeBoost: (ability: Ability | null) => void;
  onSelectFreeFlaw: (ability: Ability | null) => void;
}> = ({ ancestry, freeBoostSelection, freeFlawSelection, onSelectFreeBoost, onSelectFreeFlaw }) => {
  const boostGroups = Object.values(ancestry.system.boosts ?? {});
  const flawGroups = Object.values(ancestry.system.flaws ?? {});

  // Classify each boost group as fixed or free
  const fixedBoostAbilities: Ability[] = [];
  const freeBoostOptions: Ability[] = [];

  for (const group of boostGroups) {
    const v = (group.value ?? []) as Ability[];
    if (v.length === 1 && v[0] !== ('anything' as Ability)) {
      fixedBoostAbilities.push(v[0]);
    } else {
      // Free boost: show all 6 if empty/anything, otherwise the specific options
      const opts = (v.length === 0 || v.includes('anything' as Ability)) ? ALL_ABILITIES : v;
      opts.forEach(ab => { if (!freeBoostOptions.includes(ab)) freeBoostOptions.push(ab); });
    }
  }

  const fixedFlawAbilities: Ability[] = [];
  const freeFlawOptions: Ability[] = [];

  for (const group of flawGroups) {
    const v = (group.value ?? []) as Ability[];
    if (v.length === 1) {
      fixedFlawAbilities.push(v[0]);
    } else {
      const opts = v.length === 0 ? ALL_ABILITIES : v;
      opts.forEach(ab => { if (!freeFlawOptions.includes(ab)) freeFlawOptions.push(ab); });
    }
  }

  const hasFreeBoost = freeBoostOptions.length > 0;
  const hasFreeFlaw = freeFlawOptions.length > 0;

  if (fixedBoostAbilities.length === 0 && !hasFreeBoost && fixedFlawAbilities.length === 0 && !hasFreeFlaw) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Fixed boosts */}
      {fixedBoostAbilities.length > 0 && (
        <div>
          <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">
            Ancestry Boosts
          </label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {fixedBoostAbilities.map(ab => (
              <span
                key={ab}
                className="px-2.5 py-1 rounded text-xs font-medium bg-amber-600/30 text-amber-300 border border-amber-600/40"
                title="Fixed boost — always applied"
              >
                {ABILITY_SHORT[ab]} +2
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Free boost (user picks one) */}
      {hasFreeBoost && (
        <div>
          <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">
            Free Ancestry Boost <span className="text-stone-500 normal-case">(choose 1)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {freeBoostOptions.map(ab => {
              const isSelected = freeBoostSelection === ab;
              const isFixed = fixedBoostAbilities.includes(ab);
              return (
                <button
                  key={ab}
                  onClick={() => onSelectFreeBoost(isSelected ? null : ab)}
                  disabled={isFixed}
                  title={isFixed ? 'Already a fixed boost' : undefined}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    isFixed
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
      )}

      {/* Fixed flaws */}
      {fixedFlawAbilities.length > 0 && (
        <div>
          <label className="text-xs text-red-400/80 font-medium uppercase tracking-wide">
            Ancestry Flaws
          </label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {fixedFlawAbilities.map(ab => (
              <span
                key={ab}
                className="px-2.5 py-1 rounded text-xs font-medium bg-red-900/30 text-red-400 border border-red-800/40"
                title="Fixed flaw — always applied"
              >
                {ABILITY_SHORT[ab]} −2
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Free flaw (rare — user picks one) */}
      {hasFreeFlaw && (
        <div>
          <label className="text-xs text-red-400/80 font-medium uppercase tracking-wide">
            Free Ancestry Flaw <span className="text-stone-500 normal-case">(choose 1)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {freeFlawOptions.map(ab => {
              const isSelected = freeFlawSelection === ab;
              return (
                <button
                  key={ab}
                  onClick={() => onSelectFreeFlaw(isSelected ? null : ab)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-red-700 text-white ring-1 ring-red-500'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {ABILITY_SHORT[ab]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
