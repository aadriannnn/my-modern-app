import React, { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";

interface ContribuieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContribuieModal: React.FC<ContribuieModalProps> = ({ isOpen, onClose }) => {
  const [denumire, setDenumire] = useState("");
  const [sursa, setSursa] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleClose = () => {
    setDenumire("");
    setSursa("");
    setFile(null);
    setStatus("");
    setIsSuccess(false);
    setIsError(false);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !denumire.trim() || !sursa.trim()) {
      setStatus("Toate câmpurile sunt obligatorii.");
      setIsError(true);
      return;
    }

    setStatus("Se trimite...");
    setIsError(false);
    setIsSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("denumire", denumire);
    formData.append("sursa", sursa);

    try {
      const response = await fetch("/api/contribuie", {
        method: "POST",
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error("A apărut o problemă la server.");

      setStatus("Speța a fost trimisă cu succes! Vă mulțumim.");
      setIsSuccess(true);
      setTimeout(handleClose, 2500);
    } catch (error) {
      console.error("Eroare la trimiterea speței:", error);
      setStatus("A apărut o eroare. Vă rugăm să încercați din nou.");
      setIsError(true);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <header className="flex justify-between items-center p-5 border-b border-gray-200">
                  <Dialog.Title as="h3" className="text-xl font-bold text-brand-dark">
                    Contribuie cu o speță
                  </Dialog.Title>
                  <button onClick={handleClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" aria-label="Închide">
                    <X size={22} />
                  </button>
                </header>

                <main className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="denumire" className="block text-sm font-semibold text-gray-700 mb-1">Denumirea speței</label>
                      <input
                        type="text"
                        id="denumire"
                        value={denumire}
                        onChange={(e) => setDenumire(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent transition-shadow"
                        placeholder="Ex: Decizia civilă nr. 123/2023"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="sursa" className="block text-sm font-semibold text-gray-700 mb-1">Sursa</label>
                      <input
                        type="text"
                        id="sursa"
                        value={sursa}
                        onChange={(e) => setSursa(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent transition-shadow"
                        placeholder="Ex: www.rolii.ro"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Încarcă speța</label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
                        <div className="space-y-1 text-center">
                          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-50 rounded-md font-medium text-brand-accent hover:opacity-80 transition-opacity">
                              <span>Selectează un fișier</span>
                              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">sau trage-l aici</p>
                          </div>
                          <p className="text-xs text-gray-500">PDF, DOCX, TXT</p>
                          {file && <p className="text-sm text-gray-700 mt-2 font-semibold">{file.name}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" className="w-full px-6 py-2.5 bg-brand-primary text-white font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center">
                        Trimite
                      </button>
                    </div>
                    {status && (
                      <div className={`flex items-center p-3 rounded-lg text-sm ${isSuccess ? 'bg-green-50 text-green-800' : isError ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                        {isSuccess && <CheckCircle className="h-5 w-5 mr-2" />}
                        {isError && <AlertTriangle className="h-5 w-5 mr-2" />}
                        {status}
                      </div>
                    )}
                  </form>
                </main>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ContribuieModal;
