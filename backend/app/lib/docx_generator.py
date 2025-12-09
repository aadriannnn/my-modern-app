"""
Academic .docx Document Generator for Legal Dissertations (Licență)

This module generates professionally formatted Word documents adhering to strict Romanian academic standards:
- Margins: 2.54 cm (1 inch) all around.
- Font: Times New Roman, 12pt.
- Spacing: 1.5 lines.
- Structure: Cover Page, Title Page, TOC, Introduction, Chapters, Conclusions, Bibliography.
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_LEADER
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from typing import Dict, Any, List
import logging
import re
import datetime

logger = logging.getLogger(__name__)

# Constants for placeholder values
DEFAULT_INSTITUTION = "UNIVERSITATEA [NUME INSTITUȚIE]\nFACULTATEA DE DREPT"
DEFAULT_SUPERVISOR = "Coordonator Științific:\nProf. Univ. Dr. [NUME PROFESOR]"
DEFAULT_AUTHOR = "Absolvent:\n[NUME STUDENT]"
DEFAULT_CITY_YEAR = f"București\n{datetime.datetime.now().year}"

def generate_academic_docx(report: Dict[str, Any], output_path: str) -> None:
    """
    Generate an academic .docx document from a final report structure.
    """
    try:
        logger.info(f"Starting .docx generation for report: {report.get('title', 'Untitled')[:50]}...")

        doc = Document()
        _apply_academic_styles(doc)

        # 1. Pagina de Gardă (Cover Page)
        _add_cover_page(doc, "LUCRARE DE LICENȚĂ", is_cover=True)

        # 2. Prima Pagină (Title Page) - Same layout but with actual Title
        real_title = report.get('title', 'TITLUL LUCRĂRII').upper()
        _add_cover_page(doc, real_title, is_cover=False)

        # 3. Cuprins (Table of Contents)
        _add_table_of_contents(doc, report)

        # 4. Introducere (Not numbered)
        _add_introduction(doc, report.get('introduction', {}))

        # 5. Conținut (Chapters)
        _add_chapters(doc, report.get('chapters', []))

        # 6. Concluzii (Not numbered usually, or numbered distinctly)
        _add_conclusions(doc, report.get('conclusions', {}))

        # 7. Bibliografie
        _add_bibliography(doc, report.get('bibliography', {}))

        doc.save(output_path)
        logger.info(f"Successfully generated .docx document at: {output_path}")

    except Exception as e:
        logger.error(f"Error generating .docx document: {e}", exc_info=True)
        raise


def _apply_academic_styles(doc: Document) -> None:
    """
    Configure document-wide academic styles.
    """
    # Margins 2.54 cm
    sections = doc.sections
    for section in sections:
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.page_height = Cm(29.7) # A4
        section.page_width = Cm(21.0)

        # Page numbers in footer (Bottom Center)
        footer = section.footer
        p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _add_page_number_field(p)

    # Normal Style: Times New Roman 12, Justified, 1.5 line spacing
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    pf = style.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    pf.first_line_indent = Cm(1.27)

    # Headings
    for i in range(1, 4):
        h_style = doc.styles[f'Heading {i}']
        h_font = h_style.font
        h_font.name = 'Times New Roman'
        h_font.color.rgb = RGBColor(0, 0, 0)
        h_font.bold = True
        pf = h_style.paragraph_format
        pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        pf.first_line_indent = Pt(0)
        pf.space_before = Pt(12)
        pf.space_after = Pt(12)

        if i == 1:
            h_font.size = Pt(14)
            h_font.all_caps = True
            pf.alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            h_font.size = Pt(12)
            h_font.all_caps = False
            pf.alignment = WD_ALIGN_PARAGRAPH.LEFT

    # Block Text for quotes
    if 'Block Text' not in doc.styles:
        bt_style = doc.styles.add_style('Block Text', WD_STYLE_TYPE.PARAGRAPH)
    else:
        bt_style = doc.styles['Block Text']

    bt_font = bt_style.font
    bt_font.name = 'Times New Roman'
    bt_font.size = Pt(11)
    bt_pf = bt_style.paragraph_format
    bt_pf.left_indent = Cm(1.27)
    bt_pf.right_indent = Cm(1.27)
    bt_pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
    bt_pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY


def _add_page_number_field(paragraph):
    run = paragraph.add_run()
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'PAGE'
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'end')
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(11)


def _add_cover_page(doc: Document, center_text: str, is_cover: bool = True) -> None:
    """
    Creates the strict layout:
    - Uppercase Institution (Centered, 12)
    - [Space]
    - CENTER TITLE (16, Caps, Bold) -> 'Lucrare de Licenta' or Actual Title
    - [Space]
    - Supervisor (Left, 12)
    - Student (Right, 12)
    - [Bottom]
    - City/Year (Centered, 12)
    """
    # Header: Institution
    p = doc.add_paragraph(DEFAULT_INSTITUTION)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Pt(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    for run in p.runs:
        run.font.bold = True
        run.font.size = Pt(12)

    # Spacing (adjust visually based on A4)
    for _ in range(8):
        doc.add_paragraph()

    # Center Text (Type or Title)
    p = doc.add_paragraph(center_text)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.bold = True
        run.font.size = Pt(16)
        run.font.all_caps = True

    # Spacing
    for _ in range(6):
        doc.add_paragraph()

    # Names Table (Supervisor Left, Student Right)
    table = doc.add_table(rows=1, cols=2)
    table.autofit = True

    # Left Cell: Supervisor
    cell_left = table.cell(0, 0)
    p_left = cell_left.paragraphs[0]
    p_left.text = DEFAULT_SUPERVISOR
    p_left.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for run in p_left.runs:
        run.font.size = Pt(12)
        run.font.bold = True

    # Right Cell: Student
    cell_right = table.cell(0, 1)
    p_right = cell_right.paragraphs[0]
    p_right.text = DEFAULT_AUTHOR
    p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for run in p_right.runs:
        run.font.size = Pt(12)
        run.font.bold = True

    # Push to bottom
    for _ in range(8):
        doc.add_paragraph()

    # City/Year
    p = doc.add_paragraph(DEFAULT_CITY_YEAR)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.size = Pt(12)
        run.font.bold = False

    doc.add_page_break()


def _add_table_of_contents(doc: Document, report: Dict[str, Any]) -> None:
    doc.add_heading('CUPRINS', level=1)

    # Simple static generation
    _add_toc_entry(doc, "Introducere")

    chapters = report.get('chapters', [])
    for ch in chapters:
        num = ch.get('chapter_number', '')
        title = ch.get('chapter_title', '')
        _add_toc_entry(doc, f"{num}. {title}", level=0)

        for sub in ch.get('subsections', []):
            s_num = sub.get('number', '')
            s_title = sub.get('title', '')
            _add_toc_entry(doc, f"{s_num} {s_title}", level=1)

    _add_toc_entry(doc, "Concluzii")
    _add_toc_entry(doc, "Bibliografie")

    doc.add_page_break()


def _add_toc_entry(doc: Document, text: str, level: int = 0):
    p = doc.add_paragraph()
    p.paragraph_format.tab_stops.add_tab_stop(Cm(16), alignment=WD_ALIGN_PARAGRAPH.RIGHT, leader=WD_TAB_LEADER.DOTS)
    p.paragraph_format.first_line_indent = Pt(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    if level == 0:
        run = p.add_run(text)
        run.font.bold = True
    else:
        p.paragraph_format.left_indent = Cm(1.0)
        run = p.add_run(text)


def _add_introduction(doc: Document, intro: Dict[str, Any]) -> None:
    doc.add_heading('INTRODUCERE', level=1)
    if not intro: return

    content_parts = []
    if intro.get('motivation'): content_parts.append(intro['motivation'])
    if intro.get('context'): content_parts.append(intro['context'])
    if intro.get('scope'): content_parts.append(intro['scope'])
    if intro.get('methodology'): content_parts.append(intro['methodology'])

    full_text = "\n\n".join(content_parts)
    if not full_text and intro.get('summary'):
        full_text = intro['summary']

    _process_text(doc, full_text)


def _add_chapters(doc: Document, chapters: List[Dict[str, Any]]) -> None:
    for ch in chapters:
        num = ch.get('chapter_number', '')
        title = ch.get('chapter_title', '')
        doc.add_heading(f"CAPITOLUL {num}. {title.upper()}", level=1)

        if ch.get('content'):
            _process_text(doc, ch['content'])

        for sub in ch.get('subsections', []):
            s_num = sub.get('number', '')
            s_title = sub.get('title', '')
            doc.add_heading(f"{s_num} {s_title}", level=2)
            if sub.get('content'):
                _process_text(doc, sub['content'])


def _add_conclusions(doc: Document, concl: Dict[str, Any]) -> None:
    doc.add_heading('CONCLUZII', level=1)
    text = ""
    if concl.get('summary_findings'): text += concl['summary_findings'] + "\n\n"
    if concl.get('final_perspective'): text += concl['final_perspective']
    if not text and concl.get('summary'): text = concl['summary']
    _process_text(doc, text)


def _add_bibliography(doc: Document, biblio: Dict[str, Any]) -> None:
    doc.add_page_break()
    doc.add_heading('BIBLIOGRAFIE', level=1)

    jurisprudence = biblio.get('jurisprudence', [])
    if not jurisprudence:
        p = doc.add_paragraph("Nu există surse citate.")
        return

    doc.add_heading('I. Jurisprudență', level=2)
    jurisprudence.sort(key=lambda x: x.get('citation', ''))

    for idx, item in enumerate(jurisprudence, 1):
        citation = item.get('citation', '')
        if citation:
            p = doc.add_paragraph(f"{idx}. {citation}")
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            p.paragraph_format.first_line_indent = Pt(0)
            p.paragraph_format.left_indent = Cm(1.0)
            p.paragraph_format.first_line_indent = Cm(-1.0)


def _process_text(doc: Document, text: str) -> None:
    if not text: return
    paragraphs = text.split('\n\n')
    for p_text in paragraphs:
        p_text = p_text.strip()
        if not p_text: continue

        if p_text.startswith('>') or (len(p_text) > 300 and ('"' in p_text or '„' in p_text)):
            style = 'Block Text'
            p_text = p_text.replace('>', '').strip()
        else:
            style = 'Normal'

        p = doc.add_paragraph(style=style)
        _process_inline_citations(p, p_text)


def _process_inline_citations(paragraph, text: str) -> None:
    pattern = r'\[\[CITATION:(\d+):(.*?)(?:\]\])'
    last_idx = 0
    for match in re.finditer(pattern, text):
        pre_text = text[last_idx:match.start()]
        if pre_text: paragraph.add_run(pre_text)

        title = match.group(2)
        _inject_footnote(paragraph, title)
        last_idx = match.end()

    if last_idx < len(text):
        paragraph.add_run(text[last_idx:])


def _inject_footnote(paragraph, text):
    try:
        part = paragraph.part
        if not hasattr(part, 'package'): return
        main_part = part.package.main_document_part
        footnotes_part = main_part.footnotes_part

        ids = [int(f.get(qn('w:id'))) for f in footnotes_part.element.findall(qn('w:footnote'))]
        next_id = (max(ids) if ids else 0) + 1

        footnote = OxmlElement('w:footnote')
        footnote.set(qn('w:id'), str(next_id))

        fp = OxmlElement('w:p')
        fpr = OxmlElement('w:pPr')
        fpstyle = OxmlElement('w:pStyle')
        fpstyle.set(qn('w:val'), 'FootnoteText')
        fpr.append(fpstyle)
        fp.append(fpr)

        frun = OxmlElement('w:r')
        frun.append(OxmlElement('w:footnoteRef'))
        fp.append(frun)

        ftrun = OxmlElement('w:r')
        fttext = OxmlElement('w:t')
        fttext.text = f" {text}"
        ftrun.append(fttext)
        fp.append(ftrun)

        footnote.append(fp)
        footnotes_part.element.append(footnote)

        run = paragraph.add_run()
        r = run._r
        fref = OxmlElement('w:footnoteReference')
        fref.set(qn('w:id'), str(next_id))
        r.append(fref)

    except Exception as e:
        logger.warning(f"Footnote injection failed: {e}")
        r = paragraph.add_run(f"[{text}]")
        r.font.superscript = True
