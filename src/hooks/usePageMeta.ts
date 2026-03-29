import { useEffect } from 'react';

interface PageMeta {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  canonical?: string;
}

const BASE_TITLE = 'NeuralBi';
const DEFAULT_DESCRIPTION =
  'Upload any CSV and instantly get beautiful, interactive dashboards powered by AI. Turn raw data into charts, KPIs, and insights in seconds.';

function setMetaTag(attr: string, key: string, value: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;

    if (meta.title) {
      document.title = `${meta.title} | ${BASE_TITLE}`;
    }

    if (meta.description) {
      setMetaTag('name', 'description', meta.description);
    }

    // Open Graph
    if (meta.ogTitle || meta.title) {
      setMetaTag('property', 'og:title', meta.ogTitle || meta.title || BASE_TITLE);
    }
    if (meta.ogDescription || meta.description) {
      setMetaTag('property', 'og:description', meta.ogDescription || meta.description || DEFAULT_DESCRIPTION);
    }
    if (meta.ogImage) {
      setMetaTag('property', 'og:image', meta.ogImage);
    }
    if (meta.ogUrl) {
      setMetaTag('property', 'og:url', meta.ogUrl);
    }

    // Twitter
    if (meta.twitterTitle || meta.title) {
      setMetaTag('name', 'twitter:title', meta.twitterTitle || meta.title || BASE_TITLE);
    }
    if (meta.twitterDescription || meta.description) {
      setMetaTag('name', 'twitter:description', meta.twitterDescription || meta.description || DEFAULT_DESCRIPTION);
    }

    // Canonical
    if (meta.canonical) {
      setCanonical(meta.canonical);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [meta.title, meta.description, meta.ogTitle, meta.ogDescription, meta.ogImage, meta.ogUrl, meta.twitterTitle, meta.twitterDescription, meta.canonical]);
}
