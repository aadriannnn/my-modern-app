import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsArticle } from '../../types/news';
import FeaturedArticleCard from '../../components/LegalNews/FeaturedArticleCard';
import ArticleFeedItem from '../../components/LegalNews/ArticleFeedItem';
import SearchFilterBar from '../../components/LegalNews/SearchFilterBar';

const ArticlesSection: React.FC = () => {
    const [articles, setArticles] = useState<LegalNewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await NewsApi.getArticles();
                setArticles(data);
            } catch (err) {
                console.error("Failed to load articles", err);
                setError("Nu am putut încărca știrile.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-accent w-8 h-8" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }

    const featuredArticle = articles.length > 0 ? articles[0] : null;
    const feedArticles = articles.length > 1 ? articles.slice(1) : [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-8 font-headings uppercase">Toate Articolele</h1>

            <SearchFilterBar />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Column - Wider (9 cols) */}
                <div className="lg:col-span-9">
                    {/* Featured Article */}
                    {featuredArticle && (
                        <FeaturedArticleCard article={featuredArticle} />
                    )}

                    {/* Articles Feed */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {feedArticles.map((article) => (
                            <ArticleFeedItem key={article.id} article={article} />
                        ))}
                    </div>

                    {articles.length === 0 && (
                        <p className="text-center text-slate-500 py-10">Nu există articole de afișat.</p>
                    )}
                </div>

                {/* Sidebar Column - Narrower (3 cols) */}
                <div className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24 h-fit">
                    {/* Partners Widget */}
                    <div className="bg-white rounded-[10px] shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Parteneri</h4>
                        <div className="w-full bg-white rounded-lg flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors cursor-pointer border border-transparent">
                            <div className="text-center">
                                <img
                                    src="/data/legal_news/images/ICI.jpg"
                                    alt="ICI București"
                                    className="w-full h-auto object-contain mb-4 rounded-md"
                                />
                                <h5 className="text-xs font-bold text-slate-700 mb-2">ICI București</h5>
                                <p className="text-[10px] text-slate-400 leading-relaxed text-justify">
                                    Institutul Național de Cercetare-Dezvoltare în Informatică este cea mai importantă unitate de cercetare și inovare în domeniul Tehnologiilor Informației și Comunicărilor (TIC) din România. Fondat în 1970, institutul funcționează sub coordonarea Guvernului României.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Premium Widget - Sober Look */}
                    <div className="bg-brand-dark text-white rounded-[10px] shadow-md p-6 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand-gold/10 rounded-full blur-xl"></div>
                        <h4 className="text-base font-serif font-semibold mb-2 relative z-10 text-brand-gold">Premium Access</h4>
                        <p className="text-xs text-gray-300 mb-5 relative z-10 leading-relaxed">Acces complet la analize ample, jurisprudență și instrumente AI.</p>
                        <Link to="/abonamente" className="block w-full text-center py-2 bg-white/10 text-white border border-white/20 font-medium text-xs rounded hover:bg-white/20 transition-colors relative z-10">
                            Vezi abonamente
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArticlesSection;
