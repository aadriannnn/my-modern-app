import React from 'react';

const ResultDetail = ({ result }) => {
  if (!result) {
    return (
      <div className="p-4 bg-white shadow-md rounded-lg">
        <p>Selectați un rezultat pentru a vedea detaliile.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold">{result.denumire}</h2>
      <p className="mt-2">{result.situatia_de_fapt_full}</p>
    </div>
  );
};

export default ResultDetail;
