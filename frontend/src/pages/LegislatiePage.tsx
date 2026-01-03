import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const currentTable = searchParams.get('table');

  const SEO_METADATA: Record<string, { title: string; description: string; keywords: string; schemaName: string }> = {
    'cod_civil': {
      title: 'Codul Civil Actualizat 2026 - Text Integral și Explicații | LegeaAplicata.ro',
      description: 'Consultă Codul Civil actualizat 2026. Căutare inteligentă în articole, jurisprudență conexă și explicații juridice. Cel mai complet instrument pentru profesioniști.',
      keywords: 'codul civil, codul civil actualizat, articole cod civil, legislatie civila, cod civil 2026',
      schemaName: 'Codul Civil al României'
    },
    'cod_penal': {
      title: 'Codul Penal Actualizat 2026 - Infracțiuni și Pedepse | LegeaAplicata.ro',
      description: 'Textul integral al Codului Penal, actualizat la zi. Caută rapid infracțiuni, pedepse și jurisprudență relevantă în materie penală.',
      keywords: 'codul penal, cod penal actualizat, infractiuni, pedepse, legislatie penala',
      schemaName: 'Codul Penal al României'
    },
    'cod_procedura_civila': {
      title: 'Codul de Procedură Civilă 2026 - Jurisprudență și Modele | LegeaAplicata.ro',
      description: 'Ghid complet de Procedură Civilă. Articole actualizate, termene procedurale, competențe și modele de acte juridice conforme NCPC.',
      keywords: 'cod procedura civila, ncpc, procedura civila, termene judecata, legislatie procedurala',
      schemaName: 'Codul de Procedură Civilă'
    },
    'cod_procedura_penala': {
      title: 'Codul de Procedură Penală 2026 - Urmărire și Judecată | LegeaAplicata.ro',
      description: 'Codul de Procedură Penală actualizat. Totul despre urmărirea penală, măsuri preventive și fazele procesului penal.',
      keywords: 'cod procedura penala, ncpp, urmarire penala, arest preventiv, judecata penala',
      schemaName: 'Codul de Procedură Penală'
    },
    'cod_muncii': {
      title: 'Codul Muncii 2026 Actualizat - Drepturile Angajaților | LegeaAplicata.ro',
      description: 'Totul despre relațiile de muncă. Codul Muncii actualizat: contracte, concedii, salarizare și litigii de muncă.',
      keywords: 'codul muncii, legislatia muncii, drepturile angajatilor, concediu, demisie',
      schemaName: 'Codul Muncii'
    },
    'cod_administrativ': {
      title: 'Codul Administrativ - Administrație Publică | LegeaAplicata.ro',
      description: 'Reglementările administrației publice centrale și locale. Codul Administrativ actualizat și explicat.',
      keywords: 'cod administrativ, administratie publica, functionari publici, primarii, consilii locale',
      schemaName: 'Codul Administrativ'
    },
    'codul_fiscal_2015': {
      title: 'Codul Fiscal 2026 - Taxe și Impozite | LegeaAplicata.ro',
      description: 'Legislația fiscală completă. Codul Fiscal actualizat: impozit pe venit, TVA, contribuții sociale și taxe locale.',
      keywords: 'codul fiscal, taxe si impozite, tva, impozit venit, legislatie fiscala',
      schemaName: 'Codul Fiscal'
    },
    'codul_procedura_fiscala_2015': {
      title: 'Codul de Procedură Fiscală - Inspecții și Contestații | LegeaAplicata.ro',
      description: 'Ghid de Procedură Fiscală. Drepturile contribuabililor, inspecția fiscală și executarea silită.',
      keywords: 'procedura fiscala, inspectie fiscala, anaf, contestatie fiscala, executare silita',
      schemaName: 'Codul de Procedură Fiscală'
    },
    'codul_silvic_2024': {
      title: 'Noul Cod Silvic - Regimul Pădurilor | LegeaAplicata.ro',
      description: 'Accesează Noul Cod Silvic. Reglementări privind fondul forestier, exploatarea lemnului și protecția pădurilor.',
      keywords: 'codul silvic, legea padurilor, ocoale silvice, regim silvic, legislatie mediu',
      schemaName: 'Codul Silvic'
    }
  };

  const activeSEO = (currentTable && SEO_METADATA[currentTable]) || {
    title: 'Legislație și Formulare - LegeaAplicata.ro',
    description: 'Caută rapid în toate Codurile României și în modele de acte procedurale. Motor de căutare juridic inteligent.',
    keywords: 'legislatie, coduri, legi romania, modele acte, cautare juridica',
    schemaName: 'Legislația României'
  };

  const currentUrl = currentTable
    ? `https://chat.legeaaplicata.ro/legislatie?table=${currentTable}`
    : 'https://chat.legeaaplicata.ro/legislatie';

  // Schema.org for Legislation
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    "name": activeSEO.schemaName,
    "description": activeSEO.description,
    "legislationType": "Code",
    "legislationJurisdiction": "RO",
    "url": currentUrl,
    "provider": {
      "@type": "Organization",
      "name": "LegeaAplicata.ro",
      "url": "https://chat.legeaaplicata.ro"
    }
  };

  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-trigger search from URL params (e.g. footer links)
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam && !hasSearched && !loading) {
      performSearch({ text_query: '', table_name: tableParam });
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [loading]);

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
        <title>{activeSEO.title}</title>
        <meta name="description" content={activeSEO.description} />
        <meta name="keywords" content={activeSEO.keywords} />
        <link rel="canonical" href={currentUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={activeSEO.title} />
        <meta property="og:description" content={activeSEO.description} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={currentUrl} />
        <meta property="twitter:title" content={activeSEO.title} />
        <meta property="twitter:description" content={activeSEO.description} />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <Header
        onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onContribuieClick={() => { }}
        isHomeView={false}
        onReset={() => { }}
      />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className={`bg-gradient-to-br from-slate-900 to-blue-900 px-4 relative overflow-hidden transition-all duration-500 ease-in-out ${hasSearched ? 'py-8' : 'py-16'
          }`}>
          <div className="absolute inset-0 opacity-10"></div>
          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <h1 className={`font-serif font-bold text-white mb-6 transition-all duration-500 ${hasSearched ? 'text-2xl md:text-3xl' : 'text-4xl md:text-5xl'
              }`}>
              Biblioteca Juridică
            </h1>
            <div className={`overflow-hidden transition-all duration-500 ${hasSearched ? 'max-h-0 opacity-0 mb-0' : 'max-h-24 opacity-100 mb-12'
              }`}>
              <p className="text-blue-100 text-lg max-w-2xl mx-auto">
                Acces gratuit la legislația actualizată și modele de documente, interogabile inteligent.
              </p>
            </div>

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
        <div
          ref={resultsRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-24"
        >
          {hasSearched || loading ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 text-center">
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
                <div className="mt-12 text-blue-900/40 text-sm font-medium">
                  {/* Shortcut buttons removed as per request. Use Footer links or Search. */}
                  Introduceți termeni cheie mai sus pentru a căuta în legislație.
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
