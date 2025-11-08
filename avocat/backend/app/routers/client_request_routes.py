import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.models import ClientRequest, ClientData, ClientRequestStatusEnum, BUCHAREST_TZ
from backend.app.schemas import ClientRequestCreate, ClientRequestResponse
from backend.app.dependencies import get_db, verify_recaptcha
from backend.app.routers.auth_routes import get_optional_current_user # To link request to user if logged in
from backend.app.core_services import find_matching_lawyers # Added for lawyer matching
from datetime import datetime
# Session is already imported via Depends(get_db) which returns a Session

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/api/client-requests", # Changed prefix to be more standard for a resource
    tags=["Client Requests"],
)

@router.post("/", response_model=ClientRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_client_request_endpoint( # Renamed function for clarity
    request_data: ClientRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[ClientData] = Depends(get_optional_current_user), # Optional authenticated user
    gRecaptchaToken: Optional[str] = Body(None)
):
    logger.info(f"Received new client request from email: {request_data.email}. Token Present: {'Yes' if gRecaptchaToken else 'No'}")

    # Verify reCAPTCHA token first
    try:
        await verify_recaptcha(token=gRecaptchaToken, request=request, expected_action='client_request_submit')
        logger.info(f"reCAPTCHA verification successful for client request: {request_data.email}")
    except HTTPException as recaptcha_exc:
        logger.warning(f"reCAPTCHA verification failed for client request {request_data.email}: {recaptcha_exc.detail}")
        raise recaptcha_exc # Re-raise the exception from verify_recaptcha
    except Exception as e_recaptcha:
        logger.error(f"Unexpected error during reCAPTCHA verification for {request_data.email}: {e_recaptcha}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error during security verification.")

    if not request_data.gdpr_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GDPR consent is required to submit a client request."
        )

    client_user_id_to_set = None
    if current_user:
        client_user_id_to_set = current_user.id
        logger.info(f"Client request linked to authenticated user ID: {current_user.id}")
    else:
        logger.info("Client request submitted by an anonymous user.")

    try:
        new_client_request = ClientRequest(
            name=request_data.name,
            email=request_data.email,
            phone=request_data.phone,
            county=request_data.county,
            practice_area=request_data.practice_area,
            description=request_data.description,
            gdpr_consent=request_data.gdpr_consent,
            applicant_type=request_data.applicant_type, # Added from schema
            is_represented=request_data.is_represented, # Added from schema
            status=ClientRequestStatusEnum.PENDING, # Initial status
            submission_timestamp=datetime.now(BUCHAREST_TZ),
            client_user_id=client_user_id_to_set,
            # matched_lawyer_id, lawyer_status, etc., will be null by default
        )

        db.add(new_client_request)
        db.commit()
        db.refresh(new_client_request)
        logger.info(f"New client request (ID: {new_client_request.id}) initially created for: {new_client_request.email}")

        # Call lawyer matching logic
        logger.info(f"Calling find_matching_lawyers for client request ID: {new_client_request.id}")
        potential_matches = await find_matching_lawyers(db=db, client_request=new_client_request)
        logger.info(f"Found {len(potential_matches)} potential matches for client request ID: {new_client_request.id}")

        # Store potential matches
        new_client_request.potential_matches_info = potential_matches
        db.add(new_client_request) # Ensure the session tracks the change
        db.commit()
        db.refresh(new_client_request)
        logger.info(f"Potential matches stored for client request ID: {new_client_request.id}. Updated request finalized.")

        # The ClientRequestResponse model will automatically handle the conversion
        return new_client_request
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create or update client request for {request_data.email} with matching lawyers: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the client request."
        )

# Need to import schemas for request body and response, and auth for current_user
from backend.app.schemas import LawyerUpdateClientRequestStatusRequest, ClientRequestResponse # Assuming ClientRequestResponse can be reused
from backend.app.routers.auth_routes import get_current_active_user # For lawyer identity
from backend.app.models import LegalCase, ClientDB, ClientRole # For CRM integration
import uuid # For generating ClientDB IDs if needed

@router.patch("/{request_id}/lawyer-status", response_model=ClientRequestResponse) # Changed to PATCH as per common practice for partial updates
async def update_client_request_status_by_lawyer(
    request_id: int,
    status_update: LawyerUpdateClientRequestStatusRequest,
    db: Session = Depends(get_db),
    current_user: ClientData = Depends(get_current_active_user) # current_user is ClientData (Pydantic model for user from token)
):
    logger.info(f"Lawyer {current_user.email} (ID: {current_user.id}) attempting to update status for client request ID: {request_id} to {status_update.lawyer_status}")

    db_client_request = db.query(ClientRequest).filter(ClientRequest.id == request_id).first()

    if not db_client_request:
        logger.warning(f"Client request ID: {request_id} not found. Update attempt by lawyer ID: {current_user.id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client request not found.")

    # Authorization: Ensure the current lawyer is the matched lawyer for this request
    if db_client_request.matched_lawyer_id != current_user.id:
        logger.error(
            f"Unauthorized attempt by lawyer ID: {current_user.id} to update client request ID: {request_id}. "
            f"Request is matched to lawyer ID: {db_client_request.matched_lawyer_id}."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this client request.")

    # Update the status and timestamp
    try:
        # Assuming ClientRequestStatusEnum is the enum used in the model
        # and status_update.lawyer_status is also of this enum type (validated by Pydantic)
        db_client_request.lawyer_status = status_update.lawyer_status
        db_client_request.lawyer_status_updated_at = datetime.now(BUCHAREST_TZ)

        logger.info(f"Client request ID: {request_id} lawyer_status updated to {status_update.lawyer_status} by lawyer ID: {current_user.id}")

        # CRM Integration: If status is LOYAL_CLIENT
        if status_update.lawyer_status == ClientRequestStatusEnum.LOYAL_CLIENT:
            logger.info(f"Client request ID: {request_id} marked as LOYAL_CLIENT. Initiating CRM integration for lawyer ID: {current_user.id}.")

            # 1. Find or Create ClientDB record
            db_client = db.query(ClientDB).filter(ClientDB.email == db_client_request.email).first()
            if not db_client:
                logger.info(f"No existing ClientDB record for email {db_client_request.email}. Creating new ClientDB record.")
                new_client_id = str(uuid.uuid4())
                db_client = ClientDB(
                    id=new_client_id,
                    email=db_client_request.email,
                    numeComplet=db_client_request.name,
                    telefon=db_client_request.phone,
                    rol=ClientRole.BASIC, # Default role
                    termeniAcceptati=True, # Implied consent
                    esteContGoogle=False,
                    parolaHash=None, # No password, managed by lawyer or future claim process
                    dataCreare=datetime.now(BUCHAREST_TZ)
                )
                db.add(db_client)
                # We need to commit here so that LegalCase can reference this new client_id
                try:
                    db.commit()
                    db.refresh(db_client)
                    logger.info(f"New ClientDB record created with ID: {db_client.id} for email {db_client.email}.")
                except Exception as e_client_commit:
                    db.rollback()
                    logger.error(f"Error committing new ClientDB record for email {db_client_request.email}: {e_client_commit}", exc_info=True)
                    # Not raising HTTPException here, allow main commit to handle, or log and proceed without CRM case if client creation fails
                    # For now, let the main transaction handle it. If critical, raise specific error.
            else:
                logger.info(f"Found existing ClientDB record with ID: {db_client.id} for email {db_client_request.email}.")

            # 2. Check if a "General Matters" case already exists for this client and lawyer
            general_case_name = f"Dosar General - {db_client.numeComplet}"
            existing_general_case = db.query(LegalCase).filter(
                LegalCase.client_id == db_client.id,
                LegalCase.lawyer_id == current_user.id, # current_user.id is lawyer_id
                LegalCase.case_name == general_case_name
            ).first()

            if not existing_general_case:
                logger.info(f"No existing general case found for client ID: {db_client.id} and lawyer ID: {current_user.id}. Creating new LegalCase.")
                new_legal_case = LegalCase(
                    client_id=db_client.id,
                    lawyer_id=current_user.id, # Matched lawyer is the current user
                    case_name=general_case_name,
                    status="Open",
                    description=f"Client adăugat în CRM ca urmare a marcării solicitării inițiale ({db_client_request.practice_area}) ca 'Client Loial' la data {datetime.now(BUCHAREST_TZ).strftime('%Y-%m-%d')}.",
                    start_date=datetime.now(BUCHAREST_TZ),
                    # created_at and updated_at will be set by default values in the model
                )
                db.add(new_legal_case)
                logger.info(f"New LegalCase '{general_case_name}' prepared for client ID: {db_client.id}, lawyer ID: {current_user.id}.")
            else:
                logger.info(f"Existing general case found (ID: {existing_general_case.id}) for client ID: {db_client.id} and lawyer ID: {current_user.id}. No new case will be created.")

        db.commit()
        db.refresh(db_client_request)
        logger.info(f"Successfully updated and committed client request ID: {request_id}.")

        # Populate response (ensure relationships are loaded if ClientRequestResponse needs them)
        # For ClientRequestResponse, it might need `allocated_lawyer_details` if that's part of its schema.
        # The current schema for ClientRequestResponse doesn't seem to require deep loading beyond what's on the request itself.
        return db_client_request

    except Exception as e:
        db.rollback()
        logger.error(f"Error updating client request ID {request_id} by lawyer ID {current_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the client request status."
        )
