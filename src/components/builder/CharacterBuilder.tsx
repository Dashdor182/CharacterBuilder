import React from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { Collapsible } from '../shared/Collapsible';
import { LevelSelector } from './LevelSelector';
import { IdentitySection } from './sections/IdentitySection';
import { AncestrySection } from './sections/AncestrySection';
import { BackgroundSection } from './sections/BackgroundSection';
import { ClassSection } from './sections/ClassSection';
import { AbilityScoresSection } from './sections/AbilityScoresSection';
import { SkillsSection } from './sections/SkillsSection';
import { FeatsSection } from './sections/FeatsSection';
import { SpellsSection } from './sections/SpellsSection';
import { EquipmentSection } from './sections/EquipmentSection';

const SECTIONS = [
  { id: 'identity', title: 'Identity', icon: '👤' },
  { id: 'ancestry', title: 'Ancestry & Heritage', icon: '🌿' },
  { id: 'background', title: 'Background', icon: '📜' },
  { id: 'class', title: 'Class', icon: '⚔️' },
  { id: 'ability-scores', title: 'Ability Scores', icon: '💪' },
  { id: 'skills', title: 'Skills', icon: '🎯' },
  { id: 'feats', title: 'Feats', icon: '⭐' },
  { id: 'spells', title: 'Spells', icon: '✨' },
  { id: 'equipment', title: 'Equipment', icon: '🎒' },
] as const;

export const CharacterBuilder: React.FC = () => {
  const { character, setCurrentLevel } = useCharacterStore();
  const { gameData } = useDataStore();
  const { collapsedSections, toggleSection } = useUiStore();

  const isSectionOpen = (id: string) => !collapsedSections.has(id);

  // Badge values for sections
  const sectionBadges: Partial<Record<typeof SECTIONS[number]['id'], string | number>> = {
    ancestry: character.ancestryId
      ? gameData?.ancestries.find(a => a._id === character.ancestryId)?.name
      : undefined,
    background: character.backgroundId
      ? gameData?.backgrounds.find(b => b._id === character.backgroundId)?.name
      : undefined,
    class: character.classId
      ? gameData?.classes.find(c => c._id === character.classId)?.name
      : undefined,
    feats: character.levels.reduce((count, l) => count + l.feats.filter(f => f.selectedFeatId).length, 0) || undefined,
    spells: character.spellcasting.reduce((count, e) => count + e.knownSpells.length, 0) || undefined,
    equipment: character.equipment.length || undefined,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8 pt-4 space-y-3">
      {/* Level Selector */}
      <LevelSelector
        currentLevel={character.currentLevel}
        onSelect={setCurrentLevel}
      />

      {/* Sections */}
      {SECTIONS.map(({ id, title, icon }) => (
        <Collapsible
          key={id}
          id={id}
          title={title}
          icon={icon}
          badge={sectionBadges[id as keyof typeof sectionBadges]}
          collapsed={!isSectionOpen(id)}
          onToggle={() => toggleSection(id)}
        >
          <SectionContent id={id} />
        </Collapsible>
      ))}
    </div>
  );
};

const SectionContent: React.FC<{ id: string }> = ({ id }) => {
  switch (id) {
    case 'identity': return <IdentitySection />;
    case 'ancestry': return <AncestrySection />;
    case 'background': return <BackgroundSection />;
    case 'class': return <ClassSection />;
    case 'ability-scores': return <AbilityScoresSection />;
    case 'skills': return <SkillsSection />;
    case 'feats': return <FeatsSection />;
    case 'spells': return <SpellsSection />;
    case 'equipment': return <EquipmentSection />;
    default: return null;
  }
};
