import React from 'react';
import { CheckCircle, ListPlus } from 'lucide-react';
import { QueueExecutionProgress } from '../QueueExecutionProgress';
import type { QueueTask } from '../../../types';

interface QueueExecutionStepProps {
    queueTasks: QueueTask[];
    onViewResults: () => void;
}

export const QueueExecutionStep: React.FC<QueueExecutionStepProps> = ({
    queueTasks,
    onViewResults
}) => {
    return (
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
