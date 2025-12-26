import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const tabs = [
    { path: '/stiri', label: 'Noutăți' },
    { path: '/evenimente', label: 'Evenimente' },
    { path: '/editura', label: 'Editura' },
    { path: '/cariere', label: 'Cariere' },
    { path: '/profesionisti', label: 'Profesioniști' },
];

const LegalNewsTabs: React.FC = () => {
    const location = useLocation();

    // Determine active tab based on current path
    // Default to /stiri if exact match or sub-paths
    const isActive = (path: string) => {
        if (path === '/stiri' && (location.pathname === '/stiri' || location.pathname.startsWith('/stiri/'))) return true;
        return location.pathname.startsWith(path);
    };

    return (
        <div className="border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => {
                    const active = isActive(tab.path);
                    return (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                ${active
                                    ? 'border-brand-accent text-brand-accent'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default LegalNewsTabs;
