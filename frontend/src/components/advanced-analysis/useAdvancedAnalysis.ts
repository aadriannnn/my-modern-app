import { useState, useEffect, useRef, useCallback } from 'react';
import {
    createAnalysisPlan,
    decomposeTask,
    executeAnalysisPlan,
    subscribeToQueueStatus,
    getAdvancedAnalysisStatus,
    addQueueTask,
    getQueue,
    removeQueueTask,
    generatePlansBatch,
    executeQueue,
    clearCompletedQueue,
    clearAnalysisSession
} from '../../lib/api';
import type { WorkflowStep, PlanData, QueueStatusData } from './types';
import type { QueueTask } from '../../types';

const STORAGE_KEY = 'advancedAnalysisState';

export const useAdvancedAnalysis = (isOpen: boolean, onClose: () => void) => {
    // State
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
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Email notification state
    const [notificationEmail, setNotificationEmail] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Execution Mode
    const [executionMode, setExecutionMode] = useState<'review' | 'direct'>('review');

    // Queue status state
    const [queueStatus, setQueueStatus] = useState<QueueStatusData>({ position: 0, total: 0, status: 'queued' });

    // Refs
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const eventSourceRef = useRef<{ close: () => void } | null>(null);

    // --- Internal Helpers ---

    const refreshQueue = useCallback(async () => {
        try {
            const data = await getQueue();
            setQueueTasks(data.tasks || []);
        } catch (e) {
            console.error("Failed to load queue:", e);
        }
    }, []);

    const startPolling = useCallback((id: string, onSuccess: (data: any) => void, onError: (msg: string) => void) => {
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
    }, []);

    const startQueuePolling = useCallback((id: string, onComplete?: () => void) => {
        // Clear existing
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (eventSourceRef.current) eventSourceRef.current.close();

        // Start fallback polling interval
        pollingIntervalRef.current = setInterval(() => {
            refreshQueue();
        }, 2000);

        // SSE
        eventSourceRef.current = subscribeToQueueStatus(
            id,
            (statusUpdate) => {
                setQueueStatus({
                    position: statusUpdate.position,
                    total: statusUpdate.total,
                    status: statusUpdate.status as any
                });

                refreshQueue();

                if (statusUpdate.status === 'completed' || statusUpdate.status === 'error' || (statusUpdate as any).result) {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }

                    if (onComplete) onComplete();
                    setJobId(null);
                    setIsLoading(false);
                    if (eventSourceRef.current) eventSourceRef.current.close();
                }
            },
            () => {
                // SSE closed
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }

                if (onComplete) onComplete();
                setJobId(null);
                setIsLoading(false);
            },
            () => { }
        );
    }, [refreshQueue]);

    const checkJobStatus = useCallback(async (id: string, step: WorkflowStep) => {
        try {
            const status = await getAdvancedAnalysisStatus(id);
            console.log('[Frontend] Checked restored job status:', status);

            if (status.status === 'completed' && status.result) {
                if (status.result.success === false) {
                    setError(status.result.error || 'Job failed.');
                    if (step === 'executing_queue') {
                        setCurrentStep('executing_queue');
                        refreshQueue();
                    } else {
                        setCurrentStep('input');
                    }
                } else {
                    if (step === 'creating_plan') {
                        setPlanData(status.result);
                        setCurrentStep('preview');
                    } else if (step === 'executing') {
                        setResult(status.result);
                        setCurrentStep('executing');
                    } else if (step === 'executing_queue') {
                        refreshQueue().then(() => {
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
                // Resume polling
                if (step === 'creating_plan') {
                    startPolling(id, (plan) => { setPlanData(plan); setCurrentStep('preview'); }, setError);
                } else if (step === 'executing') {
                    startPolling(id, (res) => { setResult(res); }, setError);
                } else if (step === 'executing_queue') {
                    startQueuePolling(id);
                }
            }
        } catch (e) {
            console.error('Error checking restored job:', e);
            setError("Nu s-a putut restaura sesiunea anterioară.");
        }
    }, [refreshQueue, startPolling, startQueuePolling]);

    // --- Effects ---

    // Cleanup
    useEffect(() => {
        if (!isOpen) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }
    }, [isOpen]);

    // Save to localStorage
    useEffect(() => {
        if (query || jobId || planData || result || (queueTasks && queueTasks.length > 0) || notificationEmail) {
            const stateToSave = {
                version: '2.0',
                query,
                currentStep,
                planData,
                jobId,
                result,
                isQueueMode,
                notificationEmail,
                termsAccepted,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        }
    }, [query, currentStep, planData, jobId, result, queueTasks, isQueueMode, notificationEmail, termsAccepted]);

    // Auto-transition to results
    useEffect(() => {
        if (currentStep === 'executing_queue') {
            const allFinished = queueTasks.length > 0 && queueTasks.every(t => t.state === 'completed' || t.state === 'failed');
            if (allFinished) {
                const timer = setTimeout(() => {
                    if (!selectedTaskId) {
                        const first = queueTasks.find(t => t.state === 'completed');
                        if (first) setSelectedTaskId(first.id);
                    }
                    setCurrentStep('queue_results');
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [queueTasks, currentStep, selectedTaskId]);

    // Restore state
    useEffect(() => {
        if (isOpen) {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    if (parsed.version !== '2.0') {
                        localStorage.removeItem(STORAGE_KEY);
                        return;
                    }

                    console.log('[Frontend] Restoring session from localStorage:', parsed);

                    if (parsed.query) setQuery(parsed.query);
                    if (parsed.planData) setPlanData(parsed.planData);
                    if (parsed.result) setResult(parsed.result);
                    if (parsed.isQueueMode) setIsQueueMode(parsed.isQueueMode);
                    if (parsed.notificationEmail) setNotificationEmail(parsed.notificationEmail);
                    if (parsed.termsAccepted) setTermsAccepted(parsed.termsAccepted);

                    refreshQueue();

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
                refreshQueue();
            }
        }
    }, [isOpen, refreshQueue, checkJobStatus]);

    // --- Action Handlers ---

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
                setCurrentStep('creating_plan');
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
                });
            }
        } catch (e: any) {
            setError(e.message);
            setIsLoading(false);
        }
    };

    const executePlanById = async (id: string) => {
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

            const response = await executeAnalysisPlan(id, notificationPreferences);

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
                        if (executionMode === 'direct') {
                            executePlanById(plan.plan_id);
                        } else {
                            setCurrentStep('preview');
                        }
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
        await executePlanById(planData.plan_id);
    };

    const handleDecomposeTask = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await decomposeTask(query);

            if (response.success && response.tasks && response.tasks.length > 0) {
                // Auto-populate queue with generated tasks
                for (const task of response.tasks) {
                    await addQueueTask(task.query, {
                        title: task.title,
                        category: task.category,
                        priority: task.priority,
                        rationale: task.rationale
                    });
                }

                // Refresh queue and navigate
                await refreshQueue();
                setIsQueueMode(true);
                setCurrentStep('queue_management');
                setQuery('');  // Clear original query
            } else {
                setError(response.error || 'Nu s-au putut genera taskuri.');
            }
        } catch (e: any) {
            setError(e.message || 'Eroare la descompunerea taskului.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSession = async () => {
        if (jobId) {
            await clearAnalysisSession(jobId);
        }
        setJobId(null);
        setPlanData(null);
        setResult(null);
        setQuery('');
        localStorage.removeItem(STORAGE_KEY);
        onClose();
        setCurrentStep('input');
    };

    const handleClearAndCloseQueue = async () => {
        try {
            await clearCompletedQueue();
            setQueueTasks([]);
            setIsQueueMode(false);
            setJobId(null);
            localStorage.removeItem(STORAGE_KEY);
            onClose();
            setCurrentStep('input');
        } catch (e) {
            console.error("Failed to clear queue", e);
        }
    };

    return {
        // State
        query, setQuery,
        currentStep, setCurrentStep,
        planData, setPlanData,
        jobId,
        isLoading,
        result,
        error, setError,
        queueTasks,
        isQueueMode, setIsQueueMode,
        selectedTaskId, setSelectedTaskId,
        notificationEmail, setNotificationEmail,
        termsAccepted, setTermsAccepted,
        executionMode, setExecutionMode,
        queueStatus,

        // Handlers
        handleAddToQueue,
        handleRemoveTask,
        handleGenerateAllPlans,
        handleExecuteQueue,
        handleCreatePlan,
        handleExecutePlan,
        handleDecomposeTask,
        handleCloseSession,
        handleClearAndCloseQueue,
        refreshQueue
    };
};
