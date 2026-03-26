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
    hideTooltip();
    onSelect(id === selectedId ? null : id);
    setOpen(false);
  };

  const handleClose = () => {
    hideTooltip();
    setOpen(false);
  };

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm font-sans transition-colors text-left ${
          selected
            ? 'bg-ledger-surface-high text-ledger-text hover:bg-ledger-surface-highest'
            : 'bg-ledger-surface-lowest text-ledger-text-muted hover:text-ledger-text-dim hover:bg-ledger-surface-low'
        }`}
      >
        {selected && <span className="text-ledger-gold text-xs flex-shrink-0">✦</span>}
        <span className="flex-1 truncate font-medium">
          {selected ? selected.name : placeholder}
        </span>
        {selected && selected.subtitle && (
          <span className="text-xs text-ledger-text-muted flex-shrink-0">{selected.subtitle}</span>
        )}
        {selected && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onSelect(null); }}
            className="text-ledger-text-muted hover:text-ledger-error flex-shrink-0 px-0.5 transition-colors"
            title="Clear selection"
          >
            ×
          </span>
        )}
        <svg className="w-3 h-3 text-ledger-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <PickerModal
          items={items}
          selectedId={selectedId}
          title={modalTitle ?? placeholder}
          searchPlaceholder={searchPlaceholder}
          onSelect={handleSelect}
          onClose={handleClose}
          showTooltip={showTooltip}
          hideTooltip={hideTooltip}
        />
      )}
    </>
  );
};

export const PickerModal: React.FC<{
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

        <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-ledger-text-muted text-sm py-6 text-center font-sans">No results.</p>
          ) : (
            filtered.map(item => {
              const isSelected = item.id === selectedId;

              const row = (
                <button
                  onClick={() => onSelect(item.id)}
                  onMouseLeave={item.rawItem ? hideTooltip : undefined}
                  className={`w-full text-left px-4 py-3 rounded-sm text-sm font-sans transition-all ${
                    isSelected
                      ? 'bg-ledger-gold/15 text-ledger-gold'
                      : 'text-ledger-text-dim hover:bg-ledger-surface-highest hover:text-ledger-text'
                  }`}
                  style={isSelected ? { boxShadow: 'inset 2px 0 0 #e9c176' } : undefined}
                >
                  <div className="flex items-center gap-2">
                    {isSelected && <span className="text-ledger-gold text-xs flex-shrink-0">✦</span>}
                    <span className="font-medium flex-1 truncate">{item.name}</span>
                    {item.tag && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm flex-shrink-0 font-semibold tracking-wide ${item.tagColor ?? 'bg-ledger-surface-highest text-ledger-text-muted'}`}>
                        {item.tag}
                      </span>
                    )}
                    {item.subtitle && (
                      <span className="text-[11px] text-ledger-text-muted flex-shrink-0">{item.subtitle}</span>
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
