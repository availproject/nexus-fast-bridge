const SITE_URL = "https://fastbridge.availproject.org";

export interface PageSeoMetadata {
  canonicalPath: string;
  description?: string;
  imageUrl?: string;
  title?: string;
}

/**
 * Builds a canonical URL for the given route path under the production origin.
 */
export function buildCanonicalUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

function setMetaContent(selector: string, value: string): void {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) {
    el.content = value;
  }
}

/**
 * Updates the document's self-referencing canonical link and related SEO meta tags.
 */
export function updatePageSeo({
  canonicalPath,
  title,
  description,
  imageUrl,
}: PageSeoMetadata): void {
  if (typeof document === "undefined") {
    return;
  }

  const canonicalUrl = buildCanonicalUrl(canonicalPath);

  let canonicalLink = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (canonicalLink) {
    canonicalLink.href = canonicalUrl;
  } else {
    canonicalLink = document.createElement("link");
    canonicalLink.rel = "canonical";
    canonicalLink.href = canonicalUrl;
    document.head.appendChild(canonicalLink);
  }

  setMetaContent('meta[property="og:url"]', canonicalUrl);
  setMetaContent('meta[name="twitter:site"]', canonicalUrl);

  if (title) {
    document.title = title;
    setMetaContent('meta[name="title"]', title);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[name="twitter:title"]', title);
  }

  if (description) {
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:description"]', description);
  }

  if (imageUrl) {
    const absoluteImageUrl = imageUrl.startsWith("/")
      ? `${SITE_URL}${imageUrl}`
      : imageUrl;
    setMetaContent('meta[property="og:image"]', absoluteImageUrl);
    setMetaContent('meta[itemprop="image"]', absoluteImageUrl);
    setMetaContent('meta[name="twitter:image"]', absoluteImageUrl);
  }
}
