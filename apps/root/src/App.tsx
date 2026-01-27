import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { chains } from "./chains";
import AvailLogo from "/avail_logo.svg";

// Chain card component
function ChainCard({
  chain,
  index,
}: {
  chain: (typeof chains)[0];
  index: number;
}) {
  const [imageError, setImageError] = useState(false);
  const primaryColor = chain.primaryColor ?? "#2563eb";

  // Determine if color is light or dark for fallback text
  const isLightColor = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 128;
  };

  const primaryIsLight = isLightColor(primaryColor);

  return (
    <motion.div
      className="chain-card-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <a href={chain.basePath} className="chain-card">
        <div className="card-content">
          {/* Chain Logo */}
          <div className="chain-logo-wrapper">
            {!imageError && chain.logoUrl ? (
              <img
                src={chain.logoUrl}
                alt={`${chain.name} logo`}
                className="chain-logo"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="chain-logo-fallback"
                style={{
                  background: primaryColor,
                  color: primaryIsLight ? "#111827" : "#ffffff",
                }}
              >
                {chain.name[0]}
              </div>
            )}
          </div>

          {/* Chain Info */}
          <div className="chain-info">
            <h3 className="chain-name">{chain.name}</h3>
            {chain.description && (
              <p className="chain-description">{chain.description}</p>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="card-footer">
          <span className="chain-path">{chain.basePath}</span>
          <div className="enter-button">
            <span>Launch</span>
            <ArrowRight className="enter-icon" size={14} />
          </div>
        </div>
      </a>
    </motion.div>
  );
}

export default function App() {
  return (
    <div className="page">
      {/* Navbar */}
      <motion.nav
        className="navbar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="navbar-brand">
          <img src={AvailLogo} alt="Avail" className="navbar-logo" />
          <div className="navbar-divider" />
          <span className="navbar-title">Nexus Fast Bridge</span>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        className="hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="hero-content">
          <h1 className="hero-title">Select your destination</h1>
          <p className="hero-subtitle">
            Bridge assets across chains with Avail's unified infrastructure.
            Fast, secure, and seamless cross-chain transfers.
          </p>
        </div>
      </motion.section>

      {/* Chain Grid */}
      <main className="chain-section">
        <div className="chain-grid">
          {chains.map((chain, index) => (
            <ChainCard key={chain.slug} chain={chain} index={index} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <motion.footer
        className="footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="footer-content">
          <span className="footer-text">Powered by</span>
          <a
            href="https://availproject.org"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <img src={AvailLogo} alt="Avail" className="footer-logo" />
            <ExternalLink size={12} />
          </a>
        </div>
      </motion.footer>
    </div>
  );
}
