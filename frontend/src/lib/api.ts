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
