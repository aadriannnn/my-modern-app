import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Download, X, Printer, FolderPlus, FolderCheck, ThumbsUp, ThumbsDown, Gavel } from "lucide-react";
import ShareButton from "./ShareButton";
import { useDosar } from "../context/DosarContext";
import { submitFeedback } from "../lib/api";

import { generatePdf } from "../lib/pdf";
import type { PdfSablonData } from "../lib/pdf";
import LongTextField from "./LongTextField";
import DocumentModelsSection from "./DocumentModelsSection";
import DocumentModelModal from "./DocumentModelModal";
import LegalCodesSection from "./LegalCodesSection";
import CompetenceSection from "./CompetenceSection";
import TaxSection from "./TaxSection";

// Refined type definitions for clarity
interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    id: number | string;
    situatia_de_fapt_full?: string;  // Added field that exists at result level
    data: Record<string, any>;
  } | null;
}

type FeedbackType = 'good' | 'bad' | null;

const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ isOpen, onClose, result }) => {
  const [activeTab, setActiveTab] = useState("Date de identificare");
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const { addToDosar, removeFromDosar, isCaseInDosar } = useDosar();

  if (!result) return null;

  const caseData = result.data;
  const isInDosar = isCaseInDosar(result.id);

  // Calculate generic speta ID for passing to children
  const spetaIdNum = typeof result.id === 'number' ? result.id : parseInt(result.id as string);
  const validSpetaId = !isNaN(spetaIdNum) ? spetaIdNum : undefined;

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
    "Date de identificare",
    "Situația de fapt",
    "Argumente",
    "Hotărâre",
    "Elemente utile",
    "Modele",
    "Coduri",
    "Competență",
    "Taxe",
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Date de identificare":
        return (
          <>
            {renderField("Titlu", caseData.titlu)}
            {renderField("Număr Dosar", caseData.număr_dosar)}
            {renderField("Tip Speță", caseData.tip_speta)}
            {renderField("Materie", caseData.materie)}
            {renderField("Obiect", caseData.obiect)}
            {renderField("Părți", caseData.parti)}
            {renderField("Probe Reținute", caseData.probele_retinute)}
            {renderField("Act Juridic", caseData.tip_act_juridic)}
            {renderField("Tip Soluție", caseData.tip_solutie)}
            {renderField("Cereri Accesorii", caseData.cereri_accesorii)}
          </>
        );
      case "Situația de fapt":
        // Access situatia_de_fapt_full from result level first, fallback to data level
        const situatiaText = result.situatia_de_fapt_full || caseData.situatia_de_fapt_full || caseData.text_situatia_de_fapt || caseData.situatia_de_fapt || '';
        return <LongTextField label="Descriere completă" text={situatiaText} />;
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
            <LongTextField
              label="Considerente"
              text={caseData.considerente_speta}
              highlightTerms={caseData.highlight_terms}
            />
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
        return <DocumentModelsSection caseData={caseData} onViewModel={handleViewModel} spetaId={validSpetaId} />;
      case "Coduri":
        return <LegalCodesSection caseData={caseData} spetaId={validSpetaId} />;
      case "Competență":
        return <CompetenceSection caseData={caseData} />;
      case "Taxe":
        return <TaxSection caseData={caseData} spetaId={validSpetaId} />;
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

  const handleFeedback = async (type: FeedbackType) => {
    if (!type) return;

    // Optimistic update
    setFeedback(type);

    try {
      // Try to parse ID as number for the backend
      const spetaId = typeof result.id === 'number'
        ? result.id
        : parseInt(result.id as string);

      await submitFeedback(type, !isNaN(spetaId) ? spetaId : undefined);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      // We keep the UI state as is to not disrupt the user experience,
      // but log the error for debugging
    }
  };

  const renderFeedbackMessage = () => {
    if (!feedback) return null;

    if (feedback === 'good') {
      return (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✓ Vă mulțumim pentru feedback! Ne bucurăm că informațiile au fost utile.
          </p>
        </div>
      );
    }

    if (feedback === 'bad') {
      return (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-900 font-medium mb-2">
            Vă mulțumim pentru feedback!
          </p>
          <p className="text-amber-800 text-sm">
            Vă informăm că toate răspunsurile sunt generate de inteligență artificială.
            Feedbackul dumneavoastră va fi analizat de echipa noastră pentru îmbunătățirea continuă a sistemului.
          </p>
        </div>
      );
    }

    return null;
  };

  const renderFeedbackButtons = () => {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-3">Acest răspuns v-a fost util?</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleFeedback('good')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${feedback === 'good'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-green-50 hover:border-green-300'
              }
            `}
            aria-label="Răspuns util"
          >
            <ThumbsUp size={18} />
            <span>Bun</span>
          </button>
          <button
            onClick={() => handleFeedback('bad')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${feedback === 'bad'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-amber-50 hover:border-amber-300'
              }
            `}
            aria-label="Răspuns neutil"
          >
            <ThumbsDown size={18} />
            <span>Rău</span>
          </button>
        </div>
        {renderFeedbackMessage()}
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
              <Dialog.Panel className="w-[95vw] max-w-none transform overflow-hidden rounded-2xl bg-gray-50 text-left align-middle shadow-xl transition-all flex flex-col h-[90vh]">
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

                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Mobile Navigation Dropdown - Only visible on mobile */}
                  <div className="md:hidden border-b border-gray-200 bg-white px-4 py-3">
                    <div className="mb-3 overflow-x-auto custom-scrollbar -mx-4 px-4 pb-1">
                      <div className="flex gap-2 min-w-max">
                        {navTabs.map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                              whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border
                              ${activeTab === tab
                                ? "bg-brand-accent text-white border-brand-accent shadow-md transform scale-[1.02]"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                              }
                            `}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lawyer Assistance Mobile Button */}
                    <button
                      onClick={() => window.open("/asistenta-avocat", "_blank")}
                      className="mt-4 w-full relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center gap-3 px-6 py-3.5">
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                          <Gavel size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-white font-bold text-sm tracking-wide">Contactează Avocat</span>
                          <span className="text-white/90 text-xs font-medium">Asistență juridică specializată</span>
                        </div>
                        <svg className="ml-auto w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300"></div>
                    </button>
                  </div>

                  {/* Desktop and Mobile Content Layout */}
                  <div className="flex flex-1 overflow-hidden">
                    {/* Vertical Navigation Sidebar - Only visible on desktop */}
                    <aside className="hidden md:flex w-1/4 xl:w-1/5 p-5 border-r border-gray-200 bg-white overflow-y-auto">
                      <nav className="flex flex-col space-y-2 w-full">
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

                      {/* Lawyer Assistance Button in Sidebar */}
                      <div className="mt-6 pt-6 border-t border-gray-200 w-full">
                        <button
                          onClick={() => window.open("/asistenta-avocat", "_blank")}
                          className="w-full relative overflow-hidden group rounded-xl"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative flex flex-col items-center gap-3 px-4 py-5">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                              <Gavel size={24} className="text-white" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-white font-bold text-base tracking-wide">Contactează Avocat</span>
                              <span className="text-white/90 text-xs font-medium text-center leading-tight">Asistență juridică<br />specializată</span>
                            </div>
                            <div className="w-full h-px bg-white/20 my-1"></div>
                            <div className="flex items-center gap-1.5 text-white/90 text-xs font-semibold group-hover:gap-2.5 transition-all duration-300">
                              <span>Vezi detalii</span>
                              <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                          <div className="absolute inset-0 rounded-xl shadow-lg group-hover:shadow-2xl transition-shadow duration-300"></div>
                        </button>
                      </div>
                    </aside>

                    {/* Content Area */}
                    <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-gray-50">
                      <div className="prose max-w-none">
                        {renderContent()}
                        {renderFeedbackButtons()}
                      </div>
                    </main>
                  </div>
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
