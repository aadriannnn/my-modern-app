
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, MessageSquare, ExternalLink } from 'lucide-react';
import DOMPurify from 'dompurify';

interface ItemDetail {
    id: string;
    label: string;
    title: string;
    slug: string;
    content: string;
}

const LegislatieDetailPage: React.FC = () => {
    const { categorySlug, itemSlug } = useParams<{ categorySlug: string; itemSlug: string }>();
    const [data, setData] = useState<ItemDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!categorySlug || !itemSlug) return;

        fetch(`/data/legislatie/${categorySlug}/${itemSlug}.json`)
            .then(res => {
                if (!res.ok) throw new Error('Not found');
                return res.json();
            })
            .then(setData)
            .catch(() => setError(true))
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
                <Link to={`/legislatie/${categorySlug}`} className="text-blue-600 hover:underline">
                    Înapoi la cuprins
                </Link>
            </div>
        );
    }

    // Determine chat context message
    const chatMessage = `Salut! Vreau să discutăm despre ${data.label} (${data.slug}).`;
    const chatUrl = `https://chat.legeaaplicata.ro/?q=${encodeURIComponent(chatMessage)}`;

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
                    <Link to={`/legislatie/${categorySlug}`} className="hover:text-slate-900 transition-colors">
                        {categorySlug?.replace(/-/g, ' ').toUpperCase()}
                    </Link>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                    <span className="text-slate-900 font-medium">{data.slug}</span>
                </nav>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-100 p-6 sm:p-8 bg-slate-50/50">
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-4">
                            {data.title}
                        </h1>

                        <a
                            href={chatUrl}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Discută cu AI despre acest articol
                        </a>
                    </div>

                    <div
                        className="prose prose-slate max-w-none p-6 sm:p-8 prose-headings:font-serif prose-a:text-blue-600"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }}
                    />
                </div>

                <div className="mt-8 flex justify-between items-center bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <div>
                        <h3 className="font-bold text-blue-900 mb-1">Ai nevoie de explicații suplimentare?</h3>
                        <p className="text-blue-700 text-sm">Asistentul nostru juridic AI îți poate explica acest text pe înțelesul tău.</p>
                    </div>
                    <a
                        href={chatUrl}
                        className="flex-shrink-0 ml-4 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm inline-flex items-center gap-2"
                    >
                        Întreabă AI-ul
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LegislatieDetailPage;
