import React from 'react';
import { X, BrainCircuit } from 'lucide-react';
import { useAdvancedAnalysis } from './advanced-analysis/useAdvancedAnalysis';
import { FinalReportStep } from './FinalReportStep';
import {
    InputStep,
    QueueManagementStep,
    CreatingPlanStep,
    PlanPreviewStep,
    BatchPreviewStep,
    ExecutingStep,
    QueueExecutionStep,
    QueueResultsStep
} from './advanced-analysis/steps';

interface AdvancedAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdvancedAnalysisModal: React.FC<AdvancedAnalysisModalProps> = ({ isOpen, onClose }) => {
    const {
        // State
        query, setQuery,
        currentStep, setCurrentStep,
        planData,
        jobId,
        isLoading,
        result,
        error,
        queueTasks,
        isQueueMode, setIsQueueMode,
        selectedTaskId, setSelectedTaskId,
        notificationEmail, setNotificationEmail,
        termsAccepted, setTermsAccepted,
        executionMode, setExecutionMode,
        queueStatus,
        finalReportId, setFinalReportId,

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
        handleShowFinalReport,
        refreshQueue
    } = useAdvancedAnalysis(isOpen, onClose);

    return (
        <>
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
                    {currentStep === 'input' && (
                        <InputStep
                            query={query}
                            setQuery={setQuery}
                            notificationEmail={notificationEmail}
                            setNotificationEmail={setNotificationEmail}
                            termsAccepted={termsAccepted}
                            setTermsAccepted={setTermsAccepted}
                            queueTasks={queueTasks}
                            onAddToQueue={handleAddToQueue}
                            onDecomposeTask={handleDecomposeTask}
                            onCreatePlan={handleCreatePlan}
                            onViewQueue={() => { setIsQueueMode(true); setCurrentStep('queue_management'); refreshQueue(); }}
                            onClose={onClose}
                            isLoading={isLoading}
                            error={error}
                            executionMode={executionMode}
                            setExecutionMode={setExecutionMode}
                        />
                    )}
                    {currentStep === 'queue_management' && (
                        <QueueManagementStep
                            queueTasks={queueTasks}
                            query={query}
                            setQuery={setQuery}
                            onAddToQueue={handleAddToQueue}
                            onRemoveTask={handleRemoveTask}
                            onGenerateAllPlans={handleGenerateAllPlans}
                            onBack={() => setCurrentStep('input')}
                            isLoading={isLoading}
                        />
                    )}
                    {currentStep === 'creating_plan' && (
                        <CreatingPlanStep
                            isQueueMode={isQueueMode}
                            queueStatus={queueStatus}
                        />
                    )}
                    {currentStep === 'preview' && (
                        <PlanPreviewStep
                            planData={planData}
                            onBack={() => setCurrentStep('input')}
                            onConfirm={handleExecutePlan}
                        />
                    )}
                    {currentStep === 'preview_batch' && (
                        <BatchPreviewStep
                            queueTasks={queueTasks}
                            onExecuteQueue={handleExecuteQueue}
                            onBack={() => setCurrentStep('queue_management')}
                            isLoading={isLoading}
                            notificationEmail={notificationEmail}
                            setNotificationEmail={setNotificationEmail}
                            termsAccepted={termsAccepted}
                            setTermsAccepted={setTermsAccepted}
                        />
                    )}
                    {currentStep === 'executing' && (
                        <ExecutingStep
                            jobId={jobId}
                            result={result}
                            error={error}
                            queueStatus={queueStatus}
                            onCloseSession={handleCloseSession}
                        />
                    )}
                    {currentStep === 'executing_queue' && (
                        <QueueExecutionStep
                            queueTasks={queueTasks}
                            onViewResults={() => { setCurrentStep('queue_results'); refreshQueue(); }}
                            executionMode={executionMode}
                        />
                    )}
                    {currentStep === 'queue_results' && (
                        <QueueResultsStep
                            queueTasks={queueTasks}
                            selectedTaskId={selectedTaskId}
                            setSelectedTaskId={setSelectedTaskId}
                            onCloseAndClear={handleClearAndCloseQueue}
                            onShowFinalReport={handleShowFinalReport}
                        />
                    )}

                </div>
            </div>

            {/* Final Report Modal - Rendered as separate overlay on top */}
            {finalReportId && (
                <FinalReportStep
                    reportId={finalReportId}
                    isOpen={!!finalReportId}
                    onClose={() => setFinalReportId(null)}
                />
            )}
        </>
    );
};

export default AdvancedAnalysisModal;
