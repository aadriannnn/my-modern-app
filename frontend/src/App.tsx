import React, { useState } from 'react';
import SearchPanel from './components/SearchPanel';
import ResultsDisplay from './components/ResultsDisplay';
import ResultDetail from './components/ResultDetail';
import { searchCases } from './lib/api';

const App = () => {
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);
    try {
      const filters = {}; // Will be implemented later
      const data = await searchCases(query, filters);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result) => {
    setSelectedResult(result);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1">
          <SearchPanel onSearch={handleSearch} />
        </div>
        <div className="col-span-2">
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}
          <ResultsDisplay results={results} onSelect={handleSelect} />
          <div className="mt-4">
            <ResultDetail result={selectedResult} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
