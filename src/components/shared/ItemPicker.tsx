import React, { useState, useRef, useEffect } from 'react';

interface PickerItem {
  id: string;
  name: string;
  subtitle?: string;
  tag?: string;
  tagColor?: string;
}

interface ItemPickerProps {
  items: PickerItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder: string;
  searchPlaceholder?: string;
}

/**
 * Compact searchable dropdown for selecting a single item from a large list.
 * Shows the selected item name inline; clicking opens a search + scrollable list.
 */
export const ItemPicker: React.FC<ItemPickerProps> = ({
  items, selectedId, onSelect, placeholder, searchPlaceholder,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find(i => i.id === selectedId) ?? null;

  const filtered = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left
          ${open
            ? 'border-amber-500 bg-stone-800 text-stone-200'
            : selected
              ? 'border-amber-600/60 bg-stone-800/80 text-stone-200 hover:border-amber-500'
              : 'border-stone-700 bg-stone-900 text-stone-500 hover:border-stone-600 hover:text-stone-400'
          }
        `}
      >
        <span className="flex-1 truncate font-medium">
          {selected ? selected.name : placeholder}
        </span>
        {selected && selected.subtitle && (
          <span className="text-xs text-stone-500 flex-shrink-0">{selected.subtitle}</span>
        )}
        {selected && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onSelect(null); }}
            className="text-stone-500 hover:text-red-400 flex-shrink-0 px-0.5 transition-colors"
            title="Clear selection"
          >
            ×
          </span>
        )}
        <svg className={`w-3.5 h-3.5 text-stone-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-stone-900 border border-stone-700 rounded-lg shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-stone-800">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder ?? 'Search…'}
              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-200
                         placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-stone-600 text-xs px-3 py-4 text-center">No results</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onSelect(item.id); setOpen(false); }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                    ${item.id === selectedId
                      ? 'bg-amber-600/20 text-amber-300'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                    }
                  `}
                >
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.subtitle && (
                    <span className="text-xs text-stone-500 flex-shrink-0">{item.subtitle}</span>
                  )}
                  {item.tag && (
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${item.tagColor ?? 'bg-stone-700 text-stone-400'}`}>
                      {item.tag}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
