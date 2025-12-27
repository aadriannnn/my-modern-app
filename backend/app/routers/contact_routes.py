from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.email_sender import send_contact_form_email
import logging

router = APIRouter(
    prefix="/contact",
    tags=["contact"]
)

logger = logging.getLogger(__name__)

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str

@router.post("/")
async def send_contact_message(request: ContactRequest, background_tasks: BackgroundTasks):
    """
    Submit a contact form message.
    """
    # Simple validation
    if len(request.message) < 10:
         raise HTTPException(status_code=400, detail="Message is too short.")

    try:
        # Use background task for email sending
        logger.info(f"Adding background task to send contact email from: {request.email}")
        background_tasks.add_task(
            send_contact_form_email,
            nume=request.name,
            email=request.email,
            telefon=request.phone,
            mesaj=request.message
        )
        return {"status": "success", "message": "Message sent successfully."}
    except Exception as e:
        logger.error(f"Error processing contact request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error.")
