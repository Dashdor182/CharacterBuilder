import React from 'react';
import type { LoadProgress } from '../../data/loader';

interface LoadingScreenProps {
  progress: LoadProgress | null;
  error: string | null;
  onRetry: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, error, onRetry }) => {
  const pct = progress ? Math.min(Math.round((progress.current / progress.total) * 100), 100) : 0;

  return (
    <div className="fixed inset-0 bg-stone-950 flex flex-col items-center justify-center z-50 p-6">
      {/* Logo / Title */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">⚔️</div>
        <h1 className="text-3xl font-bold text-amber-400 tracking-tight">PF2e Character Builder</h1>
        <p className="text-stone-400 text-sm mt-1">Pathfinder Second Edition</p>
      </div>

      {error ? (
        <div className="max-w-md w-full text-center">
          <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg mb-4">
            <p className="text-red-300 text-sm">{error}</p>
            <p className="text-stone-500 text-xs mt-2">
              Check your internet connection and try again.
            </p>
          </div>
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          {/* Progress bar */}
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between items-center">
            <p className="text-stone-300 text-sm">
              {progress?.stage ?? 'Initializing…'}
            </p>
            <span className="text-stone-500 text-xs font-mono">{pct}%</span>
          </div>

          <p className="text-stone-600 text-xs mt-4 text-center">
            Fetching game data from Foundry VTT PF2e repository
          </p>
        </div>
      )}
    </div>
  );
};
