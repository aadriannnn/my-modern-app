import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { useDosar } from '../context/DosarContext';
import type { CaseData } from '../context/DosarContext';
import CaseDetailModal from './CaseDetailModal';

const DosarDrawer: React.FC = () => {
    const { isDrawerOpen, toggleDrawer, items, removeFromDosar } = useDosar();
    const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const handleViewCase = (item: CaseData) => {
        setSelectedCase(item);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
        setSelectedCase(null);
    };

    return (
        <>
            <Transition.Root show={isDrawerOpen} as={Fragment}>
                <Dialog as="div" className="relative z-40" onClose={toggleDrawer}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-in-out duration-500"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in-out duration-500"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-hidden">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                                <Transition.Child
                                    as={Fragment}
                                    enter="transform transition ease-in-out duration-500 sm:duration-700"
                                    enterFrom="translate-x-full"
                                    enterTo="translate-x-0"
                                    leave="transform transition ease-in-out duration-500 sm:duration-700"
                                    leaveFrom="translate-x-0"
                                    leaveTo="translate-x-full"
                                >
                                    <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                                        <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                                            <div className="px-4 py-6 sm:px-6 bg-brand-dark text-white">
                                                <div className="flex items-start justify-between">
                                                    <Dialog.Title className="text-lg font-medium">
                                                        Dosarul Meu ({items.length}/10)
                                                    </Dialog.Title>
                                                    <div className="ml-3 flex h-7 items-center">
                                                        <button
                                                            type="button"
                                                            className="rounded-md bg-brand-dark text-gray-200 hover:text-white focus:outline-none"
                                                            onClick={toggleDrawer}
                                                        >
                                                            <span className="sr-only">Close panel</span>
                                                            <X className="h-6 w-6" aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-yellow-300 bg-yellow-900/30 p-2 rounded border border-yellow-600/50">
                                                    <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                                                    <p>Atenție: Dosarul se golește la părăsirea paginii.</p>
                                                </div>
                                            </div>
                                            <div className="relative mt-6 flex-1 px-4 sm:px-6">
                                                {items.length === 0 ? (
                                                    <div className="text-center text-gray-500 mt-10">
                                                        <p>Nu ai nicio speță în dosar.</p>
                                                        <p className="text-sm mt-2">Adaugă spețe folosind iconița de dosar.</p>
                                                    </div>
                                                ) : (
                                                    <ul className="space-y-4">
                                                        {items.map((item) => (
                                                            <li key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="flex justify-between items-start">
                                                                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 flex-1 pr-2">
                                                                        {item.data.titlu || `Caz #${item.id}`}
                                                                    </h4>
                                                                    <button
                                                                        onClick={() => removeFromDosar(item.id)}
                                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                                        title="Șterge din dosar"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </div>
                                                                <div className="flex justify-between items-center mt-2">
                                                                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                                                        {item.data.materie || 'N/A'}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleViewCase(item)}
                                                                        className="flex items-center text-xs font-medium text-brand-primary hover:text-brand-dark transition-colors"
                                                                    >
                                                                        <Eye size={14} className="mr-1" />
                                                                        Vezi detalii
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>

            {/* Render the detail modal outside the drawer context if needed, or keep it here */}
            {selectedCase && (
                <CaseDetailModal
                    isOpen={isDetailOpen}
                    onClose={handleCloseDetail}
                    result={selectedCase}
                />
            )}
        </>
    );
};

export default DosarDrawer;
