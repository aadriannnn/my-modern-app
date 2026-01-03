import React from 'react';
import { Search, MapPin, Briefcase } from 'lucide-react';

const JobFilters: React.FC = () => {
    return (
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm h-fit sticky top-4">
            <h3 className="text-lg font-bold text-slate-900 mb-6 font-headings">Filtrează Joburi</h3>

            <div className="space-y-6">
                {/* Search */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cuvinte cheie</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="ex: avocat, litigii"
                            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                        />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Locație</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                        <select className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-600 bg-white">
                            <option>Toate orașele</option>
                            <option>București</option>
                            <option>Cluj-Napoca</option>
                            <option>Iași</option>
                            <option>Timișoara</option>
                        </select>
                    </div>
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tip Job</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Briefcase className="h-4 w-4 text-slate-400" />
                        </div>
                        <select className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-600 bg-white">
                            <option>Toate tipurile</option>
                            <option>Full-time</option>
                            <option>Part-time</option>
                            <option>Colaborare</option>
                            <option>Stagiar</option>
                        </select>
                    </div>
                </div>

                <button className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors">
                    Aplică Filtre
                </button>
            </div>
        </div>
    );
};

export default JobFilters;
