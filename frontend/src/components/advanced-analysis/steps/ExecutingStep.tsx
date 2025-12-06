import React from 'react';
import { X } from 'lucide-react';
import AnalysisResults from '../../AnalysisResults';
import QueueStatus from '../../QueueStatus';
import type { QueueStatusData } from '../types';

interface ExecutingStepProps {
    jobId: string | null;
    result: any;
    error: string | null;
    queueStatus: QueueStatusData;
    onCloseSession: () => void;
}

export const ExecutingStep: React.FC<ExecutingStepProps> = ({
    jobId,
    result,
    error,
    queueStatus,
    onCloseSession
}) => {
     return (
         <div className="flex-1 flex flex-col min-h-0">
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
             {(result || error) && (
                <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end">
                    <button
                        onClick={onCloseSession}
                        className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 shadow-md flex items-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Închide Sesiunea
                    </button>
                </div>
             )}
         </div>
    );
};
