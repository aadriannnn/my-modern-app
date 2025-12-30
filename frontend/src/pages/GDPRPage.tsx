import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';

const GDPRPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <SEOHead
                title="GDPR și Protecția Datelor | Verdict Line"
                description="Angajamentul Verdict Line S.R.L. privind respectarea normelor GDPR și protecția datelor cu caracter personal."
                keywords="gdpr romania, protectia datelor legea aplicata, drepturi gdpr, verdict line gdpr"
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
                            GDPR și Protecția Datelor
                        </h1>

                        <div className="prose prose-lg max-w-none space-y-6 text-brand-text">
                            <p>
                                <strong>VERDICT LINE S.R.L.</strong> se aliniază cu strictețe prevederilor Regulamentului (UE) 2016/679 (GDPR) privind protecția persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal și libera circulație a acestor date.
                            </p>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">Principii Fundamentale</h2>
                                <ul className="list-disc list-inside ml-4 space-y-2">
                                    <li><strong>Legalitate, echitate și transparență:</strong> Prelucrăm datele legal și transparent față de persoana vizată.</li>
                                    <li><strong>Limitarea scopului:</strong> Datele sunt colectate în scopuri determinate, explicite și legitime.</li>
                                    <li><strong>Minimizarea datelor:</strong> Datele sunt adecvate, relevante și limitate la ceea ce este necesar.</li>
                                    <li><strong>Exactitate:</strong> Datele trebuie să fie exacte și, în caz de necesitate, actualizate.</li>
                                    <li><strong>Limitarea stocării:</strong> Păstrate doar atât cât este necesar.</li>
                                    <li><strong>Integritate și confidențialitate:</strong> Prelucrate într-un mod care asigură securitatea adecvată.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">Responsabilul cu Protecția Datelor (DPO)</h2>
                                <p>
                                    Pentru orice aspect legat de protecția datelor, ne puteți contacta la adresa de email: <strong>contact@verdictline.com</strong>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">Exercitarea Drepturilor</h2>
                                <p>
                                    Pentru a vă exercita drepturile (acces, rectificare, ștergere, restricționare, portabilitate, opoziție), vă rugăm să trimiteți o cerere scrisă la adresa de email menționată mai sus. Vom răspunde solicitării dumneavoastră în termenul legal de 30 de zile.
                                </p>
                            </section>

                            <div className="bg-blue-50 border-l-4 border-brand-blue p-4 mt-8">
                                <p className="text-sm text-blue-800">
                                    Pentru detalii complete, vă rugăm să consultați și <Link to="/privacy-policy" className="font-bold underline">Politica de Confidențialitate</Link>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default GDPRPage;
