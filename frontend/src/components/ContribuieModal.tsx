import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, UploadCloud, Loader2, CheckCircle } from 'lucide-react';

interface ContribuieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContribuieModal: React.FC<ContribuieModalProps> = ({ isOpen, onClose }) => {
  const [denumire, setDenumire] = useState('');
  const [sursa, setSursa] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({ type: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) setFile(event.target.files[0]);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setDenumire('');
    setSursa('');
    setFile(null);
    setStatus({ type: 'idle', message: '' });
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !denumire.trim() || !sursa.trim()) {
      setStatus({ type: 'error', message: 'Toate câmpurile sunt obligatorii.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'idle', message: 'Se trimite...' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('denumire', denumire);
    formData.append('sursa', sursa);

    try {
      const response = await fetch('/api/contribuie', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Network response was not ok');
      setStatus({ type: 'success', message: 'Speța a fost trimisă cu succes! Vă mulțumim.'});
      setTimeout(() => {
        setIsSubmitting(false);
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Eroare la trimiterea speței:', error);
      setStatus({ type: 'error', message: 'A apărut o eroare. Vă rugăm să încercați din nou.'});
      setIsSubmitting(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-text-primary">
                  Contribuie cu o speță
                </Dialog.Title>
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button type="button" className="rounded-md bg-white p-1 text-text-secondary hover:bg-gray-100" onClick={handleClose}>
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="denumire" className="block text-sm font-medium text-text-primary">Denumirea speței</label>
                    <input type="text" id="denumire" value={denumire} onChange={(e) => setDenumire(e.target.value)}
                      className="mt-1 block w-full rounded-md border-border-color shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm"
                      placeholder="Ex: Decizia civilă nr. 123/2023" required />
                  </div>
                  <div>
                    <label htmlFor="sursa" className="block text-sm font-medium text-text-primary">Sursa</label>
                    <input type="text" id="sursa" value={sursa} onChange={(e) => setSursa(e.target.value)}
                      className="mt-1 block w-full rounded-md border-border-color shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm"
                      placeholder="Ex: www.rolii.ro" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary">Încarcă speța</label>
                    <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-border-color px-6 pt-5 pb-6">
                      <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-text-secondary">
                          <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-brand-gold focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-gold focus-within:ring-offset-2 hover:text-brand-gold/80">
                            <span>Selectează un fișier</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                          </label>
                          <p className="pl-1">sau trage-l aici</p>
                        </div>
                        <p className="text-xs text-gray-500">PDF, DOCX, TXT</p>
                        {file && <p className="text-sm text-text-primary mt-2 font-semibold">{file.name}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={isSubmitting}
                      className="inline-flex justify-center rounded-md border border-transparent bg-brand-blue px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:opacity-50">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Trimite
                    </button>
                  </div>
                  {status.message && (
                    <div className={`text-sm text-center p-2 rounded-md ${status.type === 'error' ? 'bg-red-100 text-red-700' : status.type === 'success' ? 'bg-green-100 text-green-700' : 'text-text-secondary'}`}>
                      {status.message}
                    </div>
                  )}
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ContribuieModal;
