import React, { useState, useEffect, useRef } from 'react';
import { X, BrainCircuit, Play, AlertCircle, CheckCircle, Zap, Brain, Mail, ListPlus, Loader2, Clock } from 'lucide-react';
import {
    createAnalysisPlan,
    executeAnalysisPlan,
    subscribeToQueueStatus,
    getAdvancedAnalysisStatus,
    // Queue API
    addQueueTask,
    getQueue,
    removeQueueTask,
    generatePlansBatch,
    executeQueue
} from '../lib/api';
import QueueStatus from './QueueStatus';
import AnalysisResults from './AnalysisResults';
import { BatchPlanPreview } from './advanced-analysis/BatchPlanPreview';
import { QueueExecutionProgress } from './advanced-analysis/QueueExecutionProgress';
import type { QueueTask } from '../types';

interface AdvancedAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type WorkflowStep = 'input' | 'queue_management' | 'creating_plan' | 'preview' | 'preview_batch' | 'executing' | 'executing_queue' | 'queue_results';

interface PlanData {
    plan_id: string;
    total_cases: number;
    total_chunks: number;
    estimated_time_seconds: number;
    preview_data: any[];
    strategy_summary: string;
    original_total_cases?: number;
    strategies_used?: string[];
    strategy_breakdown?: Record<string, number>;
}

// Key for localStorage
const STORAGE_KEY = 'advancedAnalysisState';

const AdvancedAnalysisModal: React.FC<AdvancedAnalysisModalProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('input');
    const [planData, setPlanData] = useState<PlanData | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Queue Mode State
    const [queueTasks, setQueueTasks] = useState<QueueTask[]>([]);
    const [isQueueMode, setIsQueueMode] = useState(false);
    const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Email notification state
    const [notificationEmail, setNotificationEmail] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

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
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
        }
    }, [isOpen]);

    // Save state to localStorage whenever critical data changes
    useEffect(() => {
        if (query || jobId || planData || result || (queueTasks && queueTasks.length > 0)) {
            const stateToSave = {
                version: '2.0',
                query,
                currentStep,
                planData,
                jobId,
                result,
                isQueueMode,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        }
    }, [query, currentStep, planData, jobId, result, queueTasks, isQueueMode]);

    // Restore state on mount
    useEffect(() => {
        if (isOpen) {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);

                    // Migration check
                    if (parsed.version !== '2.0') {
                        console.log('[Frontend] Migrating storage to 2.0 (clearing old)');
                        localStorage.removeItem(STORAGE_KEY);
                        return;
                    }

                    console.log('[Frontend] Restoring session from localStorage:', parsed);

                    if (parsed.query) setQuery(parsed.query);
                    if (parsed.planData) setPlanData(parsed.planData);
                    if (parsed.result) setResult(parsed.result);
                    if (parsed.isQueueMode) setIsQueueMode(parsed.isQueueMode);

                    // Restore Queue
                    refreshQueue();

                    // Logic to resume based on status
                    if (parsed.jobId) {
                        setJobId(parsed.jobId);
                        if (parsed.currentStep === 'creating_plan' || parsed.currentStep === 'executing' || parsed.currentStep === 'executing_queue') {
                            setCurrentStep(parsed.currentStep);
                            checkJobStatus(parsed.jobId, parsed.currentStep);
                        } else {
                            setCurrentStep(parsed.currentStep);
                        }
                    } else {
                        setCurrentStep(parsed.currentStep);
                    }

                } catch (e) {
                    console.error('Error parsing saved state:', e);
                    localStorage.removeItem(STORAGE_KEY);
                }
            } else {
                // Always fetch queue on open to sync
                refreshQueue();
            }
        }
    }, [isOpen]);

    const refreshQueue = async () => {
        try {
            const data = await getQueue();
            setQueueTasks(data.tasks || []);
        } catch (e) {
            console.error("Failed to load queue:", e);
        }
    };

    // Helper to check status of a restored job
    const checkJobStatus = async (id: string, step: WorkflowStep) => {
        try {
            const status = await getAdvancedAnalysisStatus(id);
            console.log('[Frontend] Checked restored job status:', status);

            if (status.status === 'completed' && status.result) {
                if (status.result.success === false) {
                    setError(status.result.error || 'Job failed.');
                    // If queue execution failed, we might want to stay on execution page to show partial results
                    if (step === 'executing_queue') {
                         setCurrentStep('executing_queue');
                         // Fetch latest queue state
                         refreshQueue();
                    } else {
                        setCurrentStep('input');
                    }
                } else {
                    // Job finished while we were away
                    if (step === 'creating_plan') {
                        // Single plan
                        setPlanData(status.result);
                        setCurrentStep('preview');
                    } else if (step === 'executing') {
                        setResult(status.result);
                        setCurrentStep('executing');
                    } else if (step === 'executing_queue') {
                        // Queue execution finished
                        refreshQueue().then(() => {
                            // Check if we should move to results immediately if job is done
                            // Actually, let the user click "View Results" or auto-transition if needed
                            // For now stay on executing_queue so they see the "Complete" message
                             setCurrentStep('executing_queue');
                        });
                    }
                }
                setJobId(null);
            } else if (status.status === 'failed' || status.error) {
                setError(status.error || 'Job failed.');
                if (step !== 'executing_queue') setCurrentStep('input');
                setJobId(null);
            } else {
                // Still running, resume polling
                 if (step === 'creating_plan') {
                    startPolling(id, (plan) => { setPlanData(plan); setCurrentStep('preview'); }, setError);
                } else if (step === 'executing') {
                    startPolling(id, (res) => { setResult(res); }, setError);
                } else if (step === 'executing_queue') {
                    // For queue execution, we poll status but main updates come from refreshing queue task states
                    startQueuePolling(id);
                }
            }
        } catch (e) {
            console.error('Error checking restored job:', e);
            setError("Nu s-a putut restaura sesiunea anterioară.");
        }
    };

    // --- Queue Management Handlers ---

    const handleAddToQueue = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        try {
            await addQueueTask(query);
            setQuery('');
            await refreshQueue();
            setIsQueueMode(true);
            setCurrentStep('queue_management');
        } catch (e: any) {
            setError(e.message || "Failed to add task");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveTask = async (taskId: string) => {
        try {
            await removeQueueTask(taskId);
            await refreshQueue();
        } catch (e: any) {
            console.error(e);
        }
    };

    const handleGenerateAllPlans = async () => {
        setIsLoading(true);
        try {
            const res = await generatePlansBatch();
            if (res.success && res.job_id) {
                setJobId(res.job_id);
                setCurrentStep('creating_plan'); // Re-use loading screen or custom
                startQueuePolling(res.job_id, () => {
                     refreshQueue().then(() => setCurrentStep('preview_batch'));
                });
            }
        } catch (e: any) {
            setError(e.message);
            setIsLoading(false);
        }
    };

    const handleExecuteQueue = async () => {
        setIsLoading(true);
        try {
            const res = await executeQueue(notificationEmail, termsAccepted);
            if (res.success && res.job_id) {
                setJobId(res.job_id);
                setCurrentStep('executing_queue');
                startQueuePolling(res.job_id, () => {
                    refreshQueue();
                    // Finished
                });
            }
        } catch (e: any) {
            setError(e.message);
            setIsLoading(false);
        }
    };

    // Polling specifically for queue operations where we also want to refresh the task list periodically
    const startQueuePolling = (id: string, onComplete?: () => void) => {
        // Clear existing
        if (pollingInterval) clearInterval(pollingInterval);
        if (eventSourceRef.current) eventSourceRef.current.close();

        // We use SSE for the job status
        eventSourceRef.current = subscribeToQueueStatus(
            id,
            (statusUpdate) => {
                setQueueStatus({
                    position: statusUpdate.position,
                    total: statusUpdate.total,
                    status: statusUpdate.status as any
                });

                // Periodically refresh queue state to show progress
                refreshQueue();

                if (statusUpdate.status === 'completed' || statusUpdate.status === 'error' || (statusUpdate as any).result) {
                    if (onComplete) onComplete();
                    setJobId(null);
                    setIsLoading(false);
                    if (eventSourceRef.current) eventSourceRef.current.close();
                }
            },
            () => {
                 // SSE closed
                 if (onComplete) onComplete();
                 setJobId(null);
                 setIsLoading(false);
            },
            () => {} // onError is not needed for now
        );
    };

    // --- Standard Single Task Handlers ---

    const handleCreatePlan = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setIsQueueMode(false);

        try {
            const response = await createAnalysisPlan(query);

            if (response.success && response.job_id) {
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

    const handleExecutePlan = async () => {
        if (!planData) return;
        setIsLoading(true);
        setError(null);
        setCurrentStep('executing');

        try {
            let notificationPreferences = undefined;
            if (notificationEmail && termsAccepted) {
                notificationPreferences = {
                    email: notificationEmail,
                    terms_accepted: termsAccepted
                };
            }

            const response = await executeAnalysisPlan(planData.plan_id, notificationPreferences);

            if (response.success && response.job_id) {
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

    // Shared Polling Logic
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

                if ((statusUpdate as any).error) {
                    setJobId(null);
                    setIsLoading(false);
                    onError((statusUpdate as any).error);
                    if (eventSourceRef.current) eventSourceRef.current.close();
                }
            },
            async () => {
                try {
                    const statusData = await getAdvancedAnalysisStatus(id);
                    if (statusData.status === 'completed' && statusData.result) {
                        if (statusData.result.success === false) {
                            onError(statusData.result.error || 'A apărut o eroare necunoscută.');
                        } else {
                            onSuccess(statusData.result);
                        }
                    } else if (statusData.status === 'failed' || statusData.error) {
                        onError(statusData.error || 'Analiza a eșuat.');
                    }
                    setJobId(null);
                    setIsLoading(false);
                } catch (err: any) {
                    onError(err.message || 'Eroare la preluarea rezultatului.');
                    setJobId(null);
                    setIsLoading(false);
                }
                setQueueStatus(prev => ({ ...prev, status: 'completed' }));
            },
            (err) => console.error("Queue error:", err)
        );
    };

    // --- UI Render Helpers ---

    const renderInputStep = () => (
        <>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">Cum funcționează?</p>
                            <ul className="list-disc pl-4 space-y-1 opacity-90">
                                <li>Descrieți ce doriți să analizați.</li>
                                <li>Puteți adăuga mai multe cereri în coadă ("Add to Queue").</li>
                                <li>AI-ul va genera planuri pentru toate, apoi le puteți executa secvențial.</li>
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
                            placeholder="Ex: Care este pedeapsa medie pentru furt calificat..."
                            className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent resize-none shadow-sm"
                        />
                    </div>

                    {queueTasks.length > 0 && (
                        <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                            <span className="font-medium text-gray-700">{queueTasks.length} sarcini în coadă</span>
                            <button
                                onClick={() => { setIsQueueMode(true); setCurrentStep('queue_management'); }}
                                className="text-sm text-brand-accent font-bold hover:underline"
                            >
                                Vezi Coada &rarr;
                            </button>
                        </div>
                    )}

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
                    onClick={handleAddToQueue}
                    disabled={!query.trim() || isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 border border-brand-accent text-brand-accent font-bold rounded-lg hover:bg-brand-accent/5 transition-all"
                >
                    <ListPlus className="w-4 h-4" />
                    Adaugă la Coadă
                </button>
                <button
                    onClick={handleCreatePlan}
                    disabled={!query.trim() || isLoading}
                    className={`flex items-center gap-2 px-6 py-2.5 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent-dark transition-all shadow-md ${(!query.trim() || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isLoading ? 'Se procesează...' : (
                        <>
                            <Play className="w-4 h-4 fill-current" />
                            Analizează Acum
                        </>
                    )}
                </button>
            </div>
        </>
    );

    const renderQueueManagementStep = () => (
        <div className="flex-1 flex flex-col min-h-0">
             <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Coada de Sarcini</h3>
                    <span className="text-sm text-gray-500">{queueTasks.length} sarcini</span>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                    {queueTasks.map((task, idx) => (
                        <div key={task.id} className="flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm">
                            <span className="font-mono text-sm text-gray-400 font-bold w-6">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 font-medium truncate">{task.query}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        task.state === 'pending' ? 'bg-gray-100 text-gray-600' :
                                        task.state === 'planned' ? 'bg-green-100 text-green-700' :
                                        task.state === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {task.state.toUpperCase()}
                                    </span>
                                    {task.plan && (
                                        <span className="text-xs text-gray-500">
                                            {task.plan.total_cases} cazuri • ~{Math.round(task.plan.estimated_time_seconds / 60)} min
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveTask(task.id)}
                                className="text-gray-400 hover:text-red-500 p-2"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {queueTasks.length === 0 && (
                         <div className="text-center py-12 text-gray-400">
                             Nu aveți nicio sarcină în coadă.
                         </div>
                    )}
                </div>

                {/* Add new task inline */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Adaugă rapid o nouă sarcină..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
                    />
                    <button
                        onClick={handleAddToQueue}
                        disabled={!query.trim()}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                    >
                        Adaugă
                    </button>
                </div>
             </div>

             <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-between">
                <button
                    onClick={() => setCurrentStep('input')}
                    className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Înapoi
                </button>
                <button
                    onClick={handleGenerateAllPlans}
                    disabled={queueTasks.length === 0 || isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent-dark shadow-md disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                    Generează Planurile ({queueTasks.filter(t => t.state === 'pending').length})
                </button>
             </div>
        </div>
    );

    const renderCreatingPlanStep = () => (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="py-12 text-center">
                <div className="inline-block p-4 bg-brand-accent/10 rounded-full mb-4">
                    <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {isQueueMode ? 'Generare Planuri Multiple' : 'Generare Plan Analiză'}
                </h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                    {isQueueMode
                        ? 'Se generează strategiile de analiză pentru sarcinile din coadă. Acest proces poate dura câteva minute.'
                        : 'AI-ul analizează cererea dvs. și verifică datele disponibile.'
                    }
                </p>
                <QueueStatus
                    position={queueStatus.position}
                    total={queueStatus.total}
                    status={queueStatus.status}
                />
            </div>
        </div>
    );

    const renderBatchPreviewStep = () => (
        <div className="flex-1 flex flex-col min-h-0">
             <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                 <BatchPlanPreview
                    tasks={queueTasks}
                    onApproveAll={handleExecuteQueue}
                    onBack={() => setCurrentStep('queue_management')}
                    isExecuting={isLoading}
                 />

                 {/* Email Options */}
                 <div className="mt-8 bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-4">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-gray-700">Notificări</span>
                    </div>
                    <input
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        placeholder="Email pentru raportul final..."
                        className="w-full px-4 py-2 border rounded-lg mb-2"
                    />
                     {notificationEmail && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="rounded text-brand-accent"
                            />
                            <span className="text-sm text-gray-600">Accept termenii și condițiile</span>
                        </div>
                    )}
                 </div>
             </div>
        </div>
    );

    const renderExecutingQueueStep = () => (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                 <h3 className="text-lg font-bold text-gray-900 mb-6">Execuție în curs...</h3>
                 <QueueExecutionProgress
                    tasks={queueTasks}
                 />

                 {queueTasks.every(t => t.state === 'completed' || t.state === 'failed') && (
                     <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                         <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                         <h4 className="font-bold text-green-900">Execuție Completă!</h4>
                         <p className="text-green-800 text-sm mb-4">
                             Toate sarcinile au fost procesate.
                         </p>
                         <button
                             onClick={() => {
                                 // Select the first completed task by default
                                 const firstCompleted = queueTasks.find(t => t.state === 'completed');
                                 if (firstCompleted) setSelectedTaskId(firstCompleted.id);
                                 setCurrentStep('queue_results');
                             }}
                             className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2 mx-auto"
                         >
                             <ListPlus className="w-5 h-5" />
                             Vezi Rezultatele
                         </button>
                     </div>
                 )}
            </div>
        </div>
    );

    const renderQueueResultsStep = () => {
        const completedTasks = queueTasks.filter(t => t.state === 'completed' || t.state === 'failed');
        const activeTask = queueTasks.find(t => t.id === selectedTaskId) || completedTasks[0];

        return (
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
        );
    };

    const renderPreviewStep = () => {
         if (!planData) return null;

         const isPro = planData.strategy_summary && planData.strategy_summary.includes('⚡ STRATEGIE PRO');
         const isVector = planData.strategy_summary && planData.strategy_summary.includes('🧠 STRATEGIE VECTOR');
         const isSpecialStrategy = isPro || isVector;

         return (
            <>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                     <div className="space-y-6">
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

                        <div className={`bg-white border rounded-xl p-5 shadow-sm ${isSpecialStrategy ? 'border-brand-accent/50 ring-1 ring-brand-accent/20' : 'border-gray-200'}`}>
                             <div className="flex items-start gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${isSpecialStrategy ? 'bg-brand-accent/10' : 'bg-blue-50'}`}>
                                    {isPro && <Zap className="w-5 h-5 text-brand-accent fill-current" />}
                                    {isVector && <Brain className="w-5 h-5 text-brand-accent fill-current" />}
                                    {!isSpecialStrategy && <BrainCircuit className="w-5 h-5 text-blue-600" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 mb-1">Strategia AI</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {planData.strategy_summary}
                                    </p>
                                    {planData.strategies_used && (
                                        <div className="mt-3 flex gap-2 flex-wrap">
                                            {planData.strategies_used.map(s => (
                                                <span key={s} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{s}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-xs text-gray-500 uppercase">Cazuri Găsite</p>
                                <p className="text-2xl font-bold text-gray-900">{planData.total_cases}</p>
                             </div>
                             <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-xs text-gray-500 uppercase">Timp Estimat</p>
                                <p className="text-lg font-bold text-gray-900">{Math.round(planData.estimated_time_seconds / 60)} min</p>
                             </div>
                        </div>

                        {/* Email */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                            <h4 className="font-bold text-gray-900 mb-1">Notificare Email (Opțional)</h4>
                            <div className="mt-4 space-y-4">
                                <input
                                    type="email"
                                    value={notificationEmail}
                                    onChange={(e) => setNotificationEmail(e.target.value)}
                                    placeholder="exemplu@email.com"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                />
                                {notificationEmail && (
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={termsAccepted}
                                            onChange={(e) => setTermsAccepted(e.target.checked)}
                                            className="mt-1"
                                        />
                                        <span className="text-sm text-gray-700">Accept termenii și condițiile</span>
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-between">
                    <button onClick={() => setCurrentStep('input')} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Înapoi</button>
                    <button onClick={handleExecutePlan} className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md">Confirmă Planul</button>
                </div>
            </>
         );
    }

    const renderExecutingStep = () => (
         <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {jobId && !result && (
                    <div className="py-12">
                        <QueueStatus position={queueStatus.position} total={queueStatus.total} status={queueStatus.status} />
                        <p className="text-center text-sm text-gray-500 mt-6 max-w-md mx-auto">Această operațiune poate dura câteva minute.</p>
                    </div>
                )}
                {result && <AnalysisResults data={result} />}
                {error && !result && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">{error}</div>}
         </div>
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
                                {currentStep === 'queue_management' && 'Gestionare Coadă Sarcini'}
                                {currentStep === 'creating_plan' && 'Generare Plan...'}
                                {currentStep === 'preview' && 'Pas 2: Revizuiți planul'}
                                {currentStep === 'preview_batch' && 'Previzualizare Planuri Multiple'}
                                {(currentStep === 'executing' || currentStep === 'executing_queue') && 'Pas 3: Execuție'}
                                {currentStep === 'queue_results' && 'Pas 4: Rezultate Finale'}
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
                {currentStep === 'queue_management' && renderQueueManagementStep()}
                {currentStep === 'creating_plan' && renderCreatingPlanStep()}
                {currentStep === 'preview' && renderPreviewStep()}
                {currentStep === 'preview_batch' && renderBatchPreviewStep()}
                {currentStep === 'executing' && renderExecutingStep()}
                {currentStep === 'executing_queue' && renderExecutingQueueStep()}
                {currentStep === 'queue_results' && renderQueueResultsStep()}

            </div>
        </div>
    );
};

export default AdvancedAnalysisModal;
