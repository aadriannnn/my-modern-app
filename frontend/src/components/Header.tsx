import React from 'react';
import logo from '@/assets/icons/logo.png';
import { Search, Menu, PlusCircle } from 'lucide-react';

interface HeaderProps {
  situatie: string;
  onSituatieChange: (value: string) => void;
  onSearch: () => void;
  onToggleMenu: () => void;
  onContribuieClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ situatie, onSituatieChange, onSearch, onToggleMenu, onContribuieClick }) => {
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <header className="bg-brand-primary shadow-lg px-4 py-3 flex items-center justify-between z-30">
      {/* Logo and Mobile Menu Toggle */}
      <div className="flex items-center space-x-4">
        <button onClick={onToggleMenu} className="text-white md:hidden">
          <Menu size={24} />
        </button>
        <img src={logo} alt="Logo" className="h-8" />
      </div>

      {/* Search Bar */}
      <div className="flex-1 flex justify-center items-center px-4">
        <div className="relative w-full max-w-2xl">
          <input
            type="text"
            value={situatie}
            onChange={(e) => onSituatieChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Introduceți situația de fapt..."
            className="w-full pl-10 pr-4 py-2 border border-brand-secondary rounded-full bg-brand-secondary text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Search size={20} className="text-gray-400" />
          </div>
        </div>
        <button
          onClick={onSearch}
          className="ml-3 bg-brand-accent text-white px-6 py-2 rounded-full flex items-center hover:opacity-90 transition-opacity"
        >
          <Search size={18} className="mr-2" />
          Căutare
        </button>
      </div>

      {/* Right side actions */}
      <div className="hidden md:flex items-center space-x-4">
        <button
          onClick={onContribuieClick}
          className="flex items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors"
        >
          <PlusCircle size={18} className="mr-1.5" />
          Contribuie
        </button>
        <a href="https://app.verdictline.com/login" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
          VerdictLine.com
        </a>
      </div>
    </header>
  );
};

export default Header;
