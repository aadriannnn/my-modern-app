import React, { useState } from 'react';
import logo from '@/assets/icons/logo.png';
import searchIcon from '@/assets/icons/search.png';
import SearchModal from './SearchModal';

interface HeaderProps {
  situatie: string;
  onSituatieChange: (value: string) => void;
  onSearch: () => void;
}

const Header: React.FC<HeaderProps> = ({ situatie, onSituatieChange, onSearch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white shadow-md px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center">
          <img src={logo} alt="Logo" className="h-10" />
        </div>

        <div className="flex-1 flex justify-center items-center">
          <div className="relative w-full max-w-xl">
            <div
              onClick={() => setIsModalOpen(true)}
              className="w-full px-4 py-2 border border-gray-300 rounded-full cursor-pointer hover:bg-gray-50"
            >
              <p className={situatie ? 'text-black' : 'text-gray-500'}>
                {situatie || 'Introduceți situația de fapt...'}
              </p>
            </div>
          </div>
          <button
            onClick={onSearch}
            className="ml-3 bg-green-600 text-white px-5 py-2 rounded-full flex items-center hover:bg-green-700 transition-colors"
          >
            <img src={searchIcon} alt="Search" className="h-4 w-4 mr-2" />
            Căutare
          </button>
        </div>

        <div className="flex items-center">
          <span className="text-sm font-semibold text-gray-700 mr-2">Produs al grupului</span>
          <a href="https://app.verdictline.com/login" target="_blank" rel="noopener noreferrer">
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              VerdictLine.com
            </span>
          </a>
        </div>
      </header>
      <SearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        situatie={situatie}
        onSituatieChange={onSituatieChange}
      />
    </>
  );
};

export default Header;
