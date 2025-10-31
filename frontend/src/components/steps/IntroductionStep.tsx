import React from 'react';

interface IntroductionStepProps {
  situation: string;
  setSituation: (situation: string) => void;
}

const IntroductionStep: React.FC<IntroductionStepProps> = ({ situation, setSituation }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Introdu situația de fapt:</h2>
      <textarea
        className="w-full max-w-2xl border p-4 rounded-lg shadow-md text-lg"
        rows={12}
        value={situation}
        onChange={(e) => setSituation(e.target.value)}
        placeholder="Descrieți aici situația de fapt..."
      />
    </div>
  );
};

export default IntroductionStep;
