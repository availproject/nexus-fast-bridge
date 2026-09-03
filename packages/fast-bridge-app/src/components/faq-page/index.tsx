import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// import { loadLastChain } from "@/providers/runtime-context";

const STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/button-hovers.css",
];

interface FAQItem {
  a: React.ReactNode;
  q: string;
}

interface FAQGroup {
  id: string;
  items: FAQItem[];
  num: string;
  title: string;
}

const FAQ_GROUPS: FAQGroup[] = [
  {
    id: "getting-started",
    title: "Getting started",
    num: "01",
    items: [
      {
        q: "What is Avail FastBridge?",
        a: "FastBridge is a unified cross-chain bridge that lets you move and swap tokens from multiple source chains to any supported destination chain in a single transaction. You can bridge several different assets at once and receive the token you want, on the chain you want. Unlike traditional bridges, you don't need to manage gas on each chain or bridge one chain at a time; FastBridge aggregates your balances so you arrive ready to trade.",
      },
      {
        q: "What is the relationship between Avail and FastBridge?",
        a: (
          <>
            FastBridge is built by Avail as a fully standalone bridging
            interface you can use today to move stablecoins across any supported
            EVM chain in seconds. At the same time, FastBridge is also a live
            demonstration of what Avail Nexus is capable of, which is why
            developers can embed the same bridging experience directly into
            their own apps via the FastBridge Widget or the{" "}
            <a
              href="https://docs.availproject.org/docs/nexus/get-started"
              rel="noopener noreferrer"
              target="_blank"
            >
              Nexus SDK
            </a>
            .
          </>
        ),
      },
      {
        q: "How is FastBridge different from other bridges?",
        a: "Most bridges move funds from one chain to one other chain. FastBridge aggregates your balances across multiple source chains, can swap between different tokens, and settles everything at the destination chain in a single transaction. Avail Nexus' protocol handles routing and settlement through intent-based execution, which allows users to pay gas in stablecoins. No need to hold native gas tokens on each source chain.",
      },
      {
        q: "Do I need to hold gas tokens on every chain I'm bridging from?",
        a: "No. You only need the stablecoins you want to bridge. Gas fees are deducted directly from your stablecoin balance, so if you're bridging 5 USDC to Citrea, you'd pay a small additional fee in USDC to cover gas. No ETH, no AVAX, no native gas tokens required on any source chain.",
      },
      {
        q: "Which wallets are supported?",
        a: "FastBridge supports any EVM-compatible wallet, including MetaMask, Rabby, Coinbase Wallet, and WalletConnect-compatible wallets. If your wallet works with EVM chains, it works with FastBridge.",
      },
      {
        q: "How long does a bridge transaction take?",
        a: "Most transactions settle in approx. 10–20 seconds. Settlement time can vary slightly depending on the amounts and destination chain's block confirmation speed, but FastBridge is designed for near-instant delivery compared to traditional lock-and-mint bridges that can take minutes to hours.",
      },
    ],
  },
  {
    id: "supported-chains",
    title: "Supported chains & tokens",
    num: "02",
    items: [
      {
        q: "Which chains does FastBridge support?",
        a: "FastBridge currently supports multiple EVM chains: Monad, MegaETH, Citrea, Arbitrum, Avalanche, Ethereum, Optimism, Base, Polygon, BNB, Kaia, and HyperEVM, with more chains being added regularly. You can always check the bridge interface for the current full list.",
      },
      {
        q: "Which tokens can I bridge?",
        a: "On the source side, FastBridge supports any token your wallet already holds on a supported chain (Monad, MegaETH, Citrea, Arbitrum, Avalanche, Ethereum, Optimism, Base, Polygon, BNB, Kaia, and HyperEVM). On the destination side, you can receive any token that is supported on those chains. Since you can swap as well as bridge, you can send one token and receive a different one at the destination. Stablecoin-to-stablecoin transfers settle with zero slippage, while swaps between different tokens may carry a small price impact that is always shown before you confirm.",
      },
      {
        q: "Will more chains be added?",
        a: (
          <>
            Yes. FastBridge is built on Avail Nexus, which is designed to scale
            across EVM and non-EVM chains. New integrations are added on an
            ongoing basis. Follow{" "}
            <a
              href="https://x.com/AvailProject"
              rel="noopener noreferrer"
              target="_blank"
            >
              Avail's official channels
            </a>{" "}
            for announcements.
          </>
        ),
      },
      {
        q: "Can I bridge to non-EVM chains?",
        a: "Currently FastBridge focuses on EVM-compatible chains. Support for additional chain types is on the roadmap.",
      },
      {
        q: "Is there a minimum or maximum bridge amount?",
        a: "Minimum and maximum amounts may apply per chain and token pair to ensure efficient routing and settlement. These limits are displayed in the bridge interface before you confirm a transaction.",
      },
    ],
  },
  {
    id: "fees-costs",
    title: "Fees & costs",
    num: "03",
    items: [
      {
        q: "How much does it cost to use FastBridge?",
        a: "FastBridge charges a small protocol fee on each transaction, which covers routing and settlement costs. The exact fee is displayed before you confirm and there are no hidden charges. Since gas is abstracted, you don't pay gas separately on source chains. If your transaction involves a swap between different tokens, any price impact is shown as a separate line alongside the fee, so you can see the full cost before confirming.",
      },
      {
        q: "Is there slippage on stablecoin transfers?",
        a: "Stablecoin-to-stablecoin transfers on FastBridge are processed with zero slippage, so you receive exactly the amount you specified. Swaps between different tokens (for example ETH to USDC, or several assets into one) are priced at the time of execution and may carry a small price impact, which is shown clearly before you confirm and must be approved before the transaction runs.",
      },
      {
        q: "Does the fee change based on the destination chain?",
        a: "Fees may vary slightly depending on the destination chain's settlement costs and current network conditions. The bridge interface always shows the exact fee before you confirm.",
      },
    ],
  },
  {
    id: "safety-security",
    title: "Safety & security",
    num: "04",
    items: [
      {
        q: "Is FastBridge non-custodial?",
        a: "Yes. FastBridge is fully non-custodial. Your funds are never held by a centralized party. The protocol routes and settles your transaction trustlessly without holding approvals or taking custody of your assets at any point.",
      },
      {
        q: "What happens if my transaction fails?",
        a: "If a transaction fails to settle at the destination, your funds are never lost and always remain in your control. The transaction simply reverts, and your assets stay in your wallet on the source chain, exactly where they started. You can retry the transaction immediately.",
      },
      {
        q: "Has FastBridge been audited?",
        a: (
          <>
            Security audits are conducted as part of the Avail Nexus protocol
            development. Details of completed audits are published in the{" "}
            <a
              href="https://docs.availproject.org/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Avail documentation
            </a>
            . We recommend checking the official docs for the most up-to-date
            audit reports.
          </>
        ),
      },
      {
        q: "What is Avail Nexus and why does it matter for security?",
        a: "Avail Nexus is the underlying cross-chain coordination layer that powers FastBridge. It provides unified proof verification and intent settlement across chains, meaning the security of your bridge transaction is backed by a robust, decentralized coordination layer rather than a multisig or federated validator set.",
      },
    ],
  },
  {
    id: "technical",
    title: "Technical",
    num: "05",
    items: [
      {
        q: "What is intent-based bridging?",
        a: "Intent-based bridging means you declare what you want to receive at the destination (the token, the chain, the amount) and the protocol figures out how to fulfill that intent optimally. FastBridge uses solvers that compete to fill your intent, which is what enables near-instant settlement and gas abstraction without wrapping assets or minting synthetic tokens.",
      },
      {
        q: "Can I bridge from multiple source chains in a single transaction?",
        a: "Yes. This is the core feature of FastBridge. You can consolidate balances from several chains, such as Arbitrum, Optimism, Polygon, and others simultaneously, and even combine several different tokens to receive another token of your choice at your destination chain in one transaction, rather than executing separate bridge or swap transactions for each source asset.",
      },
      {
        q: "What is intent-based bridging vs lock-and-mint bridging?",
        a: "Lock-and-mint bridges work by locking your tokens on the source chain and minting a synthetic wrapped version on the destination. This introduces counterparty risk, wrapping overhead, and often requires you to unwrap assets before using them. Intent-based bridging, which is how FastBridge works, skips all of that. You declare the token and the amount you want to receive and on which chain, and solvers compete to fulfill that intent using native assets — no wrapping, no synthetic tokens, and no waiting for lock confirmations.",
      },
      {
        q: "How do I integrate FastBridge into my dApp or protocol?",
        a: (
          <>
            FastBridge exposes integration endpoints for dApps, wallets, and
            protocols that want to offer unified bridging to their users. Visit
            the{" "}
            <a
              href="https://docs.availproject.org/docs/nexus/get-started"
              rel="noopener noreferrer"
              target="_blank"
            >
              Avail developer portal
            </a>{" "}
            to access the technical documentation and get started.
          </>
        ),
      },
      {
        q: "How do I add a cross-chain bridge to my dApp?",
        a: (
          <>
            You can integrate FastBridge directly into your dApp using the{" "}
            <a
              href="https://docs.availproject.org/docs/nexus/get-started"
              rel="noopener noreferrer"
              target="_blank"
            >
              Avail Nexus SDK
            </a>
            . It gives you a configurable bridge widget that handles multi-chain
            asset routing, gas, and settlement, all without redirecting your
            users to a third-party bridge.
          </>
        ),
      },
      {
        q: "How do I embed a bridge widget in my DeFi app?",
        a: (
          <>
            FastBridge offers an embeddable UI element that drops into your
            existing app with minimal setup. You configure the destination
            chain(s), supported tokens, and branding, and your users get a full
            cross-chain bridging experience without ever leaving your product.
            Details are in the{" "}
            <a
              href="https://docs.availproject.org/docs/nexus/get-started"
              rel="noopener noreferrer"
              target="_blank"
            >
              Avail Nexus SDK documentation
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    id: "guides",
    title: "Guides & how-tos",
    num: "06",
    items: [
      {
        q: "What is the fastest way to bridge USDC to Monad?",
        a: "FastBridge is the fastest way to move USDC to Monad from multiple chains in one go, with average settlement times of ~10–20 seconds. You can bridge from any supported source chain — Ethereum, Arbitrum, Avalanche, and others — without managing gas on each network separately.",
      },
      {
        q: "How do I avoid losing money to slippage when bridging stablecoins?",
        a: "Slippage on stablecoin bridges typically happens when the bridge uses liquidity pools with variable pricing. For stablecoin-to-stablecoin transfers, FastBridge is designed for zero slippage; you receive exactly the amount you specified, not an estimate, because these routes don't swap through AMM pools. If you instead swap into a different token, a small price impact may apply, but FastBridge shows it clearly before you confirm and must be approved before the transaction runs.",
      },
      {
        q: "How do I bridge crypto without paying gas on every chain?",
        a: "With FastBridge, you don't need to hold native gas tokens like ETH or AVAX on your source chains. Gas fees are paid in the stablecoin you're bridging — a small amount is added on top of the transfer — so you only need USDC or USDT in your wallet to get started.",
      },
      {
        q: "What is gasless crypto bridging?",
        a: "Gasless bridging refers to bridge experiences where users don't need to hold native gas tokens on each chain they're bridging from. In FastBridge, gas is paid in stablecoins (USDC/USDT) as a small fee added to your transaction, rather than requiring you to hold ETH or POL or AVAX, or any other native token on your source chains.",
      },
    ],
  },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "getting-started", label: "Getting started" },
  { id: "supported-chains", label: "Supported chains & tokens" },
  { id: "fees-costs", label: "Fees & costs" },
  { id: "safety-security", label: "Safety & security" },
  { id: "technical", label: "Technical" },
  { id: "guides", label: "Guides & how-tos" },
];

export default function FAQPage() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [openFaqKey, setOpenFaqKey] = useState<string | null>(
    "getting-started-0"
  );

  const handleBridgeClick = () => {
    // const lastChain = loadLastChain();
    // navigate(`/${lastChain}`);
    navigate("/app");
  };

  useEffect(() => {
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

  return (
    <main className="page faq-page">
      {/* Header banner */}
      <section aria-labelledby="faq-page-title" className="page-hero">
        <img
          alt=""
          aria-hidden="true"
          className="page-hero__media"
          height="646"
          src="/landing-new/assets/figma-export/faq-header.jpg"
          width="1920"
        />

        <header className="page-hero__nav">
          <Link className="hero__logo" to="/">
            <img
              alt=""
              className="hero__logo-icon"
              height="40"
              src="/landing-new/assets/figma-hero/logo-icon-white.svg"
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
          <h1 className="page-hero__title" id="faq-page-title">
            All your questions, answered
          </h1>
          <p className="page-hero__subtitle">
            Everything you need to know about moving crypto across chains with
            FastBridge.
          </p>
          <div className="page-hero__actions">
            <a
              className="page-hero__social"
              href="https://discord.com/invite/AvailProject"
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                fill="currentColor"
                height="20"
                viewBox="0 0 24 24"
                width="20"
              >
                <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.21.375-.444.88-.608 1.283a18.27 18.27 0 0 0-5.487 0A12.6 12.6 0 0 0 9.18 3 19.74 19.74 0 0 0 4.745 4.37C1.943 8.55 1.18 12.62 1.56 16.64a19.94 19.94 0 0 0 6.06 3.06c.49-.67.927-1.38 1.304-2.13-.717-.27-1.4-.604-2.045-.997.171-.126.34-.258.5-.394 3.94 1.84 8.2 1.84 12.094 0 .163.14.332.272.5.394-.647.394-1.332.728-2.05.998.378.75.815 1.46 1.305 2.13a19.9 19.9 0 0 0 6.063-3.06c.444-4.66-.764-8.69-3.24-12.27zM8.02 14.17c-1.18 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42zm7.96 0c-1.18 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42z" />
              </svg>
              Join Discord
            </a>
            <a
              className="page-hero__social"
              href="https://t.me/AvailCommunity"
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                fill="currentColor"
                height="20"
                viewBox="0 0 24 24"
                width="20"
              >
                <path d="M23.07 3.36 19.6 19.73c-.26 1.15-.95 1.44-1.93.9l-5.33-3.93-2.57 2.47c-.28.28-.52.52-1.07.52l.38-5.43 9.88-8.93c.43-.38-.09-.6-.67-.22L5.7 13.14.27 11.44c-1.18-.37-1.2-1.18.25-1.75L21.55 1.6c.98-.37 1.84.22 1.52 1.76z" />
              </svg>
              Join Telegram
            </a>
          </div>
        </div>
      </section>

      {/* FAQ list */}
      <section
        aria-label="Frequently asked questions"
        className="faq-page__list"
        id="faq"
      >
        <div
          aria-label="Filter FAQs by topic"
          className="faq-filters"
          role="tablist"
        >
          {FILTERS.map((f) => {
            const active = selectedFilter === f.id;
            return (
              <button
                aria-selected={active}
                className={`faq-filter ${active ? "faq-filter--active" : ""}`}
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                role="tab"
                type="button"
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="faq-groups">
          {FAQ_GROUPS.map((group) => {
            const isVisible =
              selectedFilter === "all" || selectedFilter === group.id;
            if (!isVisible) {
              return null;
            }
            return (
              <section
                aria-labelledby={`faq-group-${group.id}`}
                className="faq-group"
                key={group.id}
              >
                <h2 className="faq-group__title" id={`faq-group-${group.id}`}>
                  {group.title}
                </h2>
                <div className="faq__list">
                  {group.items.map((item, itemIdx) => {
                    const faqKey = `${group.id}-${itemIdx}`;
                    const open = openFaqKey === faqKey;
                    return (
                      <article
                        className={`faq-item ${open ? "faq-item--open" : ""}`}
                        key={faqKey}
                      >
                        <button
                          aria-controls={`faq-answer-${faqKey}`}
                          aria-expanded={open}
                          className="faq-item__question"
                          id={`faq-question-${faqKey}`}
                          onClick={() => setOpenFaqKey(open ? null : faqKey)}
                          type="button"
                        >
                          <svg
                            aria-hidden="true"
                            className="faq-item__chevron"
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
                          <span>{item.q}</span>
                        </button>
                        <section
                          aria-labelledby={`faq-question-${faqKey}`}
                          className="faq-item__answer"
                          id={`faq-answer-${faqKey}`}
                          style={{ display: open ? "block" : "none" }}
                        >
                          <p>{item.a}</p>
                        </section>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {/* Footer */}
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
                  src="/landing-new/assets/figma-hero/logo-icon-white.svg"
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
                Integrate Now <strong aria-hidden="true">→</strong>
              </a>

              <p className="site-footer__legal site-footer__legal--desktop">
                Copyright © Avail Project. All rights reserved.
              </p>
              <p className="site-footer__legal site-footer__legal--inline">
                Copyright © Avail Project. All rights reserved.
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
                  href="https://avail-project.notion.site/Privacy-Policy-e5f47df2f3a64055a7966bbaabe9a2eb"
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
                  href="https://blog.availproject.org/tag/fastbridge/"
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
