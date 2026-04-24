import { Turnstile } from "@marsidev/react-turnstile";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function ContactPage() {
  const [cssLoaded, setCssLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const handleBridgeClick = () => {
    navigate("/");
  };

  useEffect(() => {
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
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const honeypot = formData.get("website") as string;

    // If the honeypot is filled out, pretend it was successful and silently return
    if (honeypot) {
      setSubmitted(true);
      setIsSubmitting(false);
      return;
    }

    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      telegram: formData.get("telegram") as string,
      message: formData.get("message") as string,
      timestamp: new Date().toISOString(),
      turnstileToken, // Send token to backend for verification
    };

    // Validate required fields
    if (
      !(
        data.name &&
        data.email &&
        data.message &&
        (turnstileToken || isLocalhost)
      )
    ) {
      setError("Please fill in all required fields and complete the captcha.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Google Apps Script Web App endpoint
      // To set this up: create a Google Sheet, go to Extensions > Apps Script,
      // paste the doPost handler, deploy as web app.
      // For now, we use a mailto fallback since we need the sheet URL from the team.
      const GOOGLE_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbwtdbHQH6JWv-Ne81Deh72VuKeDQOu9d8FQy48d0k6lDif0wCdHPw8dfE0Ad3dJxo_M/exec";

      if (GOOGLE_SCRIPT_URL.includes("PLACEHOLDER")) {
        // Fallback: open mailto with form data
        const mailtoUrl = `mailto:support@availproject.org?subject=${encodeURIComponent(
          data.subject || "FastBridge Contact Form"
        )}&body=${encodeURIComponent(
          `Name: ${data.name}\nEmail: ${data.email}\n\n${data.message}`
        )}`;
        window.open(mailtoUrl, "_blank");
        setSubmitted(true);
      } else {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          setSubmitted(true);
        } else {
          setError(result.error || "Form submission failed. Please try again.");
          setIsSubmitting(false);
        }
      }
    } catch {
      setError(
        "Something went wrong. Please try again or email us directly at support@availproject.org"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="page faqs-page-wrapper"
      style={{
        opacity: cssLoaded ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      {/* Hero */}
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
          <h1 className="faqs-hero-heading">Get in Touch</h1>
          <p className="faqs-hero-description">
            Have a question, partnership inquiry, or feedback? We&apos;d love to
            hear from you.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="contact-form-section">
        <div className="contact-form-container">
          {submitted ? (
            <div className="contact-success">
              <div className="contact-success-icon">
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="48"
                  viewBox="0 0 48 48"
                  width="48"
                >
                  <circle cx="24" cy="24" fill="#e8f5e9" r="24" />
                  <path
                    d="M14 24l7 7 13-13"
                    stroke="#4caf50"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                </svg>
              </div>
              <h2 className="contact-success-title">
                Thank you for reaching out!
              </h2>
              <p className="contact-success-text">
                We&apos;ve received your message and will get back to you as
                soon as possible.
              </p>
              <Link className="btn-primary" to="/">
                Back to Home
              </Link>
            </div>
          ) : (
            <form
              className="contact-form"
              onSubmit={handleSubmit}
              ref={formRef}
            >
              {/* Honeypot Field (Hidden from real users, filled by dumb bots) */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  top: "-9999px",
                }}
              >
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} type="text" />
              </div>

              <div className="contact-form-row">
                <div className="contact-field">
                  <label className="contact-label" htmlFor="contact-name">
                    Name <span className="contact-required">*</span>
                  </label>
                  <input
                    autoComplete="name"
                    className="contact-input"
                    id="contact-name"
                    name="name"
                    placeholder="Your name"
                    required
                    type="text"
                  />
                </div>
                <div className="contact-field">
                  <label className="contact-label" htmlFor="contact-email">
                    Email <span className="contact-required">*</span>
                  </label>
                  <input
                    autoComplete="email"
                    className="contact-input"
                    id="contact-email"
                    name="email"
                    pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                    placeholder="you@example.com"
                    required
                    title="Please enter a valid email address"
                    type="email"
                  />
                </div>
              </div>
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-subject">
                  Subject
                </label>
                <select
                  className="contact-input"
                  defaultValue=""
                  id="contact-subject"
                  name="subject"
                  required
                >
                  <option disabled value="">
                    Select a topic
                  </option>
                  <option value="Integration Support">
                    Integration Support
                  </option>
                  <option value="Partnership / Business Development">
                    Partnership / Business Development
                  </option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Report a Bug">Report a Bug</option>
                  <option value="Security / Vulnerability Report">
                    Security / Vulnerability Report
                  </option>
                  <option value="General Inquiry / Feedback">
                    General Inquiry / Feedback
                  </option>
                </select>
              </div>
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-message">
                  Message <span className="contact-required">*</span>
                </label>
                <textarea
                  className="contact-input contact-textarea"
                  id="contact-message"
                  maxLength={1000}
                  name="message"
                  placeholder="Tell us more... (max 1000 characters)"
                  required
                  rows={6}
                />
              </div>
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-telegram">
                  Telegram ID
                </label>
                <input
                  className="contact-input"
                  id="contact-telegram"
                  name="telegram"
                  placeholder="@username (optional)"
                  type="text"
                />
              </div>

              {/* Cloudflare Turnstile */}
              {!isLocalhost && (
                <div className="contact-field mt-4 mb-2">
                  <Turnstile
                    // NOTE: This is Cloudflare's official testing key that always passes.
                    // You MUST replace this with your actual Site Key from the Cloudflare Dashboard!
                    onSuccess={(t) => setTurnstileToken(t)}
                    options={{
                      theme: "light",
                    }}
                    siteKey="0x4AAAAAADBxLiHcrd8rgAJI"
                  />
                </div>
              )}

              {error && <p className="contact-error">{error}</p>}
              <button
                className="btn-primary contact-submit"
                disabled={isSubmitting || !(turnstileToken || isLocalhost)}
                type="submit"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer visible">
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
