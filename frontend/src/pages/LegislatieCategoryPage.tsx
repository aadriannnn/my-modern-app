import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, FileText, Search } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Item {
    id: string;
    label: string;
    title: string;
    slug: string;
}

interface CategoryIndex {
    title: string;
    slug: string;
    type: 'code' | 'form';
    items: Item[];
}

const LegislatieCategoryPage: React.FC = () => {
    const { categorySlug } = useParams<{ categorySlug: string }>();
    const [data, setData] = useState<CategoryIndex | null>(null);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!categorySlug) return;

        fetch(`/data/legislatie/${categorySlug}/index.json`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [categorySlug]);

    const filteredItems = data?.items.filter(item =>
        item.title.toLowerCase().includes(filter.toLowerCase()) ||
        item.label.toLowerCase().includes(filter.toLowerCase())
    ) || [];

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (!data) return <div>Category not found</div>;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Helmet>
                <title>{`${data.title} - LegeaAplicata.ro`}</title>
                <meta name="description" content={`Vezi toate articolele și secțiunile din ${data.title}.`} />
                <link rel="canonical" href={`https://chat.legeaaplicata.ro/legislatie/${data.slug}`} />
            </Helmet>

            <Header
                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onContribuieClick={() => { }}
                isHomeView={false}
                onReset={() => { }}
            />

            <div className="flex-grow pt-8 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <Link to="/legislatie" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-6 transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Înapoi la Legislație
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-serif font-bold text-slate-900 mb-4">{data.title}</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Caută în acest cod..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* List content */}
                    <div className="divide-y divide-slate-100">
                        {filteredItems.slice(0, 500).map((item) => (
                            <Link
                                key={item.id}
                                to={`/legislatie/${categorySlug}/${item.slug}`}
                                className="flex items-start p-4 hover:bg-slate-50 transition-colors group"
                            >
                                <FileText className="w-5 h-5 text-slate-400 mt-1 mr-3 flex-shrink-0 group-hover:text-slate-900" />
                                <div>
                                    <span className="font-semibold text-slate-900 block mb-1">{item.label}</span>
                                    <span className="text-slate-600 block text-sm line-clamp-2">{item.title}</span>
                                </div>
                            </Link>
                        ))}
                        {filteredItems.length > 500 && (
                            <div className="p-4 text-center text-slate-500 italic">
                                Se afișează primele 500 de rezultate. Folosește căutarea pentru a găsi mai multe.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default LegislatieCategoryPage;
