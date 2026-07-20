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
    title: "Bridge to MegaETH – Instant Cross-Chain Transfers | FastBridge",
    description:
      "Bridge USDC, USDT, ETH, and other tokens from major EVM chains to MegaETH in one transaction. FastBridge is the fastest way to bridge to MegaETH with low fees from any chain.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/megaeth",
    themeColor: "#2B2B2B",
  },
  {
    slug: "monad",
    title: "Bridge to Monad – Fast & Cheap Cross-Chain Transfers | FastBridge",
    description:
      "Bridge USDC and other tokens from major EVM chains to Monad in one transaction. FastBridge offers the fastest, lowest-fee routes from multiple chains to Monad mainnet.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/monad",
    themeColor: "#836EF9",
  },
  {
    slug: "citrea",
    title:
      "Bridge to Citrea – Bitcoin ZK Rollup Cross-Chain Bridge | FastBridge",
    description:
      "Bridge USDC, USDT, and other tokens from multiple EVM chains to Citrea in one transaction. FastBridge is the easiest way to bridge to Citrea with fast, low-fee transfers.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/citrea",
    themeColor: "#1A1A1A",
  },
  {
    slug: "arbitrum",
    title:
      "Bridge to Arbitrum from Multiple Chains in One Transaction | FastBridge",
    description:
      "Bridge ETH, USDC, and USDT to Arbitrum One from Ethereum and other chains, all at once. FastBridge offers instant, low-cost cross-chain swaps and transfers to Arbitrum.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/arbitrum",
    themeColor: "#28A0F0",
  },
  {
    slug: "ethereum",
    title:
      "Bridge to Ethereum – Combine Your L2 Balances in One Transaction | FastBridge",
    description:
      "Bridge from L2 chains like Base, Arbitrum, Optimism, Polygon, and more back to Ethereum mainnet. FastBridge enables cross-chain transfers and swaps with your assets consolidated.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/ethereum",
    themeColor: "#627EEA",
  },
  {
    slug: "polygon",
    title:
      "Bridge to Polygon – Instant Cross-Chain Swaps & Transfers | FastBridge",
    description:
      "Bridge USDC, USDT and POL to Polygon from Ethereum, Arbitrum, and more. FastBridge combines your balances across chains and delivers fast, low-fee cross-chain swaps and transfers to Polygon PoS.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/polygon",
    themeColor: "#8247E5",
  },
  {
    slug: "base",
    title:
      "Bridge to Base – Fastest ETH & USDC Transfers to Base Chain | FastBridge",
    description:
      "Bridge ETH, and USDC from Ethereum, and other L2 chains to Base, in one transaction. FastBridge combines your multi-chain balances and delivers fast, low-fee transfers to Coinbase’s L2 instantly.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/base",
    themeColor: "#0052FF",
  },
  {
    slug: "optimism",
    aliases: ["op-mainnet"],
    title:
      "Bridge to Optimism from Multiple Chains in One Transaction | FastBridge",
    description:
      "Bridge ETH, USDC, and USDT to Optimism from Ethereum and other EVM chains. FastBridge combines your balances across chains and delivers fast, low-fee cross-chain swaps and transfers to OP Mainnet.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/optimism",
    themeColor: "#FF0420",
  },
  {
    slug: "scroll",
    title:
      "Bridge to Scroll – Fast zkEVM Cross-Chain Transfers & Swaps | FastBridge",
    description:
      "Bridge ETH, USDC and USDT to Scroll zkEVM from Ethereum and other EVM chains. FastBridge combines your balances across chains and delivers fast, secure cross-chain transfers to Scroll L2.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/scroll",
    themeColor: "#C4A882",
  },
  {
    slug: "kaia",
    title:
      "Bridge to Kaia – Fast Cross-Chain Transfers & Swaps to Kaia Blockchain | FastBridge",
    description:
      "Bridge USDT and KAIA tokens to Kaia blockchain from Ethereum and other EVM chains. FastBridge combines your balances across chains and delivers fast, secure cross-chain transfers to Kaia (formerly Klaytn).",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/kaia",
    themeColor: "#31C48D",
  },
  {
    slug: "bnb-smart-chain",
    aliases: ["bsc"],
    title: "Bridge to BNB Smart Chain – Fast ETH to BNB Transfers | FastBridge",
    description:
      "Bridge ETH, BNB, USDT and USDC to BNB chain from Ethereum, Polygon, Arbitrum and other EVM chains, all at once. FastBridge combines your balances from multiple chains and delivers low-fee cross-chain transfers to BSC.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/bnb-smart-chain",
    themeColor: "#F3BA2F",
  },
  {
    slug: "hyperevm",
    title:
      "Bridge to HyperEVM from Multiple Chains in One Transaction | FastBridge",
    description:
      "Bridge USDC, USDT and HYPE to HyperEVM, Hyperliquid's EVM L1. FastBridge combines your balances from Ethereum, Arbitrum, and other EVM chains in a single transaction and delivers unified cross-chain swaps and transfers to HyperEVM.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/hyperevm",
    themeColor: "#50E3C2",
  },
  {
    slug: "avalanche",
    title:
      "Bridge to Avalanche from Multiple Chains in One Transaction | FastBridge",
    description:
      "Bridge USDC, USDT and AVAX to Avalanche C-Chain from Ethereum, Arbitrum, BNB and other EVM chains. FastBridge consolidates your funds across chains and delivers fast, unified cross-chain transfers to Avax chain, in a single transaction.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/avalanche",
    themeColor: "#E84142",
  },
];

// Top-level regex constants (required by Biome's useTopLevelRegex rule)
const RE_TITLE = /<title>[^<]*<\/title>/;
const RE_CANONICAL = /<link rel="canonical"[^>]*>/;
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
  const { title, description, imageUrl, canonicalUrl, themeColor } = chain;

  return baseHtml
    .replace(RE_TITLE, `<title>${title}</title>`)
    .replace(RE_CANONICAL, `<link rel="canonical" href="${canonicalUrl}">`)
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
  const routeSlugs = [chain.slug, ...(chain.aliases ?? [])];
  const html = injectMeta(baseHtml, chain);

  for (const routeSlug of routeSlugs) {
    const outDir = path.join(distDir, routeSlug);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "index.html");
    fs.writeFileSync(outFile, html, "utf-8");
    generated++;
    console.log(`✅  Generated ${routeSlug}/index.html`);
  }
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
