import React, { useState, useEffect } from 'react';
import MultiStepForm from './components/MultiStepForm';
import Status from './components/Status';
import { getFilters, search } from './lib/api';

const App = () => {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('Gata.');
  const [filters, setFilters] = useState({ tipSpeta: [], parte: [], menuData: {} });

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    setStatus('Încărc opțiuni din cache...');
    try {
      const filterData = await getFilters();
      setFilters(filterData);
      setStatus('Opțiunile au fost încărcate din cache.');
    } catch (error) {
      setStatus('Eroare la încărcarea filtrelor din cache.');
    }
  };

  const handleSearch = async (searchParameters: {
    situation: string;
    selectedTipSpeta: string[];
    selectedParte: string[];
    selectedMenuKeys: React.Key[];
  }) => {
    const { situation, selectedTipSpeta, selectedParte, selectedMenuKeys } = searchParameters;

    if (!situation.trim()) {
      setResults([]);
      setStatus("Gata. Introduceți text pentru a căuta.");
      return;
    }

    const selectedMaterii = new Set<string>();
    const selectedObiecte = new Set<string>();
    const explicitlySelectedMaterii = new Set<string>();

    selectedMenuKeys.forEach((key) => {
        const parts = (key as string).split(':');
        if (parts[0] === 'materie') {
            explicitlySelectedMaterii.add(parts[1]);
        }
    });

    selectedMenuKeys.forEach((key) => {
        const parts = (key as string).split(':');
        if (parts[0] === 'materie') {
            selectedMaterii.add(parts[1]);
        } else if (parts[0] === 'obiect') {
            const materie = parts[1];
            const obiect = parts[2];
            if (!explicitlySelectedMaterii.has(materie)) {
                selectedObiecte.add(obiect);
            }
            selectedMaterii.add(materie);
        }
    });

    const searchFilters = {
        tip_speta: selectedTipSpeta,
        parte: selectedParte,
        materie: Array.from(selectedMaterii),
        obiect: Array.from(selectedObiecte),
    };

    setStatus('Vectorizare și căutare...');
    try {
      const searchResults = await search(situation, searchFilters);
      setResults(searchResults);
      setStatus(`Găsite ${searchResults.length} rezultate.`);
    } catch (error) {
      setStatus('Eroare la căutare.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans flex flex-col items-center">
      <header className="w-full max-w-4xl mb-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center">Căutare spețe – Profesional complet</h1>
        <p className="text-sm text-gray-500 text-center">Meniu Simplificat</p>
      </header>

      <main className="w-full flex-grow flex items-center justify-center">
        <MultiStepForm
          filters={filters}
          results={results}
          status={status}
          onSearch={handleSearch}
        />
      </main>

      <Status message={status} />
    </div>
  );
};

export default App;
