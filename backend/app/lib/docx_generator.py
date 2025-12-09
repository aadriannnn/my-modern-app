"""
Academic .docx Document Generator for Legal Dissertations

This module generates professionally formatted Word documents from final report JSON data,
following Romanian academic legal dissertation standards:
- Times New Roman 12pt body
- 2.54cm (1 inch) margins
- Double line spacing for body text
- Single spacing for block quotes and bibliography
- Real footnotes for citations
- Page numbers in footer
"""

from docx import Document
from docx.shared import Pt, Inches, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from typing import Dict, Any, List
import logging
import re

logger = logging.getLogger(__name__)


def generate_academic_docx(report: Dict[str, Any], output_path: str) -> None:
    """
    Generate an academic .docx document from a final report structure.

    Args:
        report: Final report dictionary with title, chapters, bibliography, etc.
        output_path: Absolute path where the .docx file should be saved
    """
    try:
        logger.info(f"Starting .docx generation for report: {report.get('title', 'Untitled')[:50]}...")

        # Create document
        doc = Document()

        # Apply academic styles and formatting
        _apply_academic_styles(doc)

        # Build document sections
        _add_cover_page(doc, report.get('title', 'Raport Final'), report.get('metadata', {}))
        _add_table_of_contents(doc, report.get('table_of_contents', []))
        _add_introduction(doc, report.get('introduction', {}))
        _add_chapters(doc, report.get('chapters', []))
        _add_conclusions(doc, report.get('conclusions', {}))
        _add_bibliography(doc, report.get('bibliography', {}))

        # Save document
        doc.save(output_path)
        logger.info(f"Successfully generated .docx document at: {output_path}")

    except Exception as e:
        logger.error(f"Error generating .docx document: {e}", exc_info=True)
        raise


def _apply_academic_styles(doc: Document) -> None:
    """
    Configure document-wide academic styles per Romanian university standards:
    - Page margins: 2.54cm (1 inch) all sides
    - Default font: Times New Roman 12pt
    - Line spacing: Double (2.0)
    - Block quotes: Indent 1.27cm, Single spacing, Empty line before/after
    """
    # Configure margins (1 inch = 2.54 cm)
    sections = doc.sections
    for section in sections:
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.page_height = Cm(29.7)  # A4
        section.page_width = Cm(21.0)   # A4

        # Add page numbers in footer
        footer = section.footer
        footer_para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        footer_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT

        # Add page number field
        run = footer_para.add_run()
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
        run.font.size = Pt(11)
        run.font.name = 'Times New Roman'

    # Configure Normal style (Double Spaced)
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)

    paragraph_format = style.paragraph_format
    paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    paragraph_format.first_line_indent = Cm(1.27) # Indent first line of normal paragraphs

    # Configure Heading styles
    for i in range(1, 4):
        heading_style = doc.styles[f'Heading {i}']
        heading_font = heading_style.font
        heading_font.name = 'Times New Roman'
        heading_font.bold = True
        heading_font.color.rgb = RGBColor(0, 0, 0)

        if i == 1:
            heading_font.size = Pt(16)
        elif i == 2:
            heading_font.size = Pt(14)
        else:
            heading_font.size = Pt(12)

        heading_format = heading_style.paragraph_format
        heading_format.space_before = Pt(12)
        heading_format.space_after = Pt(6)
        heading_format.keep_with_next = True
        heading_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE # Headings usually 1.5
        heading_format.first_line_indent = Pt(0)

    # Create BLOCK TEXT style for quotes
    # Indent 0.5" (1.27cm), Single Spacing
    try:
        block_style = doc.styles.add_style('Block Text', WD_STYLE_TYPE.PARAGRAPH)
        block_font = block_style.font
        block_font.name = 'Times New Roman'
        block_font.size = Pt(12)

        block_format = block_style.paragraph_format
        block_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        block_format.left_indent = Cm(1.27) # Indent whole block
        block_format.first_line_indent = Pt(0) # No extra first line indent
        block_format.space_before = Pt(12) # Empty line before
        block_format.space_after = Pt(12)  # Empty line after
        block_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    except:
        pass # Style might already exist


def _add_cover_page(doc: Document, title: str, metadata: Dict[str, Any]) -> None:
    """Add title page."""
    for _ in range(8):
        doc.add_paragraph()

    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_para.add_run(title)
    title_run.font.size = Pt(18)
    title_run.font.bold = True
    title_run.font.name = 'Times New Roman'

    doc.add_paragraph()
    subtitle_para = doc.add_paragraph()
    subtitle_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle_run = subtitle_para.add_run("Raport de Cercetare Juridică")
    subtitle_run.font.size = Pt(14)
    subtitle_run.font.name = 'Times New Roman'

    # Metadata
    doc.add_paragraph()
    doc.add_paragraph()
    if metadata:
        meta_para = doc.add_paragraph()
        meta_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        gen_time = metadata.get('generation_timestamp', '')
        if gen_time:
            from datetime import datetime
            try:
                dt = datetime.fromisoformat(gen_time.replace('Z', '+00:00'))
                formatted_date = dt.strftime('%d.%m.%Y')
                meta_para.add_run(f"\nGenerat: {formatted_date}\n").font.size = Pt(11)
            except:
                pass

    doc.add_page_break()


def _add_table_of_contents(doc: Document, toc_items: List[Dict[str, Any]]) -> None:
    """Add TOC."""
    doc.add_heading('Cuprins', level=1)
    doc.add_paragraph()

    for item in toc_items:
        chapter_num = item.get('chapter_number', '')
        chapter_title = item.get('chapter_title', '')

        toc_para = doc.add_paragraph()
        toc_para.paragraph_format.left_indent = Inches(0)
        toc_para.paragraph_format.first_line_indent = Inches(0)
        toc_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

        run = toc_para.add_run(f"{chapter_num}. {chapter_title}")
        run.font.bold = True

        subsections = item.get('subsections', [])
        for subsec in subsections:
            sub_num = subsec.get('number', '')
            sub_title = subsec.get('title', '')

            sub_para = doc.add_paragraph()
            sub_para.paragraph_format.left_indent = Inches(0.5)
            sub_para.paragraph_format.first_line_indent = Inches(0)
            sub_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

            sub_para.add_run(f"{sub_num} {sub_title}").font.size = Pt(11)

    doc.add_page_break()


def _add_introduction(doc: Document, introduction: Dict[str, Any]) -> None:
    doc.add_heading('Introducere', level=1)

    parts = [introduction.get('context'), introduction.get('scope'), introduction.get('methodology')]
    for part in parts:
        if part:
            _process_text_with_footnotes(doc, part)


def _add_chapters(doc: Document, chapters: List[Dict[str, Any]]) -> None:
    for chapter in chapters:
        doc.add_heading(f"{chapter.get('chapter_number', '')}. {chapter.get('chapter_title', '')}", level=1)

        content = chapter.get('content', '')
        if content:
            _process_text_with_footnotes(doc, content)

        for subsec in chapter.get('subsections', []):
            doc.add_heading(f"{subsec.get('number', '')} {subsec.get('title', '')}", level=2)
            sub_content = subsec.get('content', '')
            if sub_content:
                _process_text_with_footnotes(doc, sub_content)

        key_points = chapter.get('key_points', [])
        if key_points:
            doc.add_paragraph().add_run("Puncte cheie:").font.bold = True
            for point in key_points:
                # Use bullet style but process text for footnotes too
                p = doc.add_paragraph(style='List Bullet')
                _process_paragraph_text(p, point)


def _add_conclusions(doc: Document, conclusions: Dict[str, Any]) -> None:
    doc.add_heading('Concluzii', level=1)

    if conclusions.get('summary'):
        doc.add_heading('Rezumat', level=2)
        _process_text_with_footnotes(doc, conclusions['summary'])

    if conclusions.get('findings'):
        doc.add_heading('Constatări', level=2)
        for idx, finding in enumerate(conclusions['findings'], 1):
            p = doc.add_paragraph()
            p.add_run(f"{idx}. ").font.bold = True
            _process_paragraph_text(p, finding)


def _add_bibliography(doc: Document, bibliography: Dict[str, Any]) -> None:
    doc.add_page_break()
    doc.add_heading('Bibliografie', level=1)
    doc.add_heading('Jurisprudență', level=2)

    jurisprudence = bibliography.get('jurisprudence', [])
    if not jurisprudence:
        doc.add_paragraph("Nu există cazuri citate.").italic = True
        return

    sorted_cases = sorted(jurisprudence, key=lambda x: x.get('citation', ''))

    for idx, case in enumerate(sorted_cases, 1):
        citation = case.get('citation', 'N/A')

        # Bibliography Style: Single Spacing, Hanging Indent
        bib_para = doc.add_paragraph()
        bib_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        bib_para.paragraph_format.left_indent = Cm(1.27)
        bib_para.paragraph_format.first_line_indent = Cm(-1.27)
        bib_para.paragraph_format.space_after = Pt(6)

        bib_para.add_run(f"{idx}. ").font.size = Pt(10)
        bib_para.add_run(citation).font.size = Pt(11)


# --- Core Footnote & Text Processing Logic ---

def _process_text_with_footnotes(doc: Document, text: str) -> None:
    """
    Process raw text, detecting paragraphs, block quotes, and citations.
    Adds paragraphs to the document with appropriate styling and footnotes.
    """
    if not text:
        return

    paragraphs = text.split('\n\n')

    for para_text in paragraphs:
        para_text = para_text.strip()
        if not para_text:
            continue

        # Detect Block Quote
        # Criteria: Starts with ">" OR length > 300 chars (approx 3 lines)
        is_block_quote = para_text.startswith('>') or len(para_text) > 300

        if is_block_quote:
            # Clean leading '>' if present
            clean_text = para_text.lstrip('> ').strip()

            # User Rule: Block quotes must be in quotes "..."
            if not clean_text.startswith('"') and not clean_text.startswith('„'):
                clean_text = f'„{clean_text}”'

            p = doc.add_paragraph(style='Block Text')
            _process_paragraph_text(p, clean_text)
        else:
            # Normal paragraph
            p = doc.add_paragraph(style='Normal')
            _process_paragraph_text(p, para_text)


def _process_paragraph_text(paragraph, text: str) -> None:
    """
    Parses text for `[[CITATION:ID:Title]]` markers and adds runs/footnotes.
    """
    # Regex to find citations
    pattern = r'\[\[CITATION:(\d+):(.*?)(?:\]\])'

    last_idx = 0
    for match in re.finditer(pattern, text):
        # Add text before citation
        pre_text = text[last_idx:match.start()]
        if pre_text:
            paragraph.add_run(pre_text)

        # Process Citation
        case_id = match.group(1)
        title = match.group(2)

        # Add Footnote Reference
        # We need to access the document part to add the footnote relationship
        _add_footnote_xml(paragraph, title)

        last_idx = match.end()

    # Add remaining text
    if last_idx < len(text):
        paragraph.add_run(text[last_idx:])


def _add_footnote_xml(paragraph, footnote_text: str):
    """
    Injects a real Word footnote using low-level XML manipulation.
    This works by:
    1. Finding the footnotes part of the document
    2. Adding a new footnote definition
    3. Adding a reference to that footnote in value text
    """
    part = paragraph.part

    # Ensure footnotes part exists
    if not hasattr(part, 'footnotes_part'):
        # This is strictly hard to do without accessing the package directly if not already init
        # But usually python-docx creates it if we access it?
        # Actually python-docx doesn't explicitly expose 'footnotes_part' easily on '_Document'
        # We must assume the document handles it or use the relationships.
        pass

    # Hacky but standard way to add footnotes in python-docx:
    # We need to get the footnotes part from the package
    try:
        doc_part = part.package.main_document_part
        footnotes_part = doc_part.footnotes_part
    except:
        # If footnotes part doesn't exist, we fallback to inline text.
        run = paragraph.add_run(f" [Nota: {footnote_text}]")
        run.font.superscript = True
        return

    # Add footnote to the part
    footnote_id = _get_next_footnote_id(footnotes_part)

    namespace = footnotes_part.element.nsmap
    w = namespace['w'] if 'w' in namespace else 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

    footnote = OxmlElement('w:footnote')
    footnote.set(qn('w:id'), str(footnote_id))

    p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr')
    pStyle = OxmlElement('w:pStyle')
    pStyle.set(qn('w:val'), 'FootnoteText')
    pPr.append(pStyle)
    p.append(pPr)

    # Footnote Reference Marker in the footnote text itself
    r_ref = OxmlElement('w:r')
    rPr_ref = OxmlElement('w:rPr')
    rStyle_ref = OxmlElement('w:rStyle')
    rStyle_ref.set(qn('w:val'), 'FootnoteReference')
    rPr_ref.append(rStyle_ref)
    r_ref.append(rPr_ref)
    r_ref.append(OxmlElement('w:footnoteRef'))
    p.append(r_ref)

    # Space
    r_space = OxmlElement('w:r')
    t_space = OxmlElement('w:t')
    t_space.set(qn('xml:space'), 'preserve')
    t_space.text = ' '
    r_space.append(t_space)
    p.append(r_space)

    # Text
    r_text = OxmlElement('w:r')
    t_text = OxmlElement('w:t')
    t_text.text = footnote_text
    r_text.append(t_text)
    p.append(r_text)

    footnote.append(p)
    footnotes_part.element.append(footnote)

    # Now add the reference in the main paragraph
    run = paragraph.add_run()
    r = run._r

    footnote_ref = OxmlElement('w:footnoteReference')
    footnote_ref.set(qn('w:id'), str(footnote_id))
    r.append(footnote_ref)


def _get_next_footnote_id(footnotes_part):
    # Determine the next available ID
    ids = [int(f.get(qn('w:id'))) for f in footnotes_part.element.findall(qn('w:footnote'))]
    ids = [i for i in ids if i > 0]
    return max(ids) + 1 if ids else 1
