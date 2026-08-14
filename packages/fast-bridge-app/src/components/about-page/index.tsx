import { useEffect } from "react";
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

export default function AboutPage() {
  const navigate = useNavigate();

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
            FastBridge
          </h1>
          <p className="page-hero__subtitle">
            A unified cross-chain bridge built by Avail. Move and swap tokens
            from multiple chains to any supported destination, in a single
            transaction. No switching networks, no managing gas, no waiting.
          </p>
        </div>
      </section>

      <div className="seo-layout">
        <article className="seo-content">
          <p>
            <strong>FastBridge</strong> is a unified cross-chain bridge that
            lets you move and swap tokens from multiple source chains to any
            supported destination chain in a single transaction. You can bridge
            several different assets at once and receive the token you want, on
            the chain you want. Unlike traditional bridges, you don&apos;t need
            to manage gas on each chain or bridge one chain at a time.
            FastBridge aggregates your balances so you arrive ready to trade.
          </p>

          <aside className="seo-callout">
            <p>
              FastBridge is built by Avail as a fully standalone bridging
              interface you can use today to move tokens across any supported
              EVM chain in seconds. It is also a live demonstration of what{" "}
              <a
                href="https://docs.availproject.org/docs/nexus"
                rel="noopener noreferrer"
                target="_blank"
              >
                Avail Nexus
              </a>{" "}
              is capable of, which is why developers can embed the same bridging
              experience directly into their own apps via the{" "}
              <a
                href="https://widgets.availproject.org/docs/components/swaps"
                rel="noopener noreferrer"
                target="_blank"
              >
                FastBridge Widget
              </a>{" "}
              or the{" "}
              <a
                href="https://docs.availproject.org/docs/nexus/get-started"
                rel="noopener noreferrer"
                target="_blank"
              >
                Nexus SDK
              </a>
              .
            </p>
          </aside>

          <div className="seo-banner">
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

          <h2>Overview</h2>
          <p>
            FastBridge is a unified cross-chain bridge, powered by Avail, that
            allows users to move multiple tokens from multiple chains in a
            single transaction. Instead of bridging assets one chain at a time,
            FastBridge aggregates your balances across chains and delivers them
            to any destination in seconds, consolidated and ready to use.
          </p>

          <p>
            FastBridge supports all tokens on all supported chains. Because it
            supports swaps as well as transfers, you can send one token and
            receive a completely different one at the destination, for example,
            sending ETH, USDT, and USDm from separate chains and arriving on
            HyperEVM holding HYPE.{" "}
            <strong>
              Stablecoin-to-stablecoin transfers settle with zero slippage
            </strong>
            , you receive exactly the amount specified. Swaps between different
            tokens may carry a small price impact, which is always shown clearly
            before you confirm and must be approved before the transaction runs.
          </p>

          <p>
            Gas fees are deducted directly from your stablecoin balance, a small
            amount added on top of the transfer, so you only need USDC or USDT
            in your wallet to get started. No ETH, no AVAX, no native gas tokens
            required on any source chain.
          </p>

          <p>
            Settlement happens through a solver-fronted liquidity model: solvers
            compete to fill your intent on the destination chain immediately and
            are reimbursed from the source-chain vaults after on-chain
            verification. Most transactions settle in approximately 10&ndash;20
            seconds.
          </p>

          <h2>How it works</h2>
          <p>
            FastBridge uses intent-based bridging: you declare exactly which
            assets and amounts you&apos;re sending from your source chains, and
            the protocol determines the best way to deliver them to your chosen
            destination token and chain. Solvers compete to fill that intent
            using native assets, with no wrapping and no synthetic tokens.
          </p>
          <p>The interface presents the flow as three steps.</p>

          <div className="seo-steps">
            <div className="seo-step">
              <span aria-hidden="true" className="seo-step-num">
                01
              </span>
              <div className="seo-step__body">
                <h3>Select Token, Chain and Amount</h3>
                <p>
                  Start by selecting the source assets and the exact amounts you
                  want to bridge from. Open the <strong>Swap and Bridge</strong>{" "}
                  modal and add the source tokens you want to bridge from,
                  choosing the chain and amount for each, FastBridge reads your
                  balances across all connected chains and shows the running
                  total in real time. Once your sources are set, select the
                  destination chain and the token you want to receive there. You
                  can remove any source asset at any time; FastBridge
                  recalculates instantly.
                </p>
              </div>
            </div>

            <div className="seo-step">
              <span aria-hidden="true" className="seo-step-num">
                02
              </span>
              <div className="seo-step__body">
                <h3>Review Your Swap</h3>
                <p>
                  The <strong>Confirm Swap</strong> screen breaks down each
                  source asset by chain and value, the estimated amount
                  you&apos;ll receive, and total fees, execution gas fee,
                  protocol fee, and solver fee, plus price impact and swap
                  impact, with max slippage shown. Every figure can be expanded
                  for full detail before you sign, and you can go back to adjust
                  your sources at any point.
                </p>
              </div>
            </div>

            <div className="seo-step">
              <span aria-hidden="true" className="seo-step-num">
                03
              </span>
              <div className="seo-step__body">
                <h3>Approve &amp; Swap is Complete</h3>
                <p>
                  Confirm each source asset in your wallet. FastBridge executes
                  the bridge and swap atomically, then delivers your funds to
                  the destination chain in seconds, consolidated, swapped, and
                  ready to use.
                </p>
              </div>
            </div>
          </div>

          <div className="seo-banner">
            <div className="seo-banner__copy">
              <p className="seo-banner__eyebrow">Try FastBridge</p>
              <p className="seo-banner__title">Try it yourself.</p>
              <p className="seo-banner__body">
                Bridge and swap across multiple chains, no gas tokens needed.
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

          <h2>Supported networks, tokens and wallets</h2>
          <p>
            FastBridge currently supports 12 EVM chains, with more being added
            regularly. You can always check the bridge interface for the current
            full list or follow Avail on{" "}
            <a
              href="https://x.com/AvailProject"
              rel="noopener noreferrer"
              target="_blank"
            >
              Twitter
            </a>{" "}
            for announcements.
          </p>

          <dl className="seo-specs">
            <div>
              <dt>Chains</dt>
              <dd>
                Monad, MegaETH, Citrea, Arbitrum, Avalanche, Ethereum, Optimism,
                Base, Scroll, Polygon, BNB, HyperEVM, <strong>12 chains</strong>
                , with more being added regularly.
              </dd>
            </div>
            <div>
              <dt>Tokens</dt>
              <dd>
                All tokens on all supported chains (USDC, USDT, USDm, etc.).
                Send any token(s) and receive any token at the destination.
              </dd>
            </div>
            <div>
              <dt>Amounts</dt>
              <dd>No minimum amount. Maximum is $10M per single transfer.</dd>
            </div>
            <div>
              <dt>Wallets</dt>
              <dd>
                Any EVM-compatible wallet, MetaMask, Rabby, Coinbase Wallet, and
                any WalletConnect-compatible wallet. If your wallet works with
                EVM chains, it works with FastBridge.
              </dd>
            </div>
            <div>
              <dt>Settlement</dt>
              <dd>
                Approximately 10&ndash;20 seconds. Designed for near-instant
                delivery, no lock-and-mint delays, no 7-day withdrawal windows.
              </dd>
            </div>
          </dl>

          <h2>Security model</h2>
          <p>
            FastBridge is fully non-custodial. Your funds are never held by a
            centralised party. The protocol routes and settles your transaction
            trustlessly without holding approvals or taking custody of your
            assets at any point.
          </p>

          <p>
            FastBridge is powered by{" "}
            <a
              href="https://docs.availproject.org/docs/nexus"
              rel="noopener noreferrer"
              target="_blank"
            >
              Avail Nexus
            </a>
            , which provides unified proof verification and intent settlement
            across chains. The security of your bridge transaction is backed by
            a robust, decentralised coordination layer rather than a multisig or
            federated validator set. Security audits are conducted as part of
            Avail Nexus protocol development; details of completed audits are
            published in the Avail documentation.
          </p>

          <p>
            If a transaction fails to settle at the destination, your funds are
            never lost and always remain in your control. The transaction simply
            reverts, and your assets stay in your wallet on the source chain,
            exactly where they started. You can retry immediately.
          </p>

          <ul>
            <li>
              <strong>Non-custodial throughout:</strong> Avail never holds user
              funds at any stage of a bridge or swap.
            </li>
            <li>
              <strong>No multisig or federated validators:</strong> Security is
              backed by Avail Nexus&apos;s decentralised coordination layer.
            </li>
            <li>
              <strong>Transaction failure protection:</strong> If a transaction
              reverts, funds stay in your source wallet, nothing is lost.
            </li>
            <li>
              <strong>Audited:</strong> Avail Nexus undergoes security audits;
              reports are published in the official documentation.
            </li>
          </ul>

          <div className="seo-banner seo-banner--streaks">
            <div className="seo-banner__copy">
              <p className="seo-banner__eyebrow">Try FastBridge</p>
              <p className="seo-banner__title">
                The fastest way to move across chains.
              </p>
              <p className="seo-banner__body">
                Non-custodial, no wrapping, settled in seconds.
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

          <h2>What makes FastBridge different</h2>
          <p>
            Traditional bridges move funds from one chain to one other chain.
            FastBridge aggregates your balances across multiple source chains,
            can swap between different tokens, and settles everything at the
            destination chain in a single transaction. Four capabilities set it
            apart from every other bridge on the market.
          </p>

          <table>
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">What it means in practice</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Multi-source input with swaps</td>
                <td>
                  Consolidate balances from several chains and combine several
                  different tokens to receive another token of your choice at
                  the destination, all in one transaction. For example: send 3
                  USDC (Ethereum), 3 USDT (BNB), and 2 USDM (MegaETH), and
                  receive HYPE on HyperEVM.
                </td>
              </tr>
              <tr>
                <td>Unified balance view</td>
                <td>
                  FastBridge reads your balances across all connected chains
                  simultaneously. If you hold USDC on Arbitrum, Polygon, and
                  Base, it appears as one consolidated &quot;Unified&quot;
                  balance you can spend all at once, but each chain&apos;s
                  balance is also shown individually if you&apos;d rather pick
                  and choose.
                </td>
              </tr>
              <tr>
                <td>Gas abstraction</td>
                <td>
                  No native gas tokens needed on any source chain. You can pay
                  gas in stablecoins (USDT, USDC).
                </td>
              </tr>
              <tr>
                <td>Exact-in &amp; Exact-out</td>
                <td>
                  Choose whether to enter the exact amount you want to send or
                  receive. FastBridge supports multi-source Exact-In and
                  Exact-Out, automatically combining balances across multiple
                  chains and tokens into a single transaction. For Exact-Out,
                  simply enter the amount you want to receive, and FastBridge
                  calculates the optimal inputs and routes to deliver it.
                </td>
              </tr>
            </tbody>
          </table>

          <h2>Developer and ecosystem</h2>
          <p>
            FastBridge is developed and maintained by Avail, a blockchain
            infrastructure company co-founded by Anurag Arjun (ex Co-Founder,
            Polygon) and Prabal Banerjee (ex Research Lead, Polygon). Avail
            originated inside Polygon Labs in 2020 and spun out in 2023 to build
            neutral infrastructure for the rollup ecosystem.
          </p>

          <h3>Funding</h3>
          <p>
            Avail has raised $75M in total ($43M Series A, $27M Seed) from
            Founders Fund, Dragonfly, Cyber Fund, SevenX, Figment, Alliance DAO,
            HashKey, and 15+ others.
          </p>

          <div className="seo-stats">
            <div className="seo-stat">
              <span className="seo-stat__label">Total raised</span>
              <span className="seo-stat__value">$75M</span>
            </div>
            <div className="seo-stat">
              <span className="seo-stat__label">Founded</span>
              <span className="seo-stat__value">2023</span>
            </div>
          </div>

          <h3>Integrating FastBridge</h3>
          <p>
            FastBridge exposes integration endpoints for dApps, wallets, and
            protocols. It offers an embeddable widget that drops into your
            existing app with minimal setup. Integrate FastBridge into your app
            and get a configurable widget handling multi-chain asset routing,
            gas, and settlement.
          </p>

          <div className="seo-banner seo-banner--streaks">
            <div className="seo-banner__copy">
              <p className="seo-banner__eyebrow">Try FastBridge</p>
              <p className="seo-banner__title">
                Swap &amp; bridge from multiple chains and tokens.
              </p>
              <p className="seo-banner__body">
                To your destination, in a single transaction.
              </p>
            </div>
            <div className="seo-banner__actions">
              <button
                className="seo-banner__btn"
                onClick={handleBridgeClick}
                type="button"
              >
                Bridge Now
              </button>
              <a
                className="seo-banner__btn seo-banner__btn--secondary"
                href="https://elements.nexus.availproject.org/docs/components/swaps"
                rel="noopener noreferrer"
                target="_blank"
              >
                Integrate
              </a>
            </div>
          </div>

          <p className="seo-meta">
            Last updated: June 2026 &middot; Maintained by Avail
          </p>
        </article>

        <aside aria-label="FastBridge at a glance" className="seo-sidebar">
          <div className="seo-spec-card">
            <header className="seo-spec-card__header">
              <h2 className="seo-spec-card__title">FastBridge</h2>
              <p className="seo-spec-card__subtitle">
                Cross-chain bridge &amp; swap
              </p>
            </header>
            <dl className="seo-spec-card__rows">
              <div className="seo-spec-card__row">
                <dt>Developer</dt>
                <dd>Avail Project</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Type</dt>
                <dd>Unified bridge &amp; swap</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Architecture</dt>
                <dd>Intent-based, solver-fronted</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Tokens</dt>
                <dd>All tokens on all supported chains</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Custody</dt>
                <dd>Non-custodial</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Settlement</dt>
                <dd>~10&ndash;20 seconds</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Built on</dt>
                <dd>Avail Nexus Protocol</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Chains</dt>
                <dd>
                  Ethereum, Optimism, Base, Monad, MegaETH, Citrea, Arbitrum,
                  Avalanche, Scroll, Polygon, BNB, and HyperEVM
                </dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Min / Max</dt>
                <dd>No minimum &middot; $10M max per transfer</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Wallets</dt>
                <dd>
                  MetaMask, Rabby, Coinbase Wallet, and WalletConnect-compatible
                  wallets
                </dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Multi-source</dt>
                <dd>Yes, unique to FastBridge</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Gas fees</dt>
                <dd>Paid in stablecoins (USDC / USDT)</dd>
              </div>
              <div className="seo-spec-card__row">
                <dt>Wrapping</dt>
                <dd>None, native assets only</dd>
              </div>
            </dl>
          </div>
        </aside>
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
