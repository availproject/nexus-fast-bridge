import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadLastChain } from "@/providers/runtime-context";

const WEBKIT_REGEX = /AppleWebKit/;
const CHROME_REGEX = /Chrome|Chromium|Android|Edg|OPR|SamsungBrowser/;

const STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/hiw.css",
  "/landing-new/blog.css",
  "/landing-new/animations.css",
  "/landing-new/button-hovers.css",
];

const BLOG_ITEMS = [
  {
    id: "megaeth",
    imgSrc: "/landing-new/assets/blog-megaeth.jpg?v=5",
    collapsedOffsetX: 0,
    title: "The Fastest Chain Just Got the Fastest Bridge",
    href: "https://blog.availproject.org/megaeth-fastbridge-the-fastest-way-to-onboard-to-the-fastest-chain/",
    cta: "Read more",
  },
  {
    id: "multichain",
    imgSrc: "/landing-new/assets/blog-multichain.jpg?v=5",
    collapsedOffsetX: 120,
    title: "The Only Bridge Built For Multichain DeFi",
    href: "https://blog.availproject.org/fastbridge-by-avail-the-fastest-way-to-move-crypto-from-multiple-chains/",
    cta: "Read more",
  },
  {
    id: "monad",
    imgSrc: "/landing-new/assets/blog-monad.jpg?v=5",
    collapsedOffsetX: 120,
    title: "Bridge to Monad From Multiple Chains, In One Transaction",
    href: "https://blog.availproject.org/how-to-bridge-to-monad-in-under-60-seconds/",
    cta: "Read more",
  },
  {
    id: "canonical",
    imgSrc: "/landing-new/assets/blog-canonical.jpg?v=5",
    collapsedOffsetX: 80,
    title: "FastBridge vs Canonical Bridge",
    href: "https://blog.availproject.org/fastbridge-vs-canonical-bridge-why-7-days-is-too-long-for-defi/",
    cta: "Read more",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [cssLoaded, setCssLoaded] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isHiwVisible, setIsHiwVisible] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [activeBlogIndex, setActiveBlogIndex] = useState(0);
  const activeBlogIndexRef = useRef(activeBlogIndex);
  useEffect(() => {
    activeBlogIndexRef.current = activeBlogIndex;
  }, [activeBlogIndex]);

  const [homeOpenFaq, setHomeOpenFaq] = useState<number | null>(0);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const [heroParallaxStyle, setHeroParallaxStyle] =
    useState<React.CSSProperties>({});

  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const squeezyRef = useRef<any>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const hiwTimerRef = useRef<any>(null);
  const isVideoPlaybackFailedRef = useRef(false);

  const handleBridgeClick = () => {
    const lastChain = loadLastChain();
    navigate(`/${lastChain}`);
  };

  const isWebKit = () => {
    if (typeof navigator === "undefined") {
      return false;
    }
    const ua = navigator.userAgent;
    return WEBKIT_REGEX.test(ua) && !CHROME_REGEX.test(ua);
  };

  const getStepVideoSource = (stepIndex: number) => {
    return isWebKit()
      ? `/landing-new/assets/hiw-step-${stepIndex + 1}-hevc.mp4?v=20`
      : `/landing-new/assets/hiw-step-${stepIndex + 1}.webm?v=16`;
  };

  const getStepStyle = (index: number) => {
    const sequence: number[] = [];
    for (let i = 0; i < 3; i++) {
      sequence.push((activeStep + i) % 3);
    }
    const order = sequence.indexOf(index);
    return { "--step-order": order } as React.CSSProperties;
  };

  const selectIndex = useCallback((index: number) => {
    const currentIndex = activeBlogIndexRef.current;
    if (index === currentIndex || index < 0 || index >= BLOG_ITEMS.length) {
      return;
    }
    const delta = index - currentIndex;
    if (squeezyRef.current) {
      if (delta > 0) {
        squeezyRef.current.gotoNext(delta);
      } else {
        squeezyRef.current.gotoPrev(-delta);
      }
    }
    activeBlogIndexRef.current = index;
    setActiveBlogIndex(index);
  }, []);

  // Squeezy carousel actions
  const handleBlogNext = () => {
    selectIndex((activeBlogIndexRef.current + 1) % BLOG_ITEMS.length);
  };

  const handleBlogPrev = () => {
    selectIndex(
      (activeBlogIndexRef.current - 1 + BLOG_ITEMS.length) % BLOG_ITEMS.length
    );
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const nextIndex = (index - 1 + BLOG_ITEMS.length) % BLOG_ITEMS.length;
      selectIndex(nextIndex);
      setTimeout(() => {
        const nextLink = document.querySelector(
          `#blog-meta-slide-${nextIndex} .blog__read`
        ) as HTMLElement;
        nextLink?.focus();
      }, 50);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (index + 1) % BLOG_ITEMS.length;
      selectIndex(nextIndex);
      setTimeout(() => {
        const nextLink = document.querySelector(
          `#blog-meta-slide-${nextIndex} .blog__read`
        ) as HTMLElement;
        nextLink?.focus();
      }, 50);
    }
  };

  const handleHiwKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    stepIndex: number
  ) => {
    let nextIndex = stepIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (stepIndex + 1) % 3;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (stepIndex - 1 + 3) % 3;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = 2;
    } else {
      return;
    }

    event.preventDefault();
    setActiveStep(nextIndex);
    setTimeout(() => {
      const btn = document.getElementById(`hiw-step-${nextIndex}`);
      btn?.focus();
    }, 50);
  };

  const handleMobileDotClick = (index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const cards = scroller.querySelectorAll(".blog-card");
    const card = cards[index] as HTMLElement;
    if (!card) {
      return;
    }
    const padLeft =
      Number.parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
    scroller.scrollTo({ left: card.offsetLeft - padLeft, behavior: "smooth" });
  };

  const handleScrollerScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const cards = scroller.querySelectorAll(".blog-card");
    if (!cards.length) {
      return;
    }
    const padLeft =
      Number.parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
    const ref = scroller.scrollLeft + padLeft;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const d = Math.abs(card.offsetLeft - ref);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setMobileActiveIndex(best);
  };

  // Stylesheet loading lifecycle
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);

    document.documentElement.classList.add("has-enhanced-animations");

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
      document.documentElement.classList.remove("has-enhanced-animations");
      for (const link of links) {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      }
    };
  }, []);

  // Marquee width calculation
  useEffect(() => {
    if (!cssLoaded) {
      return;
    }
    const track = trackRef.current;
    if (track) {
      const logos = track.querySelectorAll(".chains-strip__logo");
      const half = logos.length / 2;
      let width = 0;
      const gap = Number.parseFloat(getComputedStyle(track).gap) || 50;
      for (let i = 0; i < half; i++) {
        const logo = logos[i] as HTMLElement;
        width += logo.offsetWidth;
      }
      width += (half - 1) * gap;
      track.style.setProperty("--scroll-width", `-${width}px`);
    }
  }, [cssLoaded]);

  // Reveal animations on scroll
  useEffect(() => {
    if (!cssLoaded) {
      return;
    }
    const revealTargets = document.querySelectorAll(
      "[data-reveal], [data-reveal-stagger]"
    );
    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    for (const el of revealTargets) {
      observer.observe(el);
    }

    const chains = document.querySelector(".chains-strip[data-reveal-stagger]");
    if (chains) {
      chains.classList.add("is-revealed");
    }

    return () => {
      observer.disconnect();
    };
  }, [cssLoaded]);

  // Hero parallax scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById("hero");
      if (!hero) {
        return;
      }
      const rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        return;
      }
      const progress = Math.max(0, Math.min(1, -rect.top / rect.height));
      setHeroParallaxStyle({
        transform: `translateY(${progress * 48}px) scale(${1 + progress * 0.04})`,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const clearHiwTimer = useCallback(() => {
    if (hiwTimerRef.current !== null) {
      window.clearTimeout(hiwTimerRef.current);
      hiwTimerRef.current = null;
    }
  }, []);

  const scheduleHiwAdvance = useCallback(
    (delay: number) => {
      clearHiwTimer();
      if (!isHiwVisible) {
        return;
      }
      hiwTimerRef.current = window.setTimeout(() => {
        hiwTimerRef.current = null;
        setActiveStep((prev) => (prev + 1) % 3);
      }, delay);
    },
    [isHiwVisible, clearHiwTimer]
  );

  // Tab activity document visibility listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // How It Works video playing/pausing state logic and auto-advance
  useEffect(() => {
    clearHiwTimer();

    const isCurrentlyActive = isHiwVisible && isTabActive;

    if (!isCurrentlyActive) {
      // Pause all videos
      videoRefs.current.forEach((video) => {
        video?.pause();
      });
      return;
    }

    // Play active video or fall back to timer
    const activeVideo = videoRefs.current[activeStep];

    // Pause other videos
    videoRefs.current.forEach((video, idx) => {
      if (idx !== activeStep) {
        video?.pause();
      }
    });

    if (activeVideo && !isVideoPlaybackFailedRef.current) {
      try {
        activeVideo.currentTime = 0;
        const playPromise = activeVideo.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Autoplay blocked or other playback failure -> fallback to timer
            isVideoPlaybackFailedRef.current = true;
            scheduleHiwAdvance(6000);
          });
        }
      } catch {
        isVideoPlaybackFailedRef.current = true;
        scheduleHiwAdvance(6000);
      }
    } else {
      scheduleHiwAdvance(6000);
    }

    return () => {
      clearHiwTimer();
    };
  }, [
    activeStep,
    isHiwVisible,
    isTabActive,
    clearHiwTimer,
    scheduleHiwAdvance,
  ]);

  // How It Works intersection observer trigger
  useEffect(() => {
    const section = document.querySelector(".hiw");
    if (!section) {
      return;
    }
    const trigger = section.querySelector(".hiw__product-wrap") || section;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsHiwVisible(entry.isIntersecting);
          if (entry.isIntersecting) {
            setActiveStep(0);
          }
        }
      },
      { threshold: 0.55 }
    );
    observer.observe(trigger);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Squeezy images canvas instantiation
  useEffect(() => {
    if (!cssLoaded) {
      return;
    }
    let disposed = false;
    const script = document.createElement("script");
    script.src = "/landing-new/blog-squeezy-canvas.js";
    script.async = true;
    script.onload = () => {
      if (
        disposed ||
        !canvasRef.current ||
        !(window as any).SqueezyImagesCanvas
      ) {
        return;
      }

      const SqueezyImagesCanvas = (window as any).SqueezyImagesCanvas;
      squeezyRef.current = new SqueezyImagesCanvas({
        canvasElement: canvasRef.current,
        items: BLOG_ITEMS,
        onNextColumnClick: (columns: number) => {
          const currentIndex = activeBlogIndexRef.current;
          const targetIndex = (currentIndex + columns) % BLOG_ITEMS.length;
          selectIndex(targetIndex);
          setTimeout(() => {
            const nextLink = document.querySelector(
              `#blog-meta-slide-${targetIndex} .blog__read`
            ) as HTMLElement;
            nextLink?.focus();
          }, 50);
        },
        prefersReducedMotion: window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches,
      });

      squeezyRef.current.loadCanvasImages();
    };

    document.body.appendChild(script);

    const handleResize = () => {
      if (squeezyRef.current) {
        squeezyRef.current.onCanvasResize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      if (squeezyRef.current) {
        squeezyRef.current.dispose();
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [cssLoaded, selectIndex]);

  return (
    <main
      className="page"
      style={{
        opacity: cssLoaded ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      <section className="hero" data-hero-animate id="hero">
        <div aria-hidden="true" className="hero__bg">
          <div className="hero__gradient-wrap" style={heroParallaxStyle}>
            <img
              alt=""
              className="hero__gradient"
              fetchPriority="high"
              height="808"
              src="/landing-new/assets/figma-export/hero-gradient-v2.jpg?v=2"
              width="1440"
            />
            <video
              autoPlay
              className="hero__video"
              loop
              muted
              playsInline
              poster="/landing-new/assets/figma-export/hero-gradient-v2.jpg?v=2"
              preload="metadata"
            >
              <source
                src="/landing-new/assets/hero-bg-video-v2.mp4?v=5"
                type="video/mp4"
              />
            </video>
          </div>
        </div>

        <div className="hero__inner">
          <header className="hero__header">
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
              className="btn btn--secondary hero__nav-btn"
              onClick={handleBridgeClick}
              type="button"
            >
              Bridge Now
            </button>
          </header>

          <h1 className="hero__title">
            <span className="hero__title-desktop">
              <span className="hero__title-line">Move Your Crypto across</span>
              <span className="hero__title-line">
                chains in One Transaction
              </span>
            </span>
            <span className="hero__title-tablet">
              Move All Your Crypto
              <br />
              In One Transaction
            </span>
            <span className="hero__title-mobile">
              <span className="hero__title-line">Move All Your</span>
              <span className="hero__title-line">Crypto In One</span>
              <span className="hero__title-line">Transaction</span>
            </span>
          </h1>

          <div className="hero__panel">
            <p className="hero__desc">
              Combine your balances from multiple chains in a single move. No
              switching networks, no managing gas, no waiting. Arrive ready to
              trade.
            </p>
            <div className="hero__actions">
              <button
                className="btn btn--secondary"
                onClick={handleBridgeClick}
                type="button"
              >
                Bridge Now
              </button>
              <a
                className="btn btn--primary"
                href="https://widgets.availproject.org/docs/components/swaps"
                rel="noopener noreferrer"
                target="_blank"
              >
                Add FastBridge
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Chains strip */}
      <section
        aria-labelledby="chains-desc"
        className="chains-strip"
        data-reveal-stagger
        id="chains"
      >
        <p className="chains-strip__desc" data-reveal-child id="chains-desc">
          Aggregate, swap, and spend your tokens across all major EVM chains in
          one go
        </p>

        <div
          aria-hidden="true"
          className="chains-strip__logos"
          data-reveal-child
        >
          <div className="chains-strip__track" ref={trackRef}>
            {[
              { name: "Ethereum", file: "ethereum.png", w: 136, h: 34 },
              { name: "Arbitrum", file: "arbitrum.png", w: 169, h: 95 },
              { name: "Optimism", file: "optimism.png", w: 121, h: 17 },
              { name: "Avalanche", file: "avalanche.png", w: 148, h: 34 },
              { name: "Polygon", file: "polygon.png", w: 109, h: 109 },
              { name: "Hyperliquid", file: "hyperliquid.png", w: 166, h: 26 },
              { name: "Base", file: "base.png", w: 85, h: 48 },
              { name: "Scroll", file: "scroll.png", w: 122, h: 61 },
              { name: "Kaia", file: "kaia.png", w: 72, h: 46 },
              { name: "MegaETH", file: "megaeth.png", w: 182, h: 29 },
              { name: "Monad", file: "monad.png", w: 151, h: 85 },
              { name: "BNB Chain", file: "bnb-chain.png", w: 148, h: 26 },
              { name: "Citrea", file: "citrea.png", w: 106, h: 26 },
            ]
              .concat([
                { name: "Ethereum", file: "ethereum.png", w: 136, h: 34 },
                { name: "Arbitrum", file: "arbitrum.png", w: 169, h: 95 },
                { name: "Optimism", file: "optimism.png", w: 121, h: 17 },
                { name: "Avalanche", file: "avalanche.png", w: 148, h: 34 },
                { name: "Polygon", file: "polygon.png", w: 109, h: 109 },
                { name: "Hyperliquid", file: "hyperliquid.png", w: 166, h: 26 },
                { name: "Base", file: "base.png", w: 85, h: 48 },
                { name: "Scroll", file: "scroll.png", w: 122, h: 61 },
                { name: "Kaia", file: "kaia.png", w: 72, h: 46 },
                { name: "MegaETH", file: "megaeth.png", w: 182, h: 29 },
                { name: "Monad", file: "monad.png", w: 151, h: 85 },
                { name: "BNB Chain", file: "bnb-chain.png", w: 148, h: 26 },
                { name: "Citrea", file: "citrea.png", w: 106, h: 26 },
              ])
              .map((logo, index) => (
                <div
                  className="chains-strip__logo"
                  key={`${logo.name}-${index}`}
                >
                  <img
                    alt={logo.name}
                    height={logo.h}
                    src={`/landing-new/assets/figma-export/chains/${logo.file}`}
                    width={logo.w}
                  />
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* How FastBridge Works */}
      <section
        aria-labelledby="hiw-title"
        className="hiw"
        data-reveal
        id="how-it-works"
      >
        <div className="hiw__stage">
          <div aria-hidden="true" className="hiw__gradient-wrap">
            <img
              alt=""
              className="hiw__gradient"
              height="683"
              src="/landing-new/assets/figma-export/hiw-hero-bg.png"
              width="1440"
            />

            <div className="hiw__curve-fill">
              <svg
                preserveAspectRatio="none"
                viewBox="0 0 1442 223"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 0C794.407 0 1325.01 170.537 1442 223H0V0Z"
                  fill="#FFFFFE"
                />
              </svg>
            </div>

            <div className="hiw__curve-wave">
              <img
                alt=""
                height="227"
                src="/landing-new/assets/figma-export/hiw-curve-wave.png"
                width="1440"
              />
            </div>
          </div>

          <h2 className="hiw__title" id="hiw-title">
            <span className="hiw__title-word">How</span>{" "}
            <span className="hiw__title-word">FastBridge</span>{" "}
            <span className="hiw__title-word">Works</span>
          </h2>

          <div className="hiw__product-wrap">
            <div className="hiw__widget">
              {[0, 1, 2].map((i) => {
                const active = i === activeStep;
                return (
                  <video
                    autoPlay={active}
                    className={`hiw__widget-video ${active ? "hiw__widget-video--active" : ""}`}
                    key={i}
                    loop={false}
                    muted
                    onEnded={() => {
                      if (i === activeStep) {
                        setActiveStep((prev) => (prev + 1) % 3);
                      }
                    }}
                    onError={() => {
                      if (i === activeStep) {
                        isVideoPlaybackFailedRef.current = true;
                        scheduleHiwAdvance(6000);
                      }
                    }}
                    playsInline
                    preload={i === 0 || isWebKit() ? "auto" : "metadata"}
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                  >
                    <source
                      src={getStepVideoSource(i)}
                      type={
                        isWebKit()
                          ? 'video/mp4; codecs="hvc1"'
                          : 'video/webm; codecs="vp9"'
                      }
                    />
                  </video>
                );
              })}
            </div>
            <div
              aria-hidden="false"
              aria-labelledby={`hiw-step-${activeStep}`}
              className="product-card"
              id="hiw-panel"
              role="tabpanel"
            >
              <div className="product-card__header">
                <span className="product-card__title">Swap/Bridge</span>
                <div className="product-card__actions">
                  <span className="product-card__icon-btn">
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="16"
                      viewBox="0 0 16 16"
                      width="16"
                    >
                      <path
                        d="M8 4V8L10.5 9.5"
                        stroke="#161615"
                        strokeLinecap="round"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M14 8C14 11.314 11.314 14 8 14C4.686 14 2 11.314 2 8C2 4.686 4.686 2 8 2C10.196 2 12.117 3.179 13.163 4.936"
                        stroke="#161615"
                        strokeLinecap="round"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M13.5 2V5H10.5"
                        stroke="#161615"
                        strokeLinecap="round"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </span>
                  <span className="product-card__icon-btn">
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="16"
                      viewBox="0 0 16 16"
                      width="16"
                    >
                      <path
                        d="M4 4L12 12M12 4L4 12"
                        stroke="#161615"
                        strokeLinecap="round"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </span>
                </div>
              </div>

              <div className="product-card__body">
                <div className="product-card__field">
                  <div className="product-card__field-head">
                    <span className="product-card__field-label">Send</span>
                    <span className="product-card__add-asset">+ Add asset</span>
                  </div>
                  <div className="product-card__field-row">
                    <span className="product-card__amount">0</span>
                    <span className="product-card__pill">Select asset</span>
                  </div>
                  <div className="product-card__fiat">≈ $0.00</div>
                </div>

                <div className="product-card__field product-card__field--receive">
                  <span className="product-card__field-label">Receive</span>
                  <div className="product-card__field-row">
                    <span className="product-card__amount">0</span>
                    <span className="product-card__pill">Select asset</span>
                  </div>
                  <div className="product-card__fiat">≈ $0.00</div>
                  <div aria-hidden="true" className="product-card__divider" />
                  <span className="product-card__field-label">Recipient</span>
                  <div className="product-card__recipient-row">
                    <span className="product-card__address">0xF3a1…9b2E</span>
                    <span className="product-card__edit">Edit</span>
                  </div>
                </div>

                <span className="product-card__cta">Add assets to bridge</span>
              </div>
            </div>
          </div>

          <div className="hiw__steps">
            <div role="presentation" style={getStepStyle(0)}>
              <button
                aria-selected={activeStep === 0}
                className={`hiw-step ${activeStep === 0 ? "hiw-step--active" : ""}`}
                id="hiw-step-0"
                onClick={() => setActiveStep(0)}
                onKeyDown={(e) => handleHiwKeyDown(e, 0)}
                role="tab"
                tabIndex={activeStep === 0 ? 0 : -1}
                type="button"
              >
                <span aria-hidden="true" className="hiw-step__num">
                  01
                </span>
                <span className="hiw-step__label">STEP 01</span>
                <span className="hiw-step__heading">
                  Select Token, Chain and Amount
                </span>
                <p className="hiw-step__desc">
                  Add the source tokens you want to bridge from. Pick the
                  destination chain &amp; token you want to end up with.
                  FastBridge aggregates your balances across&nbsp;chains.
                </p>
              </button>
            </div>
            <div role="presentation" style={getStepStyle(1)}>
              <button
                aria-selected={activeStep === 1}
                className={`hiw-step ${activeStep === 1 ? "hiw-step--active" : ""}`}
                id="hiw-step-1"
                onClick={() => setActiveStep(1)}
                onKeyDown={(e) => handleHiwKeyDown(e, 1)}
                role="tab"
                tabIndex={activeStep === 1 ? 0 : -1}
                type="button"
              >
                <span aria-hidden="true" className="hiw-step__num">
                  02
                </span>
                <span className="hiw-step__label">STEP 02</span>
                <span className="hiw-step__heading">Review Your Swap</span>
                <p className="hiw-step__desc">
                  Confirm the sources, expected output, fees, and price impact
                  before signing. Need to change something? You can go back to
                  adjust your sources.
                </p>
              </button>
            </div>
            <div role="presentation" style={getStepStyle(2)}>
              <button
                aria-selected={activeStep === 2}
                className={`hiw-step ${activeStep === 2 ? "hiw-step--active" : ""}`}
                id="hiw-step-2"
                onClick={() => setActiveStep(2)}
                onKeyDown={(e) => handleHiwKeyDown(e, 2)}
                role="tab"
                tabIndex={activeStep === 2 ? 0 : -1}
                type="button"
              >
                <span aria-hidden="true" className="hiw-step__num">
                  03
                </span>
                <span className="hiw-step__label">STEP 03</span>
                <span className="hiw-step__heading">
                  Approve &amp; Swap is Complete
                </span>
                <p className="hiw-step__desc">
                  Confirm each source asset in your wallet. FastBridge delivers
                  your funds to the destination in ~20 seconds with no native
                  gas required.
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section
        aria-labelledby="blog-carousel-heading"
        className="blog"
        data-reveal
        id="blog"
      >
        <div className="blog__container">
          <header className="blog__header" id="blog-carousel-heading">
            <div className="blog__header-content">
              <h2 className="blog__title">
                <span className="blog__title-lead">What's happening</span>
                <em>
                  Check out the latest
                  <span className="blog__title-br" /> from us.
                </em>
              </h2>
            </div>
            <a
              className="section-btn blog__header-btn"
              href="https://blog.availproject.org/tag/fastbridge/"
              rel="noopener noreferrer"
              target="_blank"
            >
              View all Blogs
            </a>
          </header>

          <div className="blog__body">
            <div className="squeezy-carousel" id="blog-squeezy">
              <canvas
                className="squeezy-carousel__canvas"
                id="blog-squeezy-canvas"
                ref={canvasRef}
              />

              <div
                className="squeezy-carousel__items-details-container"
                id="blog-meta-container"
              >
                <div className="squeezy-carousel__meta-track">
                  {BLOG_ITEMS.map((item, index) => {
                    const isActive = index === activeBlogIndex;
                    return (
                      <div
                        aria-hidden={!isActive}
                        className="squeezy-carousel__item-details"
                        id={`blog-meta-slide-${index}`}
                        key={item.id}
                        role="tabpanel"
                        style={{
                          transitionDuration: "1000ms",
                          transform: `translateX(${-100 * index}%)`,
                          opacity: isActive ? 1 : 0,
                          pointerEvents: isActive ? "auto" : "none",
                        }}
                      >
                        <div className="squeezy-carousel__item-copy">
                          <h3 className="blog__meta-title">{item.title}</h3>
                        </div>
                        <a
                          className="blog__read"
                          href={item.href}
                          onFocus={() => selectIndex(index)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          rel="noopener noreferrer"
                          tabIndex={isActive ? 0 : -1}
                          target="_blank"
                        >
                          {item.cta}
                        </a>
                      </div>
                    );
                  })}
                </div>

                <div className="blog__nav">
                  <button
                    aria-label="Previous post"
                    className="blog__nav-btn"
                    onClick={handleBlogPrev}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="20"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="20"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    aria-label="Next post"
                    className="blog__nav-btn"
                    onClick={handleBlogNext}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="20"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="20"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile scroll track */}
            <ul
              className="blog__scroller"
              onScroll={handleScrollerScroll}
              ref={scrollerRef}
            >
              {BLOG_ITEMS.map((item) => (
                <li className="blog-card" key={item.id}>
                  <a
                    className="blog-card__link"
                    href={item.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span className="blog-card__media">
                      <img alt="" loading="lazy" src={item.imgSrc} />
                    </span>
                    <span className="blog-card__title">{item.title}</span>
                    <span className="blog-card__read">{item.cta}</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="blog__footer">
              <div className="blog__dots">
                {BLOG_ITEMS.map((item, index) => (
                  <button
                    aria-label={`Go to post ${index + 1}`}
                    className={`blog__dot ${index === mobileActiveIndex ? "blog__dot--active" : ""}`}
                    key={item.id}
                    onClick={() => handleMobileDotClick(index)}
                    type="button"
                  />
                ))}
              </div>
              <a
                className="section-btn blog__footer-btn"
                href="https://blog.availproject.org/tag/fastbridge/"
                rel="noopener noreferrer"
                target="_blank"
              >
                View all Blogs
              </a>
            </div>
          </div>
        </div>

        <p
          aria-atomic="true"
          aria-live="polite"
          className="visually-hidden"
          id="blog-carousel-live"
        />
      </section>

      {/* FAQ Section */}
      <section aria-labelledby="faq-title" className="faq" data-reveal id="faq">
        <header className="faq__intro" data-reveal="slide-right">
          <div className="faq__heading">
            <h2 className="faq__title" id="faq-title">
              All your questions
              <em>Answered here</em>
            </h2>
            <p className="faq__subtitle faq__subtitle--desktop">
              Answers to all your questions, quickly and clearly
            </p>
            <p className="faq__subtitle faq__subtitle--mobile">
              Discover guides, tips, and resources to inspire your next big
              idea.
            </p>
          </div>
          <Link className="section-btn faq__header-btn" to="/faqs">
            View More
          </Link>
        </header>

        <div className="faq__list" data-reveal-stagger>
          {[
            {
              q: "What is Avail FastBridge?",
              a: "FastBridge is a unified cross-chain bridge that lets you move stablecoins and tokens from multiple source chains to any supported destination chain in a single transaction. Unlike traditional bridges, you don't need to manage gas on each chain or bridge one chain at a time; FastBridge aggregates your balances so you arrive ready to trade.",
            },
            {
              q: "What is the relationship between Avail and FastBridge?",
              a: "FastBridge is built by Avail as a fully standalone bridging interface you can use today to move stablecoins across any supported EVM chain in seconds. At the same time, FastBridge is also a live demonstration of what Avail Nexus is capable of, which is why developers can embed the same bridging experience directly into their own apps via the Nexus SDK. The Avail team continues to build secure and scalable infrastructure for the next generation of both applications and users through its products: Avail Nexus, Avail DA and now, FastBridge.",
            },
            {
              q: "How is FastBridge different from other bridges?",
              a: "Most bridges move funds from one chain to one other chain. FastBridge aggregates your balances across multiple source chains and settles them at the destination chain in a single transaction. Avail Nexus' protocol handles routing and settlement through intent-based execution, which allows users to pay gas in stablecoins. No need to hold native gas tokens on each source chain.",
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
              a: "Most transactions settle in approx. 10-20 seconds. Settlement time can vary slightly depending on the destination chain's block confirmation speed, but FastBridge is designed for near-instant delivery compared to traditional lock-and-mint bridges that can take minutes to hours.",
            },
          ].map((item, index) => {
            const open = homeOpenFaq === index;
            return (
              <article
                className={`faq-item ${open ? "faq-item--open" : ""}`}
                data-reveal-child
                key={item.q}
              >
                <button
                  aria-controls={`faq-answer-${index}`}
                  aria-expanded={open}
                  className="faq-item__question"
                  id={`faq-question-${index}`}
                  onClick={() => setHomeOpenFaq(open ? null : index)}
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
                  aria-labelledby={`faq-question-${index}`}
                  className="faq-item__answer"
                  id={`faq-answer-${index}`}
                  style={{ display: open ? "block" : "none" }}
                >
                  <p>{item.a}</p>
                </section>
              </article>
            );
          })}
        </div>

        <div className="faq__footer">
          <Link className="section-btn faq__footer-btn" to="/faqs">
            View More
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer" data-reveal="fade" id="footer">
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
