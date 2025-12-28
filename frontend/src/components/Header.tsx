import React, { useState } from 'react';
import logo from '@/assets/icons/logo.png';
import { Menu, PlusCircle, FolderOpen, User as UserIcon, LogOut, LogIn, Crown, Newspaper } from 'lucide-react';
import { useDosar } from '../context/DosarContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const DosarButton: React.FC = () => {
  const { toggleDrawer, items } = useDosar();
  return (
    <button
      onClick={toggleDrawer}
      className="flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 relative group"
    >
      <FolderOpen size={20} className="mr-2" />
      <span className="hidden sm:inline">Dosar</span>
      {items.length > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-brand-dark">
          {items.length}
        </span>
      )}
    </button>
  );
};

interface HeaderProps {
  onToggleMenu: () => void;
  onContribuieClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu, onContribuieClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
          <Link to="/">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
          </Link>
        </div>

        {/* Center Section: Motto */}
        <div className="hidden sm:flex items-center justify-center flex-1 mx-4">
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-light font-semibold text-base sm:text-sm md:text-lg lg:text-xl tracking-wide">
            <span className="hidden md:inline">LegeaAplicată – Dreptul de a fi informat</span>
            <span className="md:hidden">Dreptul de a fi informat</span>
          </h1>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center space-x-6">

          <button
            onClick={onContribuieClick}
            className="hidden md:flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
          >
            <PlusCircle size={18} className="mr-2" />
            <span className="hidden lg:inline">Contribuie cu o speță</span>
            <span className="lg:hidden">Contribuie</span>
          </button>

          <Link
            to="/stiri"
            className="hidden md:flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
          >
            <Newspaper size={18} className="mr-2" />
            <span className="hidden lg:inline">Știri Juridice</span>
            <span className="lg:hidden">Știri</span>
          </Link>

          <Link
            to="/abonamente"
            className="hidden md:flex items-center text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors duration-200"
          >
            <Crown size={18} className="mr-2" />
            <span className="hidden lg:inline">Abonamente</span>
            <span className="lg:hidden">Premium</span>
          </Link>

          <DosarButton />

          {isAuthenticated ? (
            <div className="relative">
              <button
                className="flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 space-x-2"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <UserIcon size={20} />
                <span className="max-w-[100px] truncate hidden md:inline">{user?.numeComplet || user?.email}</span>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    <div className="font-medium text-gray-900 truncate">{user?.numeComplet}</div>
                    <div className="text-gray-500 truncate">{user?.email}</div>
                  </div>
                  <Link to="/setari" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowProfileMenu(false)}>
                    Setări cont
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      <LogOut size={16} className="mr-2" />
                      Deconectare
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 flex items-center"
              >
                <LogIn size={18} className="mr-1" />
                <span className="hidden sm:inline">Autentificare</span>
              </Link>
              <Link
                to="/register"
                className="hidden md:inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-brand-dark bg-brand-accent hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors duration-200"
              >
                Înregistrare
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
