import type {
    LegalNewsArticle,
    LegalNewsAuthor,
    LegalNewsBook,
    LegalNewsEvent,
    LegalNewsJob
} from '../types/news';

const API_BASE = '/api/legal-news';

async function fetchJson<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
    }
    return response.json();
}

interface NewsApiInterface {
    getArticles: (page?: number, limit?: number, searchQuery?: string, category?: string) => Promise<{ articles: LegalNewsArticle[], total: number }>;
    getArticle: (slugOrId: string) => Promise<LegalNewsArticle>;
    getAuthors: (limit?: number) => Promise<LegalNewsAuthor[]>;
    getEvents: (limit?: number) => Promise<LegalNewsEvent[]>;
    getBooks: (limit?: number) => Promise<LegalNewsBook[]>;
    getJobs: (limit?: number) => Promise<LegalNewsJob[]>;
}

export const NewsApi: NewsApiInterface = {
    getArticles: async (page = 1, limit = 20, searchQuery?: string, category?: string): Promise<{ articles: LegalNewsArticle[], total: number }> => {
        const skip = (page - 1) * limit;
        let url = `${API_BASE}/articles?skip=${skip}&limit=${limit}`;
        if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch articles: ${response.statusText}`);
        }
        const total = parseInt(response.headers.get('X-Total-Count') || '0', 10);
        const articles = await response.json();
        return { articles, total };
    },

    getArticle: (slugOrId: string) => fetchJson<LegalNewsArticle>(`/articles/${slugOrId}`),

    getAuthors: (limit = 20) => fetchJson<LegalNewsAuthor[]>(`/authors?limit=${limit}`),

    getEvents: (limit = 20) => fetchJson<LegalNewsEvent[]>(`/events?limit=${limit}`),

    getBooks: (limit = 20) => fetchJson<LegalNewsBook[]>(`/books?limit=${limit}`),

    getJobs: (limit = 20) => fetchJson<LegalNewsJob[]>(`/jobs?limit=${limit}`),
};
