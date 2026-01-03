import React from 'react';

const tabs = ['Toate', 'Noutăți', 'Recomandări', 'Tratate', 'Cursuri și Monografii', 'Jurisprudență', 'Legislație Comentată', 'Mai Mult'];

const BookTabs: React.FC = () => {
    return (
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-slate-200 pb-4">
            {tabs.map((tab, index) => (
                <button
                    key={tab}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${index === 0
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
};

export default BookTabs;
