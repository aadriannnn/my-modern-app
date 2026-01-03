import React from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';

interface ExampleCaseButtonProps {
    onExampleClick: () => void;
}

const ExampleCaseButton: React.FC<ExampleCaseButtonProps> = ({ onExampleClick }) => {
    return (
        <>
            {/* Mobile Version - Full Width Below Textarea */}
            <div className="md:hidden">
                <button
                    onClick={onExampleClick}
                    className="w-full mt-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/30 text-brand-text hover:from-amber-400/30 hover:to-orange-400/30 hover:border-amber-400/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md group animate-pulse-subtle"
                    aria-label="Vezi un exemplu de situație de fapt"
                >
                    <div className="flex items-center justify-center gap-3">
                        <div className="relative">
                            <Lightbulb
                                size={22}
                                className="text-amber-600 group-hover:text-amber-700 transition-colors duration-200"
                            />
                            <Sparkles
                                size={12}
                                className="absolute -top-1 -right-1 text-amber-500 animate-pulse"
                            />
                        </div>
                        <span className="font-semibold text-sm">
                            Vezi un exemplu de situație de fapt
                        </span>
                    </div>
                </button>
            </div>

            {/* Desktop Version - Above Textarea */}
            <div className="hidden md:flex justify-end mb-2">
                <button
                    onClick={onExampleClick}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-400/20 to-orange-400/20 backdrop-blur-md border border-amber-400/40 text-brand-text hover:from-amber-400/30 hover:to-orange-400/30 hover:border-amber-400/60 transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-sm group"
                    aria-label="Vezi un exemplu de situație de fapt"
                >
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Lightbulb
                                size={18}
                                className="text-amber-600 group-hover:text-amber-700 transition-colors duration-200"
                            />
                            <Sparkles
                                size={10}
                                className="absolute -top-0.5 -right-0.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            />
                        </div>
                        <span className="font-semibold text-sm whitespace-nowrap">
                            Vezi exemplu
                        </span>
                    </div>
                </button>
            </div>

            <style>{`
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}</style>
        </>
    );
};

export default ExampleCaseButton;
