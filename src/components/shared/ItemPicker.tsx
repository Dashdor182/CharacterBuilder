import React, { useState, useMemo } from 'react';
import type { FoundryItem } from '../../types/pf2e';
import { useUiStore } from '../../store/uiStore';
import { Modal } from './Modal';
import { TooltipTrigger } from './Tooltip';
import { SearchBar } from './SearchBar';

export interface PickerItem {
  id: string;
  name: string;
  subtitle?: string;
  tag?: string;
  tagColor?: string;
  rawItem?: FoundryItem;
}

interface ItemPickerProps {
  items: PickerItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder: string;
  modalTitle?: string;
  searchPlaceholder?: string;
}

/**
 * Compact picker that opens a full Modal with search and tooltip-enabled rows.
 */
export const ItemPicker: React.FC<ItemPickerProps> = ({
  items, selectedId, onSelect, placeholder, modalTitle, searchPlaceholder,
}) => {
  const [open, setOpen] = useState(false);
  const { showTooltip, hideTooltip } = useUiStore();

  const selected = items.find(i => i.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    onSelect(id === selectedId ? null : id);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left
          ${selected
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
        <svg className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Modal picker */}
      {open && (
        <PickerModal
          items={items}
          selectedId={selectedId}
          title={modalTitle ?? placeholder}
          searchPlaceholder={searchPlaceholder}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
          showTooltip={showTooltip}
          hideTooltip={hideTooltip}
        />
      )}
    </>
  );
};

const PickerModal: React.FC<{
  items: PickerItem[];
  selectedId: string | null;
  title: string;
  searchPlaceholder?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  showTooltip: (item: FoundryItem, rect: { x: number; y: number; width: number; height: number }) => void;
  hideTooltip: () => void;
}> = ({ items, selectedId, title, searchPlaceholder, onSelect, onClose, showTooltip, hideTooltip }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  return (
    <Modal open onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder={searchPlaceholder ?? 'Search…'} />

        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-stone-600 text-sm py-4 text-center">No results.</p>
          ) : (
            filtered.map(item => {
              const isSelected = item.id === selectedId;

              const row = (
                <button
                  onClick={() => onSelect(item.id)}
                  onMouseLeave={item.rawItem ? hideTooltip : undefined}
                  className={`
                    w-full text-left px-3 py-2.5 rounded border text-sm transition-all
                    ${isSelected
                      ? 'border-amber-500 bg-amber-600/20 text-amber-300'
                      : 'border-stone-700/50 bg-stone-800/50 text-stone-300 hover:border-amber-600/50 hover:bg-stone-800 hover:text-stone-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium flex-1 truncate">{item.name}</span>
                    {item.tag && (
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${item.tagColor ?? 'bg-stone-700 text-stone-400'}`}>
                        {item.tag}
                      </span>
                    )}
                    {item.subtitle && (
                      <span className="text-xs text-stone-500 flex-shrink-0">{item.subtitle}</span>
                    )}
                  </div>
                </button>
              );

              return item.rawItem ? (
                <TooltipTrigger
                  key={item.id}
                  item={item.rawItem}
                  onShow={(raw, rect) => showTooltip(raw, rect)}
                  className="block"
                >
                  {row}
                </TooltipTrigger>
              ) : (
                <div key={item.id}>{row}</div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
