import React, { useState, useRef, useCallback } from 'react';
import ResultItem from './ResultItem';
import SelectedFilters from './SelectedFilters';
import { Loader2, Search, Wand2, X, Copy, Check, FileText } from 'lucide-react';
import Advertisement from './Advertisement';
import avocat2 from '../assets/reclama/avocat2.jpg';
import UserJourneyMap from './UserJourneyMap';
import ExampleCaseButton from './ExampleCaseButton';

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
  isProEnabled?: boolean;
  onTogglePro?: (enabled: boolean) => void;
  isProKeywordEnabled?: boolean;
  onToggleProKeyword?: (enabled: boolean) => void;
  acteJuridice?: string[];
}

type ViewType = 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare' | 'text_doctrina' | 'text_ce_invatam' | 'Rezumat_generat_de_AI_Cod';



// Example case text for user education
const EXAMPLE_CASE = "Contestatorii au formulat contestație la executare silită împotriva actelor de executare pornite de un executor judecătoresc la cererea creditorului, bazate pe două contracte de împrumut. Aceștia au solicitat anularea actelor de executare, reducerea cheltuielilor de executare și anularea titlurilor executorii (contractele de împrumut), argumentând că prețurile din contracte erau neserioase, sumele împrumutate nu au fost primite integral și că actele ascundeau o operațiune de cămătărie.";

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
  onMinimizeSidebar,
  isProEnabled = false,
  onTogglePro,
  isProKeywordEnabled = false,
  onToggleProKeyword,
  acteJuridice = []
}) => {
  const [activeView, setActiveView] = useState<ViewType>('situatia_de_fapt_full');
  const observer = useRef<IntersectionObserver | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  // Generation state
  const [selectedAct, setSelectedAct] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleGenerateDocument = async () => {
    if (!selectedAct) return;

    setIsGenerating(true);
    try {
      // Construct relevant cases text from the results
      // We take the top 10 results as context
      const relevantCasesText = results.slice(0, 10).map((c, idx) => `
CAZ #${idx + 1} (ID: ${c.id}):
TITLU: ${c.denumire || 'Fără titlu'}
SITUATIA DE FAPT: ${c.situatia_de_fapt_full || c.situatia_de_fapt || c.data?.text_situatia_de_fapt || c.data?.situatia_de_fapt || c.data?.situatie || ''}
SOLUTIE/CONSIDERENTE: ${c.data?.considerente_speta || c.argumente_instanta || c.data?.argumente_instanta || c.data?.solutia || ''}
--------------------------------------------------
`).join('\n');

      // Step 1: Start document generation and get job_id
      const response = await fetch('/api/settings/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tip_act: selectedAct,
          situatia_de_fapt: situatie,
          relevant_cases_text: relevantCasesText
        }),
      });

      const data = await response.json();

      if (!data.success || !data.job_id) {
        alert(`Eroare: ${data.message || 'Nu s-a putut porni generarea'}`);
        return;
      }

      const jobId = data.job_id;
      console.log('Document generation started with job_id:', jobId);

      // Step 2: Poll for status
      const pollInterval = 2000; // 2 seconds
      const maxPolls = 600; // 20 minutes max (600 * 2 seconds)
      let pollCount = 0;

      const checkStatus = async (): Promise<boolean> => {
        try {
          const statusResponse = await fetch(`/api/settings/generate-document-status/${jobId}`);
          const statusData = await statusResponse.json();

          console.log('Document generation status:', statusData.status);

          if (statusData.status === 'completed') {
            if (statusData.result?.success && statusData.result?.generated_document) {
              setGeneratedDoc(statusData.result.generated_document);
              setShowDocModal(true);
              return true; // Done
            } else {
              alert(`Eroare: ${statusData.result?.error || statusData.result?.message || 'Document generat incomplet'}`);
              return true; // Error, stop polling
            }
          } else if (statusData.status === 'failed') {
            alert(`Eroare la generare: ${statusData.error || 'Procesare eșuată'}`);
            return true; // Error, stop polling
          } else if (statusData.status === 'not_found') {
            alert('Job-ul de generare nu a fost găsit.');
            return true; // Error, stop polling
          }

          // Still processing or queued
          return false; // Continue polling
        } catch (error) {
          console.error('Error checking document generation status:', error);
          // Continue polling on error (might be temporary network issue)
          return false;
        }
      };

      // Polling loop
      while (pollCount < maxPolls) {
        const isDone = await checkStatus();
        if (isDone) break;

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        pollCount++;
      }

      if (pollCount >= maxPolls) {
        alert('Timeout: generarea documentului a durat prea mult.');
      }

    } catch (error) {
      console.error('Error generating document:', error);
      alert('A apărut o eroare la generarea documentului.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyDoc = async () => {
    if (generatedDoc) {
      try {
        await navigator.clipboard.writeText(generatedDoc);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };


  // Handle example case fill with typing animation
  const handleExampleFill = useCallback(() => {
    const text = EXAMPLE_CASE;
    let index = 0;

    // Clear current text
    onSituatieChange('');

    // Typing animation
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        onSituatieChange(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(typingInterval);
        // Smooth scroll to search button after typing completes
        setTimeout(() => {
          searchButtonRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }, 300);
      }
    }, 10); // Fast typing speed for better UX

    return () => clearInterval(typingInterval);
  }, [onSituatieChange])



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
              isAISelected={result.isAISelected || false}
              isCandidateCase={result.isCandidateCase || false}
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
            <ExampleCaseButton onExampleClick={handleExampleFill} />
            <textarea
              value={situatie}
              onChange={(e) => onSituatieChange(e.target.value)}
              placeholder="Introduceți situația de fapt sau cuvinte cheie relevante. Utilizați filtrele din meniu pentru a rafina rezultatele..."
              rows={3}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-brand-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent shadow-sm transition-all duration-200 resize-y min-h-[80px]"
            />
            <div className="absolute left-4 top-6 transform -translate-y-1/2 pointer-events-none">
              <Search size={22} className="text-gray-400 group-focus-within:text-brand-accent transition-colors duration-200" />
            </div>
          </div>

          {/* Pro Feature Checkbox */}
          {onTogglePro && (
            <div className="mt-3 flex flex-col gap-2 mb-2">
              <label className="flex items-center cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isProEnabled}
                    onChange={(e) => onTogglePro(e.target.checked)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${isProEnabled ? 'bg-brand-accent' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${isProEnabled ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-3 text-sm font-medium text-brand-text flex items-center">
                  Funcție Pro (Filtrare AI)
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full uppercase tracking-wider shadow-sm">
                    BETA
                  </span>
                </div>
              </label>

              {onToggleProKeyword && (
                <label className="flex items-center cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isProKeywordEnabled}
                      onChange={(e) => onToggleProKeyword && onToggleProKeyword(e.target.checked)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${isProKeywordEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${isProKeywordEnabled ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-brand-text flex items-center">
                    Căutare Pro (Cuvinte cheie în considerente)
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full uppercase tracking-wider shadow-sm">
                      NEW
                    </span>
                  </div>
                </label>
              )}
            </div>
          )}

          <button
            ref={searchButtonRef}
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

        {acteJuridice && acteJuridice.length > 0 && (
          <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-brand-accent/20">
            <label className="block text-sm font-bold text-brand-text mb-2 flex items-center">
              <span className="w-2 h-2 bg-brand-accent rounded-full mr-2"></span>
              Acte Juridice Identificate de AI
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  value={selectedAct}
                  onChange={(e) => setSelectedAct(e.target.value)}
                  className="block w-full pl-4 pr-10 py-3 text-base border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent sm:text-sm rounded-lg bg-gray-50 text-brand-text appearance-none cursor-pointer hover:bg-white transition-colors duration-200"
                >
                  <option value="" disabled>Selectați un act juridic relevant...</option>
                  {acteJuridice.map((act, idx) => (
                    <option key={idx} value={act}>{act}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <button
                onClick={handleGenerateDocument}
                disabled={!selectedAct || isGenerating}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 shadow-sm whitespace-nowrap ${!selectedAct || isGenerating
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-accent to-purple-600 hover:shadow-md hover:-translate-y-0.5'
                  }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Se generează...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Generează Act Juridic</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              Selectați un tip de act și apăsați "Generează" pentru a crea un proiect personalizat bazat pe spețele de mai jos.
            </p>
          </div>
        )}

        {/* Generated Document Modal */}
        {showDocModal && generatedDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Act Juridic Generat</h3>
                    <p className="text-sm text-gray-500">{selectedAct}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[500px] font-serif text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {generatedDoc}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setShowDocModal(false)}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Închide
                </button>
                <button
                  onClick={handleCopyDoc}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-accent-dark transition-colors shadow-sm"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copiat!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiază Textul
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}


        {renderContent()}
      </div>
    </main>
  );
};

export default MainContent;
