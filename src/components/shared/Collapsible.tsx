import React, { useRef } from 'react';

interface CollapsibleProps {
  id: string;
  title: string;
  icon?: string;
  badge?: string | number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  id: _id,
  title,
  icon,
  badge,
  collapsed,
  onToggle,
  children,
  className = '',
  headerExtra,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <section className={`rounded-sm overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-ledger-surface-high hover:bg-ledger-surface-highest
                   transition-colors text-left"
      >
        {icon && <span className="text-base opacity-70">{icon}</span>}
        <span className="flex-1 font-serif font-semibold text-ledger-text text-sm tracking-wide">
          {title}
        </span>
        {badge !== undefined && (
          <span className="px-2 py-0.5 rounded-sm bg-ledger-gold/10 text-ledger-gold text-[10px] font-sans font-semibold tracking-wide">
            {badge}
          </span>
        )}
        {headerExtra}
        <svg
          className={`w-3.5 h-3.5 text-ledger-text-muted transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-200"
        style={collapsed ? { maxHeight: 0, overflow: 'hidden' } : undefined}
      >
        <div className="bg-ledger-surface p-5">{children}</div>
      </div>
    </section>
  );
};
