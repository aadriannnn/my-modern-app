import React from "react";
import AccordionSection from "./AccordionSection";
import LongTextField from "./LongTextField";

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

  const renderField = (label: string, value: any) => {
    if (!value || value === "null" || (Array.isArray(value) && value.length === 0)) {
      return null;
    }
    return (
      <div className="mb-2">
        <span className="font-semibold text-gray-600">{label}: </span>
        <span className="text-gray-800">{Array.isArray(value) ? value.join(", ") : value}</span>
      </div>
    );
  };

  const metadataFields = {
    "Titlu": caseData.titlu,
    "Număr Dosar": caseData.numar_dosar,
    "Tip Speță": caseData.tip_speta,
    "Tip Soluție": caseData.tip_solutie,
    "Tip Cale Atac": caseData.tip_cale_atac,
    "Materie": caseData.materie,
    "Obiect": caseData.obiect,
    "Părți": caseData.parti,
    "Articol Incident": caseData.articol_incident,
  };

  const faptFields = {
    "Situația de fapt": caseData.situatia_de_fapt,
    "Probele reținute": caseData.probele_retinute,
  };

  const dreptFields = {
    "Argumente Instanță": caseData.argumente_instanta,
    "Analiza Judecător": caseData.analiza_judecator,
    "Considerente Speță": caseData.considerente_speta,
    "Text Doctrină": caseData.text_doctrina,
    "Tip Act Juridic": caseData.tip_act_juridic,
  };

  const hotarareFields = [
    { label: "Parte Introductivă", value: caseData.parte_introductiva },
    { label: "Cereri Accesorii", value: caseData.cereri_accesorii },
    { label: "Dispozitiv Speță", value: caseData.dispozitiv_speta },
  ];

  const utileFields = {
    "Rezumat AI": caseData.rezumat_ai,
    "Ce învățăm": caseData.text_ce_invatam,
    "Individualizare": caseData.text_individualizare,
  };

  const hasContent = (section: any) => Object.values(section).some(v => v);
  const hasHotarareContent = hotarareFields.some(f => f.value);

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 truncate">
            {caseData.titlu || `Detalii Speță`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Închide detaliile"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="p-4 overflow-y-auto flex-grow">
          {hasContent(metadataFields) && (
            <AccordionSection title="Metadate speță" isOpenDefault={true}>
              {Object.entries(metadataFields).map(([label, value]) => renderField(label, value))}
            </AccordionSection>
          )}

          {hasContent(faptFields) && (
            <AccordionSection title="În fapt">
              {faptFields["Situația de fapt"] && <LongTextField label="Situația de fapt" text={faptFields["Situația de fapt"]} />}
              {faptFields["Probele reținute"] && renderField("Probele reținute", faptFields["Probele reținute"])}
            </AccordionSection>
          )}

          {hasContent(dreptFields) && (
            <AccordionSection title="În drept">
              {Object.entries(dreptFields).map(([label, value]) =>
                value && <LongTextField key={label} label={label} text={value} />
              )}
            </AccordionSection>
          )}

          {hasHotarareContent && (
            <AccordionSection title="Hotărârea instanței">
              {hotarareFields.map(field =>
                field.value && <LongTextField key={field.label} label={field.label} text={field.value} />
              )}
            </AccordionSection>
          )}

          {hasContent(utileFields) && (
            <AccordionSection title="Elemente utile utilizator" isOpenDefault={true}>
              {Object.entries(utileFields).map(([label, value]) =>
                value && <LongTextField key={label} label={label} text={value} />
              )}
            </AccordionSection>
          )}
        </main>
      </div>
    </div>
  );
};

export default CaseDetailModal;
