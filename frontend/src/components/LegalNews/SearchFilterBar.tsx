import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SearchFilterBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedCategory: string | null;
    onCategoryChange: (category: string | null) => void;
    categories: string[];
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    categories
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
            {/* Search Input */}
            <div className="relative flex-grow group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-brand-gold">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-brand-gold" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold sm:text-sm shadow-sm hover:shadow transition-all duration-300"
                    placeholder="Caută în articole și resurse..."
                />
            </div>

            {/* Category Dropdown */}
            <div className="relative min-w-[240px]" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm text-sm text-brand-dark hover:border-brand-gold/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/20 hover:shadow transition-all duration-300 group ${isOpen ? 'ring-2 ring-brand-gold/20 border-brand-gold' : ''}`}
                >
                    <span className={`font-medium transition-colors ${selectedCategory ? 'text-brand-dark' : 'text-gray-600'}`}>
                        {selectedCategory || "Toate categoriile"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 group-hover:text-brand-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 max-h-60 overflow-y-auto">
                        <button
                            onClick={() => {
                                onCategoryChange(null);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${!selectedCategory ? 'bg-gray-50 text-brand-gold font-medium' : 'text-gray-700'}`}
                        >
                            Toate categoriile
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => {
                                    onCategoryChange(category);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedCategory === category ? 'bg-gray-50 text-brand-gold font-medium' : 'text-gray-700'}`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchFilterBar;
