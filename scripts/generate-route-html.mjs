/**
 * Post-build script: generate-route-html.mjs
 *
 * After `vite build`, this script reads the generated dist/index.html and:
 * 1. Pre-renders React content into <div id="root">...</div> for static pages.
 * 2. Injects unique SEO title, meta description, OpenGraph, and self-referencing canonical URLs.
 * 3. Creates route-specific HTML copies (dist/[slug]/index.html) for all pages.
 * 4. Generates sitemap.xml with accurate lastmod dates.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.resolve(rootDir, "apps/root/dist");
const indexPath = path.join(distDir, "index.html");

const LANDING_META_IMAGE_URL =
  "https://files.availproject.org/nexus-fast-bridge/meta/fastbridge-meta-2.png";

const LANDING_PAGE_STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/hiw.css",
  "/landing-new/blog.css",
  "/landing-new/animations.css",
  "/landing-new/button-hovers.css",
];

const SEO_PAGE_STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/seo-page.css",
  "/landing-new/button-hovers.css",
];

const FAQ_PAGE_STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/button-hovers.css",
];

const CONTACT_PAGE_STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/contact.css",
  "/landing-new/button-hovers.css",
];

const STATIC_PAGES = [
  {
    slug: "",
    title: "FastBridge by Avail | Unified Cross-Chain Swaps and Transfers",
    description:
      "Bridge USDC, USDT, ETH, and other tokens across major EVM chains in one transaction. FastBridge is a fast, secure cross-chain bridge powered by Avail Nexus.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/",
    themeColor: "#19191A",
    stylesheets: LANDING_PAGE_STYLESHEETS,
    componentPath:
      "./packages/fast-bridge-app/src/components/landing-page/index.tsx",
    srcFile: "packages/fast-bridge-app/src/components/landing-page/index.tsx",
    priority: "1.0",
  },
  {
    slug: "about",
    title: "FastBridge: Unified Cross-Chain Bridge by Avail",
    description:
      "FastBridge is a non-custodial cross-chain bridge by Avail. Move & swap tokens across all major EVM chains in one transaction, no gas tokens needed.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/about",
    themeColor: "#19191A",
    stylesheets: SEO_PAGE_STYLESHEETS,
    componentPath:
      "./packages/fast-bridge-app/src/components/about-page/index.tsx",
    srcFile: "packages/fast-bridge-app/src/components/about-page/index.tsx",
    priority: "0.8",
  },
  {
    slug: "guides",
    title: "Cross-Chain Bridges Guide: How to Bridge Crypto | FastBridge",
    description:
      "Explore practical cross-chain bridge guides, crypto tutorials, and bridge comparisons. Learn how to move stablecoins and tokens across Ethereum, Arbitrum, Base, and more.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/guides",
    themeColor: "#19191A",
    stylesheets: SEO_PAGE_STYLESHEETS,
    componentPath:
      "./packages/fast-bridge-app/src/components/guides-page/index.tsx",
    srcFile: "packages/fast-bridge-app/src/components/guides-page/index.tsx",
    priority: "0.9",
  },
  {
    slug: "guides/top-cross-chain-bridges",
    title: "Best Cross-Chain Bridges in 2026 [Compared]",
    description:
      "Compare the best cross-chain bridges in 2026: FastBridge, Across, Stargate and deBridge. Fees, settlement speed, chain coverage and multi-source support.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl:
      "https://fastbridge.availproject.org/guides/top-cross-chain-bridges",
    themeColor: "#19191A",
    stylesheets: SEO_PAGE_STYLESHEETS,
    componentPath:
      "./packages/fast-bridge-app/src/components/guides-page/top-cross-chain-bridges.tsx",
    srcFile:
      "packages/fast-bridge-app/src/components/guides-page/top-cross-chain-bridges.tsx",
    priority: "0.9",
  },
  {
    slug: "faqs",
    aliases: ["faq"],
    title: "Frequently Asked Questions (FAQ) | FastBridge",
    description:
      "Find answers to common questions about bridging assets, gas fees, transaction speeds, supported chains, and security on FastBridge by Avail.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/faqs",
    themeColor: "#19191A",
    stylesheets: FAQ_PAGE_STYLESHEETS,
    componentPath:
      "./packages/fast-bridge-app/src/components/faq-page/index.tsx",
    srcFile: "packages/fast-bridge-app/src/components/faq-page/index.tsx",
    priority: "0.8",
  },
  {
    slug: "contact",
    title: "Contact Us & Support | FastBridge",
    description:
      "Get in touch with the FastBridge team. Get help with cross-chain transfers, report issues, or connect with our developer community.",
    imageUrl: LANDING_META_IMAGE_URL,
    canonicalUrl: "https://fastbridge.availproject.org/contact",
    themeColor: "#19191A",
    stylesheets: CONTACT_PAGE_STYLESHEETS,
    componentPath:
      "./packages/fast-bridge-app/src/components/contact-page/index.tsx",
    srcFile: "packages/fast-bridge-app/src/components/contact-page/index.tsx",
    priority: "0.8",
  },
];

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

// Top-level regex constants required by Biome standards
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
const RE_ROOT_DIV = /<div id="root"><\/div>/;

function getLastModDate(relativeFilePath) {
  const fullPath = path.resolve(rootDir, relativeFilePath);
  try {
    const gitDate = execSync(
      `git log -1 --format=%cd --date=format:%Y-%m-%d "${fullPath}"`,
      { cwd: rootDir }
    )
      .toString()
      .trim();
    if (gitDate) {
      return gitDate;
    }
  } catch (error) {
    console.debug(`Git date lookup fallback for ${relativeFilePath}:`, error);
  }

  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    return stat.mtime.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

function injectMetaAndContent(baseHtml, pageMeta, renderedHtml = "") {
  const { title, description, imageUrl, canonicalUrl, themeColor, props } =
    pageMeta;

  let html = baseHtml
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

  if (Array.isArray(pageMeta.stylesheets) && pageMeta.stylesheets.length > 0) {
    const linkTags = pageMeta.stylesheets
      .map((href) => `    <link rel="stylesheet" href="${href}">`)
      .join("\n");
    html = html.replace("</head>", `${linkTags}\n  </head>`);
  }

  if (renderedHtml) {
    html = html.replace(RE_ROOT_DIV, `<div id="root">${renderedHtml}</div>`);
  }

  if (props) {
    const safeDataJson = JSON.stringify(props).replace(/</g, "\\u003c");
    const scriptTag = `<script id="__FASTBRIDGE_DATA__" type="application/json">${safeDataJson}</script>`;
    html = html.replace("</body>", `${scriptTag}\n  </body>`);
  }

  return html;
}

async function loadCmsPosts(viteServer) {
  try {
    const cmsMod = await viteServer.ssrLoadModule(
      "./packages/fast-bridge-app/src/lib/cms.ts"
    );
    const cmsPosts = await cmsMod.fetchBlogPosts();

    const guidesListingPage = STATIC_PAGES.find((p) => p.slug === "guides");
    if (guidesListingPage) {
      guidesListingPage.props = { initialPosts: cmsPosts };
    }

    const existingSlugs = new Set(STATIC_PAGES.map((p) => p.slug));

    for (const post of cmsPosts) {
      const fullSlug = `guides/${post.slug}`;
      if (!existingSlugs.has(fullSlug)) {
        STATIC_PAGES.push({
          slug: fullSlug,
          title: post.seoTitle || post.title,
          description: post.seoDescription,
          imageUrl: post.coverImage || LANDING_META_IMAGE_URL,
          canonicalUrl: `https://fastbridge.availproject.org/${fullSlug}`,
          themeColor: "#19191A",
          stylesheets: SEO_PAGE_STYLESHEETS,
          componentPath:
            "./packages/fast-bridge-app/src/components/guides-page/guide-detail.tsx",
          srcFile:
            "packages/fast-bridge-app/src/components/guides-page/guide-detail.tsx",
          priority: "0.8",
          props: { initialPost: post },
        });
        existingSlugs.add(fullSlug);
      }
    }
  } catch (cmsErr) {
    console.warn(
      "⚠️ Could not load CMS posts for static generation:",
      cmsErr.message
    );
  }
}

async function renderPageSsr(viteServer, page) {
  try {
    const mod = await viteServer.ssrLoadModule(page.componentPath);
    const Component = mod.default;
    const routeLocation = page.slug ? `/${page.slug}` : "/";
    const renderedHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: [routeLocation] },
        React.createElement(Component, page.props ?? {})
      )
    );
    console.log(
      `✨  Pre-rendered SSR content for /${page.slug} (${renderedHtml.length} bytes)`
    );
    return renderedHtml;
  } catch (err) {
    console.warn(
      `⚠️  Failed to pre-render SSR content for /${page.slug}:`,
      err.message
    );
    return "";
  }
}

function writePageHtmlFiles(page, baseHtml, renderedHtml) {
  let generated = 0;
  const routeSlugs = [page.slug, ...(page.aliases ?? [])];
  const pageHtml = injectMetaAndContent(baseHtml, page, renderedHtml);

  for (const slug of routeSlugs) {
    if (slug === "") {
      fs.writeFileSync(indexPath, pageHtml, "utf-8");
      generated++;
      console.log(
        "✅  Updated dist/index.html with pre-rendered metadata & content"
      );
    } else {
      const outDir = path.join(distDir, slug);
      fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, "index.html");
      fs.writeFileSync(outFile, pageHtml, "utf-8");
      generated++;
      console.log(`✅  Generated ${slug}/index.html`);
    }
  }
  return generated;
}

async function processStaticPages(viteServer, baseHtml, sitemapEntries) {
  let generated = 0;
  for (const page of STATIC_PAGES) {
    const renderedHtml = await renderPageSsr(viteServer, page);
    generated += writePageHtmlFiles(page, baseHtml, renderedHtml);

    const lastmod = getLastModDate(page.srcFile);
    sitemapEntries.push({
      loc: page.canonicalUrl,
      priority: page.priority,
      lastmod,
    });
  }
  return generated;
}

function processChainPages(baseHtml, sitemapEntries) {
  let generated = 0;
  for (const chain of CHAIN_META) {
    const routeSlugs = [chain.slug, ...(chain.aliases ?? [])];
    const chainHtml = injectMetaAndContent(baseHtml, chain);

    for (const routeSlug of routeSlugs) {
      const outDir = path.join(distDir, routeSlug);
      fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, "index.html");
      fs.writeFileSync(outFile, chainHtml, "utf-8");
      generated++;
      console.log(`✅  Generated ${routeSlug}/index.html`);
    }

    const lastmod = getLastModDate(
      "packages/fast-bridge-app/src/config/chain-settings.ts"
    );
    sitemapEntries.push({
      loc: chain.canonicalUrl,
      priority: "0.9",
      lastmod,
    });
  }
  return generated;
}

function generateSitemap(sitemapEntries) {
  const sitemapPath = path.join(distDir, "sitemap.xml");
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  fs.writeFileSync(sitemapPath, sitemapContent, "utf-8");
  console.log("✅  Generated sitemap.xml with lastmod dates");
}

async function main() {
  if (!fs.existsSync(indexPath)) {
    console.error(
      `❌  dist/index.html not found at ${indexPath}. Run 'pnpm build' first.`
    );
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexPath, "utf-8");
  let generated = 0;

  // Initialize Vite dev server in middleware mode to load React components for SSR
  const viteServer = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  const sitemapEntries = [];

  try {
    await loadCmsPosts(viteServer);
    generated += await processStaticPages(viteServer, baseHtml, sitemapEntries);
    generated += processChainPages(baseHtml, sitemapEntries);
  } finally {
    // Delay closing vite server slightly to avoid uncaught background scan errors
    setTimeout(() => {
      viteServer.close().catch((err) => {
        console.debug("Vite server close:", err);
      });
    }, 100);
  }

  console.log(
    `\n🎉  Done — generated ${generated} route-specific HTML files.\n`
  );

  generateSitemap(sitemapEntries);
}

main().catch((err) => {
  console.error("Fatal error in generate-route-html.mjs:", err);
  process.exit(1);
});
