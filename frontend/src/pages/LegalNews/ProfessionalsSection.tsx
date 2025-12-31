import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsArticle, type LegalNewsAuthor } from '../../types/news';
import ProfessionalAvatar from '../../components/LegalNews/ProfessionalAvatar';
import ProfessionalsSearch from '../../components/LegalNews/ProfessionalsSearch';
import AuthorArticleCard from '../../components/LegalNews/AuthorArticleCard';

const ProfessionalsSection: React.FC = () => {
    const [authors, setAuthors] = useState<LegalNewsAuthor[]>([]);
    const [articles, setArticles] = useState<LegalNewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch authors and articles in parallel
                const [authorsData, articlesData] = await Promise.all([
                    NewsApi.getAuthors(),
                    NewsApi.getArticles(10) // Limit to 10 for the feed
                ]);
                setAuthors(authorsData);
                setArticles(articlesData);
            } catch (err) {
                console.error("Failed to load professionals data", err);
                setError("Nu am putut încărca datele secțiunii profesioniști.");
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

    // Filter authors based on search
    const filteredAuthors = authors.filter(author => {
        return author.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (author.title && author.title.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    // Helper to find author for an article
    const getAuthorForArticle = (article: LegalNewsArticle): LegalNewsAuthor => {
        // Safe check for authorId matching, or fallback to authorName/dummy
        return authors.find(a => a.id === article.authorId) || {
            id: article.authorId || 'unknown',
            name: article.authorName || 'Autor Necunoscut',
            profileImageUrl: undefined
        };
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-8 font-headings uppercase">Profesioniști</h1>

            <ProfessionalsSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
            />

            {/* Authors Grid */}
            <div className="mb-16">
                <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">
                    Autori Articole
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                    {filteredAuthors.map(author => (
                        <ProfessionalAvatar key={author.id} author={author} />
                    ))}
                </div>
            </div>

            {/* Author Articles Feed */}
            <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">
                    Articole autori
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {articles.map(article => (
                        <AuthorArticleCard
                            key={article.id}
                            article={article}
                            author={getAuthorForArticle(article)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfessionalsSection;
