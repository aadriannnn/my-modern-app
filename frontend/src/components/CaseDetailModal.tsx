import React from 'react';

const CaseDetailModal = ({ result, onClose }) => {
  if (!result) {
    return null;
  }

  const filteredData = Object.entries(result.data).filter(([, value]) => {
    return value !== null && value !== '' && value !== 'null' && (!Array.isArray(value) || value.length > 0);
  });

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800 truncate">
            {result.data.titlu || result.data.denumire || `Detalii Speță #${result.id}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Închide detaliile"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <main className="p-6 overflow-y-auto flex-grow">
          <div className="space-y-5">
            {filteredData.map(([key, value]) => (
              <div key={key}>
                <h3 className="text-lg font-semibold text-gray-700 capitalize mb-2">
                  {key.replace(/_/g, ' ')}
                </h3>
                <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-800 whitespace-pre-wrap font-mono shadow-inner">
                  {Array.isArray(value)
                    ? value.map((item, index) => (
                        <pre key={index} className="mb-2 p-2 bg-white rounded-md shadow-sm">
                          {typeof item === 'object' ? JSON.stringify(item, null, 2) : item}
                        </pre>
                      ))
                    : <p className="leading-relaxed">{String(value)}</p>
                  }
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CaseDetailModal;
