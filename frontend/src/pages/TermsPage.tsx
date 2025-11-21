import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TermsPage: React.FC = () => {
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
                            Termeni și Condiții
                        </h1>

                        <div className="prose prose-lg max-w-none space-y-6 text-brand-text">
                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    1. Acceptarea Termenilor
                                </h2>
                                <p className="leading-relaxed">
                                    Prin accesarea și utilizarea platformei VerdictLine, confirmați că ați citit,
                                    înțeles și acceptat să fiți obligat de prezentele Termene și Condiții, precum
                                    și de Politica noastră de Confidențialitate. Dacă nu sunteți de acord cu acești
                                    termeni, vă rugăm să nu utilizați serviciul nostru.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    2. Descrierea Serviciului
                                </h2>
                                <p className="leading-relaxed">
                                    VerdictLine este o platformă online care oferă acces la informații juridice,
                                    hotărâri judecătorești, modele de acte și coduri legale. Serviciul nostru este
                                    destinat utilizatorilor care doresc să se informeze cu privire la practici
                                    judiciare și legislație românească.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    3. Utilizarea Platformei
                                </h2>
                                <p className="leading-relaxed mb-4">
                                    Vă obligați să utilizați VerdictLine numai în scopuri legale și conforme cu
                                    legislația în vigoare. Este interzis să:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Utilizați platforma în scopuri ilegale sau frauduloase</li>
                                    <li>Încărcați sau distribuiți conținut care încalcă drepturile de autor</li>
                                    <li>Încercați să obțineți acces neautorizat la sistem sau la datele altor utilizatori</li>
                                    <li>Utilizați sistemul pentru a transmite viruși, malware sau alt cod dăunător</li>
                                    <li>Copiați, reproduceti sau distribuiți conținutul fără autorizație</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    4. Proprietate Intelectuală
                                </h2>
                                <p className="leading-relaxed">
                                    Tot conținutul disponibil pe VerdictLine, inclusiv dar fără a se limita la texte,
                                    grafice, logo-uri, imagini, modele de acte și software, este proprietatea
                                    VerdictLine sau a licențiatorilor săi și este protejat de legile drepturilor de
                                    autor și alte legi privind proprietatea intelectuală din România și internaționale.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    5. Limitarea Răspunderii
                                </h2>
                                <p className="leading-relaxed">
                                    Informațiile furnizate pe VerdictLine sunt oferite cu scop informativ general și
                                    nu constituie consultanță juridică. VerdictLine nu își asumă răspunderea pentru
                                    acuratețea, completitudinea sau actualitatea informațiilor prezentate. Pentru
                                    consultanță juridică specifică, vă recomandăm să contactați un avocat autorizat.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    6. Modificări ale Termenilor
                                </h2>
                                <p className="leading-relaxed">
                                    Ne rezervăm dreptul de a modifica acești termeni și condiții în orice moment.
                                    Modificările vor intra în vigoare imediat după publicarea lor pe platformă.
                                    Utilizarea continuă a serviciului după publicarea modificărilor constituie
                                    acceptarea noilor termeni.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    7. Legea Aplicabilă
                                </h2>
                                <p className="leading-relaxed">
                                    Prezentele Termene și Condiții sunt guvernate de legile României. Orice dispută
                                    care decurge din sau în legătură cu acești termeni va fi soluționată de instanțele
                                    competente din România.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">
                                    8. Contact
                                </h2>
                                <p className="leading-relaxed">
                                    Pentru întrebări sau nelămuriri referitoare la acești Termeni și Condiții,
                                    vă rugăm să ne contactați prin intermediul formularului de contact disponibil
                                    pe platformă.
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

export default TermsPage;
