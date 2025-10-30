import React, { useState } from 'react';

const SearchPanel = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    onSearch(query);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <textarea
        className="w-full border p-2 rounded"
        rows="4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Introduceți situația de fapt..."
      />
      <button
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded w-full"
        onClick={handleSearch}
      >
        Caută
      </button>
    </div>
  );
};

export default SearchPanel;
