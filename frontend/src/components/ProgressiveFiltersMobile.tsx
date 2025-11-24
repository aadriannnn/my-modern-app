import React, { useState, useEffect } from 'react';
import type { Filters, SelectedFilters, FilterItem } from '../types';
import { X, ChevronLeft, ChevronRight, Check, Search, Filter } from 'lucide-react';
import { getCurrentStep } from '../lib/filterHelpers';

interface ProgressiveFiltersMobileProps {
    filters: Filters | null;
    selectedFilters: SelectedFilters;
    onFilterChange: (filterType: keyof SelectedFilters, value: any) => void;
    isOpen: boolean;
    onClose: () => void;
    onApply: () => void;
}

const ProgressiveFiltersMobile: React.FC<ProgressiveFiltersMobileProps> = ({
    filters,
    selectedFilters,
    onFilterChange,
    isOpen,
    onClose,
    onApply,
}) => {
    const { materii = [], obiecte = [], details = {}, tipSpeta = [], parte = [] } = filters ?? {};
    const [searchTerm, setSearchTerm] = useState('');
    // Local state to track the *viewing* step, separate from the *logical* step derived from filters
    const [viewStep, setViewStep] = useState<'materie' | 'obiect' | 'detalii'>('materie');

    // Sync view step with logical step when opening or when filters change externally
    useEffect(() => {
        if (isOpen) {
            if (!selectedFilters.materie) {
                setViewStep('materie');
            } else if (selectedFilters.obiect.length === 0) {
                setViewStep('obiect');
            } else {
                setViewStep('detalii');
            }
        }
    }, [isOpen, selectedFilters.materie, selectedFilters.obiect.length]);

    const availableObiecte = selectedFilters.materie ? details[selectedFilters.materie] ?? [] : obiecte;

    const handleCheckboxChange = (filterType: 'obiect' | 'tip_speta' | 'parte', value: string) => {
        const currentValues = selectedFilters[filterType] as string[];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
        onFilterChange(filterType, newValues);
    };

    const handleMaterieSelect = (materie: string) => {
        if (selectedFilters.materie === materie) {
            // If clicking same materie, just go to next step
            setViewStep('obiect');
        } else {
            // New materie selected
            onFilterChange('materie', materie);
            onFilterChange('obiect', []);
            onFilterChange('tip_speta', []);
            onFilterChange('parte', []);
            setViewStep('obiect'); // Auto-advance
        }
    };

    const handleBack = () => {
        if (viewStep === 'detalii') {
            setViewStep('obiect');
        } else if (viewStep === 'obiect') {
            setViewStep('materie');
        }
    };

    const handleNext = () => {
        if (viewStep === 'materie' && selectedFilters.materie) {
            setViewStep('obiect');
        } else if (viewStep === 'obiect') {
            setViewStep('detalii');
        }
    };

    if (!isOpen) return null;

    const filteredObiecte = availableObiecte.filter((item: FilterItem | string) => {
        const name = typeof item === 'string' ? item : item.name;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <aside className="fixed top-0 left-0 h-full bg-gray-50 w-full shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        {viewStep !== 'materie' && (
                            <button onClick={handleBack} className="p-1 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <h3 className="text-lg font-bold text-brand-text">
                            {viewStep === 'materie' && 'Alege Materia'}
                            {viewStep === 'obiect' && 'Alege Obiectul'}
                            {viewStep === 'detalii' && 'Filtrează Detalii'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="bg-white px-4 pt-2 pb-4">
                    <div className="flex items-center gap-2">
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${viewStep === 'materie' || viewStep === 'obiect' || viewStep === 'detalii' ? 'bg-brand-primary' : 'bg-gray-200'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${viewStep === 'obiect' || viewStep === 'detalii' ? 'bg-brand-primary' : 'bg-gray-200'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${viewStep === 'detalii' ? 'bg-brand-primary' : 'bg-gray-200'}`} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-400 font-medium">
                        <span className={viewStep === 'materie' ? 'text-brand-primary' : ''}>Materie</span>
                        <span className={viewStep === 'obiect' ? 'text-brand-primary' : ''}>Obiect</span>
                        <span className={viewStep === 'detalii' ? 'text-brand-primary' : ''}>Detalii</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                    {/* STEP 1: MATERIE */}
                    {viewStep === 'materie' && (
                        <div className="grid grid-cols-1 gap-3">
                            {materii.map((materie) => (
                                <button
                                    key={materie.name}
                                    onClick={() => handleMaterieSelect(materie.name)}
                                    className={`relative flex items-center p-4 rounded-xl border-2 transition-all ${selectedFilters.materie === materie.name
                                            ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                                            : 'border-transparent bg-white shadow-sm hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${selectedFilters.materie === materie.name ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        <Filter size={20} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className={`font-bold text-lg ${selectedFilters.materie === materie.name ? 'text-brand-primary' : 'text-brand-text'}`}>
                                            {materie.name}
                                        </div>
                                        <div className="text-sm text-gray-500">{materie.count} spețe</div>
                                    </div>
                                    {selectedFilters.materie === materie.name && (
                                        <div className="absolute top-4 right-4 text-brand-primary">
                                            <Check size={24} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: OBIECT */}
                    {viewStep === 'obiect' && (
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-sm text-gray-500 mb-1">Materie selectată</div>
                                <div className="font-bold text-brand-text text-lg flex items-center gap-2">
                                    {selectedFilters.materie}
                                    <Check size={18} className="text-brand-primary" />
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Caută obiect..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                />
                            </div>

                            <div className="space-y-2 pb-20">
                                {filteredObiecte.map((item: FilterItem | string, index: number) => {
                                    const obiect = typeof item === 'string' ? { name: item, count: null } : item;
                                    const isSelected = selectedFilters.obiect.includes(obiect.name);

                                    return (
                                        <label
                                            key={`${obiect.name}-${index}`}
                                            className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                                    ? 'bg-brand-primary/5 border-brand-primary shadow-sm'
                                                    : 'bg-white border-transparent shadow-sm'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-brand-primary border-brand-primary' : 'border-gray-300 bg-white'
                                                }`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleCheckboxChange('obiect', obiect.name)}
                                                className="hidden"
                                            />
                                            <span className={`flex-1 font-medium ${isSelected ? 'text-brand-primary' : 'text-brand-text'}`}>
                                                {obiect.name}
                                            </span>
                                            {obiect.count !== null && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                                    {obiect.count}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DETALII */}
                    {viewStep === 'detalii' && (
                        <div className="space-y-6 pb-20">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-sm text-gray-500 mb-1">Selecție curentă</div>
                                <div className="font-bold text-brand-text">
                                    {selectedFilters.materie}
                                </div>
                                <div className="text-sm text-brand-text-secondary mt-1">
                                    {selectedFilters.obiect.length} obiecte selectate
                                </div>
                            </div>

                            {/* Tip Speta */}
                            <div>
                                <h4 className="font-bold text-brand-text mb-3 uppercase text-sm tracking-wider">Tip Speță</h4>
                                <div className="space-y-2">
                                    {tipSpeta.map((tip, index) => {
                                        const isSelected = selectedFilters.tip_speta.includes(tip);
                                        return (
                                            <label
                                                key={`${tip}-${index}`}
                                                className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                                        ? 'bg-brand-accent/5 border-brand-accent shadow-sm'
                                                        : 'bg-white border-transparent shadow-sm'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-brand-accent border-brand-accent' : 'border-gray-300 bg-white'
                                                    }`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleCheckboxChange('tip_speta', tip)}
                                                    className="hidden"
                                                />
                                                <span className={`flex-1 font-medium ${isSelected ? 'text-brand-accent' : 'text-brand-text'}`}>
                                                    {tip}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Parte */}
                            <div>
                                <h4 className="font-bold text-brand-text mb-3 uppercase text-sm tracking-wider">Parte</h4>
                                <div className="space-y-2">
                                    {parte.map((p, index) => {
                                        const isSelected = selectedFilters.parte.includes(p);
                                        return (
                                            <label
                                                key={`${p}-${index}`}
                                                className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                                        ? 'bg-brand-accent/5 border-brand-accent shadow-sm'
                                                        : 'bg-white border-transparent shadow-sm'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-brand-accent border-brand-accent' : 'border-gray-300 bg-white'
                                                    }`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleCheckboxChange('parte', p)}
                                                    className="hidden"
                                                />
                                                <span className={`flex-1 font-medium ${isSelected ? 'text-brand-accent' : 'text-brand-text'}`}>
                                                    {p}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex gap-3">
                        {viewStep === 'obiect' && (
                            <button
                                onClick={handleNext}
                                className="flex-1 bg-brand-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Continuă la Detalii
                                <ChevronRight size={20} />
                            </button>
                        )}

                        {(viewStep === 'detalii' || (viewStep === 'obiect' && selectedFilters.obiect.length > 0)) && (
                            <button
                                onClick={onApply}
                                className="flex-1 bg-brand-text text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Afișează Rezultate
                                <Check size={20} />
                            </button>
                        )}

                        {viewStep === 'materie' && !selectedFilters.materie && (
                            <div className="w-full text-center text-gray-400 text-sm py-2">
                                Selectează o materie pentru a începe
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default ProgressiveFiltersMobile;
