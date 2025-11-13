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
  if (!result || !result.data) {
    return null;
  }
  const caseData = result.data;

  const handleDownload = async () => {
    const pdfData: PdfSablonData = {
      titlu: caseData.titlu || "Fără titlu",
      materie: caseData.materie || "",
      obiect: caseData.obiect || "",
      instanta: caseData.instanta || "",
      parte_introductiva: caseData.parte_introductiva || "",
      considerente_speta: caseData.considerente_speta || "",
      dispozitiv_speta: caseData.dispozitiv_speta || "",
    };
    await generatePdf(pdfData);
  };

  const handlePrint = async () => {
    const pdfData: PdfSablonData = {
      titlu: caseData.titlu || "Fără titlu",
      materie: caseData.materie || "",
      obiect: caseData.obiect || "",
      instanta: caseData.instanta || "",
      parte_introductiva: caseData.parte_introductiva || "",
      considerente_speta: caseData.considerente_speta || "",
      dispozitiv_speta: caseData.dispozitiv_speta || "",
    };
    await generatePdf(pdfData, { autoPrint: true });
  };

  const renderField = (label: string, value: any) => {
    if (!value || value === "null" || (Array.isArray(value) && value.length === 0)) {
        return (
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{label}</h3>
                <p className="text-gray-500 italic">Nu sunt informații.</p>
            </div>
        );
    }
    return (
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{label}</h3>
        <p className="text-gray-600">{Array.isArray(value) ? value.join(", ") : value}</p>
      </div>
    );
  };

  const metadataContent = (
    <div className="p-4 bg-white rounded-lg shadow-inner">
      {Object.entries({
        "Titlu": caseData.titlu,
        "Număr Dosar": caseData.numar_dosar,
        "Tip Speță": caseData.tip_speta,
        "Tip Soluție": caseData.tip_solutie,
        "Tip Cale Atac": caseData.tip_cale_atac,
        "Materie": caseData.materie,
        "Obiect": caseData.obiect,
        "Părți": caseData.parti,
        "Articol Incident": caseData.articol_incident,
      }).map(([label, value]) => renderField(label, value))}
    </div>
  );

  const faptContent = (
    <div className="p-4 bg-white rounded-lg shadow-inner">
      <LongTextField label="Situația de fapt" text={caseData.situatia_de_fapt_full} />
      {renderField("Probele reținute", caseData.probele_retinute)}
    </div>
  );

  const dreptContent = (
    <div className="p-4 bg-white rounded-lg shadow-inner">
      {Object.entries({
        "Argumente Instanță": caseData.argumente_instanta,
        "Analiza Judecător": caseData.analiza_judecator,
        "Considerente Speță": caseData.considerente_speta,
        "Text Doctrină": caseData.text_doctrina,
        "Tip Act Juridic": caseData.tip_act_juridic,
      }).map(([label, value]) =>
        <LongTextField key={label} label={label} text={value} />
      )}
    </div>
  );

  const hotarareContent = (
    <div className="p-4 bg-white rounded-lg shadow-inner">
      {[
        { label: "Parte Introductivă", value: caseData.parte_introductiva },
        { label: "Cereri Accesorii", value: caseData.cereri_accesorii },
        { label: "Dispozitiv Speță", value: caseData.dispozitiv_speta },
      ].map(field =>
        <LongTextField key={field.label} label={field.label} text={field.value} />
      )}
    </div>
  );

  const utileContent = (
    <div className="p-4 bg-white rounded-lg shadow-inner">
      {Object.entries({
        "Rezumat AI": caseData.rezumat_ai,
        "Ce învățăm": caseData.text_ce_invatam,
        "Individualizare": caseData.text_individualizare,
      }).map(([label, value]) =>
        <LongTextField key={label} label={label} text={value} />
      )}
    </div>
  );

  const tabs = [
    { label: "Metadate speță", content: metadataContent },
    { label: "Situația in fapt", content: faptContent },
    { label: "Situația in drept", content: dreptContent },
    { label: "Hotărârea instanței", content: hotarareContent },
    { label: "Elemente utile", content: utileContent },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-100 rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900 truncate pr-4">
            {caseData.titlu || `Detalii Speță`}
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              aria-label="Printează speța"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Exportă speța"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              aria-label="Închide detaliile"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <main className="p-5 overflow-y-auto flex-grow">
          <Tabs tabs={tabs} />
        </main>
      </div>
    </div>
  );
};

export default CaseDetailModal;
