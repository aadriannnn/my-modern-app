import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import MainContent from '../components/MainContent';
import CaseDetailModal from '../components/CaseDetailModal';
import ContribuieModal from '../components/ContribuieModal';
import { getFilters, search as apiSearch } from '../lib/api';
import type { Filters, SelectedFilters } from '../types';

const SearchPage: React.FC = () => {
    const [filters, setFilters] = useState<Filters | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [status, setStatus] = useState('Introduceți un termen de căutare pentru a începe.');
    const [isLoading, setIsLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams, setSearchParams] = useState<SelectedFilters>({
      materie: '',
      obiect: [],
      tip_speta: [],
      parte: [],
    });
    const [selectedCase, setSelectedCase] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isContribuieModalOpen, setIsContribuieModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
      const loadFilters = async () => {
        try {
          const filterData = await getFilters();
          setFilters(filterData);
        } catch (error) {
          console.error('Failed to load filters:', error);
          setStatus('Eroare la încărcarea filtrelor.');
        }
      };
      loadFilters();
    }, []);

    const executeSearch = useCallback(async (currentOffset: number, isNewSearch: boolean) => {
      if (!searchQuery.trim() && searchParams.obiect.length === 0) {
        setStatus("Introduceți un text sau selectați un obiect pentru a căuta.");
        return;
      }

      setIsLoading(true);
      if (isNewSearch) {
        setSearchResults([]);
        setHasSearched(true);
      }
      setStatus('Căutare în curs...');

      const payload = {
        ...searchParams,
        situatie: searchQuery,
        materie: searchParams.materie ? [searchParams.materie] : [],
        offset: currentOffset,
      };

      try {
        const results = await apiSearch(payload);
        setSearchResults(prev => isNewSearch ? results : [...prev, ...results]);
        setOffset(currentOffset + results.length);
        setHasMore(results.length > 0);
        setStatus(`Au fost găsite ${isNewSearch ? results.length : searchResults.length + results.length} rezultate.`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
        setStatus(`Eroare la căutare: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }, [searchQuery, searchParams]);

    const handleSearch = () => {
      setOffset(0);
      executeSearch(0, true);
    };

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            executeSearch(offset, false);
        }
    };

    const handleFilterChange = useCallback((filterType: keyof SelectedFilters, value: any) => {
      setSearchParams(prevParams => {
        const newParams = { ...prevParams, [filterType]: value };
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
      <div className="flex h-screen w-full flex-col bg-background font-sans">
        <Header
          onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onContribuieClick={() => setIsContribuieModalOpen(true)}
        />
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-80 flex-shrink-0 border-r border-border-color bg-surface">
            <LeftSidebar
              filters={filters}
              selectedFilters={searchParams}
              onFilterChange={handleFilterChange}
              isOpen={true} // Always open on desktop
              onClose={() => {}} // No-op on desktop
            />
          </aside>

          {/* Mobile Sidebar */}
          <div className="lg:hidden">
            <LeftSidebar
              filters={filters}
              selectedFilters={searchParams}
              onFilterChange={handleFilterChange}
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>

          <MainContent
            results={searchResults}
            status={hasSearched || isLoading ? status : 'Introduceți un termen de căutare pentru a începe.'}
            isLoading={isLoading}
            onViewCase={handleViewCase}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
          />
        </div>

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
