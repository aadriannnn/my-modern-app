import React, { useState } from 'react';
import CaseDetailModal from './CaseDetailModal';

interface Result {
  id: number;
  denumire: string;
  tip_speta: string;
  materie: string;
  situatia_de_fapt_full: string;
  data: {
    [key: string]: any;
    situatia_de_fapt_full?: string;
    argumente_instanta?: string;
    text_individualizare?: string;
    rezumat_generat_ai?: string;
  };
}

interface ResultsProps {
  results: Result[];
}

type ViewType = 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare';

const Results: React.FC<ResultsProps> = ({ results }) => {
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('situatia_de_fapt_full');


  const handleRowClick = (result: Result) => {
    console.log('[Results] Row clicked. Preparing to open modal.');
    console.log('[Results] Data for selected result (ID:', result.id, '):', result);
    console.log('Full result object:', result);

    if (!result.data) {
      console.warn('[Results] The selected result is missing the detailed `data` object.');
    }

    setSelectedResult(result);
    setIsModalOpen(true);
    console.log('[Results] Modal should now be open.');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedResult(null);
  };

  const viewOptions: { key: ViewType; label: string }[] = [
    { key: 'situatia_de_fapt_full', label: 'Situație de fapt' },
    { key: 'argumente_instanta', label: 'Argumente instanță' },
    { key: 'text_individualizare', label: 'Text individualizare' },
];

const getDisplayContent = (result: Result, view: ViewType) => {
  let content = '';
  if (view === 'situatia_de_fapt_full') {
    content = result.situatia_de_fapt_full || '';
  } else {
    content = result.data[view] || '';
  }
  return content.length > 1000 ? `${content.substring(0, 250)}...` : content;
};


  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-700">Rezultate</h2>
        </div>
        <div className="p-4">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                <span className="text-sm font-medium text-gray-600 flex-shrink-0">Afișare spețe după:</span>
                {viewOptions.map((option) => (
                    <button
                        key={option.key}
                        onClick={() => setActiveView(option.key)}
                        className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            activeView === option.key
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
        <div className="overflow-x-auto">
          {results.length > 0 ? (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 text-left font-semibold text-gray-600">{viewOptions.find(opt => opt.key === activeView)?.label}</th>
                  <th className="py-2 px-4 text-left font-semibold text-gray-600">Tip speță</th>
                  <th className="py-2 px-4 text-left font-semibold text-gray-600">Materie</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((result) => (
                  <tr
                    key={result.id}
                    className={`cursor-pointer ${selectedResult?.id === result.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                    onClick={() => handleRowClick(result)}
                  >
                    <td className="px-4 py-2">{getDisplayContent(result, activeView)}</td>
                    <td className="px-4 py-2">{result.data.tip_speta || result.tip_speta}</td>
                    <td className="px-4 py-2">{result.data.materie || result.materie}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>Nu sunt rezultate de afișat. Efectuați o căutare pentru a vedea rezultatele aici.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && <CaseDetailModal result={selectedResult} onClose={handleCloseModal} />}
    </div>
  );
};

export default Results;
