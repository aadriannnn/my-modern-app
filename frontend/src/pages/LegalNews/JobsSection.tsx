import React from 'react';
import { type LegalNewsJob } from '../../types/news';
import JobCard from './JobCard';

const jobs: LegalNewsJob[] = [
    {
        id: 'job-1',
        title: 'Avocat Stagiar – Drept Civil și Comercial',
        company: 'Societatea de Avocatură Ionescu, Radu & Asociații',
        location: 'București',
        description: 'Societate de avocatură caută avocat stagiar pentru activitate preponderentă în drept civil și comercial. Vei participa la redactarea cererilor de chemare în judecată, contracte și opinii juridice, precum și la activitatea de pregătire a dosarelor pentru instanță.',
        requirements: ['Licențiat în drept', 'Cunoștințe drept civil', 'Abilități de cercetare'],
        datePosted: '2025-04-20',
        applyLink: '#'
    },
    {
        id: 'job-2',
        title: 'Avocat Definitiv – Litigii Comerciale',
        company: 'Dumitrescu & Partenerii – Societate de Avocatură',
        location: 'București, Sector 1',
        description: 'Căutăm avocat definitiv pentru departamentul de litigii comerciale, cu implicare directă în gestionarea dosarelor, reprezentare în instanță și redactarea strategiilor procesuale. Activitatea presupune colaborare strânsă cu clienți corporate.',
        requirements: ['Avocat definitiv', 'Minim 3-5 ani experiență', 'Limba engleză avansat'],
        datePosted: '2025-04-19',
        applyLink: '#'
    },
    {
        id: 'job-3',
        title: 'Consilier Juridic – Drept Contractual',
        company: 'Legal Advisory Group SRL',
        location: 'Cluj-Napoca',
        description: 'Poziție destinată unui jurist orientat către dreptul contractual. Vei oferi suport juridic în redactarea, revizuirea și negocierea contractelor comerciale, precum și în analiza riscurilor juridice pentru clienți.',
        requirements: ['Experiență contracte', 'Atenție la detalii', 'Capacitate de analiză'],
        datePosted: '2025-04-18',
        applyLink: '#'
    },
    {
        id: 'job-4',
        title: 'Avocat Colaborator – Drept Penal și Procedură Penală',
        company: 'Cabinet de Avocat Pavel Alexandru',
        location: 'Iași',
        description: 'Cabinet de avocat caută colaborator pentru activitate în dosare de drept penal și procedură penală. Implicare în asistență juridică, redactare acte procesuale și participare la termenele de judecată.',
        requirements: ['Avocat stagiar/definitiv', 'Seriozitate', 'Disponibilitate deplasări'],
        datePosted: '2025-04-17',
        applyLink: '#'
    },
    {
        id: 'job-5',
        title: 'Avocat / Consilier Juridic – Protecția Datelor (GDPR)',
        company: 'Societate de Avocatură Digital Law Partners',
        location: 'Timișoara (Remote posibil)',
        description: 'Căutăm avocat sau consilier juridic specializat în protecția datelor cu caracter personal. Activitatea vizează consultanță GDPR, redactare politici interne, evaluări de impact și asistență juridică pentru clienți din mediul digital.',
        requirements: ['Specializare GDPR', 'Minim 2 ani experiență', 'Certificare avantaj'],
        datePosted: '2025-04-15',
        applyLink: '#'
    }
];

const JobsSection: React.FC = () => {
    return (
        <div className="space-y-4">
            {jobs.map(job => (
                <JobCard key={job.id} job={job} />
            ))}
        </div>
    );
};

export default JobsSection;
