# backend/app/routers/avocat_routes.py
import logging
import os
from fastapi import APIRouter, HTTPException, Request, status, BackgroundTasks, Depends
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Reîncarcă variabilele de mediu în caz că rulezi acest modul separat
load_dotenv()

# Importă funcția de trimitere email din modulul partajat
try:
    from backend.app.email_sender import send_email, DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_NAME
    if not DEFAULT_SENDER_EMAIL:
        raise ImportError("DEFAULT_SENDER_EMAIL not configured in email_sender or .env")
    if not callable(send_email):
         raise ImportError("Imported 'send_email' is not callable.")
except ImportError as e:
    logging.getLogger(__name__).critical(f"CRITICAL Failure importing send_email: {e}", exc_info=True)
    # Definim o funcție dummy sincronă pentru a evita erori ulterioare dacă importul eșuează
    def send_email(*args, **kwargs): # Dummy synchronous function
        logging.getLogger(__name__).error("DUMMY send_email called due to import error.")
        return False # Returnăm boolean, așa cum face funcția reală
    DEFAULT_SENDER_EMAIL = "fallback_sender@example.com"
    DEFAULT_SENDER_NAME = "System Error"

# Database and model imports
try:
    from backend.app.models import get_db, ClientRequest, BUCHAREST_TZ
except ImportError as e:
    logging.getLogger(__name__).critical(f"CRITICAL Failure importing database models: {e}", exc_info=True)
    # Define dummy get_db and ClientRequest if import fails to prevent further startup errors
    def get_db():
        logging.error("DUMMY get_db called due to import error.")
        raise HTTPException(status_code=503, detail="Database service unavailable due to import error.")
    class ClientRequest: pass # Dummy class
    class BUCHAREST_TZ: pass # Dummy class


logger = logging.getLogger(__name__)
router = APIRouter()

# --- Pydantic Models ---
class SolicitareAvocat(BaseModel):
    nume: str = Field(..., min_length=3)
    email: EmailStr
    telefon: Optional[str] = None
    tipClient: str
    serviciiSelectate: List[str] = Field(..., min_length=1)
    reprezentare: str
    localitate: str = Field(..., min_length=2)
    descriere: str = Field(..., min_length=100)
    gdpr: bool

    @field_validator('gdpr')
    @classmethod
    def check_gdpr(cls, v):
        if not v:
            raise ValueError("Acordul GDPR este obligatoriu.")
        return v

class SolicitareTelefonica(BaseModel):
    telefonSolicitant: str
    numeSolicitant: str = Field(default='Nespecificat')
    mesaj: str = Field(default='Solicitare contact telefonic via exit pop-up')

# --- Configuration ---
TARGET_EMAIL = os.getenv("AVOCAT_TARGET_EMAIL")
if not TARGET_EMAIL:
    logger.error("CRITICAL CONFIG ERROR: AVOCAT_TARGET_EMAIL is not set in the .env file! Emails will fail.")
    TARGET_EMAIL = None # Setăm la None pentru a putea verifica în endpoint
else:
    logger.info(f"Target email for lawyer requests configured to: {TARGET_EMAIL}")

# --- Helper Functions ---
def format_html_email_solicitare(data: SolicitareAvocat) -> str:
    """Construiește corpul HTML detaliat pentru emailul principal."""
    telefon_display = data.telefon if data.telefon else 'Nespecificat'
    servicii_html = "".join([f"<li>{serviciu}</li>" for serviciu in data.serviciiSelectate])
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    descriere_html = data.descriere.replace('\n', "<br>") # Preserve line breaks using <br>
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Solicitare Nouă Asistență Juridică</title>
        <style>
            body {{ font-family: sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }}
            h1 {{ color: #5a2d82; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
            strong {{ color: #555; }}
            ul {{ list-style: disc; margin-left: 20px; }}
            .section {{ margin-bottom: 20px; }}
            .description-box {{ border: 1px dashed #ccc; padding: 15px; margin-top: 10px; background-color: #f9f9f9; white-space: pre-wrap; word-wrap: break-word; }}
            .footer {{ font-size: 0.9em; color: #777; margin-top: 25px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Solicitare Nouă Asistență Juridică</h1>
            <div class="section">
                <strong>Nume Client:</strong> {data.nume}<br>
                <strong>Email:</strong> {data.email}<br>
                <strong>Telefon:</strong> {telefon_display}
            </div>
            <div class="section">
                <strong>Tip Client:</strong> {data.tipClient}<br>
                <strong>Reprezentat Deja?:</strong> {data.reprezentare}<br>
                <strong>Localitate Necesară:</strong> {data.localitate}
            </div>
            <div class="section">
                <strong>Servicii Necesare:</strong>
                <ul>
                    {servicii_html}
                </ul>
            </div>
            <div class="section">
                <strong>Descrierea Situației (Lungime: {len(data.descriere)} caractere):</strong>
                <div class="description-box">
                    <p>{descriere_html}</p>
                </div>
            </div>
            <div class="footer">
                Data/Ora Trimiterii: {current_time}
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

def format_html_email_telefonic(data: SolicitareTelefonica) -> str:
    """Construiește corpul HTML simplu pentru solicitarea telefonică."""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Solicitare Contact Telefonic</title>
        <style>
            body {{ font-family: sans-serif; }}
            p {{ margin-bottom: 10px; }}
        </style>
    </head>
    <body>
        <h2>Solicitare Contact Telefonic (via Exit Pop-up)</h2>
        <p>Clientul <strong>{data.numeSolicitant}</strong> dorește să fie contactat telefonic la numărul:</p>
        <p style="font-size: 1.1em; font-weight: bold;">{data.telefonSolicitant}</p>
        <p><small><em>Mesaj automat: {data.mesaj}</em></small></p>
    </body>
    </html>
    """
    return html_content

# --- API Endpoints ---

@router.post(
    "/api/solicitare-avocat",
    summary="Procesează și trimite solicitarea de asistență juridică",
    tags=["Avocat"],
    status_code=status.HTTP_200_OK
)
async def handle_solicitare_avocat(
    solicitare: SolicitareAvocat,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    logger.critical("!!!!!!!!!!!!!!!!! Endpoint /api/solicitare-avocat APELAT !!!!!!!!!!!!!!!!!!")
    if not TARGET_EMAIL:
        logger.error("Endpoint /api/solicitare-avocat: TARGET_EMAIL lipsă. Eroare 500.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Eroare configurare server email (target).")

    if not solicitare.gdpr:
        logger.warning(f"GDPR not accepted for request from {solicitare.email}. Raising 400.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Acordul GDPR este obligatoriu.")

    # Create and save ClientRequest to database
    try:
        new_client_request_db = ClientRequest()
        new_client_request_db.name = solicitare.nume
        new_client_request_db.email = str(solicitare.email)
        new_client_request_db.phone = solicitare.telefon
        new_client_request_db.county = solicitare.localitate
        new_client_request_db.practice_area = ", ".join(solicitare.serviciiSelectate) if solicitare.serviciiSelectate else ""
        new_client_request_db.description = solicitare.descriere
        new_client_request_db.gdpr_consent = solicitare.gdpr
        new_client_request_db.applicant_type = solicitare.tipClient
        new_client_request_db.is_represented = True if solicitare.reprezentare.strip().upper() == 'DA' else False
        new_client_request_db.client_user_id = None # Assuming no logged-in user context for this specific form
        new_client_request_db.submission_timestamp = datetime.now(BUCHAREST_TZ)
        # status will default to PENDING as per model definition.
        # matched_lawyer_id will be None initially.

        db.add(new_client_request_db)
        db.commit()
        db.refresh(new_client_request_db)
        logger.info(f'New client request from {solicitare.email} saved to DB with ID: {new_client_request_db.id}. Applicant Type: {new_client_request_db.applicant_type}, Is Represented: {new_client_request_db.is_represented}')
    except Exception as e_db:
        logger.error(f"Database error while saving client request from {solicitare.email}: {e_db}", exc_info=True)
        db.rollback() # Rollback in case of error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Eroare la salvarea solicitării în baza de date.")

    logger.info(f"Processing lawyer request from: {solicitare.email} for city: {solicitare.localitate}")
    logger.debug(f"Request details: {solicitare.model_dump_json(indent=2)}")

    subject = f"Solicitare Asistență Juridică - {solicitare.nume} - {solicitare.localitate} (ID DB: {new_client_request_db.id})"
    html_content = format_html_email_solicitare(solicitare)
    reply_to_email = solicitare.email

    # Definim funcția task background sincronă (rulează într-un thread separat de FastAPI)
    def send_email_task():
        logger.info(f"Background task started for {solicitare.email} -> {TARGET_EMAIL}")
        try:
            # <<< CORECTIE: Am eliminat 'await' și am reactivat 'reply_to' >>>
            success = send_email(
                recipient_email=TARGET_EMAIL,
                subject=subject,
                html_content=html_content,
                sender_email=DEFAULT_SENDER_EMAIL,
                sender_name=DEFAULT_SENDER_NAME,
                reply_to={"email": reply_to_email, "name": solicitare.nume} # Am reactivat parametrul reply_to
            )
            # <<< SFÂRȘIT CORECTIE >>>

            if success:
                logger.info(f"Background task: Email for {solicitare.email} processed by send_email (returned True).")
            else:
                logger.error(f"Background task: Email sending failed for {solicitare.email} (send_email returned False). Check email_sender logs.")
        except Exception as e:
            # Logăm excepția neașteptată DINAINTEA apelului send_email sau o eroare în send_email în sine
            logger.error(f"Background task: UNEXPECTED EXCEPTION during email sending for {solicitare.email}: {e}", exc_info=True)

    background_tasks.add_task(send_email_task)
    logger.info(f"Returning 200 OK to client ({solicitare.email}), email sending scheduled in background.")
    return {"message": "Solicitarea dvs. a fost primită și înregistrată cu succes.", "request_id": new_client_request_db.id}


@router.post(
    "/api/solicitare-telefonica",
    summary="Procesează și trimite solicitarea de contact telefonic (exit pop-up)",
    tags=["Avocat"],
    status_code=status.HTTP_200_OK
)
async def handle_solicitare_telefonica(solicitare: SolicitareTelefonica, background_tasks: BackgroundTasks):
    logger.critical("!!!!!!!!!!!!!!!!! Endpoint /api/solicitare-telefonica APELAT !!!!!!!!!!!!!!!!!!")
    if not TARGET_EMAIL:
        logger.error(f"Endpoint /api/solicitare-telefonica: TARGET_EMAIL lipsă. Eroare 500.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Eroare configurare server email (target).")

    logger.info(f"Processing phone request from: {solicitare.numeSolicitant} ({solicitare.telefonSolicitant})")
    logger.debug(f"Request details: {solicitare.model_dump_json(indent=2)}")

    subject = "Solicitare Contact Telefonic"
    html_content = format_html_email_telefonic(solicitare)

    # Definim funcția task background sincronă
    def send_email_task_telefonic():
        logger.info(f"Background task started for phone request {solicitare.telefonSolicitant} -> {TARGET_EMAIL}")
        try:
            # <<< CORECTIE: Am eliminat 'await' >>>
            success = send_email(
                recipient_email=TARGET_EMAIL,
                subject=subject,
                html_content=html_content,
                sender_email=DEFAULT_SENDER_EMAIL,
                sender_name=DEFAULT_SENDER_NAME
            )
            # <<< SFÂRȘIT CORECTIE >>>

            if success:
                 logger.info(f"Background task: Phone request email for {solicitare.telefonSolicitant} processed by send_email (returned True).")
            else:
                 logger.error(f"Background task: Phone request email sending failed for {solicitare.telefonSolicitant} (send_email returned False). Check email_sender logs.")
        except Exception as e:
             logger.error(f"Background task: UNEXPECTED EXCEPTION during phone request email sending for {solicitare.telefonSolicitant}: {e}", exc_info=True)

    background_tasks.add_task(send_email_task_telefonic)
    logger.info(f"Returning 200 OK to client (phone request {solicitare.telefonSolicitant}), email sending scheduled in background.")
    return {"message": "Solicitarea dvs. telefonică a fost primită."}
