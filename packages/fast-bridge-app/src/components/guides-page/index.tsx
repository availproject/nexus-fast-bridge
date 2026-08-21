import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { prefetchBridgeApp } from "@/bootstrap";
import { type CMSBlogPost, fetchBlogPosts } from "@/lib/cms";

// import { loadLastChain } from "@/providers/runtime-context";

const STYLESHEETS = ["/landing-new/seo-pages.bundle.css"];

interface GuidesPageProps {
  initialPosts?: CMSBlogPost[];
}

function getInitialPostsFromDom(): CMSBlogPost[] | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const el = document.getElementById("__FASTBRIDGE_DATA__");
    if (el?.textContent) {
      const data = JSON.parse(el.textContent) as {
        initialPosts?: CMSBlogPost[];
      };
      if (Array.isArray(data?.initialPosts) && data.initialPosts.length > 0) {
        return data.initialPosts;
      }
    }
  } catch {
    // Ignore DOM parse errors
  }
  return null;
}

export default function GuidesPage({ initialPosts }: GuidesPageProps = {}) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CMSBlogPost[]>(() => {
    if (initialPosts && initialPosts.length > 0) {
      return initialPosts;
    }
    return getInitialPostsFromDom() ?? [];
  });

  const handleBridgeClick = () => {
    // const lastChain = loadLastChain();
    // navigate(`/${lastChain}`);
    navigate("/app");
  };

  useEffect(() => {
    if (posts.length > 0) {
      return;
    }

    let isMounted = true;
    fetchBlogPosts().then((fetched) => {
      if (isMounted) {
        setPosts(fetched);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [posts.length]);

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
    <main className="page seo-page guides-page">
      <section aria-labelledby="guides-page-title" className="page-hero">
        <img
          alt=""
          aria-hidden="true"
          className="page-hero__media"
          decoding="async"
          fetchPriority="high"
          height="646"
          src="/landing-new/assets/figma-export/faq-header.jpg"
          width="1920"
        />

        <header className="page-hero__nav">
          <Link className="hero__logo" to="/">
            <img
              alt=""
              className="hero__logo-icon"
              decoding="async"
              height="40"
              src="/landing-new/assets/figma-hero/logo-icon-white.svg"
              width="40"
            />
            <span className="hero__logo-text">fastbridge</span>
          </Link>
          <button
            className="page-hero__cta"
            onClick={handleBridgeClick}
            onFocus={prefetchBridgeApp}
            onMouseEnter={prefetchBridgeApp}
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
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="guides-card">
                <Link
                  aria-hidden="true"
                  className="guides-card__media"
                  tabIndex={-1}
                  to={`/guides/${post.slug}`}
                >
                  <img
                    alt={post.title}
                    decoding="async"
                    height="720"
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, 360px"
                    src={post.coverImage}
                    width="1280"
                  />
                </Link>
                <div className="guides-card__body">
                  <h2 className="guides-card__title">
                    <Link to={`/guides/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="guides-card__date">
                    Published on{" "}
                    <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                  </p>
                  <Link
                    className="guides-card__link"
                    to={`/guides/${post.slug}`}
                  >
                    Read more
                  </Link>
                </div>
              </article>
            </li>
          ))}
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
              decoding="async"
              height="163"
              loading="lazy"
              src="/landing-new/assets/figma-export/footer-watermark-desktop.svg"
              width="1240"
            />
          </picture>
        </div>
      </footer>
    </main>
  );
}
