import React from 'react';

interface LevelSelectorProps {
  currentLevel: number;
  onSelect: (level: number) => void;
  completedLevels?: Set<number>;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  currentLevel, onSelect, completedLevels = new Set(),
}) => {
  return (
    <div className="bg-stone-800/50 border border-stone-700/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Level</span>
        <span className="text-amber-400 font-bold text-lg ml-auto">{currentLevel}</span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 20 }, (_, i) => {
          const level = i + 1;
          const isActive = level === currentLevel;
          const isDone = completedLevels.has(level) && level < currentLevel;

          return (
            <button
              key={level}
              onClick={() => onSelect(level)}
              title={`Level ${level}`}
              className={`
                h-8 w-full rounded text-xs font-semibold transition-all
                ${isActive
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/50'
                  : isDone
                    ? 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                    : 'bg-stone-900 text-stone-500 hover:bg-stone-700 hover:text-stone-300'
                }
              `}
            >
              {level}
            </button>
          );
        })}
      </div>
    </div>
  );
};
