// Global shared types for filters

export interface FilterItem {
  name: string;
  count: number;
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
