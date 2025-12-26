import { useState, useEffect, useCallback } from 'react';

export interface Event {
    id: string | number;
    title: string;
    date: string;
    location: string;
    description: string;
    bannerImageUrl: string;
    pageUrl?: string; // Sometimes used if external
    slug?: string;
    dateObject?: Date;
}

const useEventsData = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<{ message: string } | null>(null);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setEvents([]);

        try {
            const response = await fetch('/data/legal_news/events.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Event[] = await response.json();

            const processedEvents = data
                .map(event => ({
                    ...event,
                    dateObject: new Date(event.date),
                }))
                .sort((a, b) => {
                    if (a.dateObject && b.dateObject) {
                        return b.dateObject.getTime() - a.dateObject.getTime();
                    }
                    return 0;
                });

            setEvents(processedEvents);

        } catch (err: any) {
            console.error("Failed to fetch or process events data:", err);
            setError({ message: err.message || 'A apărut o eroare la preluarea evenimentelor.' });
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return { events, isLoading, error };
};

export default useEventsData;
