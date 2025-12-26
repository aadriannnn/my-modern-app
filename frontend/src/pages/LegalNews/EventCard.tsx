import React from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { type LegalNewsEvent } from '../../types/news';

interface EventCardProps {
    event: LegalNewsEvent;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    const eventDate = new Date(event.date);
    const day = eventDate.getDate();
    const month = eventDate.toLocaleString('ro-RO', { month: 'short' }).toUpperCase();

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full border border-gray-100">
            <div className="relative h-48 bg-gray-100">
                {event.imageUrl ? (
                    <img
                        src={event.imageUrl?.startsWith('/') ? event.imageUrl : `/api/uploads/${event.imageUrl}`}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/e2e8f0/1e293b?text=Eveniment';
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <Calendar size={48} opacity={0.5} />
                    </div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-center shadow-sm min-w-[60px]">
                    <span className="block text-sm font-bold text-gray-500">{month}</span>
                    <span className="block text-2xl font-bold text-brand-secondary leading-none">{day}</span>
                </div>
            </div>

            <div className="p-5 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {event.title}
                </h3>

                {event.location && (
                    <div className="flex items-center text-gray-500 text-sm mb-3">
                        <MapPin size={16} className="mr-1.5" />
                        {event.location}
                    </div>
                )}

                <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
                    {event.description}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-primary">
                        {event.organizer || "Organizator Necunoscut"}
                    </span>
                    <button className="text-brand-accent hover:text-brand-accent-dark text-sm font-medium flex items-center transition-colors">
                        Detalii <ExternalLink size={14} className="ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventCard;
