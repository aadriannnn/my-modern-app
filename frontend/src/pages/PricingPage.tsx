
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PricingSection from '../components/PricingSection';
import ContribuieModal from '../components/ContribuieModal';

const PricingPage: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isContribuieModalOpen, setIsContribuieModalOpen] = useState(false);

    return (
        <div className="flex flex-col min-h-screen bg-brand-light">
            <Header
                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onContribuieClick={() => setIsContribuieModalOpen(true)}
                hideMobileMenu={true}
            />

            <main className="flex-grow pt-8 bg-slate-50">
                <PricingSection />
            </main>

            <ContribuieModal
                isOpen={isContribuieModalOpen}
                onClose={() => setIsContribuieModalOpen(false)}
            />
            <Footer />
        </div>
    );
};

export default PricingPage;
