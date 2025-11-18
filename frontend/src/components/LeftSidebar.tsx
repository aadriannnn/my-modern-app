import React, { useState, Fragment } from 'react';
import type { Filters, SelectedFilters, FilterItem } from '../types';
import { ChevronDown, X, PlusCircle } from 'lucide-react';
import Advertisement from './Advertisement';
import avocat1 from '../assets/reclama/avocat1.jpg';

interface LeftSidebarProps {
  filters: Filters | null;
  selectedFilters: SelectedFilters;
  onFilterChange: (filterType: keyof SelectedFilters, value: any) => void;
  isOpen: boolean;
  onClose: () => void;
  onContribuieClick: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ filters, selectedFilters, onFilterChange, isOpen, onClose, onContribuieClick }) => {
  const { materii = [], obiecte = [], details = {}, tipSpeta = [], parte = [] } = filters ?? {};
  const availableObiecte = selectedFilters.materie ? details[selectedFilters.materie] ?? [] : obiecte;

  const handleCheckboxChange = (filterType: 'obiect' | 'tip_speta' | 'parte', value: string) => {
    const currentValues = selectedFilters[filterType] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange(filterType, newValues);
  };

  const sidebarContent = (
    <div className="p-4 space-y-6 flex flex-col h-full">
      <div>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-brand-text">Filtre</h3>
          <button onClick={onClose} className="md:hidden text-brand-text-secondary hover:text-brand-text">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-grow">
        <div>
          <h4 className="font-semibold text-brand-text mb-2">Materie</h4>
          <div className="space-y-2">
            {materii.map(materie => (
              <button
                key={materie.name}
                onClick={() => onFilterChange('materie', selectedFilters.materie === materie.name ? '' : materie.name)}
                className={`w-full flex justify-between items-center text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFilters.materie === materie.name
                    ? 'bg-brand-primary text-white font-semibold'
                    : 'bg-white hover:bg-gray-100 text-brand-text'
                }`}
              >
                <span>{materie.name}</span>
                <span className="text-xs opacity-70">{materie.count}</span>
              </button>
            ))}
          </div>
        </div>

        <FilterGroup
          title="Obiect"
          items={availableObiecte}
          selected={selectedFilters.obiect as string[]}
          onChange={(val) => handleCheckboxChange('obiect', val)}
          disabled={!selectedFilters.materie}
        />
        <FilterGroup
          title="Tip Speță"
          items={tipSpeta}
          selected={selectedFilters.tip_speta as string[]}
          onChange={(val) => handleCheckboxChange('tip_speta', val)}
        />
        <FilterGroup
          title="Parte"
          items={parte}
          selected={selectedFilters.parte as string[]}
          onChange={(val) => handleCheckboxChange('parte', val)}
        />
      </div>

      <Advertisement imageSrc={avocat1} altText="Reclamă avocat" />

      <div className="md:hidden border-t border-gray-200 pt-4">
        <button
          onClick={() => {
            onContribuieClick();
            onClose();
          }}
          className="w-full flex items-center justify-center text-sm font-semibold text-brand-primary hover:opacity-80 transition-opacity p-2 rounded-lg bg-gray-200"
        >
          <PlusCircle size={18} className="mr-1.5" />
          Contribuie
        </button>
      </div>
    </div>
  );

  return (
    <Fragment>
      {/* Mobile view */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-full bg-brand-light w-72 shadow-xl z-50 transform transition-transform md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop view */}
      <aside className="hidden md:block w-80 bg-white border-r border-gray-200 overflow-y-auto">
        {sidebarContent}
      </aside>
    </Fragment>
  );
};

interface FilterGroupProps {
  title: string;
  items: (FilterItem | string)[];
  selected: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ title, items, selected, onChange, disabled }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const mappedItems = (items ?? []).map(item =>
    typeof item === 'string' ? { name: item, count: null } : item
  );

  const filteredItems = mappedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`border-t border-gray-200 pt-4 mt-4 ${disabled ? 'opacity-50' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center font-semibold text-brand-text"
        disabled={disabled}
      >
        <span>{title}</span>
        <ChevronDown size={20} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {title === 'Obiect' && !disabled && (
            <input
              type="text"
              placeholder="Caută obiect..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          )}
          <div className="max-h-60 overflow-y-auto pr-2">
            {(filteredItems ?? []).map((item, index) => (
              <label key={`${item.name}-${index}`} className="flex items-center justify-between space-x-2 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.name)}
                    onChange={() => onChange(item.name)}
                    disabled={disabled}
                    className="h-4 w-4 rounded text-brand-primary focus:ring-brand-accent"
                  />
                  <span className="ml-2 text-sm text-brand-text-secondary">{item.name}</span>
                </div>
                {item.count !== null && (
                  <span className="text-sm text-gray-400">{item.count}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftSidebar;
