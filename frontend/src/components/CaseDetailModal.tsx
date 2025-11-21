import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Download, X, Printer, FolderPlus, FolderCheck } from "lucide-react";
import ShareButton from "./ShareButton";
import { useDosar } from "../context/DosarContext";

import { generatePdf } from "../lib/pdf";
import type { PdfSablonData } from "../lib/pdf";
import LongTextField from "./LongTextField";
import DocumentModelsSection from "./DocumentModelsSection";
import DocumentModelModal from "./DocumentModelModal";
import LegalCodesSection from "./LegalCodesSection";

// Refined type definitions for clarity
interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    id: number | string;
    data: Record<string, any>;
  } | null;
}

const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ isOpen, onClose, result }) => {
  const [activeTab, setActiveTab] = useState("Metadate");
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const { addToDosar, removeFromDosar, isCaseInDosar } = useDosar();

  if (!result) return null;

  const caseData = result.data;
  const isInDosar = isCaseInDosar(result.id);

  const handleDosarClick = () => {
    if (isInDosar) {
      removeFromDosar(result.id);
    } else {
      addToDosar(result);
    }
  };

  const handleViewModel = (modelId: string) => {
    setSelectedModelId(modelId);
    setModelModalOpen(true);
  };

  const handleCloseModelModal = () => {
    setModelModalOpen(false);
    setSelectedModelId(null);
  };

  // PDF Generation Logic
  const createPdfData = (): PdfSablonData => ({
    titlu: caseData.titlu || "Fără titlu",
    materie: caseData.materie || "",
    obiect: caseData.obiect || "",
    instanta: caseData.instanta || "",
    parte_introductiva: caseData.parte_introductiva || "",
    considerente_speta: caseData.considerente_speta || "",
    dispozitiv_speta: caseData.dispozitiv_speta || "",
  });

  const handleDownload = () => generatePdf(createPdfData());
  const handlePrint = () => generatePdf(createPdfData(), { autoPrint: true });

  // Navigation tabs definition
  const navTabs = [
    "Metadate",
    "Situația de fapt",
    "Argumente",
    "Hotărâre",
    "Elemente utile",
    "Modele",
    "Coduri",
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Metadate":
        return (
          <>
            {renderField("Titlu", caseData.titlu)}
            {renderField("Număr Dosar", caseData.număr_dosar)}
            {renderField("Tip Speță", caseData.tip_speta)}
            {renderField("Materie", caseData.materie)}
            {renderField("Obiect", caseData.obiect)}
            {renderField("Părți", caseData.parti)}
          </>
        );
      case "Situația de fapt":
        return <LongTextField label="Descriere completă" text={caseData.situatia_de_fapt_full} />;
      case "Argumente":
        return (
          <>
            <LongTextField label="Argumente Instanță" text={caseData.argumente_instanta} />
            <LongTextField label="Analiza Judecător" text={caseData.analiza_judecator} />
          </>
        );
      case "Hotărâre":
        return (
          <>
            <LongTextField label="Parte Introductivă" text={caseData.parte_introductiva} />
            <LongTextField label="Considerente" text={caseData.considerente_speta} />
            <LongTextField label="Dispozitiv Speță" text={caseData.dispozitiv_speta} />
          </>
        );
      case "Elemente utile":
        return (
          <>
            <LongTextField label="Rezumat AI" text={caseData.Rezumat_generat_de_AI_Cod} />
            <LongTextField label="Ce învățăm" text={caseData.text_ce_invatam} />
            <LongTextField label="Individualizare" text={caseData.text_individualizare} />
          </>
        );
      case "Modele":
        return <DocumentModelsSection caseData={caseData} onViewModel={handleViewModel} />;
      case "Coduri":
        return <LegalCodesSection caseData={caseData} />;
      default:
        return null;
    }
  };

  const renderField = (label: string, value: any) => {
    if (!value || value === "null" || (Array.isArray(value) && value.length === 0)) {
      return null;
    }
    return (
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-1">{label}</h3>
        <p className="text-md text-gray-800">{Array.isArray(value) ? value.join(", ") : value}</p>
      </div>
    );
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-gray-50 text-left align-middle shadow-xl transition-all flex flex-col max-h-[90vh]">
                <header className="flex justify-between items-center p-5 border-b border-gray-200 bg-white sticky top-0">
                  <Dialog.Title as="h3" className="text-xl font-bold text-brand-dark leading-6 truncate">
                    {caseData.titlu || "Detalii Speță"}
                  </Dialog.Title>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleDosarClick}
                      className={`p-2 rounded-full transition-colors ${isInDosar ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-500 hover:bg-gray-100'}`}
                      title={isInDosar ? "Șterge din dosar" : "Adaugă la dosar"}
                    >
                      {isInDosar ? <FolderCheck size={20} /> : <FolderPlus size={20} />}
                    </button>
                    <ShareButton caseData={caseData} />
                    <button onClick={handlePrint} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" aria-label="Printează">
                      <Printer size={20} />
                    </button>
                    <button onClick={handleDownload} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" aria-label="Exportă">
                      <Download size={20} />
                    </button>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" aria-label="Închide">
                      <X size={22} />
                    </button>
                  </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                  {/* Vertical Navigation Sidebar */}
                  <aside className="w-1/4 xl:w-1/5 p-5 border-r border-gray-200 bg-white overflow-y-auto">
                    <nav className="flex flex-col space-y-2">
                      {navTabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`
                            px-4 py-2.5 text-sm font-medium text-left rounded-lg transition-all duration-200
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent
                            ${activeTab === tab
                              ? "bg-brand-accent bg-opacity-10 text-brand-accent font-semibold"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }
                          `}
                        >
                          {tab}
                        </button>
                      ))}
                    </nav>
                  </aside>

                  {/* Content Area */}
                  <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
                    <div className="prose max-w-none">
                      {renderContent()}
                    </div>
                  </main>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>

        {/* Document Model Preview Modal */}
        <DocumentModelModal
          isOpen={modelModalOpen}
          onClose={handleCloseModelModal}
          modelId={selectedModelId}
        />
      </Dialog>
    </Transition>
  );
};

export default CaseDetailModal;
