import React, { useMemo } from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { useDataStore } from '../../store/dataStore';
import { computeStats, formatModifier, ABILITIES, ABILITY_SHORT, PROF_RANK_LABELS, ALL_SKILLS, SKILL_LABELS, SKILLS_BY_ABILITY } from '../../utils/calculations';
import type { Ability } from '../../types/pf2e';

export const CharacterSheet: React.FC = () => {
  const { character } = useCharacterStore();
  const { gameData } = useDataStore();

  const computed = useMemo(() => {
    if (!gameData) return null;
    return computeStats(character, gameData, character.currentLevel);
  }, [character, gameData]);

  const cls = gameData?.classes.find(c => c._id === character.classId);
  const ancestry = gameData?.ancestries.find(a => a._id === character.ancestryId);
  const background = gameData?.backgrounds.find(b => b._id === character.backgroundId);

  if (!computed) return <p className="text-stone-500 p-4">Loading game data…</p>;

  return (
    <div className="print:text-black print:bg-white space-y-4 p-4">
      {/* Header */}
      <SheetHeader
        character={character}
        cls={cls}
        ancestry={ancestry}
        background={background}
        computed={computed}
      />

      {/* Ability Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AbilityBlock abilities={computed.abilities} modifiers={computed.abilityModifiers} />
        <DefenseBlock computed={computed} />
        <PerceptionSpeeds computed={computed} ancestry={ancestry} />
      </div>

      {/* Saves + Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SavingThrows computed={computed} />
        <SkillList computed={computed} />
      </div>

      {/* Spellcasting */}
      {character.spellcasting.length > 0 && (
        <SpellcastingBlock character={character} gameData={gameData} computed={computed} />
      )}

      {/* Feats summary */}
      <FeatsSummary character={character} gameData={gameData} />

      {/* Equipment summary */}
      {character.equipment.length > 0 && (
        <EquipmentSummary character={character} gameData={gameData} />
      )}
    </div>
  );
};

const SheetHeader: React.FC<{
  character: any; cls: any; ancestry: any; background: any; computed: any;
}> = ({ character, cls, ancestry, background, computed }) => (
  <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/50 print:border-gray-400 print:bg-white">
    <div className="flex flex-wrap gap-x-6 gap-y-2 items-start">
      <div className="flex-1 min-w-48">
        <h1 className="text-2xl font-bold text-amber-400 print:text-black">
          {character.name || 'Unnamed Adventurer'}
        </h1>
        <div className="text-stone-400 text-sm mt-0.5">
          {[ancestry?.name, background?.name, cls?.name].filter(Boolean).join(' · ')}
          {cls && <span className="ml-2 text-stone-500">Level {character.currentLevel}</span>}
        </div>
        {character.playerName && (
          <div className="text-stone-500 text-xs mt-0.5">Player: {character.playerName}</div>
        )}
      </div>

      {/* Key stats */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="HP" value={computed.maxHP} color="text-red-400" large />
        <StatPill label="AC" value={computed.ac} color="text-blue-400" large />
        <StatPill label="Speed" value={`${computed.speed} ft`} color="text-green-400" />
        {computed.classDC !== undefined && (
          <StatPill label="Class DC" value={computed.classDC} color="text-purple-400" />
        )}
        {computed.spellDC !== undefined && (
          <StatPill label="Spell DC" value={computed.spellDC} color="text-indigo-400" />
        )}
        {computed.spellAttack !== undefined && (
          <StatPill label="Spell Atk" value={formatModifier(computed.spellAttack)} color="text-indigo-400" />
        )}
      </div>
    </div>
  </div>
);

const StatPill: React.FC<{
  label: string; value: string | number; color?: string; large?: boolean;
}> = ({ label, value, color = 'text-stone-200', large }) => (
  <div className={`bg-stone-800 border border-stone-700/50 rounded-lg px-3 py-1.5 text-center print:border-gray-400 print:bg-white ${large ? 'min-w-14' : 'min-w-12'}`}>
    <div className={`font-bold ${large ? 'text-xl' : 'text-base'} ${color} print:text-black`}>{value}</div>
    <div className="text-xs text-stone-500 uppercase tracking-wide print:text-gray-600">{label}</div>
  </div>
);

const AbilityBlock: React.FC<{
  abilities: Record<Ability, number>;
  modifiers: Record<Ability, number>;
}> = ({ abilities, modifiers }) => (
  <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 print:border-gray-400 print:bg-white">
    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Ability Scores</h3>
    <div className="grid grid-cols-3 gap-2">
      {ABILITIES.map(ab => (
        <div key={ab} className="text-center">
          <div className="text-xs text-stone-500 uppercase mb-0.5">{ABILITY_SHORT[ab]}</div>
          <div className="text-lg font-bold text-stone-200 print:text-black">{abilities[ab]}</div>
          <div className={`text-sm font-medium ${modifiers[ab] >= 0 ? 'text-amber-400' : 'text-red-400'} print:text-black`}>
            {formatModifier(modifiers[ab])}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DefenseBlock: React.FC<{ computed: any }> = ({ computed }) => (
  <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 print:border-gray-400 print:bg-white">
    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Defenses</h3>
    <div className="space-y-2">
      <DefRow label="HP" value={computed.maxHP} color="text-red-400" />
      <DefRow label="AC" value={computed.ac} color="text-blue-400" />
      {computed.classDC !== undefined && (
        <DefRow label="Class DC" value={computed.classDC} color="text-purple-400" />
      )}
    </div>
  </div>
);

const DefRow: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color = 'text-stone-200' }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-stone-400">{label}</span>
    <span className={`text-base font-bold ${color} print:text-black`}>{value}</span>
  </div>
);

const PerceptionSpeeds: React.FC<{ computed: any; ancestry: any }> = ({ computed, ancestry }) => (
  <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 print:border-gray-400 print:bg-white">
    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Senses & Movement</h3>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-400">Perception</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-600">{PROF_RANK_LABELS[computed.perception.rank]}</span>
          <span className="text-base font-bold text-stone-200 print:text-black">
            {formatModifier(computed.perception.bonus)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-400">Speed</span>
        <span className="text-base font-bold text-green-400 print:text-black">{computed.speed} ft</span>
      </div>
      {ancestry?.system.vision && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-400">Vision</span>
          <span className="text-sm text-stone-300 capitalize">{ancestry.system.vision}</span>
        </div>
      )}
      {computed.size !== 'med' && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-400">Size</span>
          <span className="text-sm text-stone-300 uppercase">{computed.size}</span>
        </div>
      )}
    </div>
  </div>
);

const SavingThrows: React.FC<{ computed: any }> = ({ computed }) => (
  <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 print:border-gray-400 print:bg-white">
    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Saving Throws</h3>
    <div className="space-y-2.5">
      {([
        ['Fortitude', computed.fortitude, 'text-red-400'],
        ['Reflex', computed.reflex, 'text-blue-400'],
        ['Will', computed.will, 'text-purple-400'],
      ] as const).map(([name, save, color]) => (
        <div key={name} className="flex items-center justify-between">
          <div>
            <span className="text-sm text-stone-300">{name}</span>
            <span className="text-xs text-stone-600 ml-2">{PROF_RANK_LABELS[save.rank]}</span>
          </div>
          <span className={`text-lg font-bold ${color} print:text-black`}>
            {formatModifier(save.bonus)}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const SkillList: React.FC<{ computed: any }> = ({ computed }) => {
  const RANK_COLORS = ['', 'text-blue-400', 'text-green-400', 'text-amber-400', 'text-purple-400'];

  return (
    <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 print:border-gray-400 print:bg-white">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Skills</h3>
      <div className="space-y-1">
        {ALL_SKILLS.map(skill => {
          const skillData = computed.skills[skill];
          if (!skillData) return null;
          const { rank, bonus } = skillData;

          return (
            <div key={skill} className="flex items-center gap-1.5 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rank > 0 ? (RANK_COLORS[rank] || '').replace('text-', 'bg-') : 'bg-stone-700'}`} />
              <span className="flex-1 text-stone-400 capitalize">{SKILL_LABELS[skill]}</span>
              <span className="text-xs text-stone-600 w-6 text-right">{ABILITY_SHORT[SKILLS_BY_ABILITY[skill]]}</span>
              <span className={`w-8 text-right font-mono text-stone-200 print:text-black ${bonus < 0 ? 'text-red-400' : ''}`}>
                {formatModifier(bonus)}
              </span>
            </div>
          );
        })}

        {/* Lore skills */}
        {Object.entries(computed.skills)
          .filter(([k]) => k.startsWith('lore:'))
          .map(([key, data]: [string, any]) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-blue-400" />
              <span className="flex-1 text-stone-400">
                {key.replace('lore:', '')} Lore
              </span>
              <span className="text-xs text-stone-600 w-6 text-right">Int</span>
              <span className="w-8 text-right font-mono text-stone-200 print:text-black">
                {formatModifier(data.bonus)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

const SpellcastingBlock: React.FC<{ character: any; gameData: any; computed: any }> = ({
  character, gameData, computed,
}) => (
  <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 print:border-gray-400 print:bg-white">
    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Spellcasting</h3>
    <div className="grid grid-cols-2 gap-2 mb-3">
      {computed.spellAttack !== undefined && (
        <div className="bg-stone-800 rounded p-2 text-center print:bg-white print:border print:border-gray-300">
          <div className="text-xl font-bold text-indigo-400 print:text-black">{formatModifier(computed.spellAttack)}</div>
          <div className="text-xs text-stone-500">Spell Attack</div>
        </div>
      )}
      {computed.spellDC !== undefined && (
        <div className="bg-stone-800 rounded p-2 text-center print:bg-white print:border print:border-gray-300">
          <div className="text-xl font-bold text-indigo-400 print:text-black">{computed.spellDC}</div>
          <div className="text-xs text-stone-500">Spell DC</div>
        </div>
      )}
    </div>

    {character.spellcasting.map((entry: any, i: number) => {
      const cantrips = entry.knownSpells
        .map((id: string) => gameData?.spells.find((s: any) => s._id === id))
        .filter((s: any) => s && (s.system.traits?.value ?? []).includes('cantrip'));
      const leveled = entry.knownSpells
        .map((id: string) => gameData?.spells.find((s: any) => s._id === id))
        .filter((s: any) => s && !(s.system.traits?.value ?? []).includes('cantrip'));

      return (
        <div key={i} className="border-t border-stone-700/30 pt-3 mt-3">
          <div className="text-sm font-medium text-stone-300 mb-2 capitalize">
            {entry.tradition} ({entry.type})
          </div>
          {cantrips.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-stone-500">Cantrips: </span>
              <span className="text-xs text-stone-400">{cantrips.map((s: any) => s.name).join(', ')}</span>
            </div>
          )}
          {leveled.length > 0 && (
            <div>
              <span className="text-xs text-stone-500">Spells: </span>
              <span className="text-xs text-stone-400">{leveled.map((s: any) => s.name).join(', ')}</span>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const FeatsSummary: React.FC<{ character: any; gameData: any }> = ({ character, gameData }) => {
  const allFeats = character.levels
    .flatMap((l: any) => l.feats)
    .filter((f: any) => f.selectedFeatId)
    .map((f: any) => ({
      ...f,
      feat: gameData?.feats.find((feat: any) => feat._id === f.selectedFeatId),
    }))
    .filter((f: any) => f.feat);

  if (allFeats.length === 0) return null;

  return (
    <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 print:border-gray-400 print:bg-white">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Feats & Abilities</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {allFeats.map((f: any, i: number) => (
          <div key={i} className="text-xs">
            <span className={`inline-block px-1.5 py-0.5 rounded mr-1.5 uppercase font-medium ${
              {
                class: 'bg-blue-900/40 text-blue-400',
                ancestry: 'bg-green-900/40 text-green-400',
                general: 'bg-stone-700 text-stone-400',
                skill: 'bg-teal-900/40 text-teal-400',
                archetype: 'bg-purple-900/40 text-purple-400',
              }[f.type as string] ?? 'bg-stone-700 text-stone-400'
            }`}>
              {String(f.type).slice(0, 3)}
            </span>
            <span className="text-stone-300">{f.feat.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const EquipmentSummary: React.FC<{ character: any; gameData: any }> = ({ character, gameData }) => {
  const items = character.equipment
    .map((e: any) => ({
      ...e,
      item: gameData?.armor.find((a: any) => a._id === e.itemId) ??
            gameData?.weapons.find((w: any) => w._id === e.itemId) ??
            gameData?.equipment.find((eq: any) => eq._id === e.itemId),
    }))
    .filter((e: any) => e.item);

  if (items.length === 0) return null;

  return (
    <div className="border border-stone-700/50 rounded-xl p-4 bg-stone-900/30 print:border-gray-400 print:bg-white">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Equipment</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {items.map((e: any, i: number) => (
          <div key={i} className="text-xs text-stone-400">
            {e.quantity > 1 && <span className="text-stone-500">{e.quantity}× </span>}
            {e.item.name}
            <span className="text-stone-600 ml-1">({e.carryType})</span>
          </div>
        ))}
      </div>

      {/* Currency */}
      {Object.values(character.currency).some((v: any) => v > 0) && (
        <div className="mt-3 flex gap-3 text-xs text-stone-400 border-t border-stone-700/30 pt-3">
          {character.currency.pp > 0 && <span>{character.currency.pp} pp</span>}
          {character.currency.gp > 0 && <span>{character.currency.gp} gp</span>}
          {character.currency.sp > 0 && <span>{character.currency.sp} sp</span>}
          {character.currency.cp > 0 && <span>{character.currency.cp} cp</span>}
        </div>
      )}
    </div>
  );
};
