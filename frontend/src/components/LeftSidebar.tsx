import React, { Fragment, useState } from 'react';
import type { Filters, SelectedFilters, FilterItem } from '../types';
import { ChevronDown, X, Search as SearchIcon } from 'lucide-react';
import { Dialog, Disclosure, Transition } from '@headlessui/react';

interface LeftSidebarProps {
  filters: Filters | null;
  selectedFilters: SelectedFilters;
  onFilterChange: (filterType: keyof SelectedFilters, value: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ filters, selectedFilters, onFilterChange, isOpen, onClose }) => {
  const { materii = [], obiecte = [], tipSpeta = [], parte = [] } = filters ?? {};

  // Memoize this calculation if performance is a concern
  const availableObiecte = selectedFilters.materie
    ? filters?.details[selectedFilters.materie] ?? []
    : obiecte;

  const handleCheckboxChange = (filterType: 'obiect' | 'tip_speta' | 'parte', value: string) => {
    const currentValues = selectedFilters[filterType] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange(filterType, newValues);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border-color">
        <h3 className="text-lg font-medium text-text-primary">Filtre</h3>
        <button
          type="button"
          className="rounded-md p-1 text-text-secondary hover:bg-gray-100"
          onClick={onClose}
        >
          <span className="sr-only">Close panel</span>
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-text-primary mb-2">Materie</h4>
            <div className="space-y-1">
              {materii.map(materie => (
                <button
                  key={materie.name}
                  onClick={() => onFilterChange('materie', selectedFilters.materie === materie.name ? '' : materie.name)}
                  className={`w-full flex justify-between items-center text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                    selectedFilters.materie === materie.name
                      ? 'bg-brand-blue text-white font-semibold shadow-soft'
                      : 'bg-transparent hover:bg-gray-100 text-text-primary'
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
            searchable
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
      </div>
    </div>
  );

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-sm">
                  {sidebarContent}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

interface FilterGroupProps {
  title: string;
  items: FilterItem[];
  selected: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ title, items, selected, onChange, disabled, searchable }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = (items ?? []).filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={`border-t border-border-color pt-4 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <Disclosure defaultOpen>
        {({ open }) => (
          <>
            <Disclosure.Button className="w-full flex justify-between items-center text-left text-sm font-medium text-text-primary" disabled={disabled}>
              <span>{title}</span>
              <ChevronDown size={20} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </Disclosure.Button>
            <Transition
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Disclosure.Panel className="mt-3 space-y-2">
                {searchable && !disabled && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Caută ${title.toLowerCase()}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-border-color rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                      <SearchIcon size={16} />
                    </div>
                  </div>
                )}
                <div className="max-h-60 overflow-y-auto pr-2">
                  {filteredItems.map((item, index) => (
                    <label
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selected.includes(item.name)}
                          onChange={() => onChange(item.name)}
                          disabled={disabled}
                          className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-gold"
                        />
                        <span className="ml-3 text-sm text-text-secondary">{item.name}</span>
                      </div>
                      <span className="text-sm text-gray-400">{item.count}</span>
                    </label>
                  ))}
                </div>
              </Disclosure.Panel>
            </Transition>
          </>
        )}
      </Disclosure>
    </div>
  );
};

export default LeftSidebar;
