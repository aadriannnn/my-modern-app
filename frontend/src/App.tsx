import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import Filters from './components/Filters';
import Results from './components/Results';
import Status from './components/Status';
import EquivalentsHelp from './components/Equivalents';
import { getFilters, search, exportEquivalents, importEquivalents, getEquivalentsHelp, refreshFilters } from './lib/api';

const App = () => {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('Gata.');
  const [filters, setFilters] = useState({ tipSpeta: [], parte: [], menuData: {} });
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [helpText, setHelpText] = useState({ title: '', message: '' });
  const [searchText, setSearchText] = useState('');

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

  const handleRefreshFilters = async () => {
    setStatus('Actualizez filtrele...');
    try {
      await refreshFilters();
      await loadFilters();
      setStatus('Filtrele au fost actualizate cu succes.');
    } catch (error) {
      setStatus('Eroare la actualizarea filtrelor.');
    }
  };

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setResults([]);
      setStatus("Gata. Introduceți text pentru a căuta.");
      return;
    }
    setStatus('Vectorizare și căutare...');
    try {
      const searchResults = await search(text, selectedFilters);
      setResults(searchResults);
      setStatus(`Găsite ${searchResults.length} rezultate.`);
    } catch (error) {
      setStatus('Eroare la căutare.');
    }
  };

  const handleFilterChange = (newFilters: Record<string, string[]>) => {
    setSelectedFilters(newFilters);
    if (searchText) {
      handleSearch(searchText);
    }
  };

  const handleExport = async () => {
    setStatus('Se exportă echivalențele...');
    try {
      await exportEquivalents();
      setStatus('Echivalențe exportate cu succes.');
    } catch (error) {
      setStatus('Eroare la exportul echivalențelor.');
    }
  };

  const handleImport = async (file: File) => {
    setStatus('Se importă echivalențele...');
    try {
      await importEquivalents(file);
      await handleRefreshFilters();
      setStatus('Echivalențe importate și filtre actualizate cu succes.');
    } catch (error) {
      setStatus('Eroare la importul echivalențelor.');
    }
  };

  const handleHelp = async () => {
    try {
      const help = await getEquivalentsHelp();
      setHelpText(help);
      setShowHelp(true);
    } catch (error) {
      setStatus('Eroare la afișarea ajutorului.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Căutare spețe – Profesional complet</h1>
        <p className="text-sm text-gray-500">Meniu Simplificat</p>
      </header>

      <main className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-1/3 lg:w-1/4">
          <div className="space-y-6">
            <SearchBar onSearch={handleSearch} />
            <Filters
              {...filters}
              onFilterChange={handleFilterChange}
              onRefresh={handleRefreshFilters}
              onClear={() => setSelectedFilters({})}
              onExport={handleExport}
              onImport={handleImport}
              onHelp={handleHelp}
            />
          </div>
        </aside>

        <section className="flex-grow">
          <Results results={results} />
        </section>
      </main>

      <Status message={status} />
      {showHelp && <EquivalentsHelp onClose={() => setShowHelp(false)} helpText={helpText} />}
    </div>
  );
};

export default App;
