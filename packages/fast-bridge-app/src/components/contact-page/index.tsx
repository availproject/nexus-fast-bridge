import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// import { loadLastChain } from "@/providers/runtime-context";

const STYLESHEETS = [
  "/landing-new/base.css",
  "/landing-new/hero.css",
  "/landing-new/sections.css",
  "/landing-new/faq.css",
  "/landing-new/contact.css",
  "/landing-new/button-hovers.css",
];

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwtdbHQH6JWv-Ne81Deh72VuKeDQOu9d8FQy48d0k6lDif0wCdHPw8dfE0Ad3dJxo_M/exec";

interface ContactResponse {
  error?: string;
  success?: boolean;
}

export default function ContactPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitted(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const honeypot = formData.get("website");

    if (typeof honeypot === "string" && honeypot.trim()) {
      setSubmitted(true);
      form.reset();
      return;
    }

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const topic = String(formData.get("topic") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!(name && email && topic && message)) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          email,
          message,
          name,
          subject: topic,
          timestamp: new Date().toISOString(),
          topic,
        }),
      });
      const result = (await response.json()) as ContactResponse;

      if (response.ok && result.success) {
        setSubmitted(true);
        form.reset();
        return;
      }

      setError(result.error || "Form submission failed. Please try again.");
    } catch {
      setError(
        "Something went wrong. Please try again or email us directly at support@availproject.org"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page contact-page">
      <section aria-labelledby="contact-page-title" className="page-hero">
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
          <h1 className="page-hero__title" id="contact-page-title">
            Get in touch
          </h1>
          <p className="page-hero__subtitle">
            Have a question, partnership idea, or want to integrate FastBridge?
            Send us a message.
          </p>
        </div>
      </section>

      <section aria-label="Contact form" className="contact">
        <form className="contact-form" noValidate onSubmit={handleSubmit}>
          <div
            aria-hidden="true"
            style={{ left: "-9999px", position: "absolute", top: "-9999px" }}
          >
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} type="text" />
          </div>

          <div className="contact-form__row">
            <div className="contact-field">
              <label className="contact-field__label" htmlFor="contact-name">
                Full name
              </label>
              <input
                autoComplete="name"
                className="contact-field__input"
                id="contact-name"
                name="name"
                placeholder="Your name"
                required
                type="text"
              />
            </div>
            <div className="contact-field">
              <label className="contact-field__label" htmlFor="contact-email">
                Email
              </label>
              <input
                autoComplete="email"
                className="contact-field__input"
                id="contact-email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
          </div>

          <div className="contact-field">
            <label className="contact-field__label" htmlFor="contact-topic">
              Topic
            </label>
            <select
              className="contact-field__select"
              defaultValue="general"
              id="contact-topic"
              name="topic"
            >
              <option value="general">General inquiry</option>
              <option value="integration">Integration / partnership</option>
              <option value="support">Technical support</option>
              <option value="press">Press &amp; media</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="contact-field">
            <label className="contact-field__label" htmlFor="contact-message">
              Message
            </label>
            <textarea
              className="contact-field__textarea"
              id="contact-message"
              name="message"
              placeholder="How can we help?"
              required
            />
          </div>

          <div className="contact-form__actions">
            <button
              className="section-btn contact-form__submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </button>
          </div>

          {error && (
            <p className="contact-form__success" role="alert">
              {error}
            </p>
          )}
          {submitted && (
            <output
              className="contact-form__success"
              style={{ display: "block" }}
            >
              Thanks - your message has been sent. We&apos;ll get back to you
              soon.
            </output>
          )}
        </form>
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
