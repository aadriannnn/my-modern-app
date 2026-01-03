import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ArrowRight, Scale } from 'lucide-react';

interface Article {
    title: string;
    summary?: string;
    description?: string;
    imageUrl?: string;
    slug: string;
    publishDate?: string | Date;
    categories?: string[];
    tags?: string[];
    readTime?: string;
}

interface FeaturedArticleCardProps {
    article: Article;
}

const FeaturedArticleCard: React.FC<FeaturedArticleCardProps> = ({ article }) => {
    if (!article) return null;

    const { title, summary, description, imageUrl, slug, publishDate, categories } = article;
    const articleUrl = `/stiri/articol/${slug}`;
    const displaySummary = summary || description || '';

    const formatDate = (dateInput: string | Date | undefined) => {
        if (!dateInput) return '';
        try {
            const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
            return date.toLocaleDateString('ro-RO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-500 border border-gray-100 mb-12">
            <div className="flex flex-col md:flex-row items-stretch p-2 md:p-4 gap-6">
                {/* Image Column - Adjusted Ratio & Context */}
                {imageUrl && (
                    <div className="w-full md:w-[45%] relative overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 min-h-[280px] rounded-lg">
                        {/* Decorative Background Icon (Smart Fill) */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
                            <Scale className="w-48 h-48 text-gray-200 transform -rotate-12" />
                        </div>

                        <Link to={articleUrl} className="relative block w-full z-10 h-full">
                            <img
                                src={imageUrl}
                                alt={title}
                                className="w-full h-full object-contain object-center shadow-sm rounded-lg"
                            />
                            {/* Overlay for hover effect */}
                            <div className="absolute inset-0 bg-brand-dark/5 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-lg" />
                        </Link>
                    </div>
                )}

                {/* Content Column */}
                <div className="flex-1 py-4 pr-4 md:py-6 flex flex-col justify-center bg-white relative">

                    <div className="flex flex-wrap gap-4 text-xs font-semibold tracking-wide text-slate-500 mb-4 items-center uppercase">
                        {categories && categories.length > 0 && (
                            <div className="flex items-center gap-2 text-brand-gold/80 bg-brand-gold/5 px-2 py-0.5 rounded">
                                <Tag className="w-3 h-3" />
                                <span>{categories[0]}</span>
                            </div>
                        )}
                        {publishDate && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDate(publishDate)}</span>
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-serif font-semibold text-brand-dark leading-relaxed mb-4 line-clamp-2">
                        <Link to={articleUrl} className="hover:text-brand-primary transition-colors">
                            {title}
                        </Link>
                    </h2>

                    <p className="text-slate-600 text-[15px] leading-relaxed mb-6 line-clamp-2 font-light">
                        {displaySummary}
                    </p>

                    <div className="mt-auto pt-2">
                        <Link
                            to={articleUrl}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white text-sm font-medium rounded-lg hover:bg-brand-primary transition-colors duration-300 shadow-sm"
                        >
                            Citește analiza
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeaturedArticleCard;
