// import React from 'react';
import { Phone, Handshake } from 'lucide-react';

const bannerItems = [
    { text: 'Call center cu suport specializat', icon: Phone },
    { text: 'Program Dezvoltat în Parteneriat cu ICI București - Institutul Național de Cercetare-Dezvoltare în Informatică', icon: Handshake },
    { text: 'Call center cu suport specializat', icon: Phone },
    { text: 'Program Dezvoltat în Parteneriat cu ICI București - Institutul Național de Cercetare-Dezvoltare în Informatică', icon: Handshake },
    { text: 'Call center cu suport specializat', icon: Phone },
    { text: 'Program Dezvoltat în Parteneriat cu ICI București - Institutul Național de Cercetare-Dezvoltare în Informatică', icon: Handshake },
];

const ScrollingBannerCSS = () => {
    return (
        <div className="bg-gray-50 py-2 overflow-hidden border-b border-gray-200 group">
            <div className="relative flex overflow-x-hidden">
                <div className="animate-marquee whitespace-nowrap flex items-center gap-0 group-hover:[animation-play-state:paused]">
                    {/* First Loop */}
                    <div className="flex items-center">
                        {bannerItems.map((item, index) => (
                            <div key={`item-1-${index}`} className="flex items-center px-5 md:px-8 py-1 h-full">
                                <div className="flex items-center gap-2">
                                    <item.icon className="h-[1.1em] w-[1.1em] text-blue-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {item.text}
                                    </span>
                                </div>
                                {index < bannerItems.length - 1 && (
                                    <span className="mx-5 md:mx-8 text-gray-300 text-lg hidden md:inline">|</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Second Loop for Seamless Effect */}
                    <div className="flex items-center">
                        {bannerItems.map((item, index) => (
                            <div key={`item-2-${index}`} className="flex items-center px-5 md:px-8 py-1 h-full">
                                <div className="flex items-center gap-2">
                                    <item.icon className="h-[1.1em] w-[1.1em] text-blue-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {item.text}
                                    </span>
                                </div>
                                {index < bannerItems.length - 1 && (
                                    <span className="mx-5 md:mx-8 text-gray-300 text-lg hidden md:inline">|</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 55s linear infinite;
                }
             `}</style>
        </div>
    );
};

export default ScrollingBannerCSS;
