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
    <div className="bg-ledger-bg min-h-screen">
      <HeaderBar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Level sections 1–20 */}
        <div className="space-y-1 mb-8">
          {LEVELS.map(level => (
            <LevelSection key={level} level={level} />
          ))}
        </div>

        {/* Spells & Equipment */}
        <div className="space-y-1 pt-2">
          <Collapsible
            id="spells"
            title="Spells"
            badge={spellCount || undefined}
            collapsed={collapsedSections.has('spells')}
            onToggle={() => toggleSection('spells')}
          >
            <SpellsSection />
          </Collapsible>

          <Collapsible
            id="equipment"
            title="Equipment"
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
