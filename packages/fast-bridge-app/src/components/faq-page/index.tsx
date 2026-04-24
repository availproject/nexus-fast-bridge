import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function FAQPage() {
  const [cssLoaded, setCssLoaded] = useState(false);
  const navigate = useNavigate();

  const handleBridgeClick = () => {
    navigate("/");
  };

  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise((resolve) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          existingScript.remove();
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(true);
        document.body.appendChild(script);
      });
    };

    const runScripts = async () => {
      await loadScript("/landing-scripts/faq.js");
      await loadScript("/landing-scripts/faqs-page.js");

      const sections = document.querySelectorAll(".footer");
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target);
            }
          }
        },
        { threshold: 0, rootMargin: "0px 0px 100px 0px" }
      );
      for (const s of sections) {
        observer.observe(s);
      }
      const globalWindow = window as unknown as {
        __faqsObserver?: IntersectionObserver;
      };
      globalWindow.__faqsObserver = observer;
    };

    const link1 = document.createElement("link");
    link1.href = "/landing-assets/landing2.css";
    link1.rel = "stylesheet";

    const link2 = document.createElement("link");
    link2.href = "/landing-assets/faqs.css";
    link2.rel = "stylesheet";

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        runScripts();
        setCssLoaded(true);
      }
    };

    link1.onload = checkLoaded;
    link2.onload = checkLoaded;

    document.head.appendChild(link1);
    document.head.appendChild(link2);

    document.body.classList.add("landing-page-active");

    return () => {
      document.body.classList.remove("landing-page-active");
      if (document.head.contains(link1)) {
        document.head.removeChild(link1);
      }
      if (document.head.contains(link2)) {
        document.head.removeChild(link2);
      }
      const globalWindow = window as unknown as {
        __faqsObserver?: IntersectionObserver;
      };
      if (globalWindow.__faqsObserver) {
        globalWindow.__faqsObserver.disconnect();
      }
    };
  }, []);

  return (
    <div
      className="page faqs-page-wrapper"
      style={{
        opacity: cssLoaded ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      {/* FAQ Hero */}
      <section className="faqs-hero">
        <div className="faqs-hero-bg">
          {/* biome-ignore lint/correctness/useImageSize: External landing page image styling */}
          <img
            alt=""
            className="faqs-hero-bg-img"
            src="/landing-assets/faqs-hero-bg.png"
          />
        </div>
        {/* Navbar */}
        <nav className="navbar navbar--dark-page">
          <div className="navbar-inner">
            <div className="nav-logo">
              <Link className="nav-logo-link" to="/">
                {/* biome-ignore lint/correctness/useImageSize: Navbar icon sizing handled by CSS */}
                <img
                  alt=""
                  className="nav-logo-icon"
                  src="/landing-assets/fastbridge-icon.svg"
                />
                <span className="nav-logo-text">fastbridge</span>
              </Link>
            </div>
            <button
              className="btn-primary nav-btn"
              onClick={handleBridgeClick}
              type="button"
            >
              Bridge Now
            </button>
          </div>
        </nav>
        <div className="faqs-hero-inner">
          <h1 className="faqs-hero-heading">
            Frequently Asked
            <br />
            Questions
          </h1>
          <p className="faqs-hero-description">
            Everything you need to know about FastBridge. Can&apos;t find the
            answer you&apos;re looking for?
          </p>
          <div className="faqs-hero-buttons">
            <a
              className="btn-secondary faqs-hero-btn"
              href="https://discord.com/invite/AvailProject"
              rel="noopener noreferrer"
              target="_blank"
            >
              Join Discord
            </a>
            <a
              className="btn-secondary faqs-hero-btn"
              href="https://t.me/AvailCommunity"
              rel="noopener noreferrer"
              target="_blank"
            >
              Join Telegram
            </a>
          </div>
        </div>
      </section>

      {/* Category Nav */}
      <div className="faqs-nav-wrapper">
        <nav className="faqs-nav">
          <a
            className="faqs-nav-item faqs-nav-item--active"
            data-category="getting-started"
            href="#getting-started"
          >
            Getting Started
          </a>
          <a
            className="faqs-nav-item"
            data-category="chains-tokens"
            href="#chains-tokens"
          >
            Chains &amp; Tokens
          </a>
          <a
            className="faqs-nav-item"
            data-category="fees-costs"
            href="#fees-costs"
          >
            Fees &amp; Costs
          </a>
          <a
            className="faqs-nav-item"
            data-category="safety-security"
            href="#safety-security"
          >
            Safety &amp; Security
          </a>
          <a
            className="faqs-nav-item"
            data-category="technical"
            href="#technical"
          >
            Technical
          </a>
          <a
            className="faqs-nav-item"
            data-category="seo-focused"
            href="#seo-focused"
          >
            Common Scenarios
          </a>
        </nav>
      </div>

      {/* FAQ Categories */}
      <section className="faqs-content">
        {/* Getting Started */}
        <div
          className="faqs-category"
          data-category="getting-started"
          id="getting-started"
        >
          <div className="faqs-category-header">
            <span className="faqs-category-number">01</span>
            <h2 className="faqs-category-title">Getting Started</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item faq-item--open">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>What is Avail FastBridge?</span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge is a unified cross-chain bridge that lets you move
                  stablecoins and tokens from multiple source chains to any
                  supported destination chain in a single transaction. Unlike
                  traditional bridges, you don&apos;t need to manage gas on each
                  chain or bridge one chain at a time; FastBridge aggregates
                  your balances so you arrive ready to trade.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  What is the relationship between Avail and FastBridge?
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge is built by Avail as a fully standalone bridging
                  interface you can use today to move stablecoins across any
                  supported EVM chain in seconds. At the same time, FastBridge
                  is also a live demonstration of what Avail Nexus is capable
                  of, which is why developers can embed the same bridging
                  experience directly into their own apps via the Nexus SDK. The
                  Avail team continues to build secure and scalable
                  infrastructure for the next generation of both applications
                  and users through its products: Avail Nexus, Avail DA and now,
                  FastBridge.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>How is FastBridge different from other bridges?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Most bridges move funds from one chain to one other chain.
                  FastBridge aggregates your balances across multiple source
                  chains and settles them at the destination chain in a single
                  transaction. Avail Nexus&apos; protocol handles routing and
                  settlement through intent-based execution, which allows users
                  to pay gas in stablecoins. No need to hold native gas tokens
                  on each source chain.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  Do I need to hold gas tokens on every chain I&apos;m bridging
                  from?
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  No. You only need the stablecoins you want to bridge. Gas fees
                  are deducted directly from your stablecoin balance, so if
                  you&apos;re bridging 5 USDC to Citrea, you&apos;d pay a small
                  additional fee in USDC to cover gas. No ETH, no AVAX, no
                  native gas tokens required on any source chain.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Which wallets are supported?</span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge supports any EVM-compatible wallet, including
                  MetaMask, Rabby, Coinbase Wallet, and WalletConnect-compatible
                  wallets. If your wallet works with EVM chains, it works with
                  FastBridge.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>How long does a bridge transaction take?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Most transactions settle in approx. 10-20 seconds. Settlement
                  time can vary slightly depending on the destination
                  chain&apos;s block confirmation speed, but FastBridge is
                  designed for near-instant delivery compared to traditional
                  lock-and-mint bridges that can take minutes to hours.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Chains & Tokens */}
        <div
          className="faqs-category"
          data-category="chains-tokens"
          id="chains-tokens"
        >
          <div className="faqs-category-header">
            <span className="faqs-category-number">02</span>
            <h2 className="faqs-category-title">
              Supported Chains &amp; Tokens
            </h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Which chains does FastBridge support?</span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge currently supports multiple EVM chains: Monad,
                  MegaETH, Citrea, Arbitrum, Avalanche, Ethereum, Optimism,
                  Base, Scroll, Polygon, BNB, Kaia, and HyperEVM, with more
                  chains being added regularly. You can always check the bridge
                  interface for the current full list.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Which tokens can I bridge?</span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge supports USDC, USDT, USDM, ETH, and selected native
                  assets such as POL, MON, HYPE, KAIA, and BNB. The available
                  tokens vary slightly by destination chain. Stablecoins are the
                  primary focus, with zero slippage guaranteed on stablecoin
                  transfers.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Will more chains be added?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Yes. FastBridge is built on Avail Nexus, which is designed to
                  scale across EVM and non-EVM chains. New integrations are
                  added on an ongoing basis. Follow Avail&apos;s official
                  channels for announcements.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Can I bridge to non-EVM chains?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Currently FastBridge focuses on EVM-compatible chains. Support
                  for additional chain types is on the roadmap.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Is there a minimum or maximum bridge amount?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Minimum and maximum amounts may apply per chain and token pair
                  to ensure efficient routing and settlement. These limits are
                  displayed in the bridge interface before you confirm a
                  transaction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fees & Costs */}
        <div
          className="faqs-category"
          data-category="fees-costs"
          id="fees-costs"
        >
          <div className="faqs-category-header">
            <span className="faqs-category-number">03</span>
            <h2 className="faqs-category-title">Fees &amp; Costs</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>How much does it cost to use FastBridge?</span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge charges a small protocol fee on each transaction,
                  which covers routing and settlement costs. The exact fee is
                  displayed before you confirm and there are no hidden charges.
                  Since gas is abstracted, you don&apos;t pay gas separately on
                  source chains.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Is there slippage on stablecoin transfers?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Most stablecoin-to-stablecoin transfers on FastBridge are
                  processed with zero slippage. However, for higher amounts and
                  certain routes, there may be some slippage which is presented
                  to the user and must be approved before execution.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Does the fee change based on the destination chain?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Fees may vary slightly depending on the destination
                  chain&apos;s settlement costs and current network conditions.
                  The bridge interface always shows the exact fee before you
                  confirm.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Security */}
        <div
          className="faqs-category"
          data-category="safety-security"
          id="safety-security"
        >
          <div className="faqs-category-header">
            <span className="faqs-category-number">04</span>
            <h2 className="faqs-category-title">Safety &amp; Security</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Is FastBridge non-custodial?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Yes. FastBridge is fully non-custodial. Your funds are never
                  held by a centralized party. The protocol routes and settles
                  your transaction trustlessly without holding approvals or
                  taking custody of your assets at any point.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>What happens if my transaction fails?</span>
              </button>
              <div className="faq-answer">
                <p>
                  If a transaction fails to settle at the destination, your
                  funds are never lost and always remain in your control. The
                  transaction simply reverts, and your assets stay in your
                  wallet on the source chain, exactly where they started. You
                  can retry the transaction immediately.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Has FastBridge been audited?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Security audits are conducted as part of the Avail Nexus
                  protocol development. Details of completed audits are
                  published in the Avail documentation. We recommend checking
                  the official docs for the most up-to-date audit reports.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  What is Avail Nexus and why does it matter for security?
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  Avail Nexus is the underlying cross-chain coordination layer
                  that powers FastBridge. It provides unified proof verification
                  and intent settlement across chains, meaning the security of
                  your bridge transaction is backed by a robust, decentralized
                  coordination layer rather than a multisig or federated
                  validator set.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical */}
        <div className="faqs-category" data-category="technical" id="technical">
          <div className="faqs-category-header">
            <span className="faqs-category-number">05</span>
            <h2 className="faqs-category-title">Technical</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>What is intent-based bridging?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Intent-based bridging means you declare what you want to
                  receive at the destination (the token, the chain, the amount)
                  and the protocol figures out how to fulfill that intent
                  optimally. FastBridge uses solvers that compete to fill your
                  intent, which is what enables near-instant settlement and gas
                  abstraction without wrapping assets or minting synthetic
                  tokens.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  Can I bridge from multiple source chains in a single
                  transaction?
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  Yes. This is the core feature of FastBridge. You can
                  consolidate balances from several chains, such as Arbitrum,
                  Optimism, Polygon, and other chains simultaneously, and
                  receive the combined amount at your destination chain in one
                  transaction rather than executing separate bridge transactions
                  for each source chain.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  What is intent-based bridging vs lock-and-mint bridging?
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  Lock-and-mint bridges work by locking your tokens on the
                  source chain and minting a synthetic wrapped version on the
                  destination. This introduces counterparty risk, wrapping
                  overhead, and often requires you to unwrap assets before using
                  them. Intent-based bridging, which is how FastBridge works,
                  skips all of that. You declare the token and the amount you
                  want to receive and on which chain and solvers compete to
                  fulfill that intent using native assets, no wrapping, no
                  synthetic tokens, and no waiting for lock confirmations.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  How do I integrate FastBridge into my dApp or protocol?
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge exposes integration endpoints for dApps, wallets,
                  and protocols that want to offer unified bridging to their
                  users. Visit the{" "}
                  <a
                    className="faqs-link"
                    href="https://docs.availproject.org/docs/nexus/get-started"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Avail developer portal
                  </a>{" "}
                  to access the technical documentation and get started.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>How do I add a cross-chain bridge to my dApp?</span>
              </button>
              <div className="faq-answer">
                <p>
                  You can integrate FastBridge directly into your dApp using the
                  Avail Nexus SDK. It gives you a configurable bridge widget
                  that handles multi-chain asset routing, gas, and settlement,
                  all without redirecting your users to a third-party bridge.
                  Visit the{" "}
                  <a
                    className="faqs-link"
                    href="https://docs.availproject.org/docs/nexus/get-started"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Avail documentation
                  </a>{" "}
                  and get started.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>How do I embed a bridge widget in my DeFi app?</span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge offers an embeddable UI element that drops into
                  your existing app with minimal setup. You configure the
                  destination chain(s), supported tokens, and branding, and your
                  users get a full cross-chain bridging experience without ever
                  leaving your product. Details are in the{" "}
                  <a
                    className="faqs-link"
                    href="https://docs.availproject.org/docs/nexus/get-started"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Avail Nexus SDK documentation
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Common Scenarios (SEO-Focused) */}
        <div
          className="faqs-category"
          data-category="seo-focused"
          id="seo-focused"
        >
          <div className="faqs-category-header">
            <span className="faqs-category-number">06</span>
            <h2 className="faqs-category-title">Common Scenarios</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>What is the fastest way to bridge USDC to Monad?</span>
              </button>
              <div className="faq-answer">
                <p>
                  FastBridge is the fastest way to move USDC to Monad from
                  multiple chains in one go, with average settlement times of
                  ~10-20 seconds. You can bridge from any supported source
                  chain, Ethereum, Arbitrum, Avalanche, and others, without
                  managing gas on each network separately.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  How do I avoid losing money to slippage when bridging
                  stablecoins?
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  Slippage on stablecoin bridges typically happens when the
                  bridge uses liquidity pools with variable pricing. FastBridge
                  is designed for zero slippage on stablecoin transfers; you
                  receive exactly the amount you specified, not an estimate.
                  This is possible because FastBridge routes
                  stablecoin-to-stablecoin transfers without swapping through
                  AMM pools.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  How do I bridge crypto without paying gas on every chain?
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  With FastBridge, you don&apos;t need to hold native gas tokens
                  like ETH or AVAX on your source chains. Gas fees are paid in
                  the stablecoin you&apos;re bridging &ndash; a small amount is
                  added on top of the transfer &ndash; so you only need USDC or
                  USDT in your wallet to get started.
                </p>
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-question" type="button">
                <svg
                  aria-hidden="true"
                  className="faq-chevron"
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="#161615"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>What is gasless crypto bridging?</span>
              </button>
              <div className="faq-answer">
                <p>
                  Gasless bridging refers to bridge experiences where users
                  don&apos;t need to hold native gas tokens on each chain
                  they&apos;re bridging from. In FastBridge, gas is paid in
                  stablecoins (USDC/USDT) as a small fee added to your
                  transaction, rather than requiring you to hold ETH or POL or
                  AVAX, or any other native token on your source chains.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                {/* biome-ignore lint/correctness/useImageSize: Footer icon sizing handled by CSS */}
                <img
                  alt="Avail"
                  className="footer-logo-icon"
                  src="/landing-assets/fastbridge-icon.svg"
                />
                <span className="footer-logo-text">fastbridge</span>
              </div>
              <p className="footer-description">
                Integrate FastBridge into your app with the Avail Nexus SDK and
                get a configurable widget handling multi-chain asset routing,
                gas, and settlement. Visit the docs to get started.
              </p>
              <a
                className="btn-tertiary"
                href="https://elements.nexus.availproject.org/docs/components/fast-bridge"
                rel="noopener noreferrer"
                target="_blank"
              >
                Integrate Now &rarr;
              </a>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <span className="footer-col-title">Support</span>
                <a
                  href="https://docs.availproject.org/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Docs
                </a>
                <Link to="/faqs">FAQs</Link>
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
                  href="https://avail-project.notion.site/Privacy-Policy-e5f47df2f3a64055a7966bbaabe9a2eb"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Privacy Policy
                </a>
                <Link to="/contact">Get in Touch</Link>
              </div>
              <div className="footer-col">
                <span className="footer-col-title">Socials</span>
                <a
                  href="https://availproject.org/"
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
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">
              Copyright &copy; Avail Project. All rights reserved.
            </p>
            {/* <div className="footer-bottom-links">
              <a
                href="https://avail-project.notion.site/Privacy-Policy-e5f47df2f3a64055a7966bbaabe9a2eb"
                rel="noopener noreferrer"
                target="_blank"
              >
                Privacy Policy
              </a>
            </div> */}
          </div>
        </div>
      </footer>
    </div>
  );
}
