import uuid
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from datetime import datetime
from .config import get_settings

settings = get_settings()
is_postgres = settings.DATABASE_URL and "postgresql" in settings.DATABASE_URL
db_specific_json = JSONB if is_postgres else JSON

class LegalNewsAuthor(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(index=True)
    title: Optional[str] = None
    bio: Optional[str] = None
    imageFileName: Optional[str] = None
    profileImageUrl: Optional[str] = None
    profileUrl: Optional[str] = None
    expertise: Optional[List[str]] = Field(default=None, sa_column=Column(db_specific_json))

class LegalNewsArticle(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str = Field(index=True)
    summary: Optional[str] = None
    description: Optional[str] = None # SEO Description
    content: str # HTML Content
    publishDate: datetime = Field(index=True)
    lastModifiedDate: Optional[datetime] = None
    authorId: Optional[str] = Field(default=None, foreign_key="legalnewsauthor.id")
    authorName: Optional[str] = None # Cached for simpler access if needed
    imageFileName: Optional[str] = None
    imageUrl: Optional[str] = None
    tags: Optional[List[str]] = Field(default=None, sa_column=Column(db_specific_json))
    categories: Optional[List[str]] = Field(default=None, sa_column=Column(db_specific_json))

    # Relationships could be defined here if using full SQLAlchemy ORM features,
    # but keeping it simple for now to match the JSON structure.

class LegalNewsEvent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    description: Optional[str] = None
    date: datetime
    location: Optional[str] = None
    imageFileName: Optional[str] = None
    imageUrl: Optional[str] = None
    organizer: Optional[str] = None

class LegalNewsJob(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str
    company: str
    location: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = Field(default=None, sa_column=Column(db_specific_json))
    datePosted: datetime = Field(default_factory=datetime.utcnow)
    applyLink: Optional[str] = None

class LegalNewsBook(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    author: str
    description: Optional[str] = None
    price: Optional[str] = None
    imageFileName: Optional[str] = None
    imageUrl: Optional[str] = None
    purchaseLink: Optional[str] = None
