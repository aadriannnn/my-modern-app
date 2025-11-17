import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import MainContent from '../components/MainContent';
import RightSidebar from '../components/RightSidebar';
import CaseDetailModal from '../components/CaseDetailModal';
import ContribuieModal from '../components/ContribuieModal';
import { getFilters, search as apiSearch, ApiError } from '../lib/api';

import { Filters } from '../types';

interface SearchParams {
  situatie: string;
  materie: string; // Only one materie can be selected
  obiect: string[];
  tip_speta: string[];
  parte: string[];
}

const SearchPage: React.FC = () => {
    const [filters, setFilters] = useState<Filters | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [status, setStatus] = useState('Așteptare căutare...');
    const [isLoading, setIsLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

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

    const loadMoreResults = async (currentOffset: number) => {
      if (isLoading || !hasMore) return;

      setIsLoading(true);
      setStatus('Se încarcă mai multe rezultate...');

      const payload = {
        ...searchParams,
        materie: searchParams.materie ? [searchParams.materie] : [],
        offset: currentOffset,
      };

      try {
        const results = await apiSearch(payload);
        setSearchResults(prev => [...prev, ...results]);
        setOffset(currentOffset + results.length);
        setHasMore(results.length > 0);
        setStatus(`Au fost găsite ${searchResults.length + results.length} rezultate.`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
        setStatus(`Eroare la încărcarea rezultatelor: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSearch = async () => {
      if (!searchParams.situatie.trim() && searchParams.obiect.length === 0) {
        setStatus("Pentru a efectua o căutare, vă rugăm să introduceți un text în câmpul 'Situație de fapt' sau să selectați cel puțin un 'Obiect' din filtre.");
        return;
      }

      setSearchResults([]);
      setOffset(0);
      setHasMore(true);

      await loadMoreResults(0);
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
                onLoadMore={() => loadMoreResults(offset)}
                hasMore={hasMore}
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

  export default SearchPage;
  
