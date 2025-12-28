import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import MainContent from '../components/MainContent';
import CaseDetailModal from '../components/CaseDetailModal';
import CompanyDetailModal from '../components/CompanyDetailModal';
import ContribuieModal from '../components/ContribuieModal';
import Footer from '../components/Footer';
import { HomeHero } from '../components/HomeHero';
import { search as apiSearch, searchByDosar, getFilterMappings } from '../lib/api';
import type { Filters, SelectedFilters } from '../types';
import { buildDynamicFilters, type FilterMappings, getOriginalValuesForCanonical } from '../lib/dynamicFilterHelpers';
import { useAuth } from '../context/AuthContext';

const SearchPage: React.FC = () => {
    const { user } = useAuth();
    // const [filters, setFilters] = useState<Filters | null>(null); // Removed static filters state
    const [dynamicFilters, setDynamicFilters] = useState<Filters | null>(null);
    const [filterMappings, setFilterMappings] = useState<FilterMappings | null>(null);
    const [originalResults, setOriginalResults] = useState<any[]>([]); // Store all fetched results for client-side filtering
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [status, setStatus] = useState('');
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
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isContribuieModalOpen, setIsContribuieModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProEnabled] = useState(true);
    const [acteJuridice, setActeJuridice] = useState<string[]>([]);
    const [isDosarSearchLoading, setIsDosarSearchLoading] = useState(false);

    const [dosarSearchInfo, setDosarSearchInfo] = useState<{ obiect: string; numar: string; materie?: string | null } | null>(null);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    // Track if a search has been initiated to determine Home vs Results view
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const mappings = await getFilterMappings();
                setFilterMappings(mappings);
                setStatus('');
            } catch (error) {
                console.error('Failed to load initial data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Apply client-side filters whenever searchParams or originalResults change
    const applyClientSideFilters = useCallback(() => {
        if (!originalResults.length) {
            setSearchResults([]);
            return;
        }

        let filtered = [...originalResults];

        // 1. Filter by Materie
        if (searchParams.materie && filterMappings) {
            const originalMateriiInGroup = getOriginalValuesForCanonical(searchParams.materie, filterMappings.materii_map);
            filtered = filtered.filter(r => {
                const rData = r.data || r;
                return originalMateriiInGroup.includes(rData.materie);
            });
        }

        // 2. Filter by Obiect (OR logic within obiects)
        if (searchParams.obiect.length > 0 && filterMappings) {
            filtered = filtered.filter(r => {
                const rData = r.data || r;
                const rObiectRaw = rData.obiectul || rData.obiect || '';
                return searchParams.obiect.some(selectedCanonical => {
                    const originalObiecteInGroup = getOriginalValuesForCanonical(selectedCanonical, filterMappings.obiecte_map);
                    const rParts = rObiectRaw.split(/,|;|\s+și\s+/i).map((s: string) => s.trim());
                    return rParts.some((part: string) => originalObiecteInGroup.includes(part));
                });
            });
        }

        // 3. Filter by Tip Speta
        if (searchParams.tip_speta.length > 0) {
            filtered = filtered.filter(r => {
                const rData = r.data || r;
                return searchParams.tip_speta.includes(rData.tip_speta || rData.tip || rData.categorie_speta || '');
            });
        }

        // 4. Filter by Parte
        if (searchParams.parte.length > 0) {
            filtered = filtered.filter(r => {
                const rData = r.data || r;
                const rParte = rData.parte || rData.parti || '';
                const parts = rParte.split(/,|;/).map((s: string) => s.trim());
                return searchParams.parte.some(p => parts.includes(p));
            });
        }

        setSearchResults(filtered);

        const newFilters = buildDynamicFilters(originalResults, filterMappings);
        setDynamicFilters(newFilters);

    }, [originalResults, searchParams, filterMappings]);


    // Trigger filter application when deps change
    useEffect(() => {
        applyClientSideFilters();
    }, [applyClientSideFilters]);

    // Example fill logic
    const EXAMPLE_CASE = "Contestatorii au formulat contestație la executare silită împotriva actelor de executare pornite de un executor judecătoresc la cererea creditorului, bazate pe două contracte de împrumut. Aceștia au solicitat anularea actelor de executare, reducerea cheltuielilor de executare și anularea titlurilor executorii (contractele de împrumut), argumentând că prețurile din contracte erau neserioase, sumele împrumutate nu au fost primite integral și că actele ascundeau o operațiune de cămătărie.";

    const handleExampleFill = useCallback(() => {
        setHasSearched(true); // Switch to results/input view technically, but usually stays on Hero until search

        const text = EXAMPLE_CASE;
        let index = 0;
        setSituatie('');

        const typingInterval = setInterval(() => {
            if (index < text.length) {
                setSituatie(() => text.substring(0, index + 1));
                index++;
            } else {
                clearInterval(typingInterval);
            }
        }, 10);
        return () => clearInterval(typingInterval);
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
            setOriginalResults(prev => [...prev, ...results]);
            setOffset(currentOffset + results.length);
            setHasMore(results.length === 20);
            setStatus(`Au fost găsite ${originalResults.length + results.length} rezultate.`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
            setStatus(`Eroare la încărcarea rezultatelor: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, searchParams, situatie, originalResults.length]);

    const handleSearch = useCallback(async () => {
        setHasSearched(true);
        if (!situatie.trim() && searchParams.obiect.length === 0) {
            setStatus("Introduceți un text sau selectați un obiect pentru a căuta.");
            return;
        }

        setSearchResults([]);
        setOffset(0);
        setHasMore(true);
        setIsLoading(true);

        try {
            const payload = {
                ...searchParams,
                situatie,
                materie: searchParams.materie ? [searchParams.materie] : [],
                offset: 0,
            };

            const initialResults = await apiSearch(payload);
            setOriginalResults(initialResults);
            const newFilters = buildDynamicFilters(initialResults, filterMappings);
            setDynamicFilters(newFilters);

            if (isProEnabled && situatie.trim().split(/\s+/).length > 3) {
                // AI Analysis Logic
                try {
                    setStatus("Analizez contextul juridic cu AI pentru a găsi cea mai relevantă spetă... (poate dura câteva minute)");
                    const response = await fetch('/api/settings/analyze-llm-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    if (!response.ok) throw new Error('Failed to start AI analysis');
                    const startResponse = await response.json();
                    if (!startResponse.success || !startResponse.job_id) throw new Error(startResponse.message || 'Failed to start AI analysis');

                    const jobId = startResponse.job_id;
                    const pollInterval = 2000;
                    const maxPolls = 600;
                    let pollCount = 0;

                    const pollStatus = async (): Promise<any> => {
                        const statusResponse = await fetch(`/api/settings/analyze-llm-status/${jobId}`);
                        if (!statusResponse.ok) throw new Error('Failed to check status');
                        return await statusResponse.json();
                    };

                    while (pollCount < maxPolls) {
                        const statusData = await pollStatus();
                        if (statusData.status === 'completed') {
                            if (statusData.result && statusData.result.success) {
                                const aiSelectedIds = statusData.result.ai_selected_ids || [];
                                const allCandidates = statusData.result.all_candidates || [];
                                const extractedActe = statusData.result.acte_juridice || [];
                                setActeJuridice(extractedActe);

                                if (aiSelectedIds.length > 0) {
                                    // Process logic similar to before
                                    const aiSelectedResults = aiSelectedIds.map((id: number) => {
                                        const candidate = allCandidates.find((c: any) => c.id === id);
                                        if (candidate) {
                                            return {
                                                id: candidate.id,
                                                data: candidate,
                                                score: 100,
                                                situatia_de_fapt_full: candidate.situatia_de_fapt,
                                                argumente_instanta: candidate.argumente_instanta || 'Nu există date',
                                                text_individualizare: candidate.text_individualizare || 'Nu există date',
                                                text_doctrina: candidate.text_doctrina || 'Nu există date',
                                                text_ce_invatam: candidate.text_ce_invatam || 'Nu există date',
                                                Rezumat_generat_de_AI_Cod: candidate.Rezumat_generat_de_AI_Cod || 'Nu există date'
                                            };
                                        }
                                        return initialResults.find((item: any) => item.id === id);
                                    }).filter(Boolean);

                                    const candidateIds = allCandidates.map((c: any) => c.id);
                                    const remainingCandidates = initialResults.filter((item: any) =>
                                        candidateIds.includes(item.id) && !aiSelectedIds.includes(item.id)
                                    ).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

                                    const exclusiveDisplay = statusData.result.exclusive_display || false;
                                    let mergedResults;

                                    if (exclusiveDisplay) {
                                        mergedResults = aiSelectedResults.map((r: any) => ({ ...r, isAISelected: true }));
                                        setStatus(`${aiSelectedResults.length} rezultate relevante identificate de AI.`);
                                    } else {
                                        mergedResults = [
                                            ...aiSelectedResults.map((r: any) => ({ ...r, isAISelected: true })),
                                            ...remainingCandidates.map((r: any) => ({ ...r, isCandidateCase: true }))
                                        ];
                                        setStatus(`${aiSelectedResults.length} selectate de AI, ${remainingCandidates.length} analizate.`);
                                    }
                                    setOriginalResults(mergedResults);
                                    setOffset(mergedResults.length);
                                    setHasMore(false);
                                } else {
                                    setOriginalResults([]);
                                    setStatus("AI-ul nu a găsit rezultate relevante.");
                                }
                            } else {
                                setOriginalResults([]);
                                setSearchResults([]);
                                setStatus("Eroare la procesarea răspunsului AI.");
                            }
                            break;
                        } else if (statusData.status === 'failed') {
                            throw new Error(statusData.error || 'AI analysis failed');
                        } else if (statusData.status === 'queued' || statusData.status === 'processing') {
                            setStatus(statusData.status === 'queued'
                                ? `În coadă pentru analiză AI... `
                                : "AI analizează datele...");
                        } else if (statusData.status === 'not_found') {
                            throw new Error('Job not found');
                        }
                        await new Promise(resolve => setTimeout(resolve, pollInterval));
                        pollCount++;
                    }
                    if (pollCount >= maxPolls) throw new Error('AI analysis timeout');
                } catch (aiError) {
                    console.error("AI Filtering failed:", aiError);
                    setStatus("Filtrarea AI nu a putut fi aplicată.");
                    setOriginalResults([]);
                    setSearchResults([]);
                }
            } else {
                setOffset(initialResults.length);
                setHasMore(initialResults.length === 20); // This logic might be slightly off with limits but keeps paging working

                // Normalize role
                let userRole = 'guest';
                if (user) {
                    userRole = (user.rol || 'basic').toLowerCase();
                }

                // Determine strict role limit
                let limit = 10;
                if (userRole === 'admin') limit = 100000;
                else if (userRole === 'pro') limit = 50;
                else if (userRole === 'basic') limit = 20;
                else limit = 10; // guest

                // Check if we hit the limit
                // If we received exactly the limit, we assume we hit it.
                // Or if we have accumulated >= limit
                const totalLoaded = initialResults.length;
                let limitHit = totalLoaded >= limit;

                // Stop pagination if we hit role limit
                if (limitHit && userRole !== 'admin') {
                    setHasMore(false);
                } else {
                    setHasMore(initialResults.length === 20); // Standard pagination check
                }

                // Set offset correctly
                setOffset(initialResults.length);

                let statusMsg = `Au fost găsite ${initialResults.length} rezultate.`;

                // Only show upgrade message for guest and basic users if limit is reached
                if (limitHit && (userRole === 'guest' || userRole === 'basic')) {
                    statusMsg += ` (Limitat la ${limit} pentru ${userRole || 'neînregistrat'}. Upgrade pentru mai multe.)`;
                }
                setStatus(statusMsg);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
            setStatus(`Eroare la încărcarea rezultatelor: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [situatie, searchParams, isProEnabled, filterMappings]);

    const handleDosarSearch = useCallback(async (numarDosar: string) => {
        setHasSearched(true);
        setIsDosarSearchLoading(true);
        setStatus('Căutare după număr dosar...');

        try {
            const response = await searchByDosar(numarDosar);
            if (!response.success) {
                setStatus(`Eroare: ${response.error || 'Căutarea a eșuat'}`);
                setSearchResults([]);
                setDosarSearchInfo(null);
                return;
            }

            setDosarSearchInfo({
                obiect: response.obiect_from_portal || '',
                materie: response.materie_from_portal,
                numar: response.numar_dosar
            });

            setOriginalResults(response.results);
            setOffset(response.results.length);
            setHasMore(false);
            setActeJuridice([]);

            if (response.results.length > 0) {
                setStatus(`Căutare după număr dosar "${numarDosar}": ${response.match_count} spețe similare găsite.`);
            } else {
                setStatus(`Nu au fost găsite spețe similare pentru dosarul "${numarDosar}"`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
            setStatus(`Eroare la căutarea după număr dosar: ${errorMessage}`);
            setSearchResults([]);
            setDosarSearchInfo(null);
        } finally {
            setIsDosarSearchLoading(false);
        }
    }, []);

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
        if (caseData.type === 'company') {
            setSelectedCompany(caseData);
            setIsCompanyModalOpen(true);
        } else {
            setSelectedCase(caseData);
            setIsModalOpen(true);
        }
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

    // Determine view state
    const isHomeView = !hasSearched && originalResults.length === 0 && !isLoading && !dosarSearchInfo && status === '';

    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <Header
                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onContribuieClick={() => setIsContribuieModalOpen(true)}
                isHomeView={isHomeView}
            />

            <div className="flex flex-1 overflow-hidden relative">
                <LeftSidebar
                    filters={dynamicFilters}
                    selectedFilters={searchParams}
                    onFilterChange={handleFilterChange}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onContribuieClick={() => setIsContribuieModalOpen(true)}
                    isDesktopOpen={isDesktopSidebarOpen}
                    onDesktopToggle={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                    hideOnDesktop={isHomeView}
                />

                {isHomeView ? (
                    <HomeHero
                        situacie={situatie}
                        onSituatieChange={setSituatie}
                        onSearch={handleSearch}
                        onDosarSearch={handleDosarSearch}
                        isLoading={isLoading}
                        onExampleClick={handleExampleFill}
                    />
                ) : (
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

                        acteJuridice={acteJuridice}
                        onDosarSearch={handleDosarSearch}
                        isDosarSearchLoading={isDosarSearchLoading}
                        dosarSearchInfo={dosarSearchInfo}
                    />
                )}
            </div>

            <CaseDetailModal
                isOpen={isModalOpen}
                result={selectedCase}
                onClose={() => setIsModalOpen(false)}
            />

            <CompanyDetailModal
                isOpen={isCompanyModalOpen}
                company={selectedCompany}
                onClose={() => setIsCompanyModalOpen(false)}
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
