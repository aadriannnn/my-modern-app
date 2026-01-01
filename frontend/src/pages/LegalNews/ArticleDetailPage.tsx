import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../components/Header';
import { type LegalNewsArticle } from '../../types/news';
import { Loader2, ArrowLeft, Calendar, User, Tag } from 'lucide-react';
// import { Helmet } from 'react-helmet-async'; // Not installed currently

const ArticleDetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [article, setArticle] = useState<LegalNewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticle = async () => {
            if (!slug) return;
            try {
                const response = await fetch(`/api/legal-news/articles/${slug}`);
                if (!response.ok) throw new Error('Article not found');
                const data = await response.json();
                setArticle(data);
            } catch (err) {
                console.error("Error fetching article:", err);
                setError("Articolul nu a putut fi găsit.");
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
        window.scrollTo(0, 0);
    }, [slug]);

    const toggleMenu = () => { console.log("Toggle menu"); };
    const handleContribuieClick = () => { console.log("Contribuie click"); };

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-light flex flex-col">
                <Header onToggleMenu={toggleMenu} onContribuieClick={handleContribuieClick} hideMobileMenu={true} />
                <div className="flex-grow flex justify-center items-center">
                    <Loader2 className="animate-spin h-10 w-10 text-brand-accent" />
                </div>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="min-h-screen bg-brand-light flex flex-col">
                <Header onToggleMenu={toggleMenu} onContribuieClick={handleContribuieClick} hideMobileMenu={true} />
                <div className="flex-grow flex flex-col justify-center items-center p-4 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Ooops!</h2>
                    <p className="text-gray-600 mb-8">{error || "Articolul căutat nu există."}</p>
                    <Link to="/stiri" className="px-6 py-2 bg-brand-accent text-brand-dark rounded-md font-medium hover:bg-brand-light border border-brand-accent transition-colors">
                        Înapoi la Știri
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light flex flex-col">
            {/* SEO Meta Tags (if Helmet is available, else ignored safely) */}
            {/* <Helmet>
                <title>{article.title} | LegeaAplicată</title>
                <meta name="description" content={article.description || article.summary} />
            </Helmet> */}

            {/* JSON-LD Structured Data for Google SEO */}
            {/* JSON-LD Structured Data for Google SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "NewsArticle",
                        "headline": article.title,
                        "image": article.imageUrl ? [article.imageUrl] : [],
                        "datePublished": article.publishDate,
                        "dateModified": article.lastModifiedDate || article.publishDate,
                        "author": [{
                            "@type": "Person",
                            "name": "Adrian Nicolau",
                            "url": "https://legeaaplicata.ro/stiri/autor/author-01"
                        }]
                    })
                }}
            />

            <Header onToggleMenu={toggleMenu} onContribuieClick={handleContribuieClick} hideMobileMenu={true} />

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Hero Image */}
                    {article.imageUrl && (
                        <div className="w-full h-64 md:h-96 relative">
                            <img
                                src={article.imageUrl}
                                alt={article.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/1200x600?text=Legal+Image'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                    )}

                    <div className="p-6 md:p-10">
                        {/* Breadcrumbs / Back Link */}
                        <Link to="/stiri" className="inline-flex items-center text-sm text-gray-500 hover:text-brand-accent mb-6 transition-colors font-medium">
                            <ArrowLeft size={16} className="mr-1" />
                            Înapoi la știri
                        </Link>

                        {/* Title & Metadata */}
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                            {article.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
                            <div className="flex items-center">
                                <Calendar size={18} className="mr-2 text-brand-accent" />
                                <span className="font-medium text-gray-700">
                                    {new Date(article.publishDate).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            {article.authorName && (
                                <div className="flex items-center">
                                    <User size={18} className="mr-2 text-brand-accent" />
                                    <span className="font-medium text-gray-700">{article.authorName}</span>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <article
                            className="article-content prose prose-lg md:prose-xl max-w-none text-gray-700 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-brand-accent prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-md text-justify"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                        />

                        {/* Tags */}
                        {article.tags && article.tags.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-gray-100">
                                <div className="flex flex-wrap gap-2">
                                    {article.tags.map(tag => (
                                        <span key={tag} className="inline-flex items-center px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm font-medium border border-gray-100">
                                            <Tag size={12} className="mr-1.5 opacity-50" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <footer className="bg-white border-t border-gray-200 mt-auto py-8">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} LegeaAplicată. Toate drepturile rezervate.
                </div>
            </footer>
        </div>
    );
};

export default ArticleDetailPage;
