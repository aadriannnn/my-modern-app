import React from 'react';
import {
    Search,
    Brain,
    Scale,
    FileText,
    Trophy,
    ArrowRight,
    ArrowDown
} from 'lucide-react';

const UserJourneyMap: React.FC = () => {
    const steps = [
        {
            id: 1,
            title: "Introducere Situație",
            description: "Descrie situația de fapt în limbaj natural. Sistemul înțelege contextul juridic complex.",
            icon: <Search className="w-6 h-6 text-white" />,
            color: "bg-blue-500",
            details: ["Recunoaștere semantică", "Procesare limbaj natural", "Identificare cuvinte cheie"]
        },
        {
            id: 2,
            title: "Analiză & Identificare",
            description: "AI-ul scanează baza de date pentru a găsi spețe similare și relevante situației tale.",
            icon: <Brain className="w-6 h-6 text-white" />,
            color: "bg-purple-500",
            details: ["Filtrare inteligentă", "Corelare spețe", "Clasificare automată"]
        },
        {
            id: 3,
            title: "Explorare Aprofundată",
            description: "Navighează prin multiple dimensiuni ale cazului pentru o înțelegere completă.",
            icon: <Scale className="w-6 h-6 text-white" />,
            color: "bg-indigo-500",
            details: [
                "Doctrină juridică",
                "Argumente judecător",
                "Elemente individualizare"
            ]
        },
        {
            id: 4,
            title: "Resurse & Modele",
            description: "Acces direct la instrumentele necesare pentru a construi cazul tău.",
            icon: <FileText className="w-6 h-6 text-white" />,
            color: "bg-orange-500",
            details: ["Modele de acte", "Coduri de procedură", "Jurisprudență conexă"]
        },
        {
            id: 5,
            title: "Strategie & Succes",
            description: "Transformă informația în avantaj competitiv. Construiește o strategie câștigătoare.",
            icon: <Trophy className="w-6 h-6 text-white" />,
            color: "bg-green-500",
            details: ["Argumentație solidă", "Predicție rezultate", "Beneficiu final"]
        }
    ];

    return (
        <div className="w-full py-12 px-4 bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-sm border border-gray-100 my-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent mb-4">
                    Drumul către Succesul Juridic
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                    De la o simplă situație de fapt la o strategie completă, pas cu pas.
                </p>
            </div>

            {/* Desktop View - Horizontal Process */}
            <div className="hidden lg:flex justify-between items-start relative max-w-7xl mx-auto">
                {/* Connecting Line */}
                <div className="absolute top-8 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>

                {steps.map((step, index) => (
                    <div key={step.id} className="flex flex-col items-center w-1/5 px-2 relative group">
                        {/* Step Number Badge */}
                        <div className={`w-16 h-16 rounded-2xl ${step.color} shadow-lg flex items-center justify-center mb-6 transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 z-10`}>
                            {step.icon}
                        </div>

                        {/* Content Card */}
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 w-full min-h-[280px] flex flex-col transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-2">
                            <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">{step.title}</h3>
                            <p className="text-gray-600 text-sm text-center mb-4 flex-grow">{step.description}</p>

                            {/* Details List */}
                            <div className="bg-gray-50 rounded-lg p-3 mt-auto">
                                <ul className="space-y-2">
                                    {step.details.map((detail, idx) => (
                                        <li key={idx} className="flex items-start text-xs text-gray-700">
                                            <div className={`w-1.5 h-1.5 rounded-full ${step.color} mt-1 mr-2 flex-shrink-0`}></div>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Arrow for next step (except last) */}
                        {index < steps.length - 1 && (
                            <div className="absolute top-8 -right-4 text-gray-300 z-0">
                                <ArrowRight className="w-8 h-8" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Mobile View - Vertical Timeline */}
            <div className="lg:hidden max-w-md mx-auto space-y-8 relative">
                {/* Vertical Line */}
                <div className="absolute left-8 top-4 bottom-4 w-1 bg-gray-200 -z-10 rounded-full"></div>

                {steps.map((step, index) => (
                    <div key={step.id} className="relative pl-20">
                        {/* Icon Bubble */}
                        <div className={`absolute left-0 top-0 w-16 h-16 rounded-2xl ${step.color} shadow-lg flex items-center justify-center z-10`}>
                            {step.icon}
                        </div>

                        {/* Content Card */}
                        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 transform transition-all duration-300 active:scale-98">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">{step.title}</h3>
                            <p className="text-gray-600 text-sm mb-4">{step.description}</p>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <ul className="space-y-2">
                                    {step.details.map((detail, idx) => (
                                        <li key={idx} className="flex items-center text-xs text-gray-700">
                                            <div className={`w-1.5 h-1.5 rounded-full ${step.color} mr-2`}></div>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Connector Arrow (except last) */}
                        {index < steps.length - 1 && (
                            <div className="absolute left-5 -bottom-6 text-gray-300">
                                <ArrowDown className="w-6 h-6" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserJourneyMap;
