import React from 'react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  situatie: string;
  onSituatieChange: (value: string) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, situatie, onSituatieChange }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Introduceți situația de fapt</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        <textarea
          value={situatie}
          onChange={(e) => onSituatieChange(e.target.value)}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Scrieți aici..."
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-green-600 text-white px-5 py-2 rounded-full hover:bg-green-700 transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
