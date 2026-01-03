
import React, { useState, useEffect } from 'react';
import {
    Calculator, Plus, Trash2, ChevronDown,
    AlertCircle, CheckCircle, Info, Sparkles, Receipt
} from 'lucide-react';


// Interfaces mirroring backend schemas
interface TipCerereTaxaOption {
    id_intern: string;
    nume_standard: string;
    categorie: string;
    articol_referinta?: string;
    evaluabil?: boolean;
    necesita_valoare_obiect?: boolean;
    campuri_necesare?: string[];
}

interface CapatCerereInput {
    // Unique ID for frontend list management
    uniqueId: number;

    id_intern: string | null;
    Valoare_Obiect?: number;
    Valoare_Bun_Imobil?: number;
    Numar_Coproprietari_Mostenitori?: number;
    Tip_Divort?: string;
    Este_Contestatie_Executare_Pe_Fond?: boolean;
    Valoare_Bunuri_Contestate_Executare?: number;
    Valoare_Debit_Urmarit_Executare?: number;
    Numar_Pagini?: number;
    Numar_Exemplare?: number;
    Numar_Inscrise_Supralegalizare?: number;
    Numar_Participanti_Recuzati?: number;
    Contine_Transfer_Imobiliar?: boolean;
    Contine_Partaj?: boolean;
    Numar_Motive_Revizuire?: number;
    Numar_Motive_Anulare_Arbitraj?: number;
    Este_Nava_Aeronava?: boolean;
    Este_Ordonanta_UE_Indisponibilizare?: boolean;
    Valoare_Creanta_Creditor?: number;
    Valoare_Afectata_Prin_Act_Fraudulos?: number;
    Valoare_Obiect_Subiacent?: number;
    Este_Evaluabil?: boolean;
    Este_Cale_Atac_Doar_Considerente?: boolean;
    Motive_Recurs_Invocate?: string[];
    Valoare_Contestata_Recurs?: number;

    // Frontend specific
    llmSuggestionUserOverride?: boolean;
}

interface DateGeneraleInput {
    Filtru_Proces_Vechi: boolean;
    Aplica_Scutire: boolean;
    Temei_Scutire_Selectat?: string;
    Taxa_Achitata_Prima_Instanta?: number;
    Stadiu_Procesual?: string;
}

interface TaxaResult {
    taxa_finala: number;
    detaliere_calcul: string;
}

interface LLMSuggestionInfo {
    sugested_id_intern?: string;
    sugested_nume_standard?: string;
    original_input_obiect?: string;
    llm_raw_suggestion?: string;
    error_message?: string;
}

// ---------------------------------------------------------------------------
// Helper: Get Required Fields based on ID
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Component: CapatCerereCalculator
// ---------------------------------------------------------------------------
interface CapatCerereCalculatorProps {
    index: number;
    data: CapatCerereInput;
    updateData: (index: number, field: string, value: any) => void;
    removeCapat: (index: number) => void;
    options: TipCerereTaxaOption[];
    llmSuggestionId?: string | null;
}

const CapatCerereCalculator: React.FC<CapatCerereCalculatorProps> = ({
    index, data, updateData, removeCapat, options, llmSuggestionId
}) => {

    const selectedOption = options.find(o => o.id_intern === data.id_intern);

    // Effect: Apply LLM Suggestion if applicable
    useEffect(() => {
        if (index === 0 && llmSuggestionId && llmSuggestionId !== "NEDETERMINAT" && !data.id_intern && !data.llmSuggestionUserOverride) {
            updateData(index, 'id_intern', llmSuggestionId);
        }
    }, [llmSuggestionId, index, data.id_intern, data.llmSuggestionUserOverride, updateData]);

    const handleChange = (field: string, value: any) => {
        updateData(index, field, value);
        if (field === 'id_intern') {
            updateData(index, 'llmSuggestionUserOverride', true);
        }
    };

    const isLLMApplied = index === 0 && Boolean(llmSuggestionId) && data.id_intern === llmSuggestionId && !data.llmSuggestionUserOverride;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm relative transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="bg-brand-primary/10 text-brand-primary w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">
                        {index + 1}
                    </span>
                    Capăt de Cerere {index + 1}
                </h4>
                {index > 0 && (
                    <button
                        onClick={() => removeCapat(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Elimină capăt de cerere"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {/* Tip Cerere Select */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tipul Cererii
                    </label>
                    <div className="relative">
                        <select
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-shadow appearance-none bg-white ${isLLMApplied ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-300'}`}
                            value={data.id_intern || ""}
                            onChange={(e) => handleChange("id_intern", e.target.value)}
                        >
                            <option value="">-- Selectați tipul cererii --</option>
                            {options.map(opt => (
                                <option key={opt.id_intern} value={opt.id_intern}>
                                    {opt.nume_standard}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                    {isLLMApplied && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center">
                            <Sparkles size={12} className="mr-1" /> Sugestie AI aplicată
                        </p>
                    )}
                    {selectedOption?.articol_referinta && (
                        <p className="text-xs text-gray-500 mt-1">Ref: {selectedOption.articol_referinta}</p>
                    )}
                </div>

                {/* Dynamic Inputs based on selection */}
                {selectedOption?.campuri_necesare && selectedOption.campuri_necesare.map(field => {
                    const isNumeric = field.toLowerCase().includes('valoare') || field.startsWith('Numar_');
                    const isBoolean = field.startsWith('Este_') || field.startsWith('Contine_');
                    const label = field.replace(/_/g, ' ');

                    return (
                        <div key={field} className="animate-in fade-in slide-in-from-top-1 duration-300">
                            <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                                {label} <span className="text-red-500">*</span>
                            </label>
                            {isBoolean ? (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-4 w-4"
                                        checked={!!data[field as keyof CapatCerereInput]}
                                        onChange={(e) => handleChange(field, e.target.checked)}
                                    />
                                    <span className="text-sm text-gray-600">Da</span>
                                </div>
                            ) : (
                                <input
                                    type={isNumeric ? "number" : "text"}
                                    min={isNumeric ? "0" : undefined}
                                    step={field.toLowerCase().includes('valoare') ? "0.01" : "1"}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                                    value={(data[field as keyof CapatCerereInput] as string | number) || ""}
                                    onChange={(e) => handleChange(field, isNumeric ? parseFloat(e.target.value) : e.target.value)}
                                    placeholder={isNumeric ? "0.00" : ""}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
const TaxaTimbruPage: React.FC = () => {
    const [options, setOptions] = useState<TipCerereTaxaOption[]>([]);

    // Form State
    const [capeteCerere, setCapeteCerere] = useState<CapatCerereInput[]>([
        { uniqueId: Date.now(), id_intern: null }
    ]);
    const [dateGenerale, setDateGenerale] = useState<DateGeneraleInput>({
        Filtru_Proces_Vechi: false,
        Aplica_Scutire: false
    });

    // Calculation State
    const [isCalculating, setIsCalculating] = useState(false);
    const [taxaResult, setTaxaResult] = useState<TaxaResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // LLM State
    const [obiectDosar, setObiectDosar] = useState("");
    const [isAnalyzingLLM, setIsAnalyzingLLM] = useState(false);
    const [llmSuggestion, setLlmSuggestion] = useState<LLMSuggestionInfo | null>(null);

    // Load Options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await fetch('/api/tipuri-cereri-taxa');
                if (!res.ok) throw new Error("Failed to load options");
                const data = await res.json();
                setOptions(data);
            } catch (err) {
                console.error(err);
                setError("Nu s-au putut încărca tipurile de cereri.");
            }
        };
        fetchOptions();
    }, []);

    // Handlers
    const addCapat = () => {
        setCapeteCerere(prev => [...prev, { uniqueId: Date.now(), id_intern: null }]);
    };

    const removeCapat = (index: number) => {
        setCapeteCerere(prev => prev.filter((_, i) => i !== index));
    };

    const updateCapat = (index: number, field: string, value: any) => {
        setCapeteCerere(prev => prev.map((capat, i) => {
            if (i === index) {
                return { ...capat, [field]: value };
            }
            return capat;
        }));
    };

    const calculateTax = async () => {
        setIsCalculating(true);
        setError(null);
        setTaxaResult(null);
        try {
            // Clean payload
            const payload = {
                capete_cerere: capeteCerere.map(({ uniqueId, llmSuggestionUserOverride, ...rest }) => rest),
                date_generale: dateGenerale
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
        } finally {
            setIsCalculating(false);
        }
    };

    const getLLMSuggestion = async () => {
        if (!obiectDosar || obiectDosar.length < 3) return;
        setIsAnalyzingLLM(true);
        setLlmSuggestion(null);
        try {
            const res = await fetch('/api/sugereaza-incadrare-obiect-llm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ obiect_dosar: obiectDosar })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Eroare la sugestie AI");
            }
            const data = await res.json();
            setLlmSuggestion(data);
        } catch (err: any) {
            setError("Eroare LLM: " + err.message);
        } finally {
            setIsAnalyzingLLM(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-light p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-brand-primary flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Receipt className="mr-3 text-brand-primary" size={28} />
                            Calculator Taxă de Timbru
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Calcul estimatoriu conform OUG 80/2013.
                        </p>
                    </div>
                </div>

                {/* AI Helper Section */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl shadow-sm p-6 border border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-3 flex items-center">
                        <Sparkles size={16} className="mr-2 text-indigo-600" />
                        Asistent AI pentru Încadrare
                    </h3>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            className="flex-1 border border-indigo-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                            placeholder="Descrieți pe scurt obiectul dosarului (ex: acțiune de divort cu partaj)..."
                            value={obiectDosar}
                            onChange={(e) => setObiectDosar(e.target.value)}
                        />
                        <button
                            onClick={getLLMSuggestion}
                            disabled={isAnalyzingLLM || !obiectDosar}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isAnalyzingLLM ? 'Analizez...' : 'Sugerează Încadrarea'}
                        </button>
                    </div>

                    {llmSuggestion && (
                        <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-3 ${llmSuggestion.error_message ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-800 border border-green-100'}`}>
                            {llmSuggestion.error_message ? (
                                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                            ) : (
                                <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                {llmSuggestion.error_message ? llmSuggestion.error_message : (
                                    <>
                                        <span className="font-semibold block mb-1">Sugestie acceptată:</span>
                                        Sistemul sugerează categoria: <strong>{llmSuggestion.sugested_nume_standard || llmSuggestion.sugested_id_intern}</strong> based on "{llmSuggestion.original_input_obiect}".
                                        <p className="text-xs text-green-600 mt-1">Această opțiune a fost aplicată automat la primul capăt de cerere (dacă nu era deja setat).</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Form */}
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left Column: Form Inputs */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Capete Cerere List */}
                        <div>
                            {capeteCerere.map((capat, index) => (
                                <CapatCerereCalculator
                                    key={capat.uniqueId}
                                    index={index}
                                    data={capat}
                                    updateData={updateCapat}
                                    removeCapat={removeCapat}
                                    options={options}
                                    llmSuggestionId={llmSuggestion?.sugested_id_intern}
                                />
                            ))}

                            <button
                                onClick={addCapat}
                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 transition-all flex items-center justify-center gap-2"
                            >
                                <PlusCircle size={18} />
                                Adaugă Capăt de Cerere
                            </button>
                        </div>

                        {/* General Settings */}
                        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                                <Info size={18} className="mr-2 text-gray-400" />
                                Date Generale
                            </h3>
                            <div className="space-y-3">
                                <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                        checked={dateGenerale.Filtru_Proces_Vechi}
                                        onChange={(e) => setDateGenerale({ ...dateGenerale, Filtru_Proces_Vechi: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-700">Proces început înainte de OUG 80/2013 (Legea 146/1997)</span>
                                </label>

                                <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                        checked={dateGenerale.Aplica_Scutire}
                                        onChange={(e) => setDateGenerale({ ...dateGenerale, Aplica_Scutire: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-700">Cererea este scutită legal de taxă</span>
                                </label>

                                {dateGenerale.Aplica_Scutire && (
                                    <div className="ml-8">
                                        <input
                                            type="text"
                                            placeholder="Temei legal (ex: Art. 29 OUG 80/2013)"
                                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                                            value={dateGenerale.Temei_Scutire_Selectat || ""}
                                            onChange={(e) => setDateGenerale({ ...dateGenerale, Temei_Scutire_Selectat: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Calculate Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={calculateTax}
                                disabled={isCalculating || capeteCerere.length === 0}
                                className="bg-brand-primary hover:bg-brand-secondary text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-brand-primary/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:shadow-none bg-gradient-to-r from-blue-600 to-blue-700"
                            >
                                {isCalculating ? "Se calculează..." : "Calculează Taxa"}
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Eroare</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Results sticky */}
                    <div className="md:col-span-1">
                        <div className="sticky top-6">
                            {taxaResult ? (
                                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-green-600 p-4 text-white text-center">
                                        <p className="text-green-100 text-sm uppercase font-semibold tracking-wider mb-1">Total de plată</p>
                                        <div className="text-4xl font-bold drop-shadow-sm">
                                            {taxaResult.taxa_finala.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <span className="text-xl ml-1 font-normal opacity-80">RON</span>
                                        </div>
                                    </div>
                                    <div className="p-4 max-h-[60vh] overflow-y-auto bg-gray-50 custom-scrollbar">
                                        <h4 className="font-semibold text-gray-700 mb-2 text-sm">Detaliere Calcul:</h4>
                                        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed p-2 bg-white rounded border border-gray-200">
                                            {taxaResult.detaliere_calcul}
                                        </pre>
                                    </div>
                                    <div className="p-3 bg-gray-100/50 border-t border-gray-100 text-center">
                                        <button
                                            onClick={() => setTaxaResult(null)}
                                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                                        >
                                            Resetează rezultat
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 border-dashed">
                                    <Calculator size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Rezultatul calculului va apărea aici.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple wrapper for PlusCircle icon used in JSX
const PlusCircle = ({ size = 24, className = "" }) => (
    <div className={className}>
        <Plus size={size} />
    </div>
);

export default TaxaTimbruPage;
