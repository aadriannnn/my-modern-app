import React, { useState } from 'react';
import logo from '@/assets/icons/logo.png';
import { Menu, PlusCircle, FolderOpen, User as UserIcon, LogOut, LogIn, Crown, Newspaper } from 'lucide-react';
import { useDosar } from '../context/DosarContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface DosarButtonProps {
  customClass?: string;
}

const DosarButton: React.FC<DosarButtonProps> = ({ customClass }) => {
  const { toggleDrawer, items } = useDosar();
  return (
    <button
      onClick={toggleDrawer}
      className={`transition-colors duration-200 relative group ${customClass || 'flex items-center text-sm font-medium text-gray-300 hover:text-white'}`}
    >
      <FolderOpen size={18} className="md:mr-2 mb-0.5 md:mb-0" />
      <span>Dosar</span>
      {items.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center border border-white/20">
          {items.length}
        </span>
      )}
    </button>
  );
};

// ... props interface
interface HeaderProps {
  onToggleMenu: () => void;
  onContribuieClick: () => void;
  isHomeView?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu, onContribuieClick, isHomeView = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Dynamic styles based on view
  const headerBg = isHomeView ? 'bg-transparent' : 'bg-brand-dark shadow-md';
  const textColor = isHomeView ? 'text-brand-dark' : 'text-gray-300';
  const hoverColor = isHomeView ? 'hover:text-brand-accent' : 'hover:text-white';
  const iconColor = isHomeView ? 'text-brand-dark/70' : 'text-gray-400';

  return (
    <header className={`${headerBg} px-4 sm:px-6 lg:px-8 transition-colors duration-300 z-10`}>
      <div className="flex items-center justify-between h-16">
        {/* Left Section: Logo and Mobile Menu */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleMenu}
            className={`${iconColor} hover:text-brand-accent md:hidden transition-colors`}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <Link to="/">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
          </Link>
        </div>

        {/* Center Section: Motto (Hidden on very small screens, visible otherwise) */}
        {!isHomeView && (
          <div className="hidden sm:flex items-center justify-center flex-1 mx-4">
            <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-light font-semibold text-base sm:text-sm md:text-lg lg:text-xl tracking-wide">
              <span className="hidden md:inline">LegeaAplicată – Dreptul de a fi informat</span>
              <span className="md:hidden">Dreptul de a fi informat</span>
            </h1>
          </div>
        )}
        {/* On Home View, we skip the motto in header to keep it clean */}
        {isHomeView && <div className="flex-1" />}

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:space-x-4">

          <button
            onClick={onContribuieClick}
            className={`hidden md:flex items-center text-sm font-medium ${textColor} ${hoverColor} transition-colors duration-200`}
          >
            <PlusCircle size={18} className="mr-2" />
            <span className="hidden lg:inline">Contribuie cu o speță</span>
            <span className="lg:hidden">Contribuie</span>
          </button>

          <Link
            to="/stiri"
            className={`flex flex-col md:flex-row items-center justify-center text-[10px] md:text-sm font-medium ${textColor} ${hoverColor} transition-colors duration-200 p-1`}
            title="Știri Juridice"
          >
            <Newspaper size={18} className="md:mr-2 mb-0.5 md:mb-0" />
            <span>Știri</span>
          </Link>

          <Link
            to="/abonamente"
            className={`flex flex-col md:flex-row items-center justify-center text-[10px] md:text-sm font-medium text-amber-500 hover:text-amber-600 transition-colors duration-200 p-1`}
            title="Abonamente Premium"
          >
            <Crown size={18} className="md:mr-2 mb-0.5 md:mb-0" />
            <span>Premium</span>
          </Link>

          <div className="flex flex-col md:flex-row items-center justify-center">
            <DosarButton customClass={`flex flex-col md:flex-row items-center justify-center text-[10px] md:text-sm font-medium ${isHomeView ? 'text-brand-dark hover:text-brand-accent' : 'text-gray-300 hover:text-white'} p-1`} />
          </div>

          {isAuthenticated ? (
            <div className="relative">
              <button
                className={`flex flex-col md:flex-row items-center text-[10px] md:text-sm font-medium ${textColor} ${hoverColor} transition-colors duration-200 gap-1 p-1`}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                  <UserIcon size={16} className="md:w-[18px] md:h-[18px]" />
                </div>
                <span className="max-w-[60px] truncate md:inline hidden">{user?.numeComplet?.split(' ')[0]}</span>
                <span className="md:hidden">Cont</span>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2">
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
            <Link
              to="/login"
              className={`flex flex-col md:flex-row items-center justify-center text-[10px] md:text-sm font-medium ${textColor} ${hoverColor} transition-colors duration-200 p-1`}
              title="Autentificare"
            >
              <div className="hidden md:block">
                <LogIn size={20} className="mr-1" />
              </div>
              <div className="md:hidden mb-0.5">
                <UserIcon size={18} />
              </div>
              <span>Cont</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};


export default Header;
