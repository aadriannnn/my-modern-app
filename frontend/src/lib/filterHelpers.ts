import type { SelectedFilters } from '../types';

export type FilterStep = 'materie' | 'obiect' | 'detalii';

export interface BreadcrumbItem {
    label: string;
    step: FilterStep;
    count?: number;
    isActive: boolean;
}

/**
 * Determină pasul curent în procesul de filtrare progresivă
 */
export function getCurrentStep(selectedFilters: SelectedFilters): FilterStep {
    if (!selectedFilters.materie) {
        return 'materie';
    }

    if (selectedFilters.obiect.length === 0) {
        return 'obiect';
    }

    return 'detalii';
}

/**
 * Verifică dacă utilizatorul poate avansa la pasul următor
 */
export function canProceedToNextStep(step: FilterStep, selectedFilters: SelectedFilters): boolean {
    switch (step) {
        case 'materie':
            return !!selectedFilters.materie;
        case 'obiect':
            return selectedFilters.obiect.length > 0;
        case 'detalii':
            return true; // Ultimul pas, întotdeauna poate continua
        default:
            return false;
    }
}

/**
 * Resetează selecțiile de filtre după un anumit nivel
 */
export function resetFiltersAfterLevel(
    filters: SelectedFilters,
    level: FilterStep
): SelectedFilters {
    const newFilters = { ...filters };

    switch (level) {
        case 'materie':
            // Resetează tot
            newFilters.materie = '';
            newFilters.obiect = [];
            newFilters.tip_speta = [];
            newFilters.parte = [];
            break;
        case 'obiect':
            // Păstrează materia, resetează restul
            newFilters.obiect = [];
            newFilters.tip_speta = [];
            newFilters.parte = [];
            break;
        case 'detalii':
            // Păstrează materia și obiectele, resetează doar detaliile
            newFilters.tip_speta = [];
            newFilters.parte = [];
            break;
    }

    return newFilters;
}

/**
 * Obține elementele breadcrumb pentru navigare
 */
export function getBreadcrumbItems(selectedFilters: SelectedFilters): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    const currentStep = getCurrentStep(selectedFilters);

    // Materie
    items.push({
        label: selectedFilters.materie || 'Selectează materie',
        step: 'materie',
        isActive: currentStep === 'materie' || !selectedFilters.materie,
    });

    // Obiect
    if (selectedFilters.materie) {
        const obiectCount = selectedFilters.obiect.length;
        items.push({
            label: obiectCount > 0 ? `${obiectCount} obiect${obiectCount > 1 ? 'e' : ''}` : 'Selectează obiect',
            step: 'obiect',
            count: obiectCount,
            isActive: currentStep === 'obiect',
        });
    }

    // Detalii
    if (selectedFilters.obiect.length > 0) {
        const detailsCount = selectedFilters.tip_speta.length + selectedFilters.parte.length;
        items.push({
            label: detailsCount > 0 ? 'Detalii' : 'Detalii opționale',
            step: 'detalii',
            count: detailsCount,
            isActive: currentStep === 'detalii',
        });
    }

    return items;
}

/**
 * Determină ce secțiuni de filtre ar trebui să fie active/disponibile
 */
export function getEnabledSections(selectedFilters: SelectedFilters): {
    materie: boolean;
    obiect: boolean;
    tipSpeta: boolean;
    parte: boolean;
} {
    return {
        materie: true, // Întotdeauna disponibilă
        obiect: !!selectedFilters.materie,
        tipSpeta: selectedFilters.obiect.length > 0,
        parte: selectedFilters.obiect.length > 0,
    };
}
