import io
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER

def generate_pdf_content(model_data: dict) -> bytes:
    """
    Generates a PDF file for the given document model.
    Returns the PDF content as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )

    styles = getSampleStyleSheet()

    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=10*mm
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=4*mm
    )

    metadata_style = ParagraphStyle(
        'Metadata',
        parent=styles['Normal'],
        fontSize=9,
        textColor='grey',
        spaceAfter=2*mm
    )

    story = []

    # Add Title
    story.append(Paragraph(model_data.get('titlu_model', 'Document Model'), title_style))

    # Add Metadata (optional)
    if model_data.get('materie_model'):
        story.append(Paragraph(f"Materie: {model_data['materie_model']}", metadata_style))
    if model_data.get('obiect_model'):
        story.append(Paragraph(f"Obiect: {model_data['obiect_model']}", metadata_style))

    story.append(Spacer(1, 5*mm))

    # Add Content
    # Handle newlines in text_model by replacing them with <br/> or splitting into paragraphs
    text_content = model_data.get('text_model', '')

    # Simple handling of paragraphs based on double newlines
    paragraphs = text_content.split('\n\n')

    for para in paragraphs:
        if para.strip():
            # Replace single newlines with <br/> for line breaks within paragraph
            formatted_para = para.replace('\n', '<br/>')
            story.append(Paragraph(formatted_para, body_style))

    doc.build(story)

    buffer.seek(0)
    return buffer.getvalue()
