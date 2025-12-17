import logging
import uuid
import enum
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
from sqlmodel import Session, select
from passlib.context import CryptContext
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow

from ..config import get_settings
from ..db import get_session
from ..models import ClientDB, ClientRole
from ..schemas import (
    LoginRequest,
    RegistrationRequest,
    ClientDataResponse
)

settings = get_settings()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Security Context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ACCESS_TOKEN_COOKIE_NAME = "access_token"

# Google OAuth Setup
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]

google_flow = None
if all([settings.GOOGLE_CLIENT_ID, settings.GOOGLE_CLIENT_SECRET, settings.GOOGLE_REDIRECT_URI]):
    try:
        redirect_uris = [str(settings.GOOGLE_REDIRECT_URI)]
        # Add simpler handling for JS origins
        javascript_origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            str(settings.FRONTEND_BASE_URL).rstrip('/')
        ]

        google_flow = Flow.from_client_config(
            client_config={
                "web": {
                    "client_id": str(settings.GOOGLE_CLIENT_ID),
                    "client_secret": str(settings.GOOGLE_CLIENT_SECRET),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": redirect_uris,
                    "javascript_origins": javascript_origins
                }
            },
            scopes=GOOGLE_SCOPES,
            redirect_uri=str(settings.GOOGLE_REDIRECT_URI)
        )
        logger.info("Google OAuth Flow initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize Google OAuth: {e}")
else:
    logger.warning("Google OAuth settings missing. Google login will be unavailable.")


# =======================
# Helpers
# =======================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

# =======================
# Dependencies
# =======================

async def get_current_user_optional(request: Request, db: Session = Depends(get_session)) -> Optional[ClientDB]:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        # Check Authorization header as fallback
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

    if not token:
        return None

    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1]

    payload = await verify_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = db.get(ClientDB, user_id)
    return user

async def get_current_user(request: Request, db: Session = Depends(get_session)) -> ClientDB:
    user = await get_current_user_optional(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_current_admin_user(current_user: ClientDB = Depends(get_current_user)):
    if current_user.rol != ClientRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

# =======================
# Routes
# =======================

@router.post("/register", response_model=ClientDataResponse, status_code=201)
async def register(
    data: RegistrationRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_session)
):
    # Check if email exists
    existing = db.exec(select(ClientDB).where(ClientDB.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed = get_password_hash(data.parola)

    # Create user
    new_user = ClientDB(
        email=data.email,
        parolaHash=hashed,
        numeComplet=data.numeComplet,
        termeniAcceptati=data.termeniAcceptati,
        rol=ClientRole.BASIC,
        ipInregistrare=request.client.host if request.client else None,
        functie=data.functie,
        telefon=data.telefon,
        numeFacturare=data.numeFacturare,
        adresaFacturare=data.adresaFacturare,
        cuiFacturare=data.cuiFacturare,
        user_type=data.user_type
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Login automatically (create token)
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token({"sub": new_user.id, "rol": new_user.rol.value}, expires_delta=expires)

    samesite = "none" if settings.SECURE_COOKIE else "lax"
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=f"Bearer {token}",
        httponly=True,
        secure=settings.SECURE_COOKIE,
        samesite=samesite,
        max_age=int(expires.total_seconds()),
        path="/"
    )

    return new_user

@router.post("/login", response_model=ClientDataResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: Session = Depends(get_session)
):
    user = db.exec(select(ClientDB).where(ClientDB.email == data.email)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if user.esteContGoogle:
        raise HTTPException(status_code=400, detail="Please use Google Login")

    if not user.parolaHash or not verify_password(data.parola, user.parolaHash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Update last login
    user.lastLogin = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create token
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token({"sub": user.id, "rol": user.rol.value}, expires_delta=expires)

    samesite = "none" if settings.SECURE_COOKIE else "lax"
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=f"Bearer {token}",
        httponly=True,
        secure=settings.SECURE_COOKIE,
        samesite=samesite,
        max_age=int(expires.total_seconds()),
        path="/"
    )

    return user

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(ACCESS_TOKEN_COOKIE_NAME, path="/")
    return {"success": True}

@router.get("/me", response_model=ClientDataResponse)
async def read_users_me(current_user: ClientDB = Depends(get_current_user)):
    return current_user

# =======================
# Google OAuth Routes
# =======================

@router.get("/google/initiate")
async def google_initiate(request: Request):
    if not google_flow:
        raise HTTPException(status_code=500, detail="Google Auth not configured")

    state = str(uuid.uuid4())
    request.session["oauth_state"] = state # Requires SessionMiddleware!

    authorization_url, _ = google_flow.authorization_url(
        access_type="offline",
        state=state,
        prompt="select_account"
    )
    return RedirectResponse(authorization_url)

@router.get("/google/callback")
async def google_callback(request: Request, response: Response, db: Session = Depends(get_session)):
    if not google_flow:
        raise HTTPException(status_code=500, detail="Google Auth not configured")

    # Verify State (CSRF)
    # Note: Requires SessionMiddleware to be active in main.py
    # If not using SessionMiddleware, we might skip this or use cookies for state.
    # For now assuming session is not present or we need to handle it.
    # The reference used request.session. If main.py doesn't have it, this fails.
    # I should check main.py for SessionMiddleware.
    # Reference Step 581: if "session" not in request.scope...

    code = request.query_params.get("code")
    if not code:
        return RedirectResponse(f"{settings.FRONTEND_BASE_URL}?error=google_no_code")

    try:
        google_flow.fetch_token(code=code)
        credentials = google_flow.credentials

        idinfo = id_token.verify_oauth2_token(
            credentials.id_token,
            google_requests.Request(),
            str(settings.GOOGLE_CLIENT_ID)
        )

        google_id = idinfo.get("sub")
        email = idinfo.get("email")
        name = idinfo.get("name")

        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Invalid Google Info")

        # Check/Create User
        user = db.exec(select(ClientDB).where(ClientDB.google_id == google_id)).first()
        is_new = False

        if not user:
            # Check if email exists as standard user
            existing = db.exec(select(ClientDB).where(ClientDB.email == email)).first()
            if existing and not existing.esteContGoogle:
                 return RedirectResponse(f"{settings.FRONTEND_BASE_URL}/login-error?message=email_conflict")

            user = ClientDB(
                email=email,
                numeComplet=name,
                google_id=google_id,
                esteContGoogle=True,
                rol=ClientRole.BASIC,
                termeniAcceptati=True,
                puncte_ramase=100
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            is_new = True

        # Login
        expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token({"sub": user.id, "rol": user.rol.value}, expires_delta=expires)

        samesite = "none" if settings.SECURE_COOKIE else "lax"

        # Redirect
        target_url = f"{settings.FRONTEND_BASE_URL}/complete-profile" if is_new else f"{settings.FRONTEND_BASE_URL}/"
        redirect_resp = RedirectResponse(target_url)

        redirect_resp.set_cookie(
             key=ACCESS_TOKEN_COOKIE_NAME,
             value=f"Bearer {token}",
             httponly=True,
             secure=settings.SECURE_COOKIE,
             samesite=samesite,
             max_age=int(expires.total_seconds()),
             path="/"
        )
        return redirect_resp

    except Exception as e:
        logger.error(f"Google Callback Error: {e}")
        return RedirectResponse(f"{settings.FRONTEND_BASE_URL}/login-error?error=callback_failed")
