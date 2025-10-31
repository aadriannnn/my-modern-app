import React, { useState } from 'react';
import CaseDetailModal from './CaseDetailModal';

interface Result {
  id: number;
  denumire: string;
  tip_speta: string;
  materie: string;
  data_solutiei: string;
  tip_instanta: string;
  score: number;
  match_count: number;
  situatia_de_fapt_full: string;
  data: Record<string, any>; // Ensure the 'data' object is part of the type
}

interface ResultsProps {
  results: Result[];
}

const Results: React.FC<ResultsProps> = ({ results }) => {
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (result: Result) => {
    setSelectedResult(result);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-700">Rezultate</h2>
        </div>
        <div className="overflow-x-auto">
          {results.length > 0 ? (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 text-left font-semibold text-gray-600">Situația de fapt (scurt)</th>
                  <th className="py-2 px-4 text-left font-semibold text-gray-600">Tip speță</th>
                  <th className="py-2 px-4 text-left font-semibold text-gray-600">Materie</th>
                  <th className="py-2 px-4 text-left font-semibold text-gray-600">Data Soluției</th>
                  <th className="py-2 px-4 text-left font-semibold text-gray-600">Instanța</th>
                  <th className="py-2 px-4 text-right font-semibold text-gray-600">Scor Hibrid</th>
                  <th className="py-2 px-4 text-center font-semibold text-gray-600">Match-uri</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((result) => (
                  <tr
                    key={result.id}
                    className={`cursor-pointer ${selectedResult?.id === result.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                    onClick={() => handleRowClick(result)}
                  >
                    <td className="px-4 py-2">{result.denumire}</td>
                    <td className="px-4 py-2">{result.tip_speta}</td>
                    <td className="px-4 py-2">{result.materie}</td>
                    <td className="px-4 py-2">{result.data_solutiei}</td>
                    <td className="px-4 py-2">{result.tip_instanta}</td>
                    <td className="px-4 py-2 text-right">{result.score.toFixed(4)}</td>
                    <td className="px-4 py-2 text-center">{result.match_count}</td>
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
