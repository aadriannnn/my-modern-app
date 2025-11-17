import React, { useState } from 'react';
import { refreshFilters } from '../lib/api';

const SettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Pagină de Setări</h1>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition w-full"
        >
          {isLoading ? 'Actualizare în curs...' : 'Actualizează Filtrele'}
        </button>
        {message && (
          <p className={`mt-4 text-sm ${message.startsWith('Eroare') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
