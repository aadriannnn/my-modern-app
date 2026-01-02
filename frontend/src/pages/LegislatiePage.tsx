import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LegislatieSearch from '../components/LegislatieSearch';
import type { SearchParams } from '../components/LegislatieSearch';
import LegislatieResults from '../components/LegislatieResults';
import type { SearchResultItem } from '../components/LegislatieResults';
import { FileText } from 'lucide-react';

const LegislatiePage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'coduri' | 'modele'>('coduri');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Perform initial search to show some "popular" or recent codes?
  // Or just clear state. Let's show search bar prominent.

  const performSearch = async (params: SearchParams) => {
    setLoading(true);
    setHasSearched(true);
    setResults([]); // Clear previous

    try {
      const endpoint = activeTab === 'coduri'
        ? '/api/coduri/relevant'
        : '/api/modele/relevant';

      // Map params to API request
      const body: any = {
        text_query: params.text_query,
        limit: 50
      };

      if (activeTab === 'coduri') {
        if (params.table_name) body.table_name = params.table_name;
        if (params.article_number) body.article_number = params.article_number;
      }

      // If just text query, we can put it in 'keywords'? or use specific 'text_query' from schema
      // Our Schema now supports text_query!

      // If no params (empty search), display popular/recent?
      // The API might require some input or return empty.
      // Let's ensure we send something or handle empty
      if (!params.text_query && !params.article_number && !params.table_name && activeTab === 'coduri') {
        // Fetch "Codes List" visual navigation if search is empty?
        // For now, let the API handle "empty" -> it might return error or top results.
        // Current logic needs at least one match criteria.
        // Maybe we default to "Cod Civil"?
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Helmet>
        <title>Legislație și Formulare - LegeaAplicata.ro</title>
        <meta name="description" content="Caută rapid în toate Codurile României și în modele de acte procedurale. Motor de căutare juridic inteligent." />
        <link rel="canonical" href="https://chat.legeaaplicata.ro/legislatie" />
      </Helmet>

      <Header
        onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onContribuieClick={() => { }}
        isHomeView={false}
        onReset={() => { }}
      />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 py-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
              Biblioteca Juridică
            </h1>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-12">
              Acces gratuit la legislația actualizată și modele de documente, interogabile inteligent.
            </p>

            <LegislatieSearch
              onSearch={performSearch}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setHasSearched(false);
                setResults([]);
              }}
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {hasSearched || loading ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                {loading ? 'Căutăm...' : `Rezultate (${results.length})`}
              </h2>
              <LegislatieResults
                results={results}
                type={activeTab}
                loading={loading}
              />
            </div>
          ) : (
            /* Initial State / Categories View */
            <div className="text-center py-12 text-slate-500">
              {activeTab === 'coduri' ? (
                <div className="space-y-6">
                  <h3 className="text-xl font-medium text-slate-800">
                    Sau navighează prin cele mai accesate coduri
                  </h3>
                  {/* This ideally should be dynamic too, but can be hardcoded for speed/aesthetics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {['Codul Civil', 'Codul Penal', 'Codul de Procedură Civilă', 'Codul de Procedură Penală'].map(code => (
                      <button
                        key={code}
                        // Pre-fill search
                        onClick={() => {
                          const tableName = code.toLowerCase().replace(/ /g, '_').replace(/ă/g, 'a').replace(/â/g, 'a'); // rough mapping
                          // Mapping needs to be precise.
                          const map: Record<string, string> = {
                            'Codul Civil': 'cod_civil',
                            'Codul Penal': 'cod_penal',
                            'Codul de Procedură Civilă': 'cod_procedura_civila',
                            'Codul de Procedură Penală': 'cod_procedura_penala'
                          };
                          performSearch({ text_query: '', table_name: map[code] });
                        }}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-slate-700 font-medium"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileText className="w-16 h-16 text-slate-200 mb-4" />
                  <p>Caută modele de contracte, cereri de chemare în judecată sau plângeri.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegislatiePage;
