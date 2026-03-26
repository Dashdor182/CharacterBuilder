import React, { useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import { useUiStore } from '../../../store/uiStore';
import { ItemPicker } from '../../shared/ItemPicker';
import { ABILITY_SHORT, PROF_RANK_LABELS } from '../../../utils/calculations';
import type { Ability, PF2eClass } from '../../../types/pf2e';

export const ClassSection: React.FC = () => {
  const { character, setClass, setKeyAbility } = useCharacterStore();
  const { gameData } = useDataStore();
  const { showConfirm } = useUiStore();

  const classItems = useMemo(() => {
    if (!gameData) return [];
    return gameData.classes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => {
        const keyAbilities = c.system.keyAbility?.value ?? [];
        return {
          id: c._id,
          name: c.name,
          subtitle: `${c.system.hp} HP${keyAbilities.length > 0 ? ` · ${keyAbilities.map(a => ABILITY_SHORT[a as Ability]).join('/')}` : ''}`,
        };
      });
  }, [gameData]);

  const selected = gameData?.classes.find(c => c._id === character.classId) ?? null;

  const handleSelect = (id: string | null) => {
    if (!id) {
      setClass(null);
      return;
    }
    if (character.classId && character.classId !== id) {
      showConfirm(
        'Changing your class will clear class feats and spellcasting choices. Continue?',
        () => setClass(id, true),
      );
    } else {
      setClass(id, false);
    }
  };

  if (!gameData) return <p className="text-stone-500 text-sm">Loading data…</p>;

  return (
    <div className="space-y-4">
      <ItemPicker
        items={classItems}
        selectedId={character.classId}
        onSelect={handleSelect}
        placeholder="Choose a class…"
        searchPlaceholder="Search classes…"
      />

      {selected && (
        <ClassDetails
          cls={selected}
          character={character}
          onKeyAbility={setKeyAbility}
        />
      )}
    </div>
  );
};

const ClassDetails: React.FC<{
  cls: PF2eClass;
  character: { keyAbility: Ability | null; abilityBoosts: { class: Record<string, boolean> } };
  onKeyAbility: (ability: Ability | null) => void;
}> = ({ cls, character, onKeyAbility }) => {
  const keyAbilities = cls.system.keyAbility?.value ?? [];

  return (
    <div className="space-y-4 border-t border-stone-700/50 pt-4">
      <h3 className="text-amber-400 font-semibold">{cls.name}</h3>

      {/* Key Ability */}
      {keyAbilities.length > 1 && (
        <div>
          <label className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-2 block">
            Key Ability Score
          </label>
          <div className="flex gap-2">
            {keyAbilities.map(ab => (
              <button
                key={ab}
                onClick={() => onKeyAbility(character.keyAbility === ab ? null : ab as Ability)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  character.keyAbility === ab
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                }`}
              >
                {ABILITY_SHORT[ab as Ability]}
              </button>
            ))}
          </div>
        </div>
      )}

      {keyAbilities.length === 1 && (
        <div>
          <span className="text-xs text-stone-400 font-medium uppercase tracking-wide">Key Ability: </span>
          <span className="text-stone-300 text-sm">{ABILITY_SHORT[keyAbilities[0] as Ability]}</span>
        </div>
      )}

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatLine label="HP per Level" value={`${cls.system.hp}`} />
        <StatLine
          label="Perception"
          value={PROF_RANK_LABELS[cls.system.perception?.rank ?? 0]}
        />
        <StatLine
          label="Fortitude"
          value={PROF_RANK_LABELS[cls.system.savingThrows?.fortitude?.rank ?? 0]}
        />
        <StatLine
          label="Reflex"
          value={PROF_RANK_LABELS[cls.system.savingThrows?.reflex?.rank ?? 0]}
        />
        <StatLine
          label="Will"
          value={PROF_RANK_LABELS[cls.system.savingThrows?.will?.rank ?? 0]}
        />
        {cls.system.spellcasting && (
          <StatLine label="Spellcasting" value={cls.system.spellcasting} />
        )}
      </div>

      {/* Weapon/Armor proficiencies */}
      <div>
        <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">Proficiencies</label>
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-stone-400">
          {Object.entries(cls.system.attacks ?? {}).map(([key, val]) => {
            const v = val as { rank: number; name?: string };
            if (!v.rank) return null;
            return (
              <div key={key} className="flex gap-1">
                <span className="text-stone-500">{v.name || key}:</span>
                <span className="text-stone-300">{PROF_RANK_LABELS[v.rank]}</span>
              </div>
            );
          })}
          {Object.entries(cls.system.defenses ?? {}).map(([key, val]) => {
            const v = val as { rank: number; name?: string };
            if (!v.rank) return null;
            return (
              <div key={key} className="flex gap-1">
                <span className="text-stone-500">{v.name || key}:</span>
                <span className="text-stone-300">{PROF_RANK_LABELS[v.rank]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trained skills */}
      {cls.system.trainedSkills?.value?.length > 0 && (
        <div>
          <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">Starting Trained Skills</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {cls.system.trainedSkills.value.map(s => (
              <span key={s} className="px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-300 capitalize">
                {s}
              </span>
            ))}
            {cls.system.trainedSkills.additional && (
              <span className="px-2 py-0.5 bg-stone-800 rounded text-xs text-amber-400">
                +{cls.system.trainedSkills.additional} more (Int)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-stone-900/60 rounded p-2 text-center">
    <div className="text-xs text-stone-500 uppercase tracking-wide">{label}</div>
    <div className="text-sm text-stone-200 font-medium mt-0.5 capitalize">{value}</div>
  </div>
);
