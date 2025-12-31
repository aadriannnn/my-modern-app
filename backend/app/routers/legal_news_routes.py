# backend/app/routers/legal_news_routes.py

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Response
from sqlmodel import Session, select, col, or_, func
from pydantic import BaseModel

from ..db import get_session
# Removed dependency on ensure_data_loaded as it runs at startup via lib.news_seeder
from ..models_news import (
    LegalNewsArticle,
    LegalNewsAuthor,
    LegalNewsBook,
    LegalNewsEvent,
    LegalNewsJob
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/legal-news",
    tags=["Legal News"],
    responses={404: {"description": "Not found"}}
)

# --- Search Models ---
class LegalNewsSearchResultItem(BaseModel):
    id: str
    title: str
    slug: str
    summary: Optional[str] = None
    publishDate: Optional[str] = None
    authorName: Optional[str] = None
    matchType: str
    imageUrl: Optional[str] = None

class LegalNewsSearchResponse(BaseModel):
    query: str
    results: List[LegalNewsSearchResultItem]
    totalResults: int

# --- API Endpoints ---

@router.get("/articles", response_model=List[LegalNewsArticle])
def get_articles(
    response: Response,
    skip: int = 0,
    limit: int = 10,
    session: Session = Depends(get_session)
):
    # Total count
    total_statement = select(func.count(col(LegalNewsArticle.id)))
    total = session.exec(total_statement).one()
    response.headers["X-Total-Count"] = str(total)

    statement = select(LegalNewsArticle).order_by(col(LegalNewsArticle.publishDate).desc()).offset(skip).limit(limit)
    return session.exec(statement).all()

@router.get("/articles/{slug_or_id}", response_model=LegalNewsArticle)
def get_article(slug_or_id: str, session: Session = Depends(get_session)):
    statement = select(LegalNewsArticle).where(
        or_(LegalNewsArticle.slug == slug_or_id, LegalNewsArticle.id == slug_or_id)
    )
    article = session.exec(statement).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@router.get("/authors", response_model=List[LegalNewsAuthor])
def get_authors(skip: int = 0, limit: int = 20, session: Session = Depends(get_session)):
    statement = select(LegalNewsAuthor).offset(skip).limit(limit)
    return session.exec(statement).all()

@router.get("/books", response_model=List[LegalNewsBook])
def get_books(skip: int = 0, limit: int = 10, session: Session = Depends(get_session)):
    statement = select(LegalNewsBook).offset(skip).limit(limit)
    return session.exec(statement).all()

@router.get("/events", response_model=List[LegalNewsEvent])
def get_events(skip: int = 0, limit: int = 10, session: Session = Depends(get_session)):
    statement = select(LegalNewsEvent).order_by(col(LegalNewsEvent.date).desc()).offset(skip).limit(limit)
    return session.exec(statement).all()

@router.get("/jobs", response_model=List[LegalNewsJob])
def get_jobs(skip: int = 0, limit: int = 10, session: Session = Depends(get_session)):
    statement = select(LegalNewsJob).order_by(col(LegalNewsJob.datePosted).desc()).offset(skip).limit(limit)
    return session.exec(statement).all()

@router.get("/search", response_model=LegalNewsSearchResponse)
def search_news(q: str, session: Session = Depends(get_session)):
    query = q.lower()
    results = []

    def fmt_date(dt): return dt.isoformat() if dt else None

    # Articles
    art_stmt = select(LegalNewsArticle).where(
        or_(
            col(LegalNewsArticle.title).ilike(f"%{query}%"),
            col(LegalNewsArticle.summary).ilike(f"%{query}%"),
            col(LegalNewsArticle.content).ilike(f"%{query}%")
        )
    ).limit(5)
    articles = session.exec(art_stmt).all()
    for a in articles:
        results.append(LegalNewsSearchResultItem(
            id=a.id, title=a.title, slug=a.slug, summary=a.summary,
            publishDate=fmt_date(a.publishDate), authorName=a.authorName,
            matchType="article", imageUrl=a.imageUrl
        ))

    # Authors
    auth_stmt = select(LegalNewsAuthor).where(col(LegalNewsAuthor.name).ilike(f"%{query}%")).limit(3)
    authors = session.exec(auth_stmt).all()
    for a in authors:
        results.append(LegalNewsSearchResultItem(
            id=a.id, title=a.name, slug=f"author-{a.id}", summary=a.title,
            matchType="author", imageUrl=a.profileImageUrl
        ))

    # Books
    bk_stmt = select(LegalNewsBook).where(col(LegalNewsBook.title).ilike(f"%{query}%")).limit(3)
    books = session.exec(bk_stmt).all()
    for b in books:
        results.append(LegalNewsSearchResultItem(
            id=b.id, title=b.title, slug=b.slug, summary=b.description[:100] if b.description else "",
            matchType="book", imageUrl=b.imageUrl
        ))

    # Events
    ev_stmt = select(LegalNewsEvent).where(col(LegalNewsEvent.title).ilike(f"%{query}%")).limit(3)
    events = session.exec(ev_stmt).all()
    for e in events:
        results.append(LegalNewsSearchResultItem(
            id=e.id, title=e.title, slug=e.slug, summary=e.location,
            matchType="event", imageUrl=e.imageUrl, publishDate=fmt_date(e.date)
        ))

    return LegalNewsSearchResponse(query=query, results=results, totalResults=len(results))
