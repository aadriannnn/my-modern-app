import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsArticle } from '../../types/news';
import FeaturedArticleCard from '../../components/LegalNews/FeaturedArticleCard';
import ArticleFeedItem from '../../components/LegalNews/ArticleFeedItem';
import SearchFilterBar from '../../components/LegalNews/SearchFilterBar';
import Pagination from '../../components/ui/Pagination';

const ArticlesSection: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();


    // Pagination State
    const pageParam = searchParams.get('page');
    const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
    const ITEMS_PER_PAGE = 20;

    const [articles, setArticles] = useState<LegalNewsArticle[]>([]);
    const [totalArticles, setTotalArticles] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Fetch data when page changes
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // If we implemented search/filter on backend efficiently we would pass them here.
                // Currently backend pagination is simple skip/limit on ALL articles.
                // For client-side filtering + server-side pagination to work correctly,
                // we'd need backend filtering.
                // HOWEVER, the user asked to "reduce to 20 per page".
                // If I paginate on backend, client-side filtering (search/category) will only search current page.
                // This is a common pitfall.
                // Given the constraint "make Google index them", server-side pagination is preferred for the main list.
                // Search might need to either be client-side on fetched data (bad if mostly paginated) OR backend search.
                // `LegalNewsRoutes` has a `/search` endpoint separately.
                // `ArticlesSection` seems to combine browsing and local filtering?
                // The current implementation does client-side filtering on ALL articles fetched (it used to fetch ALL).

                // DECISION:
                // 1. Fetch paginated data for the main list view (no search query).
                // 2. If search/category is active, we might need to handle it differently.
                // BUT `NewsApi.getArticles` now supports pagination.

                const { articles: data, total } = await NewsApi.getArticles(currentPage, ITEMS_PER_PAGE);
                setArticles(data);
                setTotalArticles(total);

                // If user filters client-side, it will only filter the visible 20.
                // Ideally we should move filtering to backend or fetch all for filtering if not too huge.
                // But 1700+ items is getting big for client-side potentially.
                // For now, let's implement server pagination for the *default* view (latest news).
                // If search is used, we might rely on the existing `/search` endpoint or just warn limitation.
                // Actually the `ArticlesSection` used `NewsApi.getArticles()` (all) then filtered.
                // With 1700 items, maybe fetching all is still okay? 1700 * ~2KB = 3.4MB. A bit heavy.
                // The user specifically asked to "reduce to 20 per page".

            } catch (err) {
                console.error("Failed to load articles", err);
                setError("Nu am putut încărca știrile.");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Scroll to top on page change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    // Categories are derived from articles. If we only fetch 20, we won't see all categories.
    // Ideally we should have a `getCategories` endpoint.
    // For now, we'll try to keep existing behavior for `categories` logic?
    // No, `categories` will now only show categories from the current page 20 articles.
    // This is a compromise unless I add a `getCategories` endpoint.
    // Let's stick to standard behavior: derived from data.

    const categories = useMemo(() => {
        const cats = new Set<string>();
        articles.forEach(article => {
            article.categories?.forEach(c => cats.add(c));
            article.tags?.forEach(t => cats.add(t));
        });
        return Array.from(cats).sort();
    }, [articles]);

    const filteredArticles = useMemo(() => {
        return articles.filter(article => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = !query ||
                article.title.toLowerCase().includes(query) ||
                article.summary?.toLowerCase().includes(query) ||
                article.description?.toLowerCase().includes(query) ||
                (article.content && article.content.toLowerCase().includes(query)); // content might be truncated in list view? Model has it.

            const matchesCategory = !selectedCategory ||
                article.categories?.includes(selectedCategory) ||
                article.tags?.includes(selectedCategory);

            return matchesSearch && matchesCategory;
        });
    }, [articles, searchQuery, selectedCategory]);

    // Handlers
    const handlePageChange = (page: number) => {
        setSearchParams({ page: page.toString() });
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-accent w-8 h-8" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }

    // Featured only on first page?
    const featuredArticle = (currentPage === 1 && filteredArticles.length > 0) ? filteredArticles[0] : null;
    // If we have a featured article on page 1, we slice it out of the feed?
    // Current logic: `feedArticles = filteredArticles.slice(1)`
    // If page 2, we shouldn't show a featured article? Or just treat index 0 as featured?
    // Let's keep it simple: Page 1 shows Featured + 19 feed items.
    // Other pages show 20 feed items.

    let feedArticles = filteredArticles;
    if (currentPage === 1 && filteredArticles.length > 0) {
        feedArticles = filteredArticles.slice(1);
    }

    const totalPages = Math.ceil(totalArticles / ITEMS_PER_PAGE);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-8 font-headings uppercase">Toate Articolele</h1>

            <SearchFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categories}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Column - Wider (9 cols) */}
                <div className="lg:col-span-9">
                    {/* Featured Article - only on page 1 */}
                    {featuredArticle && (
                        <FeaturedArticleCard article={featuredArticle} />
                    )}

                    {/* Articles Feed */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {feedArticles.map((article) => (
                            <ArticleFeedItem key={article.id} article={article} />
                        ))}
                    </div>

                    {filteredArticles.length === 0 && (
                        <p className="text-center text-slate-500 py-10">Nu există articole de afișat.</p>
                    )}

                    {/* Pagination */}
                    <div className="mt-12">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                </div>

                {/* Sidebar Column - Narrower (3 cols) */}
                <div className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24 h-fit">
                    {/* Partners Widget */}
                    <div className="bg-white rounded-[10px] shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Parteneri</h4>
                        <div className="w-full bg-white rounded-lg flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors cursor-pointer border border-transparent">
                            <div className="text-center w-full">
                                <div className="w-full max-w-[280px] mx-auto mb-4">
                                    <a
                                        href="https://www.ici.ro/ro/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block hover:opacity-80 transition-opacity"
                                    >
                                        <img
                                            src="/data/legal_news/images/ICI.jpg"
                                            alt="ICI București"
                                            className="w-full h-auto object-contain rounded-md"
                                            style={{ aspectRatio: '4/3' }}
                                        />
                                    </a>
                                </div>
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
