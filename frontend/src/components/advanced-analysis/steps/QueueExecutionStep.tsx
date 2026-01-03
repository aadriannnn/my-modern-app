import React from 'react';
import { CheckCircle, ListPlus } from 'lucide-react';
import { QueueExecutionProgress } from '../QueueExecutionProgress';
import type { QueueTask } from '../../../types';

interface QueueExecutionStepProps {
    queueTasks: QueueTask[];
    onViewResults: () => void;
    executionMode: 'review' | 'direct';
}

export const QueueExecutionStep: React.FC<QueueExecutionStepProps> = ({
    queueTasks,
    onViewResults,
    executionMode
}) => {
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Execuție în curs...</h3>
                {queueTasks.length > 0 ? (
                    <QueueExecutionProgress
                        tasks={queueTasks}
                        executionMode={executionMode}
                    />
                ) : (
                    <div className="mt-8 text-center p-8 text-gray-500">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent mb-4"></div>
                        <p className="font-medium text-gray-700">Se inițializează analiza complexă...</p>
                        <p className="text-xs mt-2 text-gray-500">
                            AI-ul descompune cererea și generează planul de cercetare.
                            <br />
                            Acest proces poate dura 1-3 minute.
                        </p>
                    </div>
                )}

                {queueTasks.length > 0 && queueTasks.every(t => t.state === 'completed' || t.state === 'failed') && (
                    <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <h4 className="font-bold text-green-900">Execuție Completă!</h4>
                        <p className="text-green-800 text-sm mb-4">
                            Toate sarcinile au fost procesate.
                        </p>
                        <button
                            onClick={onViewResults}
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
};
