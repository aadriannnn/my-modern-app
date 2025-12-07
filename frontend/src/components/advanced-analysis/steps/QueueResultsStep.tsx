import React, { useState } from 'react';
import { X, AlertCircle, Clock, Loader2, FileText } from 'lucide-react';
import AnalysisResults from '../../AnalysisResults';
import type { QueueTask } from '../../../types';
import { generateFinalReport, getAdvancedAnalysisStatus } from '../../../lib/api';

interface QueueResultsStepProps {
    queueTasks: QueueTask[];
    selectedTaskId: string | null;
    setSelectedTaskId: (id: string | null) => void;
    onCloseAndClear: () => void;
    onShowFinalReport?: (reportId: string) => void;
}

export const QueueResultsStep: React.FC<QueueResultsStepProps> = ({
    queueTasks,
    selectedTaskId,
    setSelectedTaskId,
    onCloseAndClear,
    onShowFinalReport
}) => {
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const completedTasks = queueTasks.filter(t => t.state === 'completed' || t.state === 'failed');
    const activeTask = queueTasks.find(t => t.id === selectedTaskId) || completedTasks[0];

    const hasCompletedTasks = queueTasks.some(t => t.state === 'completed');
    const hasPendingTasks = queueTasks.some(t => t.state !== 'completed' && t.state !== 'failed');

    const handleGenerateFinalReport = async () => {
        try {
            setIsGeneratingReport(true);
            setReportError(null);

            // Call API to generate report
            const response = await generateFinalReport();
            const jobId = response.job_id;

            // Poll for completion
            const pollInterval = setInterval(async () => {
                try {
                    const status = await getAdvancedAnalysisStatus(jobId);

                    if (status.status === 'completed') {
                        clearInterval(pollInterval);
                        setIsGeneratingReport(false);

                        if (status.result?.success && status.result?.report_id) {
                            // Show final report
                            onShowFinalReport?.(status.result.report_id);
                        } else {
                            setReportError(status.result?.error || 'Eroare la generarea raportului');
                        }
                    } else if (status.status === 'error' || status.result?.success === false) {
                        clearInterval(pollInterval);
                        setIsGeneratingReport(false);
                        setReportError(status.result?.error || 'Eroare la generarea raportului');
                    }
                } catch (err: any) {
                    clearInterval(pollInterval);
                    setIsGeneratingReport(false);
                    setReportError(err.message || 'Eroare la verificarea stării');
                }
            }, 3000); // Poll every 3 seconds

        } catch (err: any) {
            setIsGeneratingReport(false);
            setReportError(err.message || 'Eroare la inițierea generării raportului');
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex min-h-0 bg-gray-50/50">
                {/* Sidebar List */}
                <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-white">
                    <div className="p-4 border-b border-gray-100">
                        <h4 className="font-bold text-gray-700">Sarcini Analizate</h4>
                        <p className="text-xs text-gray-500">Selectați pentru detalii</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {completedTasks.map((task, idx) => (
                            <button
                                key={task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedTaskId === task.id ? 'bg-blue-50 border-l-4 border-brand-accent' : 'border-l-4 border-transparent'}`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                                    {task.state === 'failed' ? (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full uppercase font-bold">Eșuat</span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full uppercase font-bold">Complet</span>
                                    )}
                                </div>
                                <p className={`text-sm font-medium line-clamp-2 ${selectedTaskId === task.id ? 'text-blue-900' : 'text-gray-700'}`}>
                                    {task.query}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTask ? (
                        <>
                            {activeTask.state === 'failed' ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="p-4 bg-red-100 rounded-full mb-4">
                                        <AlertCircle className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Analiză Eșuată</h3>
                                    <p className="text-gray-600 max-w-md mb-4">{activeTask.query}</p>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-lg w-full">
                                        <p className="font-mono text-sm text-red-800 break-words">{activeTask.error || "Eroare necunoscută"}</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="mb-6 pb-4 border-b border-gray-200">
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">{activeTask.query}</h2>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                Finalizat la {new Date((activeTask.completed_at || activeTask.updated_at) * 1000).toLocaleString()}
                                            </span>
                                            {activeTask.plan && <span>• {activeTask.plan.total_cases} cazuri</span>}
                                        </div>
                                    </div>
                                    {activeTask.result ? (
                                        <AnalysisResults data={activeTask.result} />
                                    ) : (
                                        <div className="text-center py-12 text-gray-400">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                            <p>Se încarcă rezultatele...</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Selectați o sarcină din listă.
                        </div>
                    )}
                </div>
            </div>

            {/* Footer for Queue Results */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                {reportError && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{reportError}</p>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div>
                        {hasCompletedTasks && !hasPendingTasks && (
                            <button
                                onClick={handleGenerateFinalReport}
                                disabled={isGeneratingReport}
                                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingReport ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Se Generează Raportul...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-4 h-4" />
                                        Generează Referat Final
                                    </>
                                )}
                            </button>
                        )}

                        {hasPendingTasks && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>Completați toate task-urile pentru a genera raportul final</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onCloseAndClear}
                        className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 shadow-md flex items-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Închide & Ștergere Istoric
                    </button>
                </div>
            </div>
        </div>
    );
};
