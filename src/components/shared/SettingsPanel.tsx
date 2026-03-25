import React from 'react';
import { Modal } from './Modal';
import { useUiStore } from '../../store/uiStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDataStore } from '../../store/dataStore';
import { getCacheInfo } from '../../data/loader';

export const SettingsPanel: React.FC = () => {
  const { settingsOpen, setSettingsOpen, darkMode, toggleDarkMode } = useUiStore();
  const { character, setVariantRule, resetCharacter } = useCharacterStore();
  const { loadData } = useDataStore();
  const { showConfirm, showNotification } = useUiStore();

  const cacheInfo = getCacheInfo();
  const cacheAgeHours = cacheInfo.age ? Math.round(cacheInfo.age / 3600000) : null;

  const handleRefreshData = async () => {
    setSettingsOpen(false);
    await loadData(true);
    showNotification('Game data refreshed!', 'success');
  };

  const handleNewCharacter = () => {
    showConfirm(
      'Start a new character? All unsaved progress will be lost.',
      () => {
        resetCharacter();
        setSettingsOpen(false);
        showNotification('New character started', 'info');
      }
    );
  };

  return (
    <Modal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Settings"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* Appearance */}
        <section>
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Appearance</h3>
          <Toggle
            label="Dark Mode"
            description="Use dark color scheme"
            checked={darkMode}
            onChange={toggleDarkMode}
          />
        </section>

        {/* Variant Rules */}
        <section className="border-t border-stone-700/50 pt-5">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Variant Rules</h3>
          <div className="space-y-3">
            <Toggle
              label="Free Archetype"
              description="Gain a bonus archetype feat at every even level"
              checked={character.variantRules.freeArchetype}
              onChange={v => setVariantRule('freeArchetype', v)}
            />
            <Toggle
              label="Ancestry Paragon"
              description="Gain bonus ancestry feats at every odd level"
              checked={character.variantRules.ancestryParagon}
              onChange={v => setVariantRule('ancestryParagon', v)}
            />
            <div>
              <label className="text-sm text-stone-300 block mb-1">Ability Score Method</label>
              <p className="text-xs text-stone-500 mb-2">How ability scores are generated</p>
              <div className="flex gap-2">
                {(['boosts', 'manual'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => setVariantRule('abilityVariant', method)}
                    className={`flex-1 py-2 rounded text-sm transition-colors capitalize ${
                      character.variantRules.abilityVariant === method
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                    }`}
                  >
                    {method === 'boosts' ? 'Standard Boosts' : 'Manual Entry'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Data */}
        <section className="border-t border-stone-700/50 pt-5">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Game Data</h3>
          <div className="text-xs text-stone-500 mb-3">
            {cacheInfo.age ? (
              <span>
                Cached {cacheAgeHours}h ago · {cacheInfo.itemCount?.toLocaleString()} items
              </span>
            ) : (
              <span>No cached data</span>
            )}
          </div>
          <button
            onClick={handleRefreshData}
            className="w-full py-2 rounded-md border border-stone-600 text-stone-300 hover:bg-stone-800 text-sm transition-colors"
          >
            ↻ Refresh Game Data
          </button>
          <p className="text-xs text-stone-600 mt-1.5 text-center">
            Fetches latest data from Foundry VTT PF2e repository
          </p>
        </section>

        {/* Danger Zone */}
        <section className="border-t border-stone-700/50 pt-5">
          <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
          <button
            onClick={handleNewCharacter}
            className="w-full py-2 rounded-md border border-red-800/50 text-red-400 hover:bg-red-900/20 text-sm transition-colors"
          >
            New Character (clear all)
          </button>
        </section>
      </div>
    </Modal>
  );
};

const Toggle: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <div className="text-sm text-stone-300">{label}</div>
      {description && <div className="text-xs text-stone-500 mt-0.5">{description}</div>}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-amber-600' : 'bg-stone-700'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  </div>
);
