const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function getCases() {
  const res = await fetch(`${API}/cases/`);
  if (!res.ok) throw new Error("Eroare la încărcarea spețelor");
  return res.json();
}

export async function createCase(data: {
  title: string;
  summary: string;
  materie: string;
  obiect: string;
}) {
  const res = await fetch(`${API}/cases/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Eroare la adăugarea speței");
  return res.json();
}

export async function searchCases(queryText: string, filters: any) {
    const res = await fetch(`${API}/search/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query_text: queryText, filters }),
    });
    if (!res.ok) throw new Error("Eroare la căutarea spețelor");
    return res.json();
}

export async function getFilters() {
    const res = await fetch(`${API}/filters/`);
    if (!res.ok) throw new Error("Eroare la încărcarea filtrelor");
    return res.json();
}

export async function refreshFilters() {
    const res = await fetch(`${API}/filters/refresh`, { method: "POST" });
    if (!res.ok) throw new Error("Eroare la actualizarea filtrelor");
    return res.json();
}

export async function exportEquivalences() {
    const res = await fetch(`${API}/filters/equivalences/export`);
    if (!res.ok) throw new Error("Eroare la exportul echivalențelor");
    return res.blob();
}

export async function importEquivalences(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API}/filters/equivalences/import`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error("Eroare la importul echivalențelor");
    return res.json();
}
