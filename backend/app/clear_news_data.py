import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.db import get_session
from app.models_news import LegalNewsBook, LegalNewsEvent, LegalNewsAuthor, LegalNewsArticle, LegalNewsJob
from sqlmodel import delete

def clear_news_tables():
    print("Clearing legal news tables...")
    with next(get_session()) as session:
        # Delete in order of dependencies (if any, though here they are mostly independent except article->author)
        session.exec(delete(LegalNewsArticle))
        session.exec(delete(LegalNewsBook))
        session.exec(delete(LegalNewsEvent))
        session.exec(delete(LegalNewsJob))
        # Authors are last referenced by articles
        session.exec(delete(LegalNewsAuthor))
        session.commit()
    print("Tables cleared.")

if __name__ == "__main__":
    clear_news_tables()
