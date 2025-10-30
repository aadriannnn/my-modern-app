import React from 'react';

// The 'result' prop is expected to contain the full case data, including the 'data' object.
const ResultDetail = ({ result }) => {
  if (!result) {
    return (
      <div className="p-4 bg-white shadow-md rounded-lg mt-6">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold text-gray-700">Detalii Speță</h3>
        </div>
        <div className="p-4">
          <p>Selectați un rezultat pentru a vedea detaliile complete.</p>
        </div>
      </div>
    );
  }

  // Filter out empty, null, or 'null' values from the data object, similar to the Python script.
  const filteredData = Object.entries(result.data).filter(([, value]) => {
    return value !== null && value !== '' && value !== 'null' && (!Array.isArray(value) || value.length > 0);
  });

  return (
    <div className="bg-white rounded-lg shadow-md mt-6">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">
          {result.data.titlu || result.data.denumire || `Detalii pentru Speța ID: ${result.id}`}
        </h2>
      </div>
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        <div className="space-y-4">
          {filteredData.map(([key, value]) => (
            <div key={key}>
              <h3 className="text-md font-semibold text-gray-700 capitalize">
                {key.replace(/_/g, ' ')}
              </h3>
              <div className="mt-1 p-3 bg-gray-50 rounded text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {Array.isArray(value)
                  ? value.map((item, index) => (
                      <pre key={index} className="mb-2 p-2 bg-gray-100 rounded">
                        {typeof item === 'object' ? JSON.stringify(item, null, 2) : item}
                      </pre>
                    ))
                  : <p>{String(value)}</p>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultDetail;
