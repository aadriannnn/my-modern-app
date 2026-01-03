
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
    """
    Comprehensive Stripe webhook handler for subscription lifecycle events.
    Handles: checkout completion, subscription creation/update/deletion, invoice payments.
    """
    from ..lib.subscription_helpers import (
        validate_and_upgrade_user,
        downgrade_user_to_basic,
        cancel_subscription,
        calculate_subscription_end_date,
        get_plan_name_from_id,
        get_plan_price
    )
    from ..email_sender import (
        send_subscription_confirmation_email,
        send_subscription_activated_email,
        send_subscription_cancelled_email,
        send_subscription_expired_email
    )

    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    logger.info(f"🔔 Webhook received: {event.type}")

    try:
        # ==================================================================
        # Event: checkout.session.completed
        # When: User completes payment in Stripe Checkout
        # ==================================================================
        if event.type == 'checkout.session.completed':
            session = event.data.object
            app_user_id = session.metadata.get('app_user_id')

            if not app_user_id:
                logger.warning("checkout.session.completed without app_user_id in metadata")
                return {"status": "ignored"}

            # Get subscription details from Stripe
            subscription_id = session.subscription
            customer_id = session.customer

            # Retrieve the actual subscription object for detailed info
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
                plan_price_id = subscription['items']['data'][0]['price']['id']

                # Map Stripe price ID to our plan ID
                price_to_plan_map = {
                    settings.STRIPE_PRICE_ID_PREMIUM_MONTHLY: "premium_monthly",
                    settings.STRIPE_PRICE_ID_PREMIUM_SEMIANNUAL: "premium_semiannual",
                    settings.STRIPE_PRICE_ID_PREMIUM_ANNUAL: "premium_annual"
                }

                plan_id = price_to_plan_map.get(plan_price_id, "premium_monthly")
                amount_paid = session.amount_total / 100.0 if session.amount_total else get_plan_price(plan_id)

            except Exception as e:
                logger.error(f"Error retrieving subscription details: {e}")
                plan_id = "premium_monthly"
                amount_paid = 70.0

            # Upgrade user
            subscription_data = {
                'stripe_subscription_id': subscription_id,
                'stripe_customer_id': customer_id,
                'amount': amount_paid,
                'currency': 'RON',
                'payment_method': 'card',
                'start_date': datetime.utcnow()
            }

            success = await validate_and_upgrade_user(db, app_user_id, plan_id, subscription_data)

            if success:
                # Get updated user
                user = db.query(ClientDB).filter(ClientDB.id == app_user_id).first()
                if user:
                    # Send confirmation email
                    await send_subscription_confirmation_email(
                        user_email=user.email,
                        user_name=user.numeComplet,
                        plan_name=get_plan_name_from_id(plan_id),
                        subscription_start=user.subscription_start_date,
                        subscription_end=user.subscription_end_date,
                        amount=amount_paid,
                        currency='RON'
                    )
                    logger.info(f"✓ User {user.email} upgraded via checkout.session.completed")

        # ==================================================================
        # Event: customer.subscription.created
        # When: Subscription is created (after checkout)
        # ==================================================================
        elif event.type == 'customer.subscription.created':
            subscription = event.data.object
            customer_id = subscription.customer

            user_db = db.query(ClientDB).filter(ClientDB.stripe_customer_id == customer_id).first()
            if user_db and user_db.rol == ClientRole.PRO:
                # Send activation email
                plan_name = get_plan_name_from_id(user_db.subscription_plan_id or "premium_monthly")
                await send_subscription_activated_email(
                    user_email=user_db.email,
                    user_name=user_db.numeComplet,
                    plan_name=plan_name
                )
                logger.info(f"✓ Activation email sent to {user_db.email}")

        # ==================================================================
        # Event: customer.subscription.updated
        # When: Subscription status changes (renewal, reactivation, etc.)
        # ==================================================================
        elif event.type == 'customer.subscription.updated':
            subscription = event.data.object
            customer_id = subscription.customer
            new_status = subscription.status
            current_period_end = datetime.fromtimestamp(subscription.current_period_end)

            user_db = db.query(ClientDB).filter(ClientDB.stripe_customer_id == customer_id).first()
            if user_db:
                user_db.subscription_status = new_status
                user_db.subscription_end_date = current_period_end
                user_db.pro_status_active_until = current_period_end

                # Handle status changes
                if new_status == 'active':
                    user_db.rol = ClientRole.PRO
                    logger.info(f"✓ Subscription reactivated for {user_db.email}")
                elif new_status in ['past_due', 'unpaid']:
                    logger.warning(f"⚠️ Subscription {new_status} for {user_db.email}")
                    # Keep PRO access but flag as problematic
                    user_db.subscription_status = new_status

                db.commit()
                logger.info(f"✓ Subscription updated for {user_db.email}: status={new_status}")

        # ==================================================================
        # Event: customer.subscription.deleted
        # When: Subscription is cancelled by user or expires
        # ==================================================================
        elif event.type == 'customer.subscription.deleted':
            subscription = event.data.object
            customer_id = subscription.customer

            user_db = db.query(ClientDB).filter(ClientDB.stripe_customer_id == customer_id).first()
            if user_db:
                # Mark as cancelled
                if not user_db.subscription_cancelled_at:
                    user_db.subscription_cancelled_at = datetime.utcnow()

                user_db.subscription_auto_renew = False
                user_db.subscription_status = "cancelled"

                # Check if we should downgrade immediately or wait
                if user_db.subscription_end_date and user_db.subscription_end_date < datetime.utcnow():
                    # Already expired, downgrade now
                    await downgrade_user_to_basic(db, str(user_db.id), "expired")
                    plan_name = get_plan_name_from_id(user_db.subscription_plan_id or "Premium")
                    await send_subscription_expired_email(
                        user_email=user_db.email,
                        user_name=user_db.numeComplet,
                        expired_date=user_db.subscription_end_date,
                        plan_name=plan_name
                    )
                else:
                    # Still has time, send cancellation email with access_until date
                    db.commit()
                    plan_name = get_plan_name_from_id(user_db.subscription_plan_id or "Premium")
                    await send_subscription_cancelled_email(
                        user_email=user_db.email,
                        user_name=user_db.numeComplet,
                        plan_name=plan_name,
                        access_until=user_db.subscription_end_date
                    )

                logger.info(f"✓ Subscription deleted for {user_db.email}")

        # ==================================================================
        # Event: invoice.payment_succeeded
        # When: Payment for subscription renewal succeeds
        # ==================================================================
        elif event.type == 'invoice.payment_succeeded':
            invoice = event.data.object
            customer_id = invoice.customer
            subscription_id = invoice.subscription

            if subscription_id:  # Only process subscription invoices
                user_db = db.query(ClientDB).filter(ClientDB.stripe_customer_id == customer_id).first()
                if user_db:
                    # Retrieve subscription for new period end
                    try:
                        subscription = stripe.Subscription.retrieve(subscription_id)
                        new_period_end = datetime.fromtimestamp(subscription.current_period_end)

                        user_db.subscription_end_date = new_period_end
                        user_db.pro_status_active_until = new_period_end
                        user_db.subscription_status = "active"
                        user_db.rol = ClientRole.PRO  # Ensure still PRO

                        db.commit()
                        logger.info(f"✓ Subscription renewed for {user_db.email} until {new_period_end}")

                        # Send renewal confirmation email
                        plan_name = get_plan_name_from_id(user_db.subscription_plan_id or "Premium")
                        await send_subscription_confirmation_email(
                            user_email=user_db.email,
                            user_name=user_db.numeComplet,
                            plan_name=plan_name,
                            subscription_start=datetime.utcnow(),
                            subscription_end=new_period_end,
                            amount=invoice.amount_paid / 100.0,
                            currency='RON'
                        )
                    except Exception as e:
                        logger.error(f"Error processing invoice.payment_succeeded: {e}")

        # ==================================================================
        # Event: invoice.payment_failed
        # When: Payment for subscription renewal fails
        # ==================================================================
        elif event.type == 'invoice.payment_failed':
            invoice = event.data.object
            customer_id = invoice.customer

            user_db = db.query(ClientDB).filter(ClientDB.stripe_customer_id == customer_id).first()
            if user_db:
                user_db.subscription_status = "payment_failed"
                db.commit()
                logger.warning(f"⚠️ Payment failed for {user_db.email}")

                # TODO: Send payment failed email (can add later)
                # After 3 failures, Stripe will cancel the subscription automatically

    except Exception as e:
        logger.error(f"Error processing webhook {event.type}: {e}", exc_info=True)
        # Return 200 even on error to prevent Stripe retries
        return {"status": "error", "message": str(e)}

    return {"status": "success"}


# ==================================================================
# SUBSCRIPTION MANAGEMENT ENDPOINTS (User)
# ==================================================================

@router.get("/subscription/status")
async def get_subscription_status(
    current_user: ClientDB = Depends(get_current_user)
):
    """Get current subscription status for authenticated user."""
    from ..lib.subscription_helpers import get_subscription_status_summary

    return get_subscription_status_summary(current_user)


@router.post("/subscription/cancel")
async def cancel_user_subscription(
    current_user: ClientDB = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Cancel subscription but keep access until end of billing period."""
    from ..lib.subscription_helpers import cancel_subscription
    from ..email_sender import send_subscription_cancelled_email

    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription found")

    try:
        # Cancel in Stripe
        stripe.Subscription.modify(
            current_user.stripe_subscription_id,
            cancel_at_period_end=True
        )

        # Update local DB
        success = await cancel_subscription(db, str(current_user.id))

        if success:
            # Refresh user
            db.refresh(current_user)

            # Send email
            from ..lib.subscription_helpers import get_plan_name_from_id
            await send_subscription_cancelled_email(
                user_email=current_user.email,
                user_name=current_user.numeComplet,
                plan_name=get_plan_name_from_id(current_user.subscription_plan_id or "Premium"),
                access_until=current_user.subscription_end_date
            )

            return {
                "success": True,
                "message": "Subscription cancelled. Access remains until end of billing period.",
                "access_until": current_user.subscription_end_date.isoformat() if current_user.subscription_end_date else None
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to cancel subscription")

    except Exception as e:
        logger.error(f"Cancel subscription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subscription/reactivate")
async def reactivate_subscription(
    current_user: ClientDB = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Reactivate a cancelled subscription."""
    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No subscription found")

    try:
        # Reactivate in Stripe
        stripe.Subscription.modify(
            current_user.stripe_subscription_id,
            cancel_at_period_end=False
        )

        # Update local DB
        user = db.query(ClientDB).filter(ClientDB.id == current_user.id).first()
        if user:
            user.subscription_auto_renew = True
            user.subscription_status = "active"
            user.subscription_cancelled_at = None
            db.commit()

            return {
                "success": True,
                "message": "Subscription reactivated successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="User not found")

    except Exception as e:
        logger.error(f"Reactivate subscription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================================
# ADMIN ENDPOINTS
# ==================================================================

@router.get("/admin/subscriptions")
async def list_all_subscriptions(
    current_user: ClientDB = Depends(get_current_user),
    db: Session = Depends(get_session),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    plan_filter: Optional[str] = Query(None, description="Filter by plan"),
    limit: int = Query(50, le=500),
    offset: int = Query(0)
):
    """List all subscriptions (admin only)."""
    if current_user.rol != ClientRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    query = db.query(ClientDB).filter(ClientDB.subscription_plan_id.isnot(None))

    if status_filter:
        query = query.filter(ClientDB.subscription_status == status_filter)

    if plan_filter:
        query = query.filter(ClientDB.subscription_plan_id == plan_filter)

    total = query.count()
    users = query.offset(offset).limit(limit).all()

    from ..lib.subscription_helpers import get_subscription_status_summary

    return {
        "total": total,
        "subscriptions": [
            {
                "user_id": user.id,
                "email": user.email,
                "name": user.numeComplet,
                **get_subscription_status_summary(user)
            }
            for user in users
        ]
    }


@router.post("/admin/grant-subscription")
async def admin_grant_subscription(
    user_id: str = Body(...),
    plan_id: str = Body(...),
    duration_days: int = Body(...),
    reason: str = Body(default="admin_grant"),
    current_user: ClientDB = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Manually grant subscription to a user (admin only)."""
    if current_user.rol != ClientRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    from ..lib.subscription_helpers import grant_manual_subscription, get_plan_name_from_id
    from ..email_sender import send_subscription_confirmation_email
    from datetime import timedelta

    success = await grant_manual_subscription(db, user_id, plan_id, duration_days, reason)

    if success:
        # Get updated user and send email
        user = db.query(ClientDB).filter(ClientDB.id == user_id).first()
        if user:
            await send_subscription_confirmation_email(
                user_email=user.email,
                user_name=user.numeComplet,
                plan_name=get_plan_name_from_id(plan_id),
                subscription_start=user.subscription_start_date,
                subscription_end=user.subscription_end_date,
                amount=0.0,
                currency="RON"
            )

        return {
            "success": True,
            "message": f"Granted {plan_id} for {duration_days} days to user {user_id}"
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to grant subscription")


@router.post("/admin/extend-subscription")
async def admin_extend_subscription(
    user_id: str = Body(...),
    additional_days: int = Body(...),
    reason: str = Body(default="admin_extension"),
    current_user: ClientDB = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Extend an existing subscription (admin only)."""
    if current_user.rol != ClientRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    from ..lib.subscription_helpers import extend_subscription

    success = await extend_subscription(db, user_id, additional_days, reason)

    if success:
        return {
            "success": True,
            "message": f"Extended subscription by {additional_days} days"
        }
    else:
        raise HTTPException(status_code=404, detail="User or subscription not found")
