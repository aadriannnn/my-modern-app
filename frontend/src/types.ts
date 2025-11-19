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
  cod_sursa: string; // e.g., "cod_civil", "cod_penal"
}
