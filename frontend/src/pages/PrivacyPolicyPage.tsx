import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <Header onToggleMenu={() => { }} onContribuieClick={() => { }} />

            <div className="flex-1 overflow-y-auto pb-20">
                <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
                        <Link
                            to="/"
                            className="inline-flex items-center text-brand-accent hover:text-brand-accent/80 mb-6 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Înapoi la Pagina Principală
                        </Link>

                        <h1 className="text-3xl md:text-4xl font-bold text-brand-dark mb-8">
                            Politica de Confidențialitate
                        </h1>

                        <div className="prose prose-lg max-w-none space-y-6 text-brand-text">
                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    1. Introducere
                                </h2>
                                <p className="leading-relaxed">
                                    VerdictLine respectă confidențialitatea utilizatorilor săi și se angajează să
                                    protejeze datele cu caracter personal în conformitate cu Regulamentul General
                                    privind Protecția Datelor (GDPR) și legislația română în vigoare. Această
                                    Politică de Confidențialitate descrie modul în care colectăm, utilizăm și
                                    protejăm informațiile dumneavoastră.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    2. Date Colectate
                                </h2>
                                <p className="leading-relaxed mb-4">
                                    În funcție de modul în care utilizați platforma VerdictLine, putem colecta
                                    următoarele tipuri de date:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li><strong>Date de navigare:</strong> adresa IP, tipul de browser, sistemul de operare, paginile vizitate, timpul petrecut pe platformă</li>
                                    <li><strong>Date de căutare:</strong> termenii de căutare introduși, filtrele aplicate, rezultatele accesate</li>
                                    <li><strong>Cookie-uri:</strong> informații stocate local pentru îmbunătățirea experienței utilizatorului</li>
                                    <li><strong>Date de contact:</strong> informațiile furnizate voluntar prin formulare de contact (dacă este cazul)</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    3. Scopul Prelucrării Datelor
                                </h2>
                                <p className="leading-relaxed mb-4">
                                    Utilizăm datele colectate pentru următoarele scopuri:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Furnizarea și îmbunătățirea serviciilor VerdictLine</li>
                                    <li>Personalizarea experienței utilizatorului</li>
                                    <li>Analiză statistică și optimizare a platformei</li>
                                    <li>Asigurarea securității și prevenirea fraudei</li>
                                    <li>Respectarea obligațiilor legale</li>
                                    <li>Comunicare cu utilizatorii (dacă este cazul)</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    4. Temei Legal
                                </h2>
                                <p className="leading-relaxed">
                                    Prelucrăm datele dumneavoastră pe baza următoarelor temeiuri legale:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                                    <li><strong>Consimțământ:</strong> prin utilizarea platformei, vă exprimați consimțământul pentru prelucrarea datelor</li>
                                    <li><strong>Interes legitim:</strong> pentru îmbunătățirea serviciilor și securitatea platformei</li>
                                    <li><strong>Obligație legală:</strong> pentru respectarea cerințelor legale aplicabile</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    5. Partajarea Datelor
                                </h2>
                                <p className="leading-relaxed">
                                    VerdictLine nu vinde și nu închiriază datele dumneavoastră cu caracter personal
                                    unor terțe părți. Putem partaja date doar în următoarele circumstanțe:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                                    <li>Cu furnizori de servicii care ne asistă în operarea platformei (de exemplu, servicii de hosting)</li>
                                    <li>În cazul în care legea impune dezvăluirea informațiilor</li>
                                    <li>Pentru protejarea drepturilor, proprietății sau securității VerdictLine și utilizatorilor săi</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    6. Securitatea Datelor
                                </h2>
                                <p className="leading-relaxed">
                                    Implementăm măsuri tehnice și organizatorice adecvate pentru a proteja datele
                                    dumneavoastră împotriva accesului neautorizat, modificării, dezvăluirii sau
                                    distrugerii. Totuși, nicio metodă de transmitere pe internet sau de stocare
                                    electronică nu este 100% sigură.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    7. Drepturile Dumneavoastră
                                </h2>
                                <p className="leading-relaxed mb-4">
                                    Conform GDPR, aveți următoarele drepturi:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li><strong>Dreptul de acces:</strong> să solicitați acces la datele personale pe care le deținem despre dumneavoastră</li>
                                    <li><strong>Dreptul la rectificare:</strong> să solicitați corectarea datelor incorecte sau incomplete</li>
                                    <li><strong>Dreptul la ștergere:</strong> să solicitați ștergerea datelor în anumite circumstanțe</li>
                                    <li><strong>Dreptul la restricționare:</strong> să solicitați limitarea prelucrării datelor</li>
                                    <li><strong>Dreptul la portabilitate:</strong> să solicitați transferul datelor către alt operator</li>
                                    <li><strong>Dreptul la opoziție:</strong> să vă opuneți prelucrării datelor în anumite circumstanțe</li>
                                    <li><strong>Dreptul de a retrage consimțământul:</strong> în orice moment</li>
                                </ul>
                                <p className="leading-relaxed mt-4">
                                    Pentru exercitarea acestor drepturi, vă rugăm să ne contactați folosind
                                    informațiile de contact de mai jos.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    8. Cookie-uri
                                </h2>
                                <p className="leading-relaxed">
                                    VerdictLine utilizează cookie-uri pentru a îmbunătăți experiența utilizatorului.
                                    Cookie-urile sunt fișiere mici de text stocate pe dispozitivul dumneavoastră.
                                    Puteți configura browser-ul să refuze cookie-urile, dar acest lucru poate afecta
                                    funcționalitatea platformei.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    9. Retenția Datelor
                                </h2>
                                <p className="leading-relaxed">
                                    Păstrăm datele dumneavoastră personale doar atât timp cât este necesar pentru
                                    scopurile menționate în această politică sau conform cerințelor legale aplicabile.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    10. Modificări ale Politicii
                                </h2>
                                <p className="leading-relaxed">
                                    Ne rezervăm dreptul de a modifica această Politică de Confidențialitate în orice
                                    moment. Modificările vor fi publicate pe această pagină, iar data ultimei
                                    actualizări va fi modificată corespunzător.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    11. Contact
                                </h2>
                                <p className="leading-relaxed">
                                    Pentru întrebări sau solicitări referitoare la această Politică de Confidențialitate
                                    sau la prelucrarea datelor dumneavoastră personale, vă rugăm să ne contactați
                                    prin intermediul formularului de contact disponibil pe platformă.
                                </p>
                                <p className="leading-relaxed mt-4">
                                    De asemenea, aveți dreptul de a depune o plângere la Autoritatea Națională de
                                    Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).
                                </p>
                            </section>

                            <p className="text-sm text-brand-text-secondary mt-12 pt-6 border-t border-gray-200">
                                Ultima actualizare: 21 noiembrie 2025
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default PrivacyPolicyPage;
