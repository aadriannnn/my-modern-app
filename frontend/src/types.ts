export interface Obiect {
  name: string;
  count: number;
}

export interface Materie {
  name: string;
  count: number;
  obiecte: Obiect[];
}

export interface Filters {
  menuData: Materie[];
  tipSpeta: string[];
  parte: string[];
}
