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

export const NewsApi = {
    getArticles: async (page = 1, limit = 20): Promise<{ articles: LegalNewsArticle[], total: number }> => {
        const skip = (page - 1) * limit;
        const response = await fetch(`${API_BASE}/articles?skip=${skip}&limit=${limit}`);
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
