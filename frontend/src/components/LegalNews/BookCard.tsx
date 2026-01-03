import React from 'react';
import { Book } from 'lucide-react';

interface Book {
    id: string;
    title: string;
    author: string;
    imageUrl?: string;
    price?: string;
    purchaseLink?: string;
}

interface BookCardProps {
    book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
    const { title, author, imageUrl, price } = book;

    // Clean up price if it exists
    const displayPrice = price ? price : '';

    return (
        <div className="group flex flex-col items-center">
            {/* 3D Book Cover Container */}
            <div className="relative w-full max-w-[180px] aspect-[2/3] mb-6 perspective-1000 group-hover:scale-105 transition-transform duration-300">
                <div className="relative w-full h-full shadow-xl rounded-r-md rounded-l-sm bg-gray-50 transform-style-3d rotate-y-[-5deg] group-hover:rotate-y-0 transition-transform duration-500 origin-left">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover rounded-r-md rounded-l-sm shadow-inner"
                            onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-800 text-white flex flex-col items-center justify-center p-4 text-center rounded-r-md rounded-l-sm">
                            <Book className="w-10 h-10 mb-2 opacity-50" />
                            <span className="text-xs font-serif italic line-clamp-3">{title}</span>
                        </div>
                    )}

                    {/* Book Spine (Fake 3D) */}
                    <div className="absolute top-0 bottom-0 left-0 w-3 bg-slate-900 transform -translate-x-full origin-right rotate-y-90 opacity-80 rounded-l-sm"></div>

                    {/* Gloss Highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-r-md rounded-l-sm"></div>
                </div>
            </div>

            <div className="text-center w-full">
                <h3 className="text-base font-bold text-slate-900 leading-tight mb-1 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-700 transition-colors cursor-pointer">
                    {title}
                </h3>
                <p className="text-sm text-slate-500 mb-2 truncate px-2">{author}</p>

                {displayPrice && (
                    <div className="text-slate-900 font-semibold text-sm">
                        {displayPrice}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookCard;
