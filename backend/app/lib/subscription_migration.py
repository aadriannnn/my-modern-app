"""
Database migration utilities for subscription fields.
Ensures backward compatibility by adding new fields to existing ClientDB table.
"""
import logging
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from typing import List, Dict

logger = logging.getLogger(__name__)

# Define new subscription fields that need to be added
NEW_SUBSCRIPTION_FIELDS = [
    {
        "name": "subscription_plan_id",
        "type": "VARCHAR(100)",
        "nullable": True,
        "description": "Subscription plan identifier"
    },
    {
        "name": "subscription_start_date",
        "type": "TIMESTAMP",
        "nullable": True,
        "description": "When subscription started"
    },
    {
        "name": "subscription_end_date",
        "type": "TIMESTAMP",
        "nullable": True,
        "description": "When subscription expires"
    },
    {
        "name": "subscription_payment_method",
        "type": "VARCHAR(50)",
        "nullable": True,
        "description": "Payment method used"
    },
    {
        "name": "subscription_amount",
        "type": "DECIMAL(10,2)",
        "nullable": True,
        "description": "Amount paid for subscription"
    },
    {
        "name": "subscription_currency",
        "type": "VARCHAR(10)",
        "nullable": True,
        "default": "'RON'",
        "description": "Currency of subscription"
    },
    {
        "name": "subscription_auto_renew",
        "type": "BOOLEAN",
        "nullable": True,
        "default": "TRUE",
        "description": "Auto-renewal enabled"
    },
    {
        "name": "subscription_cancelled_at",
        "type": "TIMESTAMP",
        "nullable": True,
        "description": "When subscription was cancelled"
    }
]


def column_exists(session: Session, table_name: str, column_name: str) -> bool:
    """Check if a column exists in the specified table."""
    try:
        inspector = inspect(session.bind)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception as e:
        logger.error(f"Error checking column existence: {e}")
        return False


def add_column_if_missing(session: Session, table_name: str, field_config: Dict) -> bool:
    """Add a column to the table if it doesn't exist."""
    column_name = field_config["name"]

    if column_exists(session, table_name, column_name):
        logger.info(f"✓ Column '{column_name}' already exists in '{table_name}'")
        return False

    try:
        # Build ALTER TABLE statement
        alter_statement = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {field_config['type']}"

        # Add DEFAULT if specified
        if "default" in field_config:
            alter_statement += f" DEFAULT {field_config['default']}"

        # Add NULL/NOT NULL constraint
        if field_config.get("nullable", True):
            alter_statement += " NULL"
        else:
            alter_statement += " NOT NULL"

        logger.info(f"Adding column '{column_name}' to '{table_name}'...")
        logger.debug(f"SQL: {alter_statement}")

        session.execute(text(alter_statement))
        session.commit()

        logger.info(f"✓ Successfully added column '{column_name}' - {field_config.get('description', '')}")
        return True

    except Exception as e:
        session.rollback()
        logger.error(f"✗ Failed to add column '{column_name}': {e}")
        return False


def ensure_subscription_fields(session: Session) -> None:
    """
    Ensure all subscription fields exist in the clienti table.
    This is safe to run multiple times - it only adds missing columns.
    """
    logger.info("Starting subscription fields migration check...")

    table_name = "clienti"
    added_count = 0
    skipped_count = 0

    for field_config in NEW_SUBSCRIPTION_FIELDS:
        was_added = add_column_if_missing(session, table_name, field_config)
        if was_added:
            added_count += 1
        else:
            skipped_count += 1

    if added_count > 0:
        logger.info(f"Migration check complete: {added_count} columns added.")
    # Else simple check pass, no log spam

    # Add indexes for performance (if they don't exist)
    try:
        logger.info("Creating indexes for subscription fields...")

        # Index for plan_id (for filtering by plan)
        session.execute(text(
            f"CREATE INDEX IF NOT EXISTS idx_subscription_plan_id ON {table_name}(subscription_plan_id)"
        ))

        # Index for start_date (for date-based queries)
        session.execute(text(
            f"CREATE INDEX IF NOT EXISTS idx_subscription_start_date ON {table_name}(subscription_start_date)"
        ))

        # Index for end_date (for expiry checks)
        session.execute(text(
            f"CREATE INDEX IF NOT EXISTS idx_subscription_end_date ON {table_name}(subscription_end_date)"
        ))

        session.commit()
        logger.info("✓ Indexes created successfully")

    except Exception as e:
        session.rollback()
        logger.warning(f"Index creation skipped or failed (may already exist): {e}")


def migrate_existing_pro_users(session: Session) -> None:
    """
    Migrate existing PRO users to have proper subscription_end_date.
    Uses pro_status_active_until if available, otherwise sets 1 year from now.
    """
    from datetime import datetime, timedelta
    from ..models import ClientDB, ClientRole

    logger.info("Checking for existing PRO users without subscription_end_date...")

    try:
        # Find PRO users without subscription_end_date
        pro_users = session.query(ClientDB).filter(
            ClientDB.rol == ClientRole.PRO,
            ClientDB.subscription_end_date.is_(None)
        ).all()

        if not pro_users:
            logger.info("No PRO users need migration")
            return

        logger.info(f"Found {len(pro_users)} PRO users to migrate")

        for user in pro_users:
            # Use existing pro_status_active_until if set
            if user.pro_status_active_until:
                user.subscription_end_date = user.pro_status_active_until
                user.subscription_start_date = user.dataCreare  # Approximate start date
            else:
                # Set 1 year subscription from now (generous migration)
                user.subscription_end_date = datetime.utcnow() + timedelta(days=365)
                user.subscription_start_date = datetime.utcnow()

            user.subscription_plan_id = "premium_annual"  # Default to annual for existing PRO
            user.subscription_payment_method = "legacy_migration"
            user.subscription_auto_renew = False  # Don't auto-renew legacy accounts

            logger.info(f"Migrated PRO user {user.email} → expires {user.subscription_end_date}")

        session.commit()
        logger.info(f"✓ Successfully migrated {len(pro_users)} PRO users")

    except Exception as e:
        session.rollback()
        logger.error(f"✗ Failed to migrate PRO users: {e}")
