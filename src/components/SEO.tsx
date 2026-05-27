import { useEffect } from 'react';

const SITE_URL = 'https://aabnoor.shop';
const DEFAULT_TITLE = 'Aabnoor Beaute | Premium Beauty & Skincare';
const DEFAULT_DESCRIPTION = 'Shop Aabnoor Beaute for curated skincare, makeup, hair care, fragrance, live sale offers, secure checkout, order tracking and premium beauty essentials.';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}

const absoluteUrl = (pathOrUrl?: string) => {
  if (!pathOrUrl) return SITE_URL;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
};

const setMeta = (selector: string, attribute: 'content' | 'href', value: string, createTag?: () => HTMLMetaElement | HTMLLinkElement) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!element && createTag) {
    element = createTag();
    document.head.appendChild(element);
  }
  element?.setAttribute(attribute, value);
};

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '/',
  image = '/favicon-512.png',
  type = 'website',
  jsonLd,
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    const canonicalUrl = absoluteUrl(canonicalPath);
    const imageUrl = absoluteUrl(image);
    document.title = title;

    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[name="robots"]', 'content', noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large', () => {
      const tag = document.createElement('meta');
      tag.setAttribute('name', 'robots');
      return tag;
    });
    setMeta('link[rel="canonical"]', 'href', canonicalUrl, () => {
      const tag = document.createElement('link');
      tag.setAttribute('rel', 'canonical');
      return tag;
    });
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:type"]', 'content', type === 'product' ? 'product' : 'website');
    setMeta('meta[property="og:url"]', 'content', canonicalUrl, () => {
      const tag = document.createElement('meta');
      tag.setAttribute('property', 'og:url');
      return tag;
    });
    setMeta('meta[property="og:image"]', 'content', imageUrl);
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image', () => {
      const tag = document.createElement('meta');
      tag.setAttribute('name', 'twitter:card');
      return tag;
    });
    setMeta('meta[name="twitter:title"]', 'content', title, () => {
      const tag = document.createElement('meta');
      tag.setAttribute('name', 'twitter:title');
      return tag;
    });
    setMeta('meta[name="twitter:description"]', 'content', description, () => {
      const tag = document.createElement('meta');
      tag.setAttribute('name', 'twitter:description');
      return tag;
    });
    setMeta('meta[name="twitter:image"]', 'content', imageUrl, () => {
      const tag = document.createElement('meta');
      tag.setAttribute('name', 'twitter:image');
      return tag;
    });

    document.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());
    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((item) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.seoJsonld = 'true';
        script.textContent = JSON.stringify(item);
        document.head.appendChild(script);
      });
    }
  }, [canonicalPath, description, image, jsonLd, noIndex, title, type]);

  return null;
}

export const SEO_SITE_URL = SITE_URL;
export const SEO_DEFAULT_DESCRIPTION = DEFAULT_DESCRIPTION;
