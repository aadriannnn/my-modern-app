import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, FileText, Building2, ChevronRight, Shield, Search, BookOpen, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ContribuieModal from '../components/ContribuieModal';

const Sitemap: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isContribuieModalOpen, setIsContribuieModalOpen] = useState(false);

    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <Header
                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onContribuieClick={() => setIsContribuieModalOpen(true)}
            />

            <main className="flex-grow pt-8 pb-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Page Header */}
                    <div className="mb-12 text-center">
                        <h1 className="text-3xl md:text-4xl font-bold font-headings text-brand-dark mb-4">
                            Harta Site-ului
                        </h1>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            O privire de ansamblu asupra structurii platformei LegeaAplicata.ro și a funcționalităților cheie oferite profesioniștilor din domeniul juridic.
                        </p>
                    </div>

                    {/* Core Functionalities Section - SEO Priority */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold font-headings text-brand-primary mb-8 border-b border-gray-200 pb-4">
                            Funcționalități Cheie
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                            {/* Feature 1: Comparative Analysis */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                        <Scale className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">Analiză Comparativă Spețe</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">
                                    Motor avansat de comparare a situațiilor de fapt introduse de utilizator cu cele din baza de date jurisprudențială.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Comparare semantică a situațiilor de fapt</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Extragere automată date esențiale din spețe similare</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Identificare argumente instanță și texte de lege relevante</span>
                                    </li>
                                </ul>
                                <div className="mt-6">
                                    <Link to="/" className="text-sm font-semibold text-brand-primary hover:text-brand-gold transition-colors flex items-center gap-1">
                                        Accesează Căutarea <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>

                            {/* Feature 2: Case Relevance & Monitoring */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">Monitorizare și Relevanță Dosare</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">
                                    Sistem integrat de analiză a dosarelor din instanțe pentru identificarea spețelor relevante și managementul cazurilor.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Căutare și import automat date după număr dosar</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Afișare spețe similare specifice dosarului alocat</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Monitorizare termene și actualizări dosar</span>
                                    </li>
                                </ul>
                                <div className="mt-6">
                                    <Link to="/" className="text-sm font-semibold text-brand-primary hover:text-brand-gold transition-colors flex items-center gap-1">
                                        Caută Dosar <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>

                            {/* Feature 3: Company Analysis */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">Analiză Bonitate Societăți</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">
                                    Evaluare completă a partenerilor comerciali și a părților adverse prin analiză de bonitate și risc.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Verificare indicatori financiari și risc de insolvență</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Istoric litigii și comportament procesual</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-gray-700">
                                        <ChevronRight className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                                        <span>Rappoarte complexe de bonitate</span>
                                    </li>
                                </ul>
                                <div className="mt-6">
                                    <Link to="/" className="text-sm font-semibold text-brand-primary hover:text-brand-gold transition-colors flex items-center gap-1">
                                        Vezi Companii <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* General Navigation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                        {/* Section 1: Main Structure */}
                        <div>
                            <h4 className="flex items-center gap-2 text-lg font-bold text-brand-dark mb-4 pb-2 border-b border-gray-100">
                                <Search className="w-5 h-5 text-brand-primary" />
                                Navigare Generală
                            </h4>
                            <ul className="space-y-3">
                                <li><Link to="/" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Prima Pagină (Căutare)</Link></li>
                                <li><Link to="/landing" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Prezentare Platformă</Link></li>
                                <li><Link to="/despre-noi" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Despre Noi</Link></li>
                                <li><Link to="/contact" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Contact</Link></li>
                                <li><Link to="/help-center" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Centru de Ajutor</Link></li>
                            </ul>
                        </div>

                        {/* Section 2: Services */}
                        <div>
                            <h4 className="flex items-center gap-2 text-lg font-bold text-brand-dark mb-4 pb-2 border-b border-gray-100">
                                <Shield className="w-5 h-5 text-brand-primary" />
                                Servicii & Produse
                            </h4>
                            <ul className="space-y-3">
                                <li><Link to="/abonamente" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Planuri și Prețuri</Link></li>
                                <li><Link to="/asistenta-avocat" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Asistență Juridică</Link></li>
                                <li><Link to="/taxa-timbru" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Calculator Taxă Timbru</Link></li>
                                <li><Link to="/grid-tests" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Teste Grilă</Link></li>
                                <li><Link to="/test-analysis" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Analiză Teste</Link></li>
                            </ul>
                        </div>

                        {/* Section 3: Professional Resources */}
                        <div>
                            <h4 className="flex items-center gap-2 text-lg font-bold text-brand-dark mb-4 pb-2 border-b border-gray-100">
                                <BookOpen className="w-5 h-5 text-brand-primary" />
                                Resurse Profesionale
                            </h4>
                            <ul className="space-y-3">
                                <li><Link to="/stiri" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Știri Juridice</Link></li>
                                <li><Link to="/evenimente" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Evenimente</Link></li>
                                <li><Link to="/editura" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Editura</Link></li>
                                <li><Link to="/cariere" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Cariere</Link></li>
                                <li><Link to="/profesionisti" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Profesioniști</Link></li>
                            </ul>
                        </div>

                        {/* Section 4: Legal & Account */}
                        <div>
                            <h4 className="flex items-center gap-2 text-lg font-bold text-brand-dark mb-4 pb-2 border-b border-gray-100">
                                <AlertCircle className="w-5 h-5 text-brand-primary" />
                                Legal & Cont
                            </h4>
                            <ul className="space-y-3">
                                <li><Link to="/terms" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Termeni și Condiții</Link></li>
                                <li><Link to="/privacy-policy" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Politica de Confidențialitate</Link></li>
                                <li><Link to="/cookies" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Politica Cookies</Link></li>
                                <li><Link to="/gdpr" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Politica GDPR</Link></li>
                                <li className="pt-2 border-t border-gray-100 mt-2">
                                    <Link to="/login" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Autentificare</Link>
                                </li>
                                <li><Link to="/register" className="text-gray-600 hover:text-brand-primary hover:translate-x-1 transition-all inline-block">Cont Nou</Link></li>
                            </ul>
                        </div>

                    </div>
                </div>
            </main>

            <ContribuieModal
                isOpen={isContribuieModalOpen}
                onClose={() => setIsContribuieModalOpen(false)}
            />
            <Footer />
        </div>
    );
};

export default Sitemap;
