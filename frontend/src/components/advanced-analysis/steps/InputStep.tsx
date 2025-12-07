import React from 'react';
import { AlertCircle, Mail, ListPlus, Play, ChevronDown, Brain } from 'lucide-react';
import type { QueueTask } from '../../../types';

interface InputStepProps {
    query: string;
    setQuery: (val: string) => void;
    notificationEmail: string;
    setNotificationEmail: (val: string) => void;
    termsAccepted: boolean;
    setTermsAccepted: (val: boolean) => void;
    queueTasks: QueueTask[];
    onAddToQueue: () => void;
    onDecomposeTask: () => void;
    onCreatePlan: () => void;
    onViewQueue: () => void;
    onClose: () => void;
    isLoading: boolean;
    error: string | null;
    executionMode: 'review' | 'direct';
    setExecutionMode: (mode: 'review' | 'direct') => void;
}

export const InputStep: React.FC<InputStepProps> = ({
    query, setQuery,
    notificationEmail, setNotificationEmail,
    termsAccepted, setTermsAccepted,
    queueTasks,
    onAddToQueue,
    onDecomposeTask,
    onCreatePlan,
    onViewQueue,
    onClose,
    isLoading,
    error,
    executionMode,
    setExecutionMode
}) => {
    return (
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

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Mail className="w-5 h-5 text-gray-500" />
                            <h4 className="font-bold text-gray-700 text-sm">Notificare Email (Opțional)</h4>
                        </div>
                        <div className="space-y-3">
                            <input
                                type="email"
                                value={notificationEmail}
                                onChange={(e) => setNotificationEmail(e.target.value)}
                                placeholder="exemplu@email.com"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent text-sm"
                            />

                            {notificationEmail && (
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="terms-check"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="mt-1 rounded text-brand-accent focus:ring-brand-accent"
                                    />
                                    <label htmlFor="terms-check" className="text-sm text-gray-600 cursor-pointer select-none">
                                        Accept <span className="underline">Termenii și Condițiile</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {queueTasks.length > 0 && (
                        <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                            <span className="font-medium text-gray-700">{queueTasks.length} sarcini în coadă</span>
                            <button
                                onClick={onViewQueue}
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

            <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-auto">
                    <div className="relative inline-block w-full md:w-64">
                        <select
                            value={executionMode}
                            onChange={(e) => setExecutionMode(e.target.value as 'review' | 'direct')}
                            className="w-full appearance-none bg-gray-50 border border-gray-300 text-gray-700 py-2.5 pl-4 pr-10 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-brand-accent font-medium text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                            <option value="review">Revizuire – Plan cu aprobare</option>
                            <option value="direct">Pornire directă – Fără revizuire</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Anulează
                    </button>
                    <button
                        onClick={onAddToQueue}
                        disabled={!query.trim() || isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 border border-brand-accent text-brand-accent font-bold rounded-lg hover:bg-brand-accent/5 transition-all"
                    >
                        <ListPlus className="w-4 h-4" />
                        Adaugă la Coadă
                    </button>
                    <button
                        onClick={onDecomposeTask}
                        disabled={!query.trim() || isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Descompune automat întrebarea în sarcini multiple pentru cercetare avansată"
                    >
                        <Brain className="w-4 h-4" />
                        Descompune Automat
                    </button>
                    <button
                        onClick={onCreatePlan}
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
            </div>
        </>
    );
};
