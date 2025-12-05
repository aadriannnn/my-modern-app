import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp, Activity, Info, Table as TableIcon } from 'lucide-react';
import BibliographySection from './BibliographySection';

interface AnalysisResultsProps {
    data: any;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ data }) => {
    const results = data.results || {};
    const cases_analyzed = data.cases_analyzed || results.total_cases_analyzed || 0;
    const charts = data.charts || [];
    const tables = data.tables || [];

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

    // Brand color palette for charts
    const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];

    // Helper to render charts dynamically
    const renderChart = (chartData: any, index: number) => {
        if (!chartData || !chartData.data || !Array.isArray(chartData.data.labels) || !Array.isArray(chartData.data.values)) {
            return null;
        }

        const formattedData = chartData.data.labels.map((label: string, i: number) => ({
            name: label,
            value: chartData.data.values[i] || 0
        }));

        return (
            <div key={index} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">{chartData.title}</h4>
                <div className="h-64 md:h-80 w-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartData.type === 'line_chart' ? (
                            <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: '14px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    activeDot={{ r: 8 }}
                                    name="Valoare"
                                />
                            </LineChart>
                        ) : chartData.type === 'pie_chart' ? (
                            <PieChart>
                                <Pie
                                    data={formattedData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {formattedData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: '14px' }} />
                            </PieChart>
                        ) : (
                            <BarChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: '14px' }} />
                                <Bar
                                    dataKey="value"
                                    fill="#10b981"
                                    name="Valoare"
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    // Helper to render tables dynamically
    const renderTable = (tableData: any, index: number) => {
        if (!tableData || !tableData.columns || !tableData.rows || !Array.isArray(tableData.columns) || !Array.isArray(tableData.rows)) {
            return null;
        }

        return (
            <div key={index} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <TableIcon className="text-brand-accent w-5 h-5" />
                    <h4 className="text-lg font-bold text-gray-800">{tableData.title}</h4>
                </div>
                <div className="overflow-x-auto -mx-4 md:mx-0">
                    <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    {tableData.columns.map((col: string, idx: number) => (
                                        <th
                                            key={idx}
                                            className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300"
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableData.rows.map((row: any[], rowIdx: number) => (
                                    <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                                        {row.map((cell: any, cellIdx: number) => (
                                            <td
                                                key={cellIdx}
                                                className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                                            >
                                                {String(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                    <div className="text-gray-700 leading-relaxed text-justify whitespace-pre-wrap max-h-96 overflow-y-auto pr-2 custom-scrollbar">
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

            {/* Tables */}
            {tables && tables.length > 0 && (
                <div className="space-y-6">
                    {tables.map((table: any, idx: number) => renderTable(table, idx))}
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
                        if (['mean_sentence_years', 'trend_by_year', 'statistical_significance', 'total_cases_analyzed', 'analiza_limitata', 'individual_penalties_found', 'bibliography'].includes(key)) return null;
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

            {/* Bibliography Section */}
            {(data.bibliography?.case_ids || results.bibliography?.case_ids) && (
                <BibliographySection
                    caseIds={data.bibliography?.case_ids || results.bibliography?.case_ids || []}
                    totalCases={data.bibliography?.total_cases || results.bibliography?.total_cases || 0}
                />
            )}
        </div>
    );
};

export default AnalysisResults;
