import React from 'react';
import { Coins, Info } from 'lucide-react';
import TaxCalculatorWidget from './TaxCalculatorWidget';

interface TaxSectionProps {
    caseData: {
        taxa_timbru?: string | null;
        [key: string]: any;
    };
    spetaId?: number;
}

const TaxSection: React.FC<TaxSectionProps> = ({ caseData, spetaId }) => {
    const rawValue = caseData.taxa_timbru;

    // Case 1: No Data (undefined or empty string)
    // We exclude 'null' string from here because that signifies 0 tax
    const hasExistingTaxData = rawValue !== undefined && rawValue !== '';

    let displayValue: string = '';
    let isZero = false;

    if (hasExistingTaxData) {
        displayValue = typeof rawValue === 'string' ? rawValue : String(rawValue);
        if (rawValue === 'null' || rawValue === 'NULL' || rawValue === null) {
            displayValue = 'Taxă 0';
            isZero = true;
        }
    }

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">Taxe Judiciare</h2>
            </div>

            {/* Existing Tax Information from Case */}
            {hasExistingTaxData ? (
                <div className={`p-6 rounded-xl border ${isZero ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${isZero ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Coins size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                Taxă Judiciară de Timbru (din speță)
                            </h3>
                            <p className={`text-2xl font-bold ${isZero ? 'text-green-700' : 'text-blue-700'}`}>
                                {displayValue}
                            </p>
                            <p className="mt-2 text-sm text-gray-600">
                                Această valoare este extrasă din considerentele deciziei sau din legislația aplicabilă.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Coins size={32} className="mx-auto mb-2 text-gray-400 opacity-50" />
                    <p className="text-sm text-gray-500">
                        Nu există informații despre taxele judiciare în considerentele acestei spețe.
                    </p>
                </div>
            )}

            {/* Elegant Separator */}
            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="px-4 bg-gray-50 text-sm font-medium text-gray-500">
                        Calculator pentru această speță
                    </span>
                </div>
            </div>

            {/* Integrated Tax Calculator Widget */}
            <TaxCalculatorWidget
                key={`${caseData?.id || 'new'}-${caseData?.sugestie_llm_taxa?.sugested_id_intern || 'no-tax'}`}
                caseData={caseData}
                spetaId={spetaId}
            />

            {/* General Info Note */}
            <div className="flex gap-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-500 border border-gray-200">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>
                    Notă: Taxele pot varia în funcție de modificările legislative sau de specificul exact al cererii.
                    Calculatorul de mai sus oferă o estimare conform OUG 80/2013.
                </p>
            </div>
        </div>
    );
};

export default TaxSection;
