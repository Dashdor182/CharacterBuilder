import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { useCharacterStore } from '../../store/characterStore';
import { useUiStore } from '../../store/uiStore';
import {
  encodeCharacterToURL, exportCharacterJSON, importCharacterJSON,
  listSavedCharacters, saveCharacterSlot, loadCharacterSlot, deleteCharacterSlot,
} from '../../utils/sharing';

export const ShareModal: React.FC = () => {
  const { shareModalOpen, setShareModalOpen, showNotification } = useUiStore();
  const { character, loadCharacter } = useCharacterStore();
  const [urlCopied, setUrlCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyURL = async () => {
    try {
      const url = encodeCharacterToURL(character);
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      showNotification('Failed to copy URL', 'error');
    }
  };

  const handleExportJSON = () => {
    exportCharacterJSON(character);
    showNotification('Character exported!', 'success');
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importCharacterJSON(file);
      loadCharacter(imported);
      setShareModalOpen(false);
      showNotification(`Loaded "${imported.name || 'character'}"`, 'success');
    } catch (err) {
      showNotification('Invalid character file', 'error');
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveSlot = () => {
    saveCharacterSlot(character);
    showNotification('Character saved!', 'success');
  };

  const saved = listSavedCharacters();

  return (
    <Modal
      open={shareModalOpen}
      onClose={() => setShareModalOpen(false)}
      title="Save & Share"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* URL Sharing */}
        <section>
          <h3 className="text-sm font-semibold text-stone-300 mb-2">Share via URL</h3>
          <p className="text-xs text-stone-500 mb-3">
            Encodes the full character into a shareable URL using compression.
            Share this link to restore the exact character state.
          </p>
          <button
            onClick={handleCopyURL}
            className={`w-full py-2.5 rounded-md text-sm font-medium transition-all ${
              urlCopied
                ? 'bg-green-700 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {urlCopied ? '✓ Copied!' : '🔗 Copy Share URL'}
          </button>
        </section>

        {/* JSON Export/Import */}
        <section className="border-t border-stone-700/50 pt-5">
          <h3 className="text-sm font-semibold text-stone-300 mb-2">JSON Export / Import</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 py-2 rounded-md border border-stone-600 text-stone-300 hover:bg-stone-800 text-sm transition-colors"
            >
              ↓ Export JSON
            </button>
            <label className="flex-1 py-2 rounded-md border border-stone-600 text-stone-300 hover:bg-stone-800 text-sm cursor-pointer text-center transition-colors">
              ↑ Import JSON
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>
        </section>

        {/* Local Save Slots */}
        <section className="border-t border-stone-700/50 pt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-300">Saved Characters</h3>
            <button
              onClick={handleSaveSlot}
              className="text-xs px-2.5 py-1 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded transition-colors"
            >
              + Save Current
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="text-xs text-stone-600">No saved characters yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {saved.map(meta => (
                <div key={meta.id} className="flex items-center gap-2 p-2 bg-stone-800/50 rounded text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-stone-300 truncate">{meta.name}</div>
                    <div className="text-xs text-stone-600">
                      Level {meta.level} · {new Date(meta.savedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const char = loadCharacterSlot(meta.id);
                      if (char) {
                        loadCharacter(char);
                        setShareModalOpen(false);
                        showNotification(`Loaded "${char.name}"`, 'success');
                      }
                    }}
                    className="text-xs px-2 py-0.5 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => deleteCharacterSlot(meta.id)}
                    className="text-xs text-stone-600 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
};
