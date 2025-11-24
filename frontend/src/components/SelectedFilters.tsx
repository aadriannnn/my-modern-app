import React from 'react';
import { X } from 'lucide-react';

interface SelectedFiltersProps {
  filters: {
    materie?: string;
    obiect?: string[];
    tip_speta?: string[];
    parte?: string[];
  };
  onRemoveFilter: (filterType: string, value: string) => void;
  onClearFilters: () => void;
}

const SelectedFilters: React.FC<SelectedFiltersProps> = ({ filters, onRemoveFilter, onClearFilters }) => {
  const selectedFilterEntries = Object.entries(filters).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  });

  if (selectedFilterEntries.length === 0) {
    return null;
  }

  const formatFilterType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-brand-text">Filtre Active</h4>
        <button onClick={onClearFilters} className="text-sm font-semibold text-brand-accent hover:opacity-80 transition-opacity">
          Șterge Tot
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedFilterEntries.map(([type, value]) => {
          const displayValues = Array.isArray(value) ? value : [value];
          return displayValues.map((val) => (
            <div key={`${type}-${val}`} className="flex items-center bg-gray-100 text-brand-text-secondary text-xs font-semibold px-2 py-1.5 rounded-lg whitespace-normal break-words max-w-full">
              <span className="mr-1">{formatFilterType(type)}: {val}</span>
              <button onClick={() => onRemoveFilter(type, val)} className="flex-shrink-0 ml-1 text-gray-500 hover:text-brand-text p-0.5">
                <X size={14} />
              </button>
            </div>
          ));
        })}
      </div>
    </div>
  );
};

export default SelectedFilters;
