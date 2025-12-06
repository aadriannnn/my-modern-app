import React from 'react';
import { Loader2 } from 'lucide-react';
import QueueStatus from '../../QueueStatus';
import type { QueueStatusData } from '../types';

interface CreatingPlanStepProps {
    isQueueMode: boolean;
    queueStatus: QueueStatusData;
}

export const CreatingPlanStep: React.FC<CreatingPlanStepProps> = ({
    isQueueMode,
    queueStatus
}) => {
    return (
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
};
