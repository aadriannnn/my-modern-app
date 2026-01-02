import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, ChevronRight, ArrowRight } from 'lucide-react';

export interface SearchResultItem {
    id: string;
    titlu?: string; // coduri
    titlu_model?: string; // modele
    numar?: string; // coduri
    text?: string; // coduri
    text_model?: string; // modele
    relevance_score: number;
    cod_sursa?: string; // coduri
    sursa_model?: string; // modele
    materie?: string;
    materie_model?: string;
}

interface LegislatieResultsProps {
    results: SearchResultItem[];
    type: 'coduri' | 'modele';
    loading: boolean;
}

const LegislatieResults: React.FC<LegislatieResultsProps> = ({ results, type, loading }) => {
    if (loading) {
        return (
            <div className="space-y-4 max-w-4xl mx-auto">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse">
                        <div className="h-6 bg-slate-100 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
                        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <SearchIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Nu am găsit rezultate</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                    Încearcă să folosești alți termeni de căutare sau verifică dacă ai selectat filtrele corecte.
                </p>
            </div>
        );
    }

    const formatTableName = (name?: string) => {
        if (!name) return '';
        return name
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            {results.map((item) => {
                const title = type === 'coduri'
                    ? `${item.numar ? `Art. ${item.numar} - ` : ''}${item.titlu}`
                    : item.titlu_model;

                const previewText = type === 'coduri' ? item.text : item.text_model; // Note: text_model is usually not sent in list, might be empty
                const source = type === 'coduri' ? formatTableName(item.cod_sursa) : (item.sursa_model || 'Model Document');

                // Link construction needs to be carefully handled based on your routing
                // Assuming /legislatie/cod_name/article_hash or /legislatie/modele/model_hash
                const linkTo = type === 'coduri'
                    ? `/legislatie/${item.cod_sursa}/${item.id}`
                    : `/legislatie/modele/${item.id}`; // Not standard, maybe need a modal or separate route

                return (
                    <Link
                        to={linkTo}
                        key={item.id}
                        className="block bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type === 'coduri' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                        {source}
                                    </span>
                                    {(item.materie || item.materie_model) && (
                                        <span className="text-xs text-slate-500 border-l border-slate-200 pl-2">
                                            {item.materie || item.materie_model}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                                    {title}
                                </h3>

                                {previewText && (
                                    <p className="text-slate-600 line-clamp-2 text-sm mb-4 font-serif leading-relaxed">
                                        {previewText}
                                    </p>
                                )}

                                <div className="flex items-center text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                                    Vezi detalii <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

export default LegislatieResults;
