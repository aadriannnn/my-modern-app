import React from 'react';
import { Info } from 'lucide-react';
import { type LegalNewsBook } from '../../types/news';

interface BookCardProps {
    book: LegalNewsBook;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
    return (
        <div className="bg-white rounded-none shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100 group hover:-translate-y-1">
            <div className="relative bg-gray-50/50 p-8 flex items-center justify-center overflow-hidden h-80">
                <div className="absolute top-4 left-4 z-10">
                    <span className="inline-block px-2 py-0.5 bg-gray-900 text-white text-[10px] uppercase tracking-widest font-medium">
                        Editură
                    </span>
                </div>

                {book.imageUrl ? (
                    <img
                        src={book.imageUrl}
                        alt={book.title}
                        className="w-40 h-auto shadow-md transform group-hover:scale-105 transition-transform duration-500 ease-out"
                        style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                    />
                ) : (
                    <div className="w-40 h-56 bg-white border border-gray-200 flex items-center justify-center text-gray-300">
                        <span className="text-xs uppercase tracking-widest">No Cover</span>
                    </div>
                )}
            </div>

            <div className="p-8 flex-grow flex flex-col bg-white">
                <h3 className="text-xl font-serif text-slate-900 mb-2 leading-tight group-hover:text-blue-700 transition-colors">
                    {book.title}
                </h3>

                <p className="text-sm text-slate-500 font-medium italic mb-4 uppercase tracking-wide">
                    {book.author}
                </p>

                <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3 font-light">
                    {book.description}
                </p>

                <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-400">
                        N/A
                    </span>
                    <button className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50">
                        <Info size={18} strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookCard;
