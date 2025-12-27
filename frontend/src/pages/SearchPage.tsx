import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import MainContent from '../components/MainContent';
import CaseDetailModal from '../components/CaseDetailModal';
import CompanyDetailModal from '../components/CompanyDetailModal';
import ContribuieModal from '../components/ContribuieModal';
import Footer from '../components/Footer';
import { search as apiSearch, searchByDosar, getFilterMappings } from '../lib/api';
import type { Filters, SelectedFilters } from '../types';
import { useAuth } from '../context/AuthContext';
import { buildDynamicFilters, type FilterMappings, getOriginalValuesForCanonical } from '../lib/dynamicFilterHelpers';

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

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const mappings = await getFilterMappings();
                setFilterMappings(mappings);

                // We don't really need the static filters anymore for the sidebar,
                // but we might keep them for fallback or other uses.
                // setFilters(await getFilters());
                setStatus('');
            } catch (error) {
                console.error('Failed to load initial data:', error);
                // setStatus('Eroare la încărcarea datelor inițiale.');
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
                // Obiect in result can be "Divort, Partaj"
                // searchParams.obiect contains canonicals like "Divort"
                const rObiectRaw = rData.obiectul || rData.obiect || '';

                // We need to check if ANY of the selected canonical objects match ANY of the result's objects
                return searchParams.obiect.some(selectedCanonical => {
                    const originalObiecteInGroup = getOriginalValuesForCanonical(selectedCanonical, filterMappings.obiecte_map);
                    // Check if raw string contains any of the originals
                    // Since raw string can be comma separated, we split it
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
                // Simple substring check or exact match on split?
                // Let's do exact match on split parts for consistency with helper
                const parts = rParte.split(/,|;/).map((s: string) => s.trim());
                return searchParams.parte.some(p => parts.includes(p));
            });
        }

        setSearchResults(filtered);

        // Re-calculate dynamic filters based on the NEW filtered list?
        // OR should filters always reflect the FULL result set for the current search (before filtering)?
        // Use case: I search "divort". I verify 100 results. I filter by "Civil".
        // Should the "Obiecte" filter now only show objects present in the 50 "Civil" cases?
        // YES, usually dependent filters refine available options.
        // However, standard e-commerce behavior is:
        // - Filters count shows what IS available if you select it.
        // BUT if I select Materie=Civil, I shouldn't see Obiect=Penal options anymore.
        // So yes, re-build dynamic filters from the filtered results.

        // WAIT. If I select a filter, and the list shrinks, and I re-generate filters from the shrunk list,
        // I lose the unselected options!
        // Example: Materie: Civil (50), Penal (50). I select Civil. Result is 50.
        // If I rebuild filters from these 50, Materie options become: Civil (50). Penal is gone!
        // So I can't unselect Civil easily or switch to Penal.

        // CORRECT APPROACH:
        // 1. Materie Filter Options should be based on `originalResults` + selection state?
        // Usually: Top level filters (Materie) are based on the GLOBAL search results (originalResults).
        // Sub-filters (Obiect) *could* be refined by Materie selection.

        // Implementation for now:
        // Always build filters from `originalResults` BUT:
        // The helper `buildDynamicFilters` supports hierarchical structure.
        // If we want "Obiect" to only show valid options for the selected "Materie", the helper handles that via `details[materie]`.
        // So simply building from `originalResults` is safe and correct for the UI structure we have,
        // because LeftSidebar uses `details[selectedFilters.materie]` to show objects.

        const newFilters = buildDynamicFilters(originalResults, filterMappings);
        setDynamicFilters(newFilters);

    }, [originalResults, searchParams, filterMappings]);


    // Trigger filter application when deps change
    useEffect(() => {
        applyClientSideFilters();
    }, [applyClientSideFilters]);


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
            setOriginalResults(prev => [...prev, ...results]); // Append to original results
            // setSearchResults will be handled by applyClientSideFilters

            // Note: Since we are doing client side filtering, "offset" logic is tricky.
            // If we are filtering heavily, "loading more" from backend might bring results that get filtered out.
            // But for now, let's assume the backend pagination returns a mix and we filter locally.
            // Ideally, for pure client side filter on large datasets, we'd fetch ALL, but here we paginate.
            // Given the task is "Dynamic Filters from currently displayed results",
            // the filters reflect what we have loaded SO FAR.
            // So if I have loaded 20 items, filters show counts for 20 items.
            // That is acceptable for this iteration.

            setOffset(currentOffset + results.length);
            setHasMore(results.length === 20);
            setStatus(`Au fost găsite ${originalResults.length + results.length} rezultate.`);
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

        // Step 1: Standard Search (or Pro Keyword Search)
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

            setOriginalResults(initialResults); // Store baseline for filtering

            // Build initial filters immediately so UI updates
            const newFilters = buildDynamicFilters(initialResults, filterMappings);
            setDynamicFilters(newFilters);

            // If Pro Keyword is ON, we skip the AI filtering step unless explicitly requested.
            // But now Pro Keyword logic is merged into default, so we treat it as standard.
            // However, AI filtering is usually for when we have many results or complex query.
            // The user logic for AI filtering remains: if PRO account and query > 3 words.

            if (isProEnabled && situatie.trim().split(/\s+/).length > 3) {
                try {
                    setStatus("Analizez contextul juridic cu AI pentru a găsi cea mai relevantă spetă... (poate dura câteva minute)");

                    // Start analysis and get job_id
                    const response = await fetch('/api/settings/analyze-llm-data', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to start AI analysis');
                    }

                    const startResponse = await response.json();

                    if (!startResponse.success || !startResponse.job_id) {
                        throw new Error(startResponse.message || 'Failed to start AI analysis');
                    }

                    const jobId = startResponse.job_id;

                    // Poll for status
                    const pollInterval = 2000; // 2 seconds
                    const maxPolls = 600; // 20 minutes max
                    let pollCount = 0;

                    const pollStatus = async (): Promise<any> => {
                        const statusResponse = await fetch(`/api/settings/analyze-llm-status/${jobId}`);
                        if (!statusResponse.ok) {
                            throw new Error('Failed to check status');
                        }
                        return await statusResponse.json();
                    };

                    // Start polling
                    while (pollCount < maxPolls) {
                        const statusData = await pollStatus();

                        if (statusData.status === 'completed') {
                            // Success! Extract AI-selected IDs and candidates
                            if (statusData.result && statusData.result.success) {
                                const aiSelectedIds = statusData.result.ai_selected_ids || [];
                                const allCandidates = statusData.result.all_candidates || [];
                                const extractedActe = statusData.result.acte_juridice || [];
                                setActeJuridice(extractedActe);

                                if (aiSelectedIds.length > 0) {
                                    // Find AI-selected results from all candidates (preferred) or initial results
                                    const aiSelectedResults = aiSelectedIds
                                        .map((id: number) => {
                                            // Try to find in allCandidates first (contains full list sent to LLM)
                                            const candidate = allCandidates.find((c: any) => c.id === id);
                                            if (candidate) {
                                                // Format candidate to match ResultItem structure (wrap in data)
                                                // Backend returns flat object in allCandidates, but ResultItem expects { id, data: { ... } }
                                                return {
                                                    id: candidate.id,
                                                    data: candidate, // Wrap flat candidate as data
                                                    score: 100, // Assign high score to AI selected
                                                    // Map fields for view
                                                    situatia_de_fapt_full: candidate.situatia_de_fapt,
                                                    argumente_instanta: candidate.argumente_instanta || 'Nu există date',
                                                    text_individualizare: candidate.text_individualizare || 'Nu există date',
                                                    text_doctrina: candidate.text_doctrina || 'Nu există date',
                                                    text_ce_invatam: candidate.text_ce_invatam || 'Nu există date',
                                                    Rezumat_generat_de_AI_Cod: candidate.Rezumat_generat_de_AI_Cod || 'Nu există date'
                                                };
                                            }
                                            // Fallback to initialResults
                                            return initialResults.find((item: any) => item.id === id);
                                        })
                                        .filter(Boolean);

                                    // Find remaining candidates (not selected by AI)
                                    // We should only show remaining candidates if they are in the initial search results
                                    // OR if we want to show all candidates sent to LLM?
                                    // Usually we only show what was in the initial search unless AI picked it.
                                    const candidateIds = allCandidates.map((c: any) => c.id);
                                    const remainingCandidates = initialResults
                                        .filter((item: any) =>
                                            candidateIds.includes(item.id) && !aiSelectedIds.includes(item.id)
                                        )
                                        .sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

                                    // Merge: AI-selected first (with badge), then candidates
                                    const exclusiveDisplay = statusData.result.exclusive_display || false;

                                    let mergedResults;

                                    if (exclusiveDisplay) {
                                        // Network Mode Strict: Show ONLY AI selected results
                                        mergedResults = aiSelectedResults.map((r: any) => ({ ...r, isAISelected: true }));

                                        setStatus(
                                            `${aiSelectedResults.length} ${aiSelectedResults.length === 1 ? 'rezultat relevant identificat' : 'rezultate relevante identificate'} de AI.`
                                        );
                                    } else {
                                        // Standard Mode: Show AI selected + candidates
                                        mergedResults = [
                                            ...aiSelectedResults.map((r: any) => ({ ...r, isAISelected: true })),
                                            ...remainingCandidates.map((r: any) => ({ ...r, isCandidateCase: true }))
                                        ];

                                        setStatus(
                                            `${aiSelectedResults.length} ${aiSelectedResults.length === 1 ? 'rezultat selectat' : 'rezultate selectate'} de AI` +
                                            (remainingCandidates.length > 0 ? `, ${remainingCandidates.length} ${remainingCandidates.length === 1 ? 'candidat' : 'candidați'} analizați` : '')
                                        );
                                    }

                                    // Update original results to match AI result set so filters work on THIS set
                                    setOriginalResults(mergedResults);
                                    // setSearchResults(mergedResults); // Handled by effect? No, we might strictly set it here
                                    // Actually, if we update originalResults, the effect will run and re-apply filters (which are likely empty initially)
                                    // so it should be fine.
                                    setOffset(mergedResults.length);
                                    setHasMore(false);
                                } else {
                                    setOriginalResults([]); // Clear if no AI results
                                    setStatus("AI-ul nu a găsit rezultate relevante.");
                                }
                            } else {
                                setOriginalResults([]);
                                setSearchResults([]); // Also clear visible results
                                setStatus("Eroare la procesarea răspunsului AI.");
                            }
                            break;
                        } else if (statusData.status === 'failed') {
                            throw new Error(statusData.error || 'AI analysis failed');
                        } else if (statusData.status === 'queued') {
                            setStatus(`În coadă pentru analiză AI... (poziția ${statusData.position || '?'})`);
                        } else if (statusData.status === 'processing') {
                            setStatus("AI analizează datele... (așteptați câteva minute)");
                        } else if (statusData.status === 'not_found') {
                            throw new Error('Job not found');
                        }

                        // Wait before next poll
                        await new Promise(resolve => setTimeout(resolve, pollInterval));
                        pollCount++;
                    }

                    if (pollCount >= maxPolls) {
                        throw new Error('AI analysis timeout');
                    }

                } catch (aiError) {
                    console.error("AI Filtering failed:", aiError);
                    setStatus("Filtrarea AI nu a putut fi aplicată. Vă rugăm să încercați din nou sau să dezactivați funcția Pro.");
                    setOriginalResults([]); // Or keep what we had? Ideally keep initial
                    setSearchResults([]);
                }
            } else {
                // Standard search display (Pro disabled OR query too short OR Pro Keyword enabled)
                // setOriginalResults was already set above to initialResults
                // setSearchResults(initialResults); // Handled by effect
                setOffset(initialResults.length);
                setHasMore(initialResults.length === 20);
                setStatus(`Au fost găsite ${initialResults.length} rezultate.`);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
            setStatus(`Eroare la încărcarea rezultatelor: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }

    }, [situatie, searchParams, isProEnabled]);

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
        // Check if it's a company or a legal case
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

    const handleDosarSearch = useCallback(async (numarDosar: string) => {
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

            // Save the portal object info for display
            setDosarSearchInfo({
                obiect: response.obiect_from_portal || '',
                materie: response.materie_from_portal,
                numar: response.numar_dosar
            });

            // Display results
            setOriginalResults(response.results); // Update original source
            // setSearchResults(response.results); // Handled by effect
            setOffset(response.results.length);
            setHasMore(false); // No pagination for dosar search
            setActeJuridice([]); // Clear AI acts

            if (response.results.length > 0) {
                setStatus(`Căutare după număr dosar "${numarDosar}": ${response.match_count} spețe similare găsite (podobire >${response.similarity_threshold}%)`);
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

    const handleSearchByIds = useCallback((results: any[], count: number) => {
        setOriginalResults(results);
        // setSearchResults(results); // Handled by effect
        setOffset(results.length);
        setHasMore(false);
        setStatus(`Căutare după ID-uri: ${count} rezultate găsite.`);
        setActeJuridice([]); // Clear AI-generated legal acts
        setDosarSearchInfo(null); // Clear dosar search info
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <Header
                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onContribuieClick={() => setIsContribuieModalOpen(true)}
            />
            <div className="flex flex-1 overflow-hidden">
                <LeftSidebar
                    filters={dynamicFilters} // Pass dynamic filters here
                    selectedFilters={searchParams}
                    onFilterChange={handleFilterChange}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onContribuieClick={() => setIsContribuieModalOpen(true)}
                    isDesktopOpen={isDesktopSidebarOpen}
                    onDesktopToggle={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                />
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
                    onSearchByIds={handleSearchByIds}
                    onMinimizeSidebar={() => setIsMobileMenuOpen(false)}
                    onDosarSearch={handleDosarSearch}
                    isDosarSearchLoading={isDosarSearchLoading}
                    dosarSearchInfo={dosarSearchInfo}
                />
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
