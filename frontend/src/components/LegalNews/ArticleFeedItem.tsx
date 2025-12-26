import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag } from 'lucide-react';

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
        <div className="flex flex-row items-start gap-4 py-5 border-b border-slate-100 last:border-0 group">
            {/* Image Column */}
            <div className="flex-shrink-0 w-[80px] sm:w-[110px] h-[60px] sm:h-[80px] rounded-lg overflow-hidden bg-slate-100">
                {imageUrl ? (
                    <Link to={articleUrl} className="block w-full h-full">
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                    </Link>
                ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                        <Tag className="w-6 h-6" />
                    </div>
                )}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-1.5 items-center">
                    {categories && categories.length > 0 && (
                        <div className="flex items-center gap-1 text-blue-600 font-medium">
                            <Tag className="w-3 h-3" />
                            <span>{categories[0]}</span>
                        </div>
                    )}
                    {publishDate && (
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(publishDate)}</span>
                        </div>
                    )}
                </div>

                <h3 className="text-base font-semibold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                    <Link to={articleUrl}>
                        {title}
                    </Link>
                </h3>
            </div>
        </div>
    );
};

export default ArticleFeedItem;
