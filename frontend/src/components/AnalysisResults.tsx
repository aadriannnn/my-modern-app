import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileText, TrendingUp, Activity, Info } from 'lucide-react';

interface AnalysisResultsProps {
    data: any;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ data }) => {
    const results = data.results || {};
    const cases_analyzed = data.cases_analyzed || results.total_cases_analyzed || 0;
    const charts = data.charts || [];

    // Construct interpretation text if not directly provided
    let interpretationContent = data.interpretation;

    if (!interpretationContent) {
        const parts = [];

        if (data.interpretare_calitativa) {
            if (typeof data.interpretare_calitativa === 'string') {
                parts.push(data.interpretare_calitativa);
            } else {
                const qual = data.interpretare_calitativa;
                if (qual.tendinte_si_corelatii) {
                    parts.push(`**Tendințe și Corelații:**\n${qual.tendinte_si_corelatii}`);
                }

                Object.entries(qual).forEach(([key, value]: [string, any]) => {
                    if (key === 'tendinte_si_corelatii') return;

                    const title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    if (typeof value === 'object' && value !== null) {
                        const desc = value.descriere || value.description || JSON.stringify(value);
                        parts.push(`**${title}:**\n${desc}`);
                    } else {
                        parts.push(`**${title}:** ${value}`);
                    }
                });
            }
        }

        if (data.concluzii_finale) {
            parts.push(`**Concluzii Finale:**\n${data.concluzii_finale}`);
        }

        if (parts.length > 0) {
            interpretationContent = parts.join('\n\n');
        }
    }

    // Helper to check if a string is numeric
    const isNumeric = (val: any) => !isNaN(parseFloat(val)) && isFinite(val);

    // Helper to render charts dynamically
    const renderChart = (chartData: any, index: number) => {
        if (!chartData || !chartData.data) return null;

        const formattedData = chartData.data.labels.map((label: string, i: number) => ({
            name: label,
            value: chartData.data.values[i]
        }));

        return (
            <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">{chartData.title}</h4>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartData.type === 'line_chart' ? (
                            <LineChart data={formattedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
                            </LineChart>
                        ) : (
                            <BarChart data={formattedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#82ca9d" />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-200 rounded-lg text-blue-700">
                            <FileText size={20} />
                        </div>
                        <span className="text-sm font-semibold text-blue-800">Cazuri Analizate</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{cases_analyzed}</p>
                </div>

                {results.mean_sentence_years && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-200 rounded-lg text-purple-700">
                                <Activity size={20} />
                            </div>
                            <span className="text-sm font-semibold text-purple-800">Media Pedepselor</span>
                        </div>
                        <p className={`font-bold text-purple-900 ${isNumeric(results.mean_sentence_years) ? 'text-2xl' : 'text-lg'}`}>
                            {results.mean_sentence_years}
                            {isNumeric(results.mean_sentence_years) ? ' ani' : ''}
                        </p>
                    </div>
                )}

                {(results.statistical_significance || results.analiza_limitata) && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-200 rounded-lg text-green-700">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-sm font-semibold text-green-800">
                                {results.analiza_limitata ? 'Notă Analiză' : 'Semnificație'}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-green-900 mt-1">
                            {results.analiza_limitata || results.statistical_significance}
                        </p>
                    </div>
                )}
            </div>

            {/* Interpretation */}
            {interpretationContent && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="text-brand-accent" />
                        <h3 className="text-lg font-bold text-gray-900">Interpretare AI</h3>
                    </div>
                    <div className="text-gray-700 leading-relaxed text-justify whitespace-pre-wrap">
                        {interpretationContent.split('\n').map((line: string, i: number) => {
                            if (line.startsWith('**')) {
                                const parts = line.split('**');
                                return <p key={i} className="mb-2"><strong className="text-gray-900">{parts[1]}</strong>{parts[2]}</p>;
                            }
                            return <p key={i} className="mb-2">{line}</p>;
                        })}
                    </div>
                </div>
            )}

            {/* Charts */}
            {charts && charts.length > 0 && (
                <div className="grid grid-cols-1 gap-6">
                    {charts.map((chart: any, idx: number) => renderChart(chart, idx))}
                </div>
            )}

            {/* Individual Penalties Table */}
            {results.individual_penalties_found && Array.isArray(results.individual_penalties_found) && results.individual_penalties_found.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Pedepse Individuale Identificate</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Caz</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">An</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Infracțiune</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedeapsă</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.individual_penalties_found.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-accent">#{item.case_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.year}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.offense}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.sentence}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Raw Stats (if any extra) */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Detalii Statistice</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(results).map(([key, value]) => {
                        if (['mean_sentence_years', 'trend_by_year', 'statistical_significance', 'total_cases_analyzed', 'analiza_limitata', 'individual_penalties_found'].includes(key)) return null;
                        if (typeof value === 'object') return null;
                        return (
                            <div key={key} className="bg-white p-3 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                                <p className="font-semibold text-gray-800 break-words">{String(value)}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AnalysisResults;
