import React from 'react';
import { Mail } from 'lucide-react';
import { BatchPlanPreview } from '../BatchPlanPreview';
import type { QueueTask } from '../../../types';

interface BatchPreviewStepProps {
    queueTasks: QueueTask[];
    onExecuteQueue: () => void;
    onBack: () => void;
    isLoading: boolean;
    notificationEmail: string;
    setNotificationEmail: (val: string) => void;
    termsAccepted: boolean;
    setTermsAccepted: (val: boolean) => void;
}

export const BatchPreviewStep: React.FC<BatchPreviewStepProps> = ({
    queueTasks,
    onExecuteQueue,
    onBack,
    isLoading,
    notificationEmail,
    setNotificationEmail,
    termsAccepted,
    setTermsAccepted
}) => {
    return (
        <div className="flex-1 flex flex-col min-h-0">
             <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                 <BatchPlanPreview
                    tasks={queueTasks}
                    onApproveAll={onExecuteQueue}
                    onBack={onBack}
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
};
