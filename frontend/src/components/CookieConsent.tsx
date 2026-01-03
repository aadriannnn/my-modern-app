import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Cookie } from 'lucide-react';

const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {
            // Show after a small delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-slide-up">
            <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6">

                <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-brand-gold/10 rounded-xl hidden sm:block">
                        <Cookie className="w-6 h-6 text-brand-gold" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            Politica de Cookies
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Acest site utilizează cookie-uri pentru a vă oferi o experiență de navigare optimizată și personalizată.
                            Continuând să navigați, vă exprimați acordul asupra folosirii cookie-urilor.
                            Pentru mai multe detalii, consultați <Link to="/cookies" className="text-brand-blue font-semibold hover:underline">Politica Cookies</Link>.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={handleAccept}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-brand-dark hover:bg-brand-dark/90 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl active:transform active:scale-95"
                    >
                        Acceptă Tot
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        aria-label="Închide"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
