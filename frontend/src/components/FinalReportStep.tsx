import React, { useEffect, useState } from 'react';
import { getFinalReport, downloadFinalReportDocx } from '../lib/api';
import { FileText, BookOpen, CheckCircle2, X, Download, BarChart3, Table2 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

interface Chapter {
    chapter_number: string;
    chapter_title: string;
    content: string;
    subsections?: Array<{
        number: string;
        title: string;
        content: string;
    }>;
    key_cases?: number[];
    key_points?: string[];
}

interface FinalReport {
    title: string;
    executive_summary?: string;

    // Dissertation fields (optional now)
    table_of_contents?: Array<{
        chapter_number: string;
        chapter_title: string;
        subsections?: Array<{ number: string; title: string }>;
    }>;
    introduction?: {
        context: string;
        scope: string;
        methodology: string;
        motivation?: string;
        summary?: string;
    };
    chapters?: Chapter[];
    conclusions?: {
        summary: string;
        findings: string[];
        implications: string;
        future_research?: string;
        summary_findings?: string;
        final_perspective?: string;
    };
    bibliography?: {
        jurisprudence: Array<{
            case_id: number;
            citation: string;
            relevance: string;
        }>;
        total_cases_cited: number;
    };

    // New Tasks
    tasks?: Array<{
        id: string;
        type: 'chart' | 'comparison';
        label: string;
        instructions?: string;
        chart_spec?: {
            format: string;
            chart_type: string;
            data: { columns: string[]; rows: any[][] };
            options?: any;
            caption?: string;
            filename_hint?: string;
        };
        comparison_table?: {
            columns: string[];
            rows: string[][];
        };
        narrative_summary?: string;
        recommendation?: string;
    }>;

    metadata: {
        word_count_estimate?: number;
        generation_timestamp?: string;
        generation_date?: string;
        tasks_synthesized?: number;
    };
}

interface FinalReportStepProps {
    reportId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const FinalReportStep: React.FC<FinalReportStepProps> = ({ reportId, isOpen, onClose }) => {
    const [report, setReport] = useState<FinalReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (isOpen && reportId) {
            const loadReport = async () => {
                try {
                    setLoading(true);
                    const data = await getFinalReport(reportId);
                    setReport(data);
                } catch (err: any) {
                    setError(err.message || 'Eroare la încărcarea raportului');
                } finally {
                    setLoading(false);
                }
            };

            loadReport();
        }
    }, [reportId, isOpen]);

    const handleExportDocx = async () => {
        try {
            setIsExporting(true);
            await downloadFinalReportDocx(reportId);
        } catch (err: any) {
            setError(err.message || 'Eroare la exportul documentului');
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        // Modal Overlay
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {/* Modal Container - Click outside to close */}
            <div
                className="fixed inset-0"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors z-10"
                    aria-label="Închide"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-24">
                        <div className="text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
                            <p className="text-gray-600">Se încarcă raportul final...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-6">
                        <p className="text-red-800 font-medium">Eroare: {error}</p>
                    </div>
                )}

                {/* Report Content */}
                {report && !loading && (
                    <>
                        {/* Header */}
                        <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-500">
                                        {(report.metadata?.word_count_estimate || 0).toLocaleString()} cuvinte
                                    </span>
                                    <span className="text-sm text-gray-500">•</span>
                                    <span className="text-sm text-gray-500">
                                        {report.bibliography?.total_cases_cited || 0} cazuri citate
                                    </span>
                                </div>
                            </div>

                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.title}</h1>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span>{report.metadata?.tasks_synthesized || 0} task-uri sintetizate</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>Generat {new Date(report.metadata?.generation_timestamp || report.metadata?.generation_date || new Date().toISOString()).toLocaleDateString('ro-RO')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {/* Executive Summary (Common) */}
                            {report.executive_summary && (
                                <section className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Executive Summary</h2>
                                    <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                                        {report.executive_summary}
                                    </div>
                                </section>
                            )}

                            {/* TASKS MODE (Charts & Comparisons) */}
                            {report.tasks && report.tasks.length > 0 ? (
                                <div className="space-y-12">
                                    {report.tasks.map((task, idx) => (
                                        <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                            {/* Task Header */}
                                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                                                {task.type === 'chart' ? <BarChart3 className="w-5 h-5 text-blue-600" /> : <Table2 className="w-5 h-5 text-green-600" />}
                                                <h3 className="font-bold text-lg text-gray-900">{task.label}</h3>
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${task.type === 'chart' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                    {task.type === 'chart' ? 'Visual Analysis' : 'Comparative Analysis'}
                                                </span>
                                            </div>

                                            <div className="p-6">
                                                {/* Instructions/Context */}
                                                {task.instructions && (
                                                    <p className="text-gray-500 italic mb-6 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        Task: {task.instructions}
                                                    </p>
                                                )}

                                                {/* CHART RENDERER */}
                                                {task.type === 'chart' && task.chart_spec && (
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full h-[400px] mb-4">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                {(() => {
                                                                    const spec = task.chart_spec!;
                                                                    const data = spec.data.rows.map(row => {
                                                                        const obj: any = {};
                                                                        spec.data.columns.forEach((col, cIdx) => {
                                                                            obj[col] = row[cIdx];
                                                                        });
                                                                        return obj;
                                                                    });
                                                                    const xKey = spec.data.columns[0];
                                                                    const yKeys = spec.data.columns.slice(1);
                                                                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

                                                                    if (spec.chart_type === 'pie') {
                                                                        return (
                                                                            <PieChart>
                                                                                <Pie
                                                                                    data={data}
                                                                                    cx="50%"
                                                                                    cy="50%"
                                                                                    labelLine={false}
                                                                                    outerRadius={150}
                                                                                    fill="#8884d8"
                                                                                    dataKey={yKeys[0]} // Use first numeric column
                                                                                    nameKey={xKey}
                                                                                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                                                >
                                                                                    {data.map((_, index) => (
                                                                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                                                                    ))}
                                                                                </Pie>
                                                                                <Tooltip />
                                                                                <Legend />
                                                                            </PieChart>
                                                                        );
                                                                    } else if (spec.chart_type === 'line') {
                                                                        return (
                                                                            <LineChart data={data}>
                                                                                <CartesianGrid strokeDasharray="3 3" />
                                                                                <XAxis dataKey={xKey} />
                                                                                <YAxis />
                                                                                <Tooltip />
                                                                                <Legend />
                                                                                {yKeys.map((key, kIdx) => (
                                                                                    <Line key={key} type="monotone" dataKey={key} stroke={colors[kIdx % colors.length]} activeDot={{ r: 8 }} />
                                                                                ))}
                                                                            </LineChart>
                                                                        );
                                                                    } else {
                                                                        // Default BAR
                                                                        return (
                                                                            <BarChart data={data}>
                                                                                <CartesianGrid strokeDasharray="3 3" />
                                                                                <XAxis dataKey={xKey} />
                                                                                <YAxis />
                                                                                <Tooltip />
                                                                                <Legend />
                                                                                {yKeys.map((key, kIdx) => (
                                                                                    <Bar key={key} dataKey={key} fill={colors[kIdx % colors.length]} />
                                                                                ))}
                                                                            </BarChart>
                                                                        );
                                                                    }
                                                                })()}
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <p className="text-sm text-gray-500 font-medium text-center">{task.chart_spec.caption}</p>
                                                    </div>
                                                )}

                                                {/* COMPARISON RENDERER */}
                                                {task.type === 'comparison' && task.comparison_table && (
                                                    <div className="space-y-6">
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        {task.comparison_table.columns.map((col, cIdx) => (
                                                                            <th key={cIdx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                                {col}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {task.comparison_table.rows.map((row, rIdx) => (
                                                                        <tr key={rIdx}>
                                                                            {row.map((cell, cIdx) => (
                                                                                <td key={cIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                    {cell}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {task.narrative_summary && (
                                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                                <h4 className="font-semibold text-blue-900 mb-2">Analysis Summary</h4>
                                                                <p className="text-blue-800 text-sm leading-relaxed">{task.narrative_summary}</p>
                                                            </div>
                                                        )}
                                                        {task.recommendation && (
                                                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                                <h4 className="font-semibold text-green-900 mb-2">Recommendation</h4>
                                                                <p className="text-green-800 text-sm leading-relaxed">{task.recommendation}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* DISSERTATION MODE (Original) */
                                <>
                                    {/* Table of Contents */}
                                    {report.table_of_contents && (
                                        <div className="mb-12 bg-gray-50 rounded-lg p-6">
                                            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                <BookOpen className="w-5 h-5" />
                                                Cuprins
                                            </h2>
                                            <ul className="space-y-2">
                                                {(report.table_of_contents || []).map((item, idx) => (
                                                    <li key={idx}>
                                                        <div className="flex gap-2">
                                                            <span className="font-medium text-gray-700">{item.chapter_number}.</span>
                                                            <span className="text-gray-900">{item.chapter_title}</span>
                                                        </div>
                                                        {item.subsections && item.subsections.length > 0 && (
                                                            <ul className="ml-6 mt-1 space-y-1">
                                                                {(item.subsections || []).map((sub, subIdx) => (
                                                                    <li key={subIdx} className="flex gap-2 text-sm">
                                                                        <span className="text-gray-600">{sub.number}</span>
                                                                        <span className="text-gray-700">{sub.title}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Introduction */}
                                    {report.introduction && (
                                        <section className="mb-12">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introducere</h2>
                                            <div className="space-y-4 text-gray-700 leading-relaxed">
                                                <p>{report.introduction.context || report.introduction.motivation || ""}</p>
                                                <p>{report.introduction.scope || ""}</p>
                                                <p>{report.introduction.methodology || ""}</p>
                                                <p>{report.introduction.summary || ""}</p>
                                            </div>
                                        </section>
                                    )}

                                    {/* Chapters */}
                                    {(report.chapters || []).map((chapter, idx) => (
                                        <section key={idx} className="mb-12">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                                {chapter.chapter_number}. {chapter.chapter_title}
                                            </h2>

                                            <div className="prose prose-gray max-w-none">
                                                <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                                                    {chapter.content}
                                                </div>

                                                {(chapter.subsections || []).map((subsection, subIdx) => (
                                                    <div key={subIdx} className="mt-6">
                                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                                            {subsection.number} {subsection.title}
                                                        </h3>
                                                        <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                                                            {subsection.content}
                                                        </div>
                                                    </div>
                                                ))}

                                                {chapter.key_points && chapter.key_points.length > 0 && (
                                                    <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4">
                                                        <h4 className="font-semibold text-gray-900 mb-2">Puncte cheie:</h4>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {(chapter.key_points || []).map((point, pointIdx) => (
                                                                <li key={pointIdx} className="text-gray-700">{point}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    ))}

                                    {/* Conclusions */}
                                    {report.conclusions && (
                                        <section className="mb-12">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Concluzii</h2>

                                            <div className="space-y-6">
                                                {report.conclusions.summary && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rezumat</h3>
                                                        <p className="text-gray-700 leading-relaxed">{report.conclusions.summary}</p>
                                                    </div>
                                                )}
                                                {report.conclusions.summary_findings && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rezumat Constatări</h3>
                                                        <p className="text-gray-700 leading-relaxed">{report.conclusions.summary_findings}</p>
                                                    </div>
                                                )}

                                                {report.conclusions.findings && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Constatări</h3>
                                                        <ul className="space-y-2">
                                                            {(report.conclusions.findings || []).map((finding, idx) => (
                                                                <li key={idx} className="flex gap-2">
                                                                    <span className="text-blue-600 font-bold">{idx + 1}.</span>
                                                                    <span className="text-gray-700">{finding}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {report.conclusions.implications && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Implicații Practice</h3>
                                                        <p className="text-gray-700 leading-relaxed">{report.conclusions.implications}</p>
                                                    </div>
                                                )}

                                                {report.conclusions.final_perspective && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Perspectivă Finală</h3>
                                                        <p className="text-gray-700 leading-relaxed">{report.conclusions.final_perspective}</p>
                                                    </div>
                                                )}

                                                {report.conclusions.future_research && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Cercetare Viitoare</h3>
                                                        <p className="text-gray-700 leading-relaxed">{report.conclusions.future_research}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    )}

                                    {/* Bibliography */}
                                    {report.bibliography && (
                                        <section className="mb-8">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bibliografie</h2>

                                            <div className="bg-gray-50 rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                                    Jurisprudență ({report.bibliography.total_cases_cited || (report.bibliography.jurisprudence?.length) || 0} cazuri)
                                                </h3>

                                                {(!report.bibliography.jurisprudence || report.bibliography.jurisprudence.length === 0) ? (
                                                    <p className="text-gray-600 italic">Nu există cazuri citate.</p>
                                                ) : (
                                                    <ul className="space-y-3">
                                                        {(report.bibliography.jurisprudence || [])
                                                            .sort((a, b) => (a.citation || '').localeCompare(b.citation || ''))
                                                            .map((item, idx) => (
                                                                <li key={idx} className="border-l-2 border-blue-500 pl-4">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="text-gray-600 font-mono text-sm">{idx + 1}.</span>
                                                                        <div>
                                                                            <p className="font-medium text-gray-900">{item.citation}</p>
                                                                            {item.relevance && (
                                                                                <p className="text-sm text-gray-600 italic mt-1">{item.relevance}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}

                                                    </ul>
                                                )}
                                            </div>
                                        </section>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Raport ID: <span className="font-mono">{reportId}</span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors"
                                >
                                    <FileText className="w-4 h-4" />
                                    Printează
                                </button>

                                <button
                                    onClick={handleExportDocx}
                                    disabled={isExporting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    {isExporting ? 'Se Exportă...' : 'Descarcă DOCX'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
