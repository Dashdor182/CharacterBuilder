import React, { useState } from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { useDataStore } from '../../store/dataStore';
import { Modal } from '../shared/Modal';
import { AncestrySection } from './sections/AncestrySection';
import { BackgroundSection } from './sections/BackgroundSection';
import { ClassSection } from './sections/ClassSection';
import { AbilityScoresSection } from './sections/AbilityScoresSection';
import { SkillsSection } from './sections/SkillsSection';
import {
  computeAbilityScores, abilityModifier, formatModifier, ABILITIES, ABILITY_SHORT,
} from '../../utils/calculations';

type ModalType = 'ancestry' | 'background' | 'class' | 'ability-scores' | 'skills' | null;

export const HeaderBar: React.FC = () => {
  const { character, updateIdentity } = useCharacterStore();
  const { gameData } = useDataStore();
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const scores = computeAbilityScores(character.abilityBoosts, character.manualAbilityScores);

  const ancestry = gameData?.ancestries.find(a => a._id === character.ancestryId);
  const heritage = character.heritageId
    ? gameData?.ancestryFeatures.find(h => h._id === character.heritageId)
    : null;
  const background = gameData?.backgrounds.find(b => b._id === character.backgroundId);
  const cls = gameData?.classes.find(c => c._id === character.classId);

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
            onClick={() => setOpenModal('ancestry')}
          />
          <SelectionPill
            value={background?.name}
            placeholder="Choose Background"
            onClick={() => setOpenModal('background')}
          />
          <SelectionPill
            value={cls?.name}
            placeholder="Choose Class"
            onClick={() => setOpenModal('class')}
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

      {/* Section modals */}
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
}> = ({ value, placeholder, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium transition-colors ${
      value
        ? 'bg-stone-800 border-stone-600 text-stone-200 hover:border-amber-600/50 hover:bg-stone-700'
        : 'bg-transparent border-stone-700 border-dashed text-stone-600 hover:text-stone-400 hover:border-stone-500'
    }`}
  >
    {value ? (
      <><span className="text-amber-500/60 text-xs">✓</span><span>{value}</span></>
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
