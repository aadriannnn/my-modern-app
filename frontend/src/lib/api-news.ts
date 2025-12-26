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
    getArticles: (limit = 50) => fetchJson<LegalNewsArticle[]>(`/articles?limit=${limit}`),

    getArticle: (slugOrId: string) => fetchJson<LegalNewsArticle>(`/articles/${slugOrId}`),

    getAuthors: (limit = 20) => fetchJson<LegalNewsAuthor[]>(`/authors?limit=${limit}`),

    getEvents: (limit = 20) => fetchJson<LegalNewsEvent[]>(`/events?limit=${limit}`),

    getBooks: (limit = 20) => fetchJson<LegalNewsBook[]>(`/books?limit=${limit}`),

    getJobs: (limit = 20) => fetchJson<LegalNewsJob[]>(`/jobs?limit=${limit}`),
};
