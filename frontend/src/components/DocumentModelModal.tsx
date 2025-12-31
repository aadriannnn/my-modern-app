import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Download } from 'lucide-react';

import { generatePdf } from '../lib/pdf';

interface DocumentModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    modelId: string | null;
}

const DocumentModelModal: React.FC<DocumentModelModalProps> = ({ isOpen, onClose, modelId }) => {
    const [modelData, setModelData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!modelId || !isOpen) return;

        const fetchModelDetails = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/modele/${modelId}`, {
                    credentials: 'include'
                });
                if (!response.ok) {
                    throw new Error('Eroare la încărcarea modelului');
                }

                const data = await response.json();
                setModelData(data);
            } catch (err) {
                console.error('Error fetching model:', err);
                setError(err instanceof Error ? err.message : 'Eroare necunoscută');
            } finally {
                setLoading(false);
            }
        };

        fetchModelDetails();
    }, [modelId, isOpen]);



    // ...

    const handleDownload = async () => {
        if (!modelData || !modelId) return;

        try {
            await generatePdf({
                titlu: modelData.titlu_model,
                materie: modelData.materie_model || "",
                obiect: modelData.obiect_model || "",
                instanta: modelData.sursa_model || "",
                parte_introductiva: "",
                considerente_speta: "",
                dispozitiv_speta: "",
                generic_content: modelData.text_model || ""
            });
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Eroare la generarea PDF-ului');
        }
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                                <header className="flex justify-between items-center p-5 border-b border-gray-200 bg-white sticky top-0">
                                    <Dialog.Title as="h3" className="text-xl font-bold text-brand-dark leading-6">
                                        {modelData?.titlu_model || 'Model Act Juridic'}
                                    </Dialog.Title>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={handleDownload}
                                            disabled={!modelData}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                                            aria-label="Descarcă"
                                        >
                                            <Download size={20} />
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                                            aria-label="Închide"
                                        >
                                            <X size={22} />
                                        </button>
                                    </div>
                                </header>

                                <main className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50">
                                    {loading && (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>
                                            <span className="ml-3 text-gray-600">Se încarcă...</span>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                            <p className="text-red-600 font-medium">Eroare: {error}</p>
                                        </div>
                                    )}

                                    {modelData && !loading && !error && (
                                        <div className="space-y-4">
                                            {/* Metadata */}
                                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {modelData.materie_model && (
                                                        <div>
                                                            <span className="text-xs font-semibold text-gray-500 uppercase">Materie</span>
                                                            <p className="text-sm text-gray-800 mt-1">{modelData.materie_model}</p>
                                                        </div>
                                                    )}
                                                    {modelData.obiect_model && (
                                                        <div>
                                                            <span className="text-xs font-semibold text-gray-500 uppercase">Obiect</span>
                                                            <p className="text-sm text-gray-800 mt-1">{modelData.obiect_model}</p>
                                                        </div>
                                                    )}
                                                    {modelData.sursa_model && (
                                                        <div>
                                                            <span className="text-xs font-semibold text-gray-500 uppercase">Sursă</span>
                                                            <p className="text-sm text-gray-800 mt-1">{modelData.sursa_model}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Model Text */}
                                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                                <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Conținut Model</h4>
                                                <div className="prose max-w-none">
                                                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                                                        {modelData.text_model}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </main>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default DocumentModelModal;
