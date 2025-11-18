import React, { useCallback, useRef, useState } from 'react';
import ResultItem from './ResultItem';
import { Loader2, Search } from 'lucide-react';
import type { Obiect, Materie, Filters as FilterTypes } from '../types';

interface MainContentProps {
  results: any[];
  status: string;
  isLoading: boolean;
  onViewCase: (caseData: any) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
}

const MainContent: React.FC<MainContentProps> = ({
  results,
  status,
  isLoading,
  onViewCase,
  onLoadMore,
  hasMore,
  searchQuery,
  onSearchQueryChange,
  onSearch,
}) => {
  const observer = useRef<IntersectionObserver>();
  const lastResultElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        onLoadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, onLoadMore]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSearch();
    }
  };

  const renderContent = () => {
    if (isLoading && results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <Loader2 className="animate-spin h-12 w-12 text-brand-gold" />
          <p className="text-text-secondary mt-4">{status}</p>
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="text-center py-10 bg-surface rounded-lg shadow-soft">
          <h3 className="text-xl font-semibold text-text-primary">Niciun rezultat</h3>
          <p className="text-text-secondary mt-2 max-w-md mx-auto">{status}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {results.map((result, index) => (
          <div ref={results.length === index + 1 ? lastResultElementRef : null} key={`${result.id}-${index}`}>
            <ResultItem
              result={result}
              onViewCase={() => onViewCase(result)}
            />
          </div>
        ))}
        {isLoading && (
          <div className="text-center py-6">
             <Loader2 className="animate-spin h-8 w-8 text-brand-gold mx-auto" />
          </div>
        )}
        {!hasMore && results.length > 0 && (
          <div className="text-center py-6 border-t border-border-color mt-6">
            <p className="text-text-secondary text-sm">Ați ajuns la sfârșitul listei.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="flex-1 bg-background overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar and Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Căutare de jurisprudență</h1>
          <p className="text-text-secondary text-lg">Introduceți un termen pentru a începe căutarea</p>
          <div className="mt-6 max-w-3xl relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Introduceți situația de fapt, cuvinte cheie..."
              className="w-full pl-12 pr-4 py-3 border border-border-color rounded-lg bg-surface text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-gold shadow-soft"
              data-testid="search-input"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Search size={20} className="text-text-secondary" />
            </div>
            <button
              onClick={onSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-brand-gold text-white px-5 py-1.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
              data-testid="search-button"
            >
              Caută
            </button>
          </div>
        </div>

        {/* Status and Results */}
        <div className="bg-surface p-4 rounded-lg shadow-soft mb-6">
          <p className="text-sm text-text-secondary">{status}</p>
        </div>

        {renderContent()}
      </div>
    </main>
  );
};

export default MainContent;
