import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Mail, Phone, Scale, Code, Shield, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const AboutPage: React.FC = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-gold selection:text-brand-dark">
            <Header
                isHomeView={false}
                onToggleMenu={() => { }}
                onContribuieClick={() => { }}
                onReset={() => { }}
            />

            {/* Hero Section with Seamless Image Blend */}
            <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">

                {/* Background Decor */}
                <div className="absolute inset-0 bg-brand-dark">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-5"></div>
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl filter mix-blend-screen animate-pulse"></div>
                </div>

                {/* The Image - Integrated seamlessly */}
                <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[55%] pointer-events-none select-none z-0">
                    <div className="relative w-full h-full">
                        {/* Image */}
                        <img
                            src="/data/legal_news/images/adriannicolau.jpg"
                            alt="Adrian Nicolau"
                            className="w-full h-full object-cover object-center lg:object-[center_20%]"
                        />

                        {/* Gradient Masks for Seamless Blend */}
                        {/* Fade from Left (Background) to Right (Image) */}
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/80 to-transparent lg:w-[70%]"></div>
                        {/* Fade Bottom for mobile stack or footer blend */}
                        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-brand-dark to-transparent"></div>
                        {/* Tint overlay for consistency */}
                        <div className="absolute inset-0 bg-brand-primary/10 mix-blend-overlay"></div>
                    </div>
                </div>

                {/* Content Container */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2 className="text-brand-gold font-serif text-lg tracking-widest uppercase mb-4 font-bold max-w-lg">
                                Fondator LegeaAplicata.ro
                            </h2>
                            <h1 className="text-5xl md:text-7xl font-bold font-headings text-white mb-6 leading-tight">
                                Adrian <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Nicolau</span>
                            </h1>

                            <p className="text-xl text-gray-300 mb-8 leading-relaxed font-light border-l-4 border-brand-gold pl-6">
                                "Justiția modernă necesită o înțelegere profundă a două lumi: rigoarea legii și precizia tehnologiei."
                            </p>

                            <div className="flex flex-wrap gap-4 mb-12">
                                <Link to="/contact" className="px-8 py-4 bg-brand-gold hover:bg-yellow-600 text-brand-dark font-bold rounded-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center gap-2">
                                    <Mail className="w-5 h-5" />
                                    Contactează-mă
                                </Link>
                                <a href="tel:0751661066" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg backdrop-blur-sm transition-all flex items-center gap-2 border border-white/10">
                                    <Phone className="w-5 h-5" />
                                    0751 661 066
                                </a>
                            </div>
                        </motion.div>

                        {/* Expertise Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                        >
                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 hover:border-brand-gold/50 transition-colors group">
                                <Scale className="w-10 h-10 text-brand-gold mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-bold mb-2">Expertiză Juridică</h3>
                                <p className="text-sm text-gray-400">
                                    Studii aprofundate în drept și o carieră dedicată apărării justiției și interpretării corecte a legii.
                                </p>
                            </div>

                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 hover:border-brand-gold/50 transition-colors group">
                                <Code className="w-10 h-10 text-brand-gold mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-bold mb-2">Inginerie Software</h3>
                                <p className="text-sm text-gray-400">
                                    Competențe avansate în informatică aplicate pentru a digitaliza și eficientiza procesele juridice.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Vision / Message Section (Darker contrast) */}
            <section className="py-24 relative z-10 bg-black/30 backdrop-blur-sm border-t border-white/5">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-bold font-headings mb-8 text-white">De ce LegeaAplicata.ro?</h2>
                            <div className="space-y-8">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0">
                                        <BrainCircuit className="w-6 h-6 text-brand-gold" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-2">Legal Intelligence</h4>
                                        <p className="text-gray-400 leading-relaxed">
                                            Combinăm raționamentul juridic clasic cu puterea algoritmilor de inteligență artificială pentru a oferi strategii, nu doar informații.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0">
                                        <Shield className="w-6 h-6 text-brand-gold" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-2">Profesionalism și Încredere</h4>
                                        <p className="text-gray-400 leading-relaxed">
                                            Fiecare funcționalitate a platformei este gândită din perspectiva practicianului în drept, asigurând relevanța și acuratețea rezultatelor.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="bg-gradient-to-br from-brand-primary to-brand-dark p-1 rounded-2xl rotate-3 transform hover:rotate-0 transition-all duration-500">
                                <div className="bg-brand-dark p-8 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-20">
                                        <Scale className="w-32 h-32 text-white" />
                                    </div>
                                    <p className="text-2xl font-serif text-white leading-relaxed italic mb-6 relative z-10">
                                        "Misiunea mea este să transform accesul la justiție prin tehnologie. LegeaAplicata.ro nu este doar o bază de date, ci un partener digital pentru fiecare avocat și justițiabil."
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-1 bg-brand-gold/50 rounded-full"></div>
                                        <span className="text-sm font-bold tracking-widest uppercase text-gray-400">Adrian Nicolau</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Inclusion */}
            <Footer />
        </div>
    );
};

export default AboutPage;
