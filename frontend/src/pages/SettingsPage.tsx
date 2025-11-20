import React, { useState, useEffect } from 'react';
import { refreshFilters, login } from '../lib/api';

const SettingsPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Verifică dacă utilizatorul este deja autentificat
  useEffect(() => {
    const authStatus = sessionStorage.getItem('setari_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        sessionStorage.setItem('setari_authenticated', 'true');
        setIsAuthenticated(true);
        setPassword(''); // Clear password for security
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Eroare la autentificare';
      setLoginError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('setari_authenticated');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setLoginError(null);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const data = await refreshFilters();
      setMessage(`Au fost importate ${data.materii} materii, ${data.obiecte} obiecte si ${data.parti} parti.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
      setMessage(`Eroare la actualizarea filtrelor: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Dacă nu este autentificat, afișează formularul de login
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Autentificare</h1>
          <p className="text-sm text-gray-600 mb-6 text-center">
            Introduceți credențialele pentru accesul la pagina de setări
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Utilizator
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoggingIn}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Parolă
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoggingIn}
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-500 text-center">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Autentificare...' : 'Autentificare'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dacă este autentificat, afișează pagina de setări
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Pagină de Setări</h1>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition w-full mb-4"
        >
          {isLoading ? 'Actualizare în curs...' : 'Actualizează Filtrele'}
        </button>
        {message && (
          <p className={`mb-4 text-sm ${message.startsWith('Eroare') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition w-full"
        >
          Deconectare
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
