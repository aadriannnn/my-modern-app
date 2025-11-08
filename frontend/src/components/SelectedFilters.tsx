import React from 'react';

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
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  });

  if (selectedFilterEntries.length === 0) {
    return null;
  }

  return (
    <div className="selected-filters-container">
      <div className="filters-header">
        <span className="criteria-label">CRITERII</span>
        <button onClick={onClearFilters} className="clear-all-button">
          ȘTERGE TOT
        </button>
      </div>
      <div className="filters-list">
        {selectedFilterEntries.map(([type, value]) => {
          const displayValues = Array.isArray(value) ? value : [value];
          return displayValues.map((val) => (
            <div key={`${type}-${val}`} className="filter-tag">
              <span>{`${type.replace('_', ' ')}: ${val}`}</span>
              <button onClick={() => onRemoveFilter(type, val)} className="remove-filter-button">
                x
              </button>
            </div>
          ));
        })}
      </div>
    </div>
  );
};

export default SelectedFilters;
