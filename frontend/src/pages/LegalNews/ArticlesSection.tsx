import React, { useEffect, useState } from 'react';
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-2">
                    {/* Featured Article */}
                    {featuredArticle && (
                        <FeaturedArticleCard article={featuredArticle} />
                    )}

                    {/* Articles Feed */}
                    <div className="flex flex-col">
                        {feedArticles.map((article) => (
                            <ArticleFeedItem key={article.id} article={article} />
                        ))}
                    </div>

                    {articles.length === 0 && (
                        <p className="text-center text-slate-500 py-10">Nu există articole de afișat.</p>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="hidden lg:block space-y-8">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Publicitate</h4>
                        <div className="w-full h-full bg-slate-200 rounded flex items-center justify-center text-slate-400 text-sm p-4 border border-dashed border-slate-300">
                            Reclama ta aici
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Publicitate</h4>
                        <div className="w-full h-full bg-slate-200 rounded flex items-center justify-center text-slate-400 text-sm p-4 border border-dashed border-slate-300">
                            Reclama ta aici
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArticlesSection;
