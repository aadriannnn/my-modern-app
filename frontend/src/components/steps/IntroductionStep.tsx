import React from 'react';

interface IntroductionStepProps {
  situation: string;
  setSituation: (situation: string) => void;
}

const IntroductionStep: React.FC<IntroductionStepProps> = ({ situation, setSituation }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 animate-fade-in">
      <h2 className="text-3xl font-bold mb-8 text-center text-brand-text">Introdu situația de fapt</h2>
      <div className="w-full max-w-3xl relative group">
        <textarea
          className="w-full border border-gray-300 p-6 rounded-2xl shadow-lg text-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all duration-300 resize-y min-h-[300px] bg-white placeholder-gray-400"
          rows={12}
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="Descrieți aici situația de fapt..."
        />
        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-transparent group-hover:border-gray-200 transition-colors duration-300" />
      </div>
    </div>
  );
};

export default IntroductionStep;
