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
    <section className={`border border-stone-700/50 rounded-lg overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-stone-800/60 hover:bg-stone-800 transition-colors text-left group"
      >
        {icon && <span className="text-lg">{icon}</span>}
        <span className="flex-1 font-semibold text-stone-100 text-sm uppercase tracking-wider">
          {title}
        </span>
        {badge !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 text-xs font-mono">
            {badge}
          </span>
        )}
        {headerExtra}
        <svg
          className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        ref={contentRef}
        className={`overflow-hidden transition-all duration-200 ${collapsed ? 'max-h-0' : 'max-h-none'}`}
        style={collapsed ? { maxHeight: 0, overflow: 'hidden' } : undefined}
      >
        <div className="p-4">{children}</div>
      </div>
    </section>
  );
};
