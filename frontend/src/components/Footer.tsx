import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-brand-dark text-white pt-16 pb-8 border-t border-brand-primary">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div>
                        <Link to="/" className="inline-block mb-6">
                            <span className="text-2xl font-serif font-bold text-white">LegeaAplicata</span>
                            <span className="block text-xs text-brand-gold mt-1 uppercase tracking-widest">Legal Intelligence</span>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            VERDICT LINE S.R.L. - Soluții avansate de cercetare juridică și analiză de spețe.
                            CUI 50104199.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="text-gray-400 hover:text-brand-gold transition-colors"><Facebook className="w-5 h-5" /></a>
                            <a href="#" className="text-gray-400 hover:text-brand-gold transition-colors"><Twitter className="w-5 h-5" /></a>
                            <a href="#" className="text-gray-400 hover:text-brand-gold transition-colors"><Linkedin className="w-5 h-5" /></a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 font-headings">Navigare Rapidă</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link to="/stiri" className="hover:text-brand-gold transition-colors">Știri Juridice</Link></li>
                            <li><Link to="/abonamente" className="hover:text-brand-gold transition-colors">Abonamente</Link></li>
                            <li><Link to="/grid-tests" className="hover:text-brand-gold transition-colors">Teste Grilă</Link></li>
                            <li><Link to="/evenimente" className="hover:text-brand-gold transition-colors">Evenimente</Link></li>
                            <li><Link to="/glosar" className="hover:text-brand-gold transition-colors">Glosar Termeni</Link></li>
                        </ul>
                    </div>

                    {/* Legal Resources */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 font-headings">Legal & Suport</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link to="/terms" className="hover:text-brand-gold transition-colors">Termeni și Condiții</Link></li>
                            <li><Link to="/privacy-policy" className="hover:text-brand-gold transition-colors">Politica de Confidențialitate</Link></li>
                            <li><Link to="/cookies" className="hover:text-brand-gold transition-colors">Politica Cookies</Link></li>
                            <li><Link to="/gdpr" className="hover:text-brand-gold transition-colors">GDPR</Link></li>
                            <li><Link to="/help-center" className="hover:text-brand-gold transition-colors">Centru de Ajutor</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 font-headings">Contact</h4>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-brand-gold shrink-0" />
                                <span>Str. DRM. DÂRVARI, Nr. 34A, Sector 5, București</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-brand-gold shrink-0" />
                                <span>0751 661 066</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-brand-gold shrink-0" />
                                <span>contact@verdictline.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                    <p>&copy; {currentYear} LegeaAplicata. Toate drepturile rezervate.</p>
                    <p>Dezvoltat cu pasiune pentru justiție.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
