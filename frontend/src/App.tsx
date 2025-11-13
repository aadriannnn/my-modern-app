import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import MainContent from './components/MainContent';
import RightSidebar from './components/RightSidebar';
import CaseDetailModal from './components/CaseDetailModal';
import ContribuieModal from './components/ContribuieModal';
import { getFilters, search as apiSearch, ApiError } from './lib/api';

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
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);

  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
  };

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

    const payload = {
      ...searchParams,
      materie: searchParams.materie ? [searchParams.materie] : [],
    };

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 3000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const results = await apiSearch(payload);
        setSearchResults(results);
        setStatus(`Au fost găsite ${results.length} rezultate.`);
        setIsLoading(false);
        return; // Success, exit the function
      } catch (error) {
        console.error(`Search attempt ${attempt} failed:`, error);

        if (error instanceof ApiError && error.status >= 500 && attempt < MAX_RETRIES) {
          // This is a server error, so we can retry.
          setStatus(
            `Serverul este momentan suprasolicitat. Se reîncearcă automat... (${attempt}/${MAX_RETRIES})`
          );
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          // This is a client error or the last retry failed.
          const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
          setStatus(`Eroare la căutare: ${errorMessage}`);
          setSearchResults([]);
          setIsLoading(false);
          return; // Failure, exit the function
        }
      }
    }

    // This point is reached only if all retries have failed.
    setStatus('Serverul nu a putut procesa cererea. Vă rugăm să încercați din nou mai târziu.');
    setIsLoading(false);
  };

  const handleFilterChange = useCallback((filterType: keyof SearchParams, value: string | string[] | boolean) => {
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

  const handleRemoveFilter = useCallback((filterType: string, valueToRemove: string) => {
    setSearchParams(prevParams => {
      const newParams = { ...prevParams };
      const key = filterType as keyof SearchParams;
      const currentValue = newParams[key];

      if (Array.isArray(currentValue)) {
        // @ts-ignore
        newParams[key] = currentValue.filter(item => item !== valueToRemove);
      } else if (typeof currentValue === 'string') {
        // @ts-ignore
        newParams[key] = '';
      }

      return newParams;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchParams(prevParams => ({
      ...prevParams,
      materie: '',
      obiect: [],
      tip_speta: [],
      parte: [],
    }));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      <Header
        situatie={searchParams.situatie}
        onSituatieChange={(value) => setSearchParams(p => ({ ...p, situatie: value }))}
        onSearch={handleSearch}
      />
      <div className="flex flex-1 overflow-hidden">
        {!filters ? (
          <div className="flex-1 flex items-center justify-center">
            <p>{status}</p>
          </div>
        ) : (
          <>
            <LeftSidebar
              filters={filters}
              selectedFilters={searchParams}
              onFilterChange={handleFilterChange}
              isCollapsed={isLeftSidebarCollapsed}
              onToggleCollapse={toggleLeftSidebar}
            />
            <MainContent
              results={searchResults}
              status={status}
              isLoading={isLoading}
              onViewCase={handleViewCase}
              searchParams={searchParams}
              onRemoveFilter={handleRemoveFilter}
              onClearFilters={handleClearFilters}
              isLeftSidebarCollapsed={isLeftSidebarCollapsed}
            />
          </>
        )}
      </div>
      <RightSidebar onContribuieClick={() => setIsContribuieModalOpen(true)} />

      {isModalOpen && selectedCase && (
        <CaseDetailModal
          result={selectedCase}
          onClose={() => setIsModalOpen(false)}
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
