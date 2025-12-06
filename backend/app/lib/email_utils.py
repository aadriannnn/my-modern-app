# backend/app/lib/email_utils.py
"""
Email utility module for sending analysis completion notifications via Brevo.
Adapted from the legacy email_sender.py for advanced analysis notifications.
"""
import os
import logging
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from typing import Optional, Dict, Any
import asyncio
from datetime import datetime

# Monkey patch for urllib3 < 2.0 compatibility required by sib-api-v3-sdk
import urllib3
from urllib3.response import HTTPResponse

if not hasattr(HTTPResponse, 'getheaders'):
    def getheaders(self):
        return self.headers
    HTTPResponse.getheaders = getheaders

logger = logging.getLogger(__name__)

# Configuration from environment variables
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
DEFAULT_SENDER_EMAIL = os.getenv("DEFAULT_SENDER_EMAIL", "nicolauadi3@gmail.com")
DEFAULT_SENDER_NAME = os.getenv("DEFAULT_SENDER_NAME", "LegeaApp")
ANALYSIS_NOTIFICATION_SENDER_EMAIL = os.getenv("ANALYSIS_NOTIFICATION_SENDER_EMAIL", DEFAULT_SENDER_EMAIL)
ENABLE_EMAIL_NOTIFICATIONS = os.getenv("ENABLE_EMAIL_NOTIFICATIONS", "true").lower() == "true"

# Initialize Brevo API client
brevo_config = None
transactional_emails_api = None

if BREVO_API_KEY:
    # Log masked API key for debugging
    masked_key = f"{BREVO_API_KEY[:4]}...{BREVO_API_KEY[-4:]}" if len(BREVO_API_KEY) > 8 else "***"
    logger.info(f"Initializing Brevo API client with key: {masked_key}")

    brevo_config = sib_api_v3_sdk.Configuration()
    brevo_config.api_key['api-key'] = BREVO_API_KEY
    try:
        api_client = sib_api_v3_sdk.ApiClient(brevo_config)
        transactional_emails_api = sib_api_v3_sdk.TransactionalEmailsApi(api_client)
        logger.info("Brevo API client initialized successfully for analysis notifications.")
    except Exception as e:
        logger.error(f"Error initializing Brevo API client: {e}", exc_info=True)
        transactional_emails_api = None
else:
    logger.warning("BREVO_API_KEY not set. Email notifications will be disabled.")


def send_email(
    recipient_email: str,
    subject: str,
    html_content: str,
    recipient_name: Optional[str] = None,
    sender_email: Optional[str] = None,
    sender_name: Optional[str] = None,
) -> bool:
    """
    Send an email using Brevo API.

    Args:
        recipient_email: Email address of the recipient
        subject: Email subject line
        html_content: HTML content of the email
        recipient_name: Optional name of the recipient
        sender_email: Optional sender email (defaults to ANALYSIS_NOTIFICATION_SENDER_EMAIL)
        sender_name: Optional sender name (defaults to DEFAULT_SENDER_NAME)

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not transactional_emails_api:
        logger.error("Brevo API is not configured. Cannot send email.")
        return False

    if not ENABLE_EMAIL_NOTIFICATIONS:
        logger.info(f"Email notifications are disabled. Would have sent to: {recipient_email}")
        return False

    effective_sender_email = sender_email or ANALYSIS_NOTIFICATION_SENDER_EMAIL
    effective_sender_name = sender_name or DEFAULT_SENDER_NAME

    to_recipient = [{"email": recipient_email, "name": recipient_name}] if recipient_name else [{"email": recipient_email}]

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=to_recipient,
        sender={"email": effective_sender_email, "name": effective_sender_name},
        subject=subject,
        html_content=html_content,
    )

    try:
        logger.info(f"Attempting to send email to: {recipient_email} with subject: '{subject}'")
        logger.debug(f"Sender: {effective_sender_email} ({effective_sender_name})")

        # Log before actual API call to confirm we are reaching this point
        logger.info("Calling transactional_emails_api.send_transac_email...")
        api_response = transactional_emails_api.send_transac_email(send_smtp_email)

        logger.info(f"Email sent successfully to {recipient_email}. Message ID: {api_response.message_id if hasattr(api_response, 'message_id') else api_response}")
        logger.debug(f"Full API Response: {api_response}")
        return True
    except ApiException as e:
        logger.error(f"Brevo API error: {e.status} {e.reason} - {e.body}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"General error sending email to {recipient_email}: {e}", exc_info=True)
        return False


async def send_analysis_completion_email(
    recipient_email: str,
    user_query: str,
    analysis_summary: Dict[str, Any],
    execution_time_seconds: float,
    plan_id: str
) -> bool:
    """
    Send an email notification when an advanced analysis completes successfully.

    Args:
        recipient_email: User's email address
        user_query: Original user query that was analyzed
        analysis_summary: Dictionary containing analysis results summary
        execution_time_seconds: Time taken to complete the analysis
        plan_id: ID of the analysis plan

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Format execution time
        if execution_time_seconds < 60:
            execution_time_str = f"{int(execution_time_seconds)} secunde"
        else:
            minutes = int(execution_time_seconds / 60)
            execution_time_str = f"{minutes} minute" if minutes == 1 else f"{minutes} minute"

        # Extract key metrics from analysis summary
        total_cases = analysis_summary.get('total_cases_analyzed', 'N/A')
        interpretation_preview = analysis_summary.get('interpretation', '')[:300]

        # Build subject line
        query_preview = user_query[:50] + "..." if len(user_query) > 50 else user_query
        subject = f"Analiza Juridică Completată - {query_preview}"

        # Build HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }}
                .metric {{ background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }}
                .metric-label {{ font-weight: bold; color: #555; font-size: 12px; text-transform: uppercase; }}
                .metric-value {{ font-size: 24px; color: #333; margin-top: 5px; }}
                .query-box {{ background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d0d9ff; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .success-badge {{ display: inline-block; background: #28a745; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Analiza Juridică Completată</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">LegeaApp - Analiză Avansată</p>
                </div>
                <div class="content">
                    <p><span class="success-badge">FINALIZAT CU SUCCES</span></p>

                    <h2 style="color: #667eea; margin-top: 20px;">Întrebarea Dvs.:</h2>
                    <div class="query-box">
                        <p style="margin: 0; font-style: italic;">"{user_query}"</p>
                    </div>

                    <h2 style="color: #667eea;">Metrici Analiză:</h2>
                    <div class="metric">
                        <div class="metric-label">Cazuri Analizate</div>
                        <div class="metric-value">{total_cases}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Timp de Execuție</div>
                        <div class="metric-value">{execution_time_str}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">ID Plan</div>
                        <div class="metric-value" style="font-size: 14px; font-family: monospace;">{plan_id}</div>
                    </div>

                    <h2 style="color: #667eea;">Preview Rezultate:</h2>
                    <p style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 14px;">
                        {interpretation_preview}...
                    </p>

                    <p style="text-align: center; margin-top: 30px;">
                        <strong>Rezultatele complete sunt disponibile în aplicație.</strong>
                    </p>

                    <p style="color: #666; font-size: 13px; margin-top: 30px;">
                        <em>Notă: Acest email a fost trimis automat deoarece ați solicitat notificări pentru analiza avansată.
                        Analize care durează mult timp pot fi finalizate în fundal, permițându-vă să continuați alte activități.</em>
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">© 2025 LegeaApp - Platforma de Jurisprudență</p>
                    <p style="margin: 5px 0 0 0;">Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Send email asynchronously
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None,
            send_email,
            recipient_email,
            subject,
            html_content,
            None,  # recipient_name
            None,  # sender_email (use default)
            None,  # sender_name (use default)
        )

        if success:
            logger.info(f"Analysis completion email sent successfully to {recipient_email} for plan {plan_id}")
        else:
            logger.error(f"Failed to send analysis completion email to {recipient_email} for plan {plan_id}")

        return success

    except Exception as e:
        logger.exception(f"Error in send_analysis_completion_email: {e}")
        return False


async def send_analysis_error_email(
    recipient_email: str,
    user_query: str,
    error_message: str,
    plan_id: str
) -> bool:
    """
    Send an email notification when an advanced analysis fails.

    Args:
        recipient_email: User's email address
        user_query: Original user query that was being analyzed
        error_message: Error message describing what went wrong
        plan_id: ID of the analysis plan

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Build subject line
        query_preview = user_query[:50] + "..." if len(user_query) > 50 else user_query
        subject = f"Eroare în Analiza Juridică - {query_preview}"

        # Build HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }}
                .error-box {{ background: #fff5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #dc3545; border-radius: 4px; }}
                .query-box {{ background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d0d9ff; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 8px 8px; }}
                .error-badge {{ display: inline-block; background: #dc3545; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Eroare în Analiza Juridică</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">LegeaApp - Analiză Avansată</p>
                </div>
                <div class="content">
                    <p><span class="error-badge">EROARE</span></p>

                    <p>Din păcate, analiza avansată a întâmpinat o eroare și nu a putut fi finalizată.</p>

                    <h2 style="color: #dc3545; margin-top: 20px;">Întrebarea Dvs.:</h2>
                    <div class="query-box">
                        <p style="margin: 0; font-style: italic;">"{user_query}"</p>
                    </div>

                    <h2 style="color: #dc3545;">Detalii Eroare:</h2>
                    <div class="error-box">
                        <p style="margin: 0; font-family: monospace; font-size: 13px;">{error_message}</p>
                    </div>

                    <p><strong>ID Plan:</strong> <code>{plan_id}</code></p>

                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                    <p style="color: #666;">
                        <strong>Ce puteți face:</strong>
                    </p>
                    <ul style="color: #666;">
                        <li>Încercați să reformulați întrebarea și să reluați analiza</li>
                        <li>Verificați dacă termenii utilizați sunt corecți</li>
                        <li>Dacă eroarea persistă, vă rugăm să contactați echipa de suport</li>
                    </ul>

                    <p style="color: #666; font-size: 13px; margin-top: 30px;">
                        <em>Acest email a fost trimis automat pentru a vă informa despre statusul analizei solicitate.</em>
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">© 2025 LegeaApp - Platforma de Jurisprudență</p>
                    <p style="margin: 5px 0 0 0;">Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Send email asynchronously
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None,
            send_email,
            recipient_email,
            subject,
            html_content,
        )

        if success:
            logger.info(f"Analysis error email sent successfully to {recipient_email} for plan {plan_id}")
        else:
            logger.error(f"Failed to send analysis error email to {recipient_email} for plan {plan_id}")

        return success

    except Exception as e:
        logger.exception(f"Error in send_analysis_error_email: {e}")
        return False
