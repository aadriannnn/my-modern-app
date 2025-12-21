"""
Background tasks for subscription management.
Handles expiry warnings, automatic downgrades, and sync with Stripe.
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..db import get_session
from ..models import ClientDB, ClientRole
from ..email_sender import (
    send_subscription_expiring_soon_email,
    send_subscription_expired_email
)
from ..lib.subscription_helpers import (
    downgrade_user_to_basic,
    get_plan_name_from_id
)
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def check_expiring_subscriptions_daily():
    """
    Daily task to check for subscriptions expiring in N days.
    Sends reminder emails.
    """
    logger.info("=" * 80)
    logger.info("Running daily expiring subscriptions check...")
    logger.info("=" * 80)

    warning_days = settings.SUBSCRIPTION_EXPIRY_WARNING_DAYS  # 7 days
    now = datetime.utcnow()
    warning_date = now + timedelta(days=warning_days)

    # Find subscriptions expiring in exactly N days (with 1-day tolerance)
    with next(get_session()) as db:
        expiring_users = db.query(ClientDB).filter(
            ClientDB.rol == ClientRole.PRO,
            ClientDB.subscription_end_date.isnot(None),
            ClientDB.subscription_end_date >= warning_date,
            ClientDB.subscription_end_date <= warning_date + timedelta(days=1),
            ClientDB.subscription_auto_renew == False  # Only warn if not auto-renewing
        ).all()

        logger.info(f"Found {len(expiring_users)} subscriptions expiring in ~{warning_days} days")

        for user in expiring_users:
            try:
                days_remaining = (user.subscription_end_date - now).days
                plan_name = get_plan_name_from_id(user.subscription_plan_id or "Premium")

                await send_subscription_expiring_soon_email(
                    user_email=user.email,
                    user_name=user.numeComplet,
                    expiry_date=user.subscription_end_date,
                    plan_name=plan_name,
                    days_remaining=days_remaining
                )

                logger.info(f"✓ Sent expiry warning to {user.email} ({days_remaining} days remaining)")

            except Exception as e:
                logger.error(f"✗ Failed to send expiry warning to {user.email}: {e}")

    logger.info("Expiring subscriptions check complete")


async def process_expired_subscriptions_daily():
    """
    Daily task to downgrade users whose subscriptions have expired.
    """
    logger.info("=" * 80)
    logger.info("Running daily expired subscriptions processor...")
    logger.info("=" * 80)

    now = datetime.utcnow()

    with next(get_session()) as db:
        # Find PRO users with expired subscriptions
        expired_users = db.query(ClientDB).filter(
            ClientDB.rol == ClientRole.PRO,
            ClientDB.subscription_end_date.isnot(None),
            ClientDB.subscription_end_date < now
        ).all()

        logger.info(f"Found {len(expired_users)} expired subscriptions to process")

        for user in expired_users:
            try:
                plan_name = get_plan_name_from_id(user.subscription_plan_id or "Premium")

                # Downgrade to BASIC
                success = await downgrade_user_to_basic(db, str(user.id), "expired")

                if success:
                    # Send expiry notification
                    await send_subscription_expired_email(
                        user_email=user.email,
                        user_name=user.numeComplet,
                        expired_date=user.subscription_end_date,
                        plan_name=plan_name
                    )

                    logger.info(f"✓ Downgraded and notified {user.email} (expired {user.subscription_end_date})")
                else:
                    logger.error(f"✗ Failed to downgrade {user.email}")

            except Exception as e:
                logger.error(f"✗ Error processing expired subscription for {user.email}: {e}")

    logger.info("Expired subscriptions processing complete")


async def sync_stripe_subscriptions_weekly():
    """
    Weekly task to sync subscription status with Stripe.
    Detects discrepancies and fixes them.
    """
    import stripe

    logger.info("=" * 80)
    logger.info("Running weekly Stripe sync...")
    logger.info("=" * 80)

    with next(get_session()) as db:
        # Get all users with Stripe subscriptions
        users_with_stripe = db.query(ClientDB).filter(
            ClientDB.stripe_subscription_id.isnot(None)
        ).all()

        logger.info(f"Syncing {len(users_with_stripe)} Stripe subscriptions...")

        synced_count = 0
        error_count = 0
        fixed_count = 0

        for user in users_with_stripe:
            try:
                # Retrieve from Stripe
                subscription = stripe.Subscription.retrieve(user.stripe_subscription_id)
                stripe_status = subscription.status
                stripe_end_date = datetime.fromtimestamp(subscription.current_period_end)

                # Check for discrepancies
                discrepancy = False

                if user.subscription_status != stripe_status:
                    logger.warning(f"Status mismatch for {user.email}: DB={user.subscription_status}, Stripe={stripe_status}")
                    user.subscription_status = stripe_status
                    discrepancy = True

                if user.subscription_end_date != stripe_end_date:
                    logger.warning(f"End date mismatch for {user.email}: DB={user.subscription_end_date}, Stripe={stripe_end_date}")
                    user.subscription_end_date = stripe_end_date
                    user.pro_status_active_until = stripe_end_date
                    discrepancy = True

                # Update role based on Stripe status
                if stripe_status == 'active' and user.rol != ClientRole.PRO:
                    logger.warning(f"Role mismatch: {user.email} should be PRO (Stripe status: active)")
                    user.rol = ClientRole.PRO
                    discrepancy = True
                elif stripe_status in ['canceled', 'unpaid', 'past_due'] and stripe_end_date < datetime.utcnow():
                    if user.rol != ClientRole.BASIC:
                        logger.warning(f"Role mismatch: {user.email} should be BASIC (expired {stripe_end_date})")
                        user.rol = ClientRole.BASIC
                        discrepancy = True

                if discrepancy:
                    db.commit()
                    fixed_count += 1
                    logger.info(f"✓ Fixed discrepancies for {user.email}")

                synced_count += 1

            except stripe.error.InvalidRequestError as e:
                logger.error(f"Stripe subscription not found for {user.email}: {e}")
                error_count += 1
            except Exception as e:
                logger.error(f"Error syncing {user.email}: {e}")
                error_count += 1

        logger.info(f"Sync complete: {synced_count} synced, {fixed_count} fixed, {error_count} errors")


# Manual trigger functions for testing
def run_expiry_check_now():
    """Run expiry check immediately (for testing)."""
    import asyncio
    asyncio.run(check_expiring_subscriptions_daily())


def run_expired_processor_now():
    """Run expired processor immediately (for testing)."""
    import asyncio
    asyncio.run(process_expired_subscriptions_daily())


def run_stripe_sync_now():
    """Run Stripe sync immediately (for testing)."""
    import asyncio
    asyncio.run(sync_stripe_subscriptions_weekly())
