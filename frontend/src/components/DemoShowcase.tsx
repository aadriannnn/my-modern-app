import { useState, useEffect } from 'react';
import { Play, CheckCircle2, Search, Building2, X, Maximize2 } from 'lucide-react';

const DemoShowcase = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [expandedVideo, setExpandedVideo] = useState<'case' | 'company' | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedVideo(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleMouseEnter = (type: 'case' | 'company') => {
    setActiveVideo(type);
  };

  const handleMouseLeave = () => {
    setActiveVideo(null);
  };

  const toggleExpand = (type: 'case' | 'company') => {
    setExpandedVideo(type);
  };

  return (
    <>
      <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Use style for gradient to ensure it applies if tailwind classes fail, but try standard classes first */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 opacity-90"></div>
          {/* Animated Background Blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl mix-blend-overlay animate-pulse" style={{ animationDuration: '4s' }}></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl mix-blend-overlay animate-pulse" style={{ animationDuration: '6s' }}></div>
          </div>

          <div className="relative z-10 p-6 md:p-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                Descoperă Puterea <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">LegalAI</span>
              </h2>
              <p className="text-blue-100 text-lg max-w-2xl mx-auto font-medium">
                Explorează funcționalitățile noastre avansate prin demonstrațiile interactive de mai jos.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Case Search Demo Card */}
              <div
                className="group relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-white/20 hover:bg-white/10 cursor-pointer"
                onMouseEnter={() => handleMouseEnter('case')}
                onMouseLeave={() => handleMouseLeave()}
                onClick={() => toggleExpand('case')}
              >
                <div className="aspect-video relative overflow-hidden bg-gray-900">
                  {/* Use img for webp animation */}
                  <img
                    src="/assets/case_search_demo.webp"
                    alt="Case Search Demo"
                    className="w-full h-full object-cover transition-opacity duration-300 opacity-90 group-hover:opacity-100"
                  />

                  {/* Overlay Play Button (Visual only since it mimics video) */}
                  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${activeVideo === 'case' ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg">
                      <Play fill="currentColor" className="ml-1 w-8 h-8" />
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm border border-white/10">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <div className="flex items-center gap-2 text-white font-bold text-lg shadow-black drop-shadow-md">
                      <div className="p-2 bg-blue-600/80 rounded-lg backdrop-blur-md">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                      Căutare Inteligentă Spețe
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <ul className="space-y-3">
                    {[
                      "Căutare contextuală avansată",
                      "Filtrare automată cu AI",
                      "Rezumat generat instantaneu"
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-white/90 text-sm font-medium">
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Company Search Demo Card */}
              <div
                className="group relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-white/20 hover:bg-white/10 cursor-pointer"
                onMouseEnter={() => handleMouseEnter('company')}
                onMouseLeave={() => handleMouseLeave()}
                onClick={() => toggleExpand('company')}
              >
                <div className="aspect-video relative overflow-hidden bg-gray-900">
                  <img
                    src="/assets/company_search_demo.webp"
                    alt="Company Search Demo"
                    className="w-full h-full object-cover transition-opacity duration-300 opacity-90 group-hover:opacity-100"
                  />

                  {/* Overlay Play Button */}
                  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${activeVideo === 'company' ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg">
                      <Play fill="currentColor" className="ml-1 w-8 h-8" />
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm border border-white/10">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <div className="flex items-center gap-2 text-white font-bold text-lg shadow-black drop-shadow-md">
                      <div className="p-2 bg-purple-600/80 rounded-lg backdrop-blur-md">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      Analiză Companii & Financiar
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <ul className="space-y-3">
                    {[
                      "Date financiare complete",
                      "Indicatori de performanță (EBITDA, ROE)",
                      "Istoric dosare în instanță"
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-white/90 text-sm font-medium">
                        <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Video Modal */}
      {expandedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300 p-4"
          onClick={() => setExpandedVideo(null)}
        >
          <div
            className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} // Prevent click from closing
          >
            <button
              onClick={() => setExpandedVideo(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={expandedVideo === 'case' ? "/assets/case_search_demo.webp" : "/assets/company_search_demo.webp"}
              alt="Demo Expanded"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default DemoShowcase;
