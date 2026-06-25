/**
 * Post-build script: generate-route-html.mjs
 *
 * After `vite build`, this script reads the generated dist/index.html and
 * creates a chain-specific copy at dist/[slug]/index.html for each supported
 * chain page.
 * Each copy has the correct <title>, OG, and Twitter meta tags pre-baked.
 *
 * Vercel then serves the right file per route (see vercel.json rewrites),
 * so social crawlers and bots see the correct metadata without JavaScript.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../apps/root/dist");
const indexPath = path.join(distDir, "index.html");

// ---------------------------------------------------------------------------
// Chain meta data
//
// Single source of truth: packages/fast-bridge-app/src/config/chain-settings.ts
// (each supported page chain's `appConfig.meta` object).
//
// WHY NOT A DIRECT IMPORT?
// chain-settings.ts uses TypeScript syntax and imports local app modules.
// Plain `node` cannot execute TypeScript without a build step, so we maintain
// this plain-JS mirror. When you update `meta` in chain-settings.ts, update
// the matching entry here too.
// ---------------------------------------------------------------------------
const LANDING_META_IMAGE_URL =
  "https://files.availproject.org/nexus-fast-bridge/meta/fastbridge-meta-2.png";

const CHAIN_META = [
  {
    slug: "megaeth",
    title:
      "MegaETH FastBridge by Avail | Unified Cross-Chain Swaps and Transfers on MegaETH",
    description:
      "Bridge USDC, USDT, ETH, and other tokens from major EVM chains to MegaETH in one transaction. FastBridge is a fast, secure cross-chain bridge powered by Avail Nexus.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/megaeth",
    themeColor: "#19191A",
    faviconUrl: "/avail_logo.svg",
  },
  {
    slug: "monad",
    title:
      "Monad FastBridge by Avail | Unified Cross-Chain Swaps and Transfers on Monad",
    description:
      "Bridge USDC, USDT, ETH, and other tokens from major EVM chains to Monad in one transaction. FastBridge is a fast, secure cross-chain bridge powered by Avail Nexus.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/monad",
    themeColor: "#6E54FF",
    faviconUrl: "/avail_logo.svg",
  },
  {
    slug: "citrea",
    title:
      "Citrea FastBridge by Avail | Unified Cross-Chain Swaps and Transfers on Citrea",
    description:
      "Bridge USDC, USDT, ETH, and other tokens from major EVM chains to Citrea in one transaction. FastBridge is a fast, secure cross-chain bridge powered by Avail Nexus.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/citrea",
    themeColor: "#EF8F36",
    faviconUrl: "/avail_logo.svg",
  },
];

// Top-level regex constants (required by Biome's useTopLevelRegex rule)
const RE_TITLE = /<title>[^<]*<\/title>/;
const RE_CANONICAL = /<link rel="canonical"[^>]*>/;
const RE_FAVICON = /<link\s+rel="icon"[^>]*>/;
const RE_THEME_COLOR = /<meta name="theme-color"[^>]*>/;
const RE_META_DESCRIPTION = /<meta\s+name="description"[^>]*>/;
const RE_META_TITLE = /<meta\s+name="title"[^>]*>/;
const RE_OG_TITLE = /<meta\s+property="og:title"[^>]*>/;
const RE_OG_DESCRIPTION = /<meta\s+property="og:description"[^>]*>/;
const RE_OG_URL = /<meta\s+property="og:url"[^>]*>/;
const RE_OG_IMAGE = /<meta\s+property="og:image"[^>]*>/;
const RE_ITEMPROP_IMAGE = /<meta\s+itemprop="image"[^>]*>/;
const RE_TWITTER_TITLE = /<meta\s+name="twitter:title"[^>]*>/;
const RE_TWITTER_DESCRIPTION = /<meta\s+name="twitter:description"[^>]*>/;
const RE_TWITTER_IMAGE = /<meta\s+name="twitter:image"[^>]*>/;
const RE_TWITTER_SITE = /<meta\s+name="twitter:site"[^>]*>/;

function injectMeta(baseHtml, chain) {
  const { title, description, imageUrl, canonicalUrl, themeColor, faviconUrl } =
    chain;

  return baseHtml
    .replace(RE_TITLE, `<title>${title}</title>`)
    .replace(RE_CANONICAL, `<link rel="canonical" href="${canonicalUrl}">`)
    .replace(
      RE_FAVICON,
      `<link rel="icon" href="${faviconUrl}" type="image/svg+xml">`
    )
    .replace(
      RE_THEME_COLOR,
      `<meta name="theme-color" content="${themeColor}">`
    )
    .replace(
      RE_META_DESCRIPTION,
      `<meta name="description" content="${description}">`
    )
    .replace(RE_META_TITLE, `<meta name="title" content="${title}">`)
    .replace(RE_OG_TITLE, `<meta property="og:title" content="${title}">`)
    .replace(
      RE_OG_DESCRIPTION,
      `<meta property="og:description" content="${description}">`
    )
    .replace(RE_OG_URL, `<meta property="og:url" content="${canonicalUrl}">`)
    .replace(RE_OG_IMAGE, `<meta property="og:image" content="${imageUrl}">`)
    .replace(RE_ITEMPROP_IMAGE, `<meta itemprop="image" content="${imageUrl}">`)
    .replace(RE_TWITTER_TITLE, `<meta name="twitter:title" content="${title}">`)
    .replace(
      RE_TWITTER_DESCRIPTION,
      `<meta name="twitter:description" content="${description}">`
    )
    .replace(
      RE_TWITTER_IMAGE,
      `<meta name="twitter:image" content="${imageUrl}">`
    )
    .replace(
      RE_TWITTER_SITE,
      `<meta name="twitter:site" content="${canonicalUrl}">`
    );
}

// Read the built index.html
if (!fs.existsSync(indexPath)) {
  console.error(
    `❌  dist/index.html not found at ${indexPath}. Run 'pnpm build' first.`
  );
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexPath, "utf-8");
let generated = 0;

for (const chain of CHAIN_META) {
  const outDir = path.join(distDir, chain.slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "index.html");
  const html = injectMeta(baseHtml, chain);
  fs.writeFileSync(outFile, html, "utf-8");
  generated++;
  console.log(`✅  Generated ${chain.slug}/index.html`);
}

console.log(`\n🎉  Done — generated ${generated} route-specific HTML files.\n`);

// Generate sitemap.xml
const sitemapPath = path.join(distDir, "sitemap.xml");
const baseUrl = "https://fastbridge.availproject.org";
const staticUrls = [
  { loc: `${baseUrl}/`, priority: "1.0" },
  { loc: `${baseUrl}/faq`, priority: "0.8" },
  { loc: `${baseUrl}/contact`, priority: "0.8" },
];

const allUrls = [
  ...staticUrls,
  ...CHAIN_META.map((chain) => ({
    loc: chain.canonicalUrl,
    priority: "0.9",
  })),
];

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

fs.writeFileSync(sitemapPath, sitemapContent, "utf-8");
console.log("✅  Generated sitemap.xml");
