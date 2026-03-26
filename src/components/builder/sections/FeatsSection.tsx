import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useDataStore } from '../../../store/dataStore';
import { useUiStore } from '../../../store/uiStore';
import { SearchBar } from '../../shared/SearchBar';
import { TooltipTrigger } from '../../shared/Tooltip';
import { Modal } from '../../shared/Modal';
import { checkFeatPrerequisites } from '../../../utils/prerequisites';
import { computeStats } from '../../../utils/calculations';
import {
  getClassFeatLevels, getAncestryFeatLevels, getGeneralFeatLevels, getSkillFeatLevels,
} from '../../../utils/calculations';
import type { PF2eFeat, GameData } from '../../../types/pf2e';
import type { FeatSlot, CharacterState } from '../../../types/character';

type FeatCategory = 'ancestry' | 'class' | 'general' | 'skill' | 'archetype';

const CATEGORY_LABELS: Record<FeatCategory, string> = {
  ancestry: 'Ancestry', class: 'Class', general: 'General', skill: 'Skill', archetype: 'Archetype',
};

export const FeatsSection: React.FC = () => {
  const { character, setFeat } = useCharacterStore();
  const { gameData } = useDataStore();
  const level = character.currentLevel;

  const cls = gameData?.classes.find(c => c._id === character.classId);

  // Build feat slot schedule
  const featSlots = useMemo((): Array<FeatSlot & { levelIndex: number }> => {
    if (!gameData) return [];
    const slots: Array<FeatSlot & { levelIndex: number }> = [];

    const classFeatLevels = getClassFeatLevels(cls ?? null);
    const ancestryFeatLevels = getAncestryFeatLevels(
      cls ?? null, character.variantRules.ancestryParagon
    );
    const generalFeatLevels = getGeneralFeatLevels(cls ?? null);
    const skillFeatLevels = getSkillFeatLevels(cls ?? null);

    for (let lvl = 1; lvl <= level; lvl++) {
      const li = lvl - 1;
      const lvlData = character.levels[li];

      if (classFeatLevels.includes(lvl)) {
        const existing = lvlData?.feats.find(f => f.type === 'class' && f.level === lvl);
        slots.push({
          levelIndex: li,
          id: `class-${lvl}`,
          type: 'class',
          level: lvl,
          selectedFeatId: existing?.selectedFeatId ?? null,
        });
      }

      if (ancestryFeatLevels.includes(lvl)) {
        const existing = lvlData?.feats.find(f => f.type === 'ancestry' && f.level === lvl);
        slots.push({
          levelIndex: li,
          id: `ancestry-${lvl}`,
          type: 'ancestry',
          level: lvl,
          selectedFeatId: existing?.selectedFeatId ?? null,
        });
      }

      if (generalFeatLevels.includes(lvl)) {
        const existing = lvlData?.feats.find(f => f.type === 'general' && f.level === lvl);
        slots.push({
          levelIndex: li,
          id: `general-${lvl}`,
          type: 'general',
          level: lvl,
          selectedFeatId: existing?.selectedFeatId ?? null,
        });
      }

      if (skillFeatLevels.includes(lvl)) {
        const existing = lvlData?.feats.find(f => f.type === 'skill' && f.level === lvl);
        slots.push({
          levelIndex: li,
          id: `skill-${lvl}`,
          type: 'skill',
          level: lvl,
          selectedFeatId: existing?.selectedFeatId ?? null,
        });
      }

      // Free Archetype (even levels)
      if (character.variantRules.freeArchetype && lvl % 2 === 0) {
        const existing = lvlData?.feats.find(f => f.type === 'archetype' && f.level === lvl);
        slots.push({
          levelIndex: li,
          id: `archetype-${lvl}`,
          type: 'archetype',
          level: lvl,
          selectedFeatId: existing?.selectedFeatId ?? null,
        });
      }
    }

    return slots.sort((a, b) => a.level - b.level || a.type.localeCompare(b.type));
  }, [character, gameData, cls, level]);

  const [pickerSlot, setPickerSlot] = useState<(FeatSlot & { levelIndex: number }) | null>(null);

  if (!gameData) return <p className="text-stone-500 text-sm">Loading data…</p>;

  if (gameData.feats.length === 0) {
    return (
      <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 p-4 text-sm space-y-2">
        <p className="text-amber-300 font-medium">Feats data not loaded</p>
        <p className="text-stone-400">
          The feats pack failed to load (usually a GitHub API rate limit). Your other data is fine.
        </p>
        <button
          onClick={() => { localStorage.removeItem('pf2e_gamedata_v4'); window.location.reload(); }}
          className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-xs font-medium transition-colors"
        >
          Clear cache &amp; reload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {featSlots.length === 0 && (
        <p className="text-stone-500 text-sm">Select a class and ancestry to see available feat slots.</p>
      )}

      {/* Group by level */}
      {Array.from(new Set(featSlots.map(s => s.level))).map(slotLevel => {
        const levelSlots = featSlots.filter(s => s.level === slotLevel);
        return (
          <div key={slotLevel} className="space-y-1.5">
            <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              Level {slotLevel}
            </div>
            {levelSlots.map(slot => {
              const selectedFeat = slot.selectedFeatId
                ? gameData.feats.find(f => f._id === slot.selectedFeatId)
                : null;

              return (
                <FeatSlotRow
                  key={slot.id}
                  slot={slot}
                  selectedFeat={selectedFeat ?? null}
                  onOpen={() => setPickerSlot(slot)}
                  onClear={() => setFeat(slot.levelIndex, slot.id, null)}
                />
              );
            })}
          </div>
        );
      })}

      {/* Feat picker modal */}
      {pickerSlot && (
        <FeatPickerModal
          slot={pickerSlot}
          character={character}
          gameData={gameData}
          onSelect={(featId) => {
            // Ensure the slot exists in levels
            setFeat(pickerSlot.levelIndex, pickerSlot.id, featId);
            setPickerSlot(null);
          }}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
};

const FeatSlotRow: React.FC<{
  slot: FeatSlot;
  selectedFeat: PF2eFeat | null;
  onOpen: () => void;
  onClear: () => void;
}> = ({ slot, selectedFeat, onOpen, onClear }) => {
  const { showTooltip, hideTooltip } = useUiStore();

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wide flex-shrink-0 ${
        {
          class: 'bg-blue-900/40 text-blue-400',
          ancestry: 'bg-green-900/40 text-green-400',
          general: 'bg-stone-700 text-stone-400',
          skill: 'bg-teal-900/40 text-teal-400',
          archetype: 'bg-purple-900/40 text-purple-400',
          bonus: 'bg-amber-900/40 text-amber-400',
        }[slot.type]
      }`}>
        {CATEGORY_LABELS[slot.type as FeatCategory] ?? slot.type}
      </span>

      {selectedFeat ? (
        <TooltipTrigger
          item={selectedFeat}
          onShow={(item, rect) => showTooltip(item, rect)}
          className="flex-1 min-w-0"
        >
          <button
            onClick={onOpen}
            onMouseLeave={hideTooltip}
            className="w-full text-left px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded text-sm text-stone-200 transition-colors"
          >
            {selectedFeat.name}
            <span className="text-stone-500 text-xs ml-2">
              (Level {selectedFeat.system.level?.value})
            </span>
          </button>
        </TooltipTrigger>
      ) : (
        <button
          onClick={onOpen}
          className="flex-1 text-left px-3 py-1.5 border border-dashed border-stone-700 hover:border-stone-500 rounded text-sm text-stone-600 hover:text-stone-400 transition-colors"
        >
          + Choose {CATEGORY_LABELS[slot.type as FeatCategory] ?? slot.type} Feat
        </button>
      )}

      {selectedFeat && (
        <button
          onClick={onClear}
          className="text-stone-600 hover:text-red-400 text-xs px-1 flex-shrink-0"
          title="Remove feat"
        >
          ×
        </button>
      )}
    </div>
  );
};

const FeatPickerModal: React.FC<{
  slot: FeatSlot & { levelIndex: number };
  character: CharacterState;
  gameData: GameData;
  onSelect: (id: string) => void;
  onClose: () => void;
}> = ({ slot, character, gameData, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [showInvalid, setShowInvalid] = useState(true);
  const { showTooltip, hideTooltip } = useUiStore();

  const computed = useMemo(
    () => computeStats(character, gameData, character.currentLevel),
    [character, gameData]
  );

  const cls = gameData.classes.find(c => c._id === character.classId);
  const ancestry = gameData.ancestries.find(a => a._id === character.ancestryId);

  // Explain why feats might be unavailable to pick
  const missingRequirement =
    slot.type === 'class' && !cls ? 'Select a class to see class feats.' :
    slot.type === 'ancestry' && !ancestry ? 'Select an ancestry to see ancestry feats.' :
    null;

  const filteredFeats = useMemo((): PF2eFeat[] => {
    let feats = gameData.feats.filter((f: PF2eFeat) => {
      const featLevel = f.system.level?.value ?? 1;
      if (featLevel > slot.level) return false;

      const featType = f.system.featType?.value ?? '';
      const traits: string[] = f.system.traits?.value ?? [];

      switch (slot.type) {
        case 'class':
          return featType === 'class' && !!cls &&
            traits.some((t: string) => cls.name.toLowerCase() === t.toLowerCase());
        case 'ancestry':
          return (featType === 'ancestry' || featType === 'ancestryfeature') && !!ancestry &&
            traits.some((t: string) => ancestry.name.toLowerCase() === t.toLowerCase());
        case 'general':
          return featType === 'general' && !traits.includes('skill');
        case 'skill':
          return featType === 'skill' || (featType === 'general' && traits.includes('skill'));
        case 'archetype':
          return featType === 'archetype' || traits.includes('archetype');
        default:
          return true;
      }
    });

    if (search) {
      const q = search.toLowerCase();
      feats = feats.filter((f: PF2eFeat) =>
        f.name.toLowerCase().includes(q) ||
        (f.system.traits?.value ?? []).some((t: string) => t.includes(q))
      );
    }

    return feats.sort((a: PF2eFeat, b: PF2eFeat) => {
      const la = a.system.level?.value ?? 1;
      const lb = b.system.level?.value ?? 1;
      return la - lb || a.name.localeCompare(b.name);
    });
  }, [gameData, slot, cls, ancestry, character, search]);

  const { valid, invalid } = useMemo(() => {
    const valid: typeof filteredFeats = [];
    const invalid: Array<{ feat: PF2eFeat; reasons: string[] }> = [];

    for (const feat of filteredFeats) {
      const result = checkFeatPrerequisites(feat, character, computed, gameData, slot.level);
      if (result.met) valid.push(feat);
      else invalid.push({ feat, reasons: result.reasons });
    }
    return { valid, invalid };
  }, [filteredFeats, character, computed, gameData, slot.level]);

  // Auto-show invalid feats if there are no valid ones to show
  const effectiveShowInvalid = showInvalid || (valid.length === 0 && invalid.length > 0);
  const displayFeats = effectiveShowInvalid ? filteredFeats : valid;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Choose ${CATEGORY_LABELS[slot.type as FeatCategory] ?? 'Feat'} (Level ${slot.level})`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3">
        {missingRequirement ? (
          <p className="text-amber-500/80 text-sm py-2">{missingRequirement}</p>
        ) : (
          <div className="flex gap-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search feats…"
              className="flex-1"
            />
            <label className="flex items-center gap-1.5 text-xs text-stone-400 whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInvalid}
                onChange={e => setShowInvalid(e.target.checked)}
                className="accent-amber-500"
              />
              Show ineligible ({invalid.length})
            </label>
          </div>
        )}

        {!missingRequirement && (
          <div className="text-xs text-stone-500">
            {valid.length} eligible · {filteredFeats.length} total
            {effectiveShowInvalid && !showInvalid && valid.length === 0 && (
              <span className="text-amber-500/70 ml-2">Showing all — none currently meet prerequisites</span>
            )}
          </div>
        )}

        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
          {displayFeats.map(feat => {
            const invalidity = invalid.find(i => i.feat._id === feat._id);
            const isInvalid = !!invalidity;

            return (
              <TooltipTrigger
                key={feat._id}
                item={feat}
                onShow={(item, rect) => showTooltip(item, rect)}
                className="block"
              >
                <button
                  onClick={() => !isInvalid && onSelect(feat._id)}
                  onMouseLeave={hideTooltip}
                  disabled={isInvalid}
                  className={`
                    w-full text-left px-3 py-2 rounded border text-sm transition-all
                    ${isInvalid
                      ? 'border-stone-800 bg-stone-900/30 text-stone-600 cursor-not-allowed opacity-60'
                      : 'border-stone-700/50 bg-stone-800/50 text-stone-300 hover:border-amber-600/50 hover:bg-stone-800'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{feat.name}</span>
                    <span className="text-xs text-stone-500 flex-shrink-0">
                      Lvl {feat.system.level?.value ?? 1}
                    </span>
                  </div>
                  {(feat.system.traits?.value?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(feat.system.traits?.value ?? []).slice(0, 5).map(t => (
                        <span key={t} className="text-xs text-stone-500">[{t}]</span>
                      ))}
                    </div>
                  )}
                  {isInvalid && invalidity && (
                    <div className="text-xs text-red-400 mt-1">
                      ⚠ {invalidity.reasons[0]}
                      {invalidity.reasons.length > 1 && ` (+${invalidity.reasons.length - 1} more)`}
                    </div>
                  )}
                </button>
              </TooltipTrigger>
            );
          })}

          {displayFeats.length === 0 && (
            <p className="text-stone-600 text-sm py-4 text-center">
              No feats found{search ? ` matching "${search}"` : ''}.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
