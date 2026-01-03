"""
Subscription helper functions for billing and subscription management.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models import ClientDB, ClientRole
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def calculate_subscription_end_date(start_date: datetime, plan_id: str) -> datetime:
    """
    Calculate subscription end date based on plan interval.

    Args:
        start_date: When the subscription starts
        plan_id: Plan identifier (premium_monthly, premium_semiannual, premium_annual)

    Returns:
        datetime: When the subscription will expire
    """
    interval_map = {
        "premium_monthly": 30,  # 1 month = 30 days
        "premium_semiannual": 180,  # 6 months = 180 days
        "premium_annual": 365  # 1 year = 365 days
    }

    days = interval_map.get(plan_id, 30)  # Default to 30 days if unknown
    end_date = start_date + timedelta(days=days)

    logger.info(f"Calculated end date for plan {plan_id}: {start_date} + {days} days = {end_date}")
    return end_date


def get_plan_name_from_id(plan_id: str) -> str:
    """Convert plan ID to human-readable name."""
    name_map = {
        "premium_monthly": "Premium - Lunar",
        "premium_semiannual": "Premium - 6 Luni",
        "premium_annual": "Premium - Anual"
    }
    return name_map.get(plan_id, plan_id)


def get_plan_price(plan_id: str) -> float:
    """Get plan price in RON."""
    price_map = {
        "premium_monthly": 70.0,
        "premium_semiannual": 360.0,
        "premium_annual": 600.0
    }
    return price_map.get(plan_id, 0.0)


async def validate_and_upgrade_user(
    db: Session,
    user_id: str,
    plan_id: str,
    subscription_data: Dict[str, Any]
) -> bool:
    """
    Validate subscription data and upgrade user to PRO.

    Args:
        db: Database session
        user_id: User ID to upgrade
        plan_id: Subscription plan ID
        subscription_data: Dictionary containing:
            - stripe_subscription_id
            - stripe_customer_id
            - amount
            - currency
            - payment_method
            - start_date (optional, defaults to now)

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        user = db.query(ClientDB).filter(ClientDB.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for upgrade")
            return False

        # Calculate dates
        start_date = subscription_data.get('start_date', datetime.utcnow())
        end_date = calculate_subscription_end_date(start_date, plan_id)

        # Update user fields
        user.rol = ClientRole.PRO
        user.subscription_plan_id = plan_id
        user.subscription_start_date = start_date
        user.subscription_end_date = end_date
        user.subscription_status = "active"
        user.subscription_payment_method = subscription_data.get('payment_method', 'card')
        user.subscription_amount = subscription_data.get('amount')
        user.subscription_currency = subscription_data.get('currency', 'RON')
        user.subscription_auto_renew = True
        user.subscription_cancelled_at = None

        # Update Stripe fields
        user.stripe_subscription_id = subscription_data.get('stripe_subscription_id')
        user.stripe_customer_id = subscription_data.get('stripe_customer_id')
        user.pro_status_active_until = end_date

        db.commit()
        db.refresh(user)

        logger.info(f"✓ User {user.email} upgraded to {plan_id} until {end_date}")
        return True

    except Exception as e:
        logger.error(f"✗ Failed to upgrade user {user_id}: {e}", exc_info=True)
        db.rollback()
        return False


async def downgrade_user_to_basic(db: Session, user_id: str, reason: str = "expired") -> bool:
    """
    Downgrade user from PRO to BASIC.

    Args:
        db: Database session
        user_id: User ID to downgrade
        reason: Reason for downgrade (expired, cancelled, payment_failed)

    Returns:
        bool: True if successful
    """
    try:
        user = db.query(ClientDB).filter(ClientDB.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for downgrade")
            return False

        previous_plan = user.subscription_plan_id
        user.rol = ClientRole.BASIC
        user.subscription_status = reason
        user.subscription_auto_renew = False

        # Keep historical data but mark as inactive
        # Don't clear subscription_plan_id, start_date, end_date for history

        db.commit()
        db.refresh(user)

        logger.info(f"✓ User {user.email} downgraded from {previous_plan} to BASIC (reason: {reason})")
        return True

    except Exception as e:
        logger.error(f"✗ Failed to downgrade user {user_id}: {e}", exc_info=True)
        db.rollback()
        return False


async def cancel_subscription(db: Session, user_id: str) -> bool:
    """
    Mark subscription as cancelled but keep access until end date.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        bool: True if successful
    """
    try:
        user = db.query(ClientDB).filter(ClientDB.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for cancellation")
            return False

        user.subscription_auto_renew = False
        user.subscription_cancelled_at = datetime.utcnow()
        user.subscription_status = "cancelled"

        # User keeps PRO access until subscription_end_date
        # The background task will downgrade them when end_date is reached

        db.commit()
        db.refresh(user)

        logger.info(f"✓ Subscription cancelled for {user.email}, access until {user.subscription_end_date}")
        return True

    except Exception as e:
        logger.error(f"✗ Failed to cancel subscription for {user_id}: {e}", exc_info=True)
        db.rollback()
        return False


async def extend_subscription(
    db: Session,
    user_id: str,
    additional_days: int,
    reason: str = "admin_extension"
) -> bool:
    """
    Extend an existing subscription by X days (admin function).

    Args:
        db: Database session
        user_id: User ID
        additional_days: Number of days to add
        reason: Reason for extension

    Returns:
        bool: True if successful
    """
    try:
        user = db.query(ClientDB).filter(ClientDB.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for extension")
            return False

        if not user.subscription_end_date:
            logger.error(f"User {user_id} has no subscription to extend")
            return False

        old_end_date = user.subscription_end_date
        user.subscription_end_date = old_end_date + timedelta(days=additional_days)
        user.pro_status_active_until = user.subscription_end_date

        db.commit()
        db.refresh(user)

        logger.info(f"✓ Extended subscription for {user.email} by {additional_days} days: {old_end_date} → {user.subscription_end_date} (reason: {reason})")
        return True

    except Exception as e:
        logger.error(f"✗ Failed to extend subscription for {user_id}: {e}", exc_info=True)
        db.rollback()
        return False


async def grant_manual_subscription(
    db: Session,
    user_id: str,
    plan_id: str,
    duration_days: int,
    reason: str = "manual_grant"
) -> bool:
    """
    Manually grant a subscription to a user (admin function).
    Used for trials, promotions, customer support, etc.

    Args:
        db: Database session
        user_id: User ID
        plan_id: Plan to grant
        duration_days: Duration in days
        reason: Reason for manual grant

    Returns:
        bool: True if successful
    """
    subscription_data = {
        'start_date': datetime.utcnow(),
        'amount': 0.0,  # No payment for manual grants
        'currency': 'RON',
        'payment_method': f'manual_{reason}',
        'stripe_subscription_id': None,  # No Stripe subscription for manual grants
        'stripe_customer_id': None
    }

    # Use custom end date calculation
    start_date = subscription_data['start_date']
    end_date = start_date + timedelta(days=duration_days)

    try:
        user = db.query(ClientDB).filter(ClientDB.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for manual grant")
            return False

        user.rol = ClientRole.PRO
        user.subscription_plan_id = plan_id
        user.subscription_start_date = start_date
        user.subscription_end_date = end_date
        user.subscription_status = "active_manual"
        user.subscription_payment_method = subscription_data['payment_method']
        user.subscription_amount = 0.0
        user.subscription_currency = 'RON'
        user.subscription_auto_renew = False  # Manual grants don't auto-renew
        user.pro_status_active_until = end_date

        db.commit()
        db.refresh(user)

        logger.info(f"✓ Manually granted {plan_id} ({duration_days} days) to {user.email} until {end_date} (reason: {reason})")
        return True

    except Exception as e:
        logger.error(f"✗ Failed to grant manual subscription to {user_id}: {e}", exc_info=True)
        db.rollback()
        return False


def get_subscription_status_summary(user: ClientDB) -> Dict[str, Any]:
    """
    Get a comprehensive summary of user's subscription status.

    Args:
        user: ClientDB instance

    Returns:
        Dict with subscription details
    """
    if not user.subscription_end_date:
        return {
            "plan": "basic",
            "plan_name": "Basic - Gratuit",
            "status": "active",
            "is_active": True,
            "is_premium": False,
            "auto_renew": False,
            "days_remaining": None,
            "start_date": None,
            "end_date": None,
            "amount": 0.0,
            "currency": "RON"
        }

    now = datetime.utcnow()
    days_remaining = (user.subscription_end_date - now).days
    is_active = user.subscription_end_date > now and user.rol == ClientRole.PRO

    return {
        "plan": user.subscription_plan_id or "unknown",
        "plan_name": get_plan_name_from_id(user.subscription_plan_id or ""),
        "status": user.subscription_status or "unknown",
        "is_active": is_active,
        "is_premium": user.rol == ClientRole.PRO,
        "auto_renew": user.subscription_auto_renew,
        "days_remaining": max(0, days_remaining) if days_remaining is not None else None,
        "start_date": user.subscription_start_date.isoformat() if user.subscription_start_date else None,
        "end_date": user.subscription_end_date.isoformat() if user.subscription_end_date else None,
        "amount": user.subscription_amount or 0.0,
        "currency": user.subscription_currency or "RON",
        "cancelled_at": user.subscription_cancelled_at.isoformat() if user.subscription_cancelled_at else None,
        "payment_method": user.subscription_payment_method
    }
