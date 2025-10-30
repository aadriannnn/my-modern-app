import React from 'react';

interface SearchBarProps {
  onSearch: (text: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [text, setText] = React.useState('');

  const handleSearch = () => {
    onSearch(text);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Introdu situația de fapt:</h2>
      <textarea
        className="w-full h-24 p-2 border rounded"
        value={text}
        onChange={(e) => setText(e.target.value)}
      ></textarea>
      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={handleSearch}
      >
        Caută spețe similare
      </button>
    </div>
  );
};

export default SearchBar;
