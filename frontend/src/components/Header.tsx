import React from 'react';
import logo from '@/assets/icons/logo.png';
import searchIcon from '@/assets/icons/search.png';

interface HeaderProps {
  situatie: string;
  onSituatieChange: (value: string) => void;
  onSearch: () => void;
}

const Header: React.FC<HeaderProps> = ({ situatie, onSituatieChange, onSearch }) => {
  return (
    <header className="bg-white shadow-md px-6 py-3 flex items-center justify-between z-20">
      <div className="flex items-center">
        <img src={logo} alt="Logo" className="h-10" />
      </div>

      <div className="flex-1 flex justify-center items-center">
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            placeholder="Introduceți situația de fapt..."
            value={situatie}
            onChange={(e) => onSituatieChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={onSearch}
          className="ml-3 bg-green-600 text-white px-5 py-2 rounded-full flex items-center hover:bg-green-700 transition-colors"
        >
          <img src={searchIcon} alt="Search" className="h-4 w-4 mr-2" />
          Căutare
        </button>
      </div>

      <div className="w-24"></div>
    </header>
  );
};

export default Header;
