export interface CMSBlogPost {
  author: string;
  content: string;
  coverImage: string;
  excerpt: string;
  featuredImage?: string;
  lastUpdated?: string;
  publishedAt: string;
  reviewedBy?: string;
  reviewer?: string;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  summary?: string;
  title: string;
  tldr?: string[];
  toc: Array<{ id: string; label: string }>;
}

const RE_HEADING = /<h[23][^>]*>(.*?)<\/h[23]>|^(#{2,3})\s+(.*$)/gim;
const RE_TAGS = /<[^>]*>/g;
const RE_SLUG_NON_ALPHANUM = /[^a-z0-9]+/g;
const RE_SLUG_TRIM_HYPHENS = /(^-|-$)/g;

export function slugifyHeading(text: string): string {
  if (!text) {
    return "";
  }
  const cleanLabel = text.replace(RE_TAGS, "").trim();
  return cleanLabel
    .toLowerCase()
    .replace(RE_SLUG_NON_ALPHANUM, "-")
    .replace(RE_SLUG_TRIM_HYPHENS, "");
}

// Guides that aren't Markdown files: this one has its own page component.
const STATIC_POSTS: CMSBlogPost[] = [
  {
    slug: "top-cross-chain-bridges",
    title: "Top 8 Cross-Chain Bridges in 2026: Fees, Speed & Security Compared",
    seoTitle:
      "Top 8 Cross-Chain Bridges in 2026: Fees, Speed & Security Compared",
    seoDescription:
      "Compare the top 8 cross-chain bridges in 2026: FastBridge, Across, Stargate, deBridge, Relay, Circle CCTP, Wormhole, and Jumper. Fees, speed, security models, and features compared.",
    excerpt:
      "Compare the top 8 cross-chain bridges in 2026 including FastBridge, Across, Stargate, deBridge, Relay, Circle CCTP, Wormhole, and Jumper.",
    content: `
      <h2>TL;DR</h2>
      <p>The best cross-chain bridge in 2026 depends on what you're moving and where from. FastBridge is the only bridge with native multi-source support, allowing you to consolidate assets across multiple chains in a single transaction.</p>
      <h2>Why multi-source matters</h2>
      <p>Most active DeFi users don't hold capital on one chain. FastBridge enables pulling from all selected source chains in one signed transaction with gas abstraction.</p>
    `,
    publishedAt: "2026-04-24",
    lastUpdated: "2026-04-24",
    author: "Andria Efstathiou",
    reviewedBy: "Scott Milat",
    reviewer: "Scott Milat",
    tldr: [
      "FastBridge by Avail, best for consolidating assets from multiple chains in one transaction.",
      "Across, best for fast single-asset transfers with deep liquidity on major EVM routes.",
      "Stargate, best for the widest chain coverage including non-EVM networks.",
    ],
    coverImage:
      "/landing-new/assets/branding/blog/top-cross-chain-bridges-2026.png",
    toc: [
      { id: "tldr", label: "TL;DR" },
      { id: "why-multi-source-matters", label: "Why multi-source matters" },
    ],
  },
];

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
      const id = slugifyHeading(cleanLabel);
      if (id && !headings.some((h) => h.id === id)) {
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

/**
 * Returns every guide: the Markdown files in content/guides, then STATIC_POSTS.
 * The Markdown is loaded on demand so it stays out of the main bundle. Errors
 * aren't caught here, because a broken guide has to fail the build.
 */
export async function fetchBlogPosts(): Promise<CMSBlogPost[]> {
  const { loadMarkdownGuides } = await import("./guide-content");
  const posts = [...loadMarkdownGuides()];

  const slugs = new Set(posts.map((post) => post.slug));
  for (const post of STATIC_POSTS) {
    if (!slugs.has(post.slug)) {
      posts.push(post);
    }
  }

  return posts;
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
