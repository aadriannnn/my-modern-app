import React, { useState, useEffect } from 'react';
import { getFilters, refreshFilters } from '../lib/api';

const FilterPanel = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMaterii, setOpenMaterii] = useState({});

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFilters();
      setFilters(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await refreshFilters();
    fetchFilters();
  };

  const toggleMaterie = (materie) => {
    setOpenMaterii(prev => ({ ...prev, [materie]: !prev[materie] }));
  };

  const handleCheckboxChange = (materie, obiect) => {
    const newFilters = { ...filters };
    if (!newFilters[materie]) {
      newFilters[materie] = [];
    }
    if (newFilters[materie].includes(obiect)) {
      newFilters[materie] = newFilters[materie].filter(o => o !== obiect);
    } else {
      newFilters[materie].push(obiect);
    }
    onFilterChange(newFilters);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">Filtre</h2>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
          onClick={handleRefresh}
        >
          Actualizează
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="overflow-y-auto h-64">
        {Object.entries(filters).map(([materie, obiecte]) => (
          <div key={materie}>
            <div
              className="flex items-center cursor-pointer"
              onClick={() => toggleMaterie(materie)}
            >
              <input type="checkbox" className="mr-2" />
              <span>{materie}</span>
            </div>
            {openMaterii[materie] && (
              <div className="ml-4">
                {obiecte.map((obiect) => (
                  <div key={obiect} className="flex items-center">
                    <input type="checkbox" className="mr-2" onChange={() => handleCheckboxChange(materie, obiect)} />
                    <span>{obiect}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;
