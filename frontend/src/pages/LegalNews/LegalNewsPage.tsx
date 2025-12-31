import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import SEOHead from '../../components/SEOHead';
import LegalNewsTabs from './LegalNewsTabs';
import ArticlesSection from './ArticlesSection';
import EventsSection from './EventsSection';
import BooksSection from './BooksSection';
import JobsSection from './JobsSection';
import ProfessionalsSection from './ProfessionalsSection';
import ArticleDetailPage from './ArticleDetailPage';
import Footer from '../../components/Footer';

const LegalNewsPage: React.FC = () => {
    const location = useLocation();

    const toggleMenu = () => {
        console.log("Toggle menu");
    };

    const handleContribuieClick = () => {
        console.log("Contribuie click");
    };

    const path = location.pathname;

    // Check if we are on a detail page that handles its own layout
    if (path.includes('/articol/')) {
        return <ArticleDetailPage />;
    }

    const renderContent = () => {
        if (path === '/stiri' || path === '/stiri/') return <ArticlesSection />;
        if (path.startsWith('/evenimente')) return <EventsSection />;
        if (path.startsWith('/editura')) return <BooksSection />;
        if (path.startsWith('/cariere')) return <JobsSection />;
        if (path.startsWith('/profesionisti') || path.startsWith('/stiri/autor')) return <ProfessionalsSection />;
        return <ArticlesSection />;
    };

    // Generate SEO based on current section
    const getSEOData = () => {
        if (path === '/stiri' || path === '/stiri/') {
            return {
                title: "Știri Juridice",
                description: "Ultimele știri și articole juridice din România. Rămâi la curent cu legislația actualizată, hotărâri importante și analiză de specialitate.",
                keywords: "știri juridice România, articole juridice, legislație nouă, modificări legislative, analiză juridică, hotărâri importante",
                url: "https://chat.legeaaplicata.ro/stiri"
            };
        } else if (path.startsWith('/evenimente')) {
            return {
                title: "Evenimente Juridice",
                description: "Evenimente, conferințe și seminarii juridice din România. Participă la evenimente de specialitate și networking profesional.",
                keywords: "evenimente juridice, conferințe drept, seminarii avocați, networking juridic, cursuri drept",
                url: "https://chat.legeaaplicata.ro/evenimente"
            };
        } else if (path.startsWith('/editura')) {
            return {
                title: "Editură Juridică",
                description: "Cărți și publicații juridice. Descoperiți cele mai recente lucrări și materiale de specialitate pentru profesioniștii în drept.",
                keywords: "cărți juridice, publicații drept, editură juridică, manuale drept, doctrină juridică",
                url: "https://chat.legeaaplicata.ro/editura"
            };
        } else if (path.startsWith('/cariere')) {
            return {
                title: "Cariere Juridice",
                description: "Oportunități de carieră în domeniul juridic. Descoperă joburi pentru avocați, juriconșulți și profesioniști în drept.",
                keywords: "joburi avocați, cariere juridice, oportunități drept, angajări juriconșulți, locuri de muncă drept",
                url: "https://chat.legeaaplicata.ro/cariere"
            };
        } else if (path.startsWith('/profesionisti')) {
            return {
                title: "Profesioniști în Drept",
                description: "Director de profesioniști în drept din România. Găsiți avocați, juriconșulți și experți juridici specializae.",
                keywords: "avocați România, juriconșulți, profesioniști drept, director avocați, experți juridici",
                url: "https://chat.legeaaplicata.ro/profesionisti"
            };
        }
        return {
            title: "Știri Juridice",
            description: "Ultimele știri și articole juridice din România.",
            keywords: "știri juridice România",
            url: "https://chat.legeaaplicata.ro/stiri"
        };
    };

    const seoData = getSEOData();
    const collectionStructuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${seoData.url}#collectionpage`,
        "url": seoData.url,
        "name": seoData.title,
        "description": seoData.description,
        "isPartOf": {
            "@id": "https://chat.legeaaplicata.ro/#website"
        }
    };

    return (
        <div className="min-h-screen bg-brand-light flex flex-col font-sans">
            <SEOHead
                title={seoData.title}
                description={seoData.description}
                keywords={seoData.keywords}
                canonicalUrl={seoData.url}
                structuredData={collectionStructuredData}
            />
            <Header onToggleMenu={toggleMenu} onContribuieClick={handleContribuieClick} hideMobileMenu={true} />

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

            <Footer />
        </div>
    );
};

export default LegalNewsPage;
