// Global shared types for filters

export interface FilterItem {
  name: string;
  count: number;
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
