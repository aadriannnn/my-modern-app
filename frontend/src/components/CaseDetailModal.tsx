import React from "react";
import LongTextField from "./LongTextField";
import Tabs from "./Tabs";
import { Download, X, Printer } from "lucide-react";
import { generatePdf } from "../lib/pdf";
import type { PdfSablonData } from "../lib/pdf";

interface CaseDetailModalProps {
  result: {
    id: number | string;
    data: Record<string, any>;
  } | null;
  onClose: () => void;
}

const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const caseData = result.data;

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

  const renderField = (label: string, value: any) => {
    if (!value || value === "null" || (Array.isArray(value) && value.length === 0)) {
      return null; // Don't render empty fields for a cleaner look
    }
    return (
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-brand-text mb-1">{label}</h3>
        <p className="text-md text-brand-text-secondary">{Array.isArray(value) ? value.join(", ") : value}</p>
      </div>
    );
  };

  const contentSectionClass = "p-4 bg-white rounded-lg border border-gray-200";

  const tabs = [
    { label: "Metadate", content: (
      <div className={contentSectionClass}>
        {renderField("Titlu", caseData.titlu)}
        {renderField("Număr Dosar", caseData.număr_dosar)}
        {renderField("Tip Speță", caseData.tip_speta)}
        {renderField("Materie", caseData.materie)}
        {renderField("Obiect", caseData.obiect)}
        {renderField("Părți", caseData.parti)}
      </div>
    )},
    { label: "Situația de fapt", content: (
      <div className={contentSectionClass}>
        <LongTextField label="Situația de fapt" text={caseData.situatia_de_fapt_full} />
      </div>
    )},
    { label: "Argumente", content: (
      <div className={contentSectionClass}>
        <LongTextField label="Argumente Instanță" text={caseData.argumente_instanta} />
        <LongTextField label="Analiza Judecător" text={caseData.analiza_judecator} />
      </div>
    )},
    { label: "Hotărâre", content: (
      <div className={contentSectionClass}>
        <LongTextField label="Parte Introductivă" text={caseData.parte_introductiva} />
        <LongTextField label="Dispozitiv Speță" text={caseData.dispozitiv_speta} />
      </div>
    )},
    { label: "Elemente utile", content: (
      <div className={contentSectionClass}>
        <LongTextField label="Rezumat AI" text={caseData.Rezumat_generat_de_AI_Cod} />
        <LongTextField label="Ce învățăm" text={caseData.text_ce_invatam} />
        <LongTextField label="Individualizare" text={caseData.text_individualizare} />
      </div>
    )},
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-brand-light rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-brand-primary truncate pr-4">
            {caseData.titlu || `Detalii Speță`}
          </h2>
          <div className="flex items-center space-x-2">
            <button onClick={handlePrint} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors" aria-label="Printează">
              <Printer size={20} />
            </button>
            <button onClick={handleDownload} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors" aria-label="Exportă">
              <Download size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors" aria-label="Închide">
              <X size={20} />
            </button>
          </div>
        </header>

        <main className="p-4 overflow-y-auto flex-grow">
          <Tabs tabs={tabs} />
        </main>
      </div>
    </div>
  );
};

export default CaseDetailModal;
