/**
 * Post-build script: generate-route-html.mjs
 *
 * After `vite build`, this script reads the generated dist/index.html and
 * creates a chain-specific copy at dist/[slug]/index.html for every chain.
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

// Chain meta data – kept in sync with chain-settings.ts
const CHAIN_META = [
  {
    slug: "megaeth",
    title: "MegaETH Fast Bridge - Powered by Avail Nexus",
    description:
      "Move your unified USDC and USDT from 12 chains to MegaETH, faster than ever.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/megaeth/",
    themeColor: "#19191A",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "monad",
    title: "Monad Fast Bridge - Powered by Avail Nexus",
    description:
      "Move your unified USDC and USDT from 12 chains to Monad, faster than ever.",
    imageUrl: "https://fastbridge.availproject.org/monad/MonadFBMeta.png",
    canonicalUrl: "https://fastbridge.availproject.org/monad/",
    themeColor: "#6E54FF",
    faviconUrl: "https://fastbridge.availproject.org/monad/faviconV2.png",
  },
  {
    slug: "citrea",
    title: "Citrea Fast Bridge - Powered by Avail",
    description: "Move assets from any chain to Citrea, instantly.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/citrea/",
    themeColor: "#EF8F36",
    faviconUrl: "https://fastbridge.availproject.org/citrea/faviconV2.png",
  },
  {
    slug: "arbitrum",
    title: "Arbitrum Fast Bridge - Powered by Avail Nexus",
    description:
      "Bridge your assets to Arbitrum instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/arbitrum/",
    themeColor: "#016BE5",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "ethereum",
    title: "Ethereum Fast Bridge - Powered by Avail Nexus",
    description:
      "Bridge your assets to Ethereum instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/ethereum/",
    themeColor: "#8891AE",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "polygon",
    title: "Polygon Fast Bridge - Powered by Avail Nexus",
    description:
      "Bridge your assets to Polygon instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/polygon/",
    themeColor: "#6100FF",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "base",
    title: "Base Fast Bridge - Powered by Avail Nexus",
    description: "Bridge your assets to Base instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/base/",
    themeColor: "#0000ff",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "op-mainnet",
    title: "OP Mainnet Fast Bridge - Powered by Avail Nexus",
    description:
      "Bridge your assets to OP Mainnet instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/op-mainnet/",
    themeColor: "#FF0421",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "scroll",
    title: "Scroll Fast Bridge - Powered by Avail Nexus",
    description:
      "Bridge your assets to Scroll instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/scroll/",
    themeColor: "#FFEEDA",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "kaia",
    title: "Kaia Fast Bridge - Powered by Avail Nexus",
    description: "Bridge your assets to Kaia instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/kaia/",
    themeColor: "#bff009",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "bnb-smart-chain",
    title: "BNB Smart Chain Fast Bridge - Powered by Avail Nexus",
    description:
      "Bridge your assets to BNB Smart Chain instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/bnb-smart-chain/",
    themeColor: "#f0b90b",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "hyperevm",
    title: "HyperEVM Fast Bridge - Powered by Avail Nexus",
    description:
      "Bridge your assets to HyperEVM instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/hyperevm/",
    themeColor: "#50D2C1",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
  },
  {
    slug: "avalanche",
    title: "Avalanche Fast Bridge - Powered by Avail Nexus",
    description:
      "Bridge your assets to Avalanche instantly with Avail Fast Bridge.",
    imageUrl:
      "https://files.availproject.org/fastbridge/megaeth/megaeth-meta-2.png",
    canonicalUrl: "https://fastbridge.availproject.org/avalanche/",
    themeColor: "#FF394A",
    faviconUrl: "https://fastbridge.availproject.org/megaeth/faviconV2.png",
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
      `<link rel="icon" href="${faviconUrl}" type="image/x-icon">`
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
