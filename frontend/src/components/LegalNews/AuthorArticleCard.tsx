import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';

interface Article {
    title: string;
    slug: string;
    publishDate?: string | Date;
    summary?: string;
    imageUrl?: string;
}

interface Author {
    id: string;
    name: string;
    profileImageUrl?: string;
    title?: string;
}

interface AuthorArticleCardProps {
    article: Article;
    author: Author;
}

const AuthorArticleCard: React.FC<AuthorArticleCardProps> = ({ article, author }) => {
    const { title, slug, publishDate, imageUrl } = article;
    const articleUrl = `/stiri/articol/${slug}`;
    const authorUrl = `/stiri/autor/${author.id}`;

    const formatDate = (dateInput: string | Date | undefined) => {
        if (!dateInput) return '';
        try {
            const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
            return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch { return ''; }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-100 p-4 hover:shadow-md transition-shadow duration-300 flex flex-col sm:flex-row gap-4 items-start">
            {/* Article Image (Optional or small) */}
            {imageUrl && (
                <div className="w-full sm:w-[120px] h-[90px] flex-shrink-0 rounded-md overflow-hidden bg-slate-100">
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                </div>
            )}

            <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">
                    <Link to={articleUrl} className="hover:text-blue-700 transition-colors">
                        {title}
                    </Link>
                </h3>

                <div className="flex items-center gap-3 mt-3">
                    <Link to={authorUrl} className="flex items-center gap-2 group">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200">
                            {author.profileImageUrl ? (
                                <img src={author.profileImageUrl} alt={author.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-200 flex items-center justify-center"><User className="w-3 h-3 text-slate-400" /></div>
                            )}
                        </div>
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                            {author.name}
                        </span>
                    </Link>

                    {publishDate && (
                        <>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(publishDate)}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthorArticleCard;
