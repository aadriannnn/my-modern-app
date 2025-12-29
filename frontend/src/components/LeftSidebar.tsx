import React, { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Filters, SelectedFilters, FilterItem } from '../types';
import { ChevronDown, X, ChevronLeft, ChevronRight, Check, Gavel, Mail, Edit2 } from 'lucide-react';
import Advertisement from './Advertisement';
import avocat1 from '../assets/reclama/avocat1.jpg';

interface LeftSidebarProps {
  filters: Filters | null;
  selectedFilters: SelectedFilters;
  onFilterChange: (filterType: keyof SelectedFilters, value: any) => void;
  isOpen: boolean;
  onClose: () => void;
  onContribuieClick: () => void;
  isDesktopOpen?: boolean;
  onDesktopToggle?: () => void;
  hideOnDesktop?: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  filters,
  selectedFilters,
  onFilterChange,
  isOpen,
  onClose,

  isDesktopOpen = true,
  onDesktopToggle,
  hideOnDesktop = false
}) => {
  const navigate = useNavigate();
  const { materii = [], obiecte = [], details = {}, tipSpeta = [], parte = [] } = filters ?? {};
  const availableObiecte = selectedFilters.materie ? details[selectedFilters.materie] ?? [] : obiecte;

  const handleCheckboxChange = (filterType: 'obiect' | 'tip_speta' | 'parte', value: string) => {
    const currentValues = selectedFilters[filterType] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange(filterType, newValues);
  };

  const handleMaterieChange = (materieName: string) => {
    if (selectedFilters.materie === materieName) {
      // Deselecting current materie -> Reset everything
      onFilterChange('materie', '');
      onFilterChange('obiect', []);
      onFilterChange('tip_speta', []);
      onFilterChange('parte', []);
    } else {
      // Selecting new materie
      onFilterChange('materie', materieName);
      onFilterChange('obiect', []);
      onFilterChange('tip_speta', []);
      onFilterChange('parte', []);
    }
  };



  const sidebarContent = (
    <div className={`p-4 space-y-4 flex flex-col h-full transition-opacity duration-200 ${!isDesktopOpen ? 'md:opacity-0 md:pointer-events-none' : 'opacity-100'}`}>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-brand-text">Filtre</h3>
            {(selectedFilters.materie || selectedFilters.obiect.length > 0) && (
              <button
                onClick={() => {
                  onFilterChange('materie', '');
                  onFilterChange('obiect', []);
                  onFilterChange('tip_speta', []);
                  onFilterChange('parte', []);
                }}
                className="text-xs text-brand-primary hover:text-brand-accent hover:underline transition-colors ml-2"
              >
                Șterge tot
              </button>
            )}
          </div>
          <button onClick={onClose} className="md:hidden text-brand-text-secondary hover:text-brand-text">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4">

        {/* MOBILE NAVIGATION - REMOVED (Moved to Header) */}

        {/* 1. MATERIE SECTION */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {(!filters || !filters.materii || filters.materii.length === 0) ? (
            // STATE: No Filters Available (e.g. before search)
            <div className="p-4 text-center text-gray-500 italic text-sm">
              Efectuați o căutare pentru a vedea filtrele disponibile bazate pe rezultate.
            </div>
          ) : (
            // STATE: Always Show List with Selection State
            <div className="p-3">
              <div className="flex justify-between items-end mb-3">
                <h4 className="font-semibold text-brand-text flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-xs">1</span>
                  Filtrează după Materie
                </h4>
                <span className="text-[10px] text-gray-400 font-normal pb-0.5">Din rezultate</span>
              </div>

              <div className="space-y-1">
                {materii.map(materie => {
                  const isSelected = selectedFilters.materie === materie.name;
                  return (
                    <button
                      key={materie.name}
                      onClick={() => handleMaterieChange(materie.name)}
                      className={`w-full flex justify-between items-center text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group
                        ${isSelected
                          ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20 transform scale-[1.02]'
                          : 'text-brand-text hover:bg-gray-50'
                        }`}
                    >
                      <span className={`font-medium transition-colors ${!isSelected && 'group-hover:text-brand-primary'}`}>
                        {materie.name}
                      </span>

                      {isSelected && <X size={14} className="ml-2 opacity-70 hover:opacity-100" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. OBIECT SECTION - Only visible if Materie is selected */}
        {selectedFilters.materie && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            {selectedFilters.obiect.length === 0 ? (
              // STATE: No Obiect Selected -> Show Searchable List
              <div className="p-3">
                <h4 className="font-semibold text-brand-text mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-xs">2</span>
                  Alege Obiectul
                </h4>
                <FilterGroup
                  title="Obiecte disponibile"
                  items={availableObiecte}
                  selected={selectedFilters.obiect as string[]}
                  onChange={(val) => handleCheckboxChange('obiect', val)}
                  showBadge={false}
                  alwaysExpanded={true}
                />
              </div>
            ) : (
              // STATE: Obiect Selected -> Show Summary Header
              <div className="p-3 bg-brand-accent/5 border-l-4 border-brand-accent">
                <div className="flex justify-between items-center">
                  <div className="overflow-hidden">
                    <div className="text-xs text-brand-accent font-semibold uppercase tracking-wider mb-0.5">Obiect</div>
                    <div className="font-bold text-brand-text truncate">
                      {selectedFilters.obiect.length === 1
                        ? selectedFilters.obiect[0]
                        : `${selectedFilters.obiect.length} obiecte selectate`}
                    </div>
                  </div>
                  <button
                    onClick={() => onFilterChange('obiect', [])} // Just clear obiects to re-open list, keep materie
                    className="p-1.5 text-brand-text-secondary hover:text-brand-accent hover:bg-white rounded-full transition-all"
                    title="Modifică obiectul"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. DETALII SECTION - Only visible if Obiect is selected */}
        {selectedFilters.obiect.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-3">
              <h4 className="font-semibold text-brand-text mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-xs">3</span>
                Filtrează după Detalii
              </h4>

              <div className="space-y-4">
                <FilterGroup
                  title="Tip Speță"
                  items={tipSpeta}
                  selected={selectedFilters.tip_speta as string[]}
                  onChange={(val) => handleCheckboxChange('tip_speta', val)}
                  showBadge={true}
                />
                <div className="border-t border-gray-100 pt-4">
                  <FilterGroup
                    title="Parte"
                    items={parte}
                    selected={selectedFilters.parte as string[]}
                    onChange={(val) => handleCheckboxChange('parte', val)}
                    showBadge={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Lawyer Assistance Button (New) */}
      <div className="border-t border-gray-100 pt-4 pb-2">
        <button
          onClick={() => {
            navigate("/asistenta-avocat");
          }}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-purple-100 bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:to-white hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Gavel size={16} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-gray-800 group-hover:text-purple-700 transition-colors">Asistență Avocat</div>
              <div className="text-[10px] text-gray-500">Solicită ajutor juridic</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
        </button>
      </div>

      {/* Contact Button (New) */}
      <div className="border-t border-gray-100 pt-4 pb-2">
        <button
          onClick={() => {
            navigate("/contact");
          }}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-white hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Mail size={16} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">Contact</div>
              <div className="text-[10px] text-gray-500">Trimiteți-ne un mesaj</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
        </button>
      </div>

      <Advertisement imageSrc={avocat1} altText="Reclamă avocat" />

    </div>
  );

  return (
    <Fragment>
      {/* Mobile view */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-full bg-brand-light w-full shadow-2xl z-50 transform transition-transform duration-300 ease-out md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } overflow-y-auto`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop view - Conditionally rendered */}
      {!hideOnDesktop && (
        <div className="hidden md:flex relative h-full">
          <aside
            className={`bg-white border-r border-gray-200 h-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isDesktopOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'
              }`}
          >
            <div className="h-full w-80">
              {sidebarContent}
            </div>
          </aside>

          {/* Toggle Button (Vertical Bar) - Fixed positioning for constant visibility */}
          <button
            onClick={onDesktopToggle}
            className={`fixed top-20 transform -translate-y-1/2 bg-white border border-gray-200 shadow-lg rounded-full p-1.5 z-50 hover:bg-gray-50 hover:scale-110 transition-all duration-300 focus:outline-none text-brand-primary ${isDesktopOpen ? 'left-[308px]' : 'left-[12px]'
              }`}
            title={isDesktopOpen ? "Ascunde filtre" : "Arată filtre"}
          >
            {isDesktopOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      )}
    </Fragment>
  );
};

interface FilterGroupProps {
  title: string;
  items: (FilterItem | string)[];
  selected: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  showBadge?: boolean;
  alwaysExpanded?: boolean;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ title, items, selected, onChange, disabled, showBadge, alwaysExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded);
  const [searchTerm, setSearchTerm] = useState('');

  const mappedItems = (items ?? []).map(item =>
    typeof item === 'string' ? { name: item, count: null } : item
  );

  const filteredItems = mappedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${disabled ? 'opacity-50' : ''}`}>
      {!alwaysExpanded && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex justify-between items-center font-semibold text-brand-text mb-2"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <span>{title}</span>
            {showBadge && selected.length > 0 && (
              <span className="text-xs bg-brand-accent text-white px-2 py-0.5 rounded-full">
                {selected.length}
              </span>
            )}
          </div>
          <ChevronDown size={20} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isExpanded && (
        <div className="space-y-2">
          {/* Show search input if it's Obiect group or if there are many items */}
          {(title.includes('Obiect') || mappedItems.length > 10) && !disabled && (
            <input
              type="text"
              placeholder="Caută..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-gray-50 focus:bg-white"
            />
          )}
          <div className={`overflow-y-auto custom-scrollbar ${alwaysExpanded ? 'max-h-[400px]' : 'max-h-60'} pr-1`}>
            {(filteredItems ?? []).map((item, index) => (
              <label key={`${item.name}-${index}`} className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.name)}
                    onChange={() => onChange(item.name)}
                    disabled={disabled}
                    className="peer h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary/20"
                  />
                  <div className="absolute inset-0 bg-white hidden peer-checked:block pointer-events-none">
                    <Check size={16} className="text-brand-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm block whitespace-normal ${selected.includes(item.name) ? 'font-medium text-brand-primary' : 'text-brand-text-secondary group-hover:text-brand-text'}`}>
                    {item.name}
                  </span>
                </div>

              </label>
            ))}
            {filteredItems.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4 italic">
                Nu s-au găsit rezultate
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftSidebar;
