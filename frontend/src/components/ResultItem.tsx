import React from 'react';
import { generatePdf } from '@/lib/pdf';
import type { PdfSablonData } from '@/lib/pdf';
import { Printer, Eye, FolderPlus, Scale, FolderCheck, Share2 } from 'lucide-react';
import AIResultBadge from './AIResultBadge';
import { useDosar } from '../context/DosarContext';

type ViewType = 'situatia_de_fapt_full' | 'argumente_instanta' | 'text_individualizare' | 'text_doctrina' | 'text_ce_invatam' | 'Rezumat_generat_de_AI_Cod' | 'cereri_accesorii';

interface ResultItemProps {
  result: any;
  onViewCase: () => void;
  activeView: ViewType;
  isAISelected?: boolean;
  isCandidateCase?: boolean;
}

const ResultItem: React.FC<ResultItemProps> = ({ result, onViewCase, activeView, isAISelected = false, isCandidateCase = false }) => {
  const { addToDosar, removeFromDosar, isCaseInDosar } = useDosar();

  // Try to access content from result or result.data
  const content = result?.[activeView] || result?.data?.[activeView] || 'Nu există descriere disponibilă.';

  // Don't render if content is missing/empty
  if (!content || typeof content !== 'string' || content.trim().toLowerCase() === 'null' || content.trim() === '') {
    return null;
  }

  const isInDosar = isCaseInDosar(result.id);

  const handleDosarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInDosar) {
      removeFromDosar(result.id);
    } else {
      addToDosar(result);
    }
  };

  const handlePrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const caseData = result.data || result;
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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Simple share implementation for now
    if (navigator.share) {
      navigator.share({
        title: generateTitle(result),
        text: content.substring(0, 100) + '...',
        url: window.location.href
      }).catch(console.error);
    }
  };

  const generateTitle = (resultData: any): string => {
    const { titlu, text_denumire_articol, denumire } = resultData.data || resultData;
    if (titlu && text_denumire_articol) return `${titlu} - ${text_denumire_articol}`;
    return titlu || text_denumire_articol || denumire || `Caz #${resultData.id}`;
  };

  const title = generateTitle(result);

  // Highlighting Logic
  const highlightText = (text: string, maxLength: number = 400) => {
    if (!text) return 'Informație indisponibilă';
    let displayText = text;
    if (text.length > maxLength) {
      displayText = text.substring(0, maxLength) + '...';
    }
    // Return formatted HTML if needed, for now just text
    return <span className="font-normal" dangerouslySetInnerHTML={{ __html: displayText }} />;
  };

  return (
    <div
      onClick={onViewCase}
      className={`
            group relative bg-white rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden mb-4
            ${isAISelected
          ? 'ring-2 ring-brand-accent/30 shadow-glow'
          : 'border border-slate-100 shadow-sm hover:shadow-soft hover:-translate-y-0.5'
        }
            ${isCandidateCase ? 'opacity-90 hover:opacity-100' : ''}
        `}
    >
      {/* Type Indicator Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isAISelected ? 'bg-brand-accent' : 'bg-slate-200 group-hover:bg-slate-300'} transition-colors duration-300`} />

      <div className="p-5 pl-7">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 gap-4">
          <div className="flex-1">
            {isAISelected && (
              <div className="mb-2 inline-flex">
                <AIResultBadge score={result.score || 95} />
              </div>
            )}
            <h3 className="text-lg font-bold text-brand-dark leading-snug group-hover:text-brand-accent transition-colors duration-200 line-clamp-2">
              {title}
            </h3>
          </div>

          {/* Meta info badge */}
          <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-slate-500 font-medium">
            {(result.data?.data || result.data_speta) && (
              <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                {new Date(result.data?.data || result.data_speta).toLocaleDateString('ro-RO')}
              </span>
            )}
            <span className="uppercase tracking-wide text-[10px] text-slate-400">
              {result.data?.instanta || 'Instanța'}
            </span>
          </div>
        </div>

        {/* Content Snippet */}
        <div className="mb-4 text-sm text-slate-600 leading-relaxed font-normal">
          {highlightText(content)}
        </div>

        {/* Footer / Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Scale size={14} className="text-slate-300" />
              {result.data?.materie || 'Materie nedefinită'}
            </div>
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
              {result.data?.obiect || result.data?.obiectul || 'Obiect nedefinit'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <IconButton
              icon={isInDosar ? <FolderCheck size={16} className="text-green-600" /> : <FolderPlus size={16} />}
              tooltip={isInDosar ? "Șterge din dosar" : "Adaugă la dosar"}
              onClick={handleDosarClick}
            />
            <IconButton icon={<Printer size={16} />} tooltip="Printează" onClick={handlePrint} />
            <IconButton icon={<Share2 size={16} />} tooltip="Partajează" onClick={handleShare} />
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <IconButton icon={<Eye size={16} className="text-brand-accent" />} tooltip="Vezi detalii" onClick={(e) => { e.stopPropagation(); onViewCase(); }} />
          </div>
        </div>
      </div>

      {/* Hover Action Indicator (Mobile) */}
      <div className="md:hidden absolute right-4 bottom-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="p-2 bg-brand-light rounded-full text-brand-accent shadow-sm">
          <Eye size={16} />
        </div>
      </div>
    </div>
  );
};

// Helper components
const IconButton: React.FC<{ icon: React.ReactNode; tooltip: string; onClick?: (e: React.MouseEvent) => void }> = ({ icon, tooltip, onClick }) => (
  <button onClick={onClick} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-brand-dark transition-colors relative group" title={tooltip}>
    {icon}
  </button>
);

export default ResultItem;
