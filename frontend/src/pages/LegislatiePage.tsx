import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Book, FileText, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Category {
  title: string;
  slug: string;
  count: number;
  type: 'code' | 'form';
}

interface IndexData {
  codes: Category[];
  forms: Category[];
}

const LegislatiePage: React.FC = () => {
  const [data, setData] = useState<IndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/data/legislatie/index.json')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Helmet>
        <title>Legislație și Formulare - LegeaAplicata.ro</title>
        <meta name="description" content="Accesează gratuit Codurile României actualizate și modele de cereri și formulare juridice." />
        <link rel="canonical" href="https://chat.legeaaplicata.ro/legislatie" />
      </Helmet>

      <Header
        onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onContribuieClick={() => { }} // Stub for now
        isHomeView={false}
        onReset={() => { }}
      />

      <main className="flex-grow pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4">
              Resurse Juridice Gratuite
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Consultă textul integral al codurilor și descarcă modele de cereri utile.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Coduri Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
                  <Book className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Coduri și Legi</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {data?.codes.map((code) => (
                    <Link
                      key={code.slug}
                      to={`/legislatie/${code.slug}`}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div>
                        <h3 className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                          {code.title}
                        </h3>
                        <p className="text-sm text-slate-500">{code.count} articole</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-700" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Formulare Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Modele și Formulare</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {data?.forms.map((form) => (
                    <Link
                      key={form.slug}
                      to={`/legislatie/${form.slug}`}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div>
                        <h3 className="font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {form.title}
                        </h3>
                        <p className="text-sm text-slate-500">{form.count} modele</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-700" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegislatiePage;
