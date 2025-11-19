import React, { useEffect, useState } from 'react';
import { Loader2, FileText, Download, Eye } from 'lucide-react';
import type { DocumentModel } from '../types';

interface DocumentModelsSectionProps {
    caseData: {
        materie?: string;
        obiect?: string;
        keywords?: string[] | string;
        situatia_de_fapt_full?: string;
        Rezumat_generat_de_AI_Cod?: string;
    };
    onViewModel?: (modelId: string) => void;
}

const DocumentModelsSection: React.FC<DocumentModelsSectionProps> = ({ caseData, onViewModel }) => {
    const [models, setModels] = useState<DocumentModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRelevantModels = async () => {
            setLoading(true);
            setError(null);

            try {
                // Prepare request body
                const requestBody = {
                    materie: caseData.materie || '',
                    obiect: caseData.obiect || '',
                    keywords: Array.isArray(caseData.keywords)
                        ? caseData.keywords
                        : (typeof caseData.keywords === 'string' ? caseData.keywords.split(',').map(k => k.trim()) : []),
                    situatia_de_fapt: caseData.situatia_de_fapt_full || '',
                    rezumat_ai: caseData.Rezumat_generat_de_AI_Cod || '',
                    limit: 10
                };

                const response = await fetch('/api/modele/relevant', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    throw new Error('Eroare la încărcarea modelelor');
                }

                const data = await response.json();
                setModels(data);
            } catch (err) {
                console.error('Error fetching models:', err);
                setError(err instanceof Error ? err.message : 'Eroare necunoscută');
            } finally {
                setLoading(false);
            }
        };

        fetchRelevantModels();
    }, [caseData]);

    const handleDownloadPdf = (model: DocumentModel) => {
        try {
            // Use the backend endpoint for PDF download
            const downloadUrl = `/api/modele/${model.id}/download`;

            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${model.titlu_model}.pdf`); // Optional, backend sets filename too
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error downloading model:', err);
            alert('Eroare la descărcarea modelului');
        }
    };

    const handleViewModel = (modelId: string) => {
        if (onViewModel) {
            onViewModel(modelId);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                <span className="ml-3 text-gray-600">Se încarcă modelele...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 font-medium">Eroare: {error}</p>
                <p className="text-red-500 text-sm mt-2">Vă rugăm să încercați din nou mai târziu.</p>
            </div>
        );
    }

    if (models.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Nu s-au găsit modele relevante</p>
                <p className="text-gray-500 text-sm mt-2">
                    Nu există modele de acte juridice care să corespundă acestei spețe.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Modele de acte juridice relevante
                </h3>
                <p className="text-sm text-gray-600">
                    Am găsit {models.length} {models.length === 1 ? 'model' : 'modele'} potrivit{models.length === 1 ? '' : 'e'} pentru această speță.
                </p>
            </div>

            <div className="space-y-3">
                {models.map((model) => (
                    <div
                        key={model.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-brand-accent hover:shadow-md transition-all duration-200"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h4 className="text-base font-semibold text-gray-800 mb-2">
                                    {model.titlu_model}
                                </h4>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {model.materie_model && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {model.materie_model}
                                        </span>
                                    )}
                                    {model.obiect_model && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {model.obiect_model}
                                        </span>
                                    )}
                                    {model.sursa_model && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                            {model.sursa_model}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                    <span className="font-medium text-brand-accent">
                                        Relevanță: {(model.relevance_score * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                                <button
                                    onClick={() => handleViewModel(model.id)}
                                    className="p-2 text-brand-accent hover:bg-brand-accent hover:bg-opacity-10 rounded-lg transition-colors"
                                    title="Vizualizează"
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    onClick={() => handleDownloadPdf(model)}
                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Descarcă"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>Notă:</strong> Modelele de acte sunt selectate automat pe baza materialei, obiectului și conținutului speței.
                    Verificați întotdeauna aplicabilitatea modelului la cazul dvs. specific.
                </p>
            </div>
        </div>
    );
};

export default DocumentModelsSection;
