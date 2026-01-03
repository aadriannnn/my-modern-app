import React from 'react';
// import { Search } from 'lucide-react';

export const LegislativeSearch = () => (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <div className="flex flex-col space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Căutare în legislație</h3>
            <span className="text-xs text-gray-500">Selecteaza codul legislativ</span>
            <input
                type="text"
                placeholder="Caută în toate codurile"
                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            />
            <span className="text-xs text-gray-500">Termen cautare</span>
            <div className="relative">
                <input
                    type="text"
                    placeholder="Introduceti termenul de cautare"
                    className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors">
                Cauta
            </button>
        </div>
    </div>
);

export const JurisprudenceSearch = () => (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <div className="flex flex-col space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Cautare in jurisprudenta</h3>
            <span className="text-xs text-gray-500">Materie</span>
            <input
                type="text"
                placeholder="Toate"
                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            />
            <span className="text-xs text-gray-500">Obiect</span>
            <input
                type="text"
                placeholder="Toate"
                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors">
                Cauta
            </button>
        </div>
    </div>
);

export const AdBanner = ({ imageUrl, linkUrl, altText }: { imageUrl?: string, linkUrl: string, altText: string }) => (
    <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block mb-4">
        <div className="bg-gray-200 h-[200px] flex items-center justify-center rounded-md overflow-hidden">
            {imageUrl ? (
                <img src={imageUrl} alt={altText} className="w-full h-full object-cover" />
            ) : (
                <span className="text-gray-500 text-sm">{altText || "Reclamă"}</span>
            )}
        </div>
    </a>
);

export const TaxaTimbruPromo = () => (
    <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
        <h4 className="text-sm font-semibold text-blue-700 mb-2">Calculator Taxă Timbru</h4>
        <p className="text-xs text-blue-600 mb-3">
            Estimează taxa judiciară de timbru datorată conform OUG 80/2013.
        </p>
        <a href="/taxa-timbru" className="text-sm text-blue-600 font-medium hover:text-blue-800 hover:underline inline-block">
            Accesează Calculatorul →
        </a>
    </div>
);

export const AdSenseAd = ({ fallback }: { fallback?: React.ReactNode }) => (
    <div className="bg-gray-50 p-4 text-center rounded-md border border-dashed border-gray-300">
        {fallback || <span className="text-xs text-gray-400">Reclamă</span>}
    </div>
);
