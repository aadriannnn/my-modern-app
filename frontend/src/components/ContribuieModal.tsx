import React, { useState } from 'react';

interface ContribuieModalProps {
  onClose: () => void;
}

const ContribuieModal: React.FC<ContribuieModalProps> = ({ onClose }) => {
  const [denumire, setDenumire] = useState('');
  const [sursa, setSursa] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setStatus('Vă rugăm să selectați un fișier.');
      return;
    }

    if (!denumire.trim()) {
        setStatus('Vă rugăm să introduceți denumirea speței.');
        return;
    }

    if (!sursa.trim()) {
        setStatus('Vă rugăm să introduceți sursa speței.');
        return;
    }

    setStatus('Se trimite...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('denumire', denumire);
    formData.append('sursa', sursa);

    try {
      const response = await fetch('/api/contribuie', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      console.log('API response:', result);

      setStatus('Speța a fost trimisă cu succes! Vă mulțumim.');
      setDenumire('');
      setSursa('');
      setFile(null);

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Eroare la trimiterea speței:', error);
      setStatus('A apărut o eroare la trimitere. Vă rugăm să încercați din nou.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <header className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">Contribuie cu o speță</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Închide"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="denumire" className="block text-sm font-medium text-gray-700 mb-1">
                Denumirea speței
              </label>
              <input
                type="text"
                id="denumire"
                value={denumire}
                onChange={(e) => setDenumire(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Decizia civilă nr. 123/2023"
                required
              />
            </div>

            <div>
              <label htmlFor="sursa" className="block text-sm font-medium text-gray-700 mb-1">
                Sursa
              </label>
              <input
                type="text"
                id="sursa"
                value={sursa}
                onChange={(e) => setSursa(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: www.rolii.ro"
                required
              />
            </div>

            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                Încarcă speța
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Selectează un fișier</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">sau trage-l aici</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, DOCX, TXT
                  </p>
                  {file && <p className="text-sm text-gray-600 mt-2">Fișier selectat: {file.name}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Trimite
              </button>
            </div>
            {status && <p className="text-sm text-center text-gray-600 mt-4">{status}</p>}
          </form>
        </main>
      </div>
    </div>
  );
};

export default ContribuieModal;
