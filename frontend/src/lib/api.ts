const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const getFilters = async () => {
  const [tipSpeta, parte, menuData] = await Promise.all([
    fetch(`${API_URL}/filters/tip_speta`).then((res) => res.json()),
    fetch(`${API_URL}/filters/parte`).then((res) => res.json()),
    fetch(`${API_URL}/filters/menu`).then((res) => res.json()),
  ]);
  return { tipSpeta, parte, menuData };
};

export const refreshFilters = async () => {
  const response = await fetch(`${API_URL}/filters/refresh`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Filter refresh failed');
  }
  return response.json();
};

export const search = async (text: string, filters: Record<string, string[]>) => {
  const response = await fetch(`${API_URL}/search/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filters }),
  });
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return response.json();
};

export const exportEquivalents = async () => {
  const response = await fetch(`${API_URL}/equivalents/export`);
  if (!response.ok) {
    throw new Error('Export failed');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equivalents.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export const importEquivalents = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_URL}/equivalents/import`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Import failed');
  }
  return response.json();
};

export const getEquivalentsHelp = async () => {
  const response = await fetch(`${API_URL}/equivalents/help`);
  if (!response.ok) {
    throw new Error('Failed to get help text');
  }
  return response.json();
};
