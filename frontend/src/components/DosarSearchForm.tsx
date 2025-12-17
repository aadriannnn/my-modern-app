import React, { useState } from 'react';

interface DosarSearchFormProps {
    onSearch: (numarDosar: string) => void;
    isLoading: boolean;
}

const DosarSearchForm: React.FC<DosarSearchFormProps> = ({ onSearch, isLoading }) => {
    const [numarDosar, setNumarDosar] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!numarDosar.trim()) {
            setError('Vă rugăm introduceți numărul dosarului');
            return;
        }

        if (numarDosar.trim().length < 3) {
            setError('Numărul dosarului trebuie să aibă minim 3 caractere');
            return;
        }

        setError('');
        onSearch(numarDosar.trim());
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNumarDosar(e.target.value);
        if (error) setError(''); // Clear error on change
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold text-brand-dark mb-3">
                Căutare după număr dosar
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Input Field */}
                <div className="w-full">
                    <input
                        type="text"
                        value={numarDosar}
                        onChange={handleChange}
                        placeholder="Număr dosar (ex: 1234/101/2023)"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand transition-colors text-base ${error ? 'border-red-500' : 'border-gray-300'
                            }`}
                        disabled={isLoading}
                    />
                    {error && (
                        <p className="text-red-500 text-sm mt-1">{error}</p>
                    )}
                </div>

                {/* Search Button - Full Width on Mobile, Auto on Desktop */}
                <button
                    type="submit"
                    disabled={isLoading || !numarDosar.trim()}
                    className="w-full px-6 py-3 bg-brand-accent hover:bg-brand-accent-dark text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            <span>Se caută...</span>
                        </>
                    ) : (
                        <>
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <span>Caută Dosar</span>
                        </>
                    )}
                </button>
            </form>

            <p className="text-xs text-gray-500 mt-2">
                Introduceți numărul dosarului din instanță pentru a găsi spețe similare
            </p>
        </div>
    );
};

export default DosarSearchForm;
