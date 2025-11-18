import React from 'react';
import logo from '@/assets/icons/logo.png';
import { Menu, PlusCircle } from 'lucide-react';

interface HeaderProps {
  onToggleMenu: () => void;
  onContribuieClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu, onContribuieClick }) => {
  return (
    <header className="bg-brand-dark shadow-md px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Left Section: Logo and Mobile Menu */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleMenu}
            className="text-gray-400 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <img src={logo} alt="Logo" className="h-8 w-auto" />
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center space-x-6">
          <button
            onClick={onContribuieClick}
            className="hidden sm:flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
          >
            <PlusCircle size={18} className="mr-2" />
            Contribuie
          </button>
          <a
            href="https://app.verdictline.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
          >
            VerdictLine.com
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
