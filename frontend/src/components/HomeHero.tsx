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
                <h1 className="text-4xl md:text-6xl font-extrabold text-brand-dark text-center tracking-tight leading-tight">
                    Tu vii cu problema, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-primary">
                        Noi venim cu strategia.
                    </span>
                </h1>
            </div>

            {/* Main Search Area */}
            <div className="w-full max-w-3xl mb-16 relative z-10 animate-slide-up">
                <SearchBar
                    variant="hero"
                    placeholder="Descrie situația, număr dosar sau CUI/Societate..."
                    value={situacie}
                    onChange={onSituatieChange}
                    onSearch={onSearch}
                    onDosarSearch={onDosarSearch}
                    isLoading={isLoading}
                />

                {/* Search Guide & Disclaimer */}
                {/* Unified Educational Examples Section */}
                <div className="w-full max-w-6xl mx-auto mb-16 animate-fade-in-up delay-100 px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Verificare Societate */}
                        <button
                            onClick={() => onSituatieChange("VERDICT LINE S.R.L.")}
                            className="group relative flex flex-col items-start text-left p-5 h-full rounded-2xl bg-white/50 hover:bg-white border border-slate-200/60 hover:border-blue-200 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap className="w-24 h-24 -mr-8 -mt-8 text-blue-500 rotate-12" />
                            </div>

                            <div className="flex items-center gap-3 mb-3 relative z-10">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-slate-800 text-sm tracking-tight">Verificare Societate</span>
                            </div>

                            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4 relative z-10">
                                Introdu <span className="text-slate-700 font-semibold">CUI</span> sau <span className="text-slate-700 font-semibold">Denumirea</span> completă însoțită obligatoriu de forma de organizare.
                            </p>

                            <div className="mt-auto relative z-10">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                                    ex: VERDICT LINE S.R.L.
                                </span>
                            </div>
                        </button>

                        {/* Consultare Dosar */}
                        <button
                            onClick={() => onSituatieChange("36895/302/2025")}
                            className="group relative flex flex-col items-start text-left p-5 h-full rounded-2xl bg-white/50 hover:bg-white border border-slate-200/60 hover:border-purple-200 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Scale className="w-24 h-24 -mr-8 -mt-8 text-purple-500 -rotate-12" />
                            </div>

                            <div className="flex items-center gap-3 mb-3 relative z-10">
                                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-slate-800 text-sm tracking-tight">Dosar Instanță</span>
                            </div>

                            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4 relative z-10">
                                Caută direct după <span className="text-slate-700 font-semibold">numărul unic</span> de dosar asignat de instanțele judecătorești.
                            </p>

                            <div className="mt-auto relative z-10">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-100 text-xs font-semibold text-purple-700 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-colors">
                                    ex: 36895/302/2025
                                </span>
                            </div>
                        </button>

                        {/* Situație */}
                        <button
                            onClick={onExampleClick}
                            className="group relative flex flex-col items-start text-left p-5 h-full rounded-2xl bg-white/50 hover:bg-white border border-slate-200/60 hover:border-emerald-200 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Shield className="w-24 h-24 -mr-8 -mt-8 text-emerald-500 rotate-6" />
                            </div>

                            <div className="flex items-center gap-3 mb-3 relative z-10">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-slate-800 text-sm tracking-tight">Situație Juridică</span>
                            </div>

                            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4 relative z-10">
                                Descrie problema ta în <span className="text-slate-700 font-semibold">limbaj natural</span>. AI-ul va analiza speța și va identifica soluții.
                            </p>

                            <div className="mt-auto relative z-10">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors">
                                    Generează caz exemplu
                                </span>
                            </div>
                        </button>
                    </div>

                    <p className="mt-8 text-[11px] text-slate-400 text-center max-w-2xl mx-auto leading-relaxed opacity-70">
                        <Sparkles className="w-3 h-3 inline mr-1 text-slate-400" />
                        Răspunsurile sunt generate de AI pe baza spețelor reale. Informațiile au rol informativ și nu reprezintă consultanță juridică oficială.
                    </p>
                </div>
            </div>

        </div>
    );
};
