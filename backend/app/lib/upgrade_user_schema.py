"""
Database migration utilities for user verification fields.
Adds verificationToken and isVerified columns to external ClientDB if missing.
"""
import logging
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

NEW_USER_FIELDS = [
    {
        "name": "verificationToken",
        "type": "VARCHAR(255)",
        "nullable": True,
        "description": "Token for email verification"
    },
    {
        "name": "isVerified",
        "type": "BOOLEAN",
        "nullable": False,
        "default": "FALSE",
        "description": "Email verification status"
    }
]


def ensure_user_verification_fields(session: Session) -> None:
    """
    Ensure user verification fields exist in the clienti table with correct casing.
    """
    logger.info("Starting user verification fields migration check...")

    table_name = "clienti"
    inspector = inspect(session.bind)
    existing_columns = {col['name'] for col in inspector.get_columns(table_name)}

    for field_config in NEW_USER_FIELDS:
        target_name = field_config["name"] # e.g., verificationToken
        lower_name = target_name.lower()   # e.g., verificationtoken

        # 1. Check if the Exact Target Name exists
        if target_name in existing_columns:
            logger.info(f"✓ Column '{target_name}' already exists correctly.")
            continue

        # 2. Check if the Lowercase version exists (created by mistake)
        if lower_name in existing_columns and lower_name != target_name:
            logger.info(f"⚠ Found lowercase column '{lower_name}'. Renaming to '{target_name}'...")
            try:
                # Rename lower to target (quoted)
                session.execute(text(f'ALTER TABLE {table_name} RENAME COLUMN "{lower_name}" TO "{target_name}"'))
                session.commit()
                logger.info(f"✓ Renamed '{lower_name}' to '{target_name}' successfully.")
            except Exception as e:
                session.rollback()
                logger.error(f"✗ Failed to rename '{lower_name}': {e}")
            continue

        # 3. If neither exists, Create it (Quoted to preserve case)
        try:
            # Build ALTER TABLE statement with QUOTES for the column name
            col_type = field_config['type']
            default_clause = f" DEFAULT {field_config['default']}" if "default" in field_config else ""
            null_clause = " NULL" if field_config.get("nullable", True) else " NOT NULL"

            alter_statement = f'ALTER TABLE {table_name} ADD COLUMN "{target_name}" {col_type}{default_clause}{null_clause}'

            logger.info(f"Adding column '{target_name}'...")
            logger.debug(f"SQL: {alter_statement}")

            session.execute(text(alter_statement))
            session.commit()

            logger.info(f"✓ Successfully added column '{target_name}'")

        except Exception as e:
            session.rollback()
            # If it failed, it might be because it "already exists" in some weird state, strictly log
            logger.error(f"✗ Failed to add column '{target_name}': {e}")

    logger.info("=" * 80)
    logger.info("User verification migration check complete.")
    logger.info("=" * 80)
