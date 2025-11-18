import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';

interface ContribuieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContribuieModal: React.FC<ContribuieModalProps> = ({ isOpen, onClose }) => {
  const [denumire, setDenumire] = useState('');
  const [sursa, setSursa] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) setFile(event.target.files[0]);
  };

  const handleClose = () => {
    setDenumire('');
    setSursa('');
    setFile(null);
    setStatus('');
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !denumire.trim() || !sursa.trim()) {
      setStatus('Toate câmpurile sunt obligatorii.');
      return;
    }

    setStatus('Se trimite...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('denumire', denumire);
    formData.append('sursa', sursa);

    try {
      const response = await fetch('/api/contribuie', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Network response was not ok');
      setStatus('Speța a fost trimisă cu succes! Vă mulțumim.');
      setTimeout(handleClose, 2000);
    } catch (error) {
      console.error('Eroare la trimiterea speței:', error);
      setStatus('A apărut o eroare. Vă rugăm să încercați din nou.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={handleClose}>
      <div className="bg-brand-light rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-brand-primary">Contribuie cu o speță</h2>
          <button onClick={handleClose} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors" aria-label="Închide">
            <X size={20} />
          </button>
        </header>

        <main className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="denumire" className="block text-sm font-semibold text-brand-text mb-1">Denumirea speței</label>
              <input
                type="text"
                id="denumire"
                value={denumire}
                onChange={(e) => setDenumire(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="Ex: Decizia civilă nr. 123/2023"
                required
              />
            </div>
            <div>
              <label htmlFor="sursa" className="block text-sm font-semibold text-brand-text mb-1">Sursa</label>
              <input
                type="text"
                id="sursa"
                value={sursa}
                onChange={(e) => setSursa(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="Ex: www.rolii.ro"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1">Încarcă speța</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-brand-light rounded-md font-medium text-brand-accent hover:opacity-80">
                      <span>Selectează un fișier</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">sau trage-l aici</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, DOCX, TXT</p>
                  {file && <p className="text-sm text-gray-600 mt-2 font-semibold">{file.name}</p>}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity">
                Trimite
              </button>
            </div>
            {status && <p className="text-sm text-center text-brand-text-secondary mt-4">{status}</p>}
          </form>
        </main>
      </div>
    </div>
  );
};

export default ContribuieModal;
