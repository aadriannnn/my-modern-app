from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


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
