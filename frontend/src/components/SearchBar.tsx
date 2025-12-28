import React, { useRef, useEffect, useState } from 'react';
import { Search, Loader2, Sparkles, FileText, ArrowLeft } from 'lucide-react';

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
    const [isDosar, setIsDosar] = useState(false);
    const [isMobileFocused, setIsMobileFocused] = useState(false);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto'; // Reset

        let maxHeight = variant === 'hero' ? 200 : 100;
        let minHeight = variant === 'hero' ? 80 : 44;

        if (isMobileFocused) {
            maxHeight = 400; // Allow more height in focused mode
            minHeight = 150;
        }

        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${Math.max(newHeight, minHeight)}px`;
    }, [value, variant, isMobileFocused]);

    // Detect Dosar Number
    useEffect(() => {
        const dosarRegex = /(\d{1,6}\/\d{1,4}\/\d{4}(?:\/[a-zA-Z0-9\.-]+)?)/;
        setIsDosar(dosarRegex.test(value));
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

        if (isDosar && onDosarSearch) {
            const dosarRegex = /(\d{1,6}\/\d{1,4}\/\d{4}(?:\/[a-zA-Z0-9\.-]+)?)/;
            const match = value.match(dosarRegex);
            if (match) {
                onDosarSearch(match[0]);
                setIsMobileFocused(false);
                return;
            }
        }
        onSearch();
        setIsMobileFocused(false);
    };

    const handleFocus = () => {
        if (window.innerWidth < 768) {
            setIsMobileFocused(true);
            // Prevent body scroll when focused
            document.body.style.overflow = 'hidden';
        }
    };

    const handleExitFocus = () => {
        setIsMobileFocused(false);
        document.body.style.overflow = '';
    };

    const isHero = variant === 'hero';

    // Mobile Overlay Container Styles
    const containerClasses = isMobileFocused
        ? 'fixed inset-0 z-[100] bg-white flex flex-col p-4 animate-in fade-in duration-200'
        : `relative w-full transition-all duration-300 ${className}`;

    const innerClasses = isMobileFocused
        ? 'flex-1 flex flex-col relative' // Full height in overlay
        : `relative flex flex-col transition-all duration-300 ${isHero
            ? 'p-2 bg-white rounded-3xl shadow-soft hover:shadow-lg border border-slate-100 focus-within:ring-4 focus-within:ring-brand-accent/10 focus-within:border-brand-accent/30'
            : 'bg-white rounded-xl shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-brand-accent/20'
        }`;

    return (
        <div className={containerClasses}>

            {/* Mobile Exit Header */}
            {isMobileFocused && (
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                    <button onClick={handleExitFocus} className="text-brand-text font-medium flex items-center gap-1">
                        <ArrowLeft size={18} /> Înapoi
                    </button>
                    <span className="text-sm font-semibold text-gray-400">Introduceți textul</span>
                </div>
            )}

            <div className={innerClasses}>

                {/* Header / Examples for Hero (Only show if not in mobile focus mode to avoid clutter) */}
                {isHero && onExampleClick && !isMobileFocused && (
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

                <div className={`flex items-start gap-2 relative ${isMobileFocused ? 'flex-1 flex-col' : ''}`}>
                    {/* Icon - Hide in mobile focus mode to maximize space */}
                    {!isMobileFocused && (
                        <div className={`${isHero ? 'pt-4 pl-4' : 'pt-2.5 pl-3'}`}>
                            {isLoading ? (
                                <Loader2 className={`animate-spin text-brand-accent ${isHero ? 'w-6 h-6' : 'w-5 h-5'}`} />
                            ) : isDosar ? (
                                <FileText className={`text-blue-500 ${isHero ? 'w-6 h-6' : 'w-5 h-5'}`} />
                            ) : (
                                <Search className={`text-slate-400 ${isHero ? 'w-6 h-6' : 'w-5 h-5'}`} />
                            )}
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                        placeholder={placeholder}
                        className={`
                            w-full bg-transparent border-0 focus:ring-0 text-brand-dark placeholder-slate-400 resize-none
                            ${isHero && !isMobileFocused ? 'text-lg py-3.5 min-h-[80px]' : ''}
                            ${!isHero && !isMobileFocused ? 'text-sm py-2.5 min-h-[44px]' : ''}
                            ${isMobileFocused ? 'text-lg h-full p-2 min-h-[50vh]' : ''}
                        `}
                        rows={1}
                        autoFocus={isMobileFocused}
                    />

                    {/* Action Button */}
                    <div className={`${isMobileFocused ? 'w-full mt-auto pt-4' : (isHero ? 'pt-2 pr-2' : 'pt-1 pr-1')}`}>
                        <button
                            onClick={handleSearchAction}
                            disabled={isLoading || !value.trim()}
                            className={`
                                flex items-center justify-center transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${isMobileFocused
                                    ? 'w-full bg-brand-accent text-white py-3 rounded-xl shadow-lg hover:bg-brand-accent-dark text-lg font-bold'
                                    : (isHero
                                        ? 'bg-brand-dark hover:bg-slate-800 text-white rounded-2xl w-12 h-12 shadow-md hover:scale-105 active:scale-95'
                                        : 'text-brand-secondary hover:text-brand-accent p-2 rounded-lg hover:bg-slate-50'
                                    )
                                }
                            `}
                        >
                            {isMobileFocused ? (
                                <>
                                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
                                    Caută acum
                                </>
                            ) : (
                                isHero ? <Search className="w-5 h-5" /> : <span className="text-xs font-semibold">Caută</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Helper text for Dosar */}
                {isHero && isDosar && !isMobileFocused && (
                    <div className="absolute -bottom-7 left-4 text-xs font-medium text-blue-600 flex items-center gap-1 animate-fade-in">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        Număr dosar detectat
                    </div>
                )}
            </div>
        </div>
    );
};
