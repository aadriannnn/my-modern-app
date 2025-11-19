import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface CaseData {
    id: number | string;
    data: Record<string, any>;
}

interface ToastMessage {
    message: string;
    type: 'success' | 'error' | 'info';
}

interface DosarContextType {
    items: CaseData[];
    addToDosar: (item: CaseData) => void;
    removeFromDosar: (id: number | string) => void;
    isCaseInDosar: (id: number | string) => boolean;
    isDrawerOpen: boolean;
    toggleDrawer: () => void;
    toast: ToastMessage | null;
    hideToast: () => void;
}

const DosarContext = createContext<DosarContextType | undefined>(undefined);

export const useDosar = () => {
    const context = useContext(DosarContext);
    if (!context) {
        throw new Error('useDosar must be used within a DosarProvider');
    }
    return context;
};

interface DosarProviderProps {
    children: ReactNode;
}

export const DosarProvider: React.FC<DosarProviderProps> = ({ children }) => {
    const [items, setItems] = useState<CaseData[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    // Load from sessionStorage on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('dosar_items');
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse dosar items', e);
            }
        }
    }, []);

    // Save to sessionStorage whenever items change
    useEffect(() => {
        sessionStorage.setItem('dosar_items', JSON.stringify(items));
    }, [items]);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const hideToast = () => setToast(null);

    const addToDosar = (item: CaseData) => {
        if (items.some((i) => i.id === item.id)) {
            showToast('Această speță este deja în dosar.', 'info');
            return;
        }

        if (items.length >= 10) {
            showToast('Dosarul este plin (maxim 10 spețe).', 'error');
            return;
        }

        setItems((prev) => [...prev, item]);
        showToast('Speță adăugată la dosar.', 'success');
    };

    const removeFromDosar = (id: number | string) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast('Speță ștearsă din dosar.', 'info');
    };

    const isCaseInDosar = (id: number | string) => {
        return items.some((i) => i.id === id);
    };

    const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

    return (
        <DosarContext.Provider
            value={{
                items,
                addToDosar,
                removeFromDosar,
                isCaseInDosar,
                isDrawerOpen,
                toggleDrawer,
                toast,
                hideToast,
            }}
        >
            {children}
        </DosarContext.Provider>
    );
};
