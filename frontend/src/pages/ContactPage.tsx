import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { Mail, Phone, MapPin, Send, MessageSquare, Linkedin, Facebook, Globe, Shield } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

const ContactPage: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [formState, setFormState] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate API call
        console.log('Form submitted:', formState);
        setTimeout(() => setIsSubmitted(true), 500);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormState({
            ...formState,
            [e.target.name]: e.target.value
        });
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-gold selection:text-brand-dark flex flex-col">
            <SEOHead
                title="Contact - Legea Aplicată | Asistență Juridică & Tehnică"
                description="Contactează echipa Legea Aplicată pentru asistență juridică, suport tehnic sau parteneriate. Suntem aici să răspundem nevoilor tale profesionale."
                keywords="contact legea aplicata, suport juridic, asistenta juristi, email verdict line, contact adrian nicolau, consultanta juridica, suport tehnic"
                canonicalUrl="https://chat.legeaaplicata.ro/contact"
                ogTitle="Contact - Legea Aplicată"
                ogDescription="Ai o întrebare tehnică sau juridică? Echipa noastră este pregătită să îți ofere suportul necesar."
                ogUrl="https://chat.legeaaplicata.ro/contact"
                ogImage="https://chat.legeaaplicata.ro/src/assets/icons/logo.webp" // Assuming a default OG image or one can be added later
                structuredData={{
                    "@context": "https://schema.org",
                    "@type": "ContactPage",
                    "name": "Contact Legea Aplicată",
                    "description": "Pagină de contact pentru Legea Aplicată - Servicii juridice și tehnice.",
                    "url": "https://chat.legeaaplicata.ro/contact",
                    "mainEntity": {
                        "@type": "Organization",
                        "name": "Legea Aplicată",
                        "url": "https://chat.legeaaplicata.ro",
                        "logo": "https://chat.legeaaplicata.ro/logo.png",
                        "contactPoint": [
                            {
                                "@type": "ContactPoint",
                                "telephone": "+40 751 661 066",
                                "contactType": "customer service",
                                "email": "contact@verdictline.com",
                                "areaServed": "RO",
                                "availableLanguage": "Romanian"
                            }
                        ],
                        "address": {
                            "@type": "PostalAddress",
                            "streetAddress": "Str. DRM. DÂRVARI, Nr. 34A",
                            "addressLocality": "Sector 5, București",
                            "addressCountry": "RO"
                        },
                        "sameAs": [
                            "https://verdictline.com"
                        ]
                    }
                }}
            />

            <Header
                isHomeView={false}
                onToggleMenu={() => { }}
                onContribuieClick={() => { }}
                onReset={() => { }}
            />

            <main className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                {/* Background ambient effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-brand-gold/5 rounded-full blur-[80px]"></div>
                </div>

                <div className="container mx-auto max-w-7xl relative z-10">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="space-y-8"
                    >
                        {/* Page Header */}
                        <motion.div variants={itemVariants} className="text-center mb-12 lg:mb-16">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headings mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                                Să intrăm în legătură
                            </h1>
                            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
                                Ai o întrebare tehnică sau juridică? Echipa noastră este pregătită să îți ofere suportul necesar.
                            </p>
                        </motion.div>

                        {/* Layout Split based on logic: Desktop (Bento) vs Mobile (Stack) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* LEFT COLUMN (Desktop: Contact Info & Quick Actions) - Spans 4 columns */}
                            <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">

                                {/* Primary Contact Card */}
                                <div className="glass-dark rounded-2xl p-6 md:p-8 border border-white/5 hover:border-brand-gold/30 transition-all duration-300 group">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold group-hover:scale-110 transition-transform">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Discută cu noi</h3>
                                            <p className="text-sm text-gray-400">Luni - Vineri, 09:00 - 18:00</p>
                                        </div>
                                    </div>

                                    <address className="space-y-4 not-italic">
                                        <a href="mailto:contact@verdictline.com" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group/link">
                                            <Mail className="w-5 h-5 text-brand-primary group-hover/link:text-brand-gold transition-colors" />
                                            <span className="text-gray-300 group-hover/link:text-white transition-colors">contact@verdictline.com</span>
                                        </a>
                                        <a href="tel:+40751661066" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group/link">
                                            <Phone className="w-5 h-5 text-brand-primary group-hover/link:text-brand-gold transition-colors" />
                                            <span className="text-gray-300 group-hover/link:text-white transition-colors">+40 751 661 066</span>
                                        </a>
                                        <div className="flex items-start gap-3 p-3 text-gray-400">
                                            <MapPin className="w-5 h-5 text-brand-primary mt-1" />
                                            <span>București, România<br />Str. DRM. DÂRVARI, Nr. 34A, Sector 5</span>
                                        </div>
                                    </address>
                                </div>

                                {/* Social / Trust Card */}
                                <div className="glass-dark rounded-2xl p-6 border border-white/5 hover:border-brand-primary/30 transition-all duration-300">
                                    <h4 className="text-lg font-bold text-white mb-4">Conectează-te</h4>
                                    <div className="flex gap-4">
                                        <a href="#" className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all hover:-translate-y-1">
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                        <a href="#" className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all hover:-translate-y-1">
                                            <Facebook className="w-5 h-5" />
                                        </a>
                                        <a href="https://verdictline.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-black flex items-center justify-center transition-all hover:-translate-y-1">
                                            <Globe className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>

                                {/* FAQ / Quick Help Snippet for Mobile Efficiency */}
                                <div className="glass-dark rounded-2xl p-6 border border-white/5 md:hidden">
                                    <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-brand-gold" />
                                        Suport Rapid
                                    </h4>
                                    <p className="text-sm text-gray-400 mb-3">Pentru urgențe tehnice, folosește linia directă.</p>
                                    <a href="tel:+40751661066" className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 rounded-lg text-sm font-medium text-white hover:bg-white/20 transition-colors">
                                        Sună Acum
                                    </a>
                                </div>

                            </motion.div>

                            {/* MIDDLE/RIGHT COLUMN (Form) - Spans 8 columns on Desktop */}
                            <motion.div variants={itemVariants} className="lg:col-span-8">
                                <div className="glass-dark rounded-2xl p-6 md:p-10 border border-white/5 h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                                        <Send className="w-64 h-64 text-white transform rotate-[-15deg] translate-x-12 -translate-y-12" />
                                    </div>

                                    <div className="relative z-10">
                                        {!isSubmitted ? (
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <h2 className="text-2xl font-bold text-white mb-6">Trimite un mesaj</h2>
                                                <form onSubmit={handleSubmit} className="space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label htmlFor="name" className="text-sm font-medium text-gray-300">Nume Complet</label>
                                                            <input
                                                                type="text"
                                                                id="name"
                                                                name="name"
                                                                value={formState.name}
                                                                onChange={handleChange}
                                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 transition-all placeholder:text-gray-600"
                                                                placeholder="Ion Popescu"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
                                                            <input
                                                                type="email"
                                                                id="email"
                                                                name="email"
                                                                value={formState.email}
                                                                onChange={handleChange}
                                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 transition-all placeholder:text-gray-600"
                                                                placeholder="ion@exemplu.ro"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label htmlFor="subject" className="text-sm font-medium text-gray-300">Subiect</label>
                                                        <select
                                                            id="subject"
                                                            name="subject"
                                                            value={formState.subject}
                                                            onChange={handleChange}
                                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 transition-all appearance-none cursor-pointer"
                                                        >
                                                            <option value="" className="bg-brand-dark text-gray-500">Alege un subiect...</option>
                                                            <option value="consultanta" className="bg-brand-dark">Consultanță Juridică</option>
                                                            <option value="tehnic" className="bg-brand-dark">Suport Tehnic App</option>
                                                            <option value="parteneriat" className="bg-brand-dark">Parteneriate B2B</option>
                                                            <option value="altele" className="bg-brand-dark">Altele</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label htmlFor="message" className="text-sm font-medium text-gray-300">Mesaj</label>
                                                        <textarea
                                                            id="message"
                                                            name="message"
                                                            value={formState.message}
                                                            onChange={handleChange}
                                                            rows={5}
                                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 transition-all placeholder:text-gray-600 resize-none"
                                                            placeholder="Detaliază solicitarea ta aici..."
                                                            required
                                                        ></textarea>
                                                    </div>

                                                    <div className="pt-4">
                                                        <button
                                                            type="submit"
                                                            className="w-full md:w-auto px-8 py-4 bg-brand-gold hover:bg-yellow-600 text-brand-dark font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                                                        >
                                                            <Send className="w-5 h-5" />
                                                            Trimite Mesajul
                                                        </button>
                                                    </div>
                                                </form>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex flex-col items-center justify-center h-full text-center py-12"
                                            >
                                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                                    <Shield className="w-10 h-10 text-green-500" />
                                                </div>
                                                <h3 className="text-3xl font-bold text-white mb-2">Mesaj Trimis!</h3>
                                                <p className="text-gray-400 max-w-md mb-8">
                                                    Mulțumim pentru contact. Echipa noastră a primit mesajul tău și va reveni cu un răspuns în cel mai scurt timp posibil.
                                                </p>
                                                <button
                                                    onClick={() => setIsSubmitted(false)}
                                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                                                >
                                                    Trimite alt mesaj
                                                </button>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* BOTTOM ROW (Map / Locations) - Full width on Desktop */}
                            <motion.div variants={itemVariants} className="lg:col-span-12 hidden md:block">
                                <div className="glass-dark rounded-2xl p-1 border border-white/5 h-64 overflow-hidden relative group">
                                    <div className="absolute inset-0 bg-brand-primary/10 flex items-center justify-center">
                                        {/* Placeholder for map visual - abstract tech style */}
                                        <div className="text-center">
                                            <MapPin className="w-12 h-12 text-brand-gold mx-auto mb-4 animate-bounce" />
                                            <p className="text-gray-400">Str. DRM. DÂRVARI, Nr. 34A, Sector 5<br />București</p>
                                        </div>
                                        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
                                    </div>
                                </div>
                            </motion.div>

                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ContactPage;
