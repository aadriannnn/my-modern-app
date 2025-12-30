import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { FileText, Search, Shield } from 'lucide-react';

const HelpCenterPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <SEOHead
                title="Centru de Ajutor | LegeaAplicata - Suport și Întrebări Frecvente"
                description="Centrul de ajutor LegeaAplicata. Găsește răspunsuri la întrebările tale despre utilizarea platformei, conturi, abonamente și cercetare juridică."
                keywords="ajutor legea aplicata, suport juridic online, faq legea aplicata, contact legea aplicata"
            />
            <Header onToggleMenu={() => { }} onContribuieClick={() => { }} />

            <div className="flex-1 overflow-y-auto pb-20">
                <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 mb-8 text-center">
                        <h1 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">
                            Cum te putem ajuta?
                        </h1>
                        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                            Explorează articolele noastre sau contactează-ne dacă nu găsești răspunsul pe care îl cauți.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                            <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                                <Search className="w-8 h-8 text-brand-gold mb-4" />
                                <h3 className="text-lg font-bold text-brand-dark mb-2">Căutare și Cercetare</h3>
                                <p className="text-sm text-gray-500">Cum să folosești eficient motorul de căutare pentru spețe și legislație.</p>
                            </div>
                            <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                                <FileText className="w-8 h-8 text-brand-gold mb-4" />
                                <h3 className="text-lg font-bold text-brand-dark mb-2">Abonamente</h3>
                                <p className="text-sm text-gray-500">Detalii despre planuri, facturare și upgrade-uri.</p>
                            </div>
                            <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                                <Shield className="w-8 h-8 text-brand-gold mb-4" />
                                <h3 className="text-lg font-bold text-brand-dark mb-2">Contul Meu</h3>
                                <p className="text-sm text-gray-500">Administrarea profilului, securitate și setări.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
                        <h2 className="text-2xl font-bold text-brand-dark mb-6">Întrebări Frecvente</h2>

                        <div className="space-y-6">
                            <div className="border-b pb-4">
                                <h3 className="font-semibold text-lg text-brand-secondary mb-2">Cum pot căuta o speță specifică?</h3>
                                <p className="text-gray-600">
                                    Folosiți bara de căutare principală și introduceți cuvinte cheie relevante, numărul dosarului sau numele părților. Puteți utiliza filtrele avansate pentru a restrânge rezultatele după materie, instanță sau an.
                                </p>
                            </div>
                            <div className="border-b pb-4">
                                <h3 className="font-semibold text-lg text-brand-secondary mb-2">Informațiile sunt actualizate?</h3>
                                <p className="text-gray-600">
                                    Da, baza noastră de date este actualizată constant pentru a reflecta cele mai recente hotărâri judecătorești și modificări legislative.
                                </p>
                            </div>
                            <div className="border-b pb-4">
                                <h3 className="font-semibold text-lg text-brand-secondary mb-2">Cum pot contacta suportul?</h3>
                                <p className="text-gray-600">
                                    Dacă nu găsiți răspunsul aici, ne puteți scrie la <a href="mailto:contact@legeaaplicata.ro" className="text-brand-blue hover:underline">contact@legeaaplicata.ro</a> sau puteți folosi formularul din pagina de <Link to="/contact" className="text-brand-blue hover:underline">Contact</Link>.
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

export default HelpCenterPage;
