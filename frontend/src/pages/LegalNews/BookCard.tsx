import React from 'react';
import { ShoppingCart, BookOpen } from 'lucide-react';
import { type LegalNewsBook } from '../../types/news';

interface BookCardProps {
    book: LegalNewsBook;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100 group">
            <div className="h-64 bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
                {book.imageUrl ? (
                    <img
                        src={`/api/uploads/${book.imageUrl}`}
                        alt={book.title}
                        className="h-full object-contain shadow-md group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : null}
                {(!book.imageUrl || (book.imageUrl && false)) && (
                    // Fallback logic handled by onError usually, but explicit logic here:
                    <div className="h-40 w-28 bg-white border border-gray-200 shadow flex items-center justify-center text-gray-300">
                        <BookOpen size={32} />
                    </div>
                )}
                {/* Explicit fallback if image fails to load or is null hidden by previous logic block.
                     Simpler approach: */}
                {!book.imageUrl && (
                    <div className="h-40 w-28 bg-white border border-gray-200 shadow flex items-center justify-center text-gray-300">
                        <BookOpen size={32} />
                    </div>
                )}
            </div>

            <div className="p-5 flex-grow flex flex-col">
                <div className="mb-2">
                    <span className="text-xs font-bold tracking-wider text-brand-accent uppercase">
                        Editură
                    </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-snug line-clamp-2">
                    {book.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3 font-medium">
                    {book.author}
                </p>

                <p className="text-gray-500 text-sm line-clamp-3 mb-4 flex-grow">
                    {book.description}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                        {book.price || "N/A"}
                    </span>
                    <button className="bg-brand-primary text-white p-2 rounded-lg hover:bg-brand-primary-dark transition-colors" title="Cumpără">
                        <ShoppingCart size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookCard;
