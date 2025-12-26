import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsArticle } from '../../types/news';
import NewsCard from './NewsCard';

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
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-accent" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {articles.map((article) => (
                <NewsCard key={article.id} article={article} />
            ))}
        </div>
    );
};

export default ArticlesSection;
