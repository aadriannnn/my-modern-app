import { useEffect, useState } from "react";
import { getCases, createCase } from "./lib/api";

// Definim tipul local (nu îl importăm)
type CaseType = {
  id: number;
  title: string;
  summary: string;
  materie: string;
  obiect: string;
};

export default function App() {
  const [cases, setCases] = useState<CaseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [materie, setMaterie] = useState("");
  const [obiect, setObiect] = useState("");

  useEffect(() => {
    getCases()
      .then((data) => setCases(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCase = { title, summary, materie, obiect };
    try {
      const created = await createCase(newCase);
      setCases((prev) => [...prev, created]);
      setTitle("");
      setSummary("");
      setMaterie("");
      setObiect("");
    } catch (err: any) {
      alert("Eroare la adăugare: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        📚 Lista Spețelor
      </h1>

      {loading && <p className="text-gray-500">Se încarcă...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <ul className="w-full max-w-2xl space-y-4 mb-10">
          {cases.map((c) => (
            <li
              key={c.id}
              className="bg-white shadow p-4 rounded-lg border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-blue-600">
                {c.title}
              </h2>
              <p className="text-gray-700">{c.summary}</p>
              <p className="text-sm text-gray-500">
                {c.materie} • {c.obiect}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 shadow-md rounded-lg w-full max-w-md space-y-4 border border-gray-200"
      >
        <h2 className="text-xl font-bold text-gray-700">Adaugă o speță</h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titlu speță"
          className="w-full border p-2 rounded"
          required
        />
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Rezumat"
          className="w-full border p-2 rounded"
          required
        />
        <input
          value={materie}
          onChange={(e) => setMaterie(e.target.value)}
          placeholder="Materie"
          className="w-full border p-2 rounded"
        />
        <input
          value={obiect}
          onChange={(e) => setObiect(e.target.value)}
          placeholder="Obiect"
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded w-full"
        >
          Adaugă speță
        </button>
      </form>
    </div>
  );
}
