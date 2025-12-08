import React, { useEffect, useState } from 'react';
import { getFinalReport, downloadFinalReportDocx } from '../lib/api';
import { FileText, BookOpen, CheckCircle2, X, Download } from 'lucide-react';

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
    table_of_contents: Array<{
        chapter_number: string;
        chapter_title: string;
        subsections?: Array<{ number: string; title: string }>;
    }>;
    introduction: {
        context: string;
        scope: string;
        methodology: string;
    };
    chapters: Chapter[];
    conclusions: {
        summary: string;
        findings: string[];
        implications: string;
        future_research?: string;
    };
    bibliography: {
        jurisprudence: Array<{
            case_id: number;
            citation: string;
            relevance: string;
        }>;
        total_cases_cited: number;
    };
    metadata: {
        word_count_estimate: number;
        generation_timestamp: string;
        tasks_synthesized: number;
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
                                        {report.metadata.word_count_estimate.toLocaleString()} cuvinte
                                    </span>
                                    <span className="text-sm text-gray-500">•</span>
                                    <span className="text-sm text-gray-500">
                                        {report.bibliography.total_cases_cited} cazuri citate
                                    </span>
                                </div>
                            </div>

                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.title}</h1>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span>{report.metadata.tasks_synthesized} task-uri sintetizate</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>Generat {new Date(report.metadata.generation_timestamp).toLocaleDateString('ro-RO')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {/* Table of Contents */}
                            <div className="mb-12 bg-gray-50 rounded-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    Cuprins
                                </h2>
                                <ul className="space-y-2">
                                    {report.table_of_contents.map((item, idx) => (
                                        <li key={idx}>
                                            <div className="flex gap-2">
                                                <span className="font-medium text-gray-700">{item.chapter_number}.</span>
                                                <span className="text-gray-900">{item.chapter_title}</span>
                                            </div>
                                            {item.subsections && item.subsections.length > 0 && (
                                                <ul className="ml-6 mt-1 space-y-1">
                                                    {item.subsections.map((sub, subIdx) => (
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

                            {/* Introduction */}
                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Introducere</h2>
                                <div className="space-y-4 text-gray-700 leading-relaxed">
                                    <p>{report.introduction.context}</p>
                                    <p>{report.introduction.scope}</p>
                                    <p>{report.introduction.methodology}</p>
                                </div>
                            </section>

                            {/* Chapters */}
                            {report.chapters.map((chapter, idx) => (
                                <section key={idx} className="mb-12">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                        {chapter.chapter_number}. {chapter.chapter_title}
                                    </h2>

                                    <div className="prose prose-gray max-w-none">
                                        <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                                            {chapter.content}
                                        </div>

                                        {chapter.subsections && chapter.subsections.map((subsection, subIdx) => (
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
                                                    {chapter.key_points.map((point, pointIdx) => (
                                                        <li key={pointIdx} className="text-gray-700">{point}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            ))}

                            {/* Conclusions */}
                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Concluzii</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rezumat</h3>
                                        <p className="text-gray-700 leading-relaxed">{report.conclusions.summary}</p>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Constatări</h3>
                                        <ul className="space-y-2">
                                            {report.conclusions.findings.map((finding, idx) => (
                                                <li key={idx} className="flex gap-2">
                                                    <span className="text-blue-600 font-bold">{idx + 1}.</span>
                                                    <span className="text-gray-700">{finding}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Implicații Practice</h3>
                                        <p className="text-gray-700 leading-relaxed">{report.conclusions.implications}</p>
                                    </div>

                                    {report.conclusions.future_research && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cercetare Viitoare</h3>
                                            <p className="text-gray-700 leading-relaxed">{report.conclusions.future_research}</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Bibliography */}
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Bibliografie</h2>

                                <div className="bg-gray-50 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Jurisprudență ({report.bibliography.total_cases_cited} cazuri)
                                    </h3>

                                    {report.bibliography.jurisprudence.length === 0 ? (
                                        <p className="text-gray-600 italic">Nu există cazuri citate.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {report.bibliography.jurisprudence
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
