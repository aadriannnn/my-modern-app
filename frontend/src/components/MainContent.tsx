import React, { useState, useRef, useCallback } from 'react';
import ResultItem from './ResultItem';
import SelectedFilters from './SelectedFilters';
import { Loader2, Search } from 'lucide-react';
import Advertisement from './Advertisement';
import avocat2 from '../assets/reclama/avocat2.jpg';
import UserJourneyMap from './UserJourneyMap';

interface MainContentProps {
  results: any[];
  status: string;
  isLoading: boolean;
  onViewCase: (caseData: any) => void;
  searchParams: {
    materie?: string;
    obiect?: string[];
    tip_speta?: string[];
    parte?: string[];
  };
  onRemoveFilter: (filterType: string, value: string) => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  situatie: string;
  onSituatieChange: (value: string) => void;
  onSearch: () => void;
  onMinimizeSidebar?: () => void;
}

type ViewType = 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare' | 'text_doctrina' | 'text_ce_invatam' | 'Rezumat_generat_de_AI_Cod';



const MainContent: React.FC<MainContentProps> = ({
  results,
  status,
  isLoading,
  onViewCase,
  searchParams,
  onRemoveFilter,
  onClearFilters,
  onLoadMore,
  hasMore,
  situatie,
  onSituatieChange,
  onSearch,
  onMinimizeSidebar
}) => {
  const [activeView, setActiveView] = useState<ViewType>('situatia_de_fapt_full');
  const observer = useRef<IntersectionObserver | null>(null)



  const lastResultElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        onLoadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, onLoadMore]);

  const viewButtons: { key: ViewType; label: string }[] = [
    { key: 'situatia_de_fapt_full', label: 'Situație de fapt' },
    { key: 'argumente_instanta', label: 'Argumente' },
    { key: 'text_individualizare', label: 'Individualizare' },
    { key: 'text_doctrina', label: 'Doctrină' },
    { key: 'text_ce_invatam', label: 'Ce învățăm' },
    { key: 'Rezumat_generat_de_AI_Cod', label: 'Rezumat AI' },
  ];

  const renderContent = () => {
    if (isLoading && results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <Loader2 className="animate-spin h-12 w-12 text-brand-accent" />
          <p className="text-brand-text-secondary mt-4">{status}</p>
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-brand-text-secondary mb-6">{status}</p>
          <div className="max-w-md mx-auto">
            <Advertisement imageSrc={avocat2} altText="Reclamă avocat 2" />
          </div>
        </div>
      );
    }

    // Filtrarea rezultatelor goale se face direct in ResultItem
    return (
      <div className="space-y-4">
        {results.map((result, index) => (
          <div ref={results.length === index + 1 ? lastResultElementRef : null} key={`${result.id}-${index}`}>
            <ResultItem
              result={result}
              activeView={activeView}
              onViewCase={() => onViewCase(result)}
            />
          </div>
        ))}
        {isLoading && (
          <div className="text-center py-6">
            <Loader2 className="animate-spin h-8 w-8 text-brand-accent mx-auto" />
          </div>
        )}
        {!hasMore && results.length > 0 && (
          <div className="text-center py-6">
            <p className="text-brand-text-secondary text-sm">Ați ajuns la sfârșitul listei.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="flex-1 p-4 md:p-6 bg-brand-light overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative group">
            <textarea
              value={situatie}
              onChange={(e) => onSituatieChange(e.target.value)}
              placeholder="Introduceți situația de fapt, cuvinte cheie sau articole de lege..."
              rows={3}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-brand-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent shadow-sm transition-all duration-200 resize-y min-h-[80px]"
            />
            <div className="absolute left-4 top-6 transform -translate-y-1/2 pointer-events-none">
              <Search size={22} className="text-gray-400 group-focus-within:text-brand-accent transition-colors duration-200" />
            </div>
          </div>
          <button
            onClick={() => {
              onSearch();
              onMinimizeSidebar?.();
            }}
            className="mt-3 w-full bg-brand-accent text-white px-6 py-3 rounded-xl flex items-center justify-center font-bold text-lg hover:bg-brand-accent-dark hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 shadow-md"
          >
            <Search size={24} className="mr-2" />
            Căutare Avansată
          </button>
        </div>

        {/* Features Section & User Journey - Show when no search has been performed */}
        {results.length === 0 && !isLoading && (
          <>

            <UserJourneyMap />
          </>
        )}

        {results.length > 0 && (
          <>
            {/* Mobile View - Vertical Stack */}
            <div className="md:hidden mb-4">
              <div className="bg-gradient-to-br from-brand-accent/5 to-purple-500/5 rounded-xl p-3 border border-brand-accent/20">
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wide">
                    Ordonare după:
                  </p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></div>
                    <span className="text-xs text-brand-accent font-medium">
                      {viewButtons.find(v => v.key === activeView)?.label}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {viewButtons.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveView(key)}
                      className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-between group ${activeView === key
                        ? 'bg-gradient-to-r from-brand-accent to-brand-accent-dark text-white shadow-md scale-[1.02]'
                        : 'bg-white text-brand-text-secondary hover:bg-brand-accent/10 hover:shadow-sm border border-gray-200/50'
                        }`}
                    >
                      <span className="flex-1 text-left">{label}</span>
                      {activeView === key && (
                        <svg
                          className="w-4 h-4 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {activeView !== key && (
                        <svg
                          className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-brand-text-secondary/70 mt-2 px-1 italic">
                  Selectează un criteriu pentru a reordona rezultatele
                </p>
              </div>
            </div>

            {/* Desktop View - Horizontal Layout */}
            <div className="hidden md:block mb-4">
              <div className="bg-white rounded-lg shadow p-1">
                <div className="flex justify-center items-center flex-wrap gap-1">
                  {viewButtons.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveView(key)}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeView === key
                        ? 'bg-brand-dark text-white shadow-sm'
                        : 'text-brand-text-secondary hover:bg-gray-100'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <SelectedFilters
          filters={searchParams}
          onRemoveFilter={onRemoveFilter}
          onClearFilters={onClearFilters}
        />

        {renderContent()}
      </div>
    </main>
  );
};

export default MainContent;
