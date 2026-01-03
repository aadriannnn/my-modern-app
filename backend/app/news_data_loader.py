# backend/app/news_data_loader.py

import json
import logging
from pathlib import Path
from typing import List, Optional, Tuple
from threading import Lock
from datetime import datetime

from sqlmodel import Session, select
from .db import engine
from .models_news import (
    LegalNewsArticle,
    LegalNewsAuthor,
    LegalNewsBook,
    LegalNewsEvent,
    LegalNewsJob
)
# from .config import settings

# --- Configuration ---
# Assuming this file is in backend/app/
# Project root is ../../
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT_DIR = BASE_DIR.parent.parent
# Changed to use backend/data for seeding
LEGAL_NEWS_DATA_DIR = BASE_DIR.parent / "data" / "legal_news"

ARTICLES_FILE = LEGAL_NEWS_DATA_DIR / "articles.json"
AUTHORS_FILE = LEGAL_NEWS_DATA_DIR / "authors.json"
BOOKS_FILE = LEGAL_NEWS_DATA_DIR / "books.json"
EVENTS_FILE = LEGAL_NEWS_DATA_DIR / "events.json"
JOBS_FILE = LEGAL_NEWS_DATA_DIR / "jobs.json"

IMAGES_BASE_URL = "/data/legal_news/images/"

# --- Logging ---
logger = logging.getLogger(__name__)

_load_lock = Lock()
_data_loaded = False

def ensure_data_loaded():
    """
    Triggers the database seeding process.
    """
    seed_database()

def seed_database(force_reload: bool = False) -> Tuple[bool, str]:
    """
    Reads JSON files and populates the database tables if they are empty.
    """
    global _data_loaded
    if _data_loaded and not force_reload:
        return True, "Data already loaded."

    # We create a new session just for seeding
    with _load_lock:
        with Session(engine) as session:
            try:
                logger.info("Starting Legal News Database Seeding (SQLModel)...")

                # 1. Seed Authors
                _seed_authors(session, force_reload)

                # 2. Seed Articles
                _seed_articles(session, force_reload)

                # 3. Seed Books
                _seed_books(session, force_reload)

                # 4. Seed Events
                _seed_events(session, force_reload)

                # 5. Seed Jobs
                _seed_jobs(session, force_reload)

                session.commit()
                _data_loaded = True
                logger.info("Legal News Database Seeding Completed Successfully.")
                return True, "Database seeded."
            except Exception as e:
                session.rollback()
                logger.error(f"Error seeding database: {e}", exc_info=True)
                return False, f"Seeding failed: {e}"

def _construct_image_url(filename: Optional[str]) -> Optional[str]:
    if filename:
        safe_filename = Path(filename).name
        return f"{IMAGES_BASE_URL}{safe_filename}"
    return None

def _seed_authors(session: Session, force: bool):
    if not force:
        statement = select(LegalNewsAuthor)
        results = session.exec(statement).first()
        if results:
            logger.info("Authors table not empty. Skipping.")
            return

    if not AUTHORS_FILE.is_file():
        logger.warning(f"Authors file not found: {AUTHORS_FILE}")
        return

    try:
        with open(AUTHORS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                if session.get(LegalNewsAuthor, item.get("id")): continue

                author = LegalNewsAuthor(
                    id=item.get("id"),
                    name=item.get("name"),
                    title=item.get("title"),
                    bio=item.get("bio"),
                    imageFileName=item.get("imageFileName"),
                    profileImageUrl=_construct_image_url(item.get("imageFileName")),
                    profileUrl=item.get("profileUrl")
                )
                session.add(author)
        session.flush() # Flush to make authors available for article FK checks if needed (though we use naive strings)
        logger.info("Authors seeded.")
    except Exception as e:
        logger.error(f"Failed to seed authors: {e}")
        raise e

def _seed_articles(session: Session, force: bool):
    if not force:
        statement = select(LegalNewsArticle)
        results = session.exec(statement).first()
        if results:
            logger.info("Articles table not empty. Skipping.")
            return

    if not ARTICLES_FILE.is_file():
        logger.warning(f"Articles file not found: {ARTICLES_FILE}")
        return

    # Cache authors for name lookup
    authors_map = {a.id: a.name for a in session.exec(select(LegalNewsAuthor)).all()}

    try:
        with open(ARTICLES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                if session.get(LegalNewsArticle, item.get("id")): continue

                # Parse date
                p_date = item.get("publishDate")
                if p_date:
                    try:
                        p_date = datetime.fromisoformat(p_date.replace('Z', '+00:00'))
                    except:
                        p_date = datetime.now()

                auth_id = item.get("authorId")
                auth_name = authors_map.get(auth_id) if auth_id else None

                article = LegalNewsArticle(
                    id=item.get("id"),
                    slug=item.get("slug"),
                    title=item.get("title"),
                    summary=item.get("summary"),
                    description=item.get("description"),
                    content=item.get("content"), # HTML content
                    publishDate=p_date,
                    authorId=auth_id,
                    authorName=auth_name, # Populate cached name
                    imageFileName=item.get("imageFileName"),
                    imageUrl=_construct_image_url(item.get("imageFileName")),
                    tags=item.get("tags"),
                    categories=item.get("categories")
                )
                session.add(article)
        session.flush()
        logger.info("Articles seeded.")
    except Exception as e:
        logger.error(f"Failed to seed articles: {e}")
        raise e

def _seed_books(session: Session, force: bool):
    if not force:
        if session.exec(select(LegalNewsBook)).first():
            logger.info("Books table not empty. Skipping.")
            return

    if not BOOKS_FILE.is_file(): return

    try:
        with open(BOOKS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                if session.get(LegalNewsBook, item.get("id")): continue

                book = LegalNewsBook(
                    id=item.get("id"),
                    slug=item.get("slug", f"book-{item.get('id')}"),
                    title=item.get("title"),
                    author=item.get("author"),
                    description=item.get("description"),
                    price=str(item.get("price")) if item.get("price") else None,
                    imageFileName=item.get("imageFileName"),
                    imageUrl=_construct_image_url(item.get("imageFileName")),
                    purchaseLink=item.get("purchaseUrl")
                )
                session.add(book)
        session.flush()
        logger.info("Books seeded.")
    except Exception as e:
        logger.error(f"Seeding books failed: {e}")

def _seed_events(session: Session, force: bool):
    if not force:
        if session.exec(select(LegalNewsEvent)).first():
            logger.info("Events table not empty. Skipping.")
            return

    if not EVENTS_FILE.is_file(): return

    try:
        with open(EVENTS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                if session.get(LegalNewsEvent, item.get("id")): continue

                s_date = item.get("startDate") # JSON key might be 'startDate' or 'date'
                if not s_date: s_date = item.get("date")

                if s_date:
                    try: s_date = datetime.fromisoformat(s_date.replace('Z', '+00:00'))
                    except: s_date = datetime.now()
                else:
                    s_date = datetime.now()

                event = LegalNewsEvent(
                    id=item.get("id"),
                    slug=item.get("slug", f"event-{item.get('id')}"),
                    title=item.get("title"),
                    description=item.get("description"),
                    date=s_date,
                    location=item.get("location"),
                    organizer=item.get("organizer"),
                    imageFileName=item.get("imageFileName"),
                    imageUrl=_construct_image_url(item.get("imageFileName"))
                )
                session.add(event)
        session.flush()
        logger.info("Events seeded.")
    except Exception as e:
        logger.error(f"Seeding events failed: {e}")

def _seed_jobs(session: Session, force: bool):
    if not force:
        if session.exec(select(LegalNewsJob)).first():
             logger.info("Jobs table not empty. Skipping.")
             return

    if not JOBS_FILE.is_file(): return

    try:
        with open(JOBS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                if session.get(LegalNewsJob, item.get("id")): continue

                p_date = item.get("postedDate")
                if p_date:
                    try: p_date = datetime.fromisoformat(p_date.replace('Z', '+00:00'))
                    except: p_date = datetime.now()
                else: p_date = datetime.now()

                job = LegalNewsJob(
                    id=item.get("id"),
                    title=item.get("title"),
                    company=item.get("company"),
                    location=item.get("location"),
                    description=item.get("description"),
                    requirements=item.get("requirements"), # JSON array -> JSON column
                    datePosted=p_date,
                    applyLink=item.get("applyUrl")
                )
                session.add(job)
        session.flush()
        logger.info("Jobs seeded.")
    except Exception as e:
        logger.error(f"Seeding jobs failed: {e}")
