import React, { useState, useRef, useCallback } from 'react';
import ResultItem from './ResultItem';
import SelectedFilters from './SelectedFilters';
import { Loader2 } from 'lucide-react';
import Advertisement from './Advertisement';
import avocat2 from '../assets/reclama/avocat2.jpg';

// ... (interfețele rămân la fel)

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
}) => {
  const [activeView, setActiveView] = useState<ViewType>('situatia_de_fapt_full');
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
        <div className="bg-white rounded-lg shadow p-1 mb-4 flex-wrap">
          <div className="flex justify-center items-center">
            {viewButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${
                  activeView === key
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-brand-text-secondary hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
