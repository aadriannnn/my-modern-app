import React from 'react';

interface TabProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const tabs = [
    { id: 'news', label: 'Noutăți' },
    { id: 'events', label: 'Evenimente' },
    { id: 'books', label: 'Editura' },
    { id: 'jobs', label: 'Cariere' },
    { id: 'authors', label: 'Profesioniști' },
];

const LegalNewsTabs: React.FC<TabProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                            ${activeTab === tab.id
                                ? 'border-brand-accent text-brand-accent'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default LegalNewsTabs;
