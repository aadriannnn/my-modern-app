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
    from backend.app.schemas import ClientRequestResponse # Added for new functions
    from backend.app.models import PartnerLawyerStatusEnum # For type hinting if needed, though str is used for new_status

from backend.app.models import BUCHAREST_TZ # Added for timestamp formatting
from backend.config import settings # Import settings for FRONTEND_BASE_URL

# Încarcă variabilele de mediu din fișierul .env
# Ideal, load_dotenv() este apelat o singură dată la începutul aplicației (ex: în config.py sau main.py)
# Dar pentru a face acest modul testabil/rulabil independent, îl putem lăsa și aici.
# Asigurați-vă că este apelat înainte de a accesa os.getenv() dacă .env conține valorile.
# Fiind deja apelat în main.py, probabil nu mai e necesar aici dacă modulul e importat după config.
# load_dotenv() # Comentat pentru a evita încărcări multiple dacă e deja făcut în config/main

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s')
logger = logging.getLogger(__name__)

# --- Citire valori din variabile de mediu ---
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
DEFAULT_SENDER_EMAIL = os.getenv("DEFAULT_SENDER_EMAIL", "notificari@legeaaplicata.ro") # Exemplu
DEFAULT_SENDER_NAME = os.getenv("DEFAULT_SENDER_NAME", "Legea Aplicata Notificari")

EMAIL_DESTINATAR_CONTACT = os.getenv("EMAIL_CONTACT_RECIPIENT", "contact@legeaaplicata.ro")
EMAIL_DESTINATAR_AVOCAT = os.getenv("EMAIL_AVOCAT_RECIPIENT", "avocat@legeaaplicata.ro")
EMAIL_DESTINATAR_TELEFON = os.getenv("EMAIL_PHONE_RECIPIENT", "telefon@legeaaplicata.ro")
# Adăugăm o variabilă specifică pentru extras CF, cu fallback la contact
EMAIL_DESTINATAR_EXTRAS_CF = os.getenv("EMAIL_EXTRAS_CF_RECIPIENT", EMAIL_DESTINATAR_CONTACT)


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
    logger.warning("BREVO_API_KEY nu este setat. Trimiterea de email-uri va eșua.")


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
