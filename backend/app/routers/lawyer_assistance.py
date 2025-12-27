from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.email_sender import send_lawyer_assistance_request_email
import logging

router = APIRouter(
    prefix="/lawyer-assistance",
    tags=["lawyer-assistance"]
)

logger = logging.getLogger(__name__)

class LawyerAssistanceRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    is_company: bool = False
    is_represented: bool = False
    county: str
    practice_area: str
    description: str
    terms_accepted: bool

@router.post("/")
async def request_lawyer_assistance(request: LawyerAssistanceRequest, background_tasks: BackgroundTasks):
    """
    Submit a request for lawyer assistance.
    """
    if not request.terms_accepted:
        raise HTTPException(status_code=400, detail="Terms and conditions must be accepted.")

    # Validate length or other constraints if necessary
    if len(request.description) < 10:
        raise HTTPException(status_code=400, detail="Description is too short.")

    try:
        # Use background task for email sending to not block response
        logger.info(f"Adding background task to send email for: {request.email}")
        background_tasks.add_task(
            send_lawyer_assistance_request_email,
            nume=request.name,
            email=request.email,
            telefon=request.phone,
            is_company=request.is_company,
            is_represented=request.is_represented,
            judet=request.county,
            practice_area=request.practice_area,
            message=request.description
        )
        logger.info("Background task added successfully.")
        return {"status": "success", "message": "Request submitted successfully."}
    except Exception as e:
        logger.error(f"Error processing lawyer assistance request: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")
