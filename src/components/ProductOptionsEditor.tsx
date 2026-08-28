import { X } from 'lucide-react';
import { ProductOption } from '../types';

interface ProductOptionsEditorProps {
  label: string;
  placeholder: string;
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
  withColor?: boolean;
}

export default function ProductOptionsEditor({ label, placeholder, options, onChange, withColor }: ProductOptionsEditorProps) {
  const addOption = () => onChange([...options, { label: '', available: true, ...(withColor ? { hex: '#1E2D44' } : {}) }]);
  const updateOption = (index: number, patch: Partial<ProductOption>) =>
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  const removeOption = (index: number) => onChange(options.filter((_, i) => i !== index));
  const singular = label.replace(/s$/, '');

  return (
    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <button
          type="button"
          onClick={addOption}
          className="text-[10px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 uppercase tracking-wider"
        >
          + Add {singular}
        </button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {options.map((opt, index) => (
          <div key={index} className="flex items-center gap-1.5">
            {withColor && (
              <input
                type="color"
                aria-label={`${singular} swatch`}
                value={opt.hex || '#1E2D44'}
                onChange={(e) => updateOption(index, { hex: e.target.value })}
                className="h-7 w-7 flex-shrink-0 cursor-pointer rounded border border-gray-200"
              />
            )}
            <input
              type="text"
              aria-label={`${singular} label`}
              value={opt.label}
              onChange={(e) => updateOption(index, { label: e.target.value })}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-gray-200 py-1.5 px-3 text-xs focus:border-gray-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => updateOption(index, { available: !opt.available })}
              className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold whitespace-nowrap ${
                opt.available ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {opt.available ? 'Available' : 'Unavailable'}
            </button>
            <button
              type="button"
              aria-label={`Remove ${singular.toLowerCase()}`}
              onClick={() => removeOption(index)}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {options.length === 0 && <p className="text-[11px] text-gray-400 italic text-center py-1">No {label.toLowerCase()} added yet.</p>}
      </div>
    </div>
  );
}
