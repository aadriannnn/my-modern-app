import React from 'react';
import Results from '../Results';

interface ResultsStepProps {
  results: any[];
  status: string;
}

const ResultsStep: React.FC<ResultsStepProps> = ({ results, status }) => {
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4 text-center">Rezultate</h2>
      <p className="text-center mb-4">{status}</p>
      <Results results={results} />
    </div>
  );
};

export default ResultsStep;
