import React from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../../hooks/useLegalNewsData';

interface BookCardProps {
    book: Book;
    headingColor?: string;
    textColor?: string;
    linkColor?: string;
    linkHoverColor?: string;
    subtleTextColor?: string;
}

const BookCard: React.FC<BookCardProps> = ({
    book,
}) => {
    let authorsDisplay = '';
    if (Array.isArray(book.authors)) {
        authorsDisplay = book.authors.join(', ');
    } else if (typeof book.authors === 'string') {
        authorsDisplay = book.authors;
    } else if (book.author) {
        authorsDisplay = book.author;
    }

    const detailLink = book.slug ? `/stiri/carte/${book.slug}` : '#';

    return (
        <div className="group relative block h-full overflow-hidden rounded-md border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-full flex-col space-y-3">
                <div className="relative w-full pt-[100%] bg-gray-100 dark:bg-gray-700">
                    <img
                        src={book.coverImageUrl || 'https://via.placeholder.com/200x250.png?text=Copertă'}
                        alt={`Copertă ${book.title || 'carte'}`}
                        className="absolute top-0 left-0 h-full w-full object-contain p-2"
                    />
                </div>

                <div className="flex flex-1 flex-col p-4 pt-2">
                    <h3 className="line-clamp-3 min-h-[3.6em] text-sm font-medium leading-tight text-gray-900 dark:text-gray-100">
                        <Link to={detailLink}>
                            <span className="absolute inset-0" />
                            {book.title || 'Titlu indisponibil'}
                        </Link>
                    </h3>

                    {authorsDisplay && (
                        <p className="mt-1 line-clamp-2 min-h-[2.4em] text-xs text-gray-500 dark:text-gray-400">
                            {authorsDisplay}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookCard;
