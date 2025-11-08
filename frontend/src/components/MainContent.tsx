import React, { useState } from 'react';
import ResultItem from './ResultItem';

interface MainContentProps {
  results: any[];
  status: string;
  isLoading: boolean;
  onViewCase: (caseData: any) => void;
}

type ViewType = 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare' | 'text_doctrina' | 'text_ce_invatam' | 'Rezumat_generat_de_AI_Cod';

const MainContent: React.FC<MainContentProps> = ({ results, status, isLoading, onViewCase }) => {
  const [activeView, setActiveView] = useState<ViewType>('situatia_de_fapt_full');

  const viewButtons: { key: ViewType; label: string }[] = [
    { key: 'situatia_de_fapt_full', label: 'Situație de fapt' },
    { key: 'argumente_instanta', label: 'Argumente instanță' },
    { key: 'text_individualizare', label: 'Text individualizare' },
    { key: 'text_doctrina', label: 'Doctrină' },
    { key: 'text_ce_invatam', label: 'Ce învățăm' },
    { key: 'Rezumat_generat_de_AI_Cod', label: 'Rezumat AI' },
  ];

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center py-10"><p className="text-gray-500">{status}...</p></div>;
    }

    if (results.length === 0) {
      return <div className="text-center py-10"><p className="text-gray-500">{status}</p></div>;
    }

    const filteredResults = results.filter(result => {
      const content = result[activeView];
      if (typeof content !== 'string') {
        return false;
      }
      return content.trim() !== '' && !content.trim().toLowerCase().startsWith('null');
    });

    if (filteredResults.length === 0) {
        return <div className="text-center py-10"><p className="text-gray-500">Nu sunt rezultate care sa corespunda vederii selectate.</p></div>;
    }

    return (
      <div className="space-y-4">
        {filteredResults.map((result) => (
          <ResultItem
            key={result.id}
            result={result}
            activeView={activeView}
            onViewCase={() => onViewCase(result)}
          />
        ))}
      </div>
    );
  };

  return (
    <main className="flex-1 p-6 bg-white overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-green-700">Rezultatele căutării</h1>
        <div className="bg-gray-100 p-1 rounded-lg">
          {viewButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeView === key ? 'bg-white shadow' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {renderContent()}
    </main>
  );
};

export default MainContent;
