import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value, onChange, placeholder = 'Search…', className = '',
}) => (
  <div className={`relative ${className}`}>
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ledger-gold/50 pointer-events-none"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-8 py-2.5 bg-ledger-surface-lowest rounded-sm
                 text-ledger-text placeholder-ledger-text-muted text-sm font-sans
                 focus:outline-none focus:ring-1 focus:ring-ledger-gold/40"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ledger-text-muted hover:text-ledger-text transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);
