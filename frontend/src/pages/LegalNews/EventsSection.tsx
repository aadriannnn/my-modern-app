import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsEvent } from '../../types/news';
import EventCard from './EventCard';

const EventsSection: React.FC = () => {
    const [events, setEvents] = useState<LegalNewsEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await NewsApi.getEvents();
                setEvents(data);
            } catch (err) {
                console.error("Failed to load events", err);
                setError("Nu am putut încărca evenimentele.");
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
                <EventCard key={event.id} event={event} />
            ))}
            {events.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                    Nu există evenimente programate momentan.
                </div>
            )}
        </div>
    );
};

export default EventsSection;
