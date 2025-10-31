import React from 'react';

interface CaseTypeStepProps {
  tipSpeta: string[];
  parte: string[];
  selectedTipSpeta: string[];
  selectedParte: string[];
  setSelectedTipSpeta: (selected: string[]) => void;
  setSelectedParte: (selected: string[]) => void;
}

const CaseTypeStep: React.FC<CaseTypeStepProps> = ({
  tipSpeta,
  parte,
  selectedTipSpeta,
  selectedParte,
  setSelectedTipSpeta,
  setSelectedParte,
}) => {
  const handleTipSpetaChange = (item: string) => {
    setSelectedTipSpeta(
      selectedTipSpeta.includes(item)
        ? selectedTipSpeta.filter((i) => i !== item)
        : [...selectedTipSpeta, item]
    );
  };

  const handleParteChange = (item: string) => {
    setSelectedParte(
      selectedParte.includes(item)
        ? selectedParte.filter((i) => i !== item)
        : [...selectedParte, item]
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md w-full max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-xl mb-3 text-gray-700">Tip speță</h3>
          <div className="w-full h-48 border rounded-lg p-2 text-base overflow-y-auto">
            {tipSpeta.map((item) => (
              <div key={item} className="flex items-center p-1">
                <input
                  type="checkbox"
                  id={`tip-speta-${item}`}
                  checked={selectedTipSpeta.includes(item)}
                  onChange={() => handleTipSpetaChange(item)}
                  className="mr-3 h-5 w-5"
                />
                <label htmlFor={`tip-speta-${item}`} className="text-gray-800">{item}</label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-xl mb-3 text-gray-700">Parte</h3>
          <div className="w-full h-48 border rounded-lg p-2 text-base overflow-y-auto">
            {parte.map((item) => (
              <div key={item} className="flex items-center p-1">
                <input
                  type="checkbox"
                  id={`parte-${item}`}
                  checked={selectedParte.includes(item)}
                  onChange={() => handleParteChange(item)}
                  className="mr-3 h-5 w-5"
                />
                <label htmlFor={`parte-${item}`} className="text-gray-800">{item}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseTypeStep;
