import React from 'react';
import { useCharacterStore } from '../../../store/characterStore';

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? label}
      className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-md
                 text-stone-200 placeholder-stone-600 text-sm
                 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
    />
  </div>
);

export const IdentitySection: React.FC = () => {
  const { character, updateIdentity } = useCharacterStore();
  const f = (field: Parameters<typeof updateIdentity>[0]) => updateIdentity(field);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field
        label="Character Name"
        value={character.name}
        onChange={v => f({ name: v })}
        placeholder="Enter character name"
      />
      <Field
        label="Player Name"
        value={character.playerName}
        onChange={v => f({ playerName: v })}
      />
      <Field
        label="Deity / Faith"
        value={character.deity ?? ''}
        onChange={v => f({ deity: v })}
      />
      <Field
        label="Age"
        value={character.age ?? ''}
        onChange={v => f({ age: v })}
      />
    </div>
  );
};
