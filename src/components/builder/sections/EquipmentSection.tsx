import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import { useUiStore } from '../../../store/uiStore';
import { SearchBar } from '../../shared/SearchBar';
import { TooltipTrigger } from '../../shared/Tooltip';
import { Modal } from '../../shared/Modal';
import { computeAbilityScores, abilityModifier, computeBulk, formatBulk, formatPrice, parseBulkValue } from '../../../utils/calculations';
import type { EquipmentEntry, CarryType } from '../../../types/character';
import type { PF2eArmor, PF2eWeapon, PF2eEquipment, GameData } from '../../../types/pf2e';

type ItemCategory = 'weapons' | 'armor' | 'equipment';

export const EquipmentSection: React.FC = () => {
  const { character, addEquipment, updateEquipment, removeEquipment, setCurrency } = useCharacterStore();
  const { gameData } = useDataStore();
  const { showTooltip, hideTooltip } = useUiStore();
  const [showBrowser, setShowBrowser] = useState(false);

  const scores = useMemo(
    () => computeAbilityScores(character.abilityBoosts, character.manualAbilityScores),
    [character.abilityBoosts, character.manualAbilityScores]
  );
  const strMod = abilityModifier(scores.str);
  // PF2e: encumbered when bulk > 5+Str, can't carry more than 10+Str
  const encumberedAt = 5 + strMod;
  const bulkLimit    = 10 + strMod;

  const { total: totalBulk, lightRemainder } = useMemo(
    () => gameData ? computeBulk(character, gameData) : { total: 0, lightRemainder: 0 },
    [character.equipment, character.currency, gameData],
  );

  const handleAdd = (item: PF2eArmor | PF2eWeapon | PF2eEquipment) => {
    const existing = character.equipment.find(e => e.itemId === item._id);
    if (existing) {
      updateEquipment(existing.id, { quantity: existing.quantity + 1 });
    } else {
      const entry: EquipmentEntry = {
        id: `eq_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        itemId: item._id,
        quantity: 1,
        carryType: item.type === 'armor' ? 'worn' : 'held',
      };
      addEquipment(entry);
    }
    setShowBrowser(false);
  };

  if (!gameData) return <p className="text-stone-500 text-sm">Loading data…</p>;

  return (
    <div className="space-y-4">
      {/* Bulk tracker */}
      <BulkTracker total={totalBulk} lightRemainder={lightRemainder} limit={bulkLimit} encumberedAt={encumberedAt} />

      {/* Currency */}
      <CurrencyTracker currency={character.currency} onChange={setCurrency} />

      {/* Equipment list */}
      {character.equipment.length > 0 && (
        <div>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 gap-y-0.5 text-xs text-stone-500 font-medium uppercase tracking-wide mb-2 px-2">
            <span>Item</span>
            <span>Qty</span>
            <span>Bulk</span>
            <span>Carry</span>
            <span></span>
          </div>
          {character.equipment.map(entry => {
            const item = findItem(gameData, entry.itemId);
            if (!item) return null;
            const bulk = parseBulkValue(item.system.bulk?.value);

            return (
              <div key={entry.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 gap-y-0 items-center py-1.5 px-2 hover:bg-stone-800/30 rounded text-sm">
                <TooltipTrigger
                  item={item}
                  onShow={(i, r) => showTooltip(i, r)}
                  className="truncate text-stone-300"
                >
                  <span onMouseLeave={hideTooltip}>
                    {item.name}
                  </span>
                </TooltipTrigger>

                <input
                  type="number"
                  min={1}
                  value={entry.quantity}
                  onChange={e => updateEquipment(entry.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-12 text-center px-1 py-0.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-300
                             focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                <span className="text-stone-500 text-xs w-8 text-center">
                  {formatBulk(bulk * entry.quantity)}
                </span>

                <select
                  value={entry.carryType}
                  onChange={e => updateEquipment(entry.id, { carryType: e.target.value as CarryType })}
                  className="px-1.5 py-0.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-300
                             focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="worn">Worn</option>
                  <option value="held">Held</option>
                  <option value="stowed">Stowed</option>
                  <option value="dropped">Dropped</option>
                </select>

                <button
                  onClick={() => removeEquipment(entry.id)}
                  className="text-stone-600 hover:text-red-400 text-xs"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add item button */}
      <button
        onClick={() => setShowBrowser(true)}
        className="w-full py-2 border border-dashed border-stone-700 rounded-lg text-stone-500 hover:text-stone-400 hover:border-stone-600 text-sm transition-colors"
      >
        + Add Item
      </button>

      {showBrowser && (
        <ItemBrowserModal
          gameData={gameData}
          onSelect={handleAdd}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  );
};

function findItem(gameData: GameData, id: string) {
  return (
    gameData.armor.find((a) => a._id === id) ??
    gameData.weapons.find((w) => w._id === id) ??
    gameData.equipment.find((e) => e._id === id) ??
    null
  );
}

const BulkTracker: React.FC<{
  total: number;
  lightRemainder: number;
  limit: number;
  encumberedAt: number;
}> = ({ total, lightRemainder, limit, encumberedAt }) => {
  const isEncumbered = total > encumberedAt;
  const isOverLimit  = total > limit;
  // Progress bar fills to encumbered threshold; goes red beyond it
  const pct = Math.min((total / Math.max(limit, 1)) * 100, 100);
  const encPct = Math.min((encumberedAt / Math.max(limit, 1)) * 100, 100);

  const displayBulk = lightRemainder > 0 ? `${total} + ${lightRemainder}L` : String(total);

  return (
    <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-400 font-medium uppercase tracking-wide">Bulk</span>
        <span className={`text-sm font-mono ${isOverLimit ? 'text-red-400' : isEncumbered ? 'text-amber-400' : 'text-stone-300'}`}>
          {displayBulk} / {limit}
        </span>
      </div>
      {/* Bar: encumbered threshold marker + fill */}
      <div className="relative h-2 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-red-600' : isEncumbered ? 'bg-amber-500' : 'bg-stone-500'}`}
          style={{ width: `${pct}%` }}
        />
        {/* Encumbrance threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-amber-600/60"
          style={{ left: `${encPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-stone-600">
          Encumbered if &gt;{encumberedAt} bulk
        </span>
        <span className="text-xs text-stone-600">Max {limit}</span>
      </div>
      {isEncumbered && (
        <p className={`text-xs mt-1 font-medium ${isOverLimit ? 'text-red-400' : 'text-amber-400'}`}>
          {isOverLimit
            ? '⚠ Over maximum bulk — cannot carry this much'
            : '⚠ Encumbered: −10 ft Speed, clumsy 1'}
        </p>
      )}
    </div>
  );
};

const CurrencyTracker: React.FC<{
  currency: { pp: number; gp: number; sp: number; cp: number };
  onChange: (c: Partial<{ pp: number; gp: number; sp: number; cp: number }>) => void;
}> = ({ currency, onChange }) => {
  const fields: Array<[keyof typeof currency, string, string]> = [
    ['pp', 'PP', 'text-purple-400'],
    ['gp', 'GP', 'text-amber-400'],
    ['sp', 'SP', 'text-stone-300'],
    ['cp', 'CP', 'text-amber-700'],
  ];

  return (
    <div className="flex gap-2">
      {fields.map(([key, label, color]) => (
        <div key={key} className="flex-1 bg-stone-900/50 rounded p-2 border border-stone-700/30 text-center">
          <label className={`text-xs font-bold ${color} block mb-1`}>{label}</label>
          <input
            type="number"
            min={0}
            value={currency[key]}
            onChange={e => onChange({ [key]: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-full text-center bg-transparent border-0 text-stone-200 text-sm font-mono
                       focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
          />
        </div>
      ))}
    </div>
  );
};

const ItemBrowserModal: React.FC<{
  gameData: GameData;
  onSelect: (item: PF2eArmor | PF2eWeapon | PF2eEquipment) => void;
  onClose: () => void;
}> = ({ gameData, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ItemCategory>('equipment');
  const { showTooltip, hideTooltip } = useUiStore();

  const items = useMemo(() => {
    const q = search.toLowerCase();
    const source = category === 'armor' ? gameData.armor :
                   category === 'weapons' ? gameData.weapons :
                   gameData.equipment;
    return source
      .filter((i: any) => !q || i.name.toLowerCase().includes(q))
      .sort((a: any, b: any) => (a.system.level?.value ?? 0) - (b.system.level?.value ?? 0) || a.name.localeCompare(b.name))
      .slice(0, 200);
  }, [gameData, search, category]);

  return (
    <Modal open onClose={onClose} title="Item Browser" maxWidth="max-w-2xl">
      <div className="space-y-3">
        <div className="flex gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search items…" className="flex-1" />
          <div className="flex rounded-md overflow-hidden border border-stone-700">
            {(['equipment', 'weapons', 'armor'] as ItemCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  category === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
          {items.map((item: any) => {
            const lvl = item.system.level?.value ?? 0;
            const bulk = item.system.bulk?.value;
            const price = item.system.price?.value;

            return (
              <TooltipTrigger
                key={item._id}
                item={item}
                onShow={(i, r) => showTooltip(i, r)}
                className="block"
              >
                <button
                  onClick={() => onSelect(item)}
                  onMouseLeave={hideTooltip}
                  className="w-full text-left px-3 py-2 rounded border border-stone-700/50 bg-stone-800/50
                             text-stone-300 hover:border-amber-600/50 hover:bg-stone-800 text-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {lvl > 0 && <span className="text-xs text-stone-500">Lvl {lvl}</span>}
                    {bulk !== undefined && (
                      <span className="text-xs text-stone-600 ml-auto">Bulk {bulk}</span>
                    )}
                    {price && (
                      <span className="text-xs text-stone-600">{formatPrice(price)}</span>
                    )}
                  </div>
                </button>
              </TooltipTrigger>
            );
          })}
          {items.length === 0 && (
            <p className="text-stone-600 text-sm py-4 text-center">No items found.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
