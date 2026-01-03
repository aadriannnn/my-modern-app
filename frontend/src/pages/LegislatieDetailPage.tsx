import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, Search } from 'lucide-react';
import DOMPurify from 'dompurify';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface ItemDetail {
    id: string;
    label: string;
    title: string;
    slug: string;
    content: string;
    source: string;
    art_conex?: string;
    doctrina?: string;
}

const LegislatieDetailPage: React.FC = () => {
    const { categorySlug, itemSlug } = useParams<{ categorySlug: string; itemSlug: string }>();
    const [data, setData] = useState<ItemDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        console.log('LegislatieDetailPage mounted. Params:', { categorySlug, itemSlug });
        if (!categorySlug || !itemSlug) {
            console.error('Missing params in LegislatieDetailPage');
            return;
        }
        setLoading(true);
        setError(false);

        const isModele = categorySlug === 'modele';
        const endpoint = isModele
            ? `/api/modele/${itemSlug}`
            : `/api/coduri/${categorySlug}/${itemSlug}`;

        fetch(endpoint)
            .then(res => {
                if (!res.ok) throw new Error('Not found');
                return res.json();
            })
            .then(apiData => {
                // Map API response to unified format
                let mappedData: ItemDetail;

                if (isModele) {
                    mappedData = {
                        id: apiData.id,
                        label: 'Model Document',
                        title: apiData.titlu_model,
                        slug: itemSlug,
                        content: apiData.text_model,
                        source: apiData.sursa_model || 'Formulare'
                    };
                } else {
                    // For Codes (Coduri)
                    // Assuming API returns: { id, numar, titlu, text, ... }
                    mappedData = {
                        id: apiData.id,
                        label: apiData.numar ? `Art. ${apiData.numar}` : 'Articol',
                        title: apiData.titlu || `Articolul ${apiData.numar}`,
                        slug: itemSlug,
                        content: apiData.text,
                        source: categorySlug.replace(/_/g, ' ').toUpperCase(),
                        art_conex: apiData.art_conex,
                        doctrina: apiData.doctrina
                    };
                }
                setData(mappedData);
            })
            .catch((err) => {
                console.error(err);
                setError(true);
            })
            .finally(() => setLoading(false));
    }, [categorySlug, itemSlug]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50">
                <Header
                    onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    onContribuieClick={() => { }}
                    isHomeView={false}
                    onReset={() => { }}
                />
                <div className="flex-grow flex justify-center items-center pt-24 pb-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                </div>
                <Footer />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50">
                <Header
                    onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    onContribuieClick={() => { }}
                    isHomeView={false}
                    onReset={() => { }}
                />
                <div className="flex-grow flex flex-col justify-center items-center text-center px-4 pt-24 pb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Articolul nu a fost găsit</h2>
                    <Link to={`/legislatie`} className="text-blue-600 hover:underline">
                        Înapoi la căutare
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Helmet>
                <title>{`${data.title} - LegeaAplicata.ro`}</title>
                <meta name="description" content={`${data.label}: ${data.title}. Consultă textul integral și explicații pe LegeaAplicata.ro.`} />
                <link rel="canonical" href={`https://chat.legeaaplicata.ro/legislatie/${categorySlug}/${itemSlug}`} />
            </Helmet>

            <Header
                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onContribuieClick={() => { }}
                isHomeView={false}
                onReset={() => { }}
            />

            <main className="flex-grow pt-8 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <nav className="flex items-center gap-4 text-sm text-slate-500 mb-8 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
                    <Link to="/legislatie" className="hover:text-slate-900 transition-colors flex-shrink-0">
                        Legislație
                    </Link>
                    <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" />
                    <span className="text-slate-900 font-medium capitalize flex-shrink-0">
                        {categorySlug?.replace(/_/g, ' ')}
                    </span>
                    <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" />
                    <span className="text-slate-900 font-medium whitespace-normal max-w-[200px] truncate">{data.label}</span>
                </nav>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="border-b border-slate-100 p-6 sm:p-8 bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {data.source}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-6 leading-tight">
                            {data.title}
                        </h1>

                        <Link
                            to="/legislatie"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm hover:shadow"
                        >
                            <Search className="w-4 h-4" />
                            Caută alt articol
                        </Link>
                    </div>

                    <div className="p-6 sm:p-8">
                        <div
                            className="prose prose-slate max-w-none prose-headings:font-serif prose-a:text-blue-600 whitespace-pre-wrap font-serif text-lg leading-relaxed text-slate-800"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }}
                        />

                        {/* Display Related Articles (Articole Conexe) */}
                        {data.art_conex && (
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                                    Articole Conexe / Referințe
                                </h3>
                                <div className="p-5 bg-slate-50 rounded-xl text-slate-700 text-sm whitespace-pre-wrap leading-relaxed border border-slate-200 shadow-sm">
                                    {data.art_conex.split(';').map((part, index, array) => {
                                        const trimmed = part.trim();
                                        if (!trimmed) return null;

                                        // Attempt to match "Art. <number>"
                                        const match = trimmed.match(/^Art\.?\s*(\d+)/i);

                                        if (match) {
                                            const artNum = match[1];
                                            const targetUrl = `/legislatie/${categorySlug}/art_${artNum}`;

                                            return (
                                                <span key={index}>
                                                    <Link
                                                        to={targetUrl}
                                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium decoration-blue-200 underline-offset-2"
                                                    >
                                                        {trimmed}
                                                    </Link>
                                                    {index < array.length - 1 ? '; ' : ''}
                                                </span>
                                            );
                                        }

                                        return (
                                            <span key={index}>
                                                {trimmed}
                                                {index < array.length - 1 ? '; ' : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Display Doctrine */}
                        {data.doctrina && (
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                                        Doctrină și Explicații
                                    </h3>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold bg-amber-100 text-amber-700 tracking-wider">
                                        AI Generated
                                    </span>
                                </div>
                                <div className="p-6 bg-amber-50/50 rounded-xl text-slate-800 text-sm whitespace-pre-wrap leading-relaxed border border-amber-100 shadow-sm">
                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.doctrina) }} />
                                    <p className="mt-6 text-xs text-slate-400 italic border-t border-amber-200/30 pt-3">
                                        Notă: Această secțiune este generată de asistentul nostru AI pentru a oferi context suplimentar.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 gap-4">
                    <div className="text-center sm:text-left">
                        <h3 className="font-bold text-blue-900 mb-1 text-lg">Ai nevoie de mai multe informații?</h3>
                        <p className="text-blue-700 text-sm">Caută rapid în toată baza noastră de date legislativă.</p>
                    </div>
                    <Link
                        to="/legislatie"
                        className="flex-shrink-0 px-6 py-3 bg-white text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all font-semibold text-sm inline-flex items-center gap-2 shadow-sm"
                    >
                        Nouă Căutare
                        <Search className="w-4 h-4" />
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default LegislatieDetailPage;
