import React, { useState, useRef, useCallback } from 'react';
import ResultItem from './ResultItem';
import SelectedFilters from './SelectedFilters';
import { Loader2, Search, Sparkles, Filter, FolderOpen, Share2, Eye, Database } from 'lucide-react';
import Advertisement from './Advertisement';
import avocat2 from '../assets/reclama/avocat2.jpg';

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
}

type ViewType = 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare' | 'text_doctrina' | 'text_ce_invatam' | 'Rezumat_generat_de_AI_Cod';

// Features Section Component
const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Sparkles size={28} className="text-purple-400" />,
      title: "Căutare Avansată cu AI",
      description: "Motor de căutare semantic bazat pe inteligență artificială care înțelege contextul juridic și găsește cazuri relevante chiar și pentru interogări complexe.",
      gradient: "from-purple-500/20 via-pink-500/20 to-red-500/20",
      iconBg: "bg-gradient-to-br from-purple-500 to-pink-500"
    },
    {
      icon: <Filter size={28} className="text-blue-400" />,
      title: "Filtrare Profesională",
      description: "Sistem avansat de filtrare pe multiple dimensiuni: materie juridică, obiect, tip speță și părți implicate pentru rezultate precise.",
      gradient: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500"
    },
    {
      icon: <FolderOpen size={28} className="text-amber-400" />,
      title: "Dosare Personale",
      description: "Organizează și salvează până la 10 cazuri juridice în dosarul personal pentru acces rapid. Datele sunt păstrate pe toată sesiunea de lucru.",
      gradient: "from-amber-500/20 via-orange-500/20 to-red-500/20",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500"
    },
    {
      icon: <Share2 size={28} className="text-green-400" />,
      title: "Export & Partajare",
      description: "Exportă cazuri în format PDF profesional, printează rapid sau partajează prin email și WhatsApp cu clienți și colegi.",
      gradient: "from-green-500/20 via-emerald-500/20 to-teal-500/20",
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-500"
    },
    {
      icon: <Eye size={28} className="text-indigo-400" />,
      title: "Vizualizări Multiple",
      description: "Accesează informații structurate: situații de fapt, argumente instanță, individualizare, doctrină, rezumate AI și lecții învățate.",
      gradient: "from-indigo-500/20 via-purple-500/20 to-pink-500/20",
      iconBg: "bg-gradient-to-br from-indigo-500 to-purple-500"
    },
    {
      icon: <Database size={28} className="text-rose-400" />,
      title: "Bază de Date Completă",
      description: "Acces la o colecție comprehensivă de spețe juridice cu metadata detaliată: instanță, părți, sursă și clasificare completă.",
      gradient: "from-rose-500/20 via-pink-500/20 to-fuchsia-500/20",
      iconBg: "bg-gradient-to-br from-rose-500 to-pink-500"
    }
  ];

  return (
    <div className="mb-8 mt-6">
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-primary via-brand-accent to-purple-600 bg-clip-text text-transparent mb-3">
          Funcționalități Premium
        </h2>
        <p className="text-brand-text-secondary text-base md:text-lg max-w-3xl mx-auto">
          Platformă profesională de cercetare juridică cu tehnologie de vârf pentru avocați, jurisconsulți și studenți
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`group relative bg-gradient-to-br ${feature.gradient} backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
          >
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-md rounded-2xl"></div>

            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className={`${feature.iconBg} w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-brand-dark mb-3 group-hover:text-brand-accent transition-colors duration-200">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-brand-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>

            {/* Decorative gradient blob */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-brand-accent/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          </div>
        ))}
      </div>

      {/* Bottom decoration */}
      <div className="mt-8 flex justify-center">
        <div className="h-1 w-32 bg-gradient-to-r from-transparent via-brand-accent to-transparent rounded-full"></div>
      </div>
    </div>
  );
};

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
  onSearch
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
            onClick={onSearch}
            className="mt-3 w-full bg-brand-accent text-white px-6 py-3 rounded-xl flex items-center justify-center font-bold text-lg hover:bg-brand-accent-dark hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 shadow-md"
          >
            <Search size={24} className="mr-2" />
            Căutare Avansată
          </button>
        </div>

        {/* Features Section - Show when no search has been performed */}
        {results.length === 0 && !isLoading && <FeaturesSection />}

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-1 mb-4 flex-wrap">
            <div className="flex justify-center items-center">
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
