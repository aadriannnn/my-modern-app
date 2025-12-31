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

  // New state handling for drag and drop visual feedback
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
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
    if (!file || !denumire.trim()) {
      setStatus("Vă rugăm să completați titlul și să atașați un fișier.");
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

      setStatus("Speța a fost adăugată cu succes! Mulțumim pentru contribuție.");
      setIsSuccess(true);
      setTimeout(handleClose, 3000);
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl border border-gray-100">

                {/* Header Premium */}
                <div className="px-6 py-5 border-b border-gray-100 bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-slate-900">
                        Contribuie la dezvoltarea jurisprudenței
                      </Dialog.Title>
                      <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                        Fiecare speță adăugată contribuie la consolidarea unei baze de date valoroase pentru întreaga comunitate juridică.
                      </p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all focus:outline-none"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Thank You Card */}
                <div className="px-6 pt-6 pb-2">
                  <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-4 flex gap-4">
                    <div className="shrink-0 pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        {/* Heart or Shield Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Mulțumim comunității de profesioniști</h4>
                      <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                        Acest proiect există datorită avocaților care contribuie cu spețe relevante, consolidând o bază de cunoaștere juridică practică.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Denumire */}
                    <div>
                      <label htmlFor="denumire" className="block text-sm font-medium leading-6 text-slate-900 mb-1.5">
                        Titlul speței
                      </label>
                      <input
                        type="text"
                        id="denumire"
                        value={denumire}
                        onChange={(e) => setDenumire(e.target.value)}
                        className="block w-full rounded-lg border-0 py-2.5 px-3.5 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 shadow-sm transition-all"
                        placeholder="Ex: Decizia civilă nr. 123/2023 – rezoluțiune promisiune V-C"
                        required
                      />
                    </div>

                    {/* Sursa */}
                    <div>
                      <label htmlFor="sursa" className="block text-sm font-medium leading-6 text-slate-900 mb-1.5">
                        Sursa publicării <span className="text-slate-400 font-normal"></span>
                      </label>
                      <input
                        type="text"
                        id="sursa"
                        value={sursa}
                        onChange={(e) => setSursa(e.target.value)}
                        className="block w-full rounded-lg border-0 py-2.5 px-3.5 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 shadow-sm transition-all"
                        placeholder="Ex: portal instanțe, site specializat, publicație juridică"
                      />
                    </div>

                    {/* File Upload - Modern DropZone */}
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900 mb-2">
                        Încarcă documentul speței
                      </label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`mt-1 flex justify-center rounded-xl border border-dashed px-6 py-8 transition-all duration-200 ${isDragging
                          ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                      >
                        <div className="text-center">
                          {!file ? (
                            <>
                              <UploadCloud className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
                              <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                                >
                                  <span>Selectează un fișier</span>
                                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">sau trage-l aici</p>
                              </div>
                              <p className="text-xs leading-5 text-slate-500 mt-1">PDF, DOCX sau TXT · max 10 MB</p>
                            </>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                                <CheckCircle className="h-6 w-6 text-blue-600" />
                              </div>
                              <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                              <button
                                type="button"
                                onClick={() => setFile(null)}
                                className="mt-3 text-xs font-medium text-red-600 hover:text-red-800"
                              >
                                Șterge fișierul
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Messages */}
                    {status && (
                      <div className={`flex items-start p-4 rounded-lg text-sm ${isSuccess ? 'bg-green-50 text-green-800 border border-green-100'
                        : isError ? 'bg-red-50 text-red-800 border border-red-100'
                          : 'bg-blue-50 text-blue-800 border border-blue-100'
                        }`}>
                        {isSuccess ? <CheckCircle className="h-5 w-5 mr-2 shrink-0 text-green-600" /> :
                          isError ? <AlertTriangle className="h-5 w-5 mr-2 shrink-0 text-red-600" /> :
                            <div className="h-5 w-5 mr-2 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}
                        <span className="font-medium mt-0.5">{status}</span>
                      </div>
                    )}

                    {/* Submit & Trust */}
                    <div>
                      <button
                        type="submit"
                        disabled={!file || !denumire || status === "Se trimite..."}
                        className="w-full flex w-full justify-center rounded-lg bg-slate-900 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {status === "Se trimite..." ? "Se procesează..." : "Adaugă speța"}
                      </button>

                      <p className="mt-4 text-center text-xs text-slate-400">
                        Documentul va fi analizat și procesat automat. Datele personale nu sunt făcute publice.
                      </p>
                    </div>

                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ContribuieModal;
