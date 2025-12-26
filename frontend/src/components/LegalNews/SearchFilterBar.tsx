import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

const SearchFilterBar: React.FC = () => {
    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Search Input */}
            <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                    placeholder="Caută articole..."
                />
            </div>

            {/* Category Dropdown (Mockup) */}
            <div className="relative min-w-[200px]">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <span className="text-slate-500">Filtrează după categorie...</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
            </div>
        </div>
    );
};

export default SearchFilterBar;
