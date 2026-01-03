import React from 'react';
import EventCard from './EventCard';

// Hardcoded events for 2026
const EVENTS = [
    {
        id: 'evt-001',
        title: 'Artificial Intelligence & Jurisprudence 2026',
        slug: 'ai-jurisprudence-2026',
        date: '2026-02-12T18:00:00',
        location: 'Online (Live)',
        description: 'Analiză aprofundată a modului în care inteligența artificială influențează raționamentul judiciar, interpretarea probelor și formarea jurisprudenței în instanțele europene.',
        imageUrl: '/images/events/event_ai_jurisprudence.png',
        category: 'AI & Law',
        isLive: true,
        detailsLink: '/contact'
    },
    {
        id: 'evt-002',
        title: 'AI în Dreptul Procesual: Probe, Algoritmi și Limite',
        slug: 'ai-procedural-law',
        date: '2026-03-26T17:00:00',
        location: 'Online',
        description: 'Eveniment dedicat utilizării AI în analiza probelor, riscurilor de bias algoritmic și limitelor admisibilității tehnologiei în procesul civil și penal.',
        imageUrl: '/images/events/event_ai_procedural_law.png',
        category: 'Procedural Law',
        detailsLink: '/contact'
    },
    {
        id: 'evt-003',
        title: 'Reglementarea Inteligenței Artificiale în Uniunea Europeană',
        slug: 'ai-eu-regulations',
        date: '2026-05-14T18:30:00',
        location: 'Online',
        description: 'O privire practică asupra AI Act, obligații pentru profesioniștii dreptului și impactul direct asupra activității judiciare și consultanței juridice.',
        imageUrl: '/images/events/event_ai_eu_regulations.png',
        category: 'EU Law',
        detailsLink: '/contact'
    },
    {
        id: 'evt-004',
        title: 'Jurisprudență Predictivă: Mit sau Realitate?',
        slug: 'predictive-justice',
        date: '2026-07-18T11:00:00',
        location: 'Online',
        description: 'Discuție critică despre folosirea AI pentru predicția soluțiilor instanțelor și implicațiile etice pentru avocați și judecători.',
        imageUrl: '/images/events/event_ai_predictive_justice.png',
        category: 'Legal Tech',
        detailsLink: '/contact'
    },
    {
        id: 'evt-005',
        title: 'Etica Inteligenței Artificiale în Actul de Justiție',
        slug: 'ai-ethics-justice',
        date: '2026-09-22T18:00:00',
        location: 'Online',
        description: 'Abordare interdisciplinară asupra eticii AI, responsabilității decizionale și rolului omului în justiția asistată de algoritmi.',
        imageUrl: '/images/events/event_ai_ethics_justice.png',
        category: 'Ethics',
        detailsLink: '/contact'
    },
    {
        id: 'evt-006',
        title: 'Avocatul Viitorului: Competențe Juridice în Era AI',
        slug: 'lawyer-future-ai',
        date: '2026-12-10T19:00:00',
        location: 'Online',
        description: 'Eveniment de final de an despre transformarea profesiei de avocat, skill-uri esențiale și adaptarea la noile tehnologii juridice.',
        imageUrl: '/images/events/event_ai_lawyer_future.png',
        category: 'Professional Development',
        detailsLink: '/contact'
    }
];

const EventsSection: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {EVENTS.map(event => (
                <EventCard key={event.id} event={event} />
            ))}
        </div>
    );
};

export default EventsSection;
