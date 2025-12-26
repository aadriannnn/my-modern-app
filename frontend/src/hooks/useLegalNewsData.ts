import { useState, useEffect, useCallback } from 'react';

// Define types based on backend models
export interface LegalNewsArticle {
    id: string;
    slug: string;
    title: string;
    summary?: string;
    description?: string;
    content: string;
    publishDate: string;
    authorId?: string;
    authorName?: string;
    imageFileName?: string;
    imageUrl?: string;
    tags?: string[];
    categories?: string[];
    matchType?: string; // For search results
}

export interface LegalNewsBook {
    id: string;
    title: string;
    author?: string;
    authors?: string[] | string;
    description?: string;
    price?: string;
    imageUrl?: string;
    coverImageUrl?: string;
    purchaseLink?: string;
    slug?: string;
    publishDateObject?: Date;
    publishDate?: string;
}

export interface LegalNewsEvent {
    id: string;
    title: string;
    description?: string;
    date: string;
    dateObject?: Date;
    location?: string;
    imageUrl?: string;
    organizer?: string;
    pageUrl?: string;
    bannerImageUrl?: string;
    detailsLink?: string;
}

export interface LegalNewsJob {
    id: string;
    title: string;
    company: string;
    location?: string;
    datePosted: string;
    postedDateObject?: Date;
    applyLink?: string;
    requirements?: string[];
    companyLogoUrl?: string;
}

export interface LegalNewsSearchResultItem {
    id: string;
    title: string;
    slug: string;
    summary?: string;
    publishDate?: string;
    authorName?: string;
    matchType: string;
    imageUrl?: string;
}

export type Article = LegalNewsArticle;
export type Book = LegalNewsBook;
export type Event = LegalNewsEvent;
export type Job = LegalNewsJob;

export interface Author {
    id: string;
    name: string;
    imageUrl?: string;
    bio?: string;
    title?: string;
    profileUrl?: string;
}

export const useLegalNewsData = () => {
    const [articles, setArticles] = useState<LegalNewsArticle[]>([]);
    const [books, setBooks] = useState<LegalNewsBook[]>([]);
    const [events, setEvents] = useState<LegalNewsEvent[]>([]);
    const [jobs, setJobs] = useState<LegalNewsJob[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch in parallel
            const [artRes, bookRes, evRes, jobRes] = await Promise.all([
                fetch('/api/legal-news/articles'),
                fetch('/api/legal-news/books'),
                fetch('/api/legal-news/events'),
                fetch('/api/legal-news/jobs')
            ]);

            if (!artRes.ok) throw new Error('Failed to fetch articles');
            if (!bookRes.ok) throw new Error('Failed to fetch books');
            if (!evRes.ok) throw new Error('Failed to fetch events');
            if (!jobRes.ok) throw new Error('Failed to fetch jobs');

            setArticles(await artRes.json());
            setBooks(await bookRes.json());
            setEvents(await evRes.json());
            setJobs(await jobRes.json());
        } catch (err: any) {
            setError(err.message || 'Error loading legal news data');
        } finally {
            setLoading(false);
        }
    }, []);

    const searchNews = async (query: string): Promise<LegalNewsSearchResultItem[]> => {
        try {
            const res = await fetch(`/api/legal-news/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.results || [];
        } catch (e) {
            console.error("Search error:", e);
            return [];
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { articles, books, events, jobs, loading, error, searchNews, refresh: fetchData };
};
