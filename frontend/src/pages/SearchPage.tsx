import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import ProgressiveFiltersMobile from '../components/ProgressiveFiltersMobile';
import MainContent from '../components/MainContent';
import CaseDetailModal from '../components/CaseDetailModal';
import ContribuieModal from '../components/ContribuieModal';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { getFilters, search as apiSearch } from '../lib/api';
import type { Filters, SelectedFilters } from '../types';

const SearchPage: React.FC = () => {
    // SEO Structured Data for Search Page
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "LegeaAplicata - Căutare Juridică Avansată",
        "applicationCategory": "LegalService",
        "url": "https://chat.legeaaplicata.ro",
        "description": "Platformă profesională de căutare în jurisprudență română și legislație. Căutare avansată cu AI în hotărâri judecătorești, Cod Civil, Cod Penal, Cod Procedură Civilă, Cod Procedură Penală și alte coduri.",
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://chat.legeaaplicata.ro/?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
        },
        "featureList": [
            "Căutare avansată în jurisprudență română",
            "Filtrare după materie juridică (Civil, Penal, Muncă, etc.)",
            "Filtrare după obiect juridic și tip spetă",
            "Detectare automată articole de lege aplicabile",
            "Generare documente juridice bazate pe cazuri similare",
            "Calcul automat taxe judiciare",
            "Export rezultate în PDF",
            "Salvare cazuri în dosare personale"
        ],
        "audience": {
            "@type": "Audience",
            "audienceType": "Legal Professionals",
            "geographicArea": {
                "@type": "Country",
                "name": "România"
            }
        },
        "inLanguage": "ro",
        "provider": {
            "@type": "Organization",
            "name": "LegeaAplicata"
        }
    };

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
            <SEOHead
                title="Căutare Juridică Avansată | Jurisprudență și Hotărâri Judecătorești România | LegeaAplicata"
                description="Platformă profesională de căutare juridică cu AI. Accesează jurisprudență română, hotărâri judecătorești, Cod Civil, Cod Penal, legislație actualizată. Filtrare avansată pentru avocați, jurisconsulți și studenți la drept."
                keywords="căutare juridică, jurisprudență românia, hotărâri judecătorești, cod civil online, cod penal, cod procedură civilă, cod procedură penală, legislație română, căutare legislație, avocat research, cercetare juridică, practică judiciară, instanță supremă"
                ogTitle="Căutare Juridică Avansată în Jurisprudență Română | LegeaAplicata"
                ogDescription="Căutare avansată cu AI în jurisprudență română și legislație. Filtrare inteligentă, detectare automată articole, generare documente juridice."
                ogImage="https://chat.legeaaplicata.ro/src/assets/icons/logo.png"
                ogUrl="https://chat.legeaaplicata.ro/"
                canonicalUrl="https://chat.legeaaplicata.ro/"
                structuredData={structuredData}
            />
            <Header

                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onContribuieClick={() => setIsContribuieModalOpen(true)}
            />
            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Progressive Filters */}
                <div className="md:hidden">
                    <ProgressiveFiltersMobile
                        filters={filters}
                        selectedFilters={searchParams}
                        onFilterChange={handleFilterChange}
                        isOpen={isMobileMenuOpen}
                        onClose={() => setIsMobileMenuOpen(false)}
                        onApply={() => {
                            setIsMobileMenuOpen(false);
                            handleSearch();
                        }}
                    />
                </div>

                {/* Desktop/Tablet Sidebar with Breadcrumbs */}
                <div className="hidden md:block">
                    <LeftSidebar
                        filters={filters}
                        selectedFilters={searchParams}
                        onFilterChange={handleFilterChange}
                        isOpen={isMobileMenuOpen}
                        onClose={() => setIsMobileMenuOpen(false)}
                        onContribuieClick={() => setIsContribuieModalOpen(true)}
                        isDesktopOpen={isDesktopSidebarOpen}
                        onDesktopToggle={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                    />
                </div>

                <MainContent
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
                    onMinimizeSidebar={() => setIsDesktopSidebarOpen(false)}
                />
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

            <Footer />
        </div>
    );
};

export default SearchPage;
