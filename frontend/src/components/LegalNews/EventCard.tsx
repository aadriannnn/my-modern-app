import React from 'react';
import { MapPin, Calendar, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Event {
    id: string;
    slug: string;
    title: string;
    description?: string;
    date: string | Date;
    location?: string;
    imageUrl?: string;
    organizer?: string;
    isLive?: boolean;
    isArchived?: boolean;
    detailsLink?: string; // External or internal link
}

interface EventCardProps {
    event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    const { title, date, location, imageUrl, isLive, isArchived, detailsLink, slug } = event;

    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString('ro-RO', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const linkTarget = detailsLink || `/evenimente/${slug}`;
    const isExternal = detailsLink?.startsWith('http');

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-slate-200 flex flex-col h-full">
            {/* Banner Section */}
            <div className="relative h-48 bg-slate-100 group">
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white p-6 text-center">
                        <span className="text-xl font-bold opacity-50">Legal News Event</span>
                    </div>
                )}

                {isLive && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                        LIVE
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-3 leading-snug font-serif">
                    {isExternal ? (
                        <a href={linkTarget} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 transition-colors">
                            {title}
                        </a>
                    ) : (
                        <Link to={linkTarget} className="hover:text-blue-700 transition-colors">
                            {title}
                        </Link>
                    )}
                </h3>

                <div className="space-y-2 mb-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{formattedDate}, {formattedTime}</span>
                    </div>
                    {location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>{location}</span>
                        </div>
                    )}
                </div>

                <div className="mt-auto">
                    {isExternal ? (
                        <a
                            href={linkTarget}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block w-full py-2.5 px-4 rounded-lg text-center font-medium border transition-colors ${isArchived
                                    ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                                }`}
                        >
                            {isArchived ? 'ARHIVĂ' : 'Detalii'}
                        </a>
                    ) : (
                        <Link
                            to={linkTarget}
                            className={`block w-full py-2.5 px-4 rounded-lg text-center font-medium border transition-colors ${isArchived
                                    ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                                }`}
                        >
                            {isArchived ? 'ARHIVĂ' : 'Detalii'}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventCard;
