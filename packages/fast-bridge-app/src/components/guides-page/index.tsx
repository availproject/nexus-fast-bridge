import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadLastChain } from "@/providers/runtime-context";

const STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/seo-page.css",
  "/landing-new/button-hovers.css",
];

export default function GuidesPage() {
  const navigate = useNavigate();
  const [cssLoaded, setCssLoaded] = useState(false);

  const handleBridgeClick = () => {
    const lastChain = loadLastChain();
    navigate(`/${lastChain}`);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);

    let loadedCount = 0;
    const links = STYLESHEETS.map((href) => {
      const link = document.createElement("link");
      link.href = href;
      link.rel = "stylesheet";
      link.onload = () => {
        loadedCount++;
        if (loadedCount === STYLESHEETS.length) {
          setCssLoaded(true);
        }
      };
      link.onerror = () => {
        loadedCount++;
        if (loadedCount === STYLESHEETS.length) {
          setCssLoaded(true);
        }
      };
      document.head.appendChild(link);
      return link;
    });

    return () => {
      for (const link of links) {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      }
    };
  }, []);

  return (
    <main
      className="page seo-page guides-page"
      style={{
        opacity: cssLoaded ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      <section aria-labelledby="guides-page-title" className="page-hero">
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
          <h1 className="page-hero__title" id="guides-page-title">
            Guides
          </h1>
          <p className="page-hero__subtitle">
            Practical guides for bridging across chains, choosing the right
            bridge, and getting the most out of FastBridge.
          </p>
        </div>
      </section>

      <section aria-label="FastBridge guides" className="guides-list">
        <ul className="guides-list__grid">
          <li>
            <article className="guides-card">
              <Link
                aria-hidden="true"
                className="guides-card__media"
                tabIndex={-1}
                to="/guides/top-cross-chain-bridges"
              >
                <img
                  alt=""
                  decoding="async"
                  height="720"
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, 360px"
                  src="/landing-new/assets/branding/blog/top-cross-chain-bridges-2026.png"
                  srcSet="/landing-new/assets/branding/blog/top-cross-chain-bridges-2026.png 1280w, /landing-new/assets/branding/blog/top-cross-chain-bridges-2026@2x.png 2560w"
                  width="1280"
                />
              </Link>
              <div className="guides-card__body">
                <h2 className="guides-card__title">
                  <Link to="/guides/top-cross-chain-bridges">
                    Top Cross-Chain Bridges In 2026
                  </Link>
                </h2>
                <p className="guides-card__date">
                  Published on <time dateTime="2026-04-24">24 April 2026</time>
                </p>
                <Link
                  className="guides-card__link"
                  to="/guides/top-cross-chain-bridges"
                >
                  Read more
                </Link>
              </div>
            </article>
          </li>
        </ul>
      </section>

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
