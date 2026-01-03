import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsAuthor } from '../../types/news';
import AuthorCard from './AuthorCard';

const AuthorsSection: React.FC = () => {
    const [authors, setAuthors] = useState<LegalNewsAuthor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await NewsApi.getAuthors();
                setAuthors(data);
            } catch (err) {
                console.error("Failed to load authors", err);
                setError("Nu am putut încărca lista de profesioniști.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-accent" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {authors.map(author => (
                <AuthorCard key={author.id} author={author} />
            ))}
        </div>
    );
};

export default AuthorsSection;
