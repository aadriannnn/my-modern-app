import React, { createContext, useContext, ReactNode } from 'react';
import { useColorMode, ColorMode } from '@chakra-ui/react';

interface SectionThemeContextType {
    themeName: string;
    colorMode: ColorMode;
}

const SectionThemeContext = createContext<SectionThemeContextType | undefined>(undefined);

export const SectionThemeProvider = ({ children, themeName = 'default' }: { children: ReactNode, themeName?: string }) => {
    const { colorMode } = useColorMode();

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
        console.warn('useSectionTheme must be used within a SectionThemeProvider. Falling back to a default theme object.');
        return { themeName: 'default', colorMode: 'light' as ColorMode };
    }
    return context;
};
