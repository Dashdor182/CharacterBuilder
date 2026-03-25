import React, { useEffect, useRef, useState } from 'react';
import type { FoundryItem } from '../../types/pf2e';
import { sanitizeHtml } from '../../utils/html';

interface TooltipProps {
  item: FoundryItem;
  anchor: { x: number; y: number; width: number; height: number } | null;
  onHide: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-stone-600',
  uncommon: 'bg-amber-700',
  rare: 'bg-blue-700',
  unique: 'bg-purple-700',
};

export const ItemTooltip: React.FC<TooltipProps> = ({ item, anchor, onHide }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchor || !ref.current) return;
    const el = ref.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    let left = anchor.x + anchor.width + 8;
    let top = anchor.y;

    if (left + w > vw - 16) left = anchor.x - w - 8;
    if (top + h > vh - 16) top = vh - h - 16;
    if (top < 8) top = 8;
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [anchor]);

  const sys = item.system as Record<string, unknown>;
  const traits = (sys.traits as { value?: string[]; rarity?: string } | undefined);
  const traitList = traits?.value ?? [];
  const rarity = traits?.rarity ?? 'common';
  const level = (sys.level as { value?: number } | undefined)?.value;
  const descObj = sys.description as { value?: string } | undefined;
  const descHtml = descObj?.value ?? '';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onHide} />
      {/* Tooltip panel */}
      <div
        ref={ref}
        className="fixed z-50 w-80 max-w-[calc(100vw-32px)] bg-stone-900 border border-stone-600 rounded-lg shadow-2xl text-sm pointer-events-auto"
        style={{ top: pos.top, left: pos.left }}
      >
        {/* Header */}
        <div className={`px-3 py-2 rounded-t-lg ${RARITY_COLORS[rarity] ?? RARITY_COLORS.common}`}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-white text-sm leading-tight">{item.name}</h3>
            {level !== undefined && (
              <span className="text-white/80 text-xs whitespace-nowrap ml-auto">
                Level {level}
              </span>
            )}
          </div>
          {traitList.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {rarity !== 'common' && (
                <TraitBadge label={rarity} />
              )}
              {traitList.slice(0, 8).map(t => (
                <TraitBadge key={t} label={t} />
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        {descHtml && (
          <div
            className="px-3 py-2 text-stone-300 text-xs leading-relaxed max-h-60 overflow-y-auto prose prose-invert prose-xs"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(descHtml) }}
          />
        )}
      </div>
    </>
  );
};

const TraitBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/90 text-xs uppercase tracking-wide font-medium">
    {label}
  </span>
);

// ——— Tooltip trigger wrapper ———
interface TooltipTriggerProps {
  item: FoundryItem | null;
  children: React.ReactNode;
  onShow: (item: FoundryItem, rect: { x: number; y: number; width: number; height: number }) => void;
  className?: string;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({
  item,
  children,
  onShow,
  className,
}) => {
  const ref = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (!item || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    onShow(item, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  };

  return (
    <span
      ref={ref}
      onMouseEnter={handleMouseEnter}
      className={className}
    >
      {children}
    </span>
  );
};
