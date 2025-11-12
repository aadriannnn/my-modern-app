import { jsPDF } from "jspdf";

/* ================= Helpers ================= */
type Align = "left" | "center" | "right" | "justify";
const safe = (v?: any) => (v ? String(v) : "");
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* ================= Tipuri compatibile cu app-ul tău ================= */
export type Paragraph = {
  text: string;
  align?: Align;
  lineGap?: number;
  indentFirstLine?: number;
};

export type Section = {
  title: string;               // ex: "Parte Introductivă" / "Considerente"
  paragraphs?: Paragraph[];    // [{ text: caseData.parte_introductiva }], etc.
};

export type PdfSablonData = {
  titlu: string;               // caseData.titlu
  numarDosar?: string;         // caseData.numar_dosar
  sectiuni?: Section[];        // "Parte Introductivă" + "Considerente" (din UI)
  dispozitiv?: Paragraph[];    // [{ text: caseData.dispozitiv }]
};

/* ================= Opțiuni (opționale) ================= */
export type PdfOptions = {
  filename?: string;
  margin?: number;                           // mm
  accent?: [number, number, number];         // culoare accent
  openInNewWindow?: boolean;
  returnBlob?: boolean;
};

/* ================= Stiluri & Layout ================= */
const DEF_MARGIN = 18;
const HEADER_HEIGHT = 22;
const FOOTER_HEIGHT = 14;
const LINE_GAP_DEFAULT = 5;
const ACCENT_DEFAULT: [number, number, number] = [28, 100, 242];

interface LayoutCtx {
  y: number;
  margin: number;
  pageW: number;
  pageH: number;
  maxW: number;
  accent: [number, number, number];
}

/* ================= Paginare ================= */
const needBreak = (ctx: LayoutCtx, needed: number) =>
  ctx.y + needed > ctx.pageH - FOOTER_HEIGHT;

const ensureSpace = (doc: jsPDF, ctx: LayoutCtx, needed: number) => {
  if (needBreak(ctx, needed)) {
    doc.addPage();
    // Re-redăm header-ul grafic la începutul paginii noi
    drawHeader(doc, ctx);
  }
};

/* ================= Header / Footer ================= */
const drawHeader = (doc: jsPDF, ctx: LayoutCtx) => {
  // branding centrat
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(25);
  doc.text("VerdictLine", ctx.pageW / 2, ctx.margin + 3, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text("LegeaAplicata.ro", ctx.pageW / 2, ctx.margin + 8, { align: "center" });

  // linie separatoare
  doc.setDrawColor(210);
  doc.setLineWidth(0.4);
  doc.line(ctx.margin, ctx.margin + 11, ctx.pageW - ctx.margin, ctx.margin + 11);

  // setăm poziția de start pentru conținut
  ctx.y = ctx.margin + HEADER_HEIGHT; // ~22mm sub margine
};

const drawFooterAllPages = (doc: jsPDF, ctx: LayoutCtx) => {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(230);
    doc.setLineWidth(0.3);
    doc.line(ctx.margin, ctx.pageH - FOOTER_HEIGHT + 2, ctx.pageW - ctx.margin, ctx.pageH - FOOTER_HEIGHT + 2);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text("© VerdictLine – LegeaAplicata.ro", ctx.margin, ctx.pageH - 6);
    doc.text(`${i}/${total}`, ctx.pageW - ctx.margin, ctx.pageH - 6, { align: "right" });
  }
};

/* ================= Elemente UI ================= */
const drawTitleBlock = (doc: jsPDF, ctx: LayoutCtx, data: PdfSablonData) => {
  // Titlu mare
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(25);
  const titleLines = doc.splitTextToSize(safe(data.titlu), ctx.maxW);
  ensureSpace(doc, ctx, titleLines.length * 6 + 10);
  doc.text(titleLines, ctx.margin, ctx.y);
  ctx.y += titleLines.length * 6 + 2;

  // Meta-linie (doar ce avem)
  const meta: string[] = [];
  if (data.numarDosar) meta.push(`Dosar nr. ${data.numarDosar}`);
  if (meta.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(70);
    doc.text(meta.join("   |   "), ctx.margin, ctx.y + 6);
    ctx.y += 12;
  }

  // Linie accent
  doc.setDrawColor(...ctx.accent);
  doc.setLineWidth(0.6);
  doc.line(ctx.margin, ctx.y, ctx.pageW - ctx.margin, ctx.y);
  ctx.y += 6;
};

const sectionHeader = (doc: jsPDF, ctx: LayoutCtx, label: string) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(25);
  ensureSpace(doc, ctx, 8);
  doc.text(label, ctx.margin, ctx.y);
  ctx.y += 6;
};

const drawParagraphJustified = (
  doc: jsPDF,
  ctx: LayoutCtx,
  text: string,
  opts?: Paragraph
) => {
  const align: Align = opts?.align ?? "justify";
  const lineGap = clamp(opts?.lineGap ?? LINE_GAP_DEFAULT, 4, 7);
  const indent = clamp(opts?.indentFirstLine ?? 0, 0, 12);

  const chunks = safe(text).split("\n"); // păstrăm alineatele din textul sursă
  for (const chunk of chunks) {
    const lines = doc.splitTextToSize(chunk.trim(), ctx.maxW);
    if (!lines.length) {
      ctx.y += 2;
      continue;
    }
    // prima linie cu indent
    ensureSpace(doc, ctx, lineGap);
    doc.text(lines[0], ctx.margin + indent, ctx.y, { align });
    ctx.y += lineGap;

    // restul liniilor
    for (let i = 1; i < lines.length; i++) {
      ensureSpace(doc, ctx, lineGap);
      doc.text(lines[i], ctx.margin, ctx.y, { align });
      ctx.y += lineGap;
    }
    ctx.y += 2; // spațiu între paragrafe
  }
};

const drawConsiderente = (doc: jsPDF, ctx: LayoutCtx, sections?: Section[]) => {
  if (!sections?.length) return;

  // extragem secțiunile care există efectiv (din UI: "Parte Introductivă" și "Considerente")
  const intro = sections.find(s => s?.title?.toLowerCase().includes("introduct"));
  const consid = sections.find(s => s?.title?.toLowerCase().includes("consider"));

  // Parte introductivă (dacă există)
  if (intro?.paragraphs?.length) {
    sectionHeader(doc, ctx, "Parte introductivă");
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(45);
    intro.paragraphs.forEach(p => drawParagraphJustified(doc, ctx, p.text, p));
    ctx.y += 2;

    // separator discret
    doc.setDrawColor(210);
    doc.setLineWidth(0.4);
    ensureSpace(doc, ctx, 6);
    doc.line(ctx.margin, ctx.y, ctx.pageW - ctx.margin, ctx.y);
    ctx.y += 6;
  }

  // Considerente (dacă există)
  if (consid?.paragraphs?.length) {
    sectionHeader(doc, ctx, "Considerente");
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(45);
    consid.paragraphs.forEach(p => drawParagraphJustified(doc, ctx, p.text, p));
    ctx.y += 2;
  }
};

const drawDispozitiv = (doc: jsPDF, ctx: LayoutCtx, dispozitiv?: Paragraph[]) => {
  if (!dispozitiv?.length) return;

  // separator accent clar înainte de soluție
  doc.setDrawColor(...ctx.accent);
  doc.setLineWidth(0.8);
  ensureSpace(doc, ctx, 10);
  doc.line(ctx.margin, ctx.y + 2, ctx.pageW - ctx.margin, ctx.y + 2);
  ctx.y += 10;

  sectionHeader(doc, ctx, "Dispozitiv");
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(35);
  dispozitiv.forEach(p => drawParagraphJustified(doc, ctx, p.text, p));
  ctx.y += 2;
};

/* ================= Generator Principal ================= */
export const generatePdf = async (data: PdfSablonData, opts: PdfOptions = {}): Promise<Blob | void> => {
  const margin = opts.margin ?? DEF_MARGIN;
  const accent = opts.accent ?? ACCENT_DEFAULT;

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ctx: LayoutCtx = {
    y: margin,
    margin,
    pageW,
    pageH,
    maxW: pageW - margin * 2,
    accent,
  };

  // Header (branding VerdictLine / LegeaAplicata.ro)
  drawHeader(doc, ctx);

  // Titlu + meta (doar variabilele pe care le avem)
  drawTitleBlock(doc, ctx, data);

  // Considerente (Parte introductivă + Considerente) – numai ce e în `sectiuni`
  drawConsiderente(doc, ctx, data.sectiuni);

  // Dispozitiv (dacă există)
  drawDispozitiv(doc, ctx, data.dispozitiv);

  // Footer cu numerotare și branding
  drawFooterAllPages(doc, ctx);

  // livrare
  if (opts.returnBlob) return doc.output("blob");
  if (opts.openInNewWindow) {
    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const filename =
    opts.filename ||
    `${safe(data.titlu).replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
};
