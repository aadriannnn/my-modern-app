import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

const SearchFilterBar: React.FC = () => {
    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
            {/* Search Input */}
            <div className="relative flex-grow group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-brand-gold">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-brand-gold" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold sm:text-sm shadow-sm hover:shadow transition-all duration-300"
                    placeholder="Caută în articole și resurse..."
                />
            </div>

            {/* Category Dropdown (Mockup) */}
            <div className="relative min-w-[240px]">
                <button className="w-full flex items-center justify-between px-5 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm text-sm text-brand-dark hover:border-brand-gold/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/20 hover:shadow transition-all duration-300 group">
                    <span className="text-gray-600 font-medium group-hover:text-brand-dark transition-colors">Toate categoriile</span>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-brand-gold transition-colors" />
                </button>
            </div>
        </div>
    );
};

export default SearchFilterBar;
