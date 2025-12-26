import json
import logging
from pathlib import Path
from sqlmodel import Session, select
from ..models_news import LegalNewsAuthor, LegalNewsArticle, LegalNewsEvent, LegalNewsJob, LegalNewsBook

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "legal_news"

def seed_news_data(session: Session):
    """
    Reads JSON files from backend/app/data/legal_news and populates the database
    if the tables are empty or records are missing.
    """
    logger.info("Starting Legal News data seeding...")

    if not DATA_DIR.exists():
        logger.warning(f"Legal News data directory not found: {DATA_DIR}")
        return

    # --- Seed Authors ---
    valid_author_ids = set()
    authors_file = DATA_DIR / "authors.json"
    if authors_file.exists():
        try:
            with open(authors_file, 'r', encoding='utf-8') as f:
                authors_data = json.load(f)
                count = 0
                for item in authors_data:
                    # Check if exists
                    existing = session.exec(select(LegalNewsAuthor).where(LegalNewsAuthor.id == item["id"])).first()
                    if not existing:
                        author = LegalNewsAuthor(**item)
                        session.add(author)
                        count += 1
                        valid_author_ids.add(item["id"])
                    else:
                        valid_author_ids.add(existing.id)
                session.commit()
                logger.info(f"Seeded {count} new authors.")
        except Exception as e:
            logger.error(f"Error seeding authors: {e}")
            session.rollback()

    # --- Seed Articles ---
    articles_file = DATA_DIR / "articles.json"
    if articles_file.exists():
        try:
            with open(articles_file, 'r', encoding='utf-8') as f:
                articles_data = json.load(f)
                count = 0
                for item in articles_data:
                    # Check if exists
                    existing = session.exec(select(LegalNewsArticle).where(LegalNewsArticle.id == item["id"])).first()
                    if not existing:
                        # Validate Author ID
                        if item.get("authorId") and item["authorId"] not in valid_author_ids:
                             logger.warning(f"Article {item.get('id')} references missing author {item['authorId']}. Setting authorId to None.")
                             item["authorId"] = None

                        article = LegalNewsArticle(**item)
                        session.add(article)
                        count += 1
                session.commit()
                logger.info(f"Seeded {count} new articles.")
        except Exception as e:
            logger.error(f"Error seeding articles: {e}")
            session.rollback()

    # --- Seed Events ---
    events_file = DATA_DIR / "events.json"
    if events_file.exists():
        try:
            with open(events_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                count = 0
                for item in data:
                    existing = session.exec(select(LegalNewsEvent).where(LegalNewsEvent.id == item["id"])).first()
                    if not existing:
                         # Handle potential extra fields or mismatches
                        # For now assume direct mapping works or use ignore_extra keys if Pydantic complains
                        # Using explicit fields if needed
                        event = LegalNewsEvent(**item)
                        session.add(event)
                        count += 1
                session.commit()
                logger.info(f"Seeded {count} new events.")
        except Exception as e:
            logger.error(f"Error seeding events: {e}")

    # --- Seed Jobs ---
    jobs_file = DATA_DIR / "jobs.json"
    if jobs_file.exists():
        try:
            with open(jobs_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                count = 0
                for item in data:
                    existing = session.exec(select(LegalNewsJob).where(LegalNewsJob.id == item["id"])).first()
                    if not existing:
                        job = LegalNewsJob(**item)
                        session.add(job)
                        count += 1
                session.commit()
                logger.info(f"Seeded {count} new jobs.")
        except Exception as e:
            logger.error(f"Error seeding jobs: {e}")

    # --- Seed Books ---
    books_file = DATA_DIR / "books.json"
    if books_file.exists():
        try:
            with open(books_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                count = 0
                for item in data:
                    existing = session.exec(select(LegalNewsBook).where(LegalNewsBook.id == item["id"])).first()
                    if not existing:
                        book = LegalNewsBook(**item)
                        session.add(book)
                        count += 1
                session.commit()
                logger.info(f"Seeded {count} new books.")
        except Exception as e:
            logger.error(f"Error seeding books: {e}")

    logger.info("Legal News data seeding completed.")
