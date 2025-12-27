# backend/app/email_sender.py
import os
import logging
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any, TYPE_CHECKING
import asyncio # Adăugat pentru run_in_executor
from datetime import datetime # Added to fix NameError

# Forward references pentru type hinting pentru a evita importurile circulare
if TYPE_CHECKING:
    from .models import ClientData # Presupunând că ClientData este în models.py
    from .routers.extras_cf_routes import SolicitareExtrasCfRequest # Presupunând calea corectă
    from app.schemas import ClientRequestResponse # Added for new functions
    from app.models import PartnerLawyerStatusEnum # For type hinting if needed, though str is used for new_status

from app.models import BUCHAREST_TZ # Added for timestamp formatting
from app.config import get_settings # Import settings for FRONTEND_BASE_URL

settings = get_settings()

# Încarcă variabilele de mediu din fișierul .env
# Ideal, load_dotenv() este apelat o singură dată la începutul aplicației (ex: în config.py sau main.py)
# Dar pentru a face acest modul testabil/rulabil independent, îl putem lăsa și aici.
# Asigurați-vă că este apelat înainte de a accesa os.getenv() dacă .env conține valorile.
# Fiind deja apelat în main.py, probabil nu mai e necesar aici dacă modulul e importat după config.
# load_dotenv() # Comentat pentru a evita încărcări multiple dacă e deja făcut în config/main

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s')
# duplicate urllib3 patch from email_utils.py just in case
import urllib3
from urllib3.response import HTTPResponse

if not hasattr(HTTPResponse, 'getheaders'):
    def getheaders(self):
        return self.headers
    HTTPResponse.getheaders = getheaders

# Ensure env vars are loaded
load_dotenv()

logger = logging.getLogger(__name__)

# --- Citire valori din variabile de mediu ---
# Folosim os.getenv direct pentru API KEY pentru a evita probleme potențiale cu pydantic-settings
import os
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
if BREVO_API_KEY:
    BREVO_API_KEY = BREVO_API_KEY.strip() # Fix potential whitespace issues

DEFAULT_SENDER_EMAIL = settings.DEFAULT_SENDER_EMAIL or "notificari@legeaaplicata.ro"
DEFAULT_SENDER_NAME = settings.DEFAULT_SENDER_NAME or "Legea Aplicata Notificari"

EMAIL_DESTINATAR_CONTACT = settings.EMAIL_CONTACT_RECIPIENT or "contact@legeaaplicata.ro"
EMAIL_DESTINATAR_AVOCAT = settings.EMAIL_AVOCAT_RECIPIENT or "avocat@legeaaplicata.ro"
EMAIL_DESTINATAR_TELEFON = settings.EMAIL_PHONE_RECIPIENT or "telefon@legeaaplicata.ro"
# Adăugăm o variabilă specifică pentru extras CF, cu fallback la contact
EMAIL_DESTINATAR_EXTRAS_CF = settings.EMAIL_EXTRAS_CF_RECIPIENT or EMAIL_DESTINATAR_CONTACT


# --- Configurare API Client Brevo (Sendinblue) ---
brevo_config = None
transactional_emails_api = None

if BREVO_API_KEY:
    brevo_config = sib_api_v3_sdk.Configuration()
    brevo_config.api_key['api-key'] = BREVO_API_KEY
    try:
        api_client = sib_api_v3_sdk.ApiClient(brevo_config)
        transactional_emails_api = sib_api_v3_sdk.TransactionalEmailsApi(api_client)
        logger.info("Instanța API Brevo TransactionalEmailsApi creată cu succes.")
    except Exception as e:
        logger.error(f"Eroare la inițializarea clientului API Brevo: {e}", exc_info=True)
        transactional_emails_api = None # Asigurăm că este None dacă inițializarea eșuează
else:
    logger.warning("BREVO_API_KEY nu este setat (os.getenv). Trimiterea de email-uri va eșua.")


def send_email(
    recipient_email: str,
    recipient_name: Optional[str] = None,
    subject: str = "Notificare Legea Aplicata",
    html_content: str = "<p>Acesta este un email automat.</p>",
    text_content: Optional[str] = None,
    sender_email: Optional[str] = None,
    sender_name: Optional[str] = None,
    reply_to: Optional[Dict[str, str]] = None, # ex: {"email": "reply@example.com", "name": "Reply Name"}
    cc: Optional[List[Dict[str, str]]] = None, # ex: [{"email": "cc1@example.com", "name": "CC User1"}]
    bcc: Optional[List[Dict[str, str]]] = None,
    attachment: Optional[List[Dict[str, Any]]] = None, # ex: [{"content": "base64_encoded_str", "name": "file.pdf"}]
    headers: Optional[Dict[str, str]] = None,
    template_id: Optional[int] = None,
    params: Optional[Dict[str, Any]] = None # Pentru template_id
) -> bool:
    """
    Funcție generală sincronă pentru trimiterea de email-uri folosind Brevo API.
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo pentru emailuri tranzacționale nu este configurat. Emailul nu poate fi trimis.")
        return False

    effective_sender_email = sender_email or DEFAULT_SENDER_EMAIL
    effective_sender_name = sender_name or DEFAULT_SENDER_NAME

    to_recipient = [{"email": recipient_email, "name": recipient_name}] if recipient_name else [{"email": recipient_email}]

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=to_recipient,
        sender={"email": effective_sender_email, "name": effective_sender_name},
        subject=subject,
        html_content=html_content if not template_id else None, # html_content sau template_id, nu ambele
        text_content=text_content if not template_id and not html_content else None,
        reply_to=reply_to if reply_to else None,
        cc=cc if cc else None,
        bcc=bcc if bcc else None,
        attachment=attachment if attachment else None,
        headers=headers if headers else None,
        template_id=template_id if template_id else None,
        params=params if template_id and params else None
    )

    try:
        logger.info(f"Se încearcă trimiterea unui email către: {recipient_email} cu subiectul: '{subject}'")
        api_response = transactional_emails_api.send_transac_email(send_smtp_email)
        logger.info(f"Email trimis cu succes către {recipient_email}. Răspuns API (Message ID): {api_response.message_id if hasattr(api_response, 'message_id') else api_response}")
        return True
    except ApiException as e:
        logger.error(f"Excepție la apelarea Brevo SendSmtpEmailApi->send_transac_email: {e.status} {e.reason} - {e.body}", exc_info=False) # Nu vrem tot stack trace-ul pentru erori API
        return False
    except Exception as e_general:
        logger.error(f"Eroare generală la trimiterea emailului către {recipient_email}: {e_general}", exc_info=True)
        return False

# --- Funcții specifice pentru formulare (pot fi refactorizate să folosească send_email mai direct) ---
async def send_contact_form_email(nume: str, email: str, telefon: Optional[str], mesaj: str) -> bool:
    subject = f"Mesaj Nou Contact LegeaAplicata de la: {nume}"
    html_content = f"""
    <h3>Mesaj Nou Formular Contact LegeaAplicata.ro</h3>
    <p><strong>Nume:</strong> {nume}</p>
    <p><strong>Email:</strong> {email}</p>
    <p><strong>Telefon:</strong> {telefon if telefon else "Nespecificat"}</p>
    <p><strong>Mesaj:</strong></p>
    <p>{mesaj.replace(os.linesep, '<br>')}</p>
    <hr>
    <p><small>Acest email a fost trimis automat de pe platforma LegeaAplicata.ro.</small></p>
    """
    # Asigurăm că funcția sincronă send_email este apelată într-un mod non-blocant
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_email, EMAIL_DESTINATAR_CONTACT, "Admin LegeaAplicata", subject, html_content, reply_to={"email": email, "name": nume})

async def send_avocat_form_email(nume: str, email: str, telefon: str, localitate: str, judet: str, mesaj: str) -> bool:
    subject = f"Cerere Nouă Avocat LegeaAplicata de la: {nume}"
    html_content = f"""
    <h3>Cerere Nouă Formular Avocat LegeaAplicata.ro</h3>
    <p><strong>Nume:</strong> {nume}</p>
    <p><strong>Email:</strong> {email}</p>
    <p><strong>Telefon:</strong> {telefon}</p>
    <p><strong>Localitate:</strong> {localitate}</p>
    <p><strong>Județ:</strong> {judet}</p>
    <p><strong>Mesaj:</strong></p>
    <p>{mesaj.replace(os.linesep, '<br>')}</p>
    <hr>
    <p><small>Acest email a fost trimis automat de pe platforma LegeaAplicata.ro.</small></p>
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_email, EMAIL_DESTINATAR_AVOCAT, "Admin Avocat LegeaAplicata", subject, html_content, reply_to={"email": email, "name": nume})

async def send_phone_request_email(numar_dosar: str, telefon: str, nume_solicitant: str) -> bool:
    subject = f"Solicitare Notificare Telefonică Dosar {numar_dosar}"
    html_content = f"""
    <h3>Solicitare Nouă pentru Notificare Telefonică</h3>
    <p>Următoarea solicitare de notificare telefonică a fost primită:</p>
    <ul>
        <li><strong>Număr Dosar:</strong> {numar_dosar}</li>
        <li><strong>Număr Telefon pentru Notificare:</strong> {telefon}</li>
        <li><strong>Nume Solicitant:</strong> {nume_solicitant}</li>
    </ul>
    <hr>
    <p><small>Acest email a fost trimis automat de pe platforma LegeaAplicata.ro.</small></p>
    """
    # Trimiterea se face către o adresă internă, nu e nevoie de reply_to specific clientului aici
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_email, EMAIL_DESTINATAR_TELEFON, "Admin Notificări Telefonice", subject, html_content)


# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
# +++ FUNCȚIE PLACEHOLDER PENTRU EXTRAS CF                             +++++
# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
async def send_extras_cf_solicitation_email(request_data: 'SolicitareExtrasCfRequest', current_user: 'ClientData') -> bool:
    """
    Trimite emailul de solicitare extras CF către o adresă administrativă.
    """
    if not transactional_emails_api: # Verificare suplimentară
        logger.error("API-ul Brevo nu este configurat. Emailul pentru extras CF nu poate fi trimis.")
        return False

    logger.info(f"Pregătire email pentru extras CF de la {current_user.email} pentru CF: {request_data.detalii_imobil.numar_carte_funciara if request_data.detalii_imobil else 'N/A'}")

    subject = f"Solicitare Nouă Extras CF - {request_data.date_contact_facturare.nume_prenume_solicitant}"

    html_content = f"""
    <h1>Solicitare Nouă Extras Carte Funciară</h1>
    <p>O nouă solicitare pentru extras de carte funciară a fost primită:</p>
    <h2>Detalii Solicitant:</h2>
    <ul>
        <li>Nume: {request_data.date_contact_facturare.nume_prenume_solicitant}</li>
        <li>Email: {request_data.date_contact_facturare.email_solicitant}</li>
        <li>Telefon: {request_data.date_contact_facturare.telefon_solicitant}</li>
        <li>Factură pe firmă: {'Da' if request_data.date_contact_facturare.factura_firma else 'Nu'}</li>
        {f"<li>CUI Firmă: {request_data.date_contact_facturare.cui_firma}</li>" if request_data.date_contact_facturare.factura_firma and request_data.date_contact_facturare.cui_firma else ''}
        <li>Adresă facturare: {request_data.date_contact_facturare.adresa_facturare}</li>
        <li>Livrare WhatsApp: {'Da' if request_data.date_contact_facturare.livrare_whatsapp else 'Nu'}</li>
    </ul>
    <h2>Detalii Imobil:</h2>
    <ul>
        <li>Serviciu/Document: {request_data.detalii_imobil.serviciu_document}</li>
        <li>Județ: {request_data.detalii_imobil.judet_imobil}</li>
        <li>Localitate/Sector: {request_data.detalii_imobil.localitate_sector_imobil}</li>
        <li>Număr Carte Funciară: {request_data.detalii_imobil.numar_carte_funciara or 'Nespecificat'}</li>
        <li>Număr Cadastral: {request_data.detalii_imobil.numar_cadastral or 'Nespecificat'}</li>
        <li>Număr Topografic: {request_data.detalii_imobil.numar_topografic or 'Nespecificat'}</li>
        <li>Necesar la: {request_data.detalii_imobil.necesar_la or 'Nespecificat'}</li>
    </ul>
    <h2>Opțiuni Livrare:</h2>
    <ul>
        <li>Tip Livrare: {request_data.optiuni_livrare.tip_livrare}</li>
    </ul>
    <p>Acord termeni: {'Da' if request_data.acord_termeni else 'Nu'}</p>
    <hr>
    <p>Utilizator aplicație (care a inițiat solicitarea din contul său):</p>
    <ul>
        <li>ID User: {current_user.id}</li>
        <li>Email User: {current_user.email}</li>
        <li>Nume User: {current_user.numeComplet}</li>
    </ul>
    """

    logger.info(f"Se încearcă trimiterea emailului de solicitare extras CF către: {EMAIL_DESTINATAR_EXTRAS_CF}")

    try:
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None, # Folosește executorul default (ThreadPoolExecutor)
            send_email, # Funcția sincronă
            EMAIL_DESTINATAR_EXTRAS_CF, # recipient_email
            "Admin LegeaAplicata Extras CF", # recipient_name
            subject, # subject
            html_content, # html_content
            None, # text_content (opțional)
            DEFAULT_SENDER_EMAIL, # sender_email
            f"Solicitare Extras CF ({request_data.date_contact_facturare.nume_prenume_solicitant})", # sender_name
            # Setăm reply_to la emailul solicitantului din formular, nu la cel al userului logat (dacă sunt diferiți)
            {"email": request_data.date_contact_facturare.email_solicitant, "name": request_data.date_contact_facturare.nume_prenume_solicitant}, # reply_to
            None, # cc
            None, # bcc
            None, # attachment
            None, # headers
            None, # template_id
            None # params
        )
        if success:
            logger.info(f"Email pentru solicitare extras CF trimis cu succes către {EMAIL_DESTINATAR_EXTRAS_CF}.")
        else:
            logger.error(f"Trimiterea emailului pentru solicitare extras CF către {EMAIL_DESTINATAR_EXTRAS_CF} a eșuat (send_email a returnat False).")
        return success
    except Exception as e:
        logger.exception(f"Eroare la trimiterea emailului de solicitare extras CF: {e}")
        return False
# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
# +++ SFÂRȘIT FUNCȚIE PLACEHOLDER                                       +++++
# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

async def send_lawyer_enrollment_notification(
    lawyer_email: str,
    lawyer_name: Optional[str],
    agreement_date: datetime,
    referral_email: str,  # New parameter
    county: str           # New parameter
) -> bool:
    """
    Trimite o notificare email când un avocat se înscrie în programul de recomandare clienți.
    Emailul este trimis către adresa administrativă specificată în EMAIL_DESTINATAR_CONTACT.
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo nu este configurat. Emailul de notificare înscriere avocat nu poate fi trimis.")
        return False

    if not EMAIL_DESTINATAR_CONTACT:
        logger.error("EMAIL_DESTINATAR_CONTACT nu este setat. Nu se poate trimite notificarea de înscriere avocat.")
        return False

    subject = "Înscriere Nouă Avocat în Programul de Recomandare Clienți"

    # Formatare dată acord
    try:
        # Asigură-te că agreement_date este conștient de fusul orar sau convertește-l la fusul orar local dorit dacă e cazul
        # Pentru simplitate, presupunem că datetime-ul este deja în fusul orar dorit (UTC sau local)
        # Folosim BUCHAREST_TZ dacă este disponibil și agreement_date este naive
        from backend.app.models import BUCHAREST_TZ # Import local pentru a evita dependințe la nivel de modul
        if agreement_date.tzinfo is None and BUCHAREST_TZ:
            agreement_date_aware = BUCHAREST_TZ.localize(agreement_date)
        else:
            agreement_date_aware = agreement_date
        formatted_agreement_date = agreement_date_aware.strftime("%d %B %Y, %H:%M:%S %Z")
    except Exception as e_format_date:
        logger.error(f"Eroare la formatarea datei acordului {agreement_date}: {e_format_date}. Se va folosi formatul implicit.")
        formatted_agreement_date = str(agreement_date)

    html_content = f"""
    <h3>Notificare Înscriere Program Recomandare Clienți</h3>
    <p>Un nou avocat s-a înscris în programul de recomandare clienți.</p>
    <p><strong>Nume Avocat:</strong> {lawyer_name if lawyer_name else "Nespecificat"}</p>
    <p><strong>Email Avocat (cont platformă):</strong> {lawyer_email}</p>
    <p><strong>Data și Ora Acordului:</strong> {formatted_agreement_date}</p>
    <hr>
    <p><strong>Detalii pentru Recomandări:</strong></p>
    <p><strong>Email pentru recomandări clienți:</strong> {referral_email}</p>
    <p><strong>Județ pentru recomandări:</strong> {county}</p>
    <hr>
    <p><small>Acest email a fost trimis automat de pe platforma LegeaAplicata.ro.</small></p>
    """

    logger.info(f"Se încearcă trimiterea notificării de înscriere avocat ({lawyer_email}) cu detalii recomandare ({referral_email}, {county}) către {EMAIL_DESTINATAR_CONTACT}")

    try:
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None,
            send_email,
            EMAIL_DESTINATAR_CONTACT, # recipient_email
            "Admin Program Avocați LegeaAplicata", # recipient_name
            subject,
            html_content,
            None, # text_content
            DEFAULT_SENDER_EMAIL, # sender_email
            DEFAULT_SENDER_NAME, # sender_name
            {"email": lawyer_email, "name": lawyer_name or "Avocat Înscris"}, # reply_to
        )
        if success:
            logger.info(f"Email de notificare înscriere avocat ({lawyer_email}) trimis cu succes către {EMAIL_DESTINATAR_CONTACT}.")
        else:
            logger.error(f"Trimiterea emailului de notificare înscriere avocat ({lawyer_email}) către {EMAIL_DESTINATAR_CONTACT} a eșuat.")
        return success
    except Exception as e:
        logger.exception(f"Eroare la trimiterea emailului de notificare înscriere avocat ({lawyer_email}): {e}")
        return False


async def send_fallback_client_request_notification(client_request: "ClientRequestResponse") -> bool:
    """
    Trimite o notificare generală despre o nouă cerere de la client către adresa de fallback.
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo nu este configurat. Emailul de fallback pentru cerere client nu poate fi trimis.")
        return False
    if not EMAIL_AVOCAT_RECIPIENT:
        logger.error("EMAIL_AVOCAT_RECIPIENT nu este setat. Nu se poate trimite notificarea de fallback.")
        return False

    subject = f"Cerere Nouă de la Client Primită - ID {client_request.id}"

    submission_time_ro = "N/A"
    try:
        # Ensure submission_timestamp is a datetime object
        if isinstance(client_request.submission_timestamp, datetime):
            submission_time_ro = client_request.submission_timestamp.astimezone(BUCHAREST_TZ).strftime("%d %B %Y, %H:%M:%S %Z")
        else: # Handle cases where it might be a string already (less ideal)
            parsed_time = datetime.fromisoformat(str(client_request.submission_timestamp))
            submission_time_ro = parsed_time.astimezone(BUCHAREST_TZ).strftime("%d %B %Y, %H:%M:%S %Z")
    except Exception as e_format_date:
        logger.error(f"Eroare la formatarea datei {client_request.submission_timestamp} pentru cererea ID {client_request.id}: {e_format_date}. Se va folosi N/A.")
        # submission_time_ro remains "N/A" or use client_request.submission_timestamp directly as string

    html_content = f"""
    <h3>Cerere Nouă de Consultanță Juridică Primită</h3>
    <p>O nouă cerere a fost trimisă prin platformă:</p>
    <ul>
        <li><strong>ID Cerere:</strong> {client_request.id}</li>
        <li><strong>Nume Client:</strong> {client_request.name}</li>
        <li><strong>Email Client:</strong> {client_request.email}</li>
        <li><strong>Telefon Client:</strong> {client_request.phone or 'Nespecificat'}</li>
        <li><strong>Județ:</strong> {client_request.county}</li>
        <li><strong>Domeniu Juridic:</strong> {client_request.practice_area}</li>
        <li><strong>Descriere Scurtă:</strong> {client_request.description[:200] + '...' if len(client_request.description) > 200 else client_request.description}</li>
        <li><strong>Data Trimiterii:</strong> {submission_time_ro}</li>
        <li><strong>Acord GDPR:</strong> {'Da' if client_request.gdpr_consent else 'Nu'}</li>
    </ul>
    <p><small>Acest email a fost trimis automat către adresa de fallback ({EMAIL_AVOCAT_RECIPIENT}).</small></p>
    """

    logger.info(f"Se încearcă trimiterea notificării de fallback pentru cererea client ID {client_request.id} către {EMAIL_AVOCAT_RECIPIENT}")

    try:
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None,
            send_email,
            EMAIL_AVOCAT_RECIPIENT,
            "Admin Program Avocați LegeaAplicata",
            subject,
            html_content,
            reply_to={"email": client_request.email, "name": client_request.name} # Reply to client
        )
        if success:
            logger.info(f"Email de fallback pentru cerere client ID {client_request.id} trimis cu succes către {EMAIL_AVOCAT_RECIPIENT}.")
        else:
            logger.error(f"Trimiterea emailului de fallback pentru cerere client ID {client_request.id} către {EMAIL_AVOCAT_RECIPIENT} a eșuat.")
        return success
    except Exception as e:
        logger.exception(f"Eroare la trimiterea emailului de fallback pentru cerere client ID {client_request.id}: {e}")
        return False


async def send_lawyer_client_request_notification(
    lawyer_email: str,
    lawyer_name: Optional[str],
    client_request: "ClientRequestResponse"
) -> bool:
    """
    Trimite o notificare personalizată unui avocat despre o nouă cerere de client.
    """
    if not transactional_emails_api:
        logger.error(f"API-ul Brevo nu este configurat. Emailul către avocat {lawyer_email} pentru cerere client ID {client_request.id} nu poate fi trimis.")
        return False

    subject = f"Referral Client Nou: {client_request.practice_area} în {client_request.county}"
    lawyer_greeting = f"Domnule/Doamnă Avocat {lawyer_name}," if lawyer_name else "Stimate Avocat,"

    html_content = f"""
    <p>{lawyer_greeting}</p>
    <p>Am identificat o nouă cerere de consultanță juridică ce s-ar putea potrivi expertizei dumneavoastră:</p>
    <ul>
        <li><strong>Județ Solicitat:</strong> {client_request.county}</li>
        <li><strong>Domeniu Juridic Solicitat:</strong> {client_request.practice_area}</li>
        <li><strong>Descriere Scurtă (din partea clientului):</strong><br/>
            <em>{client_request.description[:300] + '...' if len(client_request.description) > 300 else client_request.description}</em>
        </li>
    </ul>
    <p>Aceasta este o notificare preliminară. Momentan, nu este necesară nicio acțiune din partea dvs. pe platformă pentru această cerere specifică.</p>
    <p>Vă mulțumim pentru participarea în programul nostru de referral!</p>
    <p>Cu stimă,<br/>Echipa LegeaAplicata.ro</p>
    <hr>
    <p><small>ID Cerere Client (uz intern): {client_request.id}</small></p>
    """

    logger.info(f"Se încearcă trimiterea notificării de cerere client ID {client_request.id} către avocatul {lawyer_email}")

    try:
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None,
            send_email,
            lawyer_email,
            lawyer_name or "Avocat Partener",
            subject,
            html_content,
            reply_to={"email": DEFAULT_SENDER_EMAIL, "name": DEFAULT_SENDER_NAME} # Reply to platform admin
        )
        if success:
            logger.info(f"Email de notificare cerere client ID {client_request.id} trimis cu succes către avocatul {lawyer_email}.")
        else:
            logger.error(f"Trimiterea emailului de notificare cerere client ID {client_request.id} către avocatul {lawyer_email} a eșuat.")
        return success
    except Exception as e:
        logger.exception(f"Eroare la trimiterea emailului de notificare cerere client ID {client_request.id} către avocatul {lawyer_email}: {e}")
        return False


async def send_partner_lawyer_application_admin_notification(admin_email: str, lawyer_data: dict) -> bool:
    """
    Sends an email to the admin about a new partner lawyer application.
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo nu este configurat. Emailul de notificare admin pentru aplicare partener nu poate fi trimis.")
        return False

    lawyer_name = lawyer_data.get('numeComplet', 'N/A')
    lawyer_email_addr = lawyer_data.get('email', 'N/A')
    subject = f"Aplicație Nouă Avocat Partener: {lawyer_name}"

    details_html = "<ul>"
    for key, value in lawyer_data.items():
        # Formatare specială pentru dataCreare, dacă există și este în format ISO
        if key == 'dataCreare' and isinstance(value, str):
            try:
                dt_obj = datetime.fromisoformat(value)
                # Asigură-te că este timezone-aware sau convertește la BUCHAREST_TZ
                if dt_obj.tzinfo is None and BUCHAREST_TZ:
                    dt_obj = BUCHAREST_TZ.localize(dt_obj)
                elif BUCHAREST_TZ: # Dacă e deja aware, convertește la fusul Bucureștiului
                    dt_obj = dt_obj.astimezone(BUCHAREST_TZ)
                formatted_value = dt_obj.strftime("%d %B %Y, %H:%M:%S %Z")
            except (ValueError, TypeError):
                formatted_value = value # Fallback la valoarea originală dacă parsarea eșuează
        elif isinstance(value, (list, dict)):
            formatted_value = str(value) # Simplu string pentru liste/dicționare
        else:
            formatted_value = str(value) if value is not None else "Nespecificat"

        # Convert camelCase/snake_case to Title Case for display
        display_key = ' '.join(word.capitalize() for word in key.replace('_', ' ').split())
        details_html += f"<li><strong>{display_key}:</strong> {formatted_value}</li>"
    details_html += "</ul>"

    html_content = f"""
    <h3>Notificare Aplicație Nouă Avocat Partener</h3>
    <p>O nouă aplicație pentru programul de avocați parteneri a fost primită:</p>
    {details_html}
    <p>Vă rugăm să revizuiți această aplicație în panoul de administrare.</p>
    <p><a href="{settings.FRONTEND_BASE_URL.rstrip('/')}/admin/users?search={lawyer_email_addr}" target="_blank">Mergi la Panoul de Administrare (utilizatori)</a></p>
    <hr>
    <p><small>Acest email a fost trimis automat de pe platforma LegeaAplicata.ro.</small></p>
    """

    logger.info(f"Se încearcă trimiterea notificării admin pentru aplicare partener ({lawyer_name}) către {admin_email}")

    loop = asyncio.get_event_loop()
    try:
        success = await loop.run_in_executor(
            None,
            send_email,
            admin_email,
            "Admin LegeaAplicata Parteneri",
            subject,
            html_content,
            reply_to={"email": lawyer_email_addr, "name": lawyer_name}
        )
        if success:
            logger.info(f"Email notificare admin pentru aplicare partener ({lawyer_name}) trimis cu succes către {admin_email}.")
        else:
            logger.error(f"Trimiterea emailului notificare admin pentru aplicare partener ({lawyer_name}) către {admin_email} a eșuat.")
        return success
    except Exception as e:
        logger.exception(f"Eroare la trimiterea emailului notificare admin pentru aplicare partener ({lawyer_name}): {e}")
        return False

async def send_partner_lawyer_status_update_email(
    lawyer_email: str,
    lawyer_name: str,
    new_status: str, # "approved" or "rejected"
    reason_if_rejected: Optional[str] = None
) -> bool:
    """
    Sends an email to the lawyer about their application status change.
    """
    if not transactional_emails_api:
        logger.error(f"API-ul Brevo nu este configurat. Emailul de actualizare status partener pentru {lawyer_email} nu poate fi trimis.")
        return False

    subject = ""
    html_content = ""
    status_lower = new_status.lower()
    login_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/login" # General login URL

    if status_lower == PartnerLawyerStatusEnum.APPROVED.value: # Compare with enum value
        subject = "Felicitări! Aplicația dvs. de Avocat Partener LegeaAplicata.ro a fost Aprobată!"
        html_content = f"""
        <p>Stimate/Stimată {lawyer_name},</p>
        <p>Avem plăcerea să vă informăm că aplicația dumneavoastră pentru a deveni avocat partener pe platforma LegeaAplicata.ro a fost <strong>aprobată</strong>!</p>
        <p>Acum faceți parte din rețeaua noastră de profesioniști și veți putea beneficia de vizibilitate sporită și potențiale recomandări de clienți prin intermediul platformei.</p>
        <p>Vă recomandăm să vă asigurați că profilul dumneavoastră este complet și la zi pentru a maximiza șansele de a primi recomandări relevante.</p>
        <p>Puteți accesa contul dumneavoastră aici: <a href="{login_url}">{login_url}</a></p>
        <p>Dacă aveți întrebări sau aveți nevoie de asistență, nu ezitați să ne contactați.</p>
        <p>Cu considerație,<br/>Echipa LegeaAplicata.ro</p>
        """
    elif status_lower == PartnerLawyerStatusEnum.REJECTED.value: # Compare with enum value
        subject = "Actualizare privind Aplicația dvs. de Avocat Partener LegeaAplicata.ro"
        html_content = f"""
        <p>Stimate/Stimată {lawyer_name},</p>
        <p>Vă scriem în legătură cu aplicația dumneavoastră pentru programul de avocați parteneri LegeaAplicata.ro.</p>
        <p>După o analiză atentă, am decis să nu continuăm cu aplicația dumneavoastră în acest moment.</p>
        """
        if reason_if_rejected: # Cautious about adding specific reasons, as per issue description
            html_content += f"<p>Motiv: {reason_if_rejected}</p>"
        html_content += """
        <p>Această decizie nu reflectă neapărat calitatea serviciilor dumneavoastră profesionale, ci poate fi legată de nevoile actuale ale platformei sau de numărul de parteneri din anumite regiuni/domenii.</p>
        <p>Vă mulțumim pentru interesul acordat platformei LegeaAplicata.ro.</p>
        <p>Cu considerație,<br/>Echipa LegeaAplicata.ro</p>
        """
    else:
        logger.error(f"Status necunoscut '{new_status}' pentru actualizarea partenerului avocat {lawyer_email}. Emailul nu va fi trimis.")
        return False

    logger.info(f"Se încearcă trimiterea emailului de actualizare status partener ({status_lower}) către {lawyer_email}")

    loop = asyncio.get_event_loop()
    try:
        success = await loop.run_in_executor(
            None,
            send_email,
            lawyer_email,
            lawyer_name,
            subject,
            html_content
            # Default sender and reply_to will be used from send_email function
        )
        if success:
            logger.info(f"Email de actualizare status partener ({status_lower}) trimis cu succes către {lawyer_email}.")
        else:
            logger.error(f"Trimiterea emailului de actualizare status partener ({status_lower}) către {lawyer_email} a eșuat.")
        return success
    except Exception as e:
        logger.exception(f"Eroare la trimiterea emailului de actualizare status partener ({status_lower}) către {lawyer_email}: {e}")
        return False

# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
# +++ SUBSCRIPTION EMAIL NOTIFICATIONS                                +++++
# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

async def send_subscription_confirmation_email(
    user_email: str,
    user_name: Optional[str],
    plan_name: str,
    subscription_start: datetime,
    subscription_end: datetime,
    amount: float,
    currency: str = "RON"
) -> bool:
    """
    Trimite email de confirmare imediat după finalizarea cu succes a plății.
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo nu este configurat. Emailul de confirmare abonament nu poate fi trimis.")
        return False

    subject = f"✅ Abonamentul tău {plan_name} a fost confirmat!"

    # Format dates
    try:
        from backend.app.models import BUCHAREST_TZ
        if subscription_start.tzinfo is None and BUCHAREST_TZ:
            subscription_start = BUCHAREST_TZ.localize(subscription_start)
        if subscription_end.tzinfo is None and BUCHAREST_TZ:
            subscription_end = BUCHAREST_TZ.localize(subscription_end)

        start_formatted = subscription_start.strftime("%d %B %Y")
        end_formatted = subscription_end.strftime("%d %B %Y")
    except Exception as e:
        logger.error(f"Eroare formatare date: {e}")
        start_formatted = str(subscription_start.date())
        end_formatted = str(subscription_end.date())

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1e40af; margin: 0; font-size: 28px;">🎉 Plată Confirmată!</h1>
            </div>

            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Salut {user_name or 'Utilizator'},
            </p>

            <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
                Abonamentul tău <strong>{plan_name}</strong> a fost activat cu succes!
                Plata ta de <strong>{amount:.2f} {currency}</strong> a fost procesată.
            </p>

            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">📋 Detalii Abonament</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Plan:</td>
                        <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">{plan_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Valoare:</td>
                        <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">{amount:.2f} {currency}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Data activare:</td>
                        <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">{start_formatted}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Valabil până la:</td>
                        <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">{end_formatted}</td>
                    </tr>
                </table>
            </div>

            <div style="margin: 30px 0;">
                <a href="{settings.FRONTEND_BASE_URL.rstrip('/')}/setari"
                   style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none;
                          padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Vezi Detalii Abonament
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Ai întrebări? Contactează-ne la {DEFAULT_SENDER_EMAIL}
            </p>

            <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                Mulțumim că ai ales LegeaAplicata.ro!
            </p>
        </div>
    </div>
    """

    logger.info(f"Trimitere email confirmare abonament către {user_email}")

    loop = asyncio.get_event_loop()
    try:
        success = await loop.run_in_executor(
            None,
            send_email,
            user_email,
            user_name or "Utilizator Premium",
            subject,
            html_content
        )
        if success:
            logger.info(f"✓ Email confirmare abonament trimis către {user_email}")
        else:
            logger.error(f"✗ Trimitere email confirmare abonament eșuată către {user_email}")
        return success
    except Exception as e:
        logger.exception(f"Eroare trimitere email confirmare abonament către {user_email}: {e}")
        return False


async def send_subscription_activated_email(
    user_email: str,
    user_name: Optional[str],
    plan_name: str
) -> bool:
    """
    Trimite email când webhook-ul confirmă activarea abonamentului.
    Conține lista de beneficii deblocate.
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo nu este configurat.")
        return False

    subject = f"🚀 Abonamentul tău {plan_name} este acum activ!"

    benefits = [
        "✓ Acces nelimitat la întreaga bază de jurisprudență",
        "✓ Filtre avansate pentru căutare specializată",
        "✓ Teste grilă generate automat din spețe",
        "✓ Calculator taxă de timbru cu asistent AI",
        "✓ Căutare complexă după număr dosar",
        "✓ Analiză inteligentă cu AI pentru filtrare jurisprudență",
        "✓ Generare automată acte juridice",
        "✓ 6 perspective analitice complete pentru fiecare speță",
        "✓ Suport tehnic prioritar"
    ]

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎊 Bun Venit în Premium!</h1>
            </div>

            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Salut {user_name or 'Utilizator'},
            </p>

            <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
                Abonamentul tău <strong>{plan_name}</strong> este complet activat!
                Acum ai acces la toate funcțiile premium ale platformei.
            </p>

            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #059669; font-size: 18px;">🎁 Ce Ai Deblocat:</h3>
                <ul style="margin: 15px 0; padding-left: 20px; color: #374151;">
                    {"".join(f'<li style="margin: 10px 0;">{benefit}</li>' for benefit in benefits)}
                </ul>
            </div>

            <div style="margin: 30px 0; text-align: center;">
                <a href="{settings.FRONTEND_BASE_URL.rstrip('/')}"
                   style="display: inline-block; background-color: #10b981; color: white; text-decoration: none;
                          padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Începe să Explorezi
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Succes în activitatea ta juridică!
            </p>
        </div>
    </div>
    """

    logger.info(f"Trimitere email activare abonament către {user_email}")

    loop = asyncio.get_event_loop()
    try:
        success = await loop.run_in_executor(
            None,
            send_email,
            user_email,
            user_name or "Utilizator Premium",
            subject,
            html_content
        )
        if success:
            logger.info(f"✓ Email activare trimis către {user_email}")
        else:
            logger.error(f"✗ Email activare eșuat către {user_email}")
        return success
    except Exception as e:
        logger.exception(f"Eroare email activare către {user_email}: {e}")
        return False


async def send_subscription_expiring_soon_email(
    user_email: str,
    user_name: Optional[str],
    expiry_date: datetime,
    plan_name: str,
    days_remaining: int
) -> bool:
    """
    Trimite email de avertizare când abonamentul expiră în curând (7 zile).
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo nu este configurat.")
        return False

    subject = f"⚠️ Abonamentul tău expiră în {days_remaining} zile"

    try:
        from backend.app.models import BUCHAREST_TZ
        if expiry_date.tzinfo is None and BUCHAREST_TZ:
            expiry_date = BUCHAREST_TZ.localize(expiry_date)
        expiry_formatted = expiry_date.strftime("%d %B %Y")
    except Exception as e:
        logger.error(f"Eroare formatare dată: {e}")
        expiry_formatted = str(expiry_date.date())

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f59e0b; margin: 0; font-size: 28px;">⏰ Abonamentul Tău Expiră Curând</h1>
            </div>

            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Salut {user_name or 'Utilizator'},
            </p>

            <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
                Abonamentul tău <strong>{plan_name}</strong> expiră pe <strong>{expiry_formatted}</strong>
                (în {days_remaining} zile).
            </p>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 6px;">
                <p style="margin: 0; color: #92400e; font-size: 15px;">
                    Pentru a continua să beneficiezi de toate funcțiile premium, reînnoiește-ți abonamentul înainte de data expirării.
                </p>
            </div>

            <div style="margin: 30px 0; text-align: center;">
                <a href="{settings.FRONTEND_BASE_URL.rstrip('/')}/abonamente"
                   style="display: inline-block; background-color: #f59e0b; color: white; text-decoration: none;
                          padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Reînnoiește Abonamentul
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Ai întrebări? Contactează-ne la {DEFAULT_SENDER_EMAIL}
            </p>
        </div>
    </div>
    """

    logger.info(f"Trimitere email expirare apropiată către {user_email}")

    loop = asyncio.get_event_loop()
    try:
        success = await loop.run_in_executor(
            None,
            send_email,
            user_email,
            user_name or "Utilizator",
            subject,
            html_content
        )
        if success:
            logger.info(f"✓ Email expirare apropiată trimis către {user_email}")
        else:
            logger.error(f"✗ Email expirare apropiată eșuat către {user_email}")
        return success
    except Exception as e:
        logger.exception(f"Eroare email expirare apropiată către {user_email}: {e}")
        return False


async def send_subscription_expired_email(
    user_email: str,
    user_name: Optional[str],
    expired_date: datetime,
    plan_name: str
) -> bool:
    """
    Trimite email când abonamentul a expirat și utilizatorul a fost retrogradat la Basic.
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo nu este configurat.")
        return False

    subject = "📅 Abonamentul tău a expirat"

    try:
        from backend.app.models import BUCHAREST_TZ
        if expired_date.tzinfo is None and BUCHAREST_TZ:
            expired_date = BUCHAREST_TZ.localize(expired_date)
        expired_formatted = expired_date.strftime("%d %B %Y")
    except Exception as e:
        logger.error(f"Eroare formatare dată: {e}")
        expired_formatted = str(expired_date.date())

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6b7280; margin: 0; font-size: 28px;">Abonamentul Tău A Expirat</h1>
            </div>

            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Salut {user_name or 'Utilizator'},
            </p>

            <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
                Abonamentul tău <strong>{plan_name}</strong> a expirat pe <strong>{expired_formatted}</strong>.
            </p>

            <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 20px; margin: 25px 0; border-radius: 6px;">
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 15px;">
                    <strong>Contul tău a fost schimbat la planul Basic (gratuit)</strong>
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    Vei continua să ai acces limitat la platformă, dar funcțiile premium nu mai sunt disponibile.
                </p>
            </div>

            <p style="font-size: 16px; color: #374151; margin: 25px 0;">
                Vrei să-ți recapeți accesul complet? Reabonează-te acum!
            </p>

            <div style="margin: 30px 0; text-align: center;">
                <a href="{settings.FRONTEND_BASE_URL.rstrip('/')}/abonamente"
                   style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none;
                          padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Reactivează Premium
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Întrebări? Suntem aici să te ajutăm: {DEFAULT_SENDER_EMAIL}
            </p>
        </div>
    </div>
    """

    logger.info(f"Trimitere email expirare completă către {user_email}")

    loop = asyncio.get_event_loop()
    try:
        success = await loop.run_in_executor(
            None,
            send_email,
            user_email,
            user_name or "Utilizator",
            subject,
            html_content
        )
        if success:
            logger.info(f"✓ Email expirare completă trimis către {user_email}")
        else:
            logger.error(f"✗ Email expirare completă eșuat către {user_email}")
        return success
    except Exception as e:
        logger.exception(f"Eroare email expirare completă către {user_email}: {e}")
        return False


async def send_subscription_cancelled_email(
    user_email: str,
    user_name: Optional[str],
    plan_name: str,
    access_until: datetime
) -> bool:
    """
    Trimite email când utilizatorul anulează abonamentul.
    Accesul rămâne activ până la sfârșitul perioadei plătite.
    """
    if not transactional_emails_api:
        logger.error("API-ul Brevo nu este configurat.")
        return False

    subject = "Anulare abonament confirmată"

    try:
        from backend.app.models import BUCHAREST_TZ
        if access_until.tzinfo is None and BUCHAREST_TZ:
            access_until = BUCHAREST_TZ.localize(access_until)
        access_formatted = access_until.strftime("%d %B %Y")
    except Exception as e:
        logger.error(f"Eroare formatare dată: {e}")
        access_formatted = str(access_until.date())

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6b7280; margin: 0; font-size: 28px;">Abonament Anulat</h1>
            </div>

            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Salut {user_name or 'Utilizator'},
            </p>

            <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
                Am procesat cererea ta de anulare pentru abonamentul <strong>{plan_name}</strong>.
            </p>

            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 6px;">
                <p style="margin: 0; color: #1e40af; font-size: 15px;">
                    <strong>👉 Vei continua să ai acces Premium până pe {access_formatted}</strong>
                </p>
            </div>

            <p style="font-size: 16px; color: #374151; margin: 25px 0;">
                După această dată, contul tău va trece automat la planul Basic (gratuit).
                Dacă te răzgândești, poți reactiva abonamentul oricând.
            </p>

            <div style="margin: 30px 0; text-align: center;">
                <a href="{settings.FRONTEND_BASE_URL.rstrip('/')}/setari"
                   style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none;
                          padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Vezi Setări Cont
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Ne pare rău să te vedem plecat. Feedback-ul tău este important: {DEFAULT_SENDER_EMAIL}
            </p>
        </div>
    </div>
    """

    logger.info(f"Trimitere email anulare abonament către {user_email}")

    loop = asyncio.get_event_loop()
    try:
        success = await loop.run_in_executor(
            None,
            send_email,
            user_email,
            user_name or "Utilizator",
            subject,
            html_content
        )
        if success:
            logger.info(f"✓ Email anulare abonament trimis către {user_email}")
        else:
            logger.error(f"✗ Email anulare abonament eșuat către {user_email}")
        return success
    except Exception as e:
        logger.exception(f"Eroare email anulare abonament către {user_email}: {e}")
        return False

# Exemplu de utilizare (păstrat comentat)
# if __name__ == "__main__":
#     test_recipient = os.getenv("TEST_EMAIL_RECIPIENT", "destinatar_test@domeniu.com")
#     if test_recipient != "destinatar_test@domeniu.com":
#         logger.info(f"Se trimite un email de test către: {test_recipient}")
#         # Pentru a testa o funcție async dintr-un context sincron (cum ar fi __main__),
#         # am putea folosi asyncio.run() dacă send_email ar fi async.
#         # Dar send_email este sincron, deci o apelăm direct.
#         success = send_email(
#             recipient_email=test_recipient,
#             recipient_name="Utilizator Test",
#             subject="Email de Test Brevo din email_sender.py",
#             html_content="<h1>Testare Conexiune Brevo</h1><p>Dacă primești acest email, configurarea API funcționează.</p>",
#             reply_to={"email": "test.reply@domeniu.com", "name": "Test Reply"}
#         )
#         if success:
#             logger.info("Email de test trimis cu succes.")
#         else:
#             logger.error("Trimiterea emailului de test a eșuat.")
#     else:
#         logger.info("Pentru a trimite un email de test, setați variabila de mediu TEST_EMAIL_RECIPIENT.")

# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
# +++ LAWYER ASSISTANCE EMAIL                                         +++++
# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

async def send_lawyer_assistance_request_email(
    nume: str,
    email: str,
    telefon: str,
    is_company: bool,
    is_represented: bool,
    judet: str,
    practice_area: str,
    message: str
) -> bool:
    """
    Sends an email with the lawyer assistance request details.
    """
    logger.info(f"START send_lawyer_assistance_request_email for {nume}")

    if not transactional_emails_api:
        logger.error("Brevo API not configured. Cannot send lawyer assistance email.")
        return False

    recipient_email = settings.AVOCAT_TARGET_EMAIL
    if not recipient_email:
        # Fallback to AVOCAT recipient if specific target not set
        recipient_email = EMAIL_AVOCAT_RECIPIENT
        if not recipient_email:
             logger.error("No recipient email configured for lawyer assistance (AVOCAT_TARGET_EMAIL or EMAIL_AVOCAT_RECIPIENT).")
             return False

    subject = f"Cerere Nouă Asistență Avocat: {nume}"

    company_status = "Persoană Juridică" if is_company else "Persoană Fizică"
    represented_status = "Da, are avocat" if is_represented else "Nu are avocat"

    html_content = f"""
    <h3>Cerere Nouă Asistență Juridică</h3>
    <p>O nouă solicitare a fost primită:</p>
    <ul>
        <li><strong>Nume:</strong> {nume}</li>
        <li><strong>Email:</strong> {email}</li>
        <li><strong>Telefon:</strong> {telefon}</li>
        <li><strong>Tip Client:</strong> {company_status}</li>
        <li><strong>Reprezentat deja:</strong> {represented_status}</li>
        <li><strong>Județ:</strong> {judet}</li>
        <li><strong>Arie de practică:</strong> {practice_area}</li>
    </ul>
    <h4>Descriere situație:</h4>
    <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        {message.replace(os.linesep, '<br>')}
    </p>
    <hr>
    <p><small>Trimis automat din LegeaAplicata.ro</small></p>
    """

    logger.info(f"Se încearcă trimiterea cererii de asistență avocat către {recipient_email}...")
    try:
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None,
            send_email,
            recipient_email,
            "Avocat Colaborator",
            subject,
            html_content,
            None, # text_content
            DEFAULT_SENDER_EMAIL,
            DEFAULT_SENDER_NAME,
            {"email": email, "name": nume} # reply_to
        )
        if success:
            logger.info(f"Email cerere asistență avocat trimis cu succes către {recipient_email}")
        else:
            logger.error(f"Eșec la trimiterea emailului către {recipient_email} (send_email a returnat False)")
        return success
    except Exception as e:
        logger.exception(f"Eroare critică la trimiterea emailului de asistență avocat: {e}")
        return False
