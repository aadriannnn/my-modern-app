// Global shared types for filters

export interface FilterItem {
  name: string;
  count: number | null; // Allow null for tipSpeta and parte which don't have counts
}

export interface Filters {
  materii: FilterItem[];
  obiecte: FilterItem[];
  details: { [key: string]: FilterItem[] };
  tipSpeta: string[];
  parte: string[];
}

export interface SelectedFilters {
  materie: string;
  obiect: string[];
  tip_speta: string[];
  parte: string[];
}

export interface FilterGroupProps {
  title: string;
  items: FilterItem[];
  selected: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}
