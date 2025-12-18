
import json
import logging
import os
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status, Header, Body, Query
import stripe
from stripe import SignatureVerificationError, InvalidRequestError, StripeError
from pydantic import ValidationError, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from ..db import get_session

# --- Imports from project ---
from ..config import get_settings

settings = get_settings()
from ..models import (
    ClientDB, ClientRole
)
# We will define the Pydantic models here locally for now if they don't exist in base models,
# or import them if you prefer. To avoid circular imports or missing defined models,
# I will define the specific Request/Response models for billing here.

from .auth import get_current_user
# Helper function to update user subscription details (we'll implement this logic inline or helper)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])

# Configure Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY
else:
    logger.warning("STRIPE_SECRET_KEY is not set. Stripe operations will fail.")

# --- Models used for Billing ---

from pydantic import BaseModel

class SubscriptionPlanFeature(BaseModel):
    name: str
    details: Optional[str] = None

class SubscriptionPlan(BaseModel):
    id: str
    name: str
    price: float
    currency: str
    interval: str
    points_granted: int = 0
    features: List[SubscriptionPlanFeature]
    is_popular: bool = False
    discount_percentage: Optional[int] = None
    is_customizable: bool = False
    stripe_price_id: Optional[str] = None
    cta_text: str = "Comandă"
    cta_link: Optional[str] = None
    is_free: bool = False

class SubscriptionPageData(BaseModel):
    plans: List[SubscriptionPlan]

class CreateCheckoutSessionRequest(BaseModel):
    stripe_price_id: str

class BillingData(BaseModel):
    numeFacturare: Optional[str] = None
    adresaFacturare: Optional[str] = None
    cuiFacturare: Optional[str] = None
    nrRegComFacturare: Optional[str] = None
    telefonFacturare: Optional[str] = None
    banca: Optional[str] = None
    contIBAN: Optional[str] = None

class CreateCheckoutSessionWithBillingResponse(BaseModel):
    clientSecret: Optional[str]
    billingData: BillingData

class SessionStatusResponse(BaseModel):
    status: str
    customer_email: Optional[str] = None

# --- Helper Logic ---

async def update_user_subscription_details(
    db: Session,
    user_id: str,
    customer_id: Optional[str] = None,
    subscription_id: Optional[str] = None,
    status: Optional[str] = None,
    pro_status_active_until: Optional[datetime] = None
):
    user = db.query(ClientDB).filter(ClientDB.id == user_id).first()
    if not user:
        logger.error(f"Could not find user {user_id} to update subscription details.")
        return

    if customer_id:
        user.stripe_customer_id = customer_id
    if subscription_id:
        user.stripe_subscription_id = subscription_id
    if status:
        user.subscription_status = status

    # Update Role based on status
    if status == 'active' or status == 'trialing':
        user.rol = ClientRole.PRO
        if pro_status_active_until:
             pass # Logic to extend or set date
    elif status == 'canceled' or status == 'unpaid':
         # Don't downgrade immediately, check valid until
         pass

    if pro_status_active_until:
        user.pro_status_active_until = pro_status_active_until

    db.commit()
    db.refresh(user)


# --- Routes ---

# Path to subscriptions data file
# Assuming backend/app/routers/billing_routes.py -> backend/app/data/subscriptions_data.json
APP_DIR = Path(__file__).resolve().parent.parent
DATA_FILE_PLANS = APP_DIR / "data" / "subscriptions_data.json"

@router.get("/plans", response_model=SubscriptionPageData, summary="Get Subscription Plans")
async def get_subscription_plans():
    logger.info(f"Loading subscription plans from: {DATA_FILE_PLANS}")
    if not DATA_FILE_PLANS.is_file():
        logger.error(f"Subscription data file not found at {DATA_FILE_PLANS}")
        # Return fallback data or empty
        return SubscriptionPageData(plans=[])

    try:
        with open(DATA_FILE_PLANS, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return SubscriptionPageData.model_validate(data)
    except Exception as e:
        logger.error(f"Error loading plans: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not load subscription plans.")

@router.post("/create-checkout-session", response_model=CreateCheckoutSessionWithBillingResponse)
async def create_checkout_session(
    request_data: CreateCheckoutSessionRequest,
    current_user: ClientDB = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    logger.info(f"User {current_user.email} initiating checkout for {request_data.stripe_price_id}")

    # Reload user from DB to get latest stripe_customer_id
    user_db = db.query(ClientDB).filter(ClientDB.id == current_user.id).first()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")

    stripe_customer_id = user_db.stripe_customer_id

    # Create or Update Stripe Customer
    if not stripe_customer_id:
        try:
            customer_args = {
                'email': current_user.email,
                'name': current_user.numeComplet,
                'metadata': {'app_user_id': str(current_user.id)}
            }
            customer = stripe.Customer.create(**customer_args)
            stripe_customer_id = customer.id
            user_db.stripe_customer_id = stripe_customer_id
            db.commit()
            logger.info(f"Created new Stripe customer {stripe_customer_id} for user {current_user.id}")
        except Exception as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            raise HTTPException(status_code=500, detail="Failed to create payment profile.")

    # Create Checkout Session
    try:
        session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{'price': request_data.stripe_price_id, 'quantity': 1}],
            mode='subscription',
            ui_mode='embedded',
            return_url=f"{settings.FRONTEND_BASE_URL}/payment-return?session_id={{CHECKOUT_SESSION_ID}}",
            metadata={
                'app_user_id': str(current_user.id),
                'email': current_user.email
            }
        )

        billing_data = BillingData(
            numeFacturare=user_db.numeFacturare,
            adresaFacturare=user_db.adresaFacturare,
            cuiFacturare=user_db.cuiFacturare,
            nrRegComFacturare=user_db.nrRegComFacturare,
            telefonFacturare=user_db.telefonFacturare
        )

        return CreateCheckoutSessionWithBillingResponse(
            clientSecret=session.client_secret,
            billingData=billing_data
        )

    except Exception as e:
        logger.error(f"Stripe Session creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session-status", response_model=SessionStatusResponse)
async def session_status(session_id: str, current_user: ClientDB = Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return SessionStatusResponse(
            status=session.status,
            customer_email=session.customer_details.email if session.customer_details else None
        )
    except Exception as e:
        logger.error(f"Error retrieving session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve session status.")

@router.post("/create-billing-portal-session")
async def create_billing_portal_session(
    current_user: ClientDB = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    user_db = db.query(ClientDB).filter(ClientDB.id == current_user.id).first()
    if not user_db or not user_db.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found.")

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=user_db.stripe_customer_id,
            return_url=f"{settings.FRONTEND_BASE_URL}/setari"
        )
        return {"url": portal_session.url}
    except Exception as e:
        logger.error(f"Portal creation failed: {e}")
        raise HTTPException(status_code=500, detail="Could not create billing portal session.")

@router.post("/stripe-webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_session)):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    logger.info(f"Webhook received: {event.type}")

    # Handle events
    if event.type == 'checkout.session.completed':
        session = event.data.object
        app_user_id = session.metadata.get('app_user_id')
        if app_user_id:
            await update_user_subscription_details(
                db,
                user_id=app_user_id,
                customer_id=session.customer,
                subscription_id=session.subscription,
                status='active' # Simplification, check payment status ideally
            )

    elif event.type == 'customer.subscription.updated':
        subscription = event.data.object
        # Look up user by customer id
        user_db = db.query(ClientDB).filter(ClientDB.stripe_customer_id == subscription.customer).first()
        if user_db:
            await update_user_subscription_details(
                db,
                user_id=str(user_db.id),
                subscription_id=subscription.id,
                status=subscription.status,
                pro_status_active_until=datetime.fromtimestamp(subscription.current_period_end)
            )

    elif event.type == 'customer.subscription.deleted':
        subscription = event.data.object
        user_db = db.query(ClientDB).filter(ClientDB.stripe_customer_id == subscription.customer).first()
        if user_db:
             await update_user_subscription_details(
                db,
                user_id=str(user_db.id),
                status='canceled'
            )

    return {"status": "success"}
