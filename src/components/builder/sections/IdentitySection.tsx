import React from 'react';
import { useCharacterStore } from '../../../store/characterStore';

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? label}
      className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-md
                 text-stone-200 placeholder-stone-600 text-sm
                 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
    />
  </div>
);

const TextArea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-stone-400 font-medium uppercase tracking-wide">{label}</label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-md
                 text-stone-200 placeholder-stone-600 text-sm resize-y
                 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
    />
  </div>
);

export const IdentitySection: React.FC = () => {
  const { character, updateIdentity } = useCharacterStore();

  const f = (field: Parameters<typeof updateIdentity>[0]) => updateIdentity(field);

  return (
    <div className="space-y-4">
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
          label="Campaign"
          value={character.campaign}
          onChange={v => f({ campaign: v })}
        />
        <Field
          label="Deity / Faith"
          value={character.deity ?? ''}
          onChange={v => f({ deity: v })}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Alignment" value={character.alignment ?? ''} onChange={v => f({ alignment: v })} placeholder="NG" />
        <Field label="Age" value={character.age ?? ''} onChange={v => f({ age: v })} />
        <Field label="Gender / Pronouns" value={character.gender ?? ''} onChange={v => f({ gender: v })} />
        <Field label="Ethnicity" value={character.ethnicity ?? ''} onChange={v => f({ ethnicity: v })} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Height" value={character.height ?? ''} onChange={v => f({ height: v })} placeholder="5'10&quot;" />
        <Field label="Weight" value={character.weight ?? ''} onChange={v => f({ weight: v })} placeholder="160 lbs" />
        <Field label="Nationality" value={character.nationality ?? ''} onChange={v => f({ nationality: v })} />
      </div>

      <TextArea
        label="Appearance"
        value={character.appearance ?? ''}
        onChange={v => f({ appearance: v })}
        placeholder="Describe your character's appearance…"
        rows={2}
      />

      <TextArea
        label="Backstory"
        value={character.backstory ?? ''}
        onChange={v => f({ backstory: v })}
        placeholder="Your character's history, motivations, and personality…"
        rows={4}
      />
    </div>
  );
};
