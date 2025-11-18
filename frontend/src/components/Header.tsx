import React from 'react';
import logo from '@/assets/icons/logo.png';
import { Menu, PlusCircle } from 'lucide-react';

interface HeaderProps {
  onToggleMenu: () => void;
  onContribuieClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu, onContribuieClick }) => {
  return (
    <header className="bg-surface shadow-soft sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Mobile Menu Toggle */}
          <div className="flex items-center">
            <button
              onClick={onToggleMenu}
              className="rounded-md p-2 text-text-secondary md:hidden hover:bg-gray-100 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-gold"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <Menu size={24} />
            </button>
            <div className="flex-shrink-0 ml-4 md:ml-0">
              <img src={logo} alt="Logo" className="h-8 w-auto" />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-6">
            <button
              onClick={onContribuieClick}
              className="hidden md:flex items-center text-sm font-medium text-text-secondary hover:text-brand-gold transition-colors"
            >
              <PlusCircle size={18} className="mr-1.5" />
              Contribuie
            </button>
            <a
              href="https://app.verdictline.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-text-secondary hover:text-brand-gold transition-colors"
            >
              VerdictLine.com
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
