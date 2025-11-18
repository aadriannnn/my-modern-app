import React, { useState } from 'react';
import Advertisement from './Advertisement';
import avocat1 from '../assets/reclama/avocat1.jpg';
import type { Filters, SelectedFilters, FilterItem } from '../types';

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

  const { materii = [], obiecte = [], details = {}, tipSpeta = [], parte = [] } = filters ?? {};

  const availableObiecte = selectedFilters.materie ? details[selectedFilters.materie] ?? [] : obiecte;

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
              {materii.map(materie => (
                <button
                  key={materie.name}
                  onClick={() => onFilterChange('materie', selectedFilters.materie === materie.name ? '' : materie.name)}
                  className={`w-full flex justify-between items-center text-left px-3 py-2 rounded-md text-sm ${
                    selectedFilters.materie === materie.name
                      ? 'bg-green-600 text-white font-semibold'
                      : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{materie.name}</span>
                  <span className="text-xs text-gray-500">{materie.count}</span>
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
      {!isCollapsed && (
        <Advertisement imageSrc={avocat1} altText="Reclamă avocat" />
      )}
    </aside>
  );
};

// Helper component for a group of checkboxes
interface FilterGroupProps {
  title: string;
  items: FilterItem[];
  selected: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ title, items, selected, onChange, disabled }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const initialCount = 5;

  const filteredItems = (items ?? []).filter(item =>
    searchTerm.length < 3 ? true : item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedItems = isExpanded ? filteredItems : filteredItems.slice(0, initialCount);

  return (
    <div>
      <h4 className="font-semibold text-gray-600 mb-2">{title}</h4>
      {title === 'Obiect' && !disabled && (
         <div className="hidden md:block mb-2">
          <input
            type="text"
            placeholder="Cauta obiect..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
          />
        </div>
      )}
      {disabled && <p className="text-xs text-gray-400 mb-2">Selectați o categorie mai întâi.</p>}
      <div className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}>
        {(displayedItems ?? []).map((item, index) => (
          <label key={`${item.name}-${index}`} className="flex items-center justify-between space-x-2 cursor-pointer">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selected.includes(item.name)}
                onChange={() => onChange(item.name)}
                disabled={disabled}
                className="rounded text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-800">{item.name}</span>
            </div>
            {item.count !== null && (
              <span className="text-sm text-gray-500">{item.count}</span>
            )}
          </label>
        ))}
      </div>
      {filteredItems.length > initialCount && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-green-600 hover:text-green-800 mt-2"
        >
          {isExpanded ? '- Mai puțin' : '+ Mai mult'}
        </button>
      )}
    </div>
  );
};

export default LeftSidebar;
