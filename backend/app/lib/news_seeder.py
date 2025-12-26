import json
import logging
from pathlib import Path
from datetime import datetime
from sqlmodel import Session, select
from ..models_news import (
    LegalNewsAuthor,
    LegalNewsArticle,
    LegalNewsEvent,
    LegalNewsJob,
    LegalNewsBook
)

logger = logging.getLogger(__name__)

# Config: ../data/legal_news relative to backend/app/lib/
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "legal_news"
IMAGES_BASE_URL = "/data/legal_news/images/"

def _construct_image_url(filename):
    if filename:
        return f"{IMAGES_BASE_URL}{filename}"
    return None

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
    authors_map = {} # id -> name
    authors_file = DATA_DIR / "authors.json"
    if authors_file.exists():
        try:
            with open(authors_file, 'r', encoding='utf-8') as f:
                authors_data = json.load(f)
                count = 0
                for item in authors_data:
                    authors_map[item["id"]] = item["name"]
                    # Check if exists
                    existing = session.exec(select(LegalNewsAuthor).where(LegalNewsAuthor.id == item["id"])).first()
                    if not existing:
                        # Construct URLs
                        item["profileImageUrl"] = _construct_image_url(item.get("imageFileName"))

                        author = LegalNewsAuthor(**item)
                        session.add(author)
                        count += 1
                        valid_author_ids.add(item["id"])
                    else:
                        valid_author_ids.add(existing.id)
                session.commit()
                if count > 0: logger.info(f"Seeded {count} new authors.")
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
                    existing = session.exec(select(LegalNewsArticle).where(LegalNewsArticle.id == item["id"])).first()
                    if not existing:
                        # Validate Author ID and Populate Name
                        aid = item.get("authorId")
                        if aid and aid not in valid_author_ids:
                             logger.warning(f"Article {item.get('id')} references missing author {aid}.")
                             item["authorId"] = None
                             item["authorName"] = None
                        elif aid:
                             item["authorName"] = authors_map.get(aid)

                        # Parse Dates
                        p_date = item.get("publishDate")
                        if p_date and isinstance(p_date, str):
                            try: item["publishDate"] = datetime.fromisoformat(p_date.replace('Z', '+00:00'))
                            except: item["publishDate"] = datetime.utcnow()

                        # Images
                        item["imageUrl"] = _construct_image_url(item.get("imageFileName"))

                        article = LegalNewsArticle(**item)
                        session.add(article)
                        count += 1
                session.commit()
                if count > 0: logger.info(f"Seeded {count} new articles.")
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
                        item["imageUrl"] = _construct_image_url(item.get("imageFileName"))

                        # Date parsing
                        # JSON might have 'startDate' or 'date'
                        s_date = item.get("startDate") or item.get("date")
                        if s_date and isinstance(s_date, str):
                             try: item["date"] = datetime.fromisoformat(s_date.replace('Z', '+00:00'))
                             except: item["date"] = datetime.utcnow()
                        elif not s_date:
                             item["date"] = datetime.utcnow()

                        # Remove keys not in model if Pydantic strict? SQLModel usually ignores extra kwargs if not in init?
                        # SQLModel inherits Pydantic BaseModel. By default extra='ignore' in v2?
                        # We should be safe, or filter.
                        # For safety, pop potential extra keys if known issues arise.
                        if "startDate" in item: item.pop("startDate")
                        if "endDate" in item: item.pop("endDate") # If model doesn't support it

                        event = LegalNewsEvent(**item)
                        session.add(event)
                        count += 1
                session.commit()
                if count > 0: logger.info(f"Seeded {count} new events.")
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
                        # Date parsing
                        p_date = item.get("postedDate")
                        if p_date:
                            try: item["datePosted"] = datetime.fromisoformat(p_date.replace('Z', '+00:00'))
                            except: item["datePosted"] = datetime.utcnow()
                        if "postedDate" in item: item.pop("postedDate")

                        job = LegalNewsJob(**item)
                        session.add(job)
                        count += 1
                session.commit()
                if count > 0: logger.info(f"Seeded {count} new jobs.")
        except Exception as e:
            logger.error(f"Error seeding jobs: {e}")
            session.rollback()

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
                        item["imageUrl"] = _construct_image_url(item.get("imageFileName"))

                        # Fix price type if needed (Str vs Float)
                        if item.get("price") and not isinstance(item["price"], str):
                            item["price"] = str(item["price"])

                        book = LegalNewsBook(**item)
                        session.add(book)
                        count += 1
                session.commit()
                if count > 0: logger.info(f"Seeded {count} new books.")
        except Exception as e:
            logger.error(f"Error seeding books: {e}")
            session.rollback()

    logger.info("Legal News data seeding completed.")
