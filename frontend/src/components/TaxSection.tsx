import React from 'react';
import { Coins, Info } from 'lucide-react';

interface TaxSectionProps {
    caseData: {
        taxa_timbru?: string | null;
        [key: string]: any;
    };
}

const TaxSection: React.FC<TaxSectionProps> = ({ caseData }) => {
    const rawValue = caseData.taxa_timbru;

    // Case 1: No Data (undefined or empty string)
    // We exclude 'null' string from here because that signifies 0 tax
    if (rawValue === undefined || rawValue === '') {
        return (
            <div className="space-y-6">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Taxe Judiciare</h2>
                </div>
                <div className="p-8 text-center bg-gray-50 rounded-lg text-gray-500">
                    Nu există informații despre taxele judiciare pentru această speță.
                </div>
            </div>
        );
    }

    // Case 2: Explicit "null" (meaning 0) or valid value
    let displayValue: string = typeof rawValue === 'string' ? rawValue : String(rawValue);
    let isZero = false;

    if (rawValue === 'null' || rawValue === 'NULL' || rawValue === null) {
        displayValue = 'Taxă 0';
        isZero = true;
    }

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">Taxe Judiciare</h2>
            </div>
            <div className={`p-6 rounded-xl border ${isZero ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${isZero ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Coins size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Taxă Judiciară de Timbru
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
            <div className="flex gap-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>
                    Notă: Taxele pot varia în funcție de modificările legislative sau de specificul exact al cererii.
                </p>
            </div>
        </div>
    );
};

export default TaxSection;
