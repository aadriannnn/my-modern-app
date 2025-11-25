import React from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  canonicalUrl?: string;
  structuredData?: object;
  noIndex?: boolean;
}

/**
 * SEOHead Component
 *
 * Reusable component for managing SEO meta tags dynamically per page.
 * Uses native React approach with useEffect to update document head.
 *
 * @param {SEOHeadProps} props - SEO configuration
 */
const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  twitterCard = 'summary_large_image',
  canonicalUrl,
  structuredData,
  noIndex = false,
}) => {
  React.useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Helper function to update or create meta tag
    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (selector.includes('property=')) {
          element.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] || '');
        } else {
          element.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] || '');
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };

    // Update description
    if (description) {
      updateMetaTag('meta[name="description"]', 'content', description);
    }

    // Update keywords
    if (keywords) {
      updateMetaTag('meta[name="keywords"]', 'content', keywords);
    }

    // Update robots
    if (noIndex) {
      updateMetaTag('meta[name="robots"]', 'content', 'noindex, nofollow');
    } else {
      updateMetaTag('meta[name="robots"]', 'content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    // Update Open Graph tags
    if (ogTitle) {
      updateMetaTag('meta[property="og:title"]', 'content', ogTitle);
    }
    if (ogDescription) {
      updateMetaTag('meta[property="og:description"]', 'content', ogDescription);
    }
    if (ogImage) {
      updateMetaTag('meta[property="og:image"]', 'content', ogImage);
    }
    if (ogUrl) {
      updateMetaTag('meta[property="og:url"]', 'content', ogUrl);
    }

    // Update Twitter Card tags
    if (twitterCard) {
      updateMetaTag('meta[name="twitter:card"]', 'content', twitterCard);
    }
    if (ogTitle) {
      updateMetaTag('meta[name="twitter:title"]', 'content', ogTitle);
    }
    if (ogDescription) {
      updateMetaTag('meta[name="twitter:description"]', 'content', ogDescription);
    }
    if (ogImage) {
      updateMetaTag('meta[name="twitter:image"]', 'content', ogImage);
    }

    // Update canonical URL
    if (canonicalUrl) {
      let linkElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute('href', canonicalUrl);
    }

    // Add structured data
    if (structuredData) {
      const scriptId = 'structured-data-script';
      let scriptElement = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (scriptElement) {
        scriptElement.textContent = JSON.stringify(structuredData);
      } else {
        const newScriptElement = document.createElement('script') as HTMLScriptElement;
        newScriptElement.id = scriptId;
        newScriptElement.type = 'application/ld+json';
        newScriptElement.textContent = JSON.stringify(structuredData);
        document.head.appendChild(newScriptElement);
      }
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, twitterCard, canonicalUrl, structuredData, noIndex]);

  return null; // This component doesn't render anything
};

export default SEOHead;
