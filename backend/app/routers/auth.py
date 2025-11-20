from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from ..config import get_settings
from typing import Annotated

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBasic()

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

    # Verifică dacă credențialele sunt configurate
    if not settings.USER_SETARI or not settings.PASS_SETARI:
        raise HTTPException(
            status_code=500,
            detail="Credențialele de autentificare nu sunt configurate în server"
        )

    # Validează credențialele
    if request.username == settings.USER_SETARI and request.password == settings.PASS_SETARI:
        return LoginResponse(success=True)

    # Credențiale incorecte
    raise HTTPException(
        status_code=401,
        detail="Utilizator sau parolă incorectă"
    )
