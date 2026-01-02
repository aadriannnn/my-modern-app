import React from 'react';
import { type LegalNewsBook } from '../../types/news';
import BookCard from './BookCard';

const books: LegalNewsBook[] = [
    {
        id: 'book-1',
        title: 'Inteligența Artificială și Raționamentul Juridic',
        author: 'Dr. Andrei Munteanu',
        description: 'Lucrare de referință privind impactul inteligenței artificiale asupra interpretării normelor juridice și formării soluțiilor judiciare.',
        imageUrl: '/images/books/book_ai_reasoning.png',
        slug: 'inteligenta-artificiala-rationament-juridic'
    },
    {
        id: 'book-2',
        title: 'Dreptul Digital și Protecția Datelor în Era AI',
        author: 'Prof. Univ. Dr. Elena Radu',
        description: 'Analiză aprofundată a protecției datelor, GDPR și noile provocări juridice generate de sistemele inteligente.',
        imageUrl: '/images/books/book_digital_law.png',
        slug: 'dreptul-digital-protectia-datelor'
    },
    {
        id: 'book-3',
        title: 'Jurisprudență Predictivă: Fundamente și Riscuri',
        author: 'Conf. Dr. Mihai Ionescu',
        description: 'Studiu critic despre utilizarea algoritmilor în predicția hotărârilor judecătorești și limitele acestui instrument.',
        imageUrl: '/images/books/book_predictive_justice.png',
        slug: 'jurisprudenta-predictiva'
    },
    {
        id: 'book-4',
        title: 'Etica Deciziei Juridice Automatizate',
        author: 'Dr. Laura Popescu',
        description: 'Lucrare interdisciplinară despre responsabilitate, transparență și rolul factorului uman în justiția asistată de AI.',
        imageUrl: '/images/books/book_ethics_automated.png',
        slug: 'etica-deciziei-juridice'
    },
    {
        id: 'book-5',
        title: 'Avocatul în Era Inteligenței Artificiale',
        author: 'Av. Dr. Radu Marinescu',
        description: 'Ghid practic și strategic despre adaptarea profesiei de avocat la tehnologiile juridice emergente.',
        imageUrl: '/images/books/book_lawyer_ai_era.png',
        slug: 'avocatul-era-ai'
    },
    {
        id: 'book-6',
        title: 'Tehnologie, Drept și Viitorul Justiției',
        author: 'Prof. Univ. Dr. Sorin Dumitrescu',
        description: 'Viziune academică asupra transformării sistemului de justiție sub influența tehnologiei și inteligenței artificiale.',
        imageUrl: '/images/books/book_tech_justice_future.png',
        slug: 'tehnologie-drept-viitor'
    }
];

const BooksSection: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {books.map(book => (
                <BookCard key={book.id} book={book} />
            ))}
        </div>
    );
};

export default BooksSection;
