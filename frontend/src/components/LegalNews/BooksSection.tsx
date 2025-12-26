import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsBook } from '../../types/news';
import BookCard from '../../components/LegalNews/BookCard';
import BookTabs from '../../components/LegalNews/BookTabs';

const BooksSection: React.FC = () => {
    const [books, setBooks] = useState<LegalNewsBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await NewsApi.getBooks();
                setBooks(data);
            } catch (err) {
                console.error("Failed to load books", err);
                setError("Nu am putut încărca cărțile.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-accent w-8 h-8" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 font-headings">Cărți</h2>

            <BookTabs />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12">
                {books.map(book => (
                    <BookCard key={book.id} book={book} />
                ))}
            </div>

            {books.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    Nu există cărți disponibile momentan.
                </div>
            )}
        </div>
    );
};

export default BooksSection;
