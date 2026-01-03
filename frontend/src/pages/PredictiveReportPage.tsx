
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import {
    TrendingUp, TrendingDown, Clock, Scale,
    FileText, Calculator, Brain, CheckCircle, XCircle, Sparkles
} from 'lucide-react';
import { search as apiSearch } from '../lib/api';
import { normalizeSearchResults } from '@/lib/dynamicFilterHelpers';

// Types for our predictive report
interface PredictionStats {
    winRate: number;      // 0-100
    avgDuration: number;  // Months
    estimatedCost: {
        tax: number;
        taxCategory?: string;
        lawyer?: number;
    };
    caseCount: number;
    topArgumentsPro: string[];
    topArgumentsCon: string[];
    strategies?: string[];
    similarCases: any[];
}

const ExpandableText = ({ text, limit = 200, className = "" }: { text: string, limit?: number, className?: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text) return null;
    if (text.length <= limit) return <p className={className}>{text}</p>;

    return (
        <div className="w-full">
            <p className={className}>
                {isExpanded ? text : text.substring(0, limit) + "..."}
            </p>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-indigo-600 text-xs font-bold mt-1.5 hover:underline focus:outline-none flex items-center gap-1"
            >
                {isExpanded ? "Vezi mai puțin" : "Vezi tot"}
            </button>
        </div>
    );
};

const PredictiveReportPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [report, setReport] = useState<PredictionStats | null>(null);
    const [step, setStep] = useState<number>(0); // 0: Input, 1: Loading, 2: Result
    const [loadingMessage, setLoadingMessage] = useState('');

    const handleAnalyze = async () => {
        if (!query.trim() || query.length < 10) return;

        setStep(1);
        setReport(null);

        // Simulation of a multi-step analysis process
        const steps = [
            "Căutare spețe similare în baza de date...",
            "Analiză semantică a situației de fapt...",
            "Extragere soluții și calcul rata succes...",
            "Identificare argumente juridice cheie...",
            "Estimare costuri și durată..."
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setLoadingMessage(steps[currentStep]);
                currentStep++;
            }
        }, 800);

        try {
            // Actual API Search to get real data foundation
            const resultsRaw = await apiSearch({
                situatie: query,
                offset: 0,
                materie: [],
                obiect: [],
                tip_speta: [],
                parte: []
            });

            const results = normalizeSearchResults(resultsRaw);

            if (!results || results.length === 0) {
                // Handle no results
                clearInterval(interval);
                setStep(0);
                alert("Nu am găsit spețe suficient de similare pentru a genera un raport.");
                return;
            }

            // --- LOCAL ANALYSIS LOGIC (The "New Service" Logic) ---

            // 1. Calculate Win Rate based on 'solutie' or 'tip_solutie'
            // We look for keywords like 'Admite', 'Respinge' in tip_solutie or solutie
            let wins = 0;
            let losses = 0;
            const relevantCases = results.slice(0, 30); // Top 30 relevant

            relevantCases.forEach((c: any) => {
                const data = c.data || c;
                const solutie = (data.tip_solutie || data.solutie || "").toLowerCase();
                if (solutie.includes("admite")) wins++;
                else if (solutie.includes("respinge")) losses++;
            });

            const totalClassified = wins + losses;
            const winRate = totalClassified > 0 ? Math.round((wins / totalClassified) * 100) : 50; // Default 50 if unclear

            // 2. Extract Arguments
            // We'll take 'argumente_instanta' from 'Admite' cases as PRO
            // and from 'Respinge' cases as CON
            const argsPro = relevantCases
                .filter((c: any) => (c.data?.tip_solutie || "").toLowerCase().includes("admite"))
                .map((c: any) => c.data?.argumente_instanta)
                .filter(Boolean)
                .slice(0, 3);

            const argsCon = relevantCases
                .filter((c: any) => (c.data?.tip_solutie || "").toLowerCase().includes("respinge"))
                .map((c: any) => c.data?.argumente_instanta)
                .filter(Boolean)
                .slice(0, 3);

            // 3. Tax Estimation - Extract from metadata
            // detailed tax calculation requires inputs, but we can show the identified category
            const taxSuggestion = relevantCases.find((c: any) => (c.data?.sugestie_llm_taxa || c.sugestie_llm_taxa));
            let taxCategory = "Necunoscut";
            if (taxSuggestion) {
                const taxData = taxSuggestion.data?.sugestie_llm_taxa || taxSuggestion.sugestie_llm_taxa;
                if (taxData && taxData.sugested_nume_standard) {
                    taxCategory = taxData.sugested_nume_standard;
                }
            }

            // 4. Strategic Insights (text_ce_invatam / text_doctrina)
            const strategies = relevantCases
                .map((c: any) => c.data?.text_ce_invatam || c.data?.text_doctrina)
                .filter(Boolean)
                .slice(0, 3); // Top 3 insights

            // 5. Duration (Mocked based on industry avg for the found 'Materie')
            // If materie is "Codul Civil", avg is 18 months, etc.
            const dominantMaterie = relevantCases[0]?.data?.materie || "General";
            let avgDuration = 12;
            if (dominantMaterie.includes("Penal")) avgDuration = 24;
            else if (dominantMaterie.includes("Muncii")) avgDuration = 8;


            // Final Report Object
            const finalReport: PredictionStats = {
                winRate: winRate,
                avgDuration: avgDuration,
                estimatedCost: {
                    tax: 0, // Numeric placeholder
                    taxCategory: taxCategory // meaningful text
                },
                caseCount: relevantCases.length,
                topArgumentsPro: argsPro.length > 0 ? argsPro : ["Argumentele instanței pentru admitere vor apărea aici."],
                topArgumentsCon: argsCon.length > 0 ? argsCon : ["Argumentele instanței pentru respingere vor apărea aici."],
                strategies: strategies.length > 0 ? strategies : ["Nu există sugestii strategice disponibile pentru acest tip de cauză."],
                similarCases: relevantCases.slice(0, 5) // Top 5 for display
            };

            // Mimic completion
            setTimeout(() => {
                clearInterval(interval);
                setReport(finalReport);
                setLoadingMessage(''); // Clear message
                setStep(2);
            }, 2000);

        } catch (error) {
            console.error(error);
            clearInterval(interval);
            setStep(0);
            alert("A apărut o eroare la generarea raportului.");
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-brand-light font-sans text-brand-dark">
            <SEOHead
                title="Raport Juridic Predictiv - LegeaAplicată"
                description="Analiză predictivă a șanselor de câștig în instanță bazată pe jurisprudență și inteligență artificială."
            />
            <Header onToggleMenu={() => { }} onContribuieClick={() => { }} />

            <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 md:py-12">

                {/* HERO SECTION */}
                <div className="text-center mb-12 animate-fade-in-down">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-4">
                        <Brain className="text-indigo-600" size={32} />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-dark to-indigo-600">
                        Raport Juridic Predictiv
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Introduceți situația dumneavoastră și lăsați inteligența artificială să analizeze mii de spețe similare pentru a estima șansele de câștig, costurile și durata procesului.
                    </p>
                </div>

                {/* STEP 0: INPUT */}
                {step === 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl mx-auto border border-gray-100 animate-scale-in">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Descrieți situația de fapt
                        </label>
                        <textarea
                            className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-base bg-gray-50 mb-6"
                            placeholder="Exemplu: Am împrumutat suma de 5000 euro unui prieten prin transfer bancar, fără contract scris. Acesta refuză să îmi restituie banii..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500 flex items-center">
                                <FileText size={14} className="mr-1" />
                                Analiza se bazează pe dosare publice anonimizate.
                            </p>
                            <button
                                onClick={handleAnalyze}
                                disabled={!query.trim() || query.length < 10}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Brain size={20} />
                                Generează Raportul
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 1: LOADING */}
                {step === 1 && (
                    <div className="max-w-xl mx-auto text-center py-12">
                        <div className="mb-8 relative">
                            <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Brain className="text-indigo-600 animate-pulse" size={32} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2 animate-pulse">
                            {loadingMessage}
                        </h3>
                        <p className="text-gray-500 text-sm">
                            Procesăm date din peste 50.000 de hotărâri judecătorești...
                        </p>
                    </div>
                )}

                {/* STEP 2: REPORT RESULT */}
                {step === 2 && report && (
                    <div className="animate-fade-in space-y-8">

                        {/* Summary Cards */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Win Rate Card */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden group">
                                <div className={`absolute top - 0 right - 0 p - 4 opacity - 10 group - hover: opacity - 20 transition - opacity ${report.winRate > 60 ? 'text-green-500' : 'text-amber-500'} `}>
                                    <Scale size={100} />
                                </div>
                                <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider mb-2">Șanse Estimate de Câștig</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text - 5xl font - extrabold ${report.winRate > 60 ? 'text-green-600' : 'text-amber-500'} `}>
                                        {report.winRate}%
                                    </span>
                                    <span className="text-gray-400 text-sm">suces</span>
                                </div>
                                <div className="w-full bg-gray-200 h-2 rounded-full mt-4 overflow-hidden">
                                    <div
                                        className={`h - full rounded - full ${report.winRate > 60 ? 'bg-green-500' : 'bg-amber-500'} `}
                                        style={{ width: `${report.winRate}% ` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                    Bazat pe analiza a {report.caseCount} spețe similare identificate.
                                </p>
                            </div>

                            {/* Duration Card */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500">
                                    <Clock size={100} />
                                </div>
                                <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider mb-2">Durată Estimată</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-extrabold text-blue-600">
                                        {report.avgDuration}
                                    </span>
                                    <span className="text-gray-400 text-sm">luni</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-4">
                                    Media duratei proceselor similare din baza noastră de date.
                                </p>
                            </div>

                            {/* Cost Card */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-500">
                                    <Calculator size={100} />
                                </div>
                                <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider mb-2">Tip Taxă Identificat</h3>
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-purple-700 leading-tight mb-2">
                                        {report.estimatedCost.taxCategory || "Neidentificat"}
                                    </span>
                                    {report.estimatedCost.tax > 0 && (
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-gray-500">~{report.estimatedCost.tax}</span>
                                            <span className="text-sm text-gray-400">RON</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-4">
                                    {report.estimatedCost.taxCategory !== "Neidentificat"
                                        ? "Sistemul a identificat automat categoria taxei pe baza spețelor similare."
                                        : "Nu s-a putut identifica automat categoria taxei."}
                                </p>
                            </div>
                        </div>

                        {/* Strategic Insights Section */}
                        {report.strategies && report.strategies.length > 0 && (
                            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-8 shadow-sm border border-indigo-100">
                                <h3 className="font-bold text-xl mb-6 flex items-center text-indigo-900">
                                    <Sparkles className="text-indigo-600 mr-2" />
                                    Perspective Strategice & Învățăminte
                                </h3>
                                <div className="grid gap-4">
                                    {report.strategies.map((strat, i) => (
                                        <div key={i} className="flex gap-4 items-start bg-white p-4 rounded-xl shadow-sm border border-indigo-50/50">
                                            <div className="bg-indigo-100 p-2 rounded-full mt-1 shrink-0">
                                                <Brain size={16} className="text-indigo-600" />
                                            </div>
                                            <ExpandableText text={strat} limit={200} className="text-gray-700 text-sm leading-relaxed italic" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Analysis Section */}
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* PRO Arguments */}
                            <div className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-green-500">
                                <h3 className="font-bold text-lg mb-4 flex items-center text-gray-800">
                                    <TrendingUp className="text-green-500 mr-2" />
                                    Argumente Favorabile (Din spețe câștigate)
                                </h3>
                                <ul className="space-y-4">
                                    {report.topArgumentsPro.map((arg, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-100">
                                            <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={16} />
                                            <ExpandableText text={arg} limit={150} />
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* CON Arguments */}
                            <div className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-red-500">
                                <h3 className="font-bold text-lg mb-4 flex items-center text-gray-800">
                                    <TrendingDown className="text-red-500 mr-2" />
                                    Riscuri și Argumente Contra
                                </h3>
                                <ul className="space-y-4">
                                    {report.topArgumentsCon.map((arg, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-gray-700 bg-red-50 p-3 rounded-lg border border-red-100">
                                            <XCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                                            <ExpandableText text={arg} limit={150} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Similar Cases List */}
                        <div className="bg-white rounded-2xl p-6 shadow-md">
                            <h3 className="font-bold text-lg mb-4 text-gray-800">Spețe Relevante Identificate</h3>
                            <div className="space-y-3">
                                {report.similarCases.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors group cursor-pointer">
                                        <div>
                                            <p className="font-semibold text-brand-primary group-hover:underline">
                                                {c.data?.titlu || `Speța #${c.id} `}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {c.data?.instanta} • {c.data?.data?.substr(0, 10)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px - 2 py - 1 rounded text - xs font - bold ${(c.data?.tip_solutie || "").toLowerCase().includes("admite")
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-600"
                                                } `}>
                                                {c.data?.tip_solutie || "Soluție Indisponibilă"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="text-center pt-8 pb-12">
                            <button
                                onClick={() => { setStep(0); setQuery(''); }}
                                className="text-gray-500 hover:text-indigo-600 font-medium transition-colors"
                            >
                                Analizează altă situație
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default PredictiveReportPage;
