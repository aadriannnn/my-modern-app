import React, { Fragment } from 'react';
import { generatePdf } from '@/lib/pdf';
import type { PdfSablonData } from '@/lib/pdf';
import { Printer, Eye, FolderPlus, Scale, Calendar, ChevronRight } from 'lucide-react';
import { Tab } from '@headlessui/react';

interface ResultItemProps {
  result: any;
  onViewCase: () => void;
}

const ResultItem: React.FC<ResultItemProps> = ({ result, onViewCase }) => {
  const handlePrint = async () => {
    const caseData = result.data;
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

  const generateTitle = (resultData: any): string => {
    const { titlu, text_denumire_articol, denumire } = resultData.data || {};
    if (titlu && text_denumire_articol) return `${titlu} - ${text_denumire_articol}`;
    return titlu || text_denumire_articol || denumire || `Caz #${resultData.id}`;
  };

  const title = generateTitle(result);

  const tabs = [
    { key: 'situatia_de_fapt_full', label: 'Situație de fapt' },
    { key: 'argumente_instanta', label: 'Argumente' },
    { key: 'text_individualizare', label: 'Individualizare' },
    { key: 'text_doctrina', label: 'Doctrină' },
    { key: 'text_ce_invatam', label: 'Ce învățăm' },
    { key: 'Rezumat_generat_de_AI_Cod', label: 'Rezumat AI' },
  ].filter(tab => result[tab.key] && result[tab.key].trim().toLowerCase() !== 'null' && result[tab.key].trim() !== '');

  return (
    <div className="bg-surface border border-border-color rounded-xl shadow-soft transition-all duration-300 hover:shadow-medium hover:border-brand-gold/50">
      {/* Header Card */}
      <div className="flex justify-between items-start p-5 border-b border-border-color">
        <div>
          <h3 className="text-lg font-semibold text-text-primary pr-4">
            {title}
          </h3>
          {/* Footer Card */}
          <div className="flex items-center space-x-4 text-xs text-text-secondary mt-2">
            <InfoItem icon={<Scale size={14} />} text={result.data?.materie || 'N/A'} />
            <InfoItem icon={<Calendar size={14} />} text={result.data?.sursa || 'N/A'} />
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <IconButton icon={<FolderPlus size={18} />} tooltip="Adaugă la dosar" />
          <IconButton icon={<Printer size={18} />} tooltip="Printează" onClick={handlePrint} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-lg bg-gray-100 p-1">
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                className={({ selected }) =>
                  `w-full rounded-md py-2 text-sm font-medium leading-5
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-brand-gold
                  ${
                    selected
                      ? 'bg-white text-brand-blue shadow'
                      : 'text-text-secondary hover:bg-white/[0.6]'
                  }`
                }
              >
                {tab.label}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-4">
            {tabs.map((tab) => (
              <Tab.Panel key={tab.key} className="text-sm text-text-secondary leading-relaxed">
                <p className="line-clamp-5">{result[tab.key]}</p>
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Action footer */}
      <div className="border-t border-border-color bg-gray-50/50 px-5 py-3">
        <button
            onClick={onViewCase}
            className="group flex items-center text-sm font-semibold text-brand-gold hover:text-brand-gold/80 transition-colors"
        >
            Vezi detalii caz
            <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-1"/>
        </button>
      </div>
    </div>
  );
};

// Helper components
const IconButton: React.FC<{ icon: React.ReactNode; tooltip: string; onClick?: () => void }> = ({ icon, tooltip, onClick }) => (
  <button onClick={onClick} className="p-2 rounded-full text-text-secondary hover:bg-gray-100 hover:text-brand-blue transition-colors relative group">
    {icon}
    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
      {tooltip}
    </span>
  </button>
);

const InfoItem: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex items-center">
    <span className="text-text-secondary">{icon}</span>
    <span className="ml-1.5 font-medium">{text}</span>
  </div>
);

export default ResultItem;
