import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "@fontsource/geist-sans";

export default function LandingPage() {
  const navigate = useNavigate();
  const [cssLoaded, setCssLoaded] = useState(false);

  const handleBridgeClick = () => {
    // Read the dynamically injected active slide slug from the vanilla DOM carousel
    const targetSlug = (window as any).__fastbridgeSelectedSlug || "megaeth";
    navigate(`/${targetSlug}`);
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
      await loadScript("/landing-scripts/pixel-overlay.js");
      await loadScript("/landing-scripts/navbar-scroll.js");
      await loadScript("/landing-scripts/carousel.js");
      await loadScript("/landing-scripts/blog-carousel.js");
      await loadScript("/landing-scripts/logo-scroll.js");
      await loadScript("/landing-scripts/faq.js");
      await loadScript("/landing-scripts/steps-scroll.js");

      // Clean up previous observer if it exists
      if ((window as any).__landingObserver) {
        (window as any).__landingObserver.disconnect();
      }

      const sections = document.querySelectorAll(
        ".chains-section, .blog-section, .faq-section, .footer"
      );
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0, rootMargin: "0px 0px 100px 0px" }
      );
      sections.forEach((s) => {
        observer.observe(s);
      });
      (window as any).__landingObserver = observer;
    };

    // Dynamically inject CSS so it doesn't leak into the SPA
    const link = document.createElement("link");
    link.href = "/landing-assets/landing2.css";
    link.rel = "stylesheet";

    link.onload = () => {
      // Run scripts only after CSS has loaded and layout is correctly established
      runScripts();
      // Paint the UI to prevent FOUC
      setCssLoaded(true);
    };

    document.head.appendChild(link);

    // Attempting cleanup where possible by hiding landing scope styles if we leave.
    document.body.classList.add("landing-page-active");
    return () => {
      document.body.classList.remove("landing-page-active");
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <div
      className="page landing-page-wrapper"
      style={{
        opacity: cssLoaded ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      {/* Hero Section */}
      <section className="hero">
        {/* Navbar */}
        <nav className="navbar">
          <div className="navbar-inner">
            <div className="nav-logo">
              <img
                alt=""
                className="nav-logo-icon"
                decoding="sync"
                fetchPriority="high"
                src="/landing-assets/fastbridge-icon.svg"
              />
              <span className="nav-logo-text">fastbridge</span>
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
        <div className="hero-bg">
          <img
            alt=""
            className="hero-bg-img"
            decoding="sync"
            fetchPriority="high"
            src="/landing-assets/hero-bg.avif"
          />
          <div id="pixel-overlay" />
        </div>

        {/* Hero Content */}
        <div className="hero-content">
          {/* Left: Text */}
          <div className="hero-text-area">
            <div className="hero-text-wrapper">
              <h1 className="hero-heading">
                Move All Your Crypto
                <br />
                In One Transaction
              </h1>
              <p className="hero-description">
                Combine your balances from multiple chains in a single move. No
                switching networks, no managing gas, no waiting. Arrive ready to
                trade.
              </p>
            </div>
            <div className="hero-buttons">
              <button
                className="btn-primary"
                onClick={handleBridgeClick}
                type="button"
              >
                Bridge Now
              </button>
              <a
                className="btn-secondary"
                href="https://elements.nexus.availproject.org/docs/components/fast-bridge"
                rel="noopener noreferrer"
                target="_blank"
              >
                Add FastBridge
              </a>
            </div>
          </div>

          {/* Right: Bridge Card */}
          <div className="bridge-card-wrapper">
            <div className="bridge-card">
              <div className="bridge-form">
                <span className="bridge-label">To</span>
                <div className="bridge-fields">
                  {/* Chain Selector */}
                  <div className="bridge-field">
                    <div className="field-left">
                      <img
                        alt="MegaETH"
                        className="token-icon"
                        src="/landing-assets/megaeth-icon.svg"
                      />
                      <span className="field-text">MegaETH</span>
                    </div>
                    <img
                      alt=""
                      className="dropdown-icon"
                      src="/landing-assets/dropdown.svg"
                    />
                  </div>
                  {/* Token Selector */}
                  <div className="bridge-field">
                    <div className="field-left">
                      <div className="musd-icon">
                        <img
                          alt=""
                          className="musd-outer"
                          src="/landing-assets/musd-icon-outer.svg"
                        />
                        <img
                          alt=""
                          className="musd-inner"
                          src="/landing-assets/musd-icon-inner.svg"
                        />
                      </div>
                      <span className="field-text">USDM</span>
                    </div>
                    <img
                      alt=""
                      className="dropdown-icon"
                      src="/landing-assets/dropdown.svg"
                    />
                  </div>
                  {/* Amount Input */}
                  <div className="bridge-field">
                    <span className="field-placeholder">0.00</span>
                  </div>
                </div>
                {/* Add Recipient */}
                <div className="add-recipient">
                  <img
                    alt=""
                    className="pencil-icon"
                    src="/landing-assets/pencil-icon.svg"
                  />
                  <span className="recipient-text">Add Recipient Address</span>
                </div>
              </div>
              <button
                className="connect-wallet-btn"
                onClick={handleBridgeClick}
                type="button"
              >
                Bridge
              </button>
              <div className="powered-by">
                <span>Powered by</span>
                <img
                  alt="Avail"
                  className="powered-by-logo"
                  src="/landing-assets/avail-logo.png"
                />
              </div>
            </div>
            {/* Dots */}
            <div className="dots">
              <div className="dot dot-active" data-slide="0" />
              <div className="dot" data-slide="1" />
              <div className="dot" data-slide="2" />
              <div className="dot" data-slide="3" />
              <div className="dot" data-slide="4" />
              <div className="dot" data-slide="5" />
              <div className="dot" data-slide="6" />
              <div className="dot" data-slide="7" />
              <div className="dot" data-slide="8" />
              <div className="dot" data-slide="9" />
              <div className="dot" data-slide="10" />
              <div className="dot" data-slide="11" />
              <div className="dot" data-slide="12" />
            </div>
          </div>
        </div>
      </section>

      {/* Supported Chains Section */}
      <section className="chains-section">
        <div className="chains-header">
          <h2 className="chains-title">Supported Chains</h2>
          <p className="chains-description">
            Aggregate and spend your stablecoins like USDC, USDT and others
            across all major EVM chains in seconds with no gas management.
          </p>
        </div>
        <div className="chains-logos">
          <div className="chains-track">
            <div className="chain-logo">
              <img alt="Ethereum" src="/landing-assets/eth-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Arbitrum" src="/landing-assets/arb-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Optimism" src="/landing-assets/op-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Avalanche" src="/landing-assets/avax-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Polygon" src="/landing-assets/polygon-logo.png" />
            </div>
            <div className="chain-logo">
              <img
                alt="Hyperliquid"
                src="/landing-assets/hyperliquid-logo.png"
              />
            </div>
            <div className="chain-logo">
              <img alt="Base" src="/landing-assets/base-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Scroll" src="/landing-assets/scroll-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Kaia" src="/landing-assets/kaia-logo.png" />
            </div>

            <div className="chain-logo">
              <img alt="MegaETH" src="/landing-assets/megaeth-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Monad" src="/landing-assets/monad-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="BNB Chain" src="/landing-assets/bnb-logo.png" />
            </div>

            <div className="chain-logo">
              <img alt="Citrea" src="/landing-assets/citrea-logo.png" />
            </div>
            {/* Duplicate for seamless scroll */}
            <div className="chain-logo">
              <img alt="Ethereum" src="/landing-assets/eth-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Arbitrum" src="/landing-assets/arb-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Optimism" src="/landing-assets/op-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Avalanche" src="/landing-assets/avax-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Polygon" src="/landing-assets/polygon-logo.png" />
            </div>
            <div className="chain-logo">
              <img
                alt="Hyperliquid"
                src="/landing-assets/hyperliquid-logo.png"
              />
            </div>
            <div className="chain-logo">
              <img alt="Base" src="/landing-assets/base-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Scroll" src="/landing-assets/scroll-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Kaia" src="/landing-assets/kaia-logo.png" />
            </div>

            <div className="chain-logo">
              <img alt="MegaETH" src="/landing-assets/megaeth-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="Monad" src="/landing-assets/monad-logo.png" />
            </div>
            <div className="chain-logo">
              <img alt="BNB Chain" src="/landing-assets/bnb-logo.png" />
            </div>

            <div className="chain-logo">
              <img alt="Citrea" src="/landing-assets/citrea-logo.png" />
            </div>
          </div>
        </div>
      </section>

      {/* How FastBridge Works */}
      <section className="how-it-works">
        <h2 className="how-it-works-title">How FastBridge Works</h2>
        <div className="steps-scroll">
          <div className="steps-track">
            {/* Step 1 */}
            <div className="step-card">
              <div className="step-card-inner">
                <div className="step-text">
                  <div className="step-header">
                    <span className="step-label">Step 1</span>
                    <h3 className="step-heading">
                      Select chain, token &amp; amount
                    </h3>
                  </div>
                  <p className="step-description">
                    Choose which chain you want to bridge to, what token you
                    want to hold, and how much you want to receive. FastBridge
                    aggregates your balances across multiple chains
                    automatically, and finds the optimal combination to fill
                    your request. No need to plan which chain your funds are
                    coming from.
                  </p>
                </div>
                <div className="step-screen">
                  <video autoPlay className="step-video" loop muted playsInline>
                    <source src="/landing-assets/flow1.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
            {/* Step 2 */}
            <div className="step-card">
              <div className="step-card-inner">
                <div className="step-text">
                  <div className="step-header">
                    <span className="step-label">Step 2</span>
                    <h3 className="step-heading">Verify your request</h3>
                  </div>
                  <p className="step-description">
                    Review how your balances will be used and how the
                    transaction will be routed. You can deselect individual
                    source chains if you want to control which balances are
                    included. FastBridge updates automatically.
                  </p>
                </div>
                <div className="step-screen">
                  <video autoPlay className="step-video" loop muted playsInline>
                    <source src="/landing-assets/flow2.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
            {/* Step 3 */}
            <div className="step-card">
              <div className="step-card-inner">
                <div className="step-text">
                  <div className="step-header">
                    <span className="step-label">Step 3</span>
                    <h3 className="step-heading">
                      One approval. Ready to trade.
                    </h3>
                  </div>
                  <p className="step-description">
                    Sign just one transaction. FastBridge's intent-based
                    execution layer routes, settles, and delivers your funds to
                    the destination in ~20 seconds and with 0 native gas needed.
                  </p>
                </div>
                <div className="step-screen">
                  <video autoPlay className="step-video" loop muted playsInline>
                    <source src="/landing-assets/flow3.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="blog-section">
        <div className="blog-header">
          <div>
            <h2 className="blog-title">Latest blog posts</h2>
            <p className="blog-subtitle">
              Discover guides, tips, and resources to inspire your next big
              idea.
            </p>
          </div>
          <a
            className="section-btn"
            href="https://blog.availproject.org/tag/fastbridge/"
            rel="noopener noreferrer"
            target="_blank"
          >
            View All Posts
          </a>
        </div>
        <div className="blog-grid">
          <a
            className="blog-card"
            href="https://blog.availproject.org/fastbridge-by-avail-the-fastest-way-to-move-crypto-from-multiple-chains/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="blog-card-image">
              <img
                alt="FastBridge by Avail"
                src="https://storage.ghost.io/c/27/aa/27aae9e1-3aa4-4c20-b62f-4fe146313235/content/images/size/w760/format/webp/2026/04/The-Multi-Chain-Bridge-That-Pulls-From-All-Your-Chains-at-Once--MK_1709---7-.png"
              />
            </div>
            <h3 className="blog-card-title">
              FastBridge by Avail: The Fastest Way to Move Crypto From Multiple
              Chains
            </h3>
            <p className="blog-card-meta">April 16, 2026 &middot; 5 min read</p>
          </a>
          <a
            className="blog-card"
            href="https://blog.availproject.org/how-to-bridge-to-monad-in-under-60-seconds/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="blog-card-image">
              <img
                alt="How to Bridge to Monad"
                src="https://storage.ghost.io/c/27/aa/27aae9e1-3aa4-4c20-b62f-4fe146313235/content/images/size/w760/format/webp/2026/04/How-to-Bridge-to-Monad-in-Under-60-Seconds--MK_1684---4--1.png"
              />
            </div>
            <h3 className="blog-card-title">
              How to Bridge to Monad in Under 60 Seconds
            </h3>
            <p className="blog-card-meta">April 6, 2026 &middot; 3 min read</p>
          </a>
          <a
            className="blog-card"
            href="https://blog.availproject.org/bridge-to-citrea-in-real-time/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="blog-card-image">
              <img
                alt="Bridge to Citrea"
                src="https://storage.ghost.io/c/27/aa/27aae9e1-3aa4-4c20-b62f-4fe146313235/content/images/size/w760/format/webp/2026/04/Bridge_to_Citrea_in_Real_Time_-MK_1685-_Option_1.jpeg"
              />
            </div>
            <h3 className="blog-card-title">Bridge to Citrea in Real Time</h3>
            <p className="blog-card-meta">April 6, 2026 &middot; 3 min read</p>
          </a>
        </div>
        <div className="blog-dots" />
        <a
          className="section-btn blog-btn-mobile"
          href="https://blog.availproject.org/tag/fastbridge/"
          rel="noopener noreferrer"
          target="_blank"
        >
          View All Posts
        </a>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="faq-header">
          <div>
            <h2 className="faq-title">Your Questions. Answered.</h2>
            <p className="faq-subtitle">
              Answers to all your questions, quickly and clearly
            </p>
          </div>
          <Link className="section-btn" to="/faqs">
            View More
          </Link>
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
                traditional bridges, you don't need to manage gas on each chain
                or bridge one chain at a time; FastBridge aggregates your
                balances so you arrive ready to trade.
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
                supported EVM chain in seconds. At the same time, FastBridge is
                also a live demonstration of what Avail Nexus is capable of,
                which is why developers can embed the same bridging experience
                directly into their own apps via the Nexus SDK. The Avail team
                continues to build secure and scalable infrastructure for the
                next generation of both applications and users through its
                products: Avail Nexus, Avail DA and now, FastBridge.
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
                transaction. Avail Nexus' protocol handles routing and
                settlement through intent-based execution, which allows users to
                pay gas in stablecoins. No need to hold native gas tokens on
                each source chain.
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
                Do I need to hold gas tokens on every chain I'm bridging from?
              </span>
            </button>
            <div className="faq-answer">
              <p>
                No. You only need the stablecoins you want to bridge. Gas fees
                are deducted directly from your stablecoin balance, so if you're
                bridging 5 USDC to Citrea, you'd pay a small additional fee in
                USDC to cover gas. No ETH, no AVAX, no native gas tokens
                required on any source chain.
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
                time can vary slightly depending on the destination chain's
                block confirmation speed, but FastBridge is designed for
                near-instant delivery compared to traditional lock-and-mint
                bridges that can take minutes to hours.
              </p>
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
        </div>
      </footer>
    </div>
  );
}
