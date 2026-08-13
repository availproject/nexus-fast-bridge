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
  updatedAt?: string;
}

export interface SanityPostDocument {
  _createdAt?: string;
  _id?: string;
  _updatedAt?: string;
  author?: string;
  body?: string | unknown[];
  content?: string | unknown[];
  coverImage?: string;
  description?: string;
  excerpt?: string;
  featuredImage?: string;
  lastUpdated?: string;
  mainImageUrl?: string;
  publishedAt?: string;
  reviewedBy?: string;
  reviewer?: string;
  seoDescription?: string;
  seoTitle?: string;
  slug?: string | { current?: string };
  summary?: string;
  title?: string;
  tldr?: string[];
}

export interface SanityQueryResponse {
  result?: SanityPostDocument[];
}

interface PortableTextSpan {
  _type?: string;
  marks?: string[];
  text?: string;
}

interface PortableTextMarkDef {
  _key: string;
  _type: string;
  href?: string;
}

interface PortableTextBlock {
  _type?: string;
  alt?: string;
  asset?: { _ref?: string; _id?: string; url?: string };
  children?: PortableTextSpan[];
  listItem?: string;
  markDefs?: PortableTextMarkDef[];
  style?: string;
}

export function parseSanityImageRef(
  ref: string | undefined,
  projectId = "84yp3g05",
  dataset = "guides"
): string | null {
  if (!ref || typeof ref !== "string" || !ref.startsWith("image-")) {
    return null;
  }
  const parts = ref.split("-");
  if (parts.length < 4) {
    return null;
  }
  const hash = parts[1];
  const dim = parts[2];
  const ext = parts[3];
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${dim}.${ext}`;
}

export function renderSpanText(
  child: PortableTextSpan,
  markDefsMap: Map<string, PortableTextMarkDef>
): string {
  if (!child || typeof child.text !== "string") {
    return "";
  }

  let text = child.text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (!Array.isArray(child.marks)) {
    return text;
  }

  for (const mark of child.marks) {
    if (mark === "strong") {
      text = `<strong>${text}</strong>`;
    } else if (mark === "em") {
      text = `<em>${text}</em>`;
    } else if (mark === "underline") {
      text = `<u style="text-decoration: underline;">${text}</u>`;
    } else if (
      mark === "strike-through" ||
      mark === "strikethrough" ||
      mark === "line-through"
    ) {
      text = `<s style="text-decoration: line-through;">${text}</s>`;
    } else if (mark === "code") {
      text = `<code style="font-family: monospace; background: rgba(0, 101, 255, 0.08); padding: 2px 6px; border-radius: 4px; color: #0065ff;">${text}</code>`;
    } else {
      const def = markDefsMap.get(mark);
      if (def?.href) {
        text = `<a href="${def.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
    }
  }

  return text;
}

function renderBlockText(block: PortableTextBlock): string {
  const markDefsMap = new Map<string, PortableTextMarkDef>();
  if (Array.isArray(block.markDefs)) {
    for (const def of block.markDefs) {
      if (def._key) {
        markDefsMap.set(def._key, def);
      }
    }
  }

  if (!Array.isArray(block.children)) {
    return "";
  }
  let result = "";
  for (const child of block.children) {
    result += renderSpanText(child, markDefsMap);
  }
  return result;
}

function wrapStyleTag(style: string, blockText: string): string {
  switch (style) {
    case "h1":
      return `<h1>${blockText}</h1>`;
    case "h2":
      return `<h2>${blockText}</h2>`;
    case "h3":
      return `<h3>${blockText}</h3>`;
    case "h4":
      return `<h4>${blockText}</h4>`;
    case "h5":
      return `<h5>${blockText}</h5>`;
    case "h6":
      return `<h6>${blockText}</h6>`;
    case "blockquote":
      return `<blockquote class="seo-callout"><p>${blockText}</p></blockquote>`;
    default:
      return `<p>${blockText}</p>`;
  }
}

export function renderImageFigure(block: PortableTextBlock): string | null {
  if (block._type === "image") {
    const url =
      block.asset?.url ||
      parseSanityImageRef(block.asset?._ref || block.asset?._id);
    if (url) {
      const alt = block.alt || "";
      return `<figure style="margin: 1.5rem 0;"><img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 10px;" loading="lazy" /></figure>`;
    }
  }
  if (block._type === "code") {
    const codeText =
      (block as unknown as { code?: string; text?: string }).code ||
      (block as unknown as { code?: string; text?: string }).text ||
      "";
    return `<pre style="background: #111827; color: #f9fafb; padding: 1rem 1.25rem; border-radius: 10px; overflow-x: auto; font-family: monospace; font-size: 14px; margin: 1.5rem 0;"><code>${codeText}</code></pre>`;
  }
  return null;
}

function processSingleBlock(
  block: unknown,
  currentListType: "bullet" | "number" | null,
  closeListIfNeeded: (nextType?: string) => void
): { html: string | null; newListType: "bullet" | "number" | null } {
  if (typeof block !== "object" || !block) {
    return { html: null, newListType: currentListType };
  }

  const imgHtml = renderImageFigure(block as PortableTextBlock);
  if (imgHtml) {
    closeListIfNeeded(undefined);
    return { html: imgHtml, newListType: null };
  }

  const pBlock = block as PortableTextBlock;
  if (pBlock._type !== "block") {
    return { html: null, newListType: currentListType };
  }

  const blockText = renderBlockText(pBlock);
  const listItem = pBlock.listItem;

  if (listItem === "bullet" || listItem === "number") {
    let listOpenHtml = "";
    if (currentListType !== listItem) {
      closeListIfNeeded(undefined);
      listOpenHtml =
        listItem === "bullet"
          ? '<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0 0 1.25rem 0;">\n'
          : '<ol style="list-style-type: decimal; padding-left: 1.5rem; margin: 0 0 1.25rem 0;">\n';
    }
    return {
      html: `${listOpenHtml}<li style="margin-bottom: 0.35rem;">${blockText}</li>`,
      newListType: listItem,
    };
  }

  closeListIfNeeded(undefined);
  const style = pBlock.style || "normal";
  if (!blockText.trim() && style === "normal") {
    return { html: null, newListType: null };
  }

  return { html: wrapStyleTag(style, blockText), newListType: null };
}

export function portableTextToHtml(
  content: string | PortableTextBlock[] | unknown
): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }

  const htmlChunks: string[] = [];
  let currentListType: "bullet" | "number" | null = null;

  const closeListIfNeeded = (nextType?: string) => {
    if (currentListType && currentListType !== nextType) {
      htmlChunks.push(currentListType === "bullet" ? "</ul>" : "</ol>");
      currentListType = null;
    }
  };

  for (const block of content) {
    const res = processSingleBlock(block, currentListType, closeListIfNeeded);
    currentListType = res.newListType;
    if (res.html) {
      htmlChunks.push(res.html);
    }
  }

  closeListIfNeeded(undefined);
  return htmlChunks.join("\n");
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
  const rawContent = portableTextToHtml(doc.content ?? doc.body);
  const imageUrl =
    doc.featuredImage ??
    doc.coverImage ??
    doc.mainImageUrl ??
    "https://files.availproject.org/nexus-fast-bridge/meta/fastbridge-meta-2.png";

  const description =
    doc.description || doc.summary || doc.excerpt || doc.seoDescription || "";

  const rawDate =
    doc.lastUpdated ||
    doc.publishedAt ||
    doc._updatedAt ||
    doc._createdAt ||
    new Date().toISOString().split("T")[0];

  const formattedDate = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;

  return {
    slug: rawSlug,
    title,
    seoTitle: doc.seoTitle || title,
    seoDescription:
      doc.seoDescription || description || `Read ${title} on FastBridge.`,
    content: rawContent,
    excerpt: description,
    summary: description,
    publishedAt: formattedDate,
    lastUpdated: formattedDate,
    updatedAt: doc._updatedAt ? doc._updatedAt.split("T")[0] : undefined,
    author: doc.author || "FastBridge Team",
    reviewedBy: doc.reviewedBy || doc.reviewer || "",
    reviewer: doc.reviewer || doc.reviewedBy || "",
    tldr: Array.isArray(doc.tldr) ? doc.tldr : undefined,
    coverImage: imageUrl,
    featuredImage: imageUrl,
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
      description,
      publishedAt,
      lastUpdated,
      _createdAt,
      _updatedAt,
      "author": coalesce(author->name, author, "FastBridge Team"),
      "reviewedBy": coalesce(reviewedBy->name, reviewer->name, reviewedBy, reviewer, ""),
      "reviewer": coalesce(reviewer->name, reviewedBy->name, reviewer, reviewedBy, ""),
      "tldr": tldr[],
      "content": coalesce(content[]{..., asset->{url}}, body[]{..., asset->{url}}, content, body, summary, excerpt, description, ""),
      "body": coalesce(body[]{..., asset->{url}}, content[]{..., asset->{url}}, body, content, ""),
      "coverImage": coalesce(featuredImage.asset->url, coverImage.asset->url, mainImage.asset->url, featuredImage, coverImage, mainImageUrl),
      "featuredImage": coalesce(featuredImage.asset->url, coverImage.asset->url, mainImage.asset->url, featuredImage, coverImage, mainImageUrl)
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
