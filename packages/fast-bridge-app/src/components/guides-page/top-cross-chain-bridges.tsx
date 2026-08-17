import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// import { loadLastChain } from "@/providers/runtime-context";

const STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/seo-page.css",
  "/landing-new/button-hovers.css",
];

const TOC_ITEMS = [
  { id: "tldr", label: "TL;DR" },
  { id: "why", label: "Why multi-source matters" },
  { id: "picks", label: "Our top picks" },
  { id: "table", label: "Side-by-side comparison" },
  { id: "fees", label: "Fee comparison" },
  { id: "choose", label: "How to choose" },
  { id: "how", label: "How intent bridges work" },
];

export default function TopCrossChainBridgesPage() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>("tldr");

  const handleBridgeClick = () => {
    // const lastChain = loadLastChain();
    // navigate(`/${lastChain}`);
    navigate("/app");
  };

  const handleTocClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", `#${id}`);
      setActiveId(id);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) {
      return;
    }
    const targetId = window.location.hash.slice(1);
    if (!targetId) {
      return;
    }
    const target = document.getElementById(targetId);
    if (target) {
      const timer = setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(targetId);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    document.title = "Best Cross-Chain Bridges in 2026 [Compared]";
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);

    const addedLinks: HTMLLinkElement[] = [];
    for (const href of STYLESHEETS) {
      const existing = document.querySelector(`link[href="${href}"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.href = href;
        link.rel = "stylesheet";
        document.head.appendChild(link);
        addedLinks.push(link);
      }
    }

    return () => {
      for (const link of addedLinks) {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      }
    };
  }, []);

  useEffect(() => {
    let ticking = false;

    function updateActiveSection() {
      const marker = Math.min(160, Math.round(window.innerHeight * 0.28));
      let current = TOC_ITEMS[0].id;

      for (const item of TOC_ITEMS) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= marker) {
          current = item.id;
        }
      }

      setActiveId(current);
    }

    function onScroll() {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(() => {
        updateActiveSection();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateActiveSection, { passive: true });
    updateActiveSection();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <main className="page seo-page">
      <section aria-labelledby="seo-page-title" className="page-hero">
        <img
          alt=""
          aria-hidden="true"
          className="page-hero__media"
          height="289"
          src="/landing-new/assets/branding/gradients/seo-hero-bg.png"
          width="1024"
        />

        <header className="page-hero__nav">
          <Link className="hero__logo" to="/">
            <img
              alt=""
              className="hero__logo-icon"
              height="40"
              src="/landing-new/assets/branding/logos/logo-icon-white.svg"
              width="40"
            />
            <span className="hero__logo-text">fastbridge</span>
          </Link>
          <button
            className="page-hero__cta"
            onClick={handleBridgeClick}
            type="button"
          >
            Bridge Now
          </button>
        </header>

        <div className="page-hero__content">
          <h1 className="page-hero__title" id="seo-page-title">
            Top Cross-Chain Bridges In 2026
          </h1>
          <p className="page-hero__subtitle">
            An independent guide to choosing the right bridge for your use case.
          </p>
        </div>
      </section>

      <div className="seo-layout seo-layout--guide">
        <aside className="seo-sidebar">
          <nav aria-label="On this page" className="seo-toc">
            <p className="seo-toc__label">On this page</p>
            <ol>
              {TOC_ITEMS.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <li
                    className={isActive ? "is-active" : undefined}
                    key={item.id}
                  >
                    <a
                      aria-current={isActive ? "location" : undefined}
                      href={`#${item.id}`}
                      onClick={(e) => handleTocClick(e, item.id)}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <article className="seo-content">
          <p className="seo-authorship">
            <span>
              Authored by <strong>Andria Efstathiou</strong>
            </span>
            <span aria-hidden="true" className="seo-authorship__sep">
              &middot;
            </span>
            <span>
              Reviewed by <strong>Scott Milat</strong>
            </span>
            <span aria-hidden="true" className="seo-authorship__sep">
              &middot;
            </span>
            <span>Last updated 24 April 2026</span>
          </p>

          <section aria-labelledby="tldr-heading" id="tldr">
            <div className="seo-tldr">
              <p className="seo-tldr__label" id="tldr-heading">
                TL;DR
              </p>
              <p>
                The best cross-chain bridge in 2026 depends on what you&apos;re
                moving and where from. Here&apos;s the short version:
              </p>
              <ul className="seo-tldr-list">
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    01
                  </span>
                  <span>
                    <strong>FastBridge by Avail</strong>, best for consolidating
                    assets from multiple chains in one transaction. The only
                    bridge with native multi-source support. Offers cross-chain
                    swaps and gas abstraction. Supports all major EVM chains.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    02
                  </span>
                  <span>
                    <strong>Across</strong>, best for fast single-asset
                    transfers with deep liquidity on major EVM routes (ETH, USDC
                    between Ethereum, Arbitrum, Optimism, Base).
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    03
                  </span>
                  <span>
                    <strong>Stargate</strong>, best for the widest chain
                    coverage including non-EVM networks. Supports 80+
                    blockchains.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    04
                  </span>
                  <span>
                    <strong>deBridge</strong>, best for intent-based transfers
                    with native Solana and Tron support.
                  </span>
                </li>
              </ul>
              <p>
                All four are non-custodial and deliver native assets. They
                differ substantially in architecture, speed, asset coverage, and
                whether they support pulling from multiple source chains at
                once.
              </p>
            </div>
          </section>

          <section aria-labelledby="why-heading" id="why">
            <h2 id="why-heading">Why multi-source bridging matters</h2>
            <p>
              Most active DeFi users don&apos;t hold capital on one chain. A
              typical portfolio might have USDC on Ethereum from an exited
              position, USDT on Arbitrum from a yield farm, ETH on Base from a
              launch, and stablecoins parked on Optimism. When a new opportunity
              appears on Monad, MegaETH, Citrea, or any other chain, the
              conventional bridging workflow asks the user to do the same thing
              three or four times: switch networks, bridge, pay gas, wait,
              repeat.
            </p>
            <p>
              Every bridge in this guide except FastBridge operates on a
              single-source, single-destination model.{" "}
              <strong>One chain in, one chain out.</strong> If your funds are
              split across three chains, you&apos;re making three transactions.
            </p>
            <p>
              FastBridge is the only bridge built around{" "}
              <strong>multi-source input</strong>: you add the tokens and chains
              you want to bridge from, then select the destination chain and the
              token you want to receive. FastBridge pulls from all selected
              source chains in one signed transaction. You can also swap at the
              destination, send USDC and receive HYPE on HyperEVM, for example,
              making it the only bridge that consolidates and swaps in a single
              flow.
            </p>
            <p>
              The other two features that meaningfully change the user
              experience: <strong>no token wrapping</strong> (you send and
              receive native assets throughout) and{" "}
              <strong>gas abstraction</strong> (fees are paid in stablecoins, so
              you don&apos;t need to hold native gas tokens on every source
              chain).
            </p>
          </section>

          <div className="seo-banner seo-banner--streaks">
            <div className="seo-banner__copy">
              <p className="seo-banner__eyebrow">Try FastBridge</p>
              <p className="seo-banner__title">
                Skip the multi-step bridging workflow.
              </p>
              <p className="seo-banner__body">
                Consolidate assets from any chain in one transaction.
              </p>
            </div>
            <button
              className="seo-banner__btn"
              onClick={handleBridgeClick}
              type="button"
            >
              Bridge Now
            </button>
          </div>

          <section aria-labelledby="picks-heading" id="picks">
            <h2 id="picks-heading">Our top picks</h2>
            <p>
              Four bridges that meaningfully cover the market. Each is
              non-custodial and delivers native assets. They differ on
              architecture, speed, coverage, and whether they support pulling
              from multiple source chains at once.
            </p>

            <div className="seo-picks">
              <article className="seo-pick seo-pick--featured">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">01</span>
                  <h3 className="seo-pick__name">FastBridge</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> consolidating assets from multiple
                  chains; cross-chain swaps; onboarding to new EVM L2s without
                  managing gas.
                </p>
                <figure className="seo-pick__screenshot seo-pick__screenshot--filled seo-pick__screenshot--wide">
                  <a
                    href="/landing-new/assets/branding/screenshots/anatomy-of-fastbridge@2x.png"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <img
                      alt="Anatomy of FastBridge — Swap and Bridge interface with Exact In and Exact Out"
                      decoding="async"
                      fetchPriority="high"
                      height="794"
                      sizes="(max-width: 1024px) 100vw, min(100%, 900px)"
                      src="/landing-new/assets/branding/screenshots/anatomy-of-fastbridge.png"
                      srcSet="/landing-new/assets/branding/screenshots/anatomy-of-fastbridge.png 2048w, /landing-new/assets/branding/screenshots/anatomy-of-fastbridge@2x.png 4096w"
                      width="2048"
                    />
                  </a>
                </figure>
                <p>
                  FastBridge is a unified cross-chain bridge built by Avail and
                  powered by <strong>Avail Nexus</strong>, an intent-based
                  coordination layer. It is the only bridge in this guide that
                  natively supports multi-source transactions: add the source
                  tokens and chains you want to bridge from, select the
                  destination chain and the token you want to receive, and
                  FastBridge handles the rest in one signed transaction.
                </p>
                <p>
                  FastBridge also supports <strong>cross-chain swaps</strong>,
                  you can send any token(s) and receive a different token at the
                  destination. Swaps between different tokens might show a small
                  price impact before you confirm. Transactions settle in
                  approximately <strong>10&ndash;20 seconds</strong>. No native
                  gas tokens required on any source chain, fees can be paid in
                  USDC or USDT.
                </p>
                <p>
                  FastBridge supports all major EVM chains, including Ethereum,
                  Arbitrum, Optimism, Base, Polygon, Avalanche, BNB Chain,
                  Scroll, HyperEVM, Monad, MegaETH, and Citrea.
                </p>
                <button
                  className="seo-pick__link"
                  onClick={handleBridgeClick}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  type="button"
                >
                  fastbridge.availproject.org
                </button>
              </article>

              <article className="seo-pick">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">02</span>
                  <h3 className="seo-pick__name">Across Protocol</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> fast single-asset transfers between
                  major EVM chains; deep liquidity on ETH and USDC routes.
                </p>
                <figure className="seo-pick__screenshot seo-pick__screenshot--filled seo-pick__screenshot--wide">
                  <a
                    href="/landing-new/assets/branding/screenshots/across-bridge-ui@2x.png"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <img
                      alt="Across Protocol — Bridge ETH, instantly"
                      decoding="async"
                      height="794"
                      loading="lazy"
                      sizes="(max-width: 1024px) 100vw, min(100%, 900px)"
                      src="/landing-new/assets/branding/screenshots/across-bridge-ui.png"
                      srcSet="/landing-new/assets/branding/screenshots/across-bridge-ui.png 2048w, /landing-new/assets/branding/screenshots/across-bridge-ui@2x.png 4096w"
                      width="2048"
                    />
                  </a>
                </figure>
                <p>
                  Across is a mature intent-based bridge that uses a competitive
                  relayer network to fulfil user intents. It is particularly
                  strong for ETH, WBTC, USDC, and USDT transfers between
                  Ethereum, Arbitrum, Optimism, Base, and BSC, and has expanded
                  to include Solana and Hyperliquid. Non-custodial, native asset
                  delivery, no wrapped tokens.
                </p>
                <p>
                  Each transfer is chain-to-chain: Across does not support
                  consolidating from multiple source chains in a single
                  transaction.
                </p>
                <a
                  className="seo-pick__link"
                  href="https://across.to/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  across.to
                </a>
              </article>

              <article className="seo-pick">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">03</span>
                  <h3 className="seo-pick__name">Stargate</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> broad chain coverage including
                  non-EVM networks; large native asset transfers.
                </p>
                <figure className="seo-pick__screenshot seo-pick__screenshot--filled seo-pick__screenshot--wide">
                  <a
                    href="/landing-new/assets/branding/screenshots/stargate-bridge-ui@2x.png"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <img
                      alt="Stargate logo and branding"
                      decoding="async"
                      height="794"
                      loading="lazy"
                      sizes="(max-width: 1024px) 100vw, min(100%, 900px)"
                      src="/landing-new/assets/branding/screenshots/stargate-bridge-ui.png"
                      srcSet="/landing-new/assets/branding/screenshots/stargate-bridge-ui.png 2048w, /landing-new/assets/branding/screenshots/stargate-bridge-ui@2x.png 4096w"
                      width="2048"
                    />
                  </a>
                </figure>
                <p>
                  Stargate is a composable omnichain asset bridge built on
                  LayerZero. The current version supports{" "}
                  <strong>80+ blockchains</strong>, including EVM networks,
                  Solana, and other non-EVM chains. It delivers native assets
                  (USDC, USDT, ETH, BTC, OFTs) with instant guaranteed finality,
                  typically in seconds. Non-custodial.
                </p>
                <p>
                  The UX offers multiple routing options based on speed and
                  fees, which gives flexibility but can introduce friction.
                  Stargate does not offer multi-source input, each transfer is a
                  single source-to-destination route.
                </p>
                <a
                  className="seo-pick__link"
                  href="https://stargate.finance/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  stargate.finance
                </a>
              </article>

              <article className="seo-pick">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">04</span>
                  <h3 className="seo-pick__name">deBridge</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> intent-based transfers with native
                  Solana and Tron support; solver-driven pricing.
                </p>
                <figure className="seo-pick__screenshot seo-pick__screenshot--filled seo-pick__screenshot--wide">
                  <a
                    href="/landing-new/assets/branding/screenshots/debridge-bridge-ui@2x.png"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <img
                      alt="deBridge — Bridging At Lightspeed"
                      decoding="async"
                      height="794"
                      loading="lazy"
                      sizes="(max-width: 1024px) 100vw, min(100%, 900px)"
                      src="/landing-new/assets/branding/screenshots/debridge-bridge-ui.png"
                      srcSet="/landing-new/assets/branding/screenshots/debridge-bridge-ui.png 2048w, /landing-new/assets/branding/screenshots/debridge-bridge-ui@2x.png 4096w"
                      width="2048"
                    />
                  </a>
                </figure>
                <p>
                  deBridge operates the{" "}
                  <strong>DLN (deBridge Liquidity Network)</strong>, a 0-TVL
                  intent-based execution layer where competing solvers fulfil
                  orders using their own liquidity. It supports{" "}
                  <strong>25+ chains</strong> including Ethereum, Solana, Tron,
                  BNB Chain, Arbitrum, Optimism, Polygon, Avalanche, and Base.
                  Transfers typically settle in{" "}
                  <strong>1&ndash;4 seconds</strong> with native asset delivery.
                  Fees are transparent: a flat component plus 4 bps on the
                  input. Non-custodial.
                </p>
                <p>
                  Like Across and Stargate, deBridge handles one source and one
                  destination per transaction.
                </p>
                <a
                  className="seo-pick__link"
                  href="https://debridge.finance/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  debridge.finance
                </a>
              </article>
            </div>
          </section>

          <div className="seo-banner seo-banner--streaks">
            <div className="seo-banner__copy">
              <p className="seo-banner__eyebrow">Try FastBridge</p>
              <p className="seo-banner__title">
                The only bridge with
                <br />
                <span className="seo-banner__title-line">
                  native multi-source support.
                </span>
              </p>
              <p className="seo-banner__body">
                Move and swap tokens from multiple chains in one transaction, no
                gas tokens needed.
              </p>
            </div>
            <button
              className="seo-banner__btn"
              onClick={handleBridgeClick}
              type="button"
            >
              Bridge Now
            </button>
          </div>

          <section aria-labelledby="table-heading" id="table">
            <h2 id="table-heading">Side-by-side comparison</h2>
            <p>
              The differences between these four bridges are most visible side
              by side. Multi-source input, cross-chain swaps, and gas
              abstraction are the capabilities that meaningfully separate
              FastBridge from the rest.
            </p>
            <div className="seo-table-wrap">
              <table className="seo-table--compare">
                <thead>
                  <tr>
                    <th scope="col" />
                    <th className="seo-col-highlight" scope="col">
                      FastBridge
                    </th>
                    <th scope="col">Across</th>
                    <th scope="col">Stargate</th>
                    <th scope="col">deBridge</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Architecture</td>
                    <td className="seo-col-highlight">Intent / solver</td>
                    <td>Intent / solver</td>
                    <td>Unified liquidity pools (LayerZero)</td>
                    <td>Intent / solver (0-TVL)</td>
                  </tr>
                  <tr>
                    <td>Settlement speed</td>
                    <td className="seo-col-highlight">~10&ndash;20 seconds</td>
                    <td>Seconds</td>
                    <td>Seconds</td>
                    <td>1&ndash;4 seconds</td>
                  </tr>
                  <tr>
                    <td>Multi-source input</td>
                    <td className="seo-col-highlight">
                      <span className="seo-check">&check; Native</span>
                    </td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Native asset delivery</td>
                    <td className="seo-col-highlight">
                      <span className="seo-check">&check;</span>
                    </td>
                    <td>
                      <span className="seo-check">&check;</span>
                    </td>
                    <td>
                      <span className="seo-check">&check;</span>
                    </td>
                    <td>
                      <span className="seo-check">&check;</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Gas abstraction</td>
                    <td className="seo-col-highlight">
                      <span className="seo-check">
                        &check; Pay in USDC/USDT
                      </span>
                    </td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Self-custodial</td>
                    <td className="seo-col-highlight">
                      <span className="seo-check">&check;</span>
                    </td>
                    <td>
                      <span className="seo-check">&check;</span>
                    </td>
                    <td>
                      <span className="seo-check">&check;</span>
                    </td>
                    <td>
                      <span className="seo-check">&check;</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Chain coverage</td>
                    <td className="seo-col-highlight">
                      All major EVM chains (incl. Monad, MegaETH, Citrea,
                      HyperEVM)
                    </td>
                    <td>Major EVM + Solana + Hyperliquid</td>
                    <td>80+ (EVM + non-EVM incl. Solana)</td>
                    <td>25+ (EVM + Solana + Tron)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="fees-heading" id="fees">
            <h2 id="fees-heading">Cross-chain bridge fee comparison</h2>
            <p>
              Bridge fees typically combine a <strong>protocol fee</strong> and
              a <strong>solver fee</strong> (in intent-based models). Real fees
              vary by route, direction, asset, and time of day. FastBridge shows
              the exact fee, execution gas fee, protocol fee, solver fee, and
              any price impact, in the Confirm Swap screen before you sign.
            </p>
            <div className="seo-table-wrap">
              <table className="seo-table--compare">
                <thead>
                  <tr>
                    <th scope="col">Bridge</th>
                    <th scope="col">Protocol fee</th>
                    <th scope="col">Solver fee</th>
                    <th scope="col">Model</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Stargate</td>
                    <td>~0.06%</td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                    <td>Liquidity pools</td>
                  </tr>
                  <tr>
                    <td>Across</td>
                    <td>~0.05&ndash;0.1%</td>
                    <td>~0.05&ndash;0.2%</td>
                    <td>Intents (relayers)</td>
                  </tr>
                  <tr>
                    <td>deBridge</td>
                    <td>~0.04&ndash;0.1% + flat fee</td>
                    <td>~0.1&ndash;0.3%</td>
                    <td>RFQ / market-maker</td>
                  </tr>
                  <tr className="seo-row-highlight">
                    <td>
                      <strong>FastBridge</strong>
                    </td>
                    <td>~0.05%</td>
                    <td>~0.02&ndash;0.05%</td>
                    <td>Intents (multi-source, swaps)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="choose-heading" id="choose">
            <h2 id="choose-heading">How to choose the right bridge</h2>
            <p>Pick based on the shape of your move:</p>
            <div className="seo-choices">
              <div className="seo-choice">
                <p className="seo-choice__scenario">
                  Multiple assets across chains, or onboarding to a new EVM L2.
                </p>
                <p className="seo-choice__answer">
                  <strong>FastBridge</strong> &mdash; the only native
                  multi-source option, with support for new EVM chains.
                </p>
              </div>
              <div className="seo-choice">
                <p className="seo-choice__scenario">
                  Single asset between major EVM chains, deepest liquidity.
                </p>
                <p className="seo-choice__answer">
                  <strong>Across</strong> &mdash; especially ETH and USDC on
                  Ethereum, Arbitrum, Optimism, and Base.
                </p>
              </div>
              <div className="seo-choice">
                <p className="seo-choice__scenario">
                  Non-EVM routes (Solana, Tron, and beyond).
                </p>
                <p className="seo-choice__answer">
                  <strong>Stargate</strong> for the widest footprint;{" "}
                  <strong>deBridge</strong> for Solana, Tron, or EVM.
                </p>
              </div>
              <div className="seo-choice">
                <p className="seo-choice__scenario">
                  Large stablecoin volume on a cost-sensitive route.
                </p>
                <p className="seo-choice__answer">
                  Compare quotes. FastBridge can process up to{" "}
                  <strong>$10M in a single transfer</strong>.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="how-heading" id="how">
            <h2 id="how-heading">
              How intent-based bridges work (and why they&apos;re faster)
            </h2>
            <p>
              Legacy bridges use a <strong>lock-and-mint</strong> or{" "}
              <strong>burn-and-mint</strong> flow: tokens are locked or burned
              on the source chain, a wrapped version is minted on the
              destination, and the user swaps or unwraps to get the native
              asset. This introduces intermediate tokens, multi-step
              confirmations, and settlement delays.
            </p>
            <p>
              Intent-based bridges flip the model. The user declares an outcome,{" "}
              <em>&quot;I want X USDC on chain Y&quot;</em>, and a solver
              fulfills the intent using their own liquidity on the destination
              chain, delivering native tokens in seconds. The solver is
              reimbursed on-chain after verification. FastBridge, Across, and
              deBridge all use this architecture.
            </p>

            <figure className="seo-flow">
              <img
                alt="FastBridge multi-source flow diagram showing USDT, USDC, and USDM converging through Avail Nexus into one destination in a single signature"
                decoding="async"
                height="997"
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, min(100%, 900px)"
                src="/landing-new/assets/branding/diagrams/fastbridge-multi-source-flow.png"
                srcSet="/landing-new/assets/branding/diagrams/fastbridge-multi-source-flow.png 2048w, /landing-new/assets/branding/diagrams/fastbridge-multi-source-flow@2x.png 4096w"
                width="2048"
              />
            </figure>

            <p>
              FastBridge extends the intent model further. Most intent bridges
              still resolve to one source chain per intent.{" "}
              <strong>
                FastBridge resolves a single intent across multiple source
                chains simultaneously
              </strong>
              , and can swap into a different destination token in the same
              flow.
            </p>
          </section>

          <div className="seo-banner seo-banner--streaks" id="cta">
            <div className="seo-banner__copy">
              <p className="seo-banner__eyebrow">Try FastBridge</p>
              <p className="seo-banner__title">
                Move your crypto across chains in one transaction.
              </p>
              <p className="seo-banner__body">
                Bridge and swap tokens from multiple chains to any destination
                in seconds.
              </p>
            </div>
            <button
              className="seo-banner__btn"
              onClick={handleBridgeClick}
              type="button"
            >
              Launch FastBridge
            </button>
          </div>

          <p className="seo-meta">
            Last updated: 24 April 2026 &middot; Maintained by Avail
          </p>
        </article>
      </div>

      <footer className="site-footer is-visible" id="footer">
        <div aria-hidden="true" className="site-footer__glow-wrap">
          <div className="site-footer__glow-clip">
            <img
              alt=""
              className="site-footer__glow-img site-footer__glow-img--desktop"
              height="359"
              src="/landing-new/assets/figma-export/footer-bg-desktop.png"
              width="1024"
            />
            <img
              alt=""
              className="site-footer__glow-img site-footer__glow-img--tablet"
              height="909"
              src="/landing-new/assets/figma-export/footer-bg-tablet.png"
              width="1024"
            />
            <img
              alt=""
              className="site-footer__glow-img site-footer__glow-img--mobile"
              height="1024"
              src="/landing-new/assets/figma-export/footer-bg-mobile.png"
              width="653"
            />
          </div>
        </div>

        <div className="site-footer__inner">
          <div className="site-footer__top">
            <div className="site-footer__brand">
              <Link className="site-footer__logo" to="/">
                <img
                  alt=""
                  className="site-footer__logo-icon"
                  height="40"
                  src="/landing-new/assets/branding/logos/logo-icon-white.svg"
                  width="40"
                />
                <span className="site-footer__logo-text">fastbridge</span>
              </Link>
              <p className="site-footer__desc site-footer__desc--desktop">
                Integrate FastBridge into your app with the Avail Nexus SDK and
                get a configurable widget handling multi-chain asset routing,
                gas, and settlement. Visit the docs to get started.
              </p>
              <p className="site-footer__desc site-footer__desc--compact">
                Integrate FastBridge into your app with the Avail Nexus SDK and
                get a configurable widget handling multi-chain asset routing,
                gas, and settlement.
              </p>
              <a
                className="site-footer__cta"
                href="https://docs.availproject.org/docs/nexus/get-started"
                rel="noopener noreferrer"
                target="_blank"
              >
                Integrate Now <strong aria-hidden="true">&rarr;</strong>
              </a>
              <p className="site-footer__legal site-footer__legal--desktop">
                Copyright &copy; Avail Project. All rights reserved.
              </p>
              <p className="site-footer__legal site-footer__legal--inline">
                Copyright &copy; Avail Project. All rights reserved.
              </p>
            </div>
            <nav aria-label="Footer" className="site-footer__links">
              <div className="site-footer__col">
                <span className="site-footer__col-title">Support</span>
                <a
                  href="https://docs.availproject.org/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Docs
                </a>
                <Link to="/about">About</Link>
                <Link to="/faqs">FAQs</Link>
                <Link to="/guides">Guides</Link>
                <a
                  href="https://discord.com/invite/AvailProject"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Discord
                </a>
                <a
                  href="https://github.com/availproject"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  GitHub
                </a>
                <a
                  href="https://www.availproject.org/privacy-policy"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Privacy Policy
                </a>
                <Link className="site-footer__contact" to="/contact">
                  Get in Touch
                </Link>
              </div>
              <div className="site-footer__col site-footer__col--socials">
                <span className="site-footer__col-title">Socials</span>
                <a
                  href="https://www.availproject.org/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Avail Website
                </a>
                <a
                  href="https://blog.availproject.org/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Blog
                </a>
                <a
                  href="https://x.com/AvailProject"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  X (Twitter)
                </a>
                <a
                  href="https://www.linkedin.com/company/availproject/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  LinkedIn
                </a>
                <a
                  href="https://t.me/AvailCommunity"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Telegram
                </a>
                <a
                  href="https://www.youtube.com/@AvailProject"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  YouTube
                </a>
              </div>
            </nav>
          </div>
        </div>

        <div aria-hidden="true" className="site-footer__watermark">
          <picture>
            <source
              media="(max-width: 460px)"
              srcSet="/landing-new/assets/figma-export/footer-watermark-mobile.svg"
            />
            <source
              media="(max-width: 768px)"
              srcSet="/landing-new/assets/figma-export/footer-watermark-tablet.svg"
            />
            <img
              alt=""
              className="site-footer__watermark-img"
              height="163"
              src="/landing-new/assets/figma-export/footer-watermark-desktop.svg"
              width="1240"
            />
          </picture>
        </div>
      </footer>
    </main>
  );
}
