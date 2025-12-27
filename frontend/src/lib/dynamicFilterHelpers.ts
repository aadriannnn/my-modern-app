
import type { Filters, FilterItem } from '../types';

export interface FilterMappings {
  materii_map: Record<string, string>;
  obiecte_map: Record<string, string>;
}

/**
 * Builds a dynamic Filters object based on the current search results and backend mappings.
 * @param results - The array of current search results
 * @param mappings - The canonical mappings from backend
 * @returns Filters object populated from results
 */
export const buildDynamicFilters = (results: any[], mappings: FilterMappings | null): Filters | null => {
  if (!results || results.length === 0) return null;

  const materiiCounts: Record<string, number> = {};
  const obiecteCounts: Record<string, Record<string, number>> = {};

  // Also track 'tip_speta' and 'parte' simply by aggregating values
  const tipSpetaCounts: Record<string, number> = {};
  const parteCounts: Record<string, number> = {};

  results.forEach(result => {
    // Extract raw values
    // Handle both direct properties and nested data object (for ResultItem structure)
    const data = result.data || result;

    const rawMaterie = data.materie || '';
    // Obiect can be comma separated or single string
    const rawObiect = data.obiectul || data.obiect || '';
    const rawTip = data.tip_speta || data.tip || data.categorie_speta || '';
    const rawParte = data.parte || data.parti || '';

    // 1. Materie Mapping
    let canonicalMaterie = 'Necunoscut';
    if (rawMaterie) {
      // Use mapping if available, otherwise use raw
      if (mappings && mappings.materii_map && mappings.materii_map[rawMaterie]) {
        canonicalMaterie = mappings.materii_map[rawMaterie];
      } else {
        canonicalMaterie = rawMaterie; // Fallback
      }
    }

    // Count Materie
    if (canonicalMaterie !== 'Necunoscut') {
      materiiCounts[canonicalMaterie] = (materiiCounts[canonicalMaterie] || 0) + 1;
    }

    // 2. Obiect Mapping
    // Initialize obiect map for this materie if needed
    if (!obiecteCounts[canonicalMaterie]) {
      obiecteCounts[canonicalMaterie] = {};
    }

    if (rawObiect && rawObiect !== '—') {
      const obiectParts = rawObiect.split(/,|;|\s+și\s+/i).map((s: string) => s.trim()).filter(Boolean);

      obiectParts.forEach((part: string) => {
        let canonicalObiect = part;
        if (mappings && mappings.obiecte_map && mappings.obiecte_map[part]) {
          canonicalObiect = mappings.obiecte_map[part];
        }

        obiecteCounts[canonicalMaterie][canonicalObiect] = (obiecteCounts[canonicalMaterie][canonicalObiect] || 0) + 1;
      });
    }

    // 3. Tip Speta
    if (rawTip && rawTip !== '—') {
      tipSpetaCounts[rawTip] = (tipSpetaCounts[rawTip] || 0) + 1;
    }

    // 4. Parte
    if (rawParte && rawParte !== '—') {
      const parteParts = rawParte.split(/,|;/).map((s: string) => s.trim()).filter(Boolean);
      parteParts.forEach((p: string) => {
        parteCounts[p] = (parteCounts[p] || 0) + 1;
      });
    }
  });

  // Convert to Filters structure

  // Materii List
  const materii: FilterItem[] = Object.entries(materiiCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Obiecte Global List (aggregation of all objects across all materii)
  const globalObiecteCounts: Record<string, number> = {};
  Object.values(obiecteCounts).forEach(group => {
    Object.entries(group).forEach(([obj, count]) => {
      globalObiecteCounts[obj] = (globalObiecteCounts[obj] || 0) + count;
    });
  });

  const obiecte: FilterItem[] = Object.entries(globalObiecteCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Details Map (Materie -> Obiecte List)
  const details: Record<string, FilterItem[]> = {};
  Object.entries(obiecteCounts).forEach(([mat, objs]) => {
    details[mat] = Object.entries(objs)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  // Tip Speta & Parte
  const tipSpeta: FilterItem[] = Object.entries(tipSpetaCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const parte: FilterItem[] = Object.entries(parteCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    materii,
    obiecte, // Global list
    details, // Hierarchical map
    tipSpeta,
    parte
  };
};

/**
 * Gets all original values that map to a specific canonical value.
 * Used for client-side filtering to match any variation.
 */
export const getOriginalValuesForCanonical = (
  canonical: string,
  map: Record<string, string>
): string[] => {
  if (!map) return [canonical];

  // Find all keys in the map where the value matches the canonical
  // value. Also include the canonical itself as a possibility.
  const originals = Object.entries(map)
    .filter(([_, val]) => val === canonical)
    .map(([key]) => key);

  return [...new Set([...originals, canonical])];
};
