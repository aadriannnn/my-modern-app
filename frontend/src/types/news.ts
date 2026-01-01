export interface LegalNewsAuthor {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  profileImageUrl?: string;
  profileUrl?: string;
}

export interface LegalNewsArticle {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  content: string;
  publishDate: string;
  lastModifiedDate?: string;
  authorId?: string;
  authorName?: string;
  imageUrl?: string;
  tags?: string[];
  categories?: string[];
}

export interface LegalNewsEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  imageUrl?: string;
  organizer?: string;
}

export interface LegalNewsBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  purchaseLink?: string;
}

export interface LegalNewsJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  requirements?: string[];
  datePosted: string;
  applyLink?: string;
}
