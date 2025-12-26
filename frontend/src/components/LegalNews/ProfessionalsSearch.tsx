import React from 'react';
import { Search, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProfessionalsSearch: React.FC = () => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-10 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex-grow w-full md:w-auto relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                    placeholder="Caută profesionist..."
                />
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-center md:justify-end">
                <div className="flex items-center gap-4 text-sm text-slate-500 hidden lg:flex">
                    <span className="cursor-pointer hover:text-slate-800 transition-colors">Speakers Invitați</span>
                    <span className="cursor-pointer hover:text-slate-800 transition-colors">Premium</span>
                </div>

                <Link
                    to="/register-professional"
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    Înscrie-te
                </Link>
            </div>
        </div>
    );
};

export default ProfessionalsSearch;
