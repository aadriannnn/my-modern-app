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
from pydantic import BaseModel

from ..config import get_settings
from ..db import get_session
from ..models import ClientDB, ClientRole
from ..schemas import (
    LoginRequest,
    RegistrationRequest,
    ClientDataResponse,
    ClientDataResponse
)
from ..email_sender import send_verification_email, send_password_reset_email
import asyncio

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize Google Flow
google_flow = None
try:
    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET and settings.GOOGLE_REDIRECT_URI:
        client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [str(settings.GOOGLE_REDIRECT_URI)],
            }
        }
        google_flow = Flow.from_client_config(
            client_config,
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
            ],
            redirect_uri=str(settings.GOOGLE_REDIRECT_URI)
        )
except Exception as e:
    logger.warning(f"Failed to initialize Google Auth: {e}")

router = APIRouter(prefix="/auth", tags=["auth"])


# Security Context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ACCESS_TOKEN_COOKIE_NAME = "access_token"
SETTINGS_TOKEN_COOKIE_NAME = "settings_access_token"

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

async def verify_settings_access(request: Request) -> bool:
    token = request.cookies.get(SETTINGS_TOKEN_COOKIE_NAME)
    logger.info(f"verify_settings_access: Cookie {SETTINGS_TOKEN_COOKIE_NAME} -> {token}")

    if not token:
        logger.warning("verify_settings_access: No token found in cookies.")
        return False

    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1]

    payload = await verify_token(token)
    logger.info(f"verify_settings_access: Decoded payload -> {payload}")

    if not payload:
        logger.warning("verify_settings_access: Token invalid or decoding failed.")
        return False

    if payload.get("sub") == "settings_admin":
        logger.info("verify_settings_access: Success - Settings Admin identified.")
        return True

    logger.warning(f"verify_settings_access: 'sub' mismatch. Expected 'settings_admin', got '{payload.get('sub')}'")
    return False

async def get_current_admin_or_settings_user(
    request: Request,
    db: Session = Depends(get_session)
):
    # Method 1: Check if it's a regular admin user
    try:
        user = await get_current_user_optional(request, db)
        if user and user.rol == ClientRole.ADMIN:
            return user
    except Exception:
        pass

    # Method 2: Check if it's logged in via settings password
    is_settings_admin = await verify_settings_access(request)
    if is_settings_admin:
        return True

    raise HTTPException(status_code=403, detail="Admin privileges required (via App Account or Settings Password)")

# =======================
# Routes
# =======================

@router.post("/register", status_code=201)
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

    # Verification Token
    verification_token = str(uuid.uuid4())

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
        user_type=data.user_type,
        isVerified=False,
        verificationToken=verification_token
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email asynchronously
    asyncio.create_task(send_verification_email(new_user.email, new_user.numeComplet, verification_token))

    return {"message": "Registration successful. Please check your email to verify your account."}


@router.post("/verify-email", response_model=ClientDataResponse)
async def verify_email_token(
    token: str,
    response: Response,
    db: Session = Depends(get_session)
):
    user = db.exec(select(ClientDB).where(ClientDB.verificationToken == token)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.isVerified = True
    user.verificationToken = None # Invalidate token
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-login after verification
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    auth_token = create_access_token({"sub": user.id, "rol": user.rol.value}, expires_delta=expires)

    samesite = "none" if settings.SECURE_COOKIE else "lax"
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=f"Bearer {auth_token}",
        httponly=True,
        secure=settings.SECURE_COOKIE,
        samesite=samesite,
        max_age=int(expires.total_seconds()),
        path="/"
    )

    return user

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_session)
):
    user = db.exec(select(ClientDB).where(ClientDB.email == data.email)).first()
    if not user:
        # Don't reveal if user exists
        return {"message": "If the email exists, a reset link has been sent."}

    # Generate token
    token = str(uuid.uuid4())
    user.verificationToken = token # Reuse this field or create a new one 'resetToken'? reusing for simplicity as logic is similar
    db.add(user)
    db.commit()

    asyncio.create_task(send_password_reset_email(user.email, user.numeComplet, token))

    return {"message": "If the email exists, a reset link has been sent."}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_session)
):
    user = db.exec(select(ClientDB).where(ClientDB.verificationToken == data.token)).first()
    if not user:
         raise HTTPException(status_code=400, detail="Invalid token")

    user.parolaHash = get_password_hash(data.new_password)
    user.verificationToken = None
    db.add(user)
    db.commit()

    return {"message": "Password reset successful. You can now login."}

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
    request.session["oauth_state"] = state

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


@router.delete("/delete-account")
async def delete_account(
    response: Response,
    current_user: ClientDB = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    try:
        # Delete user
        db.delete(current_user)
        db.commit()

        # Clear cookies
        response.delete_cookie(ACCESS_TOKEN_COOKIE_NAME, path="/")
        return {"message": "Account deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting account: {e}")
        raise HTTPException(status_code=500, detail="Could not delete account")

# =======================
# User Management Routes
# =======================

@router.get("/users", dependencies=[Depends(get_current_admin_or_settings_user)])
async def list_users(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_session)
):
    from sqlmodel import func, or_

    offset = (page - 1) * limit

    query = select(ClientDB)

    if search:
        search_filter = or_(
            ClientDB.email.ilike(f"%{search}%"),
            ClientDB.numeComplet.ilike(f"%{search}%"),
            ClientDB.cuiFacturare.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = db.exec(count_query).one()

    # Get items
    query = query.offset(offset).limit(limit).order_by(ClientDB.dataCreare.desc())
    items = db.exec(query).all()

    total_pages = (total + limit - 1) // limit

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }

class UserRoleUpdate(BaseModel):
    rol: ClientRole

@router.put("/users/{user_id}/role", dependencies=[Depends(get_current_admin_or_settings_user)])
async def update_user_role(
    user_id: str,
    update_data: UserRoleUpdate,
    db: Session = Depends(get_session)
):
    user = db.get(ClientDB, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.rol = update_data.rol
    db.add(user)
    db.commit()
    db.refresh(user)

    return user
