import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import { type LegalNewsArticle } from '../../types/news';

interface NewsCardProps {
    article: LegalNewsArticle;
}

const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
    const formattedDate = new Date(article.publishDate).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <Link
            to={`/stiri/articol/${article.slug || article.id}`}
            className="group flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 hover:border-brand-accent/30 h-full"
        >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden bg-gray-100">
                {article.imageUrl ? (
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Stiri+Juridice'; // Fallback
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-light/30">
                        <span className="text-gray-400 font-medium">Fără Imagine</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                {/* Category Badge (if available - taking first one) */}
                {article.categories && article.categories.length > 0 && (
                    <span className="absolute top-3 left-3 bg-brand-accent text-brand-dark text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {article.categories[0]}
                    </span>
                )}
            </div>

            {/* Content Container */}
            <div className="flex-1 p-5 flex flex-col">
                <div className="flex items-center text-xs text-gray-500 mb-3 space-x-3">
                    <div className="flex items-center">
                        <Calendar size={14} className="mr-1 text-brand-accent" />
                        <time dateTime={article.publishDate}>{formattedDate}</time>
                    </div>
                    {article.authorName && (
                        <div className="flex items-center">
                            <User size={14} className="mr-1 text-brand-accent" />
                            <span className="truncate max-w-[120px]">{article.authorName}</span>
                        </div>
                    )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-brand-accent transition-colors">
                    {article.title}
                </h3>

                <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
                    {article.summary || article.description || "Citește întregul articol pentru a afla mai multe detalii despre acest subiect juridic important."}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-50">
                    <span className="text-sm font-semibold text-brand-accent group-hover:text-brand-dark transition-colors flex items-center">
                        Citește mai mult
                        <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </span>
                </div>
            </div>
        </Link>
    );
};

export default NewsCard;
