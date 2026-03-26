import React, { useEffect } from 'react';
import { useDataStore } from './store/dataStore';
import { useCharacterStore } from './store/characterStore';
import { useUiStore } from './store/uiStore';
import { LoadingScreen } from './components/shared/LoadingScreen';
import { CharacterBuilder } from './components/builder/CharacterBuilder';
import { CharacterSheet } from './components/sheet/CharacterSheet';
import { ProgressionView } from './components/progression/ProgressionView';
import { ItemTooltip } from './components/shared/Tooltip';
import { ShareModal } from './components/shared/ShareModal';
import { SettingsPanel } from './components/shared/SettingsPanel';
import { ConfirmModal } from './components/shared/Modal';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

export default function App() {
  const { gameData, loading, progress, error, loadData } = useDataStore();
  const initCharacter = useCharacterStore(s => s.initCharacter);
  const currentView = useCharacterStore(s => s.view);
  const setCurrentView = useCharacterStore(s => s.setView);
  const character = useCharacterStore(s => s.character);

  const darkMode = useUiStore(s => s.darkMode);
  const tooltip = useUiStore(s => s.tooltip);
  const hideTooltip = useUiStore(s => s.hideTooltip);
  const setShareModalOpen = useUiStore(s => s.setShareModalOpen);
  const setSettingsOpen = useUiStore(s => s.setSettingsOpen);
  const confirmModal = useUiStore(s => s.confirmModal);
  const dismissConfirm = useUiStore(s => s.dismissConfirm);
  const notification = useUiStore(s => s.notification);
  const dismissNotification = useUiStore(s => s.dismissNotification);

  useEffect(() => {
    initCharacter();
    loadData();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  if (loading || !gameData) {
    return (
      <LoadingScreen
        progress={progress}
        error={error}
        onRetry={() => loadData(true)}
      />
    );
  }

  return (
    <ErrorBoundary>
    <div className={`min-h-screen ${darkMode ? 'bg-stone-950 text-stone-100' : 'bg-gray-100 text-gray-900'}`}>
      {/* Top Navigation */}
      <TopNav
        view={currentView}
        onViewChange={setCurrentView}
        onShare={() => setShareModalOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        characterName={character.name}
      />

      {/* Main content */}
      <main className="pt-14">
        {currentView === 'builder' && <CharacterBuilder />}
        {currentView === 'sheet' && (
          <div className="max-w-4xl mx-auto px-4 pb-8">
            <CharacterSheet />
          </div>
        )}
        {currentView === 'progression' && (
          <div className="max-w-2xl mx-auto pb-8">
            <ProgressionView />
          </div>
        )}
      </main>

      {/* Tooltip overlay */}
      {tooltip.item && (
        <ItemTooltip
          item={tooltip.item}
          anchor={tooltip.anchor}
          onHide={hideTooltip}
        />
      )}

      {/* Modals */}
      <ShareModal />
      <SettingsPanel />

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={dismissConfirm}
        />
      )}

      {/* Toast notification */}
      {notification && (
        <div
          onClick={dismissNotification}
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium cursor-pointer ${
            notification.type === 'success' ? 'bg-green-800 text-green-100' :
            notification.type === 'error' ? 'bg-red-800 text-red-100' :
            'bg-stone-700 text-stone-100'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}

// ——— Top Navigation Bar ———
type ViewType = 'builder' | 'sheet' | 'progression';

const TopNav: React.FC<{
  view: ViewType;
  onViewChange: (v: ViewType) => void;
  onShare: () => void;
  onSettings: () => void;
  characterName: string;
}> = ({ view, onViewChange, onShare, onSettings, characterName }) => (
  <nav className="fixed top-0 left-0 right-0 z-30 h-14 bg-stone-900 border-b border-stone-700/50 flex items-center px-3 gap-2 shadow-md print:hidden">
    {/* Logo */}
    <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
      <span className="text-xl">⚔️</span>
      <span className="text-amber-400 font-bold text-sm hidden sm:block whitespace-nowrap">PF2e Builder</span>
    </div>

    {/* Character name */}
    <div className="text-stone-300 text-sm font-medium truncate max-w-28 sm:max-w-44">
      {characterName || <span className="text-stone-600 italic">Unnamed</span>}
    </div>

    {/* View switcher */}
    <div className="flex rounded-md overflow-hidden border border-stone-700 ml-auto flex-shrink-0">
      {([
        ['builder', '🔨', 'Builder'],
        ['sheet', '📋', 'Sheet'],
        ['progression', '📊', 'Timeline'],
      ] as const).map(([v, icon, label]) => (
        <button
          key={v}
          onClick={() => onViewChange(v)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
            view === v
              ? 'bg-amber-600 text-white'
              : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-300'
          }`}
        >
          <span>{icon}</span>
          <span className="hidden sm:block">{label}</span>
        </button>
      ))}
    </div>

    {/* Action buttons */}
    <button
      onClick={onShare}
      title="Save & Share"
      className="flex-shrink-0 p-2 text-stone-400 hover:text-stone-200 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    </button>

    <button
      onClick={() => window.print()}
      title="Print / Export PDF"
      className="flex-shrink-0 p-2 text-stone-400 hover:text-stone-200 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    </button>

    <button
      onClick={onSettings}
      title="Settings"
      className="flex-shrink-0 p-2 text-stone-400 hover:text-stone-200 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  </nav>
);
