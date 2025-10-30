import React, { useState, useRef } from 'react';
import FilterPanel from './FilterPanel';
import { exportEquivalences, importEquivalences } from '../lib/api';

const SearchPanel = ({ onSearch, onFilterChange }) => {
  const [query, setQuery] = useState('');
  const fileInputRef = useRef(null);

  const handleSearch = () => {
    onSearch(query);
  };

  const handleExport = async () => {
    const blob = await exportEquivalences();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equivalences.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await importEquivalences(file);
      alert('Import finalizat. Apăsați "Actualizează filtre" pentru a aplica modificările.');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
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
      <div className="mt-4">
        <FilterPanel onFilterChange={onFilterChange} />
      </div>
      <div className="mt-4 space-y-2">
        <button
          className="bg-gray-200 hover:bg-gray-300 text-black py-2 px-4 rounded w-full"
          onClick={handleExport}
        >
          Export Echivalențe
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 text-black py-2 px-4 rounded w-full"
          onClick={triggerFileInput}
        >
          Import Echivalențe
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImport}
          accept=".csv"
        />
      </div>
    </div>
  );
};

export default SearchPanel;
