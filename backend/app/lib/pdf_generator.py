import io
import logging
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER

logger = logging.getLogger(__name__)

def generate_pdf_content(model_data: dict) -> bytes:
    """
    Generates a PDF file for the given document model.
    Returns the PDF content as bytes.
    ROBUST: Handles missing fields with intelligent fallbacks.
    """
    try:
        logger.info(f"Starting PDF generation for: {model_data.get('titlu_model', 'Untitled')[:50]}...")
        logger.info(f"📊 Model data keys: {list(model_data.keys())}")

        # Validate input
        if not model_data or not isinstance(model_data, dict):
            logger.error("❌ model_data is not a valid dict, using fallback")
            model_data = {}

        buffer = io.BytesIO()

        try:
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=20*mm,
                leftMargin=20*mm,
                topMargin=20*mm,
                bottomMargin=20*mm
            )
        except Exception as e:
            logger.error(f"❌ Error creating SimpleDocTemplate: {e}", exc_info=True)
            raise

        styles = getSampleStyleSheet()

        # Create custom styles with error handling
        try:
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
        except Exception as e:
            logger.error(f"❌ Error creating custom styles: {e}", exc_info=True)
            # Use default styles as fallback
            title_style = styles['Heading1']
            body_style = styles['Normal']
            metadata_style = styles['Normal']

        story = []

        # Add Title with fallback
        try:
            title_text = model_data.get('titlu_model', 'Document Model')
            if not title_text or not isinstance(title_text, str):
                logger.warning("⚠️ Invalid title, using fallback")
                title_text = 'Document Model'
            story.append(Paragraph(title_text, title_style))
        except Exception as e:
            logger.error(f"❌ Error adding title: {e}", exc_info=True)
            story.append(Paragraph('Document Model', title_style))

        # Add Metadata with error handling
        try:
            if model_data.get('materie_model') and isinstance(model_data.get('materie_model'), str):
                story.append(Paragraph(f"Materie: {model_data['materie_model']}", metadata_style))
        except Exception as e:
            logger.warning(f"⚠️ Could not add materie_model metadata: {e}")

        try:
            if model_data.get('obiect_model') and isinstance(model_data.get('obiect_model'), str):
                story.append(Paragraph(f"Obiect: {model_data['obiect_model']}", metadata_style))
        except Exception as e:
            logger.warning(f"⚠️ Could not add obiect_model metadata: {e}")

        story.append(Spacer(1, 5*mm))

        # Add Content with robust handling
        try:
            text_content = model_data.get('text_model', '')

            # Validate text content
            if not text_content or not isinstance(text_content, str):
                logger.warning("⚠️ No valid text_model, using placeholder")
                text_content = "Conținut indisponibil."

            # Simple handling of paragraphs based on double newlines
            paragraphs = text_content.split('\n\n')

            if not paragraphs or all(not p.strip() for p in paragraphs):
                logger.warning("⚠️ No valid paragraphs found, adding placeholder")
                paragraphs = ["Conținut indisponibil."]

            for para in paragraphs:
                para = para.strip()
                if para:
                    try:
                        # Replace single newlines with <br/> for line breaks within paragraph
                        # Escape special HTML characters
                        formatted_para = para.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                        formatted_para = formatted_para.replace('\n', '<br/>')
                        story.append(Paragraph(formatted_para, body_style))
                    except Exception as e:
                        logger.warning(f"⚠️ Could not add paragraph: {e}")
                        # Try to add plain text version
                        try:
                            story.append(Paragraph(para[:500], body_style))  # Limit length
                        except:
                            logger.error(f"❌ Failed to add even truncated paragraph")
        except Exception as e:
            logger.error(f"❌ Error processing text content: {e}", exc_info=True)
            # Add error message to PDF
            story.append(Paragraph("[Eroare la procesarea conținutului]", body_style))

        # Build PDF with final error handling
        try:
            if not story:
                logger.warning("⚠️ Empty story, adding placeholder")
                story.append(Paragraph("Document gol.", body_style))

            doc.build(story)
            logger.info(f"✅ Successfully generated PDF with {len(story)} elements")
        except Exception as e:
            logger.error(f"❌ Error building PDF document: {e}", exc_info=True)
            raise

        buffer.seek(0)
        return buffer.getvalue()

    except Exception as e:
        logger.error(f"❌ CRITICAL ERROR generating PDF: {e}", exc_info=True)
        raise
