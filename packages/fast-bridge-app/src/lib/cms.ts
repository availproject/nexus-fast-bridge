export interface CMSBlogPost {
  author: string;
  content: string;
  coverImage: string;
  excerpt: string;
  publishedAt: string;
  reviewer: string;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  title: string;
  toc: Array<{ id: string; label: string }>;
  updatedAt?: string;
}

export interface SanityPostDocument {
  _id?: string;
  _updatedAt?: string;
  author?: string;
  body?: string;
  content?: string;
  coverImage?: string;
  excerpt?: string;
  mainImageUrl?: string;
  publishedAt?: string;
  reviewer?: string;
  seoDescription?: string;
  seoTitle?: string;
  slug?: string | { current?: string };
  title?: string;
}

export interface SanityQueryResponse {
  result?: SanityPostDocument[];
}

const FALLBACK_POSTS: CMSBlogPost[] = [
  {
    slug: "top-cross-chain-bridges",
    title: "Best Cross-Chain Bridges in 2026 [Compared]",
    seoTitle: "Best Cross-Chain Bridges in 2026 [Compared]",
    seoDescription:
      "Compare the best cross-chain bridges in 2026: FastBridge, Across, Stargate and deBridge. Fees, settlement speed, chain coverage and multi-source support.",
    excerpt:
      "Compare the best cross-chain bridges in 2026 including FastBridge, Across, Stargate, and deBridge.",
    content: `
      <h2>TL;DR</h2>
      <p>The best cross-chain bridge in 2026 depends on what you're moving and where from. FastBridge is the only bridge with native multi-source support, allowing you to consolidate assets across multiple chains in a single transaction.</p>
      <h2>Why multi-source matters</h2>
      <p>Most active DeFi users don't hold capital on one chain. FastBridge enables pulling from all selected source chains in one signed transaction with gas abstraction.</p>
    `,
    publishedAt: "2026-04-24",
    author: "Andria Efstathiou",
    reviewer: "Scott Milat",
    coverImage:
      "/landing-new/assets/branding/blog/top-cross-chain-bridges-2026.png",
    toc: [
      { id: "tldr", label: "TL;DR" },
      { id: "why-multi-source-matters", label: "Why multi-source matters" },
    ],
  },
];

const RE_HEADING = /<h[23][^>]*>(.*?)<\/h[23]>|^(#{2,3})\s+(.*$)/gim;
const RE_TAGS = /<[^>]*>/g;
const RE_SLUG_NON_ALPHANUM = /[^a-z0-9]+/g;
const RE_SLUG_TRIM_HYPHENS = /(^-|-$)/g;

/**
 * Extracts h2/h3 headings from raw content for the Table of Contents sidebar.
 */
export function extractTocFromContent(
  htmlOrMarkdown: string
): Array<{ id: string; label: string }> {
  const headings: Array<{ id: string; label: string }> = [];

  let match: RegExpExecArray | null = null;
  while (true) {
    match = RE_HEADING.exec(htmlOrMarkdown);
    if (!match) {
      break;
    }

    const labelRaw = match[1] || match[3] || "";
    const cleanLabel = labelRaw.replace(RE_TAGS, "").trim();
    if (cleanLabel) {
      const id = cleanLabel
        .toLowerCase()
        .replace(RE_SLUG_NON_ALPHANUM, "-")
        .replace(RE_SLUG_TRIM_HYPHENS, "");

      if (!headings.some((h) => h.id === id)) {
        headings.push({ id, label: cleanLabel });
      }
    }
  }

  return headings.length > 0
    ? headings
    : [
        { id: "overview", label: "Overview" },
        { id: "details", label: "Details" },
      ];
}

function normalizeSanityDoc(doc: SanityPostDocument): CMSBlogPost {
  const rawSlug =
    typeof doc.slug === "string" ? doc.slug : (doc.slug?.current ?? "");
  const title = doc.title ?? "Untitled Guide";
  const rawContent = doc.content ?? doc.body ?? "";
  const imageUrl =
    doc.coverImage ??
    doc.mainImageUrl ??
    "https://files.availproject.org/nexus-fast-bridge/meta/fastbridge-meta-2.png";

  return {
    slug: rawSlug,
    title,
    seoTitle: doc.seoTitle || title,
    seoDescription:
      doc.seoDescription || doc.excerpt || `Read ${title} on FastBridge.`,
    content: rawContent,
    excerpt: doc.excerpt || doc.seoDescription || "",
    publishedAt: doc.publishedAt
      ? doc.publishedAt.split("T")[0]
      : new Date().toISOString().split("T")[0],
    updatedAt: doc._updatedAt ? doc._updatedAt.split("T")[0] : undefined,
    author: doc.author || "FastBridge Team",
    reviewer: doc.reviewer || "Avail Research",
    coverImage: imageUrl,
    toc: extractTocFromContent(rawContent),
  };
}

/**
 * Fetches published articles from Sanity.io CMS via HTTP GROQ API.
 * Falls back safely to FALLBACK_POSTS if Sanity project ID is not configured or API fails.
 */
export async function fetchBlogPosts(): Promise<CMSBlogPost[]> {
  const rawProjectId =
    (typeof process !== "undefined"
      ? process.env?.VITE_SANITY_PROJECT_ID
      : undefined) ||
    (import.meta as unknown as { env: Record<string, string> }).env
      ?.VITE_SANITY_PROJECT_ID;

  const projectId = rawProjectId?.trim() ? rawProjectId.trim() : "84yp3g05";

  const rawDataset =
    (typeof process !== "undefined"
      ? process.env?.VITE_SANITY_DATASET
      : undefined) ||
    (import.meta as unknown as { env: Record<string, string> }).env
      ?.VITE_SANITY_DATASET;

  const dataset = rawDataset?.trim() ? rawDataset.trim() : "guides";

  const sanityToken =
    typeof process !== "undefined"
      ? process.env?.VITE_SANITY_API_TOKEN
      : (import.meta as unknown as { env: Record<string, string> }).env
          ?.VITE_SANITY_API_TOKEN;

  if (!projectId) {
    return FALLBACK_POSTS;
  }

  try {
    const groqQuery = `*[_type in ["guide", "blog", "post", "article"]] | order(_createdAt desc) {
      _id,
      title,
      "slug": slug.current,
      seoTitle,
      seoDescription,
      excerpt,
      summary,
      publishedAt,
      _createdAt,
      _updatedAt,
      "author": coalesce(author->name, author, "FastBridge Team"),
      reviewer,
      "content": coalesce(pt::text(content), pt::text(body), content, body, summary, excerpt, ""),
      "coverImage": coalesce(coverImage.asset->url, mainImage.asset->url, coverImage, mainImageUrl)
    }`;

    const encodedQuery = encodeURIComponent(groqQuery);
    const endpoint = `https://${projectId}.api.sanity.io/v2026-06-09/data/query/${dataset}?query=${encodedQuery}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sanityToken) {
      headers.Authorization = `Bearer ${sanityToken}`;
    }

    const res = await fetch(endpoint, { headers });
    if (!res.ok) {
      console.warn(`Sanity CMS fetch failed with status ${res.status}`);
      return FALLBACK_POSTS;
    }

    const json = (await res.json()) as SanityQueryResponse;
    if (!json.result || json.result.length === 0) {
      return FALLBACK_POSTS;
    }

    const fetchedPosts = json.result
      .filter((doc) => Boolean(doc.slug))
      .map(normalizeSanityDoc);

    // Combine CMS posts with fallback posts without duplicates
    const slugs = new Set(fetchedPosts.map((p) => p.slug));
    for (const fb of FALLBACK_POSTS) {
      if (!slugs.has(fb.slug)) {
        fetchedPosts.push(fb);
      }
    }

    return fetchedPosts;
  } catch (err) {
    console.warn("Sanity CMS connection error:", err);
    return FALLBACK_POSTS;
  }
}

/**
 * Fetches a single blog post by slug.
 */
export async function fetchBlogPostBySlug(
  slug: string
): Promise<CMSBlogPost | null> {
  const posts = await fetchBlogPosts();
  const found = posts.find((p) => p.slug === slug);
  return found ?? null;
}
