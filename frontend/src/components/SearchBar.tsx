
import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, Sparkles, FileText, ArrowLeft, Send, Building2, CheckCircle2 } from 'lucide-react';
import ValidationModal from './ValidationModal';

interface SearchBarProps {
    variant?: 'hero' | 'compact';
    value: string;
    onChange: (value: string) => void;
    onSearch: () => void;
    onDosarSearch?: (numar: string) => void;
    isLoading?: boolean;
    onExampleClick?: () => void;
    placeholder?: string;
    className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    variant = 'hero',
    value,
    onChange,
    onSearch,
    onDosarSearch,
    isLoading = false,
    onExampleClick,
    placeholder = "Descrie situația ta juridică sau introdu un număr de dosar...",
    className = ''
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mobileInputRef = useRef<HTMLTextAreaElement>(null);
    const [isDosar, setIsDosar] = useState(false);
    const [isCompany, setIsCompany] = useState(false);
    const [isMobileFocused, setIsMobileFocused] = useState(false);

    // Validation State
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [viewportHeight, setViewportHeight] = useState('100%');

    // Handle Mobile Viewport Resize (Keyboard Show/Hide)
    useEffect(() => {
        if (!isMobileFocused) return;

        const handleResize = () => {
            if (window.visualViewport) {
                setViewportHeight(`${window.visualViewport.height}px`);
                // Scroll to top to ensure we see the start
                window.scrollTo(0, 0);
            }
        };

        if (window.visualViewport) {
            handleResize();
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
        };
    }, [isMobileFocused]);

    // Auto-resize textarea (Desktop/Standard)
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto'; // Reset

        const maxHeight = variant === 'hero' ? 200 : 100;
        const minHeight = variant === 'hero' ? 80 : 44;

        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${Math.max(newHeight, minHeight)}px`;
    }, [value, variant]);

    // Detect Dosar Number and Company
    useEffect(() => {
        const trimmedValue = value.trim();

        // Dosar check
        const dosarRegex = /(\d{1,6}\/\d{1,4}\/\d{4}(?:\/[a-zA-Z0-9\.-]+)?)/;
        setIsDosar(dosarRegex.test(trimmedValue));

        // Company check
        const cuiRegex = /\b(ro)?\s*\d{2,10}\b/i;
        const companyTypeRegex = /\b(s\.?r\.?l\.?|s\.?a\.?|i\.?i\.?|p\.?f\.?a\.?|c\.?n\.?|regia autonoma)\b/i;
        setIsCompany(cuiRegex.test(trimmedValue) || companyTypeRegex.test(trimmedValue));
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Allow Enter to create new line. Submit only on Ctrl + Enter.
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSearchAction();
        }
    };

    const handleSearchAction = () => {
        if (isLoading) return;

        const trimmedValue = value.trim();
        if (!trimmedValue) return;

        // 1. Dosar Identity Check (Existing)
        const dosarRegex = /(\d{1,6}\/\d{1,4}\/\d{4}(?:\/[a-zA-Z0-9\.-]+)?)/;
        if (dosarRegex.test(trimmedValue)) {
            if (onDosarSearch) {
                const match = trimmedValue.match(dosarRegex);
                if (match) {
                    onDosarSearch(match[0]);
                    setIsMobileFocused(false);
                    document.body.style.overflow = '';
                    return;
                }
            }
            onSearch();
            setIsMobileFocused(false);
            document.body.style.overflow = '';
            return;
        }

        // 2. Company Identity Check
        const cuiRegex = /\b(ro)?\s*\d{2,10}\b/i;
        const companyTypeRegex = /\b(s\.?r\.?l\.?|s\.?a\.?|i\.?i\.?|p\.?f\.?a\.?|c\.?n\.?|regia autonoma)\b/i;
        const isComp = cuiRegex.test(trimmedValue) || companyTypeRegex.test(trimmedValue);

        if (isComp) {
            onSearch();
            setIsMobileFocused(false);
            document.body.style.overflow = '';
            return;
        }

        // 3. Speta (Natural Language) Check
        // Must be >= 200 chars
        if (trimmedValue.length < 200) {
            setShowValidationModal(true);
            return;
        }

        // 4. Valid Speta -> Proceed
        onSearch();
        setIsMobileFocused(false);
        document.body.style.overflow = '';
    };

    const handleFocus = () => {
        // Trigger only on mobile screens
        if (window.innerWidth < 768) {
            setIsMobileFocused(true);
            // Small delay to allow portal to mount before focusing
            setTimeout(() => {
                if (mobileInputRef.current) {
                    mobileInputRef.current.focus();
                    // Move cursor to end
                    const len = mobileInputRef.current.value.length;
                    mobileInputRef.current.setSelectionRange(len, len);
                }
            }, 50);
            document.body.style.overflow = 'hidden';
        }
    };

    const handleExitFocus = () => {
        setIsMobileFocused(false);
        document.body.style.overflow = '';
    };

    const isHero = variant === 'hero';
    const currentLength = value.trim().length;
    const showCounter = !isDosar && !isCompany && currentLength > 0;
    const isMinLengthMet = currentLength >= 200;

    const CharacterCounter = ({ isMobile = false }) => {
        if (!showCounter) return null;

        return (
            <div className={`
                flex items-center justify-between gap-4 text-xs font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-2
                ${isMobile ? 'mb-3 px-1' : 'pt-3 border-t border-slate-100 mt-2'}
                ${isMinLengthMet ? 'text-green-600' : 'text-amber-600'}
            `}>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {isMinLengthMet ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                            <div className="relative flex items-center justify-center w-4 h-4">
                                <div className="absolute w-full h-full rounded-full border-2 border-red-100"></div>
                                <div
                                    className="absolute w-full h-full rounded-full border-2 border-red-500 transition-all duration-500"
                                    style={{
                                        clipPath: `inset(${Math.max(0, 100 - (currentLength / 200) * 100)}% 0 0 0)`
                                    }}
                                ></div>
                            </div>
                        )}
                        <span>
                            {isMinLengthMet
                                ? "Lungime adecvată"
                                : `${200 - currentLength} caractere necesare`
                            }
                        </span>
                    </div>

                    {!isMinLengthMet && (
                        <span className="text-slate-400 hidden sm:inline border-l border-slate-300 pl-2">
                            necesar pentru situații juridice
                        </span>
                    )}
                </div>

                {/* Desktop Only: Examples Label */}

            </div>
        );
    };

    return (
        <>
            <div className={`relative w-full transition-all duration-300 ${className} ${showValidationModal ? 'opacity-0 invisible pointer-events-none' : ''}`}>
                <div className={`
                    relative flex flex-col transition-all duration-300
                    ${isHero
                        ? 'p-4 bg-white rounded-3xl shadow-soft hover:shadow-lg border border-slate-100 focus-within:ring-4 focus-within:ring-brand-accent/10 focus-within:border-brand-accent/30'
                        : 'bg-white rounded-xl shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-brand-accent/20'
                    }
                `}>

                    {/* Header / Examples for Hero */}
                    {isHero && onExampleClick && (
                        <div className="absolute -top-10 right-0 flex justify-end">
                            <button
                                onClick={onExampleClick}
                                className="text-xs font-semibold text-brand-secondary hover:text-brand-accent flex items-center gap-1.5 bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/50 hover:bg-white transition-all shadow-subtle hover:shadow-md group"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                                Încearcă un exemplu
                            </button>
                        </div>
                    )}

                    <div className="flex items-start gap-2 relative">
                        <div className={`${isHero ? 'pt-4 pl-4' : 'pt-2.5 pl-3'} `}>
                            {isLoading ? (
                                <Loader2 className={`animate-spin text-brand-accent ${isHero ? 'w-6 h-6' : 'w-5 h-5'} `} />
                            ) : isDosar ? (
                                <FileText className={`text-blue-500 ${isHero ? 'w-6 h-6' : 'w-5 h-5'} `} />
                            ) : isCompany ? (
                                <Building2 className={`text-purple-500 ${isHero ? 'w-6 h-6' : 'w-5 h-5'} `} />
                            ) : (
                                <Search className={`text-slate-400 ${isHero ? 'w-6 h-6' : 'w-5 h-5'} `} />
                            )}
                        </div>

                        <div className="flex-1">
                            <textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={handleFocus}
                                placeholder={placeholder}
                                className={`
                                    w-full bg-transparent border-0 focus:ring-0 text-brand-dark placeholder-slate-400 resize-none px-0
                                    ${isHero ? 'text-lg pb-3.5 pt-1 min-h-[80px]' : 'text-sm pb-2.5 pt-1 min-h-[44px]'}
                                `}
                                rows={1}
                            />
                        </div>

                        {/* Action Button (Desktop/Initial View) */}
                        <div className={`${isHero ? 'pt-2 pr-2' : 'pt-1 pr-1'}`}>
                            <button
                                onClick={handleSearchAction}
                                disabled={isLoading || !value.trim()}
                                className={`
                                    flex items-center justify-center transition-all duration-200
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    ${isHero
                                        ? 'bg-brand-dark hover:bg-slate-800 text-white rounded-2xl w-12 h-12 shadow-md hover:scale-105 active:scale-95'
                                        : 'text-brand-secondary hover:text-brand-accent p-2 rounded-lg hover:bg-slate-50'
                                    }
                                `}
                            >
                                {isHero ? (
                                    <Search className="w-5 h-5" />
                                ) : (
                                    <span className="text-xs font-semibold">Caută</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Helper text for Dosar */}
                    {isHero && isDosar && (
                        <div className="absolute -bottom-7 left-4 text-xs font-medium text-blue-600 flex items-center gap-1 animate-fade-in">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Număr dosar detectat
                        </div>
                    )}

                    {/* Helper text for Company */}
                    {isHero && isCompany && (
                        <div className="absolute -bottom-7 left-4 text-xs font-medium text-purple-600 flex items-center gap-1 animate-fade-in">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                            Companie identificată
                        </div>
                    )}

                    {/* Character Counter (Desktop) */}
                    {isHero && <CharacterCounter />}
                </div>
            </div >

            {/* Mobile Focus Overlay Portal */}
            {
                isMobileFocused && createPortal(
                    <div
                        className="fixed left-0 right-0 z-[9999] bg-white flex flex-col pt-4 px-4 pb-2 animate-in fade-in duration-200 shadow-2xl"
                        style={{
                            top: 0,
                            height: viewportHeight,
                            overscrollBehavior: 'none'
                        }}
                    >
                        {/* Mobile Exit Header */}
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 flex-none bg-white">
                            <button onClick={handleExitFocus} className="text-brand-text font-medium flex items-center gap-1 p-2 -ml-2">
                                <ArrowLeft size={20} />
                            </button>
                            <span className="text-sm font-semibold text-gray-500">
                                {isDosar ? 'Căutare Dosar' : isCompany ? 'Căutare Firmă' : 'Descrie Speța'}
                            </span>
                            <div className="w-8"></div>
                        </div>

                        <div className="flex-1 flex flex-col relative min-h-0 bg-white">
                            <textarea
                                ref={mobileInputRef}
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                className="w-full h-full p-2 text-lg bg-transparent border-0 focus:ring-0 text-brand-dark placeholder-slate-400 resize-none flex-1"
                                style={{ minHeight: '100px' }}
                            />

                            {/* Mobile Footer: Counter + Send Button */}
                            <div className="flex-none pb-4 pt-2 bg-white sticky bottom-0">
                                <CharacterCounter isMobile={true} />
                                <button
                                    onClick={handleSearchAction}
                                    disabled={isLoading || !value.trim()}
                                    className="w-full bg-brand-accent text-white py-3 rounded-xl shadow-lg hover:bg-brand-accent-dark text-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    Trimite
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
            {/* Validation Modal */}
            <ValidationModal
                isOpen={showValidationModal}
                onClose={() => setShowValidationModal(false)}
                currentInputLength={value.trim().length}
            />
        </>
    );
};
