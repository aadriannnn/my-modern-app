import React from 'react';
import { Building, MapPin, FileText } from 'lucide-react';
import type { CompanyResult } from '../types';

interface CompanyCardProps {
  company: CompanyResult;
  onViewDetails: () => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onViewDetails }) => {
  const { denumire, cui, adresa, nr_reg_com, stare, caen } = company;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-shadow">
      {/* Company Badge */}
      <div className="flex items-center gap-2 mb-3">
        <Building className="w-5 h-5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
          Companie
        </span>
      </div>

      {/* Company Name */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {denumire}
      </h3>

      {/* Grid Layout for Company Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* CUI */}
        {cui && (
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">CUI</p>
              <p className="text-sm text-gray-900">{cui}</p>
            </div>
          </div>
        )}

        {/* Registry Number */}
        {nr_reg_com && (
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Reg. Com.</p>
              <p className="text-sm text-gray-900">{nr_reg_com}</p>
            </div>
          </div>
        )}

        {/* Address */}
        {adresa && (
          <div className="flex items-start gap-2 md:col-span-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Adresă</p>
              <p className="text-sm text-gray-900">{adresa}</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Badge */}
      {stare && (
        <div className="mb-3">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            stare === 'FUNCTIONEAZA'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {stare}
          </span>
        </div>
      )}

      {/* CAEN Codes */}
      {caen && caen.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Coduri CAEN</p>
          <div className="flex flex-wrap gap-1">
            {caen.slice(0, 3).map((code, idx) => (
              <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                {code}
              </span>
            ))}
            {caen.length > 3 && (
              <span className="text-gray-500 text-xs">+{caen.length - 3} mai mult</span>
            )}
          </div>
        </div>
      )}

      {/* View Details Button */}
      <button
        onClick={onViewDetails}
        className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
      >
        Vizualizare Detalii
      </button>
    </div>
  );
};

export default CompanyCard;
