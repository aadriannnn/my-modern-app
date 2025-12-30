import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';

const CookiePolicyPage: React.FC = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Politica Cookies - Verdict Line",
        "description": "Politica de utilizare a cookie-urilor pentru platformele LegeaAplicata.ro și VerdictLine.com.",
        "url": "https://legeaaplicata.ro/cookies",
        "inLanguage": "ro",
        "isPartOf": {
            "@type": "WebSite",
            "name": "LegeaAplicata",
            "url": "https://legeaaplicata.ro"
        },
        "datePublished": "2024-05-20",
        "dateModified": new Date().toISOString().split('T')[0]
    };

    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <SEOHead
                title="Politica Cookies | Verdict Line"
                description="Politica privind fișierele de tip Cookie - Verdict Line S.R.L. Află ce cookie-uri folosim și cum le poți administra."
                keywords="politica cookies, cookies leagea aplicata, gdpr cookies, verdict line cookies"
                ogTitle="Politica Cookies - Verdict Line"
                ogDescription="Detaliile utilizării cookie-urilor pe site-ul LegeaAplicata.ro."
                ogImage="https://legeaaplicata.ro/assets/logo.png"
                ogUrl="https://legeaaplicata.ro/cookies"
                canonicalUrl="https://legeaaplicata.ro/cookies"
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
                            POLITICA PRIVIND FIȘIERELE DE TIP COOKIE
                        </h1>

                        <div className="prose prose-lg max-w-none space-y-6 text-brand-text">
                            <p>
                                Scopul acestei Politici este de a vă informa asupra plasării, utilizării și administrării fișierelor de tip cookie de către <strong>VERDICT LINE S.R.L.</strong> în cadrul navigării utilizatorului pe site-urile LegeaAplicata.ro și VerdictLine.com.
                            </p>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">1. Scopul acestei politici</h2>
                                <p>
                                    Prezenta politică pentru utilizarea fișierelor cookie, respectiv a tehnologiilor similare, se referă la fișiere specifice, denumite „cookies”, folosite în site-urile web operate de compania Verdict Line S.R.L..
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">2. Cine suntem și ce facem</h2>
                                <p>
                                    Suntem <strong>VERDICT LINE S.R.L.</strong>, cu sediul în BUCUREȘTI, sector 5, Str. DRM. DÂRVARI, Nr. 34A, CUI 50104199. Firma are ca obiect principal de activitate codul CAEN 6201 - Activități de realizare a soft-ului la comandă (software orientat client).
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">3. Cum să ne contactați</h2>
                                <p>
                                    Dacă aveți întrebări cu privire la această politică sau doriți să vă exercitați drepturile, puteți trimite un email la adresa <strong>contact@verdictline.com</strong> sau <strong>contact@legeaaplicata.ro</strong>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">4. Ce sunt fișierele cookie</h2>
                                <p>
                                    Fișierele cookie sunt fișiere de tip text, module sau tehnologii similare, pe care browser-ul dvs. le poate stoca în momentul în care vizitați site-ul nostru. Prin intermediul acestora colectăm informații în mod automat pentru a vă oferi o experiență optimă de navigare personalizată.
                                </p>
                                <p>
                                    Un cookie este un fișier de mici dimensiuni, format din litere și numere, stocat pe computerul, laptopul, tableta sau smartphone-ul prin care accesați internetul. Aceste cookie-uri sunt instalate prin intermediul unei solicitări emise de webserver către browser-ul dvs. (ex. Chrome, Firefox, Internet Explorer, Edge etc). Odată instalate, fișierele cookie au o durată determinată și rămân pasive.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">5. În ce scopuri folosim cookie-urile</h2>
                                <p>Cookie-urile pot fi folosite pentru a vă furniza o experiență personalizată și optimizată de navigare prin:</p>
                                <ul className="list-disc list-inside ml-4 space-y-2">
                                    <li>Îmbunătățirea folosirii acestui website, inclusiv prin identificarea posibilelor erori sau perturbări ce pot apărea în timpul utilizării acestui site;</li>
                                    <li>Furnizarea de statistici anonime privind modul în care este utilizat acest website;</li>
                                    <li>Furnizarea de statistici anonime de trafic;</li>
                                    <li>Menținerea preferințelor de navigare.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">6. Ce durată au cookie-urile</h2>
                                <p>Durata cookie-urilor poate varia, în funcție de scopul pentru care acestea sunt folosite. Există două categorii principale:</p>
                                <ul className="list-disc list-inside ml-4 space-y-2">
                                    <li><strong>Cookie-uri de sesiune:</strong> sunt șterse în momentul în care închideți browser-ul.</li>
                                    <li><strong>Cookie-uri fixe (persistente):</strong> rămân stocate pe dispozitivul dvs. până când vor atinge data de expirare sau până când decideți să le ștergeți.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">7. Cookie-uri plasate de terți</h2>
                                <p>
                                    Unele funcționalități sau secțiuni de pe paginile acestui site pot fi furnizate prin intermediul unor terțe părți (ex. Google Analytics, Facebook Pixel, LinkedIn). Aceste terțe părți pot plasa cookie-uri prin intermediul site-ului și pot colecta date despre dvs. conform propriilor politici de confidențialitate.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">8. Ce cookie-uri folosim</h2>
                                <p>Folosim cookie-uri de analiză a traficului, de sesiune și de marketing/publicitate (unde este cazul). Iată câteva exemple:</p>

                                <div className="overflow-x-auto mt-4">
                                    <table className="min-w-full text-sm text-left">
                                        <thead className="bg-gray-100 font-bold uppercase">
                                            <tr>
                                                <th className="px-4 py-2 border">Nume Cookie</th>
                                                <th className="px-4 py-2 border">Durată</th>
                                                <th className="px-4 py-2 border">Descriere</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-t">
                                                <td className="px-4 py-2 font-mono">CookieConsent</td>
                                                <td className="px-4 py-2">1 an</td>
                                                <td className="px-4 py-2">Stochează consimțământul utilizatorului.</td>
                                            </tr>
                                            <tr className="border-t">
                                                <td className="px-4 py-2 font-mono">_ga</td>
                                                <td className="px-4 py-2">2 ani</td>
                                                <td className="px-4 py-2">Cookie Google Analytics pentru ID unic vizitator.</td>
                                            </tr>
                                            <tr className="border-t">
                                                <td className="px-4 py-2 font-mono">_gid</td>
                                                <td className="px-4 py-2">1 zi</td>
                                                <td className="px-4 py-2">Cookie Google Analytics pentru comportament utilizator.</td>
                                            </tr>
                                            <tr className="border-t">
                                                <td className="px-4 py-2 font-mono">PHPSESSID / session_id</td>
                                                <td className="px-4 py-2">Sesiune</td>
                                                <td className="px-4 py-2">Cookie de sesiune pentru menținerea stării utilizatorului.</td>
                                            </tr>
                                            {/* Add simplified rows for others as needed */}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-brand-dark mt-8 mb-4">9. Cum puteți opri cookie-urile</h2>
                                <p>
                                    Vă puteți configura browser-ul pentru a respinge fișierele cookie sau pentru a le accepta. Dezactivarea cookie-urilor poate afecta experiența de navigare. Puteți accesa setările de gestionare a cookie-urilor în meniul "Opțiuni" sau "Preferințe" al browser-ului dvs.
                                </p>
                                <p className="mt-4">
                                    Pentru întrebări suplimentare, vă rugăm să ne trimiteți un e-mail la <strong>contact@verdictline.com</strong>.
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

export default CookiePolicyPage;
