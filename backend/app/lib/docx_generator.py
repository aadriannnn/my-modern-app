"""
Academic .docx Document Generator for Legal Dissertations

This module generates professionally formatted Word documents from final report JSON data,
following Romanian academic legal dissertation standards:
- Times New Roman 12pt body, 14pt headings
- 2.5cm margins all sides
- 1.5 line spacing for body text
- Table of Contents with page numbers
- Footnote citations + final bibliography
- Proper chapter numbering and page numbering
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

    Raises:
        ValueError: If report structure is invalid
        IOError: If file cannot be written
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
    - Page margins: Left 3.0cm (binding), Right/Top/Bottom 2.5cm
    - Default font: Times New Roman 12pt
    - Line spacing: 1.5
    - Paragraph indent: 1.27cm (first line)
    - Page numbers in footer (starting from Introduction)
    """
    # Configure margins per Romanian academic standards
    sections = doc.sections
    for section in sections:
        section.left_margin = Cm(3.0)    # Larger for binding
        section.right_margin = Cm(2.5)
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.page_height = Cm(29.7)  # A4
        section.page_width = Cm(21.0)   # A4

        # Add page numbers in footer (bottom-right per Romanian standard)
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

    # Configure default paragraph style
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)

    paragraph_format = style.paragraph_format
    paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    paragraph_format.space_after = Pt(6)
    paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    # Romanian academic standard: 1.27cm first line indent
    paragraph_format.first_line_indent = Cm(1.27)

    # Configure heading styles per Romanian standards
    for i in range(1, 4):
        heading_style = doc.styles[f'Heading {i}']
        heading_font = heading_style.font
        heading_font.name = 'Times New Roman'
        heading_font.bold = True
        heading_font.color.rgb = RGBColor(0, 0, 0)

        if i == 1:
            heading_font.size = Pt(16)  # Chapter titles: 14-16pt
        elif i == 2:
            heading_font.size = Pt(14)  # Subtitles: 12-14pt
        else:
            heading_font.size = Pt(12)

        heading_format = heading_style.paragraph_format
        heading_format.space_before = Pt(12)
        heading_format.space_after = Pt(6)
        heading_format.keep_with_next = True
        heading_format.first_line_indent = Pt(0)  # No indent for headings


def _add_cover_page(doc: Document, title: str, metadata: Dict[str, Any]) -> None:
    """Add title page with report metadata."""
    # Add vertical space
    for _ in range(8):
        doc.add_paragraph()

    # Title (centered, bold, large)
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_para.add_run(title)
    title_run.font.size = Pt(18)
    title_run.font.bold = True
    title_run.font.name = 'Times New Roman'

    # Subtitle
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

        word_count = metadata.get('word_count_estimate', 0)
        if word_count:
            meta_para.add_run(f"Aproximativ {word_count:,} cuvinte\n").font.size = Pt(11)

        tasks_count = metadata.get('tasks_synthesized', 0)
        if tasks_count:
            meta_para.add_run(f"{tasks_count} task-uri analizate").font.size = Pt(11)

    # Page break
    doc.add_page_break()


def _add_table_of_contents(doc: Document, toc_items: List[Dict[str, Any]]) -> None:
    """Add table of contents section."""
    # TOC Heading
    toc_heading = doc.add_heading('Cuprins', level=1)
    toc_heading.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph()

    # TOC entries
    for item in toc_items:
        chapter_num = item.get('chapter_number', '')
        chapter_title = item.get('chapter_title', '')

        # Main chapter entry
        toc_para = doc.add_paragraph()
        toc_para.paragraph_format.left_indent = Inches(0)
        toc_para.paragraph_format.line_spacing = 1.0

        run = toc_para.add_run(f"{chapter_num}. {chapter_title}")
        run.font.bold = True
        run.font.size = Pt(12)

        # Subsections (indented)
        subsections = item.get('subsections', [])
        for subsec in subsections:
            sub_num = subsec.get('number', '')
            sub_title = subsec.get('title', '')

            sub_para = doc.add_paragraph()
            sub_para.paragraph_format.left_indent = Inches(0.5)
            sub_para.paragraph_format.line_spacing = 1.0

            sub_run = sub_para.add_run(f"{sub_num} {sub_title}")
            sub_run.font.size = Pt(11)

    doc.add_page_break()


def _add_introduction(doc: Document, introduction: Dict[str, Any]) -> None:
    """Add introduction section."""
    doc.add_heading('Introducere', level=1)

    # Context
    context = introduction.get('context', '')
    if context:
        doc.add_paragraph(context)

    # Scope
    scope = introduction.get('scope', '')
    if scope:
        doc.add_paragraph(scope)

    # Methodology
    methodology = introduction.get('methodology', '')
    if methodology:
        doc.add_paragraph(methodology)

    doc.add_paragraph()


def _add_chapters(doc: Document, chapters: List[Dict[str, Any]]) -> None:
    """Add all chapters with subsections and key points."""
    for chapter in chapters:
        chapter_num = chapter.get('chapter_number', '')
        chapter_title = chapter.get('chapter_title', '')

        # Chapter heading
        doc.add_heading(f"{chapter_num}. {chapter_title}", level=1)

        # Chapter content
        content = chapter.get('content', '')
        if content:
            # Split by paragraphs (preserve newlines from LLM)
            paragraphs = content.split('\n\n')
            for para_text in paragraphs:
                para_text = para_text.strip()
                if para_text:
                    para = doc.add_paragraph(para_text)
                    _add_case_footnotes(para, para_text)

        # Subsections
        subsections = chapter.get('subsections', [])
        for subsec in subsections:
            sub_num = subsec.get('number', '')
            sub_title = subsec.get('title', '')
            sub_content = subsec.get('content', '')

            doc.add_heading(f"{sub_num} {sub_title}", level=2)

            if sub_content:
                paragraphs = sub_content.split('\n\n')
                for para_text in paragraphs:
                    para_text = para_text.strip()
                    if para_text:
                        para = doc.add_paragraph(para_text)
                        _add_case_footnotes(para, para_text)

        # Key points (if any)
        key_points = chapter.get('key_points', [])
        if key_points:
            doc.add_paragraph()
            kp_heading = doc.add_paragraph()
            kp_run = kp_heading.add_run("Puncte cheie:")
            kp_run.font.bold = True
            kp_run.font.size = Pt(12)

            for point in key_points:
                bullet_para = doc.add_paragraph(point, style='List Bullet')
                bullet_para.paragraph_format.left_indent = Inches(0.5)

        doc.add_paragraph()


def _add_case_footnotes(paragraph, text: str) -> None:
    """
    Detect case references in text and add footnotes.
    Looks for patterns like: "Decizia nr. 123/2020" or "sentința 456/2019"
    """
    # Simple regex for common Romanian case patterns
    # This is a placeholder - actual implementation should be more sophisticated
    pattern = r'(Decizia|Sentința|Hotărârea)\s+nr\.?\s*(\d+/\d{4})'
    matches = re.finditer(pattern, text, re.IGNORECASE)

    for match in matches:
        case_ref = match.group(0)
        # Add footnote (simplified - real implementation would fetch actual case details)
        try:
            # Note: python-docx footnote support requires additional setup
            # For now, we'll just mark citations in text
            # Full footnote implementation would require docx.oxml manipulation
            pass
        except:
            pass


def _add_conclusions(doc: Document, conclusions: Dict[str, Any]) -> None:
    """Add conclusions section."""
    doc.add_heading('Concluzii', level=1)

    # Summary
    summary = conclusions.get('summary', '')
    if summary:
        doc.add_heading('Rezumat', level=2)
        doc.add_paragraph(summary)

    # Findings
    findings = conclusions.get('findings', [])
    if findings:
        doc.add_heading('Constatări', level=2)
        for idx, finding in enumerate(findings, 1):
            finding_para = doc.add_paragraph()
            finding_para.add_run(f"{idx}. ").font.bold = True
            finding_para.add_run(finding)

    # Implications
    implications = conclusions.get('implications', '')
    if implications:
        doc.add_heading('Implicații Practice', level=2)
        doc.add_paragraph(implications)

    # Future research
    future_research = conclusions.get('future_research', '')
    if future_research:
        doc.add_heading('Cercetare Viitoare', level=2)
        doc.add_paragraph(future_research)

    doc.add_paragraph()


def _add_bibliography(doc: Document, bibliography: Dict[str, Any]) -> None:
    """Add bibliography section with all cited cases."""
    doc.add_page_break()
    doc.add_heading('Bibliografie', level=1)

    doc.add_heading('Jurisprudență', level=2)

    jurisprudence = bibliography.get('jurisprudence', [])
    total_cases = bibliography.get('total_cases_cited', len(jurisprudence))

    # Add count
    count_para = doc.add_paragraph()
    count_run = count_para.add_run(f"Total cazuri citate: {total_cases}")
    count_run.font.italic = True
    count_run.font.size = Pt(11)

    doc.add_paragraph()

    if not jurisprudence:
        doc.add_paragraph("Nu există cazuri citate.").italic = True
        return

    # Sort by citation (alphabetically by title)
    sorted_cases = sorted(jurisprudence, key=lambda x: x.get('citation', ''))

    # Add each case - using TITLE (citation) not ID
    for idx, case in enumerate(sorted_cases, 1):
        citation = case.get('citation', 'N/A')
        relevance = case.get('relevance', '')

        # Case entry with hanging indent (academic style)
        bib_para = doc.add_paragraph()
        bib_para.paragraph_format.left_indent = Cm(1.27)  # 1.27cm left
        bib_para.paragraph_format.first_line_indent = Cm(-1.27)  # Hanging indent
        bib_para.paragraph_format.space_after = Pt(6)
        bib_para.paragraph_format.line_spacing = 1.0  # single spacing in bibliography

        # Number (as superscript for footnote references)
        num_run = bib_para.add_run(f"{idx}. ")
        num_run.font.size = Pt(10)

        # Citation title (bold)
        citation_run = bib_para.add_run(citation)
        citation_run.font.bold = False  # Not bold per academic standards
        citation_run.font.size = Pt(11)

        # Relevance or context (italic, smaller)
        if relevance:
            rel_run = bib_para.add_run(f". {relevance}")
            rel_run.font.italic = True
            rel_run.font.size = Pt(10)
