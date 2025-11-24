import React from 'react';
import {
    Search,
    Brain,
    Scale,
    FileText,
    Trophy
} from 'lucide-react';

const UserJourneyMap: React.FC = () => {
    const steps = [
        {
            id: 1,
            title: "Introducere Situație",
            description: "Descrie situația de fapt în limbaj natural. Sistemul înțelege contextul juridic complex.",
            icon: Search,
            gradient: "from-blue-400 via-blue-500 to-blue-600",
            accentColor: "#3b82f6",
            details: ["Recunoaștere semantică", "Procesare limbaj natural", "Identificare cuvinte cheie"]
        },
        {
            id: 2,
            title: "Analiză & Identificare",
            description: "AI-ul scanează baza de date pentru a găsi spețe similare și relevante situației tale.",
            icon: Brain,
            gradient: "from-purple-400 via-purple-500 to-purple-600",
            accentColor: "#a855f7",
            details: ["Filtrare inteligentă", "Corelare spețe", "Clasificare automată"]
        },
        {
            id: 3,
            title: "Explorare Aprofundată",
            description: "Navighează prin multiple dimensiuni ale cazului pentru o înțelegere completă.",
            icon: Scale,
            gradient: "from-indigo-400 via-indigo-500 to-indigo-600",
            accentColor: "#6366f1",
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
            icon: FileText,
            gradient: "from-orange-400 via-orange-500 to-orange-600",
            accentColor: "#f97316",
            details: ["Modele de acte", "Coduri de procedură", "Jurisprudență conexă"]
        },
        {
            id: 5,
            title: "Strategie & Succes",
            description: "Transformă informația în avantaj competitiv. Construiește o strategie câștigătoare.",
            icon: Trophy,
            gradient: "from-green-400 via-green-500 to-green-600",
            accentColor: "#22c55e",
            details: ["Argumentație solidă", "Predicție rezultate", "Beneficiu final"]
        }
    ];

    // SVG curved connector for desktop
    const CurvedConnector = ({ index }: { index: number }) => {
        const yOffset = index % 2 === 0 ? 20 : -20;
        return (
            <svg
                className="absolute top-1/2 left-full w-24 h-24 -ml-12 -mt-12 pointer-events-none hidden xl:block"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={steps[index].accentColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={steps[index + 1].accentColor} stopOpacity="0.3" />
                    </linearGradient>
                </defs>
                <path
                    d={`M 10 50 Q 50 ${50 + yOffset}, 90 50`}
                    stroke={`url(#gradient-${index})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="5,5"
                    className="animate-dash"
                />
                <circle cx="90" cy="50" r="4" fill={steps[index + 1].accentColor} className="animate-pulse" />
            </svg>
        );
    };

    return (
        <>
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(2deg); }
                }
                @keyframes dash {
                    to { stroke-dashoffset: -20; }
                }
                @keyframes draw {
                    from { stroke-dashoffset: 1000; }
                    to { stroke-dashoffset: 0; }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-dash {
                    animation: dash 20s linear infinite;
                }
                .sketch-border {
                    position: relative;
                }
                .sketch-border::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: inherit;
                    padding: 2px;
                    background: linear-gradient(135deg, currentColor, transparent);
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    opacity: 0.5;
                }
            `}</style>

            <div className="w-full py-8 md:py-16 px-3 md:px-6 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                    <div className="absolute top-10 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '0s' }}></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute -bottom-10 left-1/3 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
                </div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8 md:mb-16">
                        <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-brand-accent/10 to-purple-500/10 rounded-full border-2 border-dashed border-brand-accent/30">
                            <span className="text-sm md:text-base font-semibold text-brand-accent uppercase tracking-wide">Călătoria ta juridică</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 relative inline-block">
                            <span className="bg-gradient-to-r from-gray-800 via-brand-primary to-brand-accent bg-clip-text text-transparent">
                                De la Situație la Strategie
                            </span>
                            <svg className="absolute -bottom-2 left-0 w-full h-3 md:h-4" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                                <path d="M2 8 Q75 2, 150 6 T298 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-brand-accent opacity-40" />
                            </svg>
                        </h2>
                        <p className="text-gray-600 max-w-3xl mx-auto text-base md:text-xl mt-6 leading-relaxed">
                            De la o simplă situație de fapt la o strategie completă, pas cu pas.
                        </p>
                    </div>

                    {/* Desktop View - Horizontal Organic Flow */}
                    <div className="hidden xl:block max-w-7xl mx-auto px-2">
                        <div className="flex justify-center items-center gap-2 relative">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isEven = index % 2 === 0;
                                return (
                                    <div key={step.id} className="relative" style={{ flex: '0 0 19.5%' }}>
                                        {/* Organic Card with Hand-drawn Feel */}
                                        <div
                                            className={`relative group ${isEven ? 'mt-0' : 'mt-16'}`}
                                            style={{
                                                animation: `float ${6 + index * 0.5}s ease-in-out infinite`,
                                                animationDelay: `${index * 0.3}s`
                                            }}
                                        >
                                            {/* Icon Area - Can overflow */}
                                            <div className="relative">
                                                {/* Floating Icon */}
                                                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${step.gradient} rounded-[40%_60%_50%_50%/60%_40%_60%_40%] shadow-2xl flex items-center justify-center transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 z-20`}>
                                                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-lg" strokeWidth={2.5} />
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} rounded-[40%_60%_50%_50%/60%_40%_60%_40%] opacity-50 blur-md`}></div>
                                                </div>

                                                {/* Step Number */}
                                                <div className="absolute -top-3 right-0 w-10 h-10 bg-white rounded-full shadow-lg border-2 flex items-center justify-center font-bold text-lg z-20"
                                                    style={{ borderColor: step.accentColor, color: step.accentColor }}
                                                >
                                                    {step.id}
                                                </div>
                                            </div>

                                            {/* Content Area - With overflow hidden */}
                                            <div className="relative bg-white/80 backdrop-blur-sm rounded-[2.5rem] p-5 pt-12 shadow-xl border-2 border-gray-200/50 sketch-border transform transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:rotate-1 overflow-hidden"
                                                style={{
                                                    borderRadius: `${40 + index * 3}% ${60 - index * 3}% ${50 + index * 2}% ${50 - index * 2}% / ${60 - index * 2}% ${40 + index * 3}% ${60 - index * 3}% ${40 + index * 2}%`
                                                }}
                                            >
                                                {/* Content */}
                                                <div className="min-h-[280px] flex flex-col">
                                                    <h3 className="text-lg font-extrabold text-gray-800 mb-3 text-center leading-tight break-words"
                                                        style={{ color: step.accentColor }}
                                                    >
                                                        {step.title}
                                                    </h3>
                                                    <p className="text-gray-600 text-xs text-center mb-3 flex-grow leading-relaxed break-words">
                                                        {step.description}
                                                    </p>

                                                    {/* Details with organic bullets */}
                                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3 border border-gray-100 shadow-inner">
                                                        <ul className="space-y-2">
                                                            {step.details.map((detail, idx) => (
                                                                <li key={idx} className="flex items-start text-xs text-gray-700 leading-snug">
                                                                    <div
                                                                        className="w-1.5 h-1.5 rounded-full mt-1 mr-2 flex-shrink-0 shadow-sm"
                                                                        style={{
                                                                            background: `linear-gradient(135deg, ${step.accentColor}, ${step.accentColor}dd)`,
                                                                        }}
                                                                    ></div>
                                                                    <span className="font-medium break-words">{detail}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Curved Connector */}
                                        {index < steps.length - 1 && <CurvedConnector index={index} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tablet View - 2 Column Grid */}
                    <div className="hidden md:block xl:hidden max-w-5xl mx-auto px-4">
                        <div className="grid grid-cols-2 gap-8 relative">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                return (
                                    <div
                                        key={step.id}
                                        className="relative group"
                                        style={{
                                            animation: `float ${6 + index * 0.5}s ease-in-out infinite`,
                                            animationDelay: `${index * 0.2}s`
                                        }}
                                    >
                                        {/* Icon Area - Can overflow */}
                                        <div className="relative">
                                            {/* Icon */}
                                            <div className={`absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br ${step.gradient} rounded-[45%_55%_50%_50%/55%_45%_55%_45%] shadow-xl flex items-center justify-center transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 z-20`}>
                                                <Icon className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={2.5} />
                                            </div>

                                            {/* Step Number */}
                                            <div className="absolute -top-3 right-0 w-10 h-10 bg-white rounded-full shadow-lg border-2 flex items-center justify-center font-bold text-lg z-20"
                                                style={{ borderColor: step.accentColor, color: step.accentColor }}
                                            >
                                                {step.id}
                                            </div>
                                        </div>

                                        {/* Content Area - With overflow hidden */}
                                        <div className="relative bg-white/90 backdrop-blur-sm rounded-[2rem] p-6 pt-10 shadow-xl border-2 border-gray-200/50 transform transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden"
                                            style={{
                                                borderRadius: `${35 + index * 2}% ${65 - index * 2}% ${50 + index}% ${50 - index}% / ${60 - index}% ${40 + index * 2}% ${55 - index}% ${45 + index}%`
                                            }}
                                        >
                                            {/* Content */}
                                            <div>
                                                <h3 className="text-xl font-extrabold mb-3 leading-tight break-words"
                                                    style={{ color: step.accentColor }}
                                                >
                                                    {step.title}
                                                </h3>
                                                <p className="text-gray-600 text-sm mb-4 leading-relaxed break-words">
                                                    {step.description}
                                                </p>

                                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100 shadow-inner">
                                                    <ul className="space-y-2">
                                                        {step.details.map((detail, idx) => (
                                                            <li key={idx} className="flex items-start text-xs text-gray-700">
                                                                <div
                                                                    className="w-2 h-2 rounded-full mt-1 mr-2 flex-shrink-0"
                                                                    style={{ backgroundColor: step.accentColor }}
                                                                ></div>
                                                                <span className="font-medium">{detail}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mobile View - Vertical Organic Cards */}
                    <div className="md:hidden max-w-sm mx-auto space-y-6 px-2">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <div
                                    key={step.id}
                                    className="relative"
                                    style={{
                                        animation: `float ${6 + index * 0.5}s ease-in-out infinite`,
                                        animationDelay: `${index * 0.2}s`
                                    }}
                                >
                                    {/* Icon Area - Can overflow */}
                                    <div className="relative">
                                        {/* Icon */}
                                        <div className={`absolute -top-6 left-4 w-14 h-14 bg-gradient-to-br ${step.gradient} rounded-[40%_60%_50%_50%/60%_40%_60%_40%] shadow-xl flex items-center justify-center z-20`}>
                                            <Icon className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2.5} />
                                        </div>

                                        {/* Step Number */}
                                        <div className="absolute -top-3 -right-2 w-9 h-9 bg-white rounded-full shadow-lg border-2 flex items-center justify-center font-bold z-20"
                                            style={{ borderColor: step.accentColor, color: step.accentColor }}
                                        >
                                            {step.id}
                                        </div>
                                    </div>

                                    {/* Content Area - With overflow hidden */}
                                    <div className="relative bg-white/95 backdrop-blur-sm rounded-[2rem] p-5 pt-10 shadow-lg border-2 border-gray-200/50 transform transition-all duration-300 active:scale-95 overflow-hidden"
                                        style={{
                                            borderRadius: `${40 + index * 3}% ${60 - index * 3}% ${55 + index * 2}% ${45 - index * 2}% / ${50 - index * 2}% ${50 + index * 3}% ${60 - index * 2}% ${40 + index * 2}%`
                                        }}
                                    >
                                        {/* Content */}
                                        <div>
                                            <h3 className="text-lg font-extrabold mb-2 leading-tight pr-8 break-words"
                                                style={{ color: step.accentColor }}
                                            >
                                                {step.title}
                                            </h3>
                                            <p className="text-gray-600 text-sm mb-4 leading-relaxed break-words">
                                                {step.description}
                                            </p>

                                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 shadow-inner">
                                                <ul className="space-y-2">
                                                    {step.details.map((detail, idx) => (
                                                        <li key={idx} className="flex items-start text-xs text-gray-700">
                                                            <div
                                                                className="w-1.5 h-1.5 rounded-full mt-1 mr-2 flex-shrink-0"
                                                                style={{ backgroundColor: step.accentColor }}
                                                            ></div>
                                                            <span className="font-medium">{detail}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Organic connector line */}
                                    {index < steps.length - 1 && (
                                        <div className="flex justify-center py-2">
                                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="opacity-40">
                                                <path
                                                    d="M20 5 Q 25 20, 20 35"
                                                    stroke={step.accentColor}
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeDasharray="4,4"
                                                />
                                                <circle cx="20" cy="35" r="3" fill={steps[index + 1].accentColor} className="animate-pulse" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserJourneyMap;
