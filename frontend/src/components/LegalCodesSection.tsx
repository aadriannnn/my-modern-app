import React, { useEffect, useState } from 'react';
import { Loader2, ChevronDown, ChevronUp, Copy, BookOpen } from 'lucide-react';
import type { LegalArticle } from '../types';
import { LAW_TITLES } from '../lib/lawTitles';

interface LegalCodesSectionProps {
    caseData: {
        materie?: string;
        obiect?: string;
        keywords?: string[] | string;
        situatia_de_fapt_full?: string;
        Rezumat_generat_de_AI_Cod?: string;
        fragment_cod?: string;
        legea_aplicabila?: string;
    };
}

const LegalCodesSection: React.FC<LegalCodesSectionProps> = ({ caseData }) => {
    const [articles, setArticles] = useState<LegalArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchRelevantArticles = async () => {
            setLoading(true);
            setError(null);

            try {
                // Prepare request body
                const requestBody = {
                    materie: caseData.materie || '',
                    obiect: caseData.obiect || '',
                    keywords: Array.isArray(caseData.keywords)
                        ? caseData.keywords
                        : (typeof caseData.keywords === 'string' ? caseData.keywords.split(',').map(k => k.trim()) : []),
                    situatia_de_fapt: caseData.situatia_de_fapt_full || '',
                    rezumat_ai: caseData.Rezumat_generat_de_AI_Cod || '',
                    limit: 10
                };

                const response = await fetch('/api/coduri/relevant', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Eroare la încărcarea articolelor');
                }

                const data = await response.json();
                setArticles(data);
            } catch (err) {
                console.error('Error fetching articles:', err);
                setError(err instanceof Error ? err.message : 'Eroare necunoscută');
            } finally {
                setLoading(false);
            }
        };

        fetchRelevantArticles();
    }, [caseData]);

    const toggleArticle = (articleId: string) => {
        setExpandedArticles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(articleId)) {
                newSet.delete(articleId);
            } else {
                newSet.add(articleId);
            }
            return newSet;
        });
    };

    const handleCopyText = async (article: LegalArticle) => {
        try {
            const textToCopy = `${article.titlu}\n\n${article.text}`;
            await navigator.clipboard.writeText(textToCopy);
            setCopiedId(article.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Error copying text:', err);
            alert('Eroare la copierea textului');
        }
    };

    const formatCodeSource = (codSursa: string): string => {
        // 1. Verifică dacă există mapare directă
        if (LAW_TITLES[codSursa]) return LAW_TITLES[codSursa];

        // 2. Normalizează numele tabelelor (ex: legea_302_2004 -> Legea 302/2004)
        if (codSursa.startsWith('legea_')) {
            const parts = codSursa.split('_');
            if (parts.length === 3) {
                const key = `Legea ${parts[1]}/${parts[2]}`;
                if (LAW_TITLES[key]) return LAW_TITLES[key];
            }
        }

        // 3. Fallback pentru coduri standard (ex: cod_civil -> Cod Civil)
        const normalized = codSursa.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return LAW_TITLES[normalized] || normalized;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                <span className="ml-3 text-gray-600">Se încarcă articolele...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 font-medium">Eroare: {error}</p>
                <p className="text-red-500 text-sm mt-2">Vă rugăm să încercați din nou mai târziu.</p>
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Nu s-au găsit articole relevante</p>
                <p className="text-gray-500 text-sm mt-2">
                    Nu există articole de cod care să corespundă acestei spețe.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Secțiune nouă pentru Legea Aplicabilă și Fragment Cod */}
            {(caseData.legea_aplicabila || caseData.fragment_cod) && (
                <div className="bg-white border border-brand-accent/20 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-brand-accent/5 px-5 py-3 border-b border-brand-accent/10 flex flex-wrap items-center gap-3">
                        <h3 className="text-md font-semibold text-brand-dark flex items-center gap-2">
                            <BookOpen size={18} className="text-brand-accent" />
                            Cadru Legal Aplicabil
                        </h3>
                        {caseData.legea_aplicabila && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-accent text-white shadow-sm">
                                {caseData.legea_aplicabila}
                            </span>
                        )}
                    </div>

                    {caseData.fragment_cod && (
                        <div className="p-5">
                            <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-normal bg-gray-50 p-4 rounded-lg border border-gray-200">
                                {caseData.fragment_cod}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Articole Identificate Automat
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        AI Generated
                    </span>
                </div>

                <p className="text-sm text-gray-600">
                    Am găsit {articles.length} {articles.length === 1 ? 'articol' : 'articole'} potrivit{articles.length === 1 ? '' : 'e'} pentru această speță.
                </p>
            </div>

            <div className="space-y-3">
                {articles.map((article) => {
                    const isExpanded = expandedArticles.has(article.id);
                    const isCopied = copiedId === article.id;

                    return (
                        <div
                            key={article.id}
                            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-brand-accent hover:shadow-md transition-all duration-200"
                        >
                            {/* Article Header */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">
                                                {article.numar}
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 whitespace-normal break-words">
                                                {formatCodeSource(article.cod_sursa)}
                                            </span>
                                        </div>
                                        <h4 className="text-base font-semibold text-gray-800 mb-2">
                                            {article.titlu}
                                        </h4>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {article.materie && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-normal text-center">
                                                    {LAW_TITLES[article.materie] || article.materie}
                                                </span>
                                            )}
                                            {article.obiect && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {article.obiect}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <span className="font-medium text-brand-accent">
                                                Relevanță: {(article.relevance_score * 10).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 ml-4">
                                        <button
                                            onClick={() => handleCopyText(article)}
                                            className={`p-2 rounded-lg transition-colors ${isCopied
                                                ? 'bg-green-100 text-green-600'
                                                : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                            title={isCopied ? 'Copiat!' : 'Copiază text'}
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button
                                            onClick={() => toggleArticle(article.id)}
                                            className="p-2 text-brand-accent hover:bg-brand-accent hover:bg-opacity-10 rounded-lg transition-colors"
                                            title={isExpanded ? 'Ascunde' : 'Expandează'}
                                        >
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Article Text Preview */}
                                {!isExpanded && (
                                    <div className="text-sm text-gray-600 line-clamp-2">
                                        {article.text}
                                    </div>
                                )}
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                                    <div>
                                        <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Text</h5>
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                                            {article.text}
                                        </div>
                                    </div>

                                    {article.art_conex && (
                                        <div>
                                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                                Articole conexe
                                            </h5>
                                            <p className="text-sm text-gray-600">{article.art_conex}</p>
                                        </div>
                                    )}

                                    {article.doctrina && (
                                        <div>
                                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                                Doctrină
                                            </h5>
                                            <p className="text-sm text-gray-600 italic">{article.doctrina}</p>
                                        </div>
                                    )}

                                    {article.keywords && (
                                        <div>
                                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                                Cuvinte cheie
                                            </h5>
                                            <p className="text-sm text-gray-600">{article.keywords}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>Notă:</strong> Articolele de cod sunt selectate automat pe baza materiei, obiectului și conținutului speței.
                    Verificați întotdeauna aplicabilitatea articolului la cazul dvs. specific.
                </p>
            </div>
        </div>
    );
};

export default LegalCodesSection;
