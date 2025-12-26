import logging
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col, or_
from ..db import get_session
from ..models_news import (
    LegalNewsArticle,
    LegalNewsAuthor,
    LegalNewsEvent,
    LegalNewsJob,
    LegalNewsBook
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/legal-news",
    tags=["Legal News"],
    responses={404: {"description": "Not found"}}
)

# --- Articles ---

@router.get("/articles", response_model=List[LegalNewsArticle], summary="Get paginated list of articles")
async def get_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category: Optional[str] = None,
    session: Session = Depends(get_session)
):
    query = select(LegalNewsArticle).order_by(LegalNewsArticle.publishDate.desc())

    if category:
        # Check inside JSON array - SQLite friendly simple check first or PostgreSQL specific
        # For cross-compatibility without complex JSON operators, might need filtering in python if volume is low,
        # but better to use ILIKE on the text representation if simple.
        # However, purely correctly:
        pass # Todo: JSON filtering if needed. For now return all or basic filter.

    query = query.offset(skip).limit(limit)
    articles = session.exec(query).all()
    return articles

@router.get("/articles/{slug_or_id}", response_model=LegalNewsArticle, summary="Get article details")
async def get_article_detail(slug_or_id: str, session: Session = Depends(get_session)):
    # Try by slug first
    article = session.exec(select(LegalNewsArticle).where(LegalNewsArticle.slug == slug_or_id)).first()
    if not article:
        # Try by ID
        article = session.exec(select(LegalNewsArticle).where(LegalNewsArticle.id == slug_or_id)).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Ideally fetch author info here and attach it if we used a response model with nested author
    # For now returning flat article. The frontend might need to fetch author separately or we enrich.
    if article.authorId and not article.authorName:
        author = session.exec(select(LegalNewsAuthor).where(LegalNewsAuthor.id == article.authorId)).first()
        if author:
            article.authorName = author.name

    return article

# --- Authors ---

@router.get("/authors", response_model=List[LegalNewsAuthor])
async def get_authors(
    skip: int = 0,
    limit: int = 20,
    session: Session = Depends(get_session)
):
    authors = session.exec(select(LegalNewsAuthor).offset(skip).limit(limit)).all()
    return authors

# --- Events ---

@router.get("/events", response_model=List[LegalNewsEvent])
async def get_events(
    skip: int = 0,
    limit: int = 20,
    session: Session = Depends(get_session)
):
    events = session.exec(select(LegalNewsEvent).order_by(LegalNewsEvent.date.asc()).offset(skip).limit(limit)).all()
    return events

# --- Books ---

@router.get("/books", response_model=List[LegalNewsBook])
async def get_books(
    skip: int = 0,
    limit: int = 20,
    session: Session = Depends(get_session)
):
    books = session.exec(select(LegalNewsBook).offset(skip).limit(limit)).all()
    return books

# --- Jobs ---

@router.get("/jobs", response_model=List[LegalNewsJob])
async def get_jobs(
    skip: int = 0,
    limit: int = 20,
    session: Session = Depends(get_session)
):
    jobs = session.exec(select(LegalNewsJob).order_by(LegalNewsJob.datePosted.desc()).offset(skip).limit(limit)).all()
    return jobs

# --- Search ---

@router.get("/search", summary="Search across all news content")
async def search_news(q: str = Query(..., min_length=3), session: Session = Depends(get_session)):
    """
    Search articles, authors, events, books, and jobs.
    """
    term = f"%{q}%"
    results = []

    # Articles
    articles = session.exec(select(LegalNewsArticle).where(
        or_(
            col(LegalNewsArticle.title).ilike(term),
            col(LegalNewsArticle.summary).ilike(term)
        )
    ).limit(5)).all()

    for a in articles:
        results.append({
            "id": a.id,
            "title": a.title,
            "slug": a.slug,
            "summary": a.summary,
            "type": "article",
            "date": a.publishDate
        })

    # Authors
    authors = session.exec(select(LegalNewsAuthor).where(col(LegalNewsAuthor.name).ilike(term)).limit(3)).all()
    for a in authors:
        results.append({
            "id": a.id,
            "title": a.name,
            "slug": f"author-{a.id}", # Placeholder slug
            "summary": a.title,
            "type": "author"
        })

    # Events
    events = session.exec(select(LegalNewsEvent).where(
        or_(
             col(LegalNewsEvent.title).ilike(term),
             col(LegalNewsEvent.description).ilike(term)
        )
    ).limit(3)).all()
    for e in events:
        results.append({
            "id": e.id,
            "title": e.title,
            "slug": e.slug,
            "summary": e.description[:100] if e.description else "",
            "type": "event",
             "date": e.date
        })

    return {
        "query": q,
        "results": results,
        "totalResults": len(results)
    }
