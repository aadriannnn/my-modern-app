import React from 'react';
import { Network, MapPin, Briefcase } from 'lucide-react';

interface CompetenceSectionProps {
    caseData: {
        competenta_teritoriala?: string;
        competenta_materiala?: string;
        competenta_functionala?: string;
        [key: string]: any;
    };
}

const CompetenceSection: React.FC<CompetenceSectionProps> = ({ caseData }) => {
    // Helper to render a card
    const renderCard = (title: string, content: string | undefined, icon: React.ReactNode) => {
        if (!content || content === 'null') return null;
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3 text-brand-dark">
                    {icon}
                    <h3 className="font-semibold text-lg">{title}</h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                    {content}
                </p>
            </div>
        );
    };

    return (
        <div className="space-y-4">
             {/* Header Section */}
             <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Competența Instanțelor</h2>
                <p className="text-gray-500">Detalii privind instanțele competente în această speță.</p>
            </div>
            {renderCard("Competență Teritorială", caseData.competenta_teritoriala, <MapPin className="text-brand-accent" size={20} />)}
            {renderCard("Competență Materială", caseData.competenta_materiala, <Briefcase className="text-brand-accent" size={20} />)}
            {renderCard("Competență Funcțională", caseData.competenta_functionala, <Network className="text-brand-accent" size={20} />)}

            {/* Fallback if no data exists */}
            {(!caseData.competenta_teritoriala && !caseData.competenta_materiala && !caseData.competenta_functionala) && (
                 <div className="p-8 text-center bg-gray-50 rounded-lg text-gray-500">
                    Nu există informații despre competență pentru această speță.
                 </div>
            )}
        </div>
    );
};

export default CompetenceSection;
