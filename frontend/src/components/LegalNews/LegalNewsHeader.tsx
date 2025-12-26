import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Home,
    MessageSquare,
    Users,
    Calendar,
    Briefcase,
    Book,
    Award,
    Menu,
    X,
    Search,
    LogIn,
    UserPlus,
    LogOut,
    Settings,
    // MoreVertical,
    ChevronDown,
    Handshake
} from 'lucide-react';
// import { useSectionTheme } from '../../context/SectionThemeContext';

// Navigation Data
const menuData = [
    { name: 'Homepage', path: '/stiri', icon: Home },
    { name: 'Articole', path: '/stiri/articole', icon: MessageSquare },
    { name: 'Profesioniști', path: '/profesionisti', icon: Users },
    { name: 'Evenimente', path: '/evenimente', icon: Calendar },
    { name: 'Cariere', path: '/cariera', icon: Briefcase },
    { name: 'Editură', path: '/editura', icon: Book },
    { name: 'AI Juridic', path: 'https://app.verdictline.com/login', icon: Award, external: true },
];

interface NavItemProps {
    item: typeof menuData[0];
}

const DesktopNavItem: React.FC<NavItemProps> = ({ item }) => {
    const commonClasses = "flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white rounded-md transition-colors";

    // External Link
    if (item.external) {
        return (
            <a href={item.path} target="_blank" rel="noopener noreferrer" className={commonClasses}>
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
            </a>
        );
    }

    // Internal Link
    return (
        <NavLink
            to={item.path}
            className={({ isActive }) =>
                isActive
                    ? `${commonClasses} bg-white/20 text-white font-semibold`
                    : commonClasses
            }
        >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
        </NavLink>
    );
};

const UserMenu = ({ user, logout }: { user: any, logout: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
            >
                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                    {(user?.numeComplet || user?.email || 'U').charAt(0)}
                </div>
                <span className="hidden lg:block max-w-[100px] truncate">
                    {user?.numeComplet ? user.numeComplet.split(' ')[0] : user?.email}
                </span>
                <ChevronDown className="h-3 w-3" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                        <Link
                            to="/setari"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings className="h-4 w-4" />
                            Setări Cont
                        </Link>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                        <button
                            onClick={() => {
                                logout();
                                setIsOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <LogOut className="h-4 w-4" />
                            Deconectare
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated: boolean;
    user: any;
    logout: () => void;
    onLogin: () => void;
    onRegister: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, isAuthenticated, logout, onLogin, onRegister }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Meniu</h2>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-2 space-y-1">
                    {menuData.map((item) => (
                        <div key={item.name}>
                            {item.external ? (
                                <a
                                    href={item.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                                    onClick={onClose}
                                >
                                    <item.icon className="h-5 w-5 text-gray-400" />
                                    <span>{item.name}</span>
                                </a>
                            ) : (
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-md ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`
                                    }
                                    onClick={onClose}
                                >
                                    <item.icon className="h-5 w-5 text-gray-400" />
                                    <span>{item.name}</span>
                                </NavLink>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 mt-2 bg-gray-50 dark:bg-gray-800/50">
                    {!isAuthenticated ? (
                        <div className="space-y-2">
                            <button
                                onClick={() => { onLogin(); onClose(); }}
                                className="flex w-full items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <LogIn className="h-4 w-4" />
                                Login
                            </button>
                            <button
                                onClick={() => { onRegister(); onClose(); }}
                                className="flex w-full items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                            >
                                <UserPlus className="h-4 w-4" />
                                Register
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { logout(); onClose(); }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md text-sm font-medium"
                        >
                            <LogOut className="h-4 w-4" />
                            Deconectare
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


interface LegalNewsHeaderProps {
    searchNews: (term: string) => void;
    setSearchTerm: (term: string) => void;
    searchTerm: string;
}

const LegalNewsHeader: React.FC<LegalNewsHeaderProps> = ({ searchNews, setSearchTerm, searchTerm }) => {
    // const { themeName } = useSectionTheme(); // Not directly used in structure currently
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuth();

    const handleLogin = () => navigate('/login');
    const handleRegister = () => navigate('/register');

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); };
    const handleSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (searchTerm.trim().length >= 3) { searchNews(searchTerm.trim()); }
    };

    const headerBgColor = "#0F172A"; // Slate 900

    return (
        <div style={{ backgroundColor: headerBgColor }} className="sticky top-0 z-40 w-full shadow-sm">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
                {/* Desktop Header */}
                <div className="hidden lg:flex flex-col w-full">
                    {/* Top Bar */}
                    <div className="flex h-[72px] items-center py-2 border-b border-white/10">
                        {/* Logo */}
                        <Link to="/stiri" className="flex-shrink-0 text-white hover:opacity-90 transition-opacity">
                            <span className="text-2xl font-bold">LegeaAplicata</span>
                        </Link>

                        <div className="flex-1 px-8 flex justify-end items-center gap-4">
                            {/* Action Button */}
                            <Link
                                to="#"
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                            >
                                <Handshake className="h-4 w-4" />
                                <span>Program Avocați</span>
                            </Link>

                            {/* Search Bar */}
                            <div className="max-w-md w-full">
                                <form onSubmit={handleSearchSubmit} className="relative">
                                    <input
                                        type="search"
                                        placeholder="Caută știri, articole..."
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        className="w-full bg-white/10 border-0 text-white placeholder-white/60 rounded-md py-1.5 pl-3 pr-10 text-sm focus:ring-1 focus:ring-white/30 focus:bg-white/20 transition-all"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-0 top-0 h-full px-3 text-white/60 hover:text-white transition-colors"
                                    >
                                        <Search className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* User Actions */}
                        <div className="flex items-center gap-3">
                            {!isAuthenticated ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleLogin}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
                                    >
                                        <LogIn className="h-4 w-4" />
                                        <span>Login</span>
                                    </button>
                                    <button
                                        onClick={handleRegister}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-slate-900 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        <span>Register</span>
                                    </button>
                                </div>
                            ) : (
                                <UserMenu user={user} logout={logout} />
                            )}
                        </div>
                    </div>

                    {/* Navigation Bar */}
                    <div className="flex h-[52px] items-center justify-center">
                        <nav className="flex items-center gap-1">
                            {menuData.map((item) => (
                                <DesktopNavItem key={item.name} item={item} />
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Mobile Header */}
                <div className="flex lg:hidden h-[60px] items-center justify-between w-full">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 text-white hover:bg-white/10 rounded-md"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <Link to="/stiri" className="text-white">
                        <span className="text-xl font-bold">LegeaAplicata</span>
                    </Link>

                    <button
                        onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                        className="p-2 -mr-2 text-white hover:bg-white/10 rounded-md"
                    >
                        {isMobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Search Bar Expand */}
            {isMobileSearchOpen && (
                <div className="lg:hidden bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 shadow-md">
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <input
                            type="search"
                            placeholder="Caută știri..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-white"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2.5 text-gray-500"
                        >
                            <Search className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* Mobile Menu Overlay */}
            <MobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                isAuthenticated={isAuthenticated}
                user={user}
                logout={logout}
                onLogin={handleLogin}
                onRegister={handleRegister}
            />
        </div>
    );
};

export default LegalNewsHeader;
