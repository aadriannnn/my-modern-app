// Global shared types for filters

export interface FilterItem {
  name: string;
  count: number;
}

export interface Filters {
  materii: FilterItem[];
  obiecte: FilterItem[];
  details: Record<string, FilterItem[]>;
  tipSpeta: (FilterItem | string)[];
  parte: (FilterItem | string)[];
}

export interface SelectedFilters {
  materie: string;
  obiect: string[];
  tip_speta: string[];
  parte: string[];
}

export interface DocumentModel {
  id: string;
  titlu_model: string;
  obiect_model?: string;
  materie_model?: string;
  sursa_model?: string;
  relevance_score: number;
}

export interface DocumentModelFull extends DocumentModel {
  text_model: string;
  keywords_model?: string;
}

export interface LegalArticle {
  id: string;
  numar: string;
  titlu: string;
  obiect?: string;
  materie?: string;
  text: string;
  keywords?: string;
  art_conex?: string;
  doctrina?: string;
  relevance_score: number;
  cod_sursa: string;
}

export interface QueueStatus {
  requestId?: string;
  position: number;
  total: number;
  status: 'queued' | 'processing' | 'completed' | 'error';
}

export interface SearchResult {
  id: number;
  denumire: string;
  situatia_de_fapt_full: string;
  tip_speta: string;
  materie: string;
  score?: number;
  data?: any;
}
