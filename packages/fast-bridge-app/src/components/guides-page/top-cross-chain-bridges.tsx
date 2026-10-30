import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
  { id: "table", label: "Side-by-side comparison" },
  { id: "what", label: "What is a cross-chain bridge?" },
  { id: "criteria", label: "How we picked the best bridges" },
  { id: "why", label: "Why multi-source matters" },
  { id: "picks", label: "The 8 best bridges reviewed" },
  { id: "risks", label: "Bridge risks & past hacks" },
  { id: "fees", label: "Fee comparison" },
  { id: "choose", label: "How to choose" },
  { id: "how", label: "How intent bridges work" },
];

export default function TopCrossChainBridgesPage() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>("tldr");

  const handleBridgeClick = () => {
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
    document.title =
      "Top 8 Cross-Chain Bridges in 2026: Fees, Speed & Security Compared";
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
            Top 8 Cross-Chain Bridges in 2026: Fees, Speed &amp; Security
            Compared
          </h1>
          <p className="page-hero__subtitle">
            An independent guide comparing architecture, fees, settlement speed,
            and security models across the leading crypto bridges.
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
                moving, where you&apos;re moving it, and how much risk you are
                comfortable with. Here is the short version of the top 8 crypto
                bridges:
              </p>
              <ul className="seo-tldr-list">
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    01
                  </span>
                  <span>
                    <strong>FastBridge by Avail</strong> &mdash; best for
                    consolidating assets from multiple source chains in one
                    transaction, cross-chain swaps, and zero-gas onboarding
                    across all major EVM networks.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    02
                  </span>
                  <span>
                    <strong>Across Protocol</strong> &mdash; best for fast,
                    capital-efficient single-asset transfers with deep liquidity
                    on major EVM rollups (ETH, WETH, USDC).
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    03
                  </span>
                  <span>
                    <strong>Stargate</strong> &mdash; best for broad chain
                    coverage, connecting 80+ EVM and non-EVM blockchains
                    (including Solana and Aptos) through LayerZero liquidity
                    pools.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    04
                  </span>
                  <span>
                    <strong>deBridge</strong> &mdash; best for high-speed
                    intent-based transfers with native Solana and Tron support,
                    guaranteed pricing, and a 0-TVL security model.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    05
                  </span>
                  <span>
                    <strong>Relay</strong> &mdash; best for instant rollup
                    micro-transfers, sub-3-second execution, and automatic
                    destination gas delivery.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    06
                  </span>
                  <span>
                    <strong>Circle CCTP</strong> &mdash; best for 1:1
                    zero-slippage native USDC transfers across 30+ chains via
                    official burn-and-mint infrastructure.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    07
                  </span>
                  <span>
                    <strong>Wormhole (Portal)</strong> &mdash; best for
                    heterogeneous cross-ecosystem messaging and token transfers
                    connecting EVM, Solana, Sui, and Cosmos.
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className="seo-tldr-list__rank">
                    08
                  </span>
                  <span>
                    <strong>Jumper Exchange (LI.FI)</strong> &mdash; best bridge
                    and DEX aggregator for discovering and comparing optimal
                    routes across 30+ bridging protocols.
                  </span>
                </li>
              </ul>
              <p>
                All 8 protocols differ substantially in their underlying
                verification models, speed, fee schedules, asset coverage, and
                whether they support pulling funds from multiple chains at once.
              </p>
            </div>
          </section>

          <section aria-labelledby="table-heading" id="table">
            <h2 id="table-heading">Side-by-side comparison</h2>
            <p>
              Compare the 8 leading cross-chain bridges across execution model,
              ideal use cases, settlement speed, security architecture, and fee
              structures.
            </p>
            <div className="seo-table-wrap">
              <table className="seo-table--compare">
                <thead>
                  <tr>
                    <th scope="col">Protocol</th>
                    <th scope="col">Execution Model</th>
                    <th scope="col">Best For</th>
                    <th scope="col">Speed</th>
                    <th scope="col">Security Model</th>
                    <th scope="col">Fees</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="seo-row-highlight">
                    <td>
                      <strong>FastBridge</strong> (by Avail)
                    </td>
                    <td>Intent-based / multi-source solver</td>
                    <td>
                      Consolidating assets across chains, swaps, zero-gas
                      onboarding
                    </td>
                    <td>~10&ndash;20 sec</td>
                    <td>
                      Avail Nexus verification &amp; non-custodial solvers
                      (0-TVL)
                    </td>
                    <td>~0.05% protocol + minimal solver spread</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Across Protocol</strong>
                    </td>
                    <td>Optimistic intent-based</td>
                    <td>Fast EVM-to-EVM transfers (ETH &amp; USDC)</td>
                    <td>~10 sec</td>
                    <td>UMA optimistic oracle &amp; relayer network</td>
                    <td>Relayer fee + LP spread (~0.05%&ndash;0.15%)</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Stargate</strong>
                    </td>
                    <td>Unified liquidity pools</td>
                    <td>Broad chain coverage (80+ chains) &amp; stablecoins</td>
                    <td>1&ndash;5 min</td>
                    <td>LayerZero messaging (DVNs) + pool liquidity</td>
                    <td>~0.06% protocol fee + pool rebalancing fee</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>deBridge</strong>
                    </td>
                    <td>0-TVL, intent-based (DLN)</td>
                    <td>
                      Guaranteed-rate swaps &amp; Solana/Tron-to-EVM transfers
                    </td>
                    <td>1&ndash;4 sec (Solana), 3&ndash;5 sec (EVM)</td>
                    <td>0-TVL relayer validation (no pooled funds)</td>
                    <td>~0.04% + flat tx fee (no hidden spread)</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Relay</strong>
                    </td>
                    <td>Intent-based relayer</td>
                    <td>
                      Fast micro-transfers &amp; automatic destination gas
                    </td>
                    <td>~1&ndash;3 sec</td>
                    <td>Relay oracle &amp; solver capital verification</td>
                    <td>
                      0% native bridging, $0.02 flat + 0.01%&ndash;0.15% for
                      swaps
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Circle CCTP</strong>
                    </td>
                    <td>Burn-and-mint (canonical)</td>
                    <td>
                      Zero-slippage native USDC transfers across supported
                      chains
                    </td>
                    <td>10&ndash;20 min (standard), ~10&ndash;30 sec (fast)</td>
                    <td>
                      Circle native attestation service (centralized/canonical)
                    </td>
                    <td>0% standard protocol fee (network gas only)</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Wormhole</strong>
                    </td>
                    <td>Guardian validator set &amp; messaging</td>
                    <td>
                      Multi-chain arbitrary messaging and broad ecosystem
                      bridging
                    </td>
                    <td>1&ndash;15 min</td>
                    <td>19-of-19 Guardian validator multisig</td>
                    <td>Low relayer fee + destination execution gas</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Jumper Exchange</strong>
                    </td>
                    <td>Multi-bridge &amp; DEX aggregator</td>
                    <td>
                      Finding the fastest or cheapest route across 30+ bridges
                    </td>
                    <td>Varies by route (~15 sec &ndash; 10 min)</td>
                    <td>
                      Smart contract routing layer (inherits bridge security)
                    </td>
                    <td>0.25% LI.FI fee on select routes + bridge fees</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="what-heading" id="what">
            <h2 id="what-heading">What is a cross-chain bridge?</h2>
            <p>
              A standard decentralized exchange (DEX) swaps tokens on the same
              blockchain &mdash; for example, trading ETH for USDC on Ethereum.
              A cross-chain bridge does something fundamentally different: it
              transfers value and messages between distinct, independent
              blockchains, such as moving ETH from Ethereum to Base, or USDC
              from Solana to Arbitrum.
            </p>
            <p>
              Blockchains are sovereign state machines. They operate in
              isolation with separate ledgers, consensus rules, and virtual
              machines. Ethereum has no native awareness of what happens on
              Arbitrum, Solana, or Avalanche. Without bridges, moving funds
              across ecosystems requires depositing onto a centralized exchange
              (CEX), undergoing identity checks (KYC), paying withdrawal fees,
              and waiting through exchange processing delays.
            </p>
            <p>
              Cross-chain bridges bridge this gap directly from your
              non-custodial Web3 wallet. Over the past several years, bridging
              technology has evolved through distinct generations:
            </p>
            <ul>
              <li>
                <strong>Lock-and-mint bridges:</strong> The earliest model,
                where tokens are locked in a smart contract on the source chain
                and a synthetic &quot;wrapped&quot; equivalent (e.g. wETH or
                soETH) is minted on the destination. While widely adopted
                historically, this created massive honeypots that became the
                target of major multi-hundred-million-dollar exploits.
              </li>
              <li>
                <strong>Liquidity pool bridges:</strong> Protocols maintain
                pools of native tokens on multiple chains and rebalance them as
                transfers occur. This avoids synthetic wrapped tokens but
                introduces pool rebalancing fees and slippage risks.
              </li>
              <li>
                <strong>Intent-based / solver bridges:</strong> The modern gold
                standard in 2026. Instead of locking funds in shared pools,
                users declare an intent (e.g., &quot;deliver 1,000 USDC on
                Base&quot;). Independent market makers (solvers) fill the order
                immediately with their own liquidity, delivering native tokens
                in seconds. Solvers are reimbursed on-chain after cryptographic
                verification.
              </li>
              <li>
                <strong>Multi-source bridges:</strong> The newest breakthrough
                pioneered by FastBridge. Rather than being restricted to one
                source chain, users can pull balances from multiple source
                blockchains simultaneously and consolidate them into a single
                destination asset in one signature.
              </li>
            </ul>
          </section>

          <section aria-labelledby="criteria-heading" id="criteria">
            <h2 id="criteria-heading">
              How we picked the best cross-chain bridges
            </h2>
            <p>
              To establish an objective, trustworthy ranking, we evaluated
              dozens of active cross-chain protocols, liquidity networks, and
              aggregators. Every bridge featured in this guide was evaluated
              against six core criteria:
            </p>
            <ul>
              <li>
                <strong>Security model &amp; verification mechanism:</strong>{" "}
                How cross-chain state is verified (intent solvers, optimistic
                dispute windows, canonical burn-and-mint, or validator
                multisigs), whether the protocol relies on vulnerable wrapped
                tokens, and whether user funds are exposed to shared smart
                contract liquidity pools.
              </li>
              <li>
                <strong>Transparent fee schedule:</strong> Whether the protocol
                publishes its fee structure openly, avoids predatory relayer
                spreads, and displays an upfront itemized breakdown of protocol
                fees, execution gas, and slippage before the user signs.
              </li>
              <li>
                <strong>Settlement speed &amp; finality:</strong> Real-world
                median delivery time under normal and congested network
                conditions, differentiating between sub-minute intent fills and
                longer canonical settlement windows.
              </li>
              <li>
                <strong>Chain coverage &amp; asset depth:</strong> Ecosystem
                reach across EVM Layer 1s, Layer 2 rollups, SVM/Solana, and
                non-EVM networks, as well as liquidity depth for primary assets
                (ETH, BTC, USDC, USDT) to minimize price impact.
              </li>
              <li>
                <strong>Incident history &amp; track record:</strong> Public
                transparency regarding security audits, formal verification, bug
                bounty programs, and historical handling of smart contract or
                validator vulnerabilities.
              </li>
              <li>
                <strong>User experience &amp; features:</strong> Practical
                convenience, including gas abstraction (paying fees without
                holding native gas tokens on every source chain), cross-chain
                swaps, and multi-source balance consolidation.
              </li>
            </ul>
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
            <h2 id="picks-heading">
              The 8 Best Cross-Chain Bridges in 2026 Reviewed
            </h2>
            <p>
              Below is our comprehensive, structured review of the top 8
              cross-chain bridges in 2026. Each protocol is evaluated across
              supported chains, fee schedules, settlement speed, security
              architecture, key trade-offs, and intended user persona.
            </p>

            <div className="seo-picks">
              <article className="seo-pick seo-pick--featured">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">01</span>
                  <h3 className="seo-pick__name">FastBridge</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> Consolidating assets from multiple
                  chains in one transaction, cross-chain swaps, and zero-gas EVM
                  onboarding.
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
                  coordination layer. It is the only bridge on the market with
                  native multi-source support: select assets across multiple
                  origin chains, pick your destination token, and execute the
                  entire transfer in a single signed transaction.
                </p>
                <ul>
                  <li>
                    <strong>Chains supported:</strong> All major EVM L1s and
                    L2s, including Ethereum, Arbitrum, Optimism, Base, Polygon,
                    Avalanche, BNB Chain, HyperEVM, Monad, MegaETH, and Citrea.
                  </li>
                  <li>
                    <strong>Fees:</strong> Transparent protocol fee of ~0.05%
                    plus competitive solver spread. Fees can be paid directly in
                    USDC or USDT, eliminating the need to maintain gas tokens on
                    every source chain.
                  </li>
                  <li>
                    <strong>Speed:</strong> Settle transfers in approximately
                    10&ndash;20 seconds.
                  </li>
                  <li>
                    <strong>Security model:</strong> Intent-based coordination
                    layer backed by Avail Nexus. Non-custodial independent
                    solvers fulfill orders with their own capital and receive
                    reimbursement on-chain only after cryptographic verification
                    of delivery. Zero wrapped tokens; native asset delivery.
                  </li>
                </ul>
                <p>
                  <strong>Trade-offs:</strong> Focused specifically on EVM and
                  EVM-compatible rollups. Non-EVM chains like Solana are not
                  natively supported in the current release.
                </p>
                <p>
                  <strong>Who it&apos;s for:</strong> DeFi users with fragmented
                  capital across multiple rollups who want to merge balances in
                  one click, execute destination token swaps, and onboard to new
                  L2s without holding native gas tokens.
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
                  <strong>Best for:</strong> Fast single-asset transfers between
                  major EVM chains with deep liquidity on ETH and USDC routes.
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
                  relayer network to fulfill user intents with exceptional
                  speed. It is particularly strong for high-volume routes
                  connecting Ethereum, Arbitrum, Optimism, Base, and Polygon.
                </p>
                <ul>
                  <li>
                    <strong>Chains supported:</strong> 25+ networks including
                    Ethereum, Arbitrum, Optimism, Base, Polygon, Blast, Linea,
                    ZKsync, Solana, and Hyperliquid.
                  </li>
                  <li>
                    <strong>Fees:</strong> Dynamic route-based fee comprised of
                    a minimal LP fee (~0.04%&ndash;0.10%) and relayer fee that
                    fluctuates with destination liquidity pool rebalancing
                    needs.
                  </li>
                  <li>
                    <strong>Speed:</strong> ~10 seconds median fill time on
                    major EVM corridors.
                  </li>
                  <li>
                    <strong>Security model:</strong> Optimistic verification
                    powered by UMA&apos;s Optimistic Oracle. Competing relayers
                    fill orders immediately with their own capital and are
                    reimbursed from shared single-sided liquidity pools after an
                    optimistic dispute window.
                  </li>
                </ul>
                <p>
                  <strong>Trade-offs:</strong> Operates strictly on a
                  single-chain in, single-chain out model. Liquidity is
                  concentrated in blue-chip assets (ETH, WETH, USDC, USDT),
                  offering limited depth for long-tail tokens.
                </p>
                <p>
                  <strong>Who it&apos;s for:</strong> Users moving standard
                  tokens (ETH, USDC) between high-volume EVM rollups who
                  prioritize sub-minute execution and battle-tested relayer
                  depth.
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
                  <strong>Best for:</strong> Broad chain coverage including
                  non-EVM networks and large native asset transfers.
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
                  LayerZero. It delivers native assets (USDC, USDT, ETH, BTC,
                  OFTs) with instant guaranteed finality across the largest set
                  of connected blockchains.
                </p>
                <ul>
                  <li>
                    <strong>Chains supported:</strong> 80+ blockchains across
                    EVM ecosystems, Solana, Aptos, Sei, and multiple non-EVM
                    chains.
                  </li>
                  <li>
                    <strong>Fees:</strong> Protocol fee of ~0.06% combined with
                    a pool rebalancing fee. Transfers into pools with surplus
                    liquidity receive discounts, while transfers into depleted
                    pools incur higher rebalancing costs.
                  </li>
                  <li>
                    <strong>Speed:</strong> 1 to 5 minutes, depending on the
                    block confirmation speed of the source blockchain.
                  </li>
                  <li>
                    <strong>Security model:</strong> Secured by LayerZero V2
                    messaging using Decentralized Verifier Networks (DVNs) and
                    unified liquidity pools. Transfers use Omnichain Fungible
                    Token (OFT) standards and pool reserves without custodial
                    wrapped tokens.
                  </li>
                </ul>
                <p>
                  <strong>Trade-offs:</strong> Pool-based model exposes users to
                  pool rebalancing slippage and temporary liquidity imbalances
                  on specific routes. Single-source only.
                </p>
                <p>
                  <strong>Who it&apos;s for:</strong> Users who need to move
                  stablecoins or native assets to or from non-EVM networks and
                  long-tail blockchains that smaller bridges do not support.
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
                  <strong>Best for:</strong> Intent-based transfers with native
                  Solana and Tron support and guaranteed pricing.
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
                  intent-based execution layer where competing solvers fulfill
                  orders using their own liquidity without pooled smart contract
                  risks.
                </p>
                <ul>
                  <li>
                    <strong>Chains supported:</strong> 25+ blockchains including
                    Ethereum, Solana, Tron, BNB Chain, Arbitrum, Optimism,
                    Polygon, Avalanche, and Base.
                  </li>
                  <li>
                    <strong>Fees:</strong> Flat fee component plus a transparent
                    ~0.04%&ndash;0.10% margin on the input, with zero slippage
                    on limit orders.
                  </li>
                  <li>
                    <strong>Speed:</strong> 1 to 4 seconds on Solana routes, 3
                    to 5 seconds on EVM networks.
                  </li>
                  <li>
                    <strong>Security model:</strong> 0-TVL architecture with no
                    centralized liquidity pool honeypot. Solvers assume
                    execution risk and transfer native assets directly to users;
                    validation is attested by the deBridge validator set before
                    reimbursement.
                  </li>
                </ul>
                <p>
                  <strong>Trade-offs:</strong> Single-source only. Swaps
                  requiring off-chain solver liquidity rely on active
                  market-maker depth, which can widen spreads during volatile
                  market events.
                </p>
                <p>
                  <strong>Who it&apos;s for:</strong> Active traders frequently
                  moving funds between EVM networks and Solana or Tron who
                  prioritize lightning-fast execution and strict slippage
                  guarantees.
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

              <article className="seo-pick">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">05</span>
                  <h3 className="seo-pick__name">Relay</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> Sub-second EVM rollup
                  micro-transfers, dApp embedded bridging, and automatic
                  destination gas top-ups.
                </p>
                <p>
                  Relay is a cross-chain execution and bridging engine developed
                  by Reservoir. Built primarily for consumer dApps, embedded
                  wallet payments, and rollup hopping, it focuses on eliminating
                  gas friction and delivering transfers in 1&ndash;3 seconds.
                </p>
                <ul>
                  <li>
                    <strong>Chains supported:</strong> 85+ chains, spanning
                    Ethereum, Arbitrum, Base, Optimism, Zora, Polygon, Blast,
                    Linea, Degen, and numerous emerging L3s.
                  </li>
                  <li>
                    <strong>Fees:</strong> 0% platform fee for same-token
                    bridging; $0.02 flat fee plus 0.01% for stablecoins and up
                    to 0.15% for minor token swaps, plus destination gas.
                  </li>
                  <li>
                    <strong>Speed:</strong> 1 to 3 seconds median settlement
                    time.
                  </li>
                  <li>
                    <strong>Security model:</strong> Relayer-backed intent model
                    where solvers front execution capital. The Relay oracle
                    attests to the origin deposit and destination fill before
                    the solver is reimbursed from the protocol.
                  </li>
                </ul>
                <p>
                  <strong>Trade-offs:</strong> Primarily architected for
                  low-to-medium value transfers and wallet UX; large
                  institutional transfers may experience route constraints.
                  Single-source only.
                </p>
                <p>
                  <strong>Who it&apos;s for:</strong> Users making frequent,
                  smaller transfers to new EVM rollups or L3s who don&apos;t
                  have destination gas tokens and want automatic gas top-ups.
                </p>
                <a
                  className="seo-pick__link"
                  href="https://relay.link/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  relay.link
                </a>
              </article>

              <article className="seo-pick">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">06</span>
                  <h3 className="seo-pick__name">Circle CCTP</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> Zero-slippage, 1:1 native USDC
                  transfers across EVM and non-EVM blockchains with no pool
                  liquidity risk.
                </p>
                <p>
                  Circle&apos;s Cross-Chain Transfer Protocol (CCTP) is an
                  on-chain permissionless utility that facilitates 1:1 transfers
                  of native USDC across blockchains through an official
                  burn-and-mint mechanism.
                </p>
                <ul>
                  <li>
                    <strong>Chains supported:</strong> 30+ supported chains
                    including Ethereum, Arbitrum, Base, Optimism, Polygon PoS,
                    Avalanche, Solana, Sui, and Noble (Cosmos).
                  </li>
                  <li>
                    <strong>Fees:</strong> 0% protocol fee from Circle for
                    standard bridging; users only pay source and destination
                    blockchain gas fees. Third-party fast relayers charge minor
                    convenience fees (~0.05%&ndash;0.15%).
                  </li>
                  <li>
                    <strong>Speed:</strong> Standard transfers take ~10&ndash;20
                    minutes depending on source chain block finality. Express
                    relays and solver-integrated frontends settle in seconds.
                  </li>
                  <li>
                    <strong>Security model:</strong> Native burn-and-mint
                    mechanism managed directly by Circle&apos;s attestation
                    service. USDC is permanently burned on origin and minted
                    fresh on destination. Zero pool liquidity risk, zero wrapped
                    tokens, zero slippage.
                  </li>
                </ul>
                <p>
                  <strong>Trade-offs:</strong> Strictly supports USDC; does not
                  bridge ETH, BTC, USDT, or other tokens. Standard protocol
                  transfers require waiting for full chain finality.
                </p>
                <p>
                  <strong>Who it&apos;s for:</strong> Whales, institutions, and
                  DeFi protocols moving significant quantities of USDC who
                  require absolute 1:1 capital efficiency and zero slippage.
                </p>
                <a
                  className="seo-pick__link"
                  href="https://www.circle.com/en/cross-chain-transfer-protocol"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  circle.com/cctp
                </a>
              </article>

              <article className="seo-pick">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">07</span>
                  <h3 className="seo-pick__name">Wormhole (Portal)</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> Cross-ecosystem arbitrary messaging
                  and token bridging between EVM, Solana, Cosmos, Aptos, and
                  Sui.
                </p>
                <p>
                  Wormhole is a foundational cross-chain messaging protocol
                  connecting diverse blockchain ecosystems. Portal is the
                  flagship token bridge built on Wormhole, facilitating
                  transfers of both native and wrapped assets across disparate
                  blockchain virtual machines.
                </p>
                <ul>
                  <li>
                    <strong>Chains supported:</strong> 30+ networks spanning
                    Ethereum, Solana, Arbitrum, Base, Polygon, Avalanche, BNB
                    Chain, Sui, Aptos, Near, and Algorand.
                  </li>
                  <li>
                    <strong>Fees:</strong> Nominal relayer fee plus network gas
                    fees; no high fixed protocol fee markup.
                  </li>
                  <li>
                    <strong>Speed:</strong> 1 to 15 minutes depending on the
                    consensus finality of the source blockchain.
                  </li>
                  <li>
                    <strong>Security model:</strong> 19-of-19 Guardian validator
                    set composed of major institutional node operators
                    (including Jump Crypto, Figment, and Everstake). Guardians
                    validate origin state changes and issue Verifiable Action
                    Approvals (VAAs).
                  </li>
                </ul>
                <p>
                  <strong>Trade-offs:</strong> On non-native routes, relies on
                  lock-and-mint wrapping which introduces synthetic tokens and
                  counterparty risk. User interface can feel complex compared to
                  modern intent bridges.
                </p>
                <p>
                  <strong>Who it&apos;s for:</strong> Users bridging assets
                  between ecosystems with fundamentally different architectures
                  (such as Solana, Sui, Aptos, and EVM) that lack direct intent
                  bridge connectivity.
                </p>
                <a
                  className="seo-pick__link"
                  href="https://portalbridge.com/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  portalbridge.com
                </a>
              </article>

              <article className="seo-pick">
                <div className="seo-pick__head">
                  <span className="seo-pick__rank">08</span>
                  <h3 className="seo-pick__name">Jumper Exchange (LI.FI)</h3>
                </div>
                <p className="seo-pick__tagline">
                  <strong>Best for:</strong> Bridge and DEX aggregation to
                  discover the lowest fees and fastest route across all major
                  bridge protocols.
                </p>
                <p>
                  Jumper Exchange, powered by the LI.FI liquidity aggregation
                  protocol, is a multi-chain DEX and bridge aggregator. Rather
                  than maintaining its own bridging pools, Jumper queries dozens
                  of bridges and decentralized exchanges to compute and execute
                  the optimal routing path for any token pair.
                </p>
                <ul>
                  <li>
                    <strong>Chains supported:</strong> 60+ chains including all
                    major EVM networks, Solana, and emerging Layer 2s.
                  </li>
                  <li>
                    <strong>Fees:</strong> Aggregates quotes from underlying
                    bridges. LI.FI charges an optional 0.25% integrator fee on
                    select routes in addition to underlying bridge protocol and
                    DEX swap fees.
                  </li>
                  <li>
                    <strong>Speed:</strong> Depends on the selected route;
                    ranges from ~15 seconds with intent bridges (Across,
                    deBridge) to 10+ minutes with canonical bridges.
                  </li>
                  <li>
                    <strong>Security model:</strong> Aggregation and smart
                    contract routing architecture. Inherits the underlying
                    security model of whichever bridge and DEX route is
                    selected.
                  </li>
                </ul>
                <p>
                  <strong>Trade-offs:</strong> Introduces an extra smart
                  contract interaction layer, requiring token approvals to the
                  LI.FI contract. Multiple contract layers can increase overall
                  gas overhead and vulnerability surface area.
                </p>
                <p>
                  <strong>Who it&apos;s for:</strong> Users seeking an
                  all-in-one route comparator who want to automatically find the
                  cheapest or quickest path without manually checking individual
                  bridge interfaces.
                </p>
                <a
                  className="seo-pick__link"
                  href="https://jumper.exchange/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  jumper.exchange
                </a>
              </article>
            </div>
          </section>

          <section aria-labelledby="risks-heading" id="risks">
            <h2 id="risks-heading">Cross-chain bridge risks and past hacks</h2>
            <p>
              Cross-chain bridges represent some of the highest-value attack
              surfaces in decentralized finance. Between 2021 and 2025, more
              than <strong>$2.5 billion in digital assets</strong> was lost to
              bridge exploits. Understanding the mechanics behind these
              vulnerabilities is essential for safeguarding your capital.
            </p>

            <h3>Why bridges are prime targets</h3>
            <p>
              Blockchains cannot natively verify state transitions on other
              blockchains without intermediate consensus or cryptographic
              proofs. Traditional bridges solved this by locking large sums of
              capital in smart contract &quot;vaults&quot; on one chain while
              minting wrapped tokens on another. These massive pools created
              irresistible honeypots: draining a single smart contract or
              compromising a handful of validator keys allowed hackers to make
              off with hundreds of millions of dollars in a single transaction.
            </p>

            <h3>Bridge security models &amp; vulnerability profiles</h3>
            <ul>
              <li>
                <strong>
                  Lock-and-mint / wrapped token pools (Highest risk):
                </strong>{" "}
                Requires locking assets in a shared contract to mint synthetic
                derivatives. If the vault is exploited or forged signatures are
                accepted, the synthetic tokens lose 100% of their backing and
                collapse to zero.
              </li>
              <li>
                <strong>
                  Multisig &amp; validator committees (Key compromise risk):
                </strong>{" "}
                Relies on a federated group of node operators to sign
                cross-chain messages. If attackers compromise a quorum of
                private keys (via phishing, insider threats, or server
                vulnerabilities), they can authorize fraudulent withdrawals.
              </li>
              <li>
                <strong>
                  Liquidity pools &amp; AMMs (Pool drainage &amp; rebalancing
                  risk):
                </strong>{" "}
                Uses paired token pools on each side of the bridge. While
                avoiding synthetic wrapped assets, these designs remain
                vulnerable to smart contract bugs, pool drainage, and high
                slippage during volatile market events.
              </li>
              <li>
                <strong>
                  Intent-based / solver networks (0-TVL &mdash; lowest systemic
                  risk):
                </strong>{" "}
                Private solvers front their own liquidity to fulfill user
                intents and are reimbursed on-chain only after proof of
                delivery. Because there is no large centralized pool of user
                funds locked up, there is no honeypot to drain. If a solver
                fails to deliver, the user retains or recovers their original
                capital.
              </li>
              <li>
                <strong>Canonical burn-and-mint (Issuer attestation):</strong>{" "}
                Utilized by native asset issuers like Circle (CCTP). Eliminates
                wrapped tokens and liquidity pools by destroying tokens on the
                source chain and minting authentic native tokens on the
                destination. The primary consideration is reliance on the
                issuer&apos;s centralized attestation service.
              </li>
            </ul>

            <h3>Notable historical bridge exploits</h3>
            <p>
              A review of the largest exploits in crypto history highlights how
              specific architectural flaws were weaponized:
            </p>
            <div className="seo-table-wrap">
              <table className="seo-table--compare">
                <thead>
                  <tr>
                    <th scope="col">Protocol</th>
                    <th scope="col">Date</th>
                    <th scope="col">Amount Lost</th>
                    <th scope="col">Root Cause</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Ronin Bridge</strong>
                    </td>
                    <td>March 2022</td>
                    <td>~$624 million</td>
                    <td>
                      Compromised validator keys. Attackers gained control of 5
                      out of 9 validator private keys through spear-phishing,
                      allowing unauthorized withdrawals.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Wormhole Portal</strong>
                    </td>
                    <td>February 2022</td>
                    <td>~$325 million</td>
                    <td>
                      Smart contract signature verification bypass. A flaw in
                      the Solana contract allowed the attacker to forge a
                      validator signature and mint 120,000 unbacked wETH.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Nomad Bridge</strong>
                    </td>
                    <td>August 2022</td>
                    <td>~$190 million</td>
                    <td>
                      Improper initialization. A contract upgrade set the
                      trusted root to 0x00, causing all messages to be
                      auto-approved and enabling copy-paste public looting.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Harmony Horizon</strong>
                    </td>
                    <td>June 2022</td>
                    <td>~$100 million</td>
                    <td>
                      Multisig key compromise. Attackers breached 2 out of 5
                      signing keys securing the bridge, draining multiple asset
                      pools.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>LI.FI Routing Contract</strong>
                    </td>
                    <td>July 2024</td>
                    <td>~$11.6 million</td>
                    <td>
                      Smart contract facet vulnerability. An unvalidated call in
                      a newly deployed facet allowed draining tokens from
                      wallets with active infinite approvals.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Best practices for safe cross-chain bridging</h3>
            <ul>
              <li>
                <strong>Prefer intent-based or 0-TVL bridges:</strong> Choose
                protocols like FastBridge, Across, or deBridge where liquidity
                is supplied by solvers rather than pooled in vulnerable vaults.
              </li>
              <li>
                <strong>Bridge native assets:</strong> Avoid holding synthetic
                wrapped tokens (like wETH or any proprietary bridge tokens) that
                carry unbacked de-pegging risk if an exploit occurs.
              </li>
              <li>
                <strong>Revoke infinite token allowances:</strong> Never keep
                unlimited ERC-20 spending allowances open. Use tools like
                revoke.cash to revoke token permissions after completing your
                bridge transaction.
              </li>
              <li>
                <strong>Verify official URLs:</strong> Phishing frontends
                frequently replicate bridge UIs. Always verify URLs and bookmark
                reputable entry points.
              </li>
            </ul>
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
                  <tr className="seo-row-highlight">
                    <td>
                      <strong>FastBridge</strong>
                    </td>
                    <td>~0.05%</td>
                    <td>~0.02&ndash;0.05%</td>
                    <td>Intents (multi-source, swaps)</td>
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
                  <tr>
                    <td>Relay</td>
                    <td>0% native, $0.02 flat</td>
                    <td>0.01%&ndash;0.15% (swaps)</td>
                    <td>Intents (solvers)</td>
                  </tr>
                  <tr>
                    <td>Stargate</td>
                    <td>~0.06%</td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                    <td>Liquidity pools + rebalance fee</td>
                  </tr>
                  <tr>
                    <td>Circle CCTP</td>
                    <td>0% protocol fee</td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                    <td>Burn-and-mint (gas only)</td>
                  </tr>
                  <tr>
                    <td>Wormhole</td>
                    <td>Nominal relayer fee</td>
                    <td>
                      <span className="seo-cross">&mdash;</span>
                    </td>
                    <td>Guardian messaging multisig</td>
                  </tr>
                  <tr>
                    <td>Jumper (LI.FI)</td>
                    <td>0.25% (select routes)</td>
                    <td>Underlying route dependent</td>
                    <td>DEX &amp; bridge aggregator</td>
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
                  multi-source option, with support for new EVM chains and
                  zero-gas onboarding.
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
                  Sub-second rollup transfers with gas top-ups.
                </p>
                <p className="seo-choice__answer">
                  <strong>Relay</strong> &mdash; ideal for micro-transfers and
                  dApps where you lack native destination gas.
                </p>
              </div>
              <div className="seo-choice">
                <p className="seo-choice__scenario">
                  Large native USDC transfers with zero slippage.
                </p>
                <p className="seo-choice__answer">
                  <strong>Circle CCTP</strong> &mdash; official 1:1
                  burn-and-mint settlement across 30+ chains.
                </p>
              </div>
              <div className="seo-choice">
                <p className="seo-choice__scenario">
                  Comparing routes across multiple bridges automatically.
                </p>
                <p className="seo-choice__answer">
                  <strong>Jumper Exchange</strong> &mdash; aggregates 30+
                  bridges and DEXs to find the optimal path.
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
                href="https://widgets.availproject.org/docs/components/swaps"
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
                  href="https://x.com/FastBridgeApp"
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
