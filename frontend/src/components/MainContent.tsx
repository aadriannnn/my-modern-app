import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResultItem from './ResultItem';
import SelectedFilters from './SelectedFilters';
import CompanyCard from './CompanyCard';
import type { CompanyResult } from '../types';

import { Loader2, Search, Wand2, X, FileText, Check, Copy } from 'lucide-react';
import Advertisement from './Advertisement';
import avocat2 from '../assets/reclama/avocat2.jpg';
import { useAuth } from '../context/AuthContext';
import { SearchBar } from './SearchBar';

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

  acteJuridice?: string[];
  onDosarSearch?: (numarDosar: string) => void;
  isDosarSearchLoading?: boolean;
  dosarSearchInfo?: { obiect: string; numar: string; materie?: string | null } | null;
}

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

  acteJuridice = [],
  onDosarSearch,
  isDosarSearchLoading = false,
  dosarSearchInfo
}) => {
  const [activeView, setActiveView] = useState<ViewType>('situatia_de_fapt_full');
  const observer = useRef<IntersectionObserver | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generation state
  const [selectedAct, setSelectedAct] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<any | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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
        let plainText = '';

        // Helper to check if it's the classic format
        const isClassic = generatedDoc.titlu_document || generatedDoc.sectiuni || generatedDoc.parti_contractante;

        if (isClassic) {
          // Classic format handling
          // Add title
          if (generatedDoc.titlu_document || generatedDoc.titlu_act || generatedDoc.titlu) {
            plainText += (generatedDoc.titlu_document || generatedDoc.titlu_act || generatedDoc.titlu).toUpperCase() + '\n\n';
          }

          // Add sections
          const sections = generatedDoc.sectiuni ||
            generatedDoc.parti_contractante ||
            generatedDoc.continut ||
            generatedDoc.clauze ||
            (Array.isArray(generatedDoc) ? generatedDoc : []);

          if (Array.isArray(sections)) {
            sections.forEach((sectiune: any) => {
              // Add section title if exists
              if (sectiune.titlu_sectiune || sectiune.nume || sectiune.calitate) {
                plainText += (sectiune.titlu_sectiune || sectiune.nume || sectiune.calitate).toUpperCase() + '\n\n';
              }

              // Add content blocks
              const content = sectiune.continut || sectiune.detalii || [];

              if (typeof content === 'string') {
                plainText += '\t' + content + '\n\n';
              } else if (Array.isArray(content)) {
                content.forEach((bloc: any) => {
                  if (typeof bloc === 'string') {
                    plainText += '\t' + bloc + '\n\n';
                  } else {
                    switch (bloc.tip) {
                      case 'titlu_centrat':
                        plainText += '\t\t' + bloc.text.toUpperCase() + '\n\n';
                        break;
                      case 'paragraf':
                        plainText += '\t' + bloc.text + '\n\n';
                        break;
                      case 'lista_numerotata':
                        if (bloc.items && Array.isArray(bloc.items)) {
                          bloc.items.forEach((item: string, idx: number) => {
                            plainText += `\t${idx + 1}. ${item}\n`;
                          });
                          plainText += '\n';
                        }
                        break;
                      case 'semnatura':
                        plainText += '\n\n\t\t\t\t' + bloc.text + '\n';
                        break;
                      default:
                        plainText += '\t' + (bloc.text || JSON.stringify(bloc)) + '\n\n';
                    }
                  }
                });
              } else if (typeof content === 'object') {
                // Object content
                Object.entries(content).forEach(([k, v]) => {
                  plainText += `\t${k}: ${v}\n`;
                });
                plainText += '\n';
              } else if (!sectiune.continut && !sectiune.detalii) {
                // Section itself is the content
                Object.entries(sectiune).forEach(([k, v]) => {
                  if (k !== 'titlu_sectiune' && k !== 'nume' && k !== 'calitate') {
                    plainText += `\t${k.replace(/_/g, ' ')}: ${v}\n`;
                  }
                });
                plainText += '\n';
              }
            });
          }
        } else {
          // Generic format handling
          const valueToText = (value: any, key?: string, depth: number = 0): string => {
            let text = '';
            const indent = '\t'.repeat(depth);

            if (value === null || value === undefined) return '';

            if (Array.isArray(value)) {
              if (key) text += `${indent}${key.toUpperCase()}:\n`;
              value.forEach((item, idx) => {
                if (typeof item === 'object') {
                  text += valueToText(item, undefined, depth + 1);
                } else {
                  text += `${indent}\t${idx + 1}. ${item}\n`;
                }
              });
              return text;
            }

            if (typeof value === 'object') {
              if (key) text += `\n${indent}${key.toUpperCase()}\n`;
              Object.entries(value).forEach(([k, v]) => {
                text += valueToText(v, k, depth + 1);
              });
              return text;
            }

            // Primitive
            if (key) {
              text += `${indent}${key.replace(/_/g, ' ')}: ${value}\n`;
            } else {
              text += `${indent}${value}\n`;
            }
            return text;
          }

          // Check if wrapped
          const keys = Object.keys(generatedDoc);
          if (keys.length === 1 && typeof generatedDoc[keys[0]] === 'object') {
            plainText += keys[0].toUpperCase() + '\n\n';
            plainText += valueToText(generatedDoc[keys[0]]);
          } else {
            plainText += valueToText(generatedDoc);
          }
        }

        await navigator.clipboard.writeText(plainText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };



  // Auto-resize textarea based on content
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Determine if mobile or desktop - READ
    // Doing this first to separate reads from writes (though window props are usually safe, it's good practice)
    const isMobile = window.innerWidth < 768;
    const lineHeight = 24; // px
    const minRows = 4;
    const maxRows = isMobile ? 10 : 7;
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows * lineHeight;

    // Reset height to auto to get accurate scrollHeight - WRITE
    textarea.style.height = 'auto';

    // Calculate new height - READ (layout thrashing happens here if we interleaved)
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);

    // Apply new height - WRITE
    textarea.style.height = `${newHeight}px`;
  }, [situatie]);

  type ViewType = 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare' | 'text_doctrina' | 'text_ce_invatam' | 'Rezumat_generat_de_AI_Cod' | 'cereri_accesorii';



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
    { key: 'cereri_accesorii', label: 'Cereri accesorii' },
  ];

  const renderContent = () => {
    if ((isLoading || isDosarSearchLoading) && results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <Loader2 className="animate-spin h-12 w-12 text-brand-accent" />
          {status && <p className="text-brand-text-secondary mt-4">{status}</p>}
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="text-center py-10">
          {status && <p className="text-brand-text-secondary mb-6">{status}</p>}
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
            {result.type === 'company' ? (
              <CompanyCard
                company={result as CompanyResult}
                onViewDetails={() => onViewCase(result)}
              />
            ) : (
              <ResultItem
                result={result}
                activeView={activeView}
                onViewCase={() => onViewCase(result)}
                isAISelected={result.isAISelected || false}
                isCandidateCase={result.isCandidateCase || false}
              />
            )}
          </div>
        ))}
        {isLoading && (
          <div className="text-center py-6">
            <Loader2 className="animate-spin h-8 w-8 text-brand-accent mx-auto" />
          </div>
        )}
        {!hasMore && results.length > 0 && (
          <div className="text-center py-8 px-4">
            {(() => {
              const userRole = (user?.rol || 'guest').toLowerCase();
              let limit = 10;
              if (userRole === 'admin') limit = 100;
              else if (userRole === 'pro') limit = 50;
              else if (userRole === 'basic') limit = 20;
              else limit = 10; // guest

              if (userRole !== 'admin' && results.length >= limit) {
                return (
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6 max-w-2xl mx-auto shadow-sm">
                    <h3 className="text-lg font-bold text-orange-800 mb-2">
                      Ai atins limita de {limit} rezultate pentru contul {userRole === 'guest' ? 'neînregistrat' : userRole}.
                    </h3>
                    <p className="text-orange-700 mb-4 text-sm">
                      Pentru a accesa mai multe spețe și funcționalități avansate, te invităm să alegi un pachet superior.
                    </p>
                    <button
                      onClick={() => navigate('/abonamente')}
                      className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg text-sm"
                    >
                      Vezi Abonamentele
                    </button>
                  </div>
                );
              }

              return <p className="text-brand-text-secondary text-sm">Ați ajuns la sfârșitul listei.</p>;
            })()}
          </div>
        )}
      </div>
    );
  };


  // ... MainContent component ...

  return (
    <main className="flex-1 p-4 md:p-6 bg-brand-light overflow-y-auto pb-20">
      <div className="w-full mx-auto max-w-6xl"> {/* Constrain width for better reading on large screens */}

        {/* Dosar Search Display Info */}
        {onDosarSearch && dosarSearchInfo && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Search size={20} />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wide mb-1">Rezultate Dosar {dosarSearchInfo.numar}</h4>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Obiect:</span> {dosarSearchInfo.obiect}
                {dosarSearchInfo.materie && <span className="ml-3 opacity-60">| {dosarSearchInfo.materie}</span>}
              </p>
            </div>
          </div>
        )}

        {/* Compact Stickier Search for Results View */}
        <div className="mb-8 sticky top-0 z-20 pt-2 -mt-2 bg-brand-light/95 backdrop-blur-sm pb-4 border-b border-slate-200/50">
          <SearchBar
            variant="compact"
            value={situatie}
            onChange={onSituatieChange}
            onSearch={onSearch}
            onDosarSearch={onDosarSearch}
            isLoading={isLoading || !!isDosarSearchLoading}
            placeholder="Caută altceva..."
          />
          {/* Filters or secondary info could go here in a new row */}
        </div>

        {/* Features Section & User Journey - Show when no search has been performed */}
        {results.length === 0 && !isLoading && (
          <>
            {/* Note: This state should usually be handled by HomeHero in SearchPage,
                  but if MainContent is rendered empty, we can show basics or return null */}
          </>
        )}

        {/* Only show view navigation for legal case results, not company results */}
        {results.length > 0 && !results.some(r => r.type === 'company') && (
          // ... rest of the code ...

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

        {/* --- GRID TESTS ENTRY POINT --- */}
        {/* Only show for legal case results, not company results */}
        {results.length > 0 && !results.some(r => r.type === 'company') && (user?.rol === 'pro' || user?.rol === 'admin') && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-500">
              <Wand2 className="w-48 h-48 text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-sm">
                    Nou
                  </span>
                  <span className="text-blue-100 font-medium text-sm">Exclusiv Pro & Admin</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Teste Grilă din Spețe</h3>
                <p className="text-blue-100 max-w-xl">
                  Generează automat teste grilă din întrebările de doctrină identificate în rezultatele căutării tale.
                  Verifică-ți cunoștințele și pregătește-te eficient.
                </p>
              </div>

              <button
                onClick={() => navigate('/grid-tests', { state: { results } })}
                className="whitespace-nowrap px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Începe Testul
              </button>
            </div>
          </div>
        )}

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
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[500px] font-serif text-gray-800 leading-relaxed">
                  {/* Render structured JSON document with flexible format support */}
                  {generatedDoc && (
                    <div className="legal-document">
                      {(() => {
                        // Helper function to detect document structure type
                        const detectStructure = (doc: any): 'classic' | 'wrapped' | 'generic' => {
                          // Classic format with direct fields
                          if (doc.titlu_document || doc.sectiuni || doc.parti_contractante) {
                            return 'classic';
                          }

                          // Wrapped format: single root key containing the document
                          const keys = Object.keys(doc);
                          if (keys.length === 1 && typeof doc[keys[0]] === 'object' && doc[keys[0]] !== null) {
                            return 'wrapped';
                          }

                          return 'generic';
                        };

                        // Helper function to render any value recursively
                        const renderValue = (value: any, key?: string, depth: number = 0): React.ReactNode | null => {
                          // Handle null/undefined
                          if (value === null || value === undefined) {
                            return null;
                          }

                          // Handle arrays
                          if (Array.isArray(value)) {
                            if (value.length === 0) return null;

                            return (
                              <div className={`mb-3 ${depth > 0 ? 'pl-6' : ''}`}>
                                {key && <div className="font-bold text-sm uppercase mb-2 text-gray-700">{key.replace(/_/g, ' ')}</div>}
                                <ol className="list-decimal pl-6 space-y-2">
                                  {value.map((item, idx) => (
                                    <li key={idx} className="text-gray-800">
                                      {typeof item === 'object' ? renderValue(item, undefined, depth + 1) : String(item)}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            );
                          }

                          // Handle objects
                          if (typeof value === 'object') {
                            return (
                              <div className={`mb-4 ${depth > 0 ? 'pl-6 border-l-2 border-gray-200' : ''}`}>
                                {key && (
                                  <h3 className={`font-bold uppercase mb-3 ${depth === 0 ? 'text-lg' : 'text-sm'} text-gray-800`}>
                                    {key.replace(/_/g, ' ')}
                                  </h3>
                                )}
                                <div className="space-y-2">
                                  {Object.entries(value).map(([k, v]) => renderValue(v, k, depth + 1))}
                                </div>
                              </div>
                            );
                          }

                          // Handle primitives (string, number, boolean)
                          if (key) {
                            return (
                              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                                <span className="font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                                <span className="text-gray-800">{String(value)}</span>
                              </div>
                            );
                          }

                          return <span className="text-gray-800">{String(value)}</span>;
                        };

                        // Helper function to render classic format (backward compatibility)
                        const renderClassic = () => {
                          return (
                            <>
                              {/* Document Title */}
                              {(generatedDoc.titlu_document || generatedDoc.titlu_act || generatedDoc.titlu || generatedDoc.nume_act) && (
                                <h1 className="text-center font-bold uppercase text-xl mb-6">
                                  {generatedDoc.titlu_document || generatedDoc.titlu_act || generatedDoc.titlu || generatedDoc.nume_act}
                                </h1>
                              )}

                              {/* Sections */}
                              {(() => {
                                const sections = generatedDoc.sectiuni ||
                                  generatedDoc.parti_contractante ||
                                  generatedDoc.continut ||
                                  generatedDoc.clauze ||
                                  (Array.isArray(generatedDoc) ? generatedDoc : []);

                                if (Array.isArray(sections)) {
                                  return sections.map((sectiune: any, sIdx: number) => (
                                    <div key={sIdx} className="mb-6">
                                      {(sectiune.titlu_sectiune || sectiune.nume || sectiune.calitate) && (
                                        <h3 className="font-bold uppercase text-base mb-3 mt-6">
                                          {sectiune.titlu_sectiune || sectiune.nume || sectiune.calitate}
                                        </h3>
                                      )}

                                      {(() => {
                                        const content = sectiune.continut || sectiune.detalii || [];

                                        if (typeof content === 'string') {
                                          return <p className="text-justify mb-2" style={{ textIndent: '2rem' }}>{content}</p>;
                                        }

                                        if (!sectiune.continut && !sectiune.detalii) {
                                          return (
                                            <div className="pl-4">
                                              {Object.entries(sectiune).map(([key, val]: [string, any]) => {
                                                if (key === 'titlu_sectiune' || key === 'nume' || key === 'calitate') return null;
                                                return (
                                                  <div key={key} className="mb-1">
                                                    <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}: </span>
                                                    <span>{String(val)}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        }

                                        if (Array.isArray(content)) {
                                          return content.map((bloc: any, bIdx: number) => {
                                            if (typeof bloc === 'string') {
                                              return <p key={bIdx} className="text-justify mb-2" style={{ textIndent: '2rem' }}>{bloc}</p>;
                                            }

                                            switch (bloc.tip) {
                                              case 'titlu_centrat':
                                                return (
                                                  <div key={bIdx} className="text-center font-bold uppercase mb-4">
                                                    {bloc.text}
                                                  </div>
                                                );
                                              case 'paragraf':
                                                return (
                                                  <p key={bIdx} className="text-justify mb-2" style={{ textIndent: '2rem' }}>
                                                    {bloc.text}
                                                  </p>
                                                );
                                              case 'lista_numerotata':
                                                return (
                                                  <ol key={bIdx} className="list-decimal pl-10 space-y-1 mb-4">
                                                    {bloc.items?.map((item: string, iIdx: number) => (
                                                      <li key={iIdx}>{item}</li>
                                                    ))}
                                                  </ol>
                                                );
                                              case 'semnatura':
                                                return (
                                                  <div key={bIdx} className="text-right mt-12 mr-10 font-bold">
                                                    {bloc.text}
                                                  </div>
                                                );
                                              default:
                                                return (
                                                  <p key={bIdx} className="text-justify mb-2" style={{ textIndent: '2rem' }}>
                                                    {bloc.text || JSON.stringify(bloc)}
                                                  </p>
                                                );
                                            }
                                          });
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  ));
                                }
                                return null;
                              })()}
                            </>
                          );
                        };

                        // Detect and render based on structure
                        const structure = detectStructure(generatedDoc);

                        if (structure === 'classic') {
                          return renderClassic();
                        } else if (structure === 'wrapped') {
                          // Extract the root key as title and inner content
                          const rootKey = Object.keys(generatedDoc)[0];
                          const innerContent = generatedDoc[rootKey];

                          return (
                            <>
                              <h1 className="text-center font-bold uppercase text-xl mb-6 text-gray-900">
                                {rootKey}
                              </h1>
                              <div className="space-y-4">
                                {renderValue(innerContent, undefined, 0)}
                              </div>
                            </>
                          );
                        } else {
                          // Generic format - render all key-value pairs
                          return (
                            <div className="space-y-4">
                              {Object.entries(generatedDoc).map(([key, value]) => (
                                <div key={key}>
                                  {renderValue(value, key, 0)}
                                </div>
                              ))}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
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

    </main >
  );
};

export default MainContent;
