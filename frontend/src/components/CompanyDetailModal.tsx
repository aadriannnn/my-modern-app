import React from 'react';
import { X, Building2, MapPin, Activity, TrendingUp, Users, Globe, Phone, Mail } from 'lucide-react';
import type { CompanyResult } from '../types';

interface CompanyDetailModalProps {
    isOpen: boolean;
    company: CompanyResult | null;
    onClose: () => void;
}

const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({ isOpen, company, onClose }) => {
    if (!isOpen || !company) return null;

    const data = company.data;
    const stareColor = company.stare?.toLowerCase().includes('activ') || company.stare?.toLowerCase().includes('functioneaza')
        ? 'text-green-600'
        : 'text-red-600';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100">
                    <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{company.denumire}</h2>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="px-3 py-1 bg-gray-100 rounded-full font-mono text-gray-700">
                                    CUI: {company.cui}
                                </span>
                                <span className={`px-3 py-1 rounded-full font-semibold ${stareColor.includes('green') ? 'bg-green-100' : 'bg-red-100'
                                    } ${stareColor}`}>
                                    {company.stare || 'Status necunoscut'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Detalii de Identificare */}
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-600" />
                                Detalii de Identificare
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoItem label="Denumire" value={data.DENUMIRE} />
                                <InfoItem label="CUI" value={data.CUI} />
                                <InfoItem label="Nr. Reg. Com." value={data.COD_INMATRICULARE} />
                                <InfoItem label="EUID" value={data.EUID} />
                                <InfoItem label="Forma Juridică" value={data.FORMA_JURIDICA} />
                                <InfoItem label="Data Înmatriculare" value={data.DATA_INMATRICULARE} />
                            </div>
                        </section>

                        {/* Adresa */}
                        {company.adresa && (
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                    Adresă
                                </h3>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-900">{company.adresa}</p>
                                </div>
                            </section>
                        )}

                        {/* Contact */}
                        {(data.WEB || data.EMAIL || data.TELEFON) && (
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-blue-600" />
                                    Contact
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {data.WEB && (
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-gray-400" />
                                            <a href={data.WEB} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {data.WEB}
                                            </a>
                                        </div>
                                    )}
                                    {data.EMAIL && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <a href={`mailto:${data.EMAIL}`} className="text-blue-600 hover:underline">
                                                {data.EMAIL}
                                            </a>
                                        </div>
                                    )}
                                    {data.TELEFON && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-900">{data.TELEFON}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Activități CAEN Detaliate */}
                        {data.activitati_caen && Array.isArray(data.activitati_caen) && data.activitati_caen.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-blue-600" />
                                    Domenii de Activitate (CAEN)
                                </h3>
                                <div className="space-y-3">
                                    {data.activitati_caen.map((caen: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold font-mono w-fit">
                                                    {caen.cod_caen || caen.cod || caen.code}
                                                </span>
                                                {caen.versiune && (
                                                    <span className="text-xs text-gray-500">
                                                        Rev. {caen.versiune}
                                                    </span>
                                                )}
                                            </div>
                                            {caen.descriere && (
                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                    {caen.descriere}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Reprezentanți */}
                        {data.reprezentanti && Array.isArray(data.reprezentanti) && data.reprezentanti.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    Reprezentanți
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {data.reprezentanti.map((rep: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="font-semibold text-gray-900">{rep.nume || rep.NUME || 'Necunoscut'}</p>
                                            {rep.functie && <p className="text-sm text-gray-600 mt-1">{rep.functie}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Date Financiare */}
                        {data.date_financiare_2024 && (
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Date Financiare 2024
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FinancialCard
                                        label="Cifra de Afaceri Netă"
                                        value={data.date_financiare_2024.cifra_de_afaceri_neta}
                                        color="blue"
                                    />
                                    <FinancialCard
                                        label="Profit Net"
                                        value={data.date_financiare_2024.profit_net}
                                        color="green"
                                    />
                                    <FinancialCard
                                        label="Profit Brut"
                                        value={data.date_financiare_2024.profit_brut}
                                        color="green"
                                    />
                                    <FinancialCard
                                        label="Active Circulante"
                                        value={data.date_financiare_2024.active_circulante_total_din_care}
                                        color="purple"
                                    />
                                    <FinancialCard
                                        label="Active Imobilizate"
                                        value={data.date_financiare_2024.active_imobilizate_total}
                                        color="purple"
                                    />
                                    <FinancialCard
                                        label="Datorii"
                                        value={data.date_financiare_2024.datorii}
                                        color="red"
                                    />
                                    <FinancialCard
                                        label="Venituri Totale"
                                        value={data.date_financiare_2024.venituri_totale}
                                        color="blue"
                                    />
                                    <FinancialCard
                                        label="Cheltuieli Totale"
                                        value={data.date_financiare_2024.cheltuieli_totale}
                                        color="red"
                                    />
                                    {data.date_financiare_2024.numar_mediu_de_salariati !== null && data.date_financiare_2024.numar_mediu_de_salariati !== undefined && (
                                        <div className="p-4 rounded-xl border bg-indigo-50 border-indigo-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users className="w-4 h-4 text-indigo-600" />
                                                <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 opacity-75">
                                                    Număr Mediu Salariați
                                                </p>
                                            </div>
                                            <p className="text-2xl font-bold text-indigo-700">
                                                {data.date_financiare_2024.numar_mediu_de_salariati}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Components
const InfoItem: React.FC<{ label: string; value: any }> = ({ label, value }) => {
    if (!value) return null;

    return (
        <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</dt>
            <dd className="text-sm text-gray-900 font-medium">{value}</dd>
        </div>
    );
};

const FinancialCard: React.FC<{ label: string; value: any; color: string }> = ({ label, value, color }) => {
    if (!value && value !== 0) return null;

    const colorClasses = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    }[color] || 'bg-gray-50 text-gray-700 border-gray-100';

    const formattedValue = typeof value === 'number'
        ? new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(value)
        : value;

    return (
        <div className={`p-4 rounded-xl border ${colorClasses}`}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-75">{label}</p>
            <p className="text-lg font-bold">{formattedValue}</p>
        </div>
    );
};

export default CompanyDetailModal;
