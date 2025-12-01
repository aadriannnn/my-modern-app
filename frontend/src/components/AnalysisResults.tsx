import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileText, TrendingUp, Activity, Info } from 'lucide-react';

interface AnalysisResultsProps {
    data: {
        results: any;
        interpretation: string;
        charts?: any[];
        cases_analyzed: number;
    };
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ data }) => {
    const { results, interpretation, charts, cases_analyzed } = data;

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
                        <p className="text-2xl font-bold text-purple-900">{results.mean_sentence_years} ani</p>
                    </div>
                )}

                {results.statistical_significance && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-200 rounded-lg text-green-700">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-sm font-semibold text-green-800">Semnificație</span>
                        </div>
                        <p className="text-sm font-medium text-green-900 mt-1">{results.statistical_significance}</p>
                    </div>
                )}
            </div>

            {/* Interpretation */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                    <Info className="text-brand-accent" />
                    <h3 className="text-lg font-bold text-gray-900">Interpretare AI</h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-justify whitespace-pre-wrap">
                    {interpretation}
                </p>
            </div>

            {/* Charts */}
            {charts && charts.length > 0 && (
                <div className="grid grid-cols-1 gap-6">
                    {charts.map((chart, idx) => renderChart(chart, idx))}
                </div>
            )}

            {/* Raw Stats (if any extra) */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Detalii Statistice</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(results).map(([key, value]) => {
                        if (['mean_sentence_years', 'trend_by_year', 'statistical_significance', 'total_cases_analyzed'].includes(key)) return null;
                        if (typeof value === 'object') return null;
                        return (
                            <div key={key} className="bg-white p-3 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                                <p className="font-semibold text-gray-800">{String(value)}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AnalysisResults;
