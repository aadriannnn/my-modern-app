
import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Event {
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
    detailsLink?: string;
    category?: string;
}

interface EventCardProps {
    event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    const { title, date, location, imageUrl, isLive, description, detailsLink, slug, category } = event;

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

    const linkTarget = detailsLink || `/ evenimente / ${slug} `;
    const isExternal = detailsLink?.startsWith('http');

    return (
        <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-slate-100 flex flex-col h-full">
            {/* Image/Hero Section */}
            <div className="relative h-56 overflow-hidden bg-slate-100">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white p-6 text-center">
                        <span className="text-xl font-serif text-slate-300">Legal News Event</span>
                    </div>
                )}

                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-slate-900/40 to-transparent opacity-60"></div>

                {/* Badges */}
                <div className="absolute top-4 right-4 flex gap-2">
                    {/* Online Badge */}
                    {isLive && (
                        <div className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            ONLINE
                        </div>
                    )}
                </div>

                {/* Category Badge overlay bottom left */}
                {category && (
                    <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded shadow-sm">
                        {category}
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-1.5 min-w-max">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-slate-700">{formattedDate}</span>
                    </div>
                    {(location || formattedTime) && (
                        <div className="flex items-center gap-1.5 text-xs truncate">
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{formattedTime}</span>
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-bold text-[#0F172A] mb-3 leading-tight font-serif group-hover:text-blue-700 transition-colors">
                    {isExternal ? (
                        <a href={linkTarget} target="_blank" rel="noopener noreferrer">
                            {title}
                        </a>
                    ) : (
                        <Link to={linkTarget}>
                            {title}
                        </Link>
                    )}
                </h3>

                {description && (
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
                        {description}
                    </p>
                )}

                <div className="mt-auto">
                    {isExternal ? (
                        <a
                            href={linkTarget}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-blue-600 transition-all duration-300 border border-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white"
                        >
                            Înregistrează-te
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </a>
                    ) : (
                        <Link
                            to={linkTarget}
                            className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-blue-600 transition-all duration-300 border border-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white"
                        >
                            Înregistrează-te
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventCard;
