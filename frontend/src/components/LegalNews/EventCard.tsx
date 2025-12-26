import React from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../hooks/useLegalNewsData';

const isExternalLink = (link?: string) => link ? /^https?:\/\//.test(link) : false;

const formatEventDateTime = (dateObject?: Date) => {
    if (!dateObject || !(dateObject instanceof Date) || isNaN(dateObject.getTime())) {
        return 'Dată invalidă';
    }
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    const formattedDate = dateObject.toLocaleDateString('ro-RO', dateOptions);
    const formattedTime = dateObject.toLocaleTimeString('ro-RO', timeOptions);

    return `${formattedDate}, ${formattedTime}`;
};

interface EventCardProps {
    event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    if (!event) return null;

    const formattedDate = formatEventDateTime(event.dateObject);
    const detailLink = event.pageUrl;
    const isExternal = isExternalLink(detailLink);

    const bannerImageUrl = event.bannerImageUrl;

    return (
        <div className="group overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col">
                <div className="relative min-h-[150px]">
                    {bannerImageUrl ? (
                        <img
                            src={bannerImageUrl}
                            alt={`Banner pentru ${event.title}`}
                            className="h-[150px] w-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="min-h-[150px] bg-gray-200 dark:bg-gray-700" />
                    )}
                </div>

                <div className="p-4">
                    <h3
                        className="mb-2 min-h-[3.6em] line-clamp-3 text-sm font-semibold text-gray-800 dark:text-gray-100"
                        title={event.title}
                    >
                        {event.title}
                    </h3>
                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                        {formattedDate} {event.location && `• ${event.location}`}
                    </p>
                    {isExternal ? (
                        <a
                            href={detailLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center rounded-md border border-blue-500 bg-transparent px-4 py-2 text-sm font-medium text-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                            Detalii
                        </a>
                    ) : (
                        <Link
                            to={detailLink || '#'}
                            className="inline-flex w-full items-center justify-center rounded-md border border-blue-500 bg-transparent px-4 py-2 text-sm font-medium text-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                            Detalii
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventCard;
