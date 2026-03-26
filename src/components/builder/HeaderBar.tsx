import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { Modal } from '../shared/Modal';
import { PickerModal } from '../shared/ItemPicker';
import type { PickerItem } from '../shared/ItemPicker';
import { AncestrySection } from './sections/AncestrySection';
import { BackgroundSection } from './sections/BackgroundSection';
import { ClassSection } from './sections/ClassSection';
import { AbilityScoresSection } from './sections/AbilityScoresSection';
import { SkillsSection } from './sections/SkillsSection';
import {
  computeAbilityScores, abilityModifier, formatModifier, ABILITIES, ABILITY_SHORT,
} from '../../utils/calculations';
import type { Ability } from '../../types/pf2e';

type ModalType = 'ancestry' | 'background' | 'class' | 'ability-scores' | 'skills' | null;
type PickerType = 'ancestry' | 'background' | 'class';

const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, unique: 3 };

export const HeaderBar: React.FC = () => {
  const { character, updateIdentity, setAncestry, setBackground, setClass } = useCharacterStore();
  const { gameData } = useDataStore();
  const { showTooltip, hideTooltip, showConfirm } = useUiStore();
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [openPicker, setOpenPicker] = useState<PickerType | null>(null);

  const scores = computeAbilityScores(character.abilityBoosts, character.manualAbilityScores);

  const ancestry = gameData?.ancestries.find(a => a._id === character.ancestryId);
  const heritage = character.heritageId
    ? gameData?.ancestryFeatures.find(h => h._id === character.heritageId)
    : null;
  const background = gameData?.backgrounds.find(b => b._id === character.backgroundId);
  const cls = gameData?.classes.find(c => c._id === character.classId);

  // --- Picker item lists ---

  const ancestryItems = useMemo((): PickerItem[] => {
    if (!gameData) return [];
    return gameData.ancestries
      .sort((a, b) => {
        const ra = RARITY_ORDER[a.system.traits?.rarity ?? 'common'] ?? 0;
        const rb = RARITY_ORDER[b.system.traits?.rarity ?? 'common'] ?? 0;
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

  const backgroundItems = useMemo((): PickerItem[] => {
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

  const classItems = useMemo((): PickerItem[] => {
    if (!gameData) return [];
    return gameData.classes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => {
        const keyAbilities = c.system.keyAbility?.value ?? [];
        return {
          id: c._id,
          name: c.name,
          subtitle: `${c.system.hp} HP${keyAbilities.length > 0 ? ` · ${keyAbilities.map(a => ABILITY_SHORT[a as Ability]).join('/')}` : ''}`,
          rawItem: c,
        };
      });
  }, [gameData]);

  // --- Picker selection handlers ---

  const handlePickAncestry = (id: string) => {
    if (!gameData) return;
    const ancestryData = gameData.ancestries.find(a => a._id === id);
    const fixedBoosts: Partial<Record<Ability, boolean>> = {};
    const fixedFlaws: Partial<Record<Ability, boolean>> = {};
    if (ancestryData) {
      for (const group of Object.values(ancestryData.system.boosts ?? {})) {
        const v = (group.value ?? []) as Ability[];
        if (v.length === 1 && v[0] !== ('anything' as Ability)) fixedBoosts[v[0]] = true;
      }
      for (const group of Object.values(ancestryData.system.flaws ?? {})) {
        const v = (group.value ?? []) as Ability[];
        if (v.length === 1) fixedFlaws[v[0]] = true;
      }
    }
    setAncestry(id, fixedBoosts, fixedFlaws);
    setOpenPicker(null);
    setOpenModal('ancestry');
  };

  const handlePickBackground = (id: string) => {
    setBackground(id);
    setOpenPicker(null);
    setOpenModal('background');
  };

  const handlePickClass = (id: string) => {
    if (character.classId && character.classId !== id) {
      showConfirm(
        'Changing your class will clear class feats and spellcasting choices. Continue?',
        () => {
          setClass(id, true);
          setOpenPicker(null);
          setOpenModal('class');
        },
      );
    } else {
      setClass(id, false);
      setOpenPicker(null);
      setOpenModal('class');
    }
  };

  return (
    <div className="sticky top-14 z-20 bg-stone-900 border-b border-stone-700/50 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">

        {/* Identity fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
          <InlineField
            label="Character Name"
            value={character.name}
            onChange={v => updateIdentity({ name: v })}
            placeholder="Unnamed"
            bold
          />
          <InlineField
            label="Player"
            value={character.playerName}
            onChange={v => updateIdentity({ playerName: v })}
            placeholder="—"
          />
          <InlineField
            label="Deity / Faith"
            value={character.deity ?? ''}
            onChange={v => updateIdentity({ deity: v })}
            placeholder="—"
          />
          <InlineField
            label="Age"
            value={character.age ?? ''}
            onChange={v => updateIdentity({ age: v })}
            placeholder="—"
          />
        </div>

        {/* Core selection pills */}
        <div className="flex flex-wrap gap-2">
          <SelectionPill
            value={ancestry
              ? `${ancestry.name}${heritage ? ` · ${heritage.name}` : ''}`
              : undefined}
            placeholder="Choose Ancestry"
            onClick={() => character.ancestryId ? setOpenModal('ancestry') : setOpenPicker('ancestry')}
            onEdit={() => setOpenPicker('ancestry')}
            hasValue={!!character.ancestryId}
          />
          <SelectionPill
            value={background?.name}
            placeholder="Choose Background"
            onClick={() => character.backgroundId ? setOpenModal('background') : setOpenPicker('background')}
            onEdit={() => setOpenPicker('background')}
            hasValue={!!character.backgroundId}
          />
          <SelectionPill
            value={cls?.name}
            placeholder="Choose Class"
            onClick={() => character.classId ? setOpenModal('class') : setOpenPicker('class')}
            onEdit={() => setOpenPicker('class')}
            hasValue={!!character.classId}
          />
        </div>

        {/* Ability scores + quick action buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {ABILITIES.map(ab => {
            const score = scores[ab];
            const mod = abilityModifier(score);
            return (
              <div
                key={ab}
                className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800/60 text-xs"
              >
                <span className="text-stone-500 w-6 uppercase tracking-wide font-medium">
                  {ABILITY_SHORT[ab]}
                </span>
                <span className="font-bold text-stone-100 w-5 text-center">{score}</span>
                <span className={`font-medium w-7 text-right ${mod >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {formatModifier(mod)}
                </span>
              </div>
            );
          })}
          <div className="flex gap-1.5 ml-auto">
            <QuickButton onClick={() => setOpenModal('ability-scores')}>
              Boosts
            </QuickButton>
            <QuickButton onClick={() => setOpenModal('skills')}>
              Skills
            </QuickButton>
          </div>
        </div>
      </div>

      {/* Direct picker modals (opened from pills) */}
      {openPicker === 'ancestry' && (
        <PickerModal
          items={ancestryItems}
          selectedId={character.ancestryId}
          title="Select Ancestry"
          searchPlaceholder="Search ancestries…"
          onSelect={handlePickAncestry}
          onClose={() => setOpenPicker(null)}
          showTooltip={showTooltip}
          hideTooltip={hideTooltip}
        />
      )}
      {openPicker === 'background' && (
        <PickerModal
          items={backgroundItems}
          selectedId={character.backgroundId}
          title="Select Background"
          searchPlaceholder="Search backgrounds…"
          onSelect={handlePickBackground}
          onClose={() => setOpenPicker(null)}
          showTooltip={showTooltip}
          hideTooltip={hideTooltip}
        />
      )}
      {openPicker === 'class' && (
        <PickerModal
          items={classItems}
          selectedId={character.classId}
          title="Select Class"
          searchPlaceholder="Search classes…"
          onSelect={handlePickClass}
          onClose={() => setOpenPicker(null)}
          showTooltip={showTooltip}
          hideTooltip={hideTooltip}
        />
      )}

      {/* Section detail modals */}
      <Modal open={openModal === 'ancestry'} onClose={() => setOpenModal(null)} title="Ancestry & Heritage" maxWidth="max-w-2xl">
        <AncestrySection />
      </Modal>
      <Modal open={openModal === 'background'} onClose={() => setOpenModal(null)} title="Background" maxWidth="max-w-2xl">
        <BackgroundSection />
      </Modal>
      <Modal open={openModal === 'class'} onClose={() => setOpenModal(null)} title="Class" maxWidth="max-w-2xl">
        <ClassSection />
      </Modal>
      <Modal open={openModal === 'ability-scores'} onClose={() => setOpenModal(null)} title="Ability Scores & Boosts" maxWidth="max-w-2xl">
        <AbilityScoresSection />
      </Modal>
      <Modal open={openModal === 'skills'} onClose={() => setOpenModal(null)} title="Skills & Proficiencies" maxWidth="max-w-2xl">
        <SkillsSection />
      </Modal>
    </div>
  );
};

const InlineField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  bold?: boolean;
}> = ({ label, value, onChange, placeholder, bold }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <label className="text-xs text-stone-600 uppercase tracking-wide leading-none">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent border-0 border-b border-stone-700/60 focus:border-amber-500
                  text-stone-100 placeholder-stone-700 text-sm focus:outline-none py-0.5 w-full
                  ${bold ? 'font-semibold' : ''}`}
    />
  </div>
);

const SelectionPill: React.FC<{
  value?: string;
  placeholder: string;
  onClick: () => void;
  onEdit?: () => void;
  hasValue?: boolean;
}> = ({ value, placeholder, onClick, onEdit, hasValue }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium transition-colors ${
      value
        ? 'bg-stone-800 border-stone-600 text-stone-200 hover:border-amber-600/50 hover:bg-stone-700'
        : 'bg-transparent border-stone-700 border-dashed text-stone-600 hover:text-stone-400 hover:border-stone-500'
    }`}
  >
    {value ? (
      <>
        <span className="text-amber-500/60 text-xs">✓</span>
        <span>{value}</span>
        {onEdit && hasValue && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="text-stone-500 hover:text-amber-400 text-xs ml-0.5 transition-colors"
            title="Change selection"
          >
            ✎
          </span>
        )}
      </>
    ) : (
      <><span className="text-stone-600">+</span><span>{placeholder}</span></>
    )}
  </button>
);

const QuickButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200
               border border-stone-700 rounded transition-colors"
  >
    {children}
  </button>
);
