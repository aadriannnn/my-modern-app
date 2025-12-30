import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Cpu, Scale, FileText, Calculator, Search, Download, CheckCircle } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    // SEO Structured Data for Landing Page
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Juridic AI – Local",
        "applicationCategory": "LegalService",
        "operatingSystem": "Windows, macOS, Linux",
        "description": "Inteligență artificială juridică 100% offline și confidențială. Analizează cazuri și calculează taxe juridice direct pe propriul hardware, fără cloud sau procesare externă.",
        "offers": [
            {
                "@type": "Offer",
                "name": "Demo Web",
                "price": "0",
                "priceCurrency": "RON",
                "description": "Versiune demo gratuită care rulează în browser, cu sesiune efemeră fără salvare de date."
            },
            {
                "@type": "Offer",
                "name": "Versiune Desktop Offline",
                "priceCurrency": "RON",
                "description": "Versiune completă 100% offline cu procesare locală, stocare criptată și bază de date completă.",
                "availability": "https://schema.org/PreOrder"
            },
            {
                "@type": "Offer",
                "name": "Ediție Enterprise",
                "priceCurrency": "RON",
                "description": "Versiune premium cu dataset extins, LLM avansat și personalizare pentru cabinete și instituții.",
                "availability": "https://schema.org/PreOrder"
            }
        ],
        "featureList": [
            "Procesare 100% offline, fără internet",
            "Model AI proprietar, datele nu antrenează modelul",
            "Zero amprentă digitală - fără cookie-uri, logging sau tracking",
            "Căutare cazuri similare în jurisprudență română",
            "Detectare automată prevederi legale",
            "Generare documente juridice",
            "Calcul automat taxe judiciare"
        ],
        "softwareVersion": "2.0",
        "inLanguage": "ro",
        "releaseNotes": "Versiune offline cu confidențialitate maximă pentru profesioniști în drept",
        "screenshot": "https://chat.legeaaplicata.ro/src/assets/icons/logo.png"
    };

    return (
        <div className="landing-page">
            <SEOHead
                title="Juridic AI Local - Inteligență Artificială Juridică 100% Offline și Confidențială"
                description="Inteligență artificială juridică 100% offline pentru avocați și jurisconsulți. Analizează cazuri, calculează taxe juridice, generează documente - totul pe propriul tău hardware, fără cloud. Zero tracking, confidențialitate maximă."
                keywords="AI juridic offline, inteligență artificială juridică, cercetare juridică offline, confidențialitate juridică maximă, legal AI local, avocat AI offline, jurisprudență offline, fără cloud legal, GDPR compliant legal AI"
                ogTitle="Juridic AI Local - AI Juridic 100% Offline și Confidențial"
                ogDescription="Prima platformă de inteligență artificială juridică 100% offline. Procesare locală, zero cloud, confidențialitate totală pentru profesioniști în drept."
                ogImage="https://chat.legeaaplicata.ro/src/assets/icons/logo.png"
                ogUrl="https://chat.legeaaplicata.ro/landing"
                canonicalUrl="https://chat.legeaaplicata.ro/landing"
                structuredData={structuredData}
            />

            {/* Header */}
            <header className="landing-header">
                <div className="container">
                    <div className="flex justify-between items-center">
                        <div className="logo">
                            <Shield className="w-8 h-8 text-emerald-500" />
                            <span className="logo-text">Juridic AI – Local</span>
                        </div>
                        <a href="#contact" className="btn btn-secondary">
                            Contact / Versiune Offline
                        </a>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-text">
                            <h1 className="hero-title animate-slide-up">
                                Inteligență Artificială Juridică.<br />
                                100% Offline. 100% Confidențial.
                            </h1>
                            <p className="hero-subtitle animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                Analizează cazuri și calculează taxe juridice direct pe propriul tău hardware.
                                Fără cloud. Fără scurgeri de date. Fără procesare externă.
                            </p>
                            <div className="hero-cta animate-slide-up" style={{ animationDelay: '0.4s' }}>
                                <Link to="/" className="btn btn-primary btn-large">
                                    Încearcă Demo-ul Web
                                </Link>
                                <p className="disclaimer">
                                    Sesiune efemeră — toate datele sunt șterse automat la refresh
                                </p>
                            </div>
                        </div>
                        <div className="hero-visual animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            <div className="security-illustration">
                                <div className="shield-wrapper animate-float">
                                    <Shield className="shield-icon" />
                                    <Lock className="lock-icon" />
                                </div>
                                <div className="particles">
                                    <span className="particle"></span>
                                    <span className="particle"></span>
                                    <span className="particle"></span>
                                    <span className="particle"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Pillars */}
            <section className="pillars">
                <div className="container">
                    <div className="pillars-grid">
                        <div className="pillar animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="pillar-icon">
                                <Cpu className="w-12 h-12" />
                            </div>
                            <h3 className="pillar-title">Procesare Locală</h3>
                            <p className="pillar-text">
                                Rulează în totalitate pe dispozitivul tău. Internet nu este necesar.
                            </p>
                        </div>
                        <div className="pillar animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <div className="pillar-icon pillar-icon-navy">
                                <Shield className="w-12 h-12" />
                            </div>
                            <h3 className="pillar-title">Model AI Proprietar</h3>
                            <p className="pillar-text">
                                Nu se bazează pe LLM-uri publice. Datele tale nu antrenează niciodată modelul nostru.
                            </p>
                        </div>
                        <div className="pillar animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <div className="pillar-icon">
                                <Lock className="w-12 h-12" />
                            </div>
                            <h3 className="pillar-title">Zero Amprentă Digitală</h3>
                            <p className="pillar-text">
                                Confidențialitate maximă cu procesare locală.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section className="comparison">
                <div className="container">
                    <h2 className="section-title">Alege Versiunea Potrivită</h2>
                    <div className="comparison-grid">
                        {/* Web Demo */}
                        <div className="comparison-card">
                            <div className="card-header">
                                <h3 className="card-title">Demo Web</h3>
                                <span className="badge badge-free">Gratuit</span>
                            </div>
                            <ul className="feature-list">
                                <li><CheckCircle className="w-5 h-5" /> Rulează în browser</li>
                                <li><CheckCircle className="w-5 h-5" /> Necesită internet</li>
                                <li><CheckCircle className="w-5 h-5" /> Nicio dată salvată (totul șters la refresh)</li>
                                <li><CheckCircle className="w-5 h-5" /> Motor AI ușor</li>
                                <li><CheckCircle className="w-5 h-5" /> Pur pentru testare</li>
                            </ul>
                            <Link to="/" className="btn btn-outline">Încearcă Acum</Link>
                        </div>

                        {/* Desktop Full */}
                        <div className="comparison-card comparison-card-featured">
                            <div className="featured-badge">Recomandat</div>
                            <div className="card-header">
                                <h3 className="card-title">Versiune Desktop Completă</h3>
                                <span className="badge badge-pro">Offline</span>
                            </div>
                            <ul className="feature-list">
                                <li><CheckCircle className="w-5 h-5" /> 100% offline, air-gapped</li>
                                <li><CheckCircle className="w-5 h-5" /> Stocare locală criptată</li>
                                <li><CheckCircle className="w-5 h-5" /> Putere maximă de procesare</li>
                                <li><CheckCircle className="w-5 h-5" /> Bază de date completă de cazuri juridice</li>
                                <li><CheckCircle className="w-5 h-5" /> Flux de lucru instantaneu</li>
                                <li><CheckCircle className="w-5 h-5" /> Livrat doar la cerere</li>
                                <li><CheckCircle className="w-5 h-5" /> Include actualizări și mentenanță</li>
                            </ul>
                            <a href="#contact" className="btn btn-primary">Solicită Ofertă & Pachet Instalare</a>
                        </div>

                        {/* Enterprise */}
                        <div className="comparison-card">
                            <div className="card-header">
                                <h3 className="card-title">Ediție Enterprise</h3>
                                <span className="badge badge-enterprise">Premium</span>
                            </div>
                            <ul className="feature-list">
                                <li><CheckCircle className="w-5 h-5" /> Tot din versiunea Desktop +</li>
                                <li><CheckCircle className="w-5 h-5" /> Dataset jurisprudență mult mai amplu</li>
                                <li><CheckCircle className="w-5 h-5" /> Bibliotecă de cazuri actualizată periodic</li>
                                <li><CheckCircle className="w-5 h-5" /> LLM avansat de ultima generație pentru juridic</li>
                                <li><CheckCircle className="w-5 h-5" /> Personalizare opțională pentru cabinete</li>
                                <li><CheckCircle className="w-5 h-5" /> Scalabil pentru instituții</li>
                            </ul>
                            <a href="#contact" className="btn btn-outline">Contactează-ne</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="features">
                <div className="container">
                    <h2 className="section-title">Capabilități Avansate</h2>
                    <div className="features-grid">
                        <div className="feature-card animate-slide-up">
                            <Scale className="feature-icon" />
                            <h3 className="feature-title">Căutare Cazuri Similare</h3>
                            <p className="feature-text">
                                Găsește rapid jurisprudență relevantă cu AI antrenat pe legislația română.
                            </p>
                        </div>
                        <div className="feature-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <FileText className="feature-icon" />
                            <h3 className="feature-title">Detecție Prevederi Legale</h3>
                            <p className="feature-text">
                                Identifică automat articolele și normele legale aplicabile cazului tău.
                            </p>
                        </div>
                        <div className="feature-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <Download className="feature-icon" />
                            <h3 className="feature-title">Documente Juridice Auto-generate</h3>
                            <p className="feature-text">
                                Generează cereri, memorii și alte acte juridice instant pe baza cazului.
                            </p>
                        </div>
                        <div className="feature-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <Calculator className="feature-icon" />
                            <h3 className="feature-title">Calcul Automat Taxe Judiciare</h3>
                            <p className="feature-text">
                                Calculează precis toate taxele și cheltuielile de judecată aplicabile.
                            </p>
                        </div>
                        <div className="feature-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
                            <Search className="feature-icon" />
                            <h3 className="feature-title">Motor de Căutare Local Avansat</h3>
                            <p className="feature-text">
                                Caută instant în întreaga bază de date locală fără latență de rețea.
                            </p>
                        </div>
                        <div className="feature-card animate-slide-up" style={{ animationDelay: '0.5s' }}>
                            <Shield className="feature-icon" />
                            <h3 className="feature-title">Confidențialitate Totală</h3>
                            <p className="feature-text">
                                Toate documentele rămân exclusiv pe sistemul tău. Zero risc de expunere.
                            </p>
                        </div>
                    </div>
                </div>
            </section>



            {/* Footer */}
            <footer className="landing-footer" id="contact">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-column">
                            <h4 className="footer-title">Juridic AI – Local</h4>
                            <p className="footer-text">
                                Inteligența artificială pentru profesioniști în drept.<br />
                                Securitate maximă. Performanță maximă.
                            </p>
                        </div>
                        <div className="footer-column">
                            <h4 className="footer-title">Contact</h4>
                            <p className="footer-text">
                                Pentru versiunea Desktop sau Enterprise,<br />
                                contactează-ne la: <a href="mailto:contact@juridicai.ro" className="footer-link">contact@juridicai.ro</a>
                            </p>
                        </div>
                        <div className="footer-column">
                            <h4 className="footer-title">Link-uri Rapide</h4>
                            <ul className="footer-links">
                                <li><Link to="/terms">Termeni și Condiții</Link></li>
                                <li><Link to="/privacy-policy">Politica de Confidențialitate</Link></li>
                                <li><Link to="/">Demo Web</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p className="footer-disclaimer">
                            © 2025 Juridic AI – Local. Toate drepturile rezervate.<br />
                            Confidențialitate și performanță pentru profesioniști.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
