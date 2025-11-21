import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <p className="text-xs md:text-sm text-center text-brand-text-secondary">
                    Prin utilizarea VerdictLine, sunteți de acord cu{' '}
                    <Link
                        to="/terms"
                        className="text-brand-accent hover:text-brand-accent/80 underline transition-colors"
                    >
                        Termenii și Condițiile
                    </Link>
                    {' '}și{' '}
                    <Link
                        to="/privacy-policy"
                        className="text-brand-accent hover:text-brand-accent/80 underline transition-colors"
                    >
                        Politica de Confidențialitate
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
};

export default Footer;
