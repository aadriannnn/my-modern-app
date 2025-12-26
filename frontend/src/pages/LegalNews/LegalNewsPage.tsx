import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import LegalNewsTabs from './LegalNewsTabs';
import ArticlesSection from './ArticlesSection';
import EventsSection from './EventsSection';
import BooksSection from './BooksSection';
import JobsSection from './JobsSection';
import AuthorsSection from './AuthorsSection';

const LegalNewsPage: React.FC = () => {
    const location = useLocation();

    const toggleMenu = () => {
        console.log("Toggle menu");
    };

    const handleContribuieClick = () => {
        console.log("Contribuie click");
    };

    const renderContent = () => {
        const path = location.pathname;
        if (path === '/stiri' || path.startsWith('/stiri/')) return <ArticlesSection />;
        if (path.startsWith('/evenimente')) return <EventsSection />;
        if (path.startsWith('/editura')) return <BooksSection />;
        if (path.startsWith('/cariere')) return <JobsSection />;
        if (path.startsWith('/profesionisti')) return <AuthorsSection />;
        return <ArticlesSection />;
    };

    return (
        <div className="min-h-screen bg-brand-light flex flex-col font-sans">
            <Header onToggleMenu={toggleMenu} onContribuieClick={handleContribuieClick} />

            <div className="bg-white border-b border-gray-200 py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">
                        Jurnal Juridic & Noutăți
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Rămâi la curent cu ultimele modificări legislative, articole de specialitate și evenimente din lumea juridică.
                    </p>
                </div>
            </div>

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <LegalNewsTabs />

                <div className="min-h-[400px]">
                    {renderContent()}
                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 mt-auto py-8">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} LegeaAplicată. Toate drepturile rezervate.
                </div>
            </footer>
        </div>
    );
};

export default LegalNewsPage;
