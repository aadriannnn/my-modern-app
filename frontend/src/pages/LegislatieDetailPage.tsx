import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, Search, ExternalLink } from 'lucide-react';
import DOMPurify from 'dompurify';

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

    useEffect(() => {
        if (!categorySlug || !itemSlug) return;
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
            <div className="min-h-screen pt-24 pb-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex flex-col justify-center items-center text-center px-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Articolul nu a fost găsit</h2>
                <Link to={`/legislatie`} className="text-blue-600 hover:underline">
                    Înapoi la căutare
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-50">
            <Helmet>
                <title>{`${data.title} - LegeaAplicata.ro`}</title>
                <meta name="description" content={`${data.label}: ${data.title}. Consultă textul integral și explicații pe LegeaAplicata.ro.`} />
                <link rel="canonical" href={`https://chat.legeaaplicata.ro/legislatie/${categorySlug}/${itemSlug}`} />
            </Helmet>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="flex items-center gap-4 text-sm text-slate-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
                    <Link to="/legislatie" className="hover:text-slate-900 transition-colors">
                        Legislație
                    </Link>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                    <span className="text-slate-900 font-medium capitalize">
                        {categorySlug?.replace(/_/g, ' ')}
                    </span>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                    <span className="text-slate-900 font-medium">{data.label}</span>
                </nav>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-100 p-6 sm:p-8 bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {data.source}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-4">
                            {data.title}
                        </h1>

                        <Link
                            to="/legislatie"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
                        >
                            <Search className="w-4 h-4" />
                            Caută alt articol
                        </Link>
                    </div>

                    <div className="p-6 sm:p-8">
                        <div
                            className="prose prose-slate max-w-none prose-headings:font-serif prose-a:text-blue-600 whitespace-pre-wrap font-serif text-lg leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }}
                        />


                        {/* Display Related Articles (Articole Conexe) */}
                        {data.art_conex && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-3">Articole Conexe / Referințe</h3>
                                <div className="p-4 bg-slate-50 rounded-lg text-slate-700 text-sm whitespace-pre-wrap leading-relaxed border border-slate-200">
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
                                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
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
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-bold text-slate-900">Doctrină și Explicații</h3>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase tracking-wide">
                                        Generat cu AI
                                    </span>
                                </div>
                                <div className="p-4 bg-yellow-50 rounded-lg text-slate-800 text-sm whitespace-pre-wrap leading-relaxed border border-yellow-100">
                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.doctrina) }} />
                                    <p className="mt-4 text-xs text-slate-400 italic border-t border-yellow-200/50 pt-2">
                                        Disclaimer: Această secțiune este generată integral de inteligența artificială și are rol informativ. Vă rugăm să verificați informațiile din surse oficiale.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-center bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <div>
                        <h3 className="font-bold text-blue-900 mb-1">Nu ai găsit ce căutai?</h3>
                        <p className="text-blue-700 text-sm">Poți efectua o nouă căutare în baza noastră de date legislativă.</p>
                    </div>
                    <Link
                        to="/legislatie"
                        className="flex-shrink-0 ml-4 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm inline-flex items-center gap-2"
                    >
                        Nouă Căutare
                        <Search className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LegislatieDetailPage;
