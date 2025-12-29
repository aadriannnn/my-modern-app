
import type { Filters, FilterItem } from '../types';

export interface FilterMappings {
  materii_map: Record<string, string>;
  obiecte_map: Record<string, string>;
}

/**
 * Calculates Levenshtein distance between two strings.
 */
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const removeDiacritics = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const calculateSimilarity = (a: string, b: string): number => {
  if (!a && !b) return 1;
  if (!a || !b) return 0;

  // Normalize strings for comparison: lowercase + remove diacritics
  // This ensures 'contestație' matches 'contestatie' perfectly (100%) instead of just highly (~90%)
  const normA = removeDiacritics(a.toLowerCase());
  const normB = removeDiacritics(b.toLowerCase());

  const maxLength = Math.max(normA.length, normB.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(normA, normB);
  return 1 - distance / maxLength;
};

const hasDiacritics = (str: string): boolean => {
  // Common Romanian diacritics: ă, â, î, ș, ț (and uppercase)
  return /[ăâîșțĂÂÎȘȚ]/.test(str);
};

const normalizeObiecte = (counts: Record<string, number>): Record<string, number> => {
  // 1. Convert to array of objects for easier processing
  let items = Object.entries(counts).map(([name, count]) => ({
    name,
    count,
    hasDiacritics: hasDiacritics(name)
  }));

  // Sort by count descending (so we start grouping around most frequent items, potentially)
  // OR sort by length? Usually clustering algorithms matter.
  // Greedy approach: Take first item, find all similar items, group them.
  // We need to iterate and merge.

  const mergedCounts: Record<string, number> = {};
  const processedIndices = new Set<number>();

  // Sort by count desc to prefer high-frequency items as potential "seeds" (though representative logic is separate)
  items.sort((a, b) => b.count - a.count);

  for (let i = 0; i < items.length; i++) {
    if (processedIndices.has(i)) continue;

    const group = [items[i]];
    processedIndices.add(i);

    for (let j = i + 1; j < items.length; j++) {
      if (processedIndices.has(j)) continue;

      const similarity = calculateSimilarity(items[i].name, items[j].name);
      if (similarity >= 0.8) {
        group.push(items[j]);
        processedIndices.add(j);
      }
    }

    // Determine representative for the group
    // Priority:
    // 1. Has diacritics (if multiple, pick highest count)
    // 2. Highest count (if no diacritics)

    // Filter those with diacritics
    const withDiacritics = group.filter(it => it.hasDiacritics);

    let representative = group[0]; // Default to first (highest count due to initial sort)

    if (withDiacritics.length > 0) {
      // If there are diacritics, pick the one with highest count amongst them
      // (Since 'items' is sorted by count desc, find((it) => it.hasDiacritics) gives the highest count one!)
      representative = items.find((item, index) => processedIndices.has(index) && group.includes(item) && item.hasDiacritics) || group[0];

      // Wait, the find above is O(N) over all items. Simpler:
      representative = withDiacritics.sort((a, b) => b.count - a.count)[0];
    } else {
      // No diacritics, just highest count (already group[0])
      representative = group[0];
    }

    // Sum up counts
    const totalCount = group.reduce((sum, item) => sum + item.count, 0);

    // Add to result
    mergedCounts[representative.name] = (mergedCounts[representative.name] || 0) + totalCount;
  }

  return mergedCounts;
};

/**
 * Checks if a selected filter value matches an item's raw value using fuzzy logic.
 */
export const isObiectMatching = (selectedFilter: string, itemValue: string): boolean => {
  // Exact match (optimization)
  if (selectedFilter === itemValue) return true;

  // Fuzzy match
  // Check if they would be grouped together by normalizeObiecte logic
  // i.e., similarity >= 0.8
  return calculateSimilarity(selectedFilter, itemValue) >= 0.8;
};

/**
 * Builds a dynamic Filters object based on the current search results and backend mappings.
 * @param results - The array of current search results
 * @param selectedFilters - The currently selected filters (for cascading logic)
 * @returns Filters object populated from results
 */
export const buildDynamicFilters = (
  results: any[],
  selectedFilters?: { materie: string; obiect: string[]; tip_speta: string[]; parte: string[] }
): Filters | null => {
  if (!results || results.length === 0) return null;

  const materiiCounts: Record<string, number> = {};
  const obiecteCounts: Record<string, Record<string, number>> = {};
  const tipSpetaCounts: Record<string, number> = {};
  const parteCounts: Record<string, number> = {};

  // PRE-CALCULATE NORMALIZED MATERIE FOR ALL RESULTS (Performance optimization)
  // We need this for filtering logic below
  const resultsWithCanonical = results.map(result => {
    const data = result.data || result;
    const rawMaterie = data.materie || '';
    let canonicalMaterie = rawMaterie || 'Necunoscut';

    if (canonicalMaterie !== 'Necunoscut') {
      const normalized = String(canonicalMaterie).replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (normalized.includes("cod") && normalized.includes("civila")) {
        if (normalized.includes("procedura") || normalized.includes("procedur")) {
          canonicalMaterie = "Codul de Procedura Civila";
        } else {
          canonicalMaterie = "Codul Civil";
        }
      } else if (normalized.includes("cod") && normalized.includes("penal")) {
        if (normalized.includes("procedura") || normalized.includes("procedur")) {
          canonicalMaterie = "Codul de Procedura Penala";
        } else {
          canonicalMaterie = "Codul Penal";
        }
      }
    }
    return { item: result, data, canonicalMaterie };
  });

  // 1. MATERIE & OBIECT COUNTS (Base level)
  // iterate all results to build global Materie list and per-Materie Obiect lists
  resultsWithCanonical.forEach(({ data, canonicalMaterie }) => {
    // Count Materie
    if (canonicalMaterie !== 'Necunoscut') {
      materiiCounts[canonicalMaterie] = (materiiCounts[canonicalMaterie] || 0) + 1;
    }

    // Count Obiect (grouped by Materie)
    if (!obiecteCounts[canonicalMaterie]) {
      obiecteCounts[canonicalMaterie] = {};
    }

    const rawObiect = data.obiectul || data.obiect || '';
    if (rawObiect && rawObiect !== '—') {
      const obiectParts = rawObiect.split(/,|;|\s+și\s+/i).map((s: string) => s.trim()).filter(Boolean);
      obiectParts.forEach((part: string) => {
        obiecteCounts[canonicalMaterie][part] = (obiecteCounts[canonicalMaterie][part] || 0) + 1;
      });
    }
  });


  // 2. TIP SPETA COUNTS (Cascading)
  // Filter: Materie + Obiect + Parte (everything EXCEPT Tip Speta)
  resultsWithCanonical.forEach(({ data, canonicalMaterie }) => {
    // Check Materie Match
    if (selectedFilters?.materie && selectedFilters.materie !== canonicalMaterie) return;

    // Check Obiect Match
    if (selectedFilters?.obiect && selectedFilters.obiect.length > 0) {
      const rawObiect = data.obiectul || data.obiect || '';
      const parts = rawObiect.split(/,|;|\s+și\s+/i).map((s: string) => s.trim()).filter(Boolean);
      const match = selectedFilters.obiect.some((sel: string) => parts.some((p: string) => isObiectMatching(sel, p)));
      if (!match) return;
    }

    // Check Parte Match
    if (selectedFilters?.parte && selectedFilters.parte.length > 0) {
      const rawParte = data.parte || data.parti || '';
      const parts = rawParte.split(/,|;/).map((s: string) => s.trim()).filter(Boolean);
      const match = selectedFilters.parte.some((p: string) => parts.includes(p));
      if (!match) return;
    }

    // If we are here, this item is relevant for Tip Speta counts
    const rawTip = data.tip_speta || data.tip || data.categorie_speta || '';
    if (rawTip && rawTip !== '—') {
      tipSpetaCounts[rawTip] = (tipSpetaCounts[rawTip] || 0) + 1;
    }
  });


  // 3. PARTE COUNTS (Cascading)
  // Filter: Materie + Obiect + Tip Speta (everything EXCEPT Parte)
  resultsWithCanonical.forEach(({ data, canonicalMaterie }) => {
    // Check Materie Match
    if (selectedFilters?.materie && selectedFilters.materie !== canonicalMaterie) return;

    // Check Obiect Match
    if (selectedFilters?.obiect && selectedFilters.obiect.length > 0) {
      const rawObiect = data.obiectul || data.obiect || '';
      const parts = rawObiect.split(/,|;|\s+și\s+/i).map((s: string) => s.trim()).filter(Boolean);
      const match = selectedFilters.obiect.some((sel: string) => parts.some((p: string) => isObiectMatching(sel, p)));
      if (!match) return;
    }

    // Check Tip Speta Match
    if (selectedFilters?.tip_speta && selectedFilters.tip_speta.length > 0) {
      const rawTip = data.tip_speta || data.tip || data.categorie_speta || '';
      if (!selectedFilters.tip_speta.includes(rawTip)) return;
    }

    // If we are here, this item is relevant for Parte counts
    const rawParte = data.parte || data.parti || '';
    if (rawParte && rawParte !== '—') {
      const parteParts = rawParte.split(/,|;/).map((s: string) => s.trim()).filter(Boolean);
      parteParts.forEach((p: string) => {
        parteCounts[p] = (parteCounts[p] || 0) + 1;
      });
    }
  });


  // Apply Normalization to Obiecte Counts
  Object.keys(obiecteCounts).forEach(mat => {
    obiecteCounts[mat] = normalizeObiecte(obiecteCounts[mat]);
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

/**
 * Normalizes search results to fix inconsistent data from backend.
 * Specifically fixes "CoduldeProceduraCivila" -> "Codul de Procedura Civila"
 * and "CoduldeProceduraPenala" -> "Codul de Procedura Penala".
 */
export const normalizeSearchResults = (results: any[]): any[] => {
  // console.log("Flux Normalizare Activat: " + results.length);
  return results.map(result => {
    let newItem = { ...result };
    // Create a new data object reference to ensure we are not hitting mutation limits (e.g. frozen objects)
    // Handle both nested 'data' struct and flat struct
    let data = newItem.data ? { ...newItem.data } : { ...newItem };

    // Materie Normalization
    if (data.materie) {
      const originalMaterie = data.materie;
      const normalized = String(originalMaterie).replace(/[^a-zA-Z]/g, '').toLowerCase();

      // console.log(`[NORM] Original: '${originalMaterie}' -> Normalized: '${normalized}'`);

      let match = false;
      if (normalized.includes("cod") && normalized.includes("civila")) {
        if (normalized.includes("procedura") || normalized.includes("procedur")) {
          data.materie = "Codul de Procedura Civila";
          match = true;
        } else {
          data.materie = "Codul Civil";
        }
      } else if (normalized.includes("cod") && normalized.includes("penal")) {
        if (normalized.includes("procedura") || normalized.includes("procedur")) {
          data.materie = "Codul de Procedura Penala";
          match = true;
        } else {
          data.materie = "Codul Penal";
        }
      }

      if (match) {
        // console.log(` -> MATCH: ${data.materie}`);
      }
    }

    if (newItem.data) {
      newItem.data = data;
    } else {
      newItem = data;
    }

    return newItem;
  });
};
