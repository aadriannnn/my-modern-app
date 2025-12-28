import React from 'react';
import { SearchBar } from './SearchBar';
import { Scale, Shield, Zap, Sparkles } from 'lucide-react';

interface HomeHeroProps {
    situacie: string;
    onSituatieChange: (val: string) => void;
    onSearch: () => void;
    onDosarSearch: (val: string) => void;
    isLoading: boolean;
    onExampleClick: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
    situacie,
    onSituatieChange,
    onSearch,
    onDosarSearch,
    isLoading,
    onExampleClick
}) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-5xl mx-auto px-4 sm:px-6 relative overflow-visible">

            {/* Background Gradients */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-radial from-slate-200/40 to-transparent opacity-60 pointer-events-none blur-3xl rounded-full -z-10" />

            {/* "Badge" Header */}
            <div className="mb-8 animate-fade-in flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
                    AI Legal Assistant 2.0
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-brand-dark text-center tracking-tight leading-tight">
                    Tu vii cu problema, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-primary">
                        Noi venim cu strategia.
                    </span>
                </h1>
                <p className="mt-4 text-lg text-brand-text-secondary text-center max-w-2xl font-light">
                    Asistentul tău juridic inteligent. Caută spețe, analizează dosare și generează strategii complete în secunde.
                </p>
            </div>

            {/* Main Search Area */}
            <div className="w-full max-w-3xl mb-16 relative z-10 animate-slide-up">
                <SearchBar
                    variant="hero"
                    value={situacie}
                    onChange={onSituatieChange}
                    onSearch={onSearch}
                    onDosarSearch={onDosarSearch}
                    isLoading={isLoading}
                    onExampleClick={onExampleClick}
                />

                {/* Features / Hints below search */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 opacity-80">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-slate-100">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div className="text-sm">
                            <span className="font-semibold text-brand-dark block">Rapid & Precis</span>
                            <span className="text-slate-500">Analiză AI instantanee</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-slate-100">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div className="text-sm">
                            <span className="font-semibold text-brand-dark block">Jurisprudență</span>
                            <span className="text-slate-500">Milioane de spețe</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-slate-100">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div className="text-sm">
                            <span className="font-semibold text-brand-dark block">Confidențial</span>
                            <span className="text-slate-500">Date securizate 100%</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
