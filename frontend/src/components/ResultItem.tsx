import React from 'react';
import { generatePdf } from '@/lib/pdf';
import type { PdfSablonData } from '@/lib/pdf';
import { Printer, Eye, FolderPlus, Scale, Calendar } from 'lucide-react';

type ViewType = 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare' | 'text_doctrina' | 'text_ce_invatam' | 'Rezumat_generat_de_AI_Cod';

interface ResultItemProps {
  result: any;
  onViewCase: () => void;
  activeView: ViewType;
}

const ResultItem: React.FC<ResultItemProps> = ({ result, onViewCase, activeView }) => {
  const content = result?.[activeView] || 'Nu există descriere disponibilă.';

  // Don't render the component if the content for the active view is missing or just "null"
  if (!content || typeof content !== 'string' || content.trim().toLowerCase() === 'null' || content.trim() === '') {
    return null;
  }

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

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand-accent">
      {/* Header Card */}
      <div className="flex justify-between items-start pb-3 mb-3 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-brand-primary flex-1 cursor-pointer pr-4" onClick={onViewCase}>
          {title}
        </h3>
        <div className="flex items-center space-x-2">
          <IconButton icon={<FolderPlus size={18} />} tooltip="Adaugă la dosar" />
          <IconButton icon={<Printer size={18} />} tooltip="Printează" onClick={handlePrint} />
          <IconButton icon={<Eye size={18} />} tooltip="Vezi detalii" onClick={onViewCase} />
        </div>
      </div>

      {/* Content */}
      <div className="text-sm text-brand-text-secondary leading-relaxed cursor-pointer" onClick={onViewCase}>
        <p className="line-clamp-4">{content}</p>
      </div>

      {/* Footer Card */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-4">
        <InfoItem icon={<Scale size={14} />} text={result.data?.materie || 'N/A'} />
        <InfoItem icon={<Calendar size={14} />} text={result.data?.sursa || 'N/A'} />
      </div>
    </div>
  );
};

// Helper components
const IconButton: React.FC<{ icon: React.ReactNode; tooltip: string; onClick?: () => void }> = ({ icon, tooltip, onClick }) => (
  <button onClick={onClick} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-brand-primary transition-colors relative group">
    {icon}
    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      {tooltip}
    </span>
  </button>
);

const InfoItem: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
    <span className="text-gray-500">{icon}</span>
    <span className="ml-1.5 font-medium">{text}</span>
  </div>
);

export default ResultItem;
