import React, { useState, useEffect, useRef } from 'react';
import { X, BrainCircuit, Play, AlertCircle, CheckCircle, Clock, Database, ArrowLeft } from 'lucide-react';
import { createAnalysisPlan, executeAnalysisPlan, subscribeToQueueStatus, getAdvancedAnalysisStatus } from '../lib/api';
import QueueStatus from './QueueStatus';
import AnalysisResults from './AnalysisResults';

interface AdvancedAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type WorkflowStep = 'input' | 'creating_plan' | 'preview' | 'executing';

interface PlanData {
    plan_id: string;
    total_cases: number;
    total_chunks: number;
    estimated_time_seconds: number;
    preview_data: any[];
    strategy_summary: string;
}

const AdvancedAnalysisModal: React.FC<AdvancedAnalysisModalProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('input');
    const [planData, setPlanData] = useState<PlanData | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Queue status state
    const [queueStatus, setQueueStatus] = useState<{
        position: number;
        total: number;
        status: 'queued' | 'processing' | 'completed' | 'error';
    }>({ position: 0, total: 0, status: 'queued' });

    const eventSourceRef = useRef<{ close: () => void } | null>(null);

    // Cleanup on unmount or close
    useEffect(() => {
        if (!isOpen) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        }
    }, [isOpen]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentStep('input');
            setPlanData(null);
            setJobId(null);
            setResult(null);
            setError(null);
        }
    }, [isOpen]);

    // PHASE 1: Create Plan
    const handleCreatePlan = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        console.log('[Frontend] Requesting Analysis Plan for:', query);

        try {
            const response = await createAnalysisPlan(query);

            if (response.success && response.job_id) {
                console.log('[Frontend] Plan creation queued. Job ID:', response.job_id);
                setJobId(response.job_id);
                setCurrentStep('creating_plan');
                startPolling(
                    response.job_id,
                    (plan) => {
                        setPlanData(plan);
                        setCurrentStep('preview');
                    },
                    (err) => {
                        setError(err);
                        setCurrentStep('input');
                    }
                );
            } else {
                setError(response.error || 'Nu s-a putut crea planul de analiză.');
                setIsLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'Eroare de conexiune.');
            setIsLoading(false);
        }
    };

    // PHASE 2 & 3: Execute Plan
    const handleExecutePlan = async () => {
        if (!planData) return;

        console.log('[Frontend] ▶️ USER CONFIRMED PLAN. Requesting execution for:', planData.plan_id);
        setIsLoading(true);
        setError(null);
        setCurrentStep('executing');

        try {
            const response = await executeAnalysisPlan(planData.plan_id);

            if (response.success && response.job_id) {
                console.log('[Frontend] Execution started. Job ID:', response.job_id);
                setJobId(response.job_id);
                startPolling(
                    response.job_id,
                    (res) => {
                        setResult(res);
                    },
                    (err) => {
                        setError(err);
                        setCurrentStep('preview');
                    }
                );
            } else {
                setError(response.message || 'Nu s-a putut executa planul.');
                setCurrentStep('preview');
                setIsLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'Eroare de conexiune.');
            setCurrentStep('preview');
            setIsLoading(false);
        }
    };

    const startPolling = (id: string, onSuccess: (data: any) => void, onError: (msg: string) => void) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        eventSourceRef.current = subscribeToQueueStatus(
            id,
            (statusUpdate) => {
                setQueueStatus({
                    position: statusUpdate.position,
                    total: statusUpdate.total,
                    status: statusUpdate.status as any
                });

                // Check if we have a result in the update
                if ((statusUpdate as any).result) {
                    const res = (statusUpdate as any).result;
                    if (res && res.success === false) {
                        setJobId(null);
                        setIsLoading(false);
                        onError(res.error || 'A apărut o eroare necunoscută.');
                        if (eventSourceRef.current) eventSourceRef.current.close();
                    } else {
                        onSuccess(res);
                        setJobId(null);
                        setIsLoading(false);
                        if (eventSourceRef.current) eventSourceRef.current.close();
                    }
                }

                // Check if we have an error in the update
                if ((statusUpdate as any).error) {
                    setJobId(null);
                    setIsLoading(false);
                    onError((statusUpdate as any).error);
                    if (eventSourceRef.current) eventSourceRef.current.close();
                }
            },
            async () => {
                // On complete from SSE, fetch the actual result
                console.log('[Advanced Analysis] SSE completed, fetching result...');
                try {
                    const statusData = await getAdvancedAnalysisStatus(id);
                    console.log('[Advanced Analysis] Status data:', statusData);

                    if (statusData.status === 'completed' && statusData.result) {
                        if (statusData.result.success === false) {
                            onError(statusData.result.error || 'A apărut o eroare necunoscută.');
                        } else {
                            onSuccess(statusData.result);
                        }
                        setJobId(null);
                        setIsLoading(false);
                    } else if (statusData.status === 'failed' || statusData.error) {
                        onError(statusData.error || 'Analiza a eșuat.');
                        setJobId(null);
                        setIsLoading(false);
                    }
                } catch (err: any) {
                    console.error('[Advanced Analysis] Error fetching result:', err);
                    onError(err.message || 'Eroare la preluarea rezultatului.');
                    setJobId(null);
                    setIsLoading(false);
                }
                setQueueStatus(prev => ({ ...prev, status: 'completed' }));
            },
            (err) => {
                console.error("Queue error:", err);
            }
        );
    };

    const handleBackToInput = () => {
        setCurrentStep('input');
        setPlanData(null);
        setError(null);
    };

    const handleNewAnalysis = () => {
        setCurrentStep('input');
        setPlanData(null);
        setResult(null);
        setJobId(null);
        setError(null);
        setQueueStatus({ position: 0, total: 0, status: 'queued' });
    };

    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `~${seconds} secunde`;
        const minutes = Math.ceil(seconds / 60);
        return `~${minutes} ${minutes === 1 ? 'minut' : 'minute'}`;
    };

    // Render Step 1: Query Input
    const renderInputStep = () => (
        <>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">Cum funcționează?</p>
                            <ul className="list-disc pl-4 space-y-1 opacity-90">
                                <li>Descrieți ce doriți să analizați (ex: "Tendința pedepselor pentru omor în ultimii 5 ani")</li>
                                <li>Veți vedea un preview cu strategia AI și costul estimat înainte de execuție.</li>
                                <li>După confirmare, AI-ul va analiza datele și va genera rezultatele.</li>
                            </ul>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Întrebarea de cercetare
                        </label>
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ex: Care este pedeapsa medie pentru furt calificat în funcție de prejudiciu?"
                            className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent resize-none shadow-sm"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Anulează
                </button>
                <button
                    onClick={handleCreatePlan}
                    disabled={!query.trim() || isLoading}
                    className={`flex items-center gap-2 px-6 py-2.5 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${(!query.trim() || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isLoading ? 'Se creează planul...' : (
                        <>
                            <Play className="w-4 h-4 fill-current" />
                            Creează Plan
                        </>
                    )}
                </button>
            </div>
        </>
    );

    // Render Step 2: Plan Preview
    const renderPreviewStep = () => {
        if (!planData) return null;

        return (
            <>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="space-y-6">
                        {/* Header with success icon */}
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-green-900 mb-1">Plan Creat cu Succes!</h4>
                                <p className="text-sm text-green-800">
                                    Revizuiți strategia și costul estimat înainte de a continua.
                                </p>
                            </div>
                        </div>

                        {/* Strategy Summary */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <BrainCircuit className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 mb-1">Strategia AI</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {planData.strategy_summary}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Cost Estimation */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <Database className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Cazuri Găsite</p>
                                        <p className="text-2xl font-bold text-gray-900">{planData.total_cases}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 rounded-lg">
                                        <Database className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Chunks de Procesare</p>
                                        <p className="text-2xl font-bold text-gray-900">{planData.total_chunks}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Timp Estimat</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatTime(planData.estimated_time_seconds)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview Data */}
                        {planData.preview_data && planData.preview_data.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="text-brand-accent">●</span>
                                    Preview Date (3 cazuri exemplu)
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                {Object.keys(planData.preview_data[0]).map((key) => (
                                                    <th key={key} className="text-left py-2 px-3 font-semibold text-gray-700 bg-gray-50">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {planData.preview_data.map((row, idx) => (
                                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                                    {Object.values(row).map((value: any, cellIdx) => (
                                                        <td key={cellIdx} className="py-2 px-3 text-gray-700">
                                                            {typeof value === 'string' && value.length > 100
                                                                ? value.substring(0, 100) + '...'
                                                                : String(value)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-between">
                    <button
                        onClick={handleBackToInput}
                        className="flex items-center gap-2 px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Înapoi
                    </button>
                    <button
                        onClick={handleExecutePlan}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Se execută...' : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Confirmă Planul
                            </>
                        )}
                    </button>
                </div>
            </>
        );
    };

    // Render Step 1.5: Creating Plan
    const renderCreatingPlanStep = () => (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="py-12">
                <QueueStatus
                    position={queueStatus.position}
                    total={queueStatus.total}
                    status={queueStatus.status}
                />
                <div className="text-center mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Generare Plan Analiză</h4>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        AI-ul analizează cererea dvs. și verifică datele disponibile.
                        <br />
                        Acest proces poate dura 1-3 minute.
                    </p>
                </div>
            </div>
            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm mt-4">
                    {error}
                </div>
            )}
        </div>
    );

    // Render Step 3: Executing / Results
    const renderExecutingStep = () => (
        <>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {jobId && !result && (
                    <div className="py-12">
                        <QueueStatus
                            position={queueStatus.position}
                            total={queueStatus.total}
                            status={queueStatus.status}
                        />
                        <p className="text-center text-sm text-gray-500 mt-6 max-w-md mx-auto">
                            Această operațiune poate dura între 2 și 10 minute, în funcție de complexitatea interogării și volumul de date.
                        </p>
                    </div>
                )}

                {result && (
                    <AnalysisResults data={result} />
                )}

                {error && !result && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {result && (
                <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={handleNewAnalysis}
                        className="px-5 py-2.5 text-brand-accent font-medium hover:bg-brand-accent/5 rounded-lg transition-colors"
                    >
                        O nouă analiză
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
                    >
                        Închide
                    </button>
                </div>
            )}
        </>
    );

    return (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-transform duration-200 border border-white/20 ${isOpen ? 'scale-100' : 'scale-95'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-accent/10 text-brand-accent rounded-xl">
                            <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Analiză Juridică Avansată (AI)</h3>
                            <p className="text-sm text-gray-500">
                                {currentStep === 'input' && 'Pas 1: Introduceți întrebarea'}
                                {currentStep === 'creating_plan' && 'Pas 1.5: Generare Plan...'}
                                {currentStep === 'preview' && 'Pas 2: Revizuiți planul'}
                                {currentStep === 'executing' && 'Pas 3: Execuție și rezultate'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content - Render based on current step */}
                {currentStep === 'input' && renderInputStep()}
                {currentStep === 'creating_plan' && renderCreatingPlanStep()}
                {currentStep === 'preview' && renderPreviewStep()}
                {currentStep === 'executing' && renderExecutingStep()}

            </div>
        </div>
    );
};

export default AdvancedAnalysisModal;
