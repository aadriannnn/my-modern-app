import React, { useState, useEffect, useRef } from 'react';
import { X, BrainCircuit, Play, AlertCircle } from 'lucide-react';
import { startAdvancedAnalysis, subscribeToQueueStatus } from '../lib/api';
import QueueStatus from './QueueStatus';
import AnalysisResults from './AnalysisResults';

interface AdvancedAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdvancedAnalysisModal: React.FC<AdvancedAnalysisModalProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [jobId, setJobId] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
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
            // Reset state when closed (optional, maybe we want to keep it?)
            // For now, let's keep it if we want to return to results
        }
    }, [isOpen]);

    const handleStart = async () => {
        if (!query.trim()) return;

        setIsStarting(true);
        setError(null);
        setResult(null);
        setJobId(null);
        setQueueStatus({ position: 0, total: 0, status: 'queued' });

        try {
            const response = await startAdvancedAnalysis(query);
            if (response.success && response.job_id) {
                setJobId(response.job_id);
                startPolling(response.job_id);
            } else {
                setError(response.message || 'Nu s-a putut iniția analiza.');
                setIsStarting(false);
            }
        } catch (err: any) {
            setError(err.message || 'Eroare de conexiune.');
            setIsStarting(false);
        }
    };

    const startPolling = (id: string) => {
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

                // Check if we have a result in the update (some implementations send it)
                if ((statusUpdate as any).result) {
                    setResult((statusUpdate as any).result);
                    setJobId(null); // Stop showing queue status
                    if (eventSourceRef.current) eventSourceRef.current.close();
                }

                // Check if we have an error in the update
                if ((statusUpdate as any).error) {
                    setError((statusUpdate as any).error);
                    setJobId(null);
                    if (eventSourceRef.current) eventSourceRef.current.close();
                }
            },
            () => {
                // On complete, if we haven't received the result yet, we might need to fetch it.
                // But usually the last message contains it or we should have it.
                // If we don't have it, let's try to fetch it or assume it was sent.
                // For this implementation, let's assume the backend sends the result in the last SSE message
                // OR we need a separate endpoint to get the result.
                // Given the previous code, let's assume we need to wait for the result in the stream.
                setQueueStatus(prev => ({ ...prev, status: 'completed' }));
            },
            (err) => {
                console.error("Queue error:", err);
                // Don't show error immediately, maybe retry?
                // For now just log
            }
        );

        setIsStarting(false);
    };

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
                            <p className="text-sm text-gray-500">Procesare în 2 runde: Filtrare SQL + Analiză Statistică</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">

                    {!jobId && !result && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-semibold mb-1">Cum funcționează?</p>
                                    <ul className="list-disc pl-4 space-y-1 opacity-90">
                                        <li>Descrieți ce doriți să analizați (ex: "Tendința pedepselor pentru omor în ultimii 5 ani")</li>
                                        <li>AI-ul va genera cod Python pentru a extrage datele relevante din baza de date.</li>
                                        <li>Un al doilea AI va analiza statistic datele extrase și va genera grafice.</li>
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
                    )}

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

                </div>

                {/* Footer */}
                {!jobId && !result && (
                    <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Anulează
                        </button>
                        <button
                            onClick={handleStart}
                            disabled={!query.trim() || isStarting}
                            className={`flex items-center gap-2 px-6 py-2.5 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${(!query.trim() || isStarting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isStarting ? 'Se inițiază...' : (
                                <>
                                    <Play className="w-4 h-4 fill-current" />
                                    Începe Analiza
                                </>
                            )}
                        </button>
                    </div>
                )}

                {result && (
                    <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setResult(null);
                                setJobId(null);
                                setQueueStatus({ position: 0, total: 0, status: 'queued' });
                                // Keep query
                            }}
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
            </div>
        </div>
    );
};

export default AdvancedAnalysisModal;
