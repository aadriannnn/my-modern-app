import React from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';

interface Article {
    title: string;
    imageUrl?: string;
    slug: string;
    publishDate?: string | Date;
    categories?: string[];
}

interface ArticleFeedItemProps {
    article: Article;
}

const ArticleFeedItem: React.FC<ArticleFeedItemProps> = ({ article }) => {
    if (!article) return null;

    const { title, imageUrl, slug, publishDate, categories } = article;
    const articleUrl = `/stiri/articol/${slug}`;

    const formatDate = (dateInput: string | Date | undefined) => {
        if (!dateInput) return '';
        try {
            const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
            return date.toLocaleDateString('ro-RO', {
                day: 'numeric',
                month: 'short',
            });
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="group bg-white rounded-[10px] shadow-sm hover:shadow-md border border-gray-100 transition-all duration-300 h-full flex flex-col md:flex-row overflow-hidden">
            {/* Image Column */}
            <div className="md:w-[28%] relative overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center min-h-[160px]">
                {/* Decorative Background Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
                    <Scale className="w-24 h-24 text-gray-200 transform -rotate-12" />
                </div>

                {imageUrl ? (
                    <Link to={articleUrl} className="relative block w-full h-full z-10">
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-contain p-2"
                        />
                        <div className="absolute inset-0 bg-brand-dark/0 group-hover:bg-brand-dark/10 transition-colors duration-300" />
                    </Link>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-gold/20 z-10">
                        <Scale className="w-12 h-12" />
                    </div>
                )}
            </div>

            {/* Content Column */}
            <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex flex-wrap gap-3 mb-3 items-center">
                    {categories && categories.length > 0 && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded capitalize">
                            {categories[0].toLowerCase()}
                        </span>
                    )}
                    {publishDate && (
                        <span className="text-xs text-slate-400">
                            {formatDate(publishDate)}
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-serif font-bold text-slate-900 leading-snug group-hover:text-brand-primary transition-colors line-clamp-3 mb-2">
                    <Link to={articleUrl}>
                        {title}
                    </Link>
                </h3>
            </div>
        </div>
    );
};

export default ArticleFeedItem;
