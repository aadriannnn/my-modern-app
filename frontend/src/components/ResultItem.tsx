import React from 'react';
import { generatePdf } from '@/lib/pdf';
import type { PdfSablonData } from '@/lib/pdf';
import eyeIcon from '@/assets/icons/eye.png';
import { Printer } from 'lucide-react';
import justiceIcon from '@/assets/icons/justice.png';
import calendarIcon from '@/assets/icons/calendar.png';
import addToDossierIcon from '@/assets/icons/addToDossier.png';

interface ResultItemProps {
  result: any;
  activeView: 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare' | 'text_doctrina' | 'text_ce_invatam' | 'Rezumat_generat_de_AI_Cod';
  onViewCase: () => void;
}

const ResultItem: React.FC<ResultItemProps> = ({ result, activeView, onViewCase }) => {
  const content = result[activeView] || 'Acest conținut nu este disponibil.';

  const handleDownload = async () => {
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
    await generatePdf(pdfData);
  };

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

  const generateTitle = (result: any): string => {
    const titlu = result.data?.titlu;
    const denumireArticol = result.data?.text_denumire_articol;

    if (titlu && denumireArticol) {
      return `${titlu} - ${denumireArticol}`;
    }
    if (titlu) {
      return titlu;
    }
    if (denumireArticol) {
      return denumireArticol;
    }
    return result.denumire || `Caz #${result.id}`;
  };

  const title = generateTitle(result);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-yellow-200">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="bg-white p-5 border rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start pb-4 mb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 flex-1 cursor-pointer" onClick={onViewCase}>
          {highlightText(title, '')}
        </h3>
        <div className="flex items-center space-x-3 ml-4">
          <IconButton icon={addToDossierIcon} alt="Dosar" />
          <button onClick={handlePrint} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <Printer size={20} />
          </button>
          <IconButton icon={eyeIcon} alt="Vezi" onClick={onViewCase} />
        </div>
      </div>

      <div className="text-sm text-gray-700" onClick={onViewCase}>
        {content}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-4">
        <div className="flex items-center space-x-4">
          <InfoItem icon={justiceIcon} text={result.data?.materie || 'N/A'} />
          <InfoItem icon={calendarIcon} text={result.data?.sursa || 'N/A'} />
        </div>
      </div>
    </div>
  );
};

// Helper components for icons and info items
const IconButton: React.FC<{ icon: string; alt: string; onClick?: () => void }> = ({ icon, alt, onClick }) => (
  <button onClick={onClick} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
    <img src={icon} alt={alt} className="h-5 w-5" />
  </button>
);

const InfoItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="flex items-center">
    <img src={icon} alt="" className="h-4 w-4 mr-1.5" />
    <span>{text}</span>
  </div>
);

export default ResultItem;
