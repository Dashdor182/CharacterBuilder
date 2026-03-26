import React from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { useUiStore } from '../../store/uiStore';
import { HeaderBar } from './HeaderBar';
import { LevelSection } from './LevelSection';
import { Collapsible } from '../shared/Collapsible';
import { SpellsSection } from './sections/SpellsSection';
import { EquipmentSection } from './sections/EquipmentSection';

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

export const CharacterBuilder: React.FC = () => {
  const { character } = useCharacterStore();
  const { collapsedSections, toggleSection } = useUiStore();

  const spellCount = character.spellcasting.reduce((n, e) => n + e.knownSpells.length, 0);

  return (
    <div>
      {/* Sticky identity + core selections header */}
      <HeaderBar />

      {/* Scrollable content */}
      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* Level sections 1–20 */}
        <div className="space-y-1.5 mb-6">
          {LEVELS.map(level => (
            <LevelSection key={level} level={level} />
          ))}
        </div>

        {/* Spells & Equipment below the level plan */}
        <div className="border-t border-stone-800/60 pt-4 space-y-2">
          <Collapsible
            id="spells"
            title="Spells"
            icon="✨"
            badge={spellCount || undefined}
            collapsed={collapsedSections.has('spells')}
            onToggle={() => toggleSection('spells')}
          >
            <SpellsSection />
          </Collapsible>

          <Collapsible
            id="equipment"
            title="Equipment"
            icon="🎒"
            badge={character.equipment.length || undefined}
            collapsed={collapsedSections.has('equipment')}
            onToggle={() => toggleSection('equipment')}
          >
            <EquipmentSection />
          </Collapsible>
        </div>
      </div>
    </div>
  );
};
