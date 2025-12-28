import React, { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, Transition } from '@headlessui/react';
import { AlertCircle, X, CheckCircle2, ShieldAlert, Scale, Building2 } from 'lucide-react';

interface ValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentInputLength: number;
}

const ValidationModal: React.FC<ValidationModalProps> = ({ isOpen, onClose, currentInputLength }) => {
    return createPortal(
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-[100000]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000]" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto z-[100001]">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-red-100">

                                {/* Header */}
                                <div className="bg-red-50 p-6 flex items-start gap-4 border-b border-red-100">
                                    <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                                        <ShieldAlert className="w-8 h-8 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 leading-tight">
                                            Căutare incompletă
                                        </Dialog.Title>
                                        <p className="mt-2 text-sm text-red-800 font-medium">
                                            Textul introdus are doar <span className="font-bold underline">{currentInputLength} caractere</span> din minimul de 200 necesare pentru o analiză juridică.
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-600 hover:bg-red-100/50 p-2 rounded-full transition-colors -mr-2 -mt-2"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-6">
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        Pentru a primi rezultate relevante, sistemul are nevoie să identifice corect tipul căutării. Asigură-te că respecți unul din formatele de mai jos:
                                    </p>

                                    <div className="space-y-4">
                                        {/* Option 1: Companies */}
                                        <div className="flex gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:bg-blue-50 transition-colors">
                                            <div className="mt-1">
                                                <Building2 className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm mb-1">Căutare Societate</h4>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    Introdu <span className="font-semibold text-blue-700">CUI</span> sau <span className="font-semibold text-blue-700">Denumirea completă</span> însoțită obligatoriu de forma de organizare.
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-800 font-mono">VERDICT LINE S.R.L.</span>
                                                    <span className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-800 font-mono">12345678</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Option 2: Case Files */}
                                        <div className="flex gap-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100 hover:bg-purple-50 transition-colors">
                                            <div className="mt-1">
                                                <Scale className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm mb-1">Dosar Instanță</h4>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    Caută direct după numărul unic de dosar asignat de instanțele judecătorești.
                                                </p>
                                                <span className="px-2 py-1 bg-white border border-purple-200 rounded text-xs text-purple-800 font-mono">36895/302/2025</span>
                                            </div>
                                        </div>

                                        {/* Option 3: Natural Language (The failing one) */}
                                        <div className="flex gap-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-50 transition-colors ring-2 ring-emerald-500/20">
                                            <div className="mt-1">
                                                <AlertCircle className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm mb-1">Analiză Speță (Limbaj Natural)</h4>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    Descrie problema ta în detaliu. AI-ul are nevoie de context pentru a identifica soluții.
                                                </p>
                                                <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-100/50 px-3 py-1.5 rounded-lg w-fit">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Minim 200 caractere necesare
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="bg-gray-50 p-6 flex justify-end">
                                    <button
                                        type="button"
                                        className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl active:scale-95"
                                        onClick={onClose}
                                    >
                                        Am înțeles, completez detaliile
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>,
        document.body
    );
};

export default ValidationModal;
