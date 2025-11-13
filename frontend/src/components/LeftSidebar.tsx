import React from 'react';

// Define types from App.tsx
interface Filters {
  menuData: { [key: string]: string[] };
  tipSpeta: string[];
  parte: string[];
}

interface SelectedFilters {
  materie: string;
  obiect: string[];
  tip_speta: string[];
  parte: string[];
}

interface LeftSidebarProps {
  filters: Filters | null;
  selectedFilters: SelectedFilters;
  onFilterChange: (filterType: keyof SelectedFilters, value: string | string[] | boolean) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ filters, selectedFilters, onFilterChange, isCollapsed, onToggleCollapse }) => {
  if (!filters) {
    return (
      <aside className={`bg-gray-50 p-6 border-r flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-80'}`}>
        <p>Loading filters...</p>
      </aside>
    );
  }

  const { menuData, tipSpeta, parte } = filters;
  const availableObiecte = selectedFilters.materie ? menuData[selectedFilters.materie] || [] : [];

  const handleCheckboxChange = (filterType: 'obiect' | 'tip_speta' | 'parte', value: string) => {
    const currentValues = selectedFilters[filterType];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange(filterType, newValues);
  };

  return (
    <aside className={`bg-gray-50 border-r transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-80'} p-4 overflow-y-auto left-sidebar`}>
      <div className="flex justify-between items-center mb-4">
        {!isCollapsed && <h3 className="text-lg font-semibold text-gray-800">Categorii</h3>}
        <button onClick={onToggleCollapse} className="p-2 rounded-md hover:bg-gray-200">
          {/* Replace with a proper icon */}
          {isCollapsed ? '>' : '<'}
        </button>
      </div>
      <div className="space-y-8">
        {/* Materie Selection */}
        {!isCollapsed && (
          <div>
            <div className="space-y-2">
              {Object.keys(menuData).map(materie => (
                <button
                key={materie}
                onClick={() => onFilterChange('materie', selectedFilters.materie === materie ? '' : materie)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selectedFilters.materie === materie
                    ? 'bg-green-600 text-white font-semibold'
                    : 'bg-white hover:bg-gray-100 text-gray-700'
                }`}
              >
                {materie}
              </button>
            ))}
          </div>
        </div>
      )} 
        {/* Dynamic Filters */}
        {!isCollapsed && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Filtrare</h3>
            <div className="space-y-6">
              <FilterGroup title="Obiect" items={availableObiecte} selected={selectedFilters.obiect} onChange={(val) => handleCheckboxChange('obiect', val)} disabled={!selectedFilters.materie} />
              <FilterGroup title="Tip Speță" items={tipSpeta} selected={selectedFilters.tip_speta} onChange={(val) => handleCheckboxChange('tip_speta', val)} />
              <FilterGroup title="Parte" items={parte} selected={selectedFilters.parte} onChange={(val) => handleCheckboxChange('parte', val)} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

// Helper component for a group of checkboxes
interface FilterGroupProps {
  title: string;
  items: string[];
  selected: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ title, items, selected, onChange, disabled }) => (
  <div>
    <h4 className="font-semibold text-gray-600 mb-2">{title}</h4>
    {disabled && <p className="text-xs text-gray-400 mb-2">Selectați o categorie mai întâi.</p>}
    <div className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}>
      {items.map(item => (
        <label key={item} className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(item)}
            onChange={() => onChange(item)}
            disabled={disabled}
            className="rounded text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-gray-800">{item}</span>
        </label>
      ))}
    </div>
  </div>
);

export default LeftSidebar;
