import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';

const PrivacyPolicyPage: React.FC = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Politica de Confidențialitate - Verdict Line",
        "description": "Politica de confidențialitate a companiei VERDICT LINE S.R.L. Protecția datelor personale conform legislației române și europene.",
        "url": "https://legeaaplicata.ro/privacy-policy",
        "inLanguage": "ro",
        "isPartOf": {
            "@type": "WebSite",
            "name": "LegeaAplicata",
            "url": "https://legeaaplicata.ro"
        },
        "about": {
            "@type": "Thing",
            "name": "Privacy Policy",
            "description": "Politica de confidențialitate conform GDPR și legislația română pentru protecția datelor cu caracter personal"
        },
        "datePublished": "2024-05-20",
        "dateModified": new Date().toISOString().split('T')[0]
    };

    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <SEOHead
                title="Politica de Confidențialitate | Verdict Line - Protecția Datelor Personale"
                description="Politica de confidențialitate VERDICT LINE S.R.L. conform GDPR și legislația română. Transparență în colectarea, utilizarea și protecția datelor personale."
                keywords="politică confidențialitate, GDPR, protecție date personale, Verdict Line, LegeaAplicata"
                ogTitle="Politica de Confidențialitate - Verdict Line"
                ogDescription="Politica de confidențialitate conform GDPR. Protecția datelor personale și transparență în prelucrare."
                ogImage="https://chat.legeaaplicata.ro/src/assets/icons/logo.webp"
                ogUrl="https://legeaaplicata.ro/privacy-policy"
                canonicalUrl="https://legeaaplicata.ro/privacy-policy"
                structuredData={structuredData}
            />
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
                            POLITICA DE CONFIDENȚIALITATE A COMPANIEI VERDICT LINE S.R.L.
                        </h1>

                        <div className="prose prose-lg max-w-none space-y-6 text-brand-text">

                            <p className="font-semibold">Actualizat: {new Date().toLocaleDateString('ro-RO')}</p>

                            <p>
                                Confidențialitatea dumneavoastră este importantă pentru noi. Această Politică de confidențialitate explică modul în care compania noastră gestionează datele dvs. personale atunci când utilizați site-urile <strong>LegeaAplicata.ro</strong> și <strong>VerdictLine.com</strong>, precum și serviciile noastre conexe.
                            </p>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">1. Scopul acestei Politici</h2>
                                <p>
                                    Această Politică de confidențialitate explică abordarea noastră cu privire la datele personale pe care le colectăm de la dvs. sau pe care le-am obținut despre dvs. de la o terță parte și scopurile pentru care prelucrăm aceste date. De asemenea, indică drepturile pe care le aveți conform Regulamentului 679/2016 (GDPR).
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">2. Cine suntem și ce facem</h2>
                                <p>
                                    Suntem <strong>VERDICT LINE S.R.L.</strong>, cu sediul în BUCUREȘTI, sector 5, Str. DRM. DÂRVARI, Nr. 34A, CUI 50104199. Firma are ca obiect principal de activitate codul CAEN 6201 - Activități de realizare a soft-ului la comandă (software orientat client).
                                </p>
                                <p>
                                    Verdict Line oferă servicii de informare juridică și soluții software prin intermediul platformelor sale. Informațiile afișate în cadrul site-ului LegeaAplicata.ro și VerdictLine.com au scop pur informativ.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">3. Cum să ne contactați</h2>
                                <p>
                                    Dacă aveți întrebări cu privire la această politică de confidențialitate sau doriți să vă exercitați drepturile cu privire la protecția datelor dvs. cu caracter personal, ne puteți contacta la adresele de email: <strong>contact@legeaaplicata.ro</strong> sau <strong>contact@verdictline.com</strong>, sau telefonic la 0751661066. Reprezentant legal: Nicolau Adrian.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">4. Ce date personale colectăm</h2>
                                <p>Colectăm date personale de la dvs. prin utilizarea site-ului nostru, atunci când ne contactați, solicitați servicii sau vă creați un cont. Datele pot include:</p>
                                <ul className="list-disc list-inside ml-4 space-y-2">
                                    <li>Nume și prenume</li>
                                    <li>Date de contact (email, telefon)</li>
                                    <li>Date de facturare (dacă este cazul)</li>
                                    <li>Date tehnice (IP, informații despre dispozitiv, cookie-uri)</li>
                                    <li>Informații despre utilizarea serviciilor noastre</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">5. Cum folosim datele personale</h2>
                                <p>Utilizăm datele dvs. personale pentru:</p>
                                <ul className="list-disc list-inside ml-4 space-y-2">
                                    <li>Furnizarea și îmbunătățirea serviciilor noastre</li>
                                    <li>Administrarea contului dvs.</li>
                                    <li>Comunicarea cu dvs. (răspuns la solicitări, notificări)</li>
                                    <li>Facturare și respectarea obligațiilor fiscale</li>
                                    <li>Asigurarea securității site-ului și prevenirea fraudelor</li>
                                    <li>Statistici și analize de trafic</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">6. Temeiul legal al prelucrării</h2>
                                <p>Prelucrăm datele dvs. în baza:</p>
                                <ul className="list-disc list-inside ml-4 space-y-2">
                                    <li>Executării unui contract sau a demersurilor precontractuale</li>
                                    <li>Obligațiilor legale (ex: contabilitate)</li>
                                    <li>Interesului legitim (ex: securitate, îmbunătățirea serviciilor)</li>
                                    <li>Consimțământului dvs. (ex: pentru comunicări de marketing, dacă este cazul)</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">7. Cu cine împărtășim datele personale</h2>
                                <p>Putem transmite datele dvs. către:</p>
                                <ul className="list-disc list-inside ml-4 space-y-2">
                                    <li>Furnizori de servicii IT și hosting</li>
                                    <li>Procesatori de plăți</li>
                                    <li>Servicii de contabilitate</li>
                                    <li>Autorități publice, dacă avem o obligație legală</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">8. Securitatea datelor</h2>
                                <p>
                                    Site-urile noastre sunt securizate cu certificat SSL/HTTPS. Implementăm măsuri tehnice și organizatorice pentru a proteja datele împotriva accesului neautorizat, pierderii sau utilizării abuzive.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">9. Drepturile dumneavoastră</h2>
                                <p>Conform GDPR, aveți dreptul de acces, rectificare, ștergere, restricționare a prelucrării, portabilitate a datelor și dreptul de opoziție. Pentru exeercitarea acestor drepturi, vă rugăm să ne contactați la <strong>contact@verdictline.com</strong>.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">10. Modificări</h2>
                                <p>
                                    Putem actualiza periodic această politică. Vă recomandăm să verificați această pagină pentru a fi la curent cu orice modificări.
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default PrivacyPolicyPage;
