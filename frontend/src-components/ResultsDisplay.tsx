import React from 'react';

const ResultsDisplay = ({ results, onSelect }) => {
  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">Denumire</th>
            <th className="text-left">Tip speță</th>
            <th className="text-left">Materie</th>
            <th className="text-left">Data Soluției</th>
            <th className="text-left">Instanța</th>
            <th className="text-left">Scor Hibrid</th>
            <th className="text-left">Match-uri</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr
              key={result.id}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => onSelect(result)}
            >
              <td>{result.denumire}</td>
              <td>{result.tip_speta}</td>
              <td>{result.materie}</td>
              <td>{result.data_solutiei}</td>
              <td>{result.tip_instanta}</td>
              <td>{result.score.toFixed(5)}</td>
              <td>{result.match_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsDisplay;
