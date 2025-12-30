import React, { useState } from 'react';
import logo from '@/assets/icons/logo.png';
import { PlusCircle, FolderOpen, User as UserIcon, LogOut, LogIn, Crown, Newspaper, Search, Scale, Menu } from 'lucide-react';
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
      className={`relative group flex items-center gap-2 text-sm font-medium transition-all duration-300 ${customClass || 'text-brand-text-secondary hover:text-brand-gold'}`}
    >
      <FolderOpen size={20} strokeWidth={1.5} />
      <span className="hidden md:inline">Dosar</span>
      {items.length > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
          {items.length}
        </span>
      )}
    </button>
  );
};

interface HeaderProps {
  onToggleMenu: () => void;
  onContribuieClick: () => void;
  isHomeView?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu, onContribuieClick, isHomeView = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Premium Header Aesthetics
  // Mobile: Dark by default
  // Desktop: White (unless home)

  // Base classes
  const baseHeaderClasses = "transition-all duration-300 relative z-50 h-20 md:h-22";

  // Background logic
  const mobileBg = isHomeView ? 'bg-transparent' : 'bg-white shadow-sm';
  const desktopBg = isHomeView ? 'md:bg-transparent' : 'md:bg-white md:shadow-soft';
  const borderClass = isHomeView ? '' : 'md:border-b md:border-gray-100';

  const mutedColor = isHomeView ? 'text-brand-dark/80' : 'text-slate-500';
  const hoverColor = 'hover:text-brand-gold';

  return (
    <header className={`${baseHeaderClasses} ${mobileBg} ${desktopBg} ${borderClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">

        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img src={logo} alt="LegeaAplicată" className="h-10 w-auto md:h-12 transition-transform duration-300 group-hover:scale-105" />
            {!isHomeView && (
              <div className="hidden lg:flex flex-col">
                <span className="text-xl font-serif font-bold text-brand-dark tracking-tight leading-none">
                  LegeaAplicată
                </span>
                <span className="text-[10px] uppercase tracking-widest text-brand-gold font-semibold">
                  Legal Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Navigation - Left Side (Next to Logo) */}
          <div className="flex md:hidden items-center gap-3 sm:gap-5 ml-2">
            {/* Hamburger Menu - Sidebars/Filters */}
            <button
              onClick={onToggleMenu}
              className="flex flex-col items-center gap-1 text-gray-500 hover:text-brand-gold transition-colors"
            >
              <Menu size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Meniu</span>
            </button>

            <Link to="/stiri" className="flex flex-col items-center gap-1 text-gray-500 hover:text-brand-gold transition-colors">
              <Newspaper size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Știri</span>
            </Link>

            <Link to="/abonamente" className="flex flex-col items-center gap-1 text-brand-gold hover:text-brand-gold-light transition-colors">
              <Crown size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Premium</span>
            </Link>

            {isHomeView ? (
              <button onClick={() => window.location.href = '/dosare'} className="flex flex-col items-center gap-1 text-gray-500 hover:text-brand-gold transition-colors">
                <FolderOpen size={18} strokeWidth={1.5} />
                <span className="text-[9px] font-medium">Dosar</span>
              </button>
            ) : (
              <Link to="/" className="flex flex-col items-center gap-1 text-brand-dark hover:text-brand-gold transition-colors">
                <Scale size={18} strokeWidth={1.5} />
                <span className="text-[9px] font-medium">Analiză</span>
              </Link>
            )}

            {isAuthenticated ? (
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex flex-col items-center gap-1 text-gray-500 hover:text-brand-gold transition-colors relative"
              >
                <UserIcon size={18} strokeWidth={1.5} />
                <span className="text-[9px] font-medium">Cont</span>
              </button>
            ) : (
              <Link to="/login" className="flex flex-col items-center gap-1 text-gray-500 hover:text-brand-gold transition-colors">
                <UserIcon size={18} strokeWidth={1.5} />
                <span className="text-[9px] font-medium">Cont</span>
              </Link>
            )}
          </div>
        </div>

        {/* Center: Global Search (Desktop) */}
        {!isHomeView && (
          <div className="hidden md:flex flex-1 max-w-2xl mx-12">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400 group-focus-within:text-brand-gold transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg leading-5 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-gold focus:border-brand-gold sm:text-sm transition-all shadow-sm group-hover:shadow-md"
                placeholder="Caută jurisprudență, articole, doctrine..."
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-gray-400 text-xs border border-gray-200 rounded px-1.5 py-0.5">/</span>
              </div>
            </div>
          </div>
        )}

        {/* Right: Actions (Desktop Only mostly) */}
        <div className="flex items-center gap-2 md:gap-6">

          <Link
            to="/stiri"
            className={`hidden md:flex items-center gap-2 text-sm font-medium ${mutedColor} ${hoverColor} transition-colors`}
          >
            <Newspaper size={18} strokeWidth={1.5} />
            <span>Știri</span>
          </Link>

          <Link
            to="/abonamente"
            className={`hidden md:flex items-center gap-2 text-sm font-medium text-brand-gold hover:text-brand-gold-light transition-colors`}
          >
            <Crown size={18} strokeWidth={1.5} />
            <span>Premium</span>
          </Link>

          {isHomeView ? (
            <>
              <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
              <DosarButton customClass={`hidden md:flex items-center gap-2 ${mutedColor} ${hoverColor}`} />

              <button
                onClick={onContribuieClick}
                className={`hidden lg:flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-all`}
              >
                <PlusCircle size={18} strokeWidth={1.5} />
                <span>Contribuie</span>
              </button>
            </>
          ) : (
            <Link
              to="/"
              className={`hidden md:flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-brand-dark text-white hover:bg-brand-primary transition-all shadow-md ml-2`}
            >
              <Scale size={18} strokeWidth={1.5} />
              <span>Analiză Juridică</span>
            </Link>
          )}

          {/* User Profile */}
          {isAuthenticated ? (
            <div className="relative ml-2">
              <button
                className="flex items-center gap-3 focus:outline-none group"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-9 h-9 rounded-full bg-brand-light border-2 border-gray-200 shadow-sm flex items-center justify-center text-brand-primary overflow-hidden group-hover:border-brand-gold transition-colors">
                  {/* Placeholder Avatar or Initials */}
                  <span className="font-serif font-bold text-sm">{user?.numeComplet?.charAt(0)}</span>
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-xs font-medium text-brand-dark group-hover:text-brand-primary">{user?.numeComplet?.split(' ')[0]}</span>
                  <span className="text-[10px] text-gray-400">Contul meu</span>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-premium py-2 z-50 animate-fade-in border border-gray-100">
                  <div className="px-5 py-3 border-b border-gray-50 mb-1">
                    <p className="text-sm font-semibold text-brand-dark truncate">{user?.numeComplet}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                  </div>

                  <Link
                    to="/setari"
                    className="flex items-center px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-dark transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <UserIcon size={16} className="mr-3 text-gray-400" />
                    Setări profil
                  </Link>

                  <div className="border-t border-gray-50 my-1"></div>

                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} className="mr-3" />
                    Deconectare
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-2 flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white text-sm font-medium rounded-lg hover:bg-brand-primary shadow-lg shadow-brand-dark/20 transition-all hover:-translate-y-0.5"
            >
              <LogIn size={18} strokeWidth={1.5} />
              <span>Intră în cont</span>
            </Link>
          )}
        </div>
      </div>

    </header>
  );
};

export default Header;
