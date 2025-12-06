import React from 'react';
import { X, BrainCircuit, Loader2 } from 'lucide-react';
import type { QueueTask } from '../../../types';

interface QueueManagementStepProps {
    queueTasks: QueueTask[];
    query: string;
    setQuery: (val: string) => void;
    onAddToQueue: () => void;
    onRemoveTask: (id: string) => void;
    onGenerateAllPlans: () => void;
    onBack: () => void;
    isLoading: boolean;
}

export const QueueManagementStep: React.FC<QueueManagementStepProps> = ({
    queueTasks,
    query,
    setQuery,
    onAddToQueue,
    onRemoveTask,
    onGenerateAllPlans,
    onBack,
    isLoading
}) => {
    return (
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
                                onClick={() => onRemoveTask(task.id)}
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
                        onKeyDown={(e) => e.key === 'Enter' && onAddToQueue()}
                    />
                    <button
                        onClick={onAddToQueue}
                        disabled={!query.trim()}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                    >
                        Adaugă
                    </button>
                </div>
             </div>

             <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-between">
                <button
                    onClick={onBack}
                    className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Înapoi
                </button>
                <button
                    onClick={onGenerateAllPlans}
                    disabled={queueTasks.length === 0 || isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent-dark shadow-md disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                    Generează Planurile ({queueTasks.filter(t => t.state === 'pending').length})
                </button>
             </div>
        </div>
    );
};
