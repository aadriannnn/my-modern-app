import React from 'react';
import { useDosar } from '../context/DosarContext';
import { Transition } from '@headlessui/react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const DosarToast: React.FC = () => {
    const { toast, hideToast } = useDosar();

    if (!toast) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
            <Transition
                show={!!toast}
                enter="transform ease-out duration-300 transition"
                enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
                enterTo="translate-y-0 opacity-100 sm:translate-x-0"
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className={`
          pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5
          ${toast.type === 'success' ? 'border-l-4 border-green-500' : ''}
          ${toast.type === 'error' ? 'border-l-4 border-red-500' : ''}
          ${toast.type === 'info' ? 'border-l-4 border-blue-500' : ''}
        `}>
                    <div className="p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                {toast.type === 'success' && <CheckCircle className="h-6 w-6 text-green-400" aria-hidden="true" />}
                                {toast.type === 'error' && <XCircle className="h-6 w-6 text-red-400" aria-hidden="true" />}
                                {toast.type === 'info' && <Info className="h-6 w-6 text-blue-400" aria-hidden="true" />}
                            </div>
                            <div className="ml-3 w-0 flex-1 pt-0.5">
                                <p className="text-sm font-medium text-gray-900">{toast.message}</p>
                            </div>
                            <div className="ml-4 flex flex-shrink-0">
                                <button
                                    type="button"
                                    className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    onClick={hideToast}
                                >
                                    <span className="sr-only">Close</span>
                                    <X className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    );
};

export default DosarToast;
