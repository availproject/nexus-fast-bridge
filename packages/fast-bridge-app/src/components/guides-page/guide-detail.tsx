import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { type CMSBlogPost, fetchBlogPostBySlug } from "@/lib/cms";
import { loadLastChain } from "@/providers/runtime-context";

const STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/seo-page.css",
  "/landing-new/button-hovers.css",
];

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [cssLoaded, setCssLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const [post, setPost] = useState<CMSBlogPost | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetchBlogPostBySlug(slug)
      .then((data) => {
        if (isMounted) {
          setPost(data);
          if (data) {
            document.title = data.seoTitle || data.title;
            if (data.toc.length > 0) {
              setActiveId(data.toc[0].id);
            }
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!post || post.toc.length === 0) {
      return;
    }

    let ticking = false;
    function updateActiveSection() {
      if (!post) {
        return;
      }
      const marker = Math.min(160, Math.round(window.innerHeight * 0.28));
      let current = post.toc[0]?.id || "";

      for (const item of post.toc) {
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
  }, [post]);

  if (loading) {
    return (
      <main
        className="page seo-page"
        style={{
          opacity: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <p style={{ color: "#8E8E93" }}>Loading guide...</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main
        className="page seo-page"
        style={{ opacity: 1, padding: "4rem 2rem" }}
      >
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
        </header>
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <h1>Guide Not Found</h1>
          <p style={{ margin: "1.5rem 0", color: "#8E8E93" }}>
            The article you are looking for does not exist or has been moved.
          </p>
          <Link
            style={{
              color: "#3182CE",
              textDecoration: "underline",
              fontWeight: 600,
            }}
            to="/guides"
          >
            &larr; Back to Guides
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="page seo-page"
      style={{
        opacity: cssLoaded ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
      }}
    >
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
            {post.title}
          </h1>
          <p className="page-hero__subtitle">{post.excerpt}</p>
        </div>
      </section>

      <div className="seo-layout seo-layout--guide">
        {post.toc.length > 0 && (
          <aside className="seo-sidebar">
            <nav aria-label="On this page" className="seo-toc">
              <p className="seo-toc__label">On this page</p>
              <ol>
                {post.toc.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <li
                      className={isActive ? "is-active" : undefined}
                      key={item.id}
                    >
                      <a
                        aria-current={isActive ? "location" : undefined}
                        href={`#${item.id}`}
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>
        )}

        <article className="seo-content">
          <p className="seo-authorship">
            {post.author && (
              <span>
                Authored by <strong>{post.author}</strong>
              </span>
            )}
            {post.reviewer && (
              <>
                <span aria-hidden="true" className="seo-authorship__sep">
                  &middot;
                </span>
                <span>
                  Reviewed by <strong>{post.reviewer}</strong>
                </span>
              </>
            )}
            {post.publishedAt && (
              <>
                <span aria-hidden="true" className="seo-authorship__sep">
                  &middot;
                </span>
                <span>Last updated {post.publishedAt}</span>
              </>
            )}
          </p>

          <div
            className="cms-article-body"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized html/markdown body content from Strapi CMS
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div
            className="seo-banner seo-banner--streaks"
            style={{ marginTop: "3rem" }}
          >
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
        </article>
      </div>
    </main>
  );
}
