import logo from "@/assets/icons/logo.webp";

// Type definitions (avoiding importing the whole library for types if possible, or use 'import type')
import type { jsPDF as jsPDFType } from "jspdf";

/* ================= Helpers ================= */
const safe = (v?: any) => (v ? String(v) : "");

/* ================= Tipuri ================= */
export type PdfSablonData = {
  titlu: string;
  materie: string;
  obiect: string;
  instanta: string;

  parte_introductiva: string;
  considerente_speta: string;
  dispozitiv_speta: string;

  numarDosar?: string;
  generic_content?: string; // For generic documents like models
};

export type PdfOptions = {
  filename?: string;
  margin?: number;
  openInNewWindow?: boolean;
  returnBlob?: boolean;
  autoPrint?: boolean;
};

/* ================= Layout ================= */
const DEF_MARGIN = 18;
const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 14;
const LINE_GAP_DEFAULT = 5;

interface LayoutCtx {
  y: number;
  margin: number;
  pageW: number;
  pageH: number;
  maxW: number;
}

/* ================= Tools ================= */
const needBreak = (ctx: LayoutCtx, needed: number) =>
  ctx.y + needed > ctx.pageH - FOOTER_HEIGHT;

const ensureSpace = (doc: jsPDFType, ctx: LayoutCtx, needed: number) => {
  if (needBreak(ctx, needed)) {
    doc.addPage();
    drawHeader(doc, ctx);
  }
};

/* ================= HEADER ================= */
const drawHeader = (doc: jsPDFType, ctx: LayoutCtx) => {
  const xRight = ctx.pageW - ctx.margin - 40;

  // Logo în dreapta sus
  doc.addImage(logo, "WEBP", xRight, ctx.margin - 2, 40, 18);

  // Data (sub logo)
  const today = new Date().toLocaleDateString("ro-RO");
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(10);
  doc.text(today, xRight + 40, ctx.margin + 20, { align: "right" });

  // Linie subtire
  doc.setDrawColor(190);
  doc.setLineWidth(0.4);
  doc.line(ctx.margin, ctx.margin + 24, ctx.pageW - ctx.margin, ctx.margin + 24);

  ctx.y = ctx.margin + HEADER_HEIGHT;
};

/* ================= META INFO ================= */
const drawMetaInfo = (doc: jsPDFType, ctx: LayoutCtx, data: PdfSablonData) => {
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(12);
  doc.setTextColor(20);

  const lines = [
    `Materie: ${data.materie}`,
    `Obiect: ${data.obiect}`,
    `Instanța: ${data.instanta}`,
  ];

  lines.forEach((line) => {
    ensureSpace(doc, ctx, 6);
    doc.text(line, ctx.margin, ctx.y);
    ctx.y += 6;
  });

  ctx.y += 4;
};

/* ================= TITLU ================= */
const drawTitle = (doc: jsPDFType, ctx: LayoutCtx, data: PdfSablonData) => {
  const title = safe(data.titlu);

  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(15);

  const lines = doc.splitTextToSize(title, ctx.maxW);
  ensureSpace(doc, ctx, lines.length * 6 + 8);
  doc.text(lines, ctx.pageW / 2, ctx.y, { align: "center" });

  ctx.y += lines.length * 6 + 10;

  if (data.numarDosar) {
    doc.setFont("DejaVuSans", "italic");
    doc.setFontSize(11);
    doc.text(`Dosar nr. ${data.numarDosar}`, ctx.pageW / 2, ctx.y, { align: "center" });
    ctx.y += 10;
  }
};

/* ================= UTILITATE TEXT ================= */
const drawParagraphJustified = (doc: jsPDFType, ctx: LayoutCtx, text: string, bold = false) => {
  const chunks = safe(text).split("\n");

  doc.setFont(bold ? "DejaVuSans-Bold" : "DejaVuSans", "normal");
  doc.setFontSize(12);
  doc.setTextColor(30);

  for (const chunk of chunks) {
    const lines = doc.splitTextToSize(chunk.trim(), ctx.maxW);
    for (const line of lines) {
      ensureSpace(doc, ctx, LINE_GAP_DEFAULT);
      doc.text(line, ctx.margin, ctx.y, { align: "justify" });
      ctx.y += LINE_GAP_DEFAULT;
    }
    ctx.y += 2;
  }
};

/* ================= SECȚIUNE GENERICĂ ================= */
const drawSectionTitle = (doc: jsPDFType, ctx: LayoutCtx, title: string) => {
  ensureSpace(doc, ctx, 10);
  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(13);
  doc.text(title, ctx.margin, ctx.y);
  ctx.y += 8;
};

/* ================= SECȚIUNI CONCRETE ================= */
const drawParteaIntro = (doc: jsPDFType, ctx: LayoutCtx, text: string) => {
  drawSectionTitle(doc, ctx, "I. Practicaua");
  drawParagraphJustified(doc, ctx, text);
};

const drawConsiderente = (doc: jsPDFType, ctx: LayoutCtx, text: string) => {
  drawSectionTitle(doc, ctx, "II. Considerente");
  drawParagraphJustified(doc, ctx, text);
};

const drawDispozitiv = (doc: jsPDFType, ctx: LayoutCtx, text: string) => {
  drawSectionTitle(doc, ctx, "III. Dispozitiv");
  drawParagraphJustified(doc, ctx, text, true); // TOT BOLD
};

/* ================= FOOTER ================= */
const drawFooterAllPages = (doc: jsPDFType, ctx: LayoutCtx) => {
  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const y = ctx.pageH - 8;

    doc.setFont("DejaVuSans", "italic");
    doc.setFontSize(10);
    doc.text(`Pagina ${i} din ${total}`, ctx.pageW / 2, y, { align: "center" });
  }
};

/* ================= LOADER ================= */
// Helper to dynamically load dependencies
const loadDependencies = async () => {
  const [jsPDFModule] = await Promise.all([
    import("jspdf"),
    // @ts-ignore
    import("@/assets/fonts/DejaVuSans.js"),
    // @ts-ignore
    import("@/assets/fonts/DejaVuSans-Bold-normal.js"),
  ]);

  return { jsPDF: jsPDFModule.jsPDF };
};

/* ================= GENERATOR ================= */
export const generatePdf = async (data: PdfSablonData, opts: PdfOptions = {}): Promise<Blob | void> => {
  // Load dependencies only when needed
  const { jsPDF } = await loadDependencies();

  const margin = opts.margin ?? DEF_MARGIN;

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setFont("DejaVuSans", "normal");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const ctx: LayoutCtx = {
    y: margin,
    margin,
    pageW,
    pageH,
    maxW: pageW - margin * 2,
  };

  drawHeader(doc, ctx);
  drawMetaInfo(doc, ctx, data);
  drawTitle(doc, ctx, data);

  if (data.generic_content) {
    drawParagraphJustified(doc, ctx, data.generic_content);
  } else {
    drawParteaIntro(doc, ctx, data.parte_introductiva);
    drawConsiderente(doc, ctx, data.considerente_speta);
    drawDispozitiv(doc, ctx, data.dispozitiv_speta);
  }

  drawFooterAllPages(doc, ctx);

  if (opts.returnBlob) return doc.output("blob");

  if (opts.autoPrint) {
    doc.autoPrint();
    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  if (opts.openInNewWindow) {
    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const file =
    opts.filename ||
    `${safe(data.titlu).replace(/\s+/g, "_")}.pdf`;

  doc.save(file);
};

export const generateModelPdf = async (modelData: {
  titlu_model: string;
  text_model: string;
  materie_model?: string;
  obiect_model?: string;
  sursa_model?: string;
}): Promise<void> => {
  // Load dependencies only when needed
  const { jsPDF } = await loadDependencies();

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setFont("DejaVuSans", "normal");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = DEF_MARGIN;

  const ctx: LayoutCtx = {
    y: margin,
    margin,
    pageW,
    pageH,
    maxW: pageW - margin * 2,
  };

  drawHeader(doc, ctx);

  // Metadata
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);

  if (modelData.materie_model) {
    doc.text(`Materie: ${modelData.materie_model}`, ctx.margin, ctx.y);
    ctx.y += 5;
  }
  if (modelData.obiect_model) {
    doc.text(`Obiect: ${modelData.obiect_model}`, ctx.margin, ctx.y);
    ctx.y += 5;
  }
  if (modelData.sursa_model) {
    doc.text(`Sursă: ${modelData.sursa_model}`, ctx.margin, ctx.y);
    ctx.y += 5;
  }

  ctx.y += 10;

  // Title
  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0);

  const titleLines = doc.splitTextToSize(modelData.titlu_model, ctx.maxW);
  ensureSpace(doc, ctx, titleLines.length * 7 + 10);
  doc.text(titleLines, ctx.pageW / 2, ctx.y, { align: "center" });
  ctx.y += titleLines.length * 7 + 10;

  // Content
  drawParagraphJustified(doc, ctx, modelData.text_model);

  drawFooterAllPages(doc, ctx);

  const file = `${safe(modelData.titlu_model).replace(/\s+/g, "_")}.pdf`;
  doc.save(file);
};
