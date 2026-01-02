import React, { useState, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, Clock,
    Brain, CheckCircle, XCircle, Sparkles, FileSearch, Gavel
} from 'lucide-react';
import { predictiveSearch } from '../lib/api';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface PredictiveReportSectionProps {
    userQuery: string;
    caseContext: {
        materie?: string;
        obiect?: string;
    };
    currentCaseId?: number | string;
}

interface PredictionStats {
    winRate: number;      // 0-100
    avgDurationDays: number; // Days
    totalAnalyzed: number;
    topArgumentsPro: string[];
    topArgumentsCon: string[];
    strategies?: string[];
    topEvidence?: { name: string; count: number }[];
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

export const PredictiveReportSection: React.FC<PredictiveReportSectionProps> = ({ userQuery, caseContext }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<PredictionStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);

    const generateReport = async () => {
        if (!userQuery && !caseContext.obiect) return;

        setLoading(true);
        setError(null);
        setIsRestricted(false);

        try {
            // Construct query: User text + Context
            const contextText = `${caseContext.obiect || ''} ${caseContext.materie || ''}`;
            const fullQuery = `${userQuery || ''} ${contextText}`.trim();

            const result = await predictiveSearch({
                situatie: fullQuery,
                materie: [], // we could filter strictly by materie but semantic search is better
                obiect: [],
                tip_speta: [],
                parte: []
            });

            if (result && result.stats) {
                // Transform backend result to frontend structure
                const stats = result.stats;

                // Process top cases for content
                const topCases = result.top_cases || [];

                const argsPro = topCases
                    .filter((c: any) => (c.data?.tip_solutie || "").toLowerCase().includes("admite"))
                    .map((c: any) => c.data?.argumente_instanta)
                    .filter(Boolean)
                    .slice(0, 3);

                const argsCon = topCases
                    .filter((c: any) => (c.data?.tip_solutie || "").toLowerCase().includes("respinge"))
                    .map((c: any) => c.data?.argumente_instanta)
                    .filter(Boolean)
                    .slice(0, 3);

                const strategies = topCases
                    .map((c: any) => c.data?.text_ce_invatam || c.data?.text_doctrina)
                    .filter(Boolean)
                    .slice(0, 3);

                setReport({
                    winRate: stats.win_rate,
                    avgDurationDays: stats.avg_duration_days || 0,
                    totalAnalyzed: stats.total_analyzed,
                    topArgumentsPro: argsPro.length ? argsPro : ["Nu au fost extrase argumente specifice."],
                    topArgumentsCon: argsCon.length ? argsCon : ["Nu au fost extrase argumente specifice."],
                    strategies: strategies.length ? strategies : ["Nu au fost identificate strategii specifice."],
                    topEvidence: stats.top_evidence || [],
                    similarCases: topCases
                });
            } else {
                setError("Nu s-au găsit date suficiente.");
            }

        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 403 || err.response?.status === 401 || err.message?.includes('403') || err.message?.includes('401') || err.message?.includes('PRO') || err.message?.includes('Authentication')) {
                setIsRestricted(true);
            } else {
                setError(err.message || "Eroare la generarea raportului.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate on mount
    useEffect(() => {
        generateReport();
    }, [userQuery, caseContext.obiect]);

    if (loading) {
        return (
            <div className="p-12 text-center min-h-[400px] flex flex-col justify-center items-center">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600/30 animate-pulse" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 animate-pulse mt-4">Analiză Juridică Predictivă...</h3>
                <p className="text-gray-500 text-sm mt-2 max-w-md">Interogăm baza de date pentru {caseContext.obiect} și comparăm cu mii de rezultate similare.</p>
            </div>
        );
    }

    if (isRestricted) {
        return (
            <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-8 text-center shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white/50 backdrop-blur-[2px]"></div>
                <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
                    <div className="rounded-full bg-indigo-100 p-4 text-indigo-600">
                        <Sparkles size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Funcționalitate Premium</h3>
                    <p className="max-w-md text-gray-600">
                        Raportul Juridic Predictiv este disponibil exclusiv pentru abonații <strong>PRO</strong>.
                        Obțineți acces la rata de succes, durata estimată și strategii câștigătoare.
                    </p>
                    <a
                        href="/abonamente"
                        className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-xl focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-700"
                    >
                        Vezi Abonamente
                    </a>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
                <XCircle className="mx-auto text-red-500 mb-2" size={32} />
                <p className="text-red-700">{error}</p>
                <button onClick={generateReport} className="mt-4 text-indigo-600 underline font-semibold">Încearcă din nou</button>
            </div>
        );
    }

    if (!report) return null;

    const formatDuration = (totalDays: number) => {
        if (!totalDays) return "0 zile";
        const years = Math.floor(totalDays / 365);
        const months = Math.floor((totalDays % 365) / 30);
        const days = Math.floor((totalDays % 365) % 30);

        let parts = [];
        if (years > 0) parts.push(`${years} ${years === 1 ? 'an' : 'ani'}`);
        if (months > 0) parts.push(`${months} ${months === 1 ? 'lună' : 'luni'}`);
        if (days > 0 && years === 0) parts.push(`${days} ${days === 1 ? 'zi' : 'zile'}`);

        return parts.join(', ') || "0 zile";
    };

    // Data for Chart
    const winRateData = [
        { name: 'Admis', value: report.winRate },
        { name: 'Respins', value: 100 - report.winRate },
    ];
    const COLORS = ['#10B981', '#EF4444']; // Emerald-500, Red-500

    return (
        <div className="animate-fade-in space-y-6 pb-8">
            {/* Header Summary */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <Sparkles size={20} className="text-yellow-300" />
                            Raport Predictiv AI
                        </h2>
                        <p className="text-indigo-100 text-sm opacity-90 leading-relaxed">
                            Am analizat <strong>{report.totalAnalyzed.toLocaleString()}</strong> de hotărâri similare pentru a genera acest raport.
                            Predicția se bazează pe corelații statistice identificate în spețe cu obiectul <em>"{caseContext.obiect}"</em>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
                {/* Left Column: Charts & Key Stats */}
                <div className="md:col-span-4 space-y-6">
                    {/* Win Rate Chart */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                        <h3 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-2">Probabilitate Succes</h3>

                        <div className="relative w-48 h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={winRateData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {winRateData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className={`text-4xl font-black ${report.winRate > 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {report.winRate}%
                                </span>
                                <span className="text-xs text-gray-400 font-medium">Rata Admis</span>
                            </div>
                        </div>
                        <p className="text-xs text-center text-gray-400 mt-2">
                            Bazat pe istoricul soluțiilor din baza de date
                        </p>
                    </div>

                    {/* Quick Stats: Duration (Full Width) */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-3 rounded-lg text-blue-500"><Clock size={24} /></div>
                            <div>
                                <h3 className="text-gray-500 text-xs uppercase font-bold tracking-wider">Durată Medie</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Estimare bazată pe {report.totalAnalyzed} dosare</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-extrabold text-blue-600 leading-none">{formatDuration(report.avgDurationDays)}</div>
                            <div className="text-xs text-blue-400 font-bold uppercase mt-1">Calendaristic</div>
                        </div>
                    </div>

                    {/* Top Evidence */}
                    {report.topEvidence && report.topEvidence.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <h3 className="text-gray-800 font-bold text-sm mb-4 flex items-center gap-2">
                                <FileSearch size={16} className="text-indigo-500" />
                                Probe Frecvente
                            </h3>
                            <div className="space-y-3">
                                {report.topEvidence.map((ev, i) => (
                                    <div key={i} className="flex flex-col">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-700 font-medium">{ev.name}</span>
                                            <span className="text-slate-400 text-xs">{ev.count} cazuri</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full rounded-full opacity-80"
                                                style={{ width: `${Math.min((ev.count / report.totalAnalyzed) * 300, 100)}%` }} // exaggerate scale for visibility
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Content & Strategies */}
                <div className="md:col-span-8 space-y-6">

                    {/* Strategic Insights */}
                    {report.strategies && report.strategies.length > 0 && (
                        <div className="bg-gradient-to-br from-white to-indigo-50/50 rounded-2xl p-6 shadow-sm border border-indigo-100">
                            <h3 className="font-bold text-lg mb-5 flex items-center text-indigo-900 border-b border-indigo-100 pb-3">
                                <Sparkles className="text-indigo-600 mr-2" size={20} />
                                Recomandări Strategice AI
                            </h3>
                            <div className="grid gap-4">
                                {report.strategies.map((strat, i) => (
                                    <div key={i} className="flex gap-4 items-start bg-white p-4 rounded-xl shadow-sm border border-indigo-50 hover:shadow-md transition-shadow">
                                        <div className="bg-indigo-100 p-2 rounded-lg shrink-0 text-indigo-700 font-bold text-sm">
                                            #{i + 1}
                                        </div>
                                        <ExpandableText text={strat} limit={200} className="text-slate-700 text-sm leading-relaxed" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Arguments Tabs/Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* PRO */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border-t-4 border-emerald-500">
                            <h3 className="font-bold text-md mb-4 flex items-center text-gray-800">
                                <TrendingUp className="text-emerald-500 mr-2" size={20} />
                                Argumente de Admitere
                            </h3>
                            <ul className="space-y-4">
                                {report.topArgumentsPro.map((arg, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-600">
                                        <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                                        <ExpandableText text={arg} limit={140} />
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* CON */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border-t-4 border-rose-500">
                            <h3 className="font-bold text-md mb-4 flex items-center text-gray-800">
                                <TrendingDown className="text-rose-500 mr-2" size={20} />
                                Argumente de Respingere
                            </h3>
                            <ul className="space-y-4">
                                {report.topArgumentsCon.map((arg, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-600">
                                        <XCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                                        <ExpandableText text={arg} limit={140} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-400 border border-slate-100">
                        <Gavel className="inline-block mb-1 mr-1" size={12} />
                        Responsabilitate limitată: Acest raport este generat automat de inteligența artificială pe baza jurisprudenței disponibile și are scop informativ. Nu reprezintă consultanță juridică garantată.
                    </div>
                </div>
            </div>
        </div>
    );
};
