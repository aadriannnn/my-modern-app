import React, { useState, useEffect } from 'react';
import { Search, Book, FileText, Filter, ChevronDown } from 'lucide-react';

interface LegislatieSearchProps {
    onSearch: (params: SearchParams) => void;
    activeTab: 'coduri' | 'modele';
    onTabChange: (tab: 'coduri' | 'modele') => void;
}

export interface SearchParams {
    text_query: string;
    table_name?: string;
    article_number?: string;
    materie?: string;
    obiect?: string;
}

const LegislatieSearch: React.FC<LegislatieSearchProps> = ({ onSearch, activeTab, onTabChange }) => {
    const [textQuery, setTextQuery] = useState('');
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [articleNumber, setArticleNumber] = useState('');
    const [availableTables, setAvailableTables] = useState<string[]>([]);
    // const [loadingTables, setLoadingTables] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Common search terms as suggestions
    const suggestions = activeTab === 'coduri'
        ? ['Proprietate', 'Divorț', 'Vânzare', 'Moștenire', 'Prescripție']
        : ['Cerere chemare în judecată', 'Plângere penală', 'Contract', 'Notificare'];

    useEffect(() => {
        if (activeTab === 'coduri') {
            // setLoadingTables(true);
            fetch('/api/coduri/tables')
                .then(res => res.json())
                .then(data => {
                    if (data.tables) {
                        setAvailableTables(data.tables);
                    }
                })
                .catch(console.error);
            // .finally(() => setLoadingTables(false));
        }
    }, [activeTab]);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        onSearch({
            text_query: textQuery,
            table_name: selectedTable || undefined,
            article_number: articleNumber || undefined
        });
    };

    // Format table name for display (e.g., "cod_civil" -> "Cod Civil")
    const formatTableName = (name: string) => {
        return name
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex justify-center mb-8">
                <div className="bg-slate-100 p-1 rounded-xl inline-flex shadow-inner">
                    <button
                        onClick={() => onTabChange('coduri')}
                        className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'coduri'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Book className="w-4 h-4 mr-2" />
                        Coduri și Legi
                    </button>
                    <button
                        onClick={() => onTabChange('modele')}
                        className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'modele'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Modele și Formulare
                    </button>
                </div>
            </div>

            {/* Search Box */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={textQuery}
                            onChange={(e) => setTextQuery(e.target.value)}
                            placeholder={activeTab === 'coduri' ? "Caută article, legi sau cuvinte cheie..." : "Caută modele de documente..."}
                            className="w-full pl-5 pr-14 py-4 text-lg bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2 bottom-2 aspect-square bg-slate-900 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center p-2"
                        >
                            <Search className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Advanced Filters Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((sug) => (
                                <button
                                    key={sug}
                                    type="button"
                                    onClick={() => {
                                        setTextQuery(sug);
                                        // Optional: auto trigger search?
                                        // onSearch({ text_query: sug });
                                    }}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full transition-colors"
                                >
                                    {sug}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center text-sm font-medium ${showFilters ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <Filter className="w-4 h-4 mr-1" />
                            Filtre avansate
                            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Filters Area */}
                    {showFilters && (
                        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            {activeTab === 'coduri' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                                            Alege Codul / Legea
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedTable}
                                                onChange={(e) => setSelectedTable(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 appearance-none"
                                            >
                                                <option value="">Toate codurile</option>
                                                {availableTables.map(table => (
                                                    <option key={table} value={table}>
                                                        {formatTableName(table)}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                                            Număr Articol
                                        </label>
                                        <input
                                            type="text"
                                            value={articleNumber}
                                            onChange={(e) => setArticleNumber(e.target.value)}
                                            placeholder="ex. 12 or 44"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'modele' && (
                                <div className="md:col-span-2">
                                    <p className="text-sm text-slate-500 italic">
                                        Pentru modele, căutarea semantică funcționează automat. Introdu o scurtă descriere a situației sau numele documentului.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default LegislatieSearch;
