import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsArticle } from '../../types/news';
import FeaturedArticleCard from '../../components/LegalNews/FeaturedArticleCard';
import ArticleFeedItem from '../../components/LegalNews/ArticleFeedItem';
import SearchFilterBar from '../../components/LegalNews/SearchFilterBar';
import Pagination from '../../components/ui/Pagination';

interface ArticlesSectionProps {
    initialCategory?: string;
}

const ArticlesSection: React.FC<ArticlesSectionProps> = ({ initialCategory }) => {
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
    const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);

    // Fetch data when page, search, or category changes
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Pass search query and selected category to the backend
                const result = await NewsApi.getArticles(currentPage, ITEMS_PER_PAGE, searchQuery, selectedCategory || undefined);
                setArticles(result.articles);
                setTotalArticles(result.total);
            } catch (err) {
                console.error("Failed to load articles", err);
                setError("Nu am putut încărca știrile.");
            } finally {
                setLoading(false);
            }
        };

        // Debounce search slightly to avoid too many requests while typing if desired,
        // but for now relying on strict effect dependency.
        const timeoutId = setTimeout(() => {
            loadData();
        }, 300); // Simple debounce

        return () => clearTimeout(timeoutId);
    }, [currentPage, searchQuery, selectedCategory]);

    // Categories are derived from articles on the current page.
    // Ideally we should have a `getCategories` endpoint to show all available categories even if not on page 1.
    // For now, let's just stick to the 10 known broad categories we implemented server-side.
    // Since we know the categories are fixed, we can hardcode them or just fetch them once.
    // But since the current code derives them, let's keep it but note it only shows categories present in current view.
    // Actually, user wants the dropdown to work. If we filter by 'Drept Penal', the dropdown works.
    // But if we want to populate the dropdown initially, we need all categories.
    // The previous implementation derived from loaded articles, which was fine when it loaded ALL.
    // Now it loads 20. So the filter list might be empty or partial.
    // FIX: Hardcode the known taxonomy for the filter dropdown to ensure all are selectable.
    const KNOWN_CATEGORIES = [
        "Dreptul Familiei și Violență Domestică",
        "Drept Penal: Criminalitate Organizată și Trafic",
        "Drept Penal: Corupție și Infracțiuni de Serviciu",
        "Drept Penal: Infracțiuni Rutiere",
        "Drept Penal: Infracțiuni contra Persoanei",
        "Drept Penal: Infracțiuni contra Patrimoniului",
        "Drept Penal: Infracțiuni Economice și Fals",
        "Drept Civil și Administrativ",
        "Drept Penal (General)",
        "Jurisprudență (General)"
    ].sort();

    const categories = useMemo(() => {
        // Use known categories plus any others found (if any mismatch exists)
        const cats = new Set<string>(KNOWN_CATEGORIES);
        articles.forEach(article => {
            article.categories?.forEach(c => cats.add(c));
        });
        return Array.from(cats).sort();
    }, [articles]);

    // No more client-side filtering
    const filteredArticles = articles;

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
            <div className="flex flex-wrap items-center gap-3 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 font-headings uppercase m-0">Toate Articolele</h1>
                <div className="bg-[#EFF4FA] rounded-[10px] px-3 py-1.5 flex items-baseline gap-1.5 select-none transition-all duration-200">
                    <span className="text-[#1E3A5F] font-bold text-2xl font-headings leading-none">
                        {totalArticles.toLocaleString('ro-RO')}
                    </span>
                    <span className="text-[#6B7280] text-base font-normal font-sans opacity-80 leading-none lowercase">
                        articole
                    </span>
                </div>
            </div>

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
