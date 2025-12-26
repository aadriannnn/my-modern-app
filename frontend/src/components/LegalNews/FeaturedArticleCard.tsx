import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ArrowRight } from 'lucide-react';

interface Article {
    title: string;
    summary?: string;
    description?: string;
    imageUrl?: string;
    slug: string;
    publishDate?: string | Date;
    categories?: string[];
    tags?: string[];
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
        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 mb-8">
            <div className="flex flex-col md:flex-row items-stretch">
                {/* Image Column */}
                {imageUrl && (
                    <div className="w-full md:w-[45%] lg:w-[40%] flex-shrink-0 relative overflow-hidden group">
                        <Link to={articleUrl} className="block h-full min-h-[250px]">
                            <img
                                src={imageUrl}
                                alt={title}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Link>
                    </div>
                )}

                {/* Content Column */}
                <div className="flex-1 p-6 md:p-8 flex flex-col items-start justify-center">
                    <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 mb-4 items-center">
                        {categories && categories.length > 0 && (
                            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                <Tag className="w-3.5 h-3.5" />
                                <span className="uppercase tracking-wide">{categories[0]}</span>
                            </div>
                        )}
                        {publishDate && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDate(publishDate)}</span>
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-4 font-headings">
                        <Link to={articleUrl} className="hover:text-blue-700 transition-colors">
                            {title}
                        </Link>
                    </h2>

                    <p className="text-slate-600 mb-6 line-clamp-3 leading-relaxed flex-grow">
                        {displaySummary}
                    </p>

                    <Link
                        to={articleUrl}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors group"
                    >
                        Citește tot
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default FeaturedArticleCard;
