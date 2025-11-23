from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from ..config import get_settings
from typing import Annotated
import logging

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBasic()
logger = logging.getLogger(__name__)

def get_current_user(credentials: Annotated[HTTPBasicCredentials, Depends(security)]):
    settings = get_settings()

    # Check if credentials are set in env
    if not settings.USER_SETARI or not settings.PASS_SETARI:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server authentication not configured"
        )

    is_user_correct = credentials.username == settings.USER_SETARI
    is_pass_correct = credentials.password == settings.PASS_SETARI

    if not (is_user_correct and is_pass_correct):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Endpoint pentru autentificarea utilizatorilor care vor accesa pagina de setări.
    Credențialele sunt citite din variabilele de mediu USER_SETARI și PASS_SETARI.
    """
    settings = get_settings()

    # Log incoming request (mask password)
    logger.info(f"[AUTH] Login attempt for username: '{request.username}'")
    logger.debug(f"[AUTH] Request username length: {len(request.username)}, password length: {len(request.password)}")

    # Verifică dacă credențialele sunt configurate
    if not settings.USER_SETARI or not settings.PASS_SETARI:
        logger.error("[AUTH] USER_SETARI or PASS_SETARI not configured in environment")
        raise HTTPException(
            status_code=500,
            detail="Credențialele de autentificare nu sunt configurate în server"
        )

    # Log expected credentials (for debugging only - remove in production)
    logger.info(f"[AUTH] Expected username: '{settings.USER_SETARI}' (length: {len(settings.USER_SETARI)})")
    logger.debug(f"[AUTH] Expected password length: {len(settings.PASS_SETARI)}")

    # Detailed comparison logging
    username_match = request.username == settings.USER_SETARI
    password_match = request.password == settings.PASS_SETARI

    logger.info(f"[AUTH] Username match: {username_match}")
    logger.info(f"[AUTH] Password match: {password_match}")

    if not username_match:
        logger.warning(f"[AUTH] Username mismatch - received: '{request.username}', expected: '{settings.USER_SETARI}'")
        logger.debug(f"[AUTH] Username comparison - received bytes: {request.username.encode()}, expected bytes: {settings.USER_SETARI.encode()}")

    if not password_match:
        logger.warning(f"[AUTH] Password mismatch")
        logger.debug(f"[AUTH] Received password first 3 chars: '{request.password[:3] if len(request.password) >= 3 else request.password}***'")

    # Validează credențialele
    if username_match and password_match:
        logger.info(f"[AUTH] Login successful for user: '{request.username}'")
        return LoginResponse(success=True)

    # Credențiale incorecte
    logger.warning(f"[AUTH] Login failed for user: '{request.username}'")
    raise HTTPException(
        status_code=401,
        detail="Utilizator sau parolă incorectă"
    )
