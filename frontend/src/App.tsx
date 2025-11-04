import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import MainContent from './components/MainContent';
import RightSidebar from './components/RightSidebar';
import CaseDetailModal from './components/CaseDetailModal';
import ContribuieModal from './components/ContribuieModal';
import { getFilters, search as apiSearch } from './lib/api';

// Define types for our state
interface Filters {
  menuData: { [key: string]: string[] };
  tipSpeta: string[];
  parte: string[];
}

interface SearchParams {
  situatie: string;
  materie: string; // Only one materie can be selected
  obiect: string[];
  tip_speta: string[];
  parte: string[];
}

const App: React.FC = () => {
  const [filters, setFilters] = useState<Filters | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [status, setStatus] = useState('Așteptare căutare...');
  const [isLoading, setIsLoading] = useState(true);

  const [searchParams, setSearchParams] = useState<SearchParams>({
    situatie: '',
    materie: '',
    obiect: [],
    tip_speta: [],
    parte: [],
  });

  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContribuieModalOpen, setIsContribuieModalOpen] = useState(false);

  // Fetch initial filter data on component mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setStatus('Încărcare filtre...');
        const filterData = await getFilters();
        setFilters(filterData);
        setStatus('Filtre încărcate.');
      } catch (error) {
        console.error('Failed to load filters:', error);
        setStatus('Eroare la încărcarea filtrelor.');
      } finally {
        setIsLoading(false);
      }
    };
    loadFilters();
  }, []);

  const handleSearch = async () => {
    if (!searchParams.situatie.trim()) {
      setStatus('Introduceți text pentru a căuta.');
      return;
    }

    setStatus('Căutare în curs...');
    setIsLoading(true);

    // Construct the payload, ensuring materie is an array if it's selected
    const payload = {
      ...searchParams,
      materie: searchParams.materie ? [searchParams.materie] : [],
    };

    try {
      const results = await apiSearch(payload);
      setSearchResults(results);
      setStatus(`Au fost găsite ${results.length} rezultate.`);
    } catch (error) {
      console.error('Search failed:', error);
      setStatus('Eroare la căutare.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = useCallback((filterType: keyof SearchParams, value: string | string[]) => {
    setSearchParams(prevParams => {
      const newParams = { ...prevParams, [filterType]: value };
      // If materie changes, reset obiect
      if (filterType === 'materie') {
        newParams.obiect = [];
      }
      return newParams;
    });
  }, []);

  const handleViewCase = (caseData: any) => {
    setSelectedCase(caseData);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      <Header
        situatie={searchParams.situatie}
        onSituatieChange={(value) => setSearchParams(p => ({ ...p, situatie: value }))}
        onSearch={handleSearch}
      />
      <div className="flex flex-1 overflow-hidden">
        {isLoading && !filters ? (
          <div className="flex-1 flex items-center justify-center">
            <p>{status}</p>
          </div>
        ) : (
          <>
            <LeftSidebar
              filters={filters}
              selectedFilters={searchParams}
              onFilterChange={handleFilterChange}
            />
            <MainContent
              results={searchResults}
              status={status}
              isLoading={isLoading}
              onViewCase={handleViewCase}
            />
          </>
        )}
      </div>
      <RightSidebar onContribuieClick={() => setIsContribuieModalOpen(true)} />

      {isModalOpen && selectedCase && (
        <CaseDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          caseData={selectedCase}
        />
      )}

      <ContribuieModal
        isOpen={isContribuieModalOpen}
        onClose={() => setIsContribuieModalOpen(false)}
      />
    </div>
  );
};

export default App;
