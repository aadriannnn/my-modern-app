import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { searchByIdsPaginated } from '../lib/api';
import CaseDetailModal from './CaseDetailModal';

interface BibliographySectionProps {
    caseIds: (number | string)[];
    totalCases: number;
}

const BibliographySection: React.FC<BibliographySectionProps> = ({ caseIds, totalCases }) => {
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedCase, setSelectedCase] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const PAGE_SIZE = 20;

    const fetchCases = async (pageToFetch: number, reset = false) => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            // Determine IDs to fetch for this page
            // We use the full list of IDs (caseIds) and slice it client-side
            // OR if the API supported fetching by page from a session, we'd do that.
            // But here we have the list of IDs, so we paginate the ID list itself
            // and ask the API for those specific IDs.

            const startIdx = (pageToFetch - 1) * PAGE_SIZE;
            const endIdx = startIdx + PAGE_SIZE;
            const idsForPage = caseIds.slice(startIdx, endIdx);

            if (idsForPage.length === 0) {
                setHasMore(false);
                setLoading(false);
                return;
            }

            // The API endpoint /by-ids expects a list of IDs.
            // We can just send the slice.
            // Note: searchByIdsPaginated logic in api.ts sends ids + page/size parameters.
            // But if we slice here, we should probably just use searchByIds or
            // use searchByIdsPaginated but pass ONLY the IDs we want?
            // Actually, the backend `search_by_ids` takes a list of IDs and applies pagination TO THAT LIST.
            // So if we pass ALL IDs every time, the URL might be too long.

            // BETTER APPROACH:
            // We paginate client-side by slicing the `caseIds` array,
            // then request only those specific 20 IDs from the backend.
            // We don't need `searchByIdsPaginated` in this specific logic if we slice locally,
            // OR we can pass all IDs to `searchByIdsPaginated` and let backend slice.
            // BUT passing 1000 IDs in URL query params will fail (URL length limit).

            // So: Slice locally, fetch specific IDs.

            const fetchedCases = await searchByIdsPaginated(idsForPage, 1, 100); // Ask for all of them (page 1 of this slice)

            if (reset) {
                setCases(fetchedCases);
            } else {
                setCases(prev => [...prev, ...fetchedCases]);
            }

            if (endIdx >= caseIds.length) {
                setHasMore(false);
            }

        } catch (err) {
            console.error("Failed to load bibliography:", err);
            setError("Nu s-au putut încărca detaliile cazurilor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial load
        setCases([]);
        setPage(1);
        setHasMore(true);
        if (caseIds.length > 0) {
             fetchCases(1, true);
        } else {
            setHasMore(false);
        }
    }, [caseIds]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchCases(nextPage);
    };

    const handleCaseClick = (c: any) => {
        // Map backend structure to what CaseDetailModal expects
        // It expects { id, data: { ... } } or just the object if it has id?
        // Let's check ResultItem or similar.
        // Usually `data` field contains the JSON content.
        setSelectedCase(c);
    };

    return (
        <div className="mt-8 border-t border-gray-200 pt-8">
            <div className="flex items-center gap-2 mb-6">
                <BookOpen className="text-brand-accent" size={24} />
                <h3 className="text-xl font-bold text-gray-900">
                    Bibliografie
                    <span className="ml-2 text-sm font-normal text-gray-500">
                        ({totalCases > 0 ? totalCases : caseIds.length} spețe analizate)
                    </span>
                </h3>
            </div>

            {error && (
                <div className="text-red-500 mb-4 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cases.map((c, idx) => {
                    const info = c.data || {};
                    const titlu = info.denumire || c.titlu || `Speța #${c.id}`;
                    const materie = info.materie || "N/A";
                    const obiect = info.obiect || "N/A";

                    return (
                        <div
                            key={`${c.id}-${idx}`}
                            onClick={() => handleCaseClick(c)}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-brand-accent transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-brand-dark bg-gray-100 px-2 py-1 rounded">
                                    #{c.id}
                                </span>
                                <ExternalLink size={14} className="text-gray-400 group-hover:text-brand-accent" />
                            </div>
                            <h4 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2" title={titlu}>
                                {titlu}
                            </h4>
                            <div className="flex flex-col gap-1 text-xs text-gray-500">
                                <div className="flex justify-between">
                                    <span>Materie:</span>
                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{materie}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Obiect:</span>
                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{obiect}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin text-brand-accent" />
                </div>
            )}

            {!loading && hasMore && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={handleLoadMore}
                        className="px-6 py-2 bg-gray-50 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                        Arată mai multe <ChevronDown size={16} />
                    </button>
                </div>
            )}

            <CaseDetailModal
                isOpen={!!selectedCase}
                onClose={() => setSelectedCase(null)}
                result={selectedCase}
            />
        </div>
    );
};

export default BibliographySection;
