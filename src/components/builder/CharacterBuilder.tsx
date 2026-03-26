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

// Left column: character identity & core stats
const LEFT_SECTIONS = [
  { id: 'identity', title: 'Identity', icon: '👤' },
  { id: 'ancestry', title: 'Ancestry & Heritage', icon: '🌿' },
  { id: 'background', title: 'Background', icon: '📜' },
  { id: 'class', title: 'Class', icon: '⚔️' },
  { id: 'ability-scores', title: 'Ability Scores', icon: '💪' },
] as const;

// Right column: skills, feats, equipment
const RIGHT_SECTIONS = [
  { id: 'skills', title: 'Skills', icon: '🎯' },
  { id: 'feats', title: 'Feats', icon: '⭐' },
  { id: 'spells', title: 'Spells', icon: '✨' },
  { id: 'equipment', title: 'Equipment', icon: '🎒' },
] as const;

type SectionId =
  | typeof LEFT_SECTIONS[number]['id']
  | typeof RIGHT_SECTIONS[number]['id'];

export const CharacterBuilder: React.FC = () => {
  const { character, setCurrentLevel } = useCharacterStore();
  const { gameData } = useDataStore();
  const { collapsedSections, toggleSection } = useUiStore();

  const isSectionOpen = (id: string) => !collapsedSections.has(id);

  const sectionBadges: Partial<Record<SectionId, string | number>> = {
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

  const renderSection = (id: SectionId, title: string, icon: string) => (
    <Collapsible
      key={id}
      id={id}
      title={title}
      icon={icon}
      badge={sectionBadges[id]}
      collapsed={!isSectionOpen(id)}
      onToggle={() => toggleSection(id)}
    >
      <SectionContent id={id} />
    </Collapsible>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8 pt-4">
      {/* Level Selector */}
      <div className="mb-4">
        <LevelSelector
          currentLevel={character.currentLevel}
          onSelect={setCurrentLevel}
        />
      </div>

      {/* Two-column layout on large screens */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0">
        {/* Left column */}
        <div className="space-y-3">
          {LEFT_SECTIONS.map(({ id, title, icon }) => renderSection(id, title, icon))}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {RIGHT_SECTIONS.map(({ id, title, icon }) => renderSection(id, title, icon))}
        </div>
      </div>
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
