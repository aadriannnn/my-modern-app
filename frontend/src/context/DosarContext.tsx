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
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
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

import { useAuth } from './AuthContext';
import { getDosarItems, addDosarItem, removeDosarItem } from '../lib/api';

export const DosarProvider: React.FC<DosarProviderProps> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const [items, setItems] = useState<CaseData[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    // Initial Load - Authenticated vs Local
    useEffect(() => {
        const loadItems = async () => {
            if (isAuthenticated) {
                try {
                    const savedItems = await getDosarItems();
                    // Map backend response to CaseData format
                    // Format from backend: { id, case_id, case_data }
                    const formattedItems = savedItems.map((item: any) => ({
                        id: item.case_id,
                        data: item.case_data
                    }));
                    setItems(formattedItems);
                } catch (e) {
                    console.error("Failed to load dosar from backend", e);
                }
            } else {
                // Determine source: localStorage (persistent) or sessionStorage (legacy/session)
                // We prefer localStorage for persistence as requested
                const saved = localStorage.getItem('dosar_items') || sessionStorage.getItem('dosar_items');
                if (saved) {
                    try {
                        setItems(JSON.parse(saved));
                    } catch (e) {
                        console.error('Failed to parse dosar items', e);
                    }
                }
            }
        };

        loadItems();
    }, [isAuthenticated, user?.id]);

    // Persistence Effect (Local Only - Backend handles its own persistence on action)
    useEffect(() => {
        if (!isAuthenticated) {
            localStorage.setItem('dosar_items', JSON.stringify(items));
        }
    }, [items, isAuthenticated]);


    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const hideToast = () => setToast(null);

    const addToDosar = async (item: CaseData) => {
        if (items.some((i) => i.id === item.id)) {
            showToast('Această speță este deja în dosar.', 'info');
            return;
        }

        if (items.length >= 10) {
            showToast('Dosarul este plin (maxim 10 spețe).', 'error');
            return;
        }

        // Optimistic UI Update
        const previousItems = [...items];
        setItems((prev) => [item, ...prev]); // Add to top

        if (isAuthenticated) {
            try {
                // Backend expects just the item data.
                // We should pass ID and Data separate?
                // The API expects 'item_data' which contains the ID inside usually
                await addDosarItem({ ...item.data, id: item.id });
                showToast('Speță salvată în cont.', 'success');
            } catch (e: any) {
                setItems(previousItems); // Rollback
                showToast(e.message || 'Eroare la salvarea în cont.', 'error');
            }
        } else {
            showToast('Speță adăugată la dosar (Local).', 'success');
        }
    };

    const removeFromDosar = async (id: number | string) => {
        const previousItems = [...items];
        setItems((prev) => prev.filter((i) => i.id !== id));

        if (isAuthenticated) {
            try {
                await removeDosarItem(id);
                showToast('Speță ștearsă din cont.', 'info');
            } catch (e: any) {
                setItems(previousItems); // Rollback
                showToast('Eroare la ștergere din cont.', 'error');
            }
        } else {
            showToast('Speță ștearsă din dosar.', 'info');
        }
    };

    const isCaseInDosar = (id: number | string) => {
        return items.some((i) => String(i.id) === String(id));
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
                showToast,
            }}
        >
            {children}
        </DosarContext.Provider>
    );
};
