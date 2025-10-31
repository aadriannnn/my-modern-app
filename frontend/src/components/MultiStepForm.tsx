import React, { useState } from 'react';
import IntroductionStep from './steps/IntroductionStep';
import CaseTypeStep from './steps/CaseTypeStep';
import SubjectStep from './steps/SubjectStep';
import ResultsStep from './steps/ResultsStep';

interface MultiStepFormProps {
  filters: {
    tipSpeta: string[];
    parte: string[];
    menuData: Record<string, string[]>;
  };
  results: any[];
  status: string;
  onSearch: (searchParameters: {
    situation: string;
    selectedTipSpeta: string[];
    selectedParte: string[];
    selectedMenuKeys: React.Key[];
  }) => void;
}

const MultiStepForm: React.FC<MultiStepFormProps> = ({ filters, results, status, onSearch }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [situation, setSituation] = useState('');
  const [selectedTipSpeta, setSelectedTipSpeta] = useState<string[]>([]);
  const [selectedParte, setSelectedParte] = useState<string[]>([]);
  const [selectedMenuKeys, setSelectedMenuKeys] = useState<React.Key[]>([]);

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);

  const handleSearch = () => {
    onSearch({
      situation,
      selectedTipSpeta,
      selectedParte,
      selectedMenuKeys,
    });
    nextStep();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <IntroductionStep situation={situation} setSituation={setSituation} />;
      case 2:
        return (
          <CaseTypeStep
            tipSpeta={filters.tipSpeta}
            parte={filters.parte}
            selectedTipSpeta={selectedTipSpeta}
            selectedParte={selectedParte}
            setSelectedTipSpeta={setSelectedTipSpeta}
            setSelectedParte={setSelectedParte}
          />
        );
      case 3:
        return (
          <SubjectStep
            menuData={filters.menuData}
            selectedMenuKeys={selectedMenuKeys}
            setSelectedMenuKeys={setSelectedMenuKeys}
            onSearch={handleSearch}
          />
        );
      case 4:
        return <ResultsStep results={results} status={status} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center">
        {renderStep()}
        <div className="mt-8 w-full max-w-2xl flex justify-between">
          {currentStep > 1 && (
            <button
              className="px-6 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400 transition"
              onClick={prevStep}
            >
              Înapoi
            </button>
          )}
          {currentStep < 3 && (
            <button
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition ml-auto"
              onClick={nextStep}
            >
              Înainte
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiStepForm;
