import React, { Fragment } from "react";
import { Dialog, Tab, Transition } from "@headlessui/react";
import { Download, X, Printer, Landmark, FileText, Briefcase, BookOpen, BrainCircuit } from "lucide-react";
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
  const { data: caseData } = result;

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

  const tabs = [
    {
      label: "Metadate",
      icon: Briefcase,
      content: (
        <MetadataSection data={caseData} />
      )
    },
    {
      label: "Situația de fapt",
      icon: FileText,
      content: (
        <ContentSection title="Situația de fapt" text={caseData.situatia_de_fapt_full} />
      )
    },
    {
      label: "Argumente",
      icon: Landmark,
      content: (
        <>
          <ContentSection title="Argumente Instanță" text={caseData.argumente_instanta} />
          <ContentSection title="Analiza Judecător" text={caseData.analiza_judecator} />
        </>
      )
    },
    {
      label: "Hotărâre",
      icon: BookOpen,
      content: (
        <>
          <ContentSection title="Parte Introductivă" text={caseData.parte_introductiva} />
          <ContentSection title="Dispozitiv Speță" text={caseData.dispozitiv_speta} />
        </>
      )
    },
    {
      label: "Elemente utile",
      icon: BrainCircuit,
      content: (
        <>
          <ContentSection title="Rezumat AI" text={caseData.Rezumat_generat_de_AI_Cod} />
          <ContentSection title="Ce învățăm" text={caseData.text_ce_invatam} />
          <ContentSection title="Individualizare" text={caseData.text_individualizare} />
        </>
      )
    },
  ].filter(tab => React.isValidElement(tab.content) && (tab.content.props.text || (tab.content.props.data && Object.keys(tab.content.props.data).length > 0) || (tab.content.props.children && tab.content.props.children.some((child:any) => child.props.text))));


  return (
    <Transition.Root show={true} as={Fragment}>
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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-xl bg-white text-left shadow-xl transition-all w-full max-w-5xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-border-color sticky top-0 bg-white z-10">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-text-primary truncate pr-4">
                    {caseData.titlu || `Detalii Speță`}
                  </Dialog.Title>
                  <div className="flex items-center space-x-2">
                    <button onClick={handlePrint} className="p-2 text-text-secondary hover:bg-gray-100 rounded-full transition-colors" aria-label="Printează"><Printer size={20} /></button>
                    <button onClick={handleDownload} className="p-2 text-text-secondary hover:bg-gray-100 rounded-full transition-colors" aria-label="Exportă"><Download size={20} /></button>
                    <button onClick={onClose} className="p-2 text-text-secondary hover:bg-gray-100 rounded-full transition-colors" aria-label="Închide"><X size={20} /></button>
                  </div>
                </header>

                <main className="flex-1 overflow-hidden">
                  <Tab.Group as="div" className="flex h-full">
                    <Tab.List className="w-1/4 min-w-[200px] border-r border-border-color p-2 space-y-1 overflow-y-auto">
                      {tabs.map((tab) => (
                        <Tab key={tab.label} as={Fragment}>
                          {({ selected }) => (
                            <button
                              className={`w-full flex items-center text-left px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-200
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold
                                ${
                                  selected
                                    ? 'bg-brand-gold/10 text-brand-gold'
                                    : 'text-text-secondary hover:bg-gray-100'
                                }`}
                            >
                              <tab.icon size={18} className="mr-3" />
                              {tab.label}
                            </button>
                          )}
                        </Tab>
                      ))}
                    </Tab.List>

                    <Tab.Panels className="w-3/4 overflow-y-auto p-6">
                      {tabs.map((tab) => (
                        <Tab.Panel key={tab.label}>{tab.content}</Tab.Panel>
                      ))}
                    </Tab.Panels>
                  </Tab.Group>
                </main>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

const ContentSection: React.FC<{ title: string; text?: string | null }> = ({ title, text }) => {
  if (!text || text.trim().toLowerCase() === "null" || text.trim() === "") return null;
  return (
    <div className="mb-6">
      <h4 className="text-md font-semibold text-text-primary mb-2">{title}</h4>
      <p className="text-base text-text-secondary whitespace-pre-wrap">{text}</p>
    </div>
  );
};

const MetadataSection: React.FC<{data: Record<string, any>}> = ({ data }) => {
  const renderField = (label: string, value: any) => {
    if (!value || value === "null" || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className="mb-3">
        <h5 className="text-sm font-semibold text-text-primary">{label}</h5>
        <p className="text-md text-text-secondary">{Array.isArray(value) ? value.join(", ") : value}</p>
      </div>
    );
  };
  return (
    <div>
      <h4 className="text-md font-semibold text-text-primary mb-4">Metadate</h4>
      {renderField("Titlu", data.titlu)}
      {renderField("Număr Dosar", data.număr_dosar)}
      {renderField("Tip Speță", data.tip_speta)}
      {renderField("Materie", data.materie)}
      {renderField("Obiect", data.obiect)}
      {renderField("Părți", data.parti)}
      {renderField("Sursa", data.sursa)}
    </div>
  )
}

export default CaseDetailModal;
