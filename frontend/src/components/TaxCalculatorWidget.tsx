import React, { useState, useEffect } from 'react';
import {
    Calculator, ChevronDown, AlertCircle, CheckCircle, Sparkles, TrendingUp
} from 'lucide-react';

// Interfaces
interface TipCerereTaxaOption {
    id_intern: string;
    nume_standard: string;
    categorie: string;
    articol_referinta?: string;
    evaluabil?: boolean;
    necesita_valoare_obiect?: boolean;
    campuri_necesare?: string[];
}

interface TaxaResult {
    taxa_finala: number;
    detaliere_calcul: string;
}

const TaxCalculatorWidget: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [options, setOptions] = useState<TipCerereTaxaOption[]>([]);
    const [selectedType, setSelectedType] = useState<string>('');
    const [valoareObiect, setValoareObiect] = useState<string>('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [taxaResult, setTaxaResult] = useState<TaxaResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load options from API
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await fetch('/api/tipuri-cereri-taxa');
                if (!res.ok) throw new Error("Nu s-au putut încărca tipurile de cereri");
                const data = await res.json();
                setOptions(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchOptions();
    }, []);

    // Auto-calculate when values change
    useEffect(() => {
        if (selectedType && valoareObiect) {
            calculateTax();
        } else {
            setTaxaResult(null);
        }
    }, [selectedType, valoareObiect]);

    const calculateTax = async () => {
        if (!selectedType || !valoareObiect) return;

        setIsCalculating(true);
        setError(null);

        try {
            const payload = {
                capete_cerere: [{
                    id_intern: selectedType,
                    Valoare_Obiect: parseFloat(valoareObiect)
                }],
                date_generale: {
                    Filtru_Proces_Vechi: false,
                    Aplica_Scutire: false
                }
            };

            const res = await fetch('/api/calculeaza-taxa-timbru', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Eroare la calcul");
            }

            const data = await res.json();
            setTaxaResult(data);
        } catch (err: any) {
            setError(err.message);
            setTaxaResult(null);
        } finally {
            setIsCalculating(false);
        }
    };

    const selectedOption = options.find(o => o.id_intern === selectedType);

    return (
        <div className="space-y-4">
            {/* Widget Header - Collapsible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all duration-200 shadow-sm hover:shadow-md group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform duration-200">
                        <Calculator size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-gray-900">
                            Calculator Taxă de Timbru
                        </h3>
                        <p className="text-xs text-gray-600">
                            {isExpanded ? 'Click pentru a ascunde' : 'Click pentru a calcula taxa pentru această speță'}
                        </p>
                    </div>
                </div>
                <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Widget Content - Expandable */}
            <div
                className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">

                    {/* Info Banner */}
                    <div className="flex gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <Sparkles size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-indigo-900">
                            Calculați rapid taxa judiciară de timbru pentru această speță. Completați câmpurile de mai jos.
                        </p>
                    </div>

                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Tipul Cererii <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow appearance-none bg-white"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="">-- Selectați tipul cererii --</option>
                                {options.map(opt => (
                                    <option key={opt.id_intern} value={opt.id_intern}>
                                        {opt.nume_standard}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                        {selectedOption?.articol_referinta && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <CheckCircle size={12} className="text-green-600" />
                                Ref: {selectedOption.articol_referinta}
                            </p>
                        )}
                    </div>

                    {/* Value Input - Show only for evaluable requests */}
                    {selectedOption?.necesita_valoare_obiect && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Valoarea Obiectului Cererii (RON) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={valoareObiect}
                                    onChange={(e) => setValoareObiect(e.target.value)}
                                    placeholder="Introduceți valoarea în RON"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                    <TrendingUp size={16} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Calculation Result */}
                    {isCalculating && (
                        <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                                <span className="text-sm text-blue-700 font-medium">Se calculează...</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex gap-3 p-4 bg-red-50 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-900">Eroare la calcul</p>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {taxaResult && !isCalculating && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Result Display */}
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                                <p className="text-green-100 text-sm uppercase font-semibold tracking-wider mb-2">
                                    Taxa Judiciară Calculată
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold drop-shadow-md">
                                        {taxaResult.taxa_finala.toLocaleString('ro-RO', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </span>
                                    <span className="text-xl font-normal opacity-90">RON</span>
                                </div>
                            </div>

                            {/* Detailed Calculation */}
                            <details className="group">
                                <summary className="cursor-pointer list-none flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                                    <span className="text-sm font-semibold text-gray-700">
                                        Detaliere Calcul
                                    </span>
                                    <ChevronDown size={16} className="text-gray-500 group-open:rotate-180 transition-transform duration-200" />
                                </summary>
                                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                                        {taxaResult.detaliere_calcul}
                                    </pre>
                                </div>
                            </details>

                            {/* Disclaimer */}
                            <div className="flex gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-800">
                                    <strong>Notă:</strong> Acest calcul este orientativ. Taxa finală poate varia în funcție de specificul exact al cauzei și de eventualele modificări legislative. Consultați legislația în vigoare.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaxCalculatorWidget;
