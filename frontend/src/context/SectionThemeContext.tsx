import { createContext, useContext, type ReactNode, useState, useEffect } from 'react';

// Simple hook to detect/manage dark mode if not using a specific library
// For Tailwind, usually we check 'dark' class on html/body or use media query
const useTailwindColorMode = () => {
    // This is a simplified version. In a real app we might read from localStorage or system pref
    // and sync with the 'dark' class on the document element.
    // For now assuming the app handles this globally or we just read the standard way.

    // Placeholder for actual implementation if needed, or just return defaults
    // Since we removed Chakra, we don't have its context.
    // We'll mimic the interface for now to avoid breaking other files if they depend on it heavily.

    const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setColorMode(isDark ? 'dark' : 'light');

        // Optional: Listen for class changes on html element if dynamic switching happens outside React
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isDark = document.documentElement.classList.contains('dark');
                    setColorMode(isDark ? 'dark' : 'light');
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    return { colorMode };
};

interface SectionThemeContextType {
    themeName: string;
    colorMode: 'light' | 'dark';
}

const SectionThemeContext = createContext<SectionThemeContextType | undefined>(undefined);

export const SectionThemeProvider = ({ children, themeName = 'default' }: { children: ReactNode, themeName?: string }) => {
    const { colorMode } = useTailwindColorMode();

    const value = {
        themeName,
        colorMode,
    };

    return (
        <SectionThemeContext.Provider value={value}>
            {children}
        </SectionThemeContext.Provider>
    );
};

export const useSectionTheme = () => {
    const context = useContext(SectionThemeContext);
    if (context === undefined) {
        // Fallback
        return { themeName: 'default', colorMode: 'light' as 'light' | 'dark' };
    }
    return context;
};
