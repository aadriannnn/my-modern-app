import React from 'react';
import { CheckCircle, Zap, Brain, BrainCircuit } from 'lucide-react';
import type { PlanData } from '../types';

interface PlanPreviewStepProps {
    planData: PlanData | null;
    onBack: () => void;
    onConfirm: () => void;
}

export const PlanPreviewStep: React.FC<PlanPreviewStepProps> = ({
    planData,
    onBack,
    onConfirm
}) => {
    if (!planData) return null;

    const isPro = planData.strategy_summary && planData.strategy_summary.includes('⚡ STRATEGIE PRO');
    const isVector = planData.strategy_summary && planData.strategy_summary.includes('🧠 STRATEGIE VECTOR');
    const isSpecialStrategy = isPro || isVector;

    return (
        <>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                 <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-green-900 mb-1">Plan Creat cu Succes!</h4>
                            <p className="text-sm text-green-800">
                                Revizuiți strategia și costul estimat înainte de a continua.
                            </p>
                        </div>
                    </div>

                    <div className={`bg-white border rounded-xl p-5 shadow-sm ${isSpecialStrategy ? 'border-brand-accent/50 ring-1 ring-brand-accent/20' : 'border-gray-200'}`}>
                         <div className="flex items-start gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${isSpecialStrategy ? 'bg-brand-accent/10' : 'bg-blue-50'}`}>
                                {isPro && <Zap className="w-5 h-5 text-brand-accent fill-current" />}
                                {isVector && <Brain className="w-5 h-5 text-brand-accent fill-current" />}
                                {!isSpecialStrategy && <BrainCircuit className="w-5 h-5 text-blue-600" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 mb-1">Strategia AI</h4>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {planData.strategy_summary}
                                </p>
                                {planData.strategies_used && (
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                        {planData.strategies_used.map(s => (
                                            <span key={s} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase">Cazuri Găsite</p>
                            <p className="text-2xl font-bold text-gray-900">{planData.total_cases}</p>
                         </div>
                         <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase">Timp Estimat</p>
                            <p className="text-lg font-bold text-gray-900">{Math.round(planData.estimated_time_seconds / 60)} min</p>
                         </div>
                    </div>
                 </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-between">
                <button onClick={onBack} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Înapoi</button>
                <button onClick={onConfirm} className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md">Confirmă Planul</button>
            </div>
        </>
    );
};
