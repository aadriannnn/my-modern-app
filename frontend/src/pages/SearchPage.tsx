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
    const [status, setStatus] = useState('Așteptare căutare...');
    const [isLoading, setIsLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [situatie, setSituatie] = useState('');
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
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

    const toggleDesktopSidebar = () => {
        setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
    };

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

    const loadMoreResults = useCallback(async (currentOffset: number) => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        setStatus('Se încarcă mai multe rezultate...');

        const payload = {
            ...searchParams,
            situatie,
            materie: searchParams.materie ? [searchParams.materie] : [],
            offset: currentOffset,
        };

        try {
            const results = await apiSearch(payload);
            setSearchResults(prev => [...prev, ...results]);
            setOffset(currentOffset + results.length);
            setHasMore(results.length === 20);
            setStatus(`Au fost găsite ${searchResults.length + results.length} rezultate.`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
            setStatus(`Eroare la încărcarea rezultatelor: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, searchParams, situatie]);

    const handleSearch = useCallback(async () => {
        if (!situatie.trim() && searchParams.obiect.length === 0) {
            setStatus("Introduceți un text sau selectați un obiect pentru a căuta.");
            return;
        }
        setSearchResults([]);
        setOffset(0);
        setHasMore(true);
        await loadMoreResults(0);
    }, [situatie, searchParams.obiect.length, loadMoreResults]);

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

    const handleRemoveFilter = useCallback((filterType: string, valueToRemove: string) => {
        setSearchParams(prevParams => {
            const newParams = { ...prevParams };
            const key = filterType as keyof SelectedFilters;
            const currentValue = newParams[key];
            if (Array.isArray(currentValue)) {
                // @ts-ignore
                newParams[key] = currentValue.filter(item => item !== valueToRemove);
            } else {
                // @ts-ignore
                newParams[key] = '';
            }
            return newParams;
        });
    }, []);

    const handleClearFilters = useCallback(() => {
        setSearchParams({
            materie: '',
            obiect: [],
            tip_speta: [],
            parte: [],
        });
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <Header
                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onContribuieClick={() => setIsContribuieModalOpen(true)}
            />
            <div className="flex flex-1">
              <div className="relative flex flex-1 overflow-hidden">
                <LeftSidebar
                    filters={filters}
                    selectedFilters={searchParams}
                    onFilterChange={handleFilterChange}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onContribuieClick={() => setIsContribuieModalOpen(true)}
                    isDesktopSidebarOpen={isDesktopSidebarOpen}
                    toggleDesktopSidebar={toggleDesktopSidebar}
                />
                <MainContent
                    isDesktopSidebarOpen={isDesktopSidebarOpen}
                    results={searchResults}
                    status={status}
                    isLoading={isLoading}
                    onViewCase={handleViewCase}
                    searchParams={searchParams}
                    onRemoveFilter={handleRemoveFilter}
                    onClearFilters={handleClearFilters}
                    onLoadMore={() => loadMoreResults(offset)}
                    hasMore={hasMore}
                    situatie={situatie}
                    onSituatieChange={setSituatie}
                    onSearch={handleSearch}
                />
              </div>
            </div>

            <CaseDetailModal
                isOpen={isModalOpen}
                result={selectedCase}
                onClose={() => setIsModalOpen(false)}
            />

            <ContribuieModal
                isOpen={isContribuieModalOpen}
                onClose={() => setIsContribuieModalOpen(false)}
            />
        </div>
    );
};

export default SearchPage;
