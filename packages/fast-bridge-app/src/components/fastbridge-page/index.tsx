import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/seo-page.css",
  "/landing-new/button-hovers.css",
];

export default function FastBridgeProductPage() {
  const navigate = useNavigate();

  const handleBridgeClick = () => {
    navigate("/app");
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);

    document.title = "FastBridge — Product Reference by Avail";

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
          <h1 className="page-hero__title" id="seo-page-title">
            FastBridge
          </h1>
          <p className="page-hero__subtitle">
            A unified, intent-based cross-chain bridge developed by Avail. The
            only bridge that natively supports multi-source transactions across
            all major EVM networks.
          </p>
        </div>
      </section>

      <article className="seo-content">
        <p>
          FastBridge is a unified, intent-based cross-chain bridge developed by
          Avail. It enables users to transfer tokens, including USDC, USDT,
          USDM, ETH, and other tokens, across major Ethereum Virtual Machine
          (EVM) blockchain networks. FastBridge is the only bridge that natively
          supports multi-source transactions, allowing users to combine their
          balances from multiple source chains into a single destination chain
          in one signed transaction. It is built on the Avail Nexus coordination
          layer and operates at{" "}
          <a href="https://fastbridge.availproject.org/">
            fastbridge.availproject.org
          </a>
          .
        </p>

        <p>
          FastBridge differs from conventional bridges in four ways: it shows
          your balances across every connected chain in a unified view, allows
          you to pull from multiple chains and bridge in a single transaction,
          lets you choose exactly which chains to draw from, and provides gas
          abstraction with fees payable in stablecoins like USDC or USDT.
          Settlement typically completes in 12–20 seconds.
        </p>

        <h2>Overview</h2>
        <p>
          FastBridge moves tokens across blockchains without wrapping, without
          intermediate tokens, and without requiring users to manage native gas
          on each chain. Transactions typically settle in seconds.
        </p>
        <p>
          Unlike other cross-chain bridges, which process one source chain per
          transaction, FastBridge supports multi-source transactions: a user can
          pull a single token from several source chains simultaneously and
          consolidate it onto a single destination chain in one transaction
          flow.
        </p>
        <p>
          For example, a user holding USDC across Arbitrum, Base, Optimism, and
          Polygon can move all four balances into a single wallet on a
          destination chain in one transaction; no network switching, no
          separate bridge transactions, no multiple approvals.
        </p>

        <h2>How it works</h2>
        <p>
          FastBridge uses an intent-based architecture. Rather than routing
          funds through a sequence of on-chain steps, the system creates an
          intent — a declaration of the user's desired outcome — and a network
          of solvers competes to fulfil it.
        </p>
        <p>The transaction flow is:</p>
        <ol>
          <li>
            The user connects their wallet and selects source chain(s), the
            token to move, destination chain, and amount.
          </li>
          <li>
            Funds are locked in decentralised vault contracts on the source
            chain(s). Avail does not take custody.
          </li>
          <li>
            A solver, which holds liquidity on the destination chain, fronts the
            funds to the user immediately.
          </li>
          <li>
            Once the transaction is verified on-chain, settlement completes and
            the solver is reimbursed from the locked source-chain funds.
          </li>
        </ol>
        <p>
          Users remain in control of their assets throughout. FastBridge is
          fully self-custodial and does not take custody of funds at any point
          in the process.
        </p>

        <h3>Avail Nexus</h3>
        <p>
          FastBridge is powered by Avail Nexus, an intent-based coordination
          layer that abstracts multi-chain routing into a single user action.
          Nexus reads user balances across every supported chain, identifies the
          optimal combination of sources to satisfy a given intent, and
          coordinates execution with the solver network. Nexus can be integrated
          as an SDK or API into any application to provide unified balances and
          bridgeless cross-chain user flows.
        </p>

        <h2>Supported networks and tokens</h2>
        <p>
          FastBridge supports every major EVM chain and a growing set of
          high-performance Layer 2 networks. The list below is current as of May
          2026; the live list of supported chains and tokens is maintained in
          the Avail documentation.
        </p>
        <dl>
          <dt>Networks</dt>
          <dd>
            Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, BNB Chain,
            Scroll, HyperEVM, Kaia, MegaETH, Citrea, Monad. 13+ EVM chains
            supported, with additional networks added over time.
          </dd>
          <dt>Tokens</dt>
          <dd>
            USDC, USDT, USDM, ETH, BNB, AVAX, MON, POL, HYPE, KAIA, and other
            native and stablecoin assets.
          </dd>
          <dt>Live list</dt>
          <dd>
            <a
              href="https://docs.availproject.org/docs/nexus/supported-chains-and-tokens"
              rel="noopener noreferrer"
              target="_blank"
            >
              docs.availproject.org/docs/nexus/supported-chains-and-tokens
            </a>
          </dd>
        </dl>

        <h2>Security model</h2>
        <p>
          FastBridge is non-custodial. User funds are locked in decentralised
          vault contracts on the source chain that release only when the
          on-chain conditions of the intent are met and verified. Avail Nexus
          orchestrates the transaction flow but does not hold, control, or have
          access to user funds at any point.
        </p>
        <p>
          The solver model transfers execution risk away from the user. Solvers
          front their own liquidity and are reimbursed only after successful
          on-chain verification. If a solver fails to fulfil an intent, the user
          can reclaim funds from the source-chain vault. Settlement does not
          occur until on-chain verification completes.
        </p>
        <ul>
          <li>
            User funds are never held by Avail or by any centralised
            intermediary.
          </li>
          <li>
            Vault contracts are decentralised and operate under verifiable
            on-chain logic.
          </li>
          <li>
            Solvers carry execution risk, not users; failed fulfilment results
            in fund reclaim, not loss.
          </li>
          <li>
            Settlement is contingent on on-chain verification, not on solver
            self-attestation.
          </li>
        </ul>

        <h2>What makes FastBridge different</h2>
        <p>
          Most cross-chain bridges operate on a 1:1 model — one source chain,
          one transaction. FastBridge treats a user's entire multi-chain balance
          as a unified balance that can be moved in a single flow.
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">What it means</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>See all your balances in one place</td>
              <td>
                Most bridges show what you have on the chain your wallet is
                currently connected to. FastBridge shows your balances across
                every connected chain, with no network switching required.
              </td>
            </tr>
            <tr>
              <td>One transaction regardless of how many source chains</td>
              <td>
                Whether you're pulling from 2 chains or 6, FastBridge executes a
                single transaction.
              </td>
            </tr>
            <tr>
              <td>Gas abstraction</td>
              <td>
                No need to hold native tokens on every source chain. With
                FastBridge, fees can be paid in stablecoins (USDC/USDT).
              </td>
            </tr>
            <tr>
              <td>Choose your source chains</td>
              <td>
                See exactly which chains and balances will be used and how much
                will be drawn from each. Deselect any you want to keep —
                FastBridge recalculates instantly.
              </td>
            </tr>
          </tbody>
        </table>

        <h2>Developer and ecosystem</h2>
        <p>
          FastBridge is developed and maintained by Avail, a blockchain
          infrastructure company founded by the team that scaled Polygon. Avail
          was founded by Anurag Arjun (Co-Founder, Polygon) and Prabal Banerjee
          (Research Lead, Polygon). Originated inside Polygon Labs in 2020; spun
          out in 2023 to build neutral infrastructure for the rollup ecosystem.
        </p>
        <p>
          Avail has raised $75M ($43M Series A, $27M Seed) from Founders Fund,
          Dragonfly, Cyber Fund, SevenX, Figment, Alliance DAO, HashKey, and 15+
          others.
        </p>
        <dl>
          <dt>Avail DA</dt>
          <dd>
            Data Availability Layer. Implements Ethereum's Danksharding tech.
            Validity proofs + DA sampling for light client verification. Live
            since Jul 2024 · 70+ teams · 20s finality.
          </dd>
          <dt>Avail Nexus</dt>
          <dd>
            Multi-Chain Interop Protocol. Intent–solver architecture connecting
            users, assets, and apps across chains. Live since Nov 2025 · 13+
            chains.
          </dd>
        </dl>

        <h2>Frequently asked questions</h2>
        <h3>What is FastBridge?</h3>
        <p>
          FastBridge is a non-custodial, intent-based cross-chain bridge
          developed by Avail. It allows users to move tokens across major EVM
          blockchain networks and is the only bridge that natively supports
          multi-source transactions. It is built on the Avail Nexus coordination
          layer and live on fastbridge.availproject.org.
        </p>
        <h3>Is FastBridge safe to use?</h3>
        <p>
          FastBridge is self-custodial. User funds are locked in decentralised
          vault contracts on the source chain and are never held by Avail or any
          centralised party. Transactions settle only after on-chain
          verification. Execution risk sits with the solver, not the user.
        </p>
        <h3>How long does a FastBridge transaction take?</h3>
        <p>
          Transactions typically settle in 10 to 20 seconds end-to-end. A solver
          fronts funds on the destination chain immediately upon intent
          verification.
        </p>
        <h3>Does FastBridge wrap tokens?</h3>
        <p>
          No. FastBridge does not use wrapped or intermediate tokens. Users send
          native assets and stablecoins and receive native assets and
          stablecoins on the destination chain.
        </p>
        <h3>Can I bridge from multiple chains at once with FastBridge?</h3>
        <p>
          Yes. FastBridge supports multi-source transactions. A user can pull a
          single token from multiple source chains and consolidate the combined
          balance onto a single destination chain in one signed transaction.
        </p>
        <h3>Which chains and tokens does FastBridge support?</h3>
        <p>
          FastBridge supports every major EVM ecosystem, including Ethereum,
          Arbitrum, Optimism, Base, Polygon, Avalanche, BNB Chain, Scroll,
          HyperEVM, Kaia, MegaETH, Citrea, and Monad. Supported tokens include
          USDC, USDT, USDM, ETH, BNB, AVAX, MON, POL, HYPE, and KAIA.
        </p>
        <h3>What is a solver in FastBridge?</h3>
        <p>
          A solver is a specialised actor that holds liquidity across chains and
          fronts funds on the destination chain when a user initiates a
          transaction. Solvers are reimbursed after on-chain verification.
        </p>
        <h3>How is FastBridge different from a traditional bridge?</h3>
        <p>
          FastBridge lets a user combine their balances across multiple source
          chains and move them in a single transaction. Traditional bridges
          require a separate transaction per source chain. FastBridge also
          provides unified balances and gas abstraction.
        </p>
        <h3>Who developed FastBridge?</h3>
        <p>
          FastBridge is developed and maintained by Avail, the team behind the
          Avail Data Availability layer and the Avail Nexus coordination layer.
        </p>
        <h3>Can I integrate FastBridge into my application?</h3>
        <p>
          FastBridge can be embedded into third-party applications via the Nexus
          FastBridge component and the broader Nexus SDK.
        </p>

        <h2>Links and references</h2>
        <dl>
          <dt>Application</dt>
          <dd>
            <a href="https://fastbridge.availproject.org/">
              fastbridge.availproject.org
            </a>
          </dd>
          <dt>Documentation</dt>
          <dd>
            <a href="https://docs.availproject.org/">docs.availproject.org</a>
          </dd>
          <dt>Integrate FastBridge</dt>
          <dd>
            <a
              href="https://elements.nexus.availproject.org/"
              rel="noopener noreferrer"
              target="_blank"
            >
              elements.nexus.availproject.org
            </a>
          </dd>
          <dt>Avail Nexus</dt>
          <dd>
            <a
              href="https://availproject.org/nexus"
              rel="noopener noreferrer"
              target="_blank"
            >
              availproject.org/nexus
            </a>
          </dd>
        </dl>

        <button
          className="section-btn seo-cta"
          onClick={handleBridgeClick}
          type="button"
        >
          Bridge Now
        </button>
        <p className="seo-meta">
          Last updated: 24 April 2026 · Maintained by Avail ·
          availproject.org/fastbridge
        </p>
      </article>

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
