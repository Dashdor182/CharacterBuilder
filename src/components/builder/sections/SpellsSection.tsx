import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import { useUiStore } from '../../../store/uiStore';
import { SearchBar } from '../../shared/SearchBar';
import { TooltipTrigger } from '../../shared/Tooltip';
import { Modal } from '../../shared/Modal';
import type { PF2eSpell, SpellTradition } from '../../../types/pf2e';
import type { SpellcastingEntry } from '../../../types/character';
import type { Ability } from '../../../types/pf2e';
import { computeAbilityScores, abilityModifier, proficiencyBonus, formatModifier } from '../../../utils/calculations';

const TRADITIONS: SpellTradition[] = ['arcane', 'divine', 'occult', 'primal'];
const ABILITIES_LIST: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

// Spell slots per level by class (simplified standard progression)
function getSpellSlotsForLevel(level: number, castingType: 'full' | 'half' | 'focus'): number[] {
  if (castingType === 'focus') return [];
  // Full caster progression (Wizard, Cleric, Druid, etc.)
  const FULL_CASTER = [
    [], // level 0 (placeholder)
    [3], // level 1: 2 rank-1 slots
    [4, 3], // level 2
    [4, 4, 3], // level 3
    [4, 4, 4, 3], // level 4
    [4, 4, 4, 4, 3], // level 5
    [4, 4, 4, 4, 4, 3], // level 6
    [4, 4, 4, 4, 4, 4, 3], // level 7
    [4, 4, 4, 4, 4, 4, 4, 3], // level 8
    [4, 4, 4, 4, 4, 4, 4, 4, 3], // level 9
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1], // level 10
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
  ];
  return FULL_CASTER[Math.min(level, 20)] ?? [];
}

export const SpellsSection: React.FC = () => {
  const { character, addSpellcastingEntry, removeSpellcastingEntry, addSpellToEntry, removeSpellFromEntry } = useCharacterStore();
  const { gameData } = useDataStore();
  const level = character.currentLevel;

  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newTradition, setNewTradition] = useState<SpellTradition>('arcane');
  const [newType, setNewType] = useState<'prepared' | 'spontaneous' | 'focus'>('prepared');
  const [newAbility, setNewAbility] = useState<Ability>('int');
  const [pickerEntry, setPickerEntry] = useState<number | null>(null);
  const [pickerRank, setPickerRank] = useState<number>(1);

  if (!gameData) return <p className="text-stone-500 text-sm">Loading data…</p>;

  const scores = computeAbilityScores(character.abilityBoosts, character.manualAbilityScores);

  return (
    <div className="space-y-4">
      {character.spellcasting.length === 0 && (
        <p className="text-stone-500 text-sm">
          No spellcasting entries yet. Add an entry to begin tracking spells.
        </p>
      )}

      {character.spellcasting.map((entry, i) => {
        const spellMod = abilityModifier(scores[entry.ability]);
        const profRank = 2; // trained minimum
        const spellAttack = spellMod + proficiencyBonus(level, profRank as 2);
        const spellDC = 10 + spellAttack;
        const slots = getSpellSlotsForLevel(level, entry.type === 'focus' ? 'focus' : 'full');

        return (
          <div key={i} className="border border-stone-700/50 rounded-lg overflow-hidden">
            {/* Entry header */}
            <div className="flex items-center gap-3 px-3 py-2 bg-stone-800/50">
              <span className="font-medium text-stone-200 text-sm capitalize">{entry.tradition} ({entry.type})</span>
              <span className="text-xs text-stone-500">{entry.ability.toUpperCase()}</span>
              <span className="text-xs text-stone-400 ml-auto">
                Attack {formatModifier(spellAttack)} · DC {spellDC}
              </span>
              <button
                onClick={() => removeSpellcastingEntry(i)}
                className="text-stone-600 hover:text-red-400 text-xs ml-1"
              >
                ×
              </button>
            </div>

            {/* Cantrips */}
            <SpellRankBlock
              entry={entry}
              entryIndex={i}
              rank={0}
              slots={Infinity}
              gameData={gameData}
              character={character}
              onAdd={() => { setPickerEntry(i); setPickerRank(0); }}
              onRemove={(id) => removeSpellFromEntry(i, id)}
            />

            {/* Ranked spells */}
            {slots.map((slotCount, rankIdx) => (
              <SpellRankBlock
                key={rankIdx + 1}
                entry={entry}
                entryIndex={i}
                rank={rankIdx + 1}
                slots={slotCount}
                gameData={gameData}
                character={character}
                onAdd={() => { setPickerEntry(i); setPickerRank(rankIdx + 1); }}
                onRemove={(id) => removeSpellFromEntry(i, id)}
              />
            ))}

            {entry.focusPoints !== undefined && (
              <div className="px-3 py-2 text-xs text-stone-400">
                Focus Points: {entry.focusPoints}
              </div>
            )}
          </div>
        );
      })}

      {/* Add entry button */}
      {!showAddEntry && (
        <button
          onClick={() => setShowAddEntry(true)}
          className="w-full py-2 border border-dashed border-stone-700 rounded-lg text-stone-500 hover:text-stone-400 hover:border-stone-600 text-sm transition-colors"
        >
          + Add Spellcasting Entry
        </button>
      )}

      {showAddEntry && (
        <div className="border border-stone-700 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-stone-300">New Spellcasting Entry</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-stone-500 block mb-1">Tradition</label>
              <select
                value={newTradition}
                onChange={e => setNewTradition(e.target.value as SpellTradition)}
                className="w-full px-2 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-300
                           focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {TRADITIONS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as 'prepared' | 'spontaneous' | 'focus')}
                className="w-full px-2 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-300
                           focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="prepared">Prepared</option>
                <option value="spontaneous">Spontaneous</option>
                <option value="focus">Focus</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Key Ability</label>
              <select
                value={newAbility}
                onChange={e => setNewAbility(e.target.value as Ability)}
                className="w-full px-2 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-300
                           focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {ABILITIES_LIST.map(a => (
                  <option key={a} value={a}>{a.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddEntry(false)} className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-300">
              Cancel
            </button>
            <button
              onClick={() => {
                const newEntry: SpellcastingEntry = {
                  tradition: newTradition,
                  type: newType,
                  ability: newAbility,
                  spellSlots: [],
                  knownSpells: [],
                  focusPoints: newType === 'focus' ? 1 : undefined,
                };
                addSpellcastingEntry(newEntry);
                setShowAddEntry(false);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Spell picker modal */}
      {pickerEntry !== null && (
        <SpellPickerModal
          entry={character.spellcasting[pickerEntry]}
          rank={pickerRank}
          gameData={gameData}
          alreadyKnown={character.spellcasting[pickerEntry]?.knownSpells ?? []}
          onSelect={id => {
            addSpellToEntry(pickerEntry, id);
            setPickerEntry(null);
          }}
          onClose={() => setPickerEntry(null)}
        />
      )}
    </div>
  );
};

const SpellRankBlock: React.FC<{
  entry: SpellcastingEntry;
  entryIndex: number;
  rank: number;
  slots: number;
  gameData: any;
  character: any;
  onAdd: () => void;
  onRemove: (id: string) => void;
}> = ({ entry, rank, slots, gameData, onAdd, onRemove }) => {
  const { showTooltip, hideTooltip } = useUiStore();

  const spellsAtRank = entry.knownSpells
    .map((id: string) => gameData.spells.find((s: PF2eSpell) => s._id === id))
    .filter((s: PF2eSpell | undefined): s is PF2eSpell => {
      if (!s) return false;
      const spellRank = s.system.level?.value ?? 0;
      if (rank === 0) return (s.system.traits?.value ?? []).includes('cantrip') || spellRank === 0;
      return spellRank === rank;
    });

  const label = rank === 0 ? 'Cantrips' : `Rank ${rank}`;
  const slotsDisplay = rank === 0 ? '∞' : slots;

  if (spellsAtRank.length === 0 && rank > 0 && slots === 0) return null;

  return (
    <div className="px-3 py-2 border-t border-stone-700/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-stone-400">{label}</span>
        {rank > 0 && (
          <span className="text-xs text-stone-600">{spellsAtRank.length}/{slotsDisplay} slots</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {spellsAtRank.map((spell: PF2eSpell) => (
          <TooltipTrigger
            key={spell._id}
            item={spell}
            onShow={(item, rect) => showTooltip(item, rect)}
            className="inline-block"
          >
            <span
              onMouseLeave={hideTooltip}
              className="group flex items-center gap-1 px-2 py-0.5 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300 hover:border-stone-600"
            >
              {spell.name}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(spell._id); }}
                className="text-stone-600 group-hover:text-red-400 leading-none"
              >
                ×
              </button>
            </span>
          </TooltipTrigger>
        ))}

        <button
          onClick={onAdd}
          className="px-2 py-0.5 border border-dashed border-stone-700 rounded text-xs text-stone-600 hover:text-stone-400 hover:border-stone-600 transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
};

const SpellPickerModal: React.FC<{
  entry: SpellcastingEntry;
  rank: number;
  gameData: any;
  alreadyKnown: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}> = ({ entry, rank, gameData, alreadyKnown, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const { showTooltip, hideTooltip } = useUiStore();

  const spells = useMemo((): PF2eSpell[] => {
    return gameData.spells.filter((s: PF2eSpell) => {
      const spellRank = s.system.level?.value ?? 0;
      const traditions = s.system.traits?.traditions ?? s.system.traits?.value ?? [];
      const isCantrip = (s.system.traits?.value ?? []).includes('cantrip');

      if (rank === 0 && !isCantrip) return false;
      if (rank > 0 && isCantrip) return false;
      if (rank > 0 && spellRank !== rank) return false;
      if (entry.tradition && traditions.length > 0 && !traditions.includes(entry.tradition as SpellTradition)) return false;
      if (alreadyKnown.includes(s._id)) return false;

      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.system.traits?.value ?? []).some((t: string) => t.includes(q));
      }
      if (schoolFilter && s.system.school?.value !== schoolFilter) return false;
      return true;
    }).sort((a: PF2eSpell, b: PF2eSpell) => a.name.localeCompare(b.name));
  }, [gameData, entry, rank, alreadyKnown, search, schoolFilter]);

  const rankLabel = rank === 0 ? 'Cantrip' : `Rank ${rank}`;

  return (
    <Modal open onClose={onClose} title={`Add ${rankLabel} Spell (${entry.tradition})`} maxWidth="max-w-2xl">
      <div className="space-y-3">
        <div className="flex gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search spells…" className="flex-1" />
          <select
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}
            className="px-2 py-2 bg-stone-900 border border-stone-700 rounded text-xs text-stone-300
                       focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All schools</option>
            {['abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation'].map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-stone-500">{spells.length} spell{spells.length !== 1 ? 's' : ''}</div>

        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
          {spells.map((spell: PF2eSpell) => {
            const action = spell.system.actions?.value;
            const actionStr = action === 1 ? '◆' : action === 2 ? '◆◆' : action === 3 ? '◆◆◆' : action === 'reaction' ? '↺' : action === 'free' ? '◇' : '';

            return (
              <TooltipTrigger
                key={spell._id}
                item={spell}
                onShow={(item, rect) => showTooltip(item, rect)}
                className="block"
              >
                <button
                  onClick={() => onSelect(spell._id)}
                  onMouseLeave={hideTooltip}
                  className="w-full text-left px-3 py-2 rounded border border-stone-700/50 bg-stone-800/50
                             text-stone-300 hover:border-amber-600/50 hover:bg-stone-800 text-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{spell.name}</span>
                    {actionStr && <span className="text-amber-400 text-xs">{actionStr}</span>}
                    <div className="ml-auto flex gap-1">
                      {(spell.system.traits?.value ?? []).slice(0, 3).map((t: string) => (
                        <span key={t} className="text-xs text-stone-600">[{t}]</span>
                      ))}
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
            );
          })}

          {spells.length === 0 && (
            <p className="text-stone-600 text-sm py-4 text-center">No spells found.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
