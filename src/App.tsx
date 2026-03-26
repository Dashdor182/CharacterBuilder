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
      <div className="min-h-screen bg-ledger-bg text-ledger-text">
        <TopNav
          view={currentView}
          onViewChange={setCurrentView}
          onShare={() => setShareModalOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          characterName={character.name}
        />

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

        {tooltip.item && (
          <ItemTooltip item={tooltip.item} anchor={tooltip.anchor} onHide={hideTooltip} />
        )}

        <ShareModal />
        <SettingsPanel />

        {confirmModal && (
          <ConfirmModal
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={dismissConfirm}
          />
        )}

        {notification && (
          <div
            onClick={dismissNotification}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-sm shadow-xl text-sm font-medium cursor-pointer font-sans tracking-wide ${
              notification.type === 'success'
                ? 'bg-ledger-success text-ledger-text'
                : notification.type === 'error'
                  ? 'bg-ledger-error text-ledger-text'
                  : 'bg-ledger-surface-highest text-ledger-text'
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

/* ─── Top Navigation ────────────────────────────────────── */
type ViewType = 'builder' | 'sheet' | 'progression';

const NAV_TABS: Array<[ViewType, string]> = [
  ['builder',     'LEVELING'],
  ['sheet',       'OVERVIEW'],
  ['progression', 'TIMELINE'],
];

const TopNav: React.FC<{
  view: ViewType;
  onViewChange: (v: ViewType) => void;
  onShare: () => void;
  onSettings: () => void;
  characterName: string;
}> = ({ view, onViewChange, onShare, onSettings, characterName }) => (
  <nav
    className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-5 gap-6 print:hidden"
    style={{ background: 'rgba(52, 53, 56, 0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
  >
    {/* Logo + character name */}
    <div className="flex-shrink-0 min-w-0">
      <div className="font-serif text-ledger-gold font-bold text-sm tracking-[0.08em] uppercase leading-none">
        The Alchemist's Ledger
      </div>
      <div className="text-[10px] font-sans text-ledger-text-muted tracking-[0.05em] uppercase mt-0.5 truncate max-w-36">
        {characterName || <span className="italic">Unnamed Hero</span>}
      </div>
    </div>

    {/* Separator */}
    <div className="w-px h-6 bg-ledger-surface-highest flex-shrink-0" />

    {/* View tabs */}
    <div className="flex items-center gap-0.5">
      {NAV_TABS.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onViewChange(v)}
          className={`relative px-3 py-1.5 text-[11px] font-sans font-semibold tracking-[0.1em] transition-colors ${
            view === v
              ? 'text-ledger-gold'
              : 'text-ledger-text-dim hover:text-ledger-text'
          }`}
        >
          {label}
          {view === v && (
            <span
              className="absolute bottom-0 left-3 right-3 h-px bg-ledger-gold"
              style={{ background: 'linear-gradient(90deg, transparent, #e9c176, transparent)' }}
            />
          )}
        </button>
      ))}
    </div>

    {/* Right actions */}
    <div className="ml-auto flex items-center gap-2 flex-shrink-0">
      <button
        onClick={onShare}
        className="px-3 py-1.5 text-[11px] font-sans font-semibold tracking-[0.08em] uppercase rounded-sm
                   border border-ledger-surface-highest text-ledger-text-dim hover:text-ledger-text
                   hover:border-ledger-gold/40 transition-colors"
      >
        Save
      </button>
      <button
        onClick={() => window.print()}
        className="px-3 py-1.5 text-[11px] font-sans font-semibold tracking-[0.08em] uppercase rounded-sm
                   text-ledger-on-gold transition-opacity hover:opacity-85"
        style={{ background: 'linear-gradient(135deg, #e9c176, #c5a059)' }}
      >
        Export
      </button>
      <button
        onClick={onSettings}
        title="Settings"
        className="p-2 text-ledger-text-dim hover:text-ledger-text transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </nav>
);
