import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { chains } from "./chains";
import AvailLogo from "/avail_logo.svg";

// Animated background dots
function BackgroundDots() {
  return (
    <div className="background-dots">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="dot"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, Math.random() * 100 + "%"],
            x: [null, Math.random() * 100 + "%"],
          }}
          transition={{
            duration: Math.random() * 20 + 15,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{
            opacity: Math.random() * 0.3 + 0.1,
          }}
        />
      ))}
    </div>
  );
}

// Chain card component with interactive tilt
function ChainCard({
  chain,
  index,
}: {
  chain: (typeof chains)[0];
  index: number;
}) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryColor = chain.primaryColor ?? "#2563eb";

  // Mouse position for tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animation for tilt
  const springConfig = { damping: 25, stiffness: 200 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

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
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={cardRef}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        <a href={chain.basePath} className="chain-card">
          {/* Animated border glow */}
          <motion.div
            className="card-glow"
            animate={{
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          />

          <div className="card-content">
            {/* Chain Logo with bounce animation */}
            <motion.div
              className="chain-logo-wrapper"
              animate={{
                scale: isHovered ? 1.1 : 1,
                rotate: isHovered ? [0, -5, 5, 0] : 0,
              }}
              transition={{
                scale: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
                rotate: { duration: 0.5, ease: "easeInOut" },
              }}
            >
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
            </motion.div>

            {/* Chain Info */}
            <div className="chain-info">
              <motion.h3
                className="chain-name"
                animate={{
                  x: isHovered ? 4 : 0,
                }}
                transition={{ duration: 0.2 }}
              >
                {chain.name}
              </motion.h3>
              {chain.description && (
                <motion.p
                  className="chain-description"
                  animate={{
                    opacity: isHovered ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {chain.description}
                </motion.p>
              )}
            </div>
          </div>

          {/* Card Footer */}
          <div className="card-footer">
            <motion.span
              className="chain-path"
              animate={{
                backgroundColor: isHovered
                  ? "var(--background-tertiary)"
                  : "var(--background-secondary)",
              }}
              transition={{ duration: 0.2 }}
            >
              {chain.basePath}
            </motion.span>
            <motion.div
              className="enter-button"
              animate={{
                scale: isHovered ? 1.05 : 1,
                gap: isHovered ? 10 : 6,
              }}
              transition={{
                duration: 0.2,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <span>Launch</span>
              <motion.div
                animate={{
                  x: isHovered ? 4 : 0,
                  rotate: isHovered ? -45 : 0,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                <ArrowRight className="enter-icon" size={14} />
              </motion.div>
            </motion.div>
          </div>
        </a>
      </motion.div>
    </motion.div>
  );
}

// Animated title text
function AnimatedTitle({ text }: { text: string }) {
  const letters = text.split("");

  return (
    <h1 className="hero-title">
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.2 + index * 0.03,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ display: "inline-block" }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </h1>
  );
}

// Floating badge component
function FloatingBadge() {
  return (
    <motion.div
      className="floating-badge"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      whileHover={{ scale: 1.05 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles size={14} />
      </motion.div>
      <span>Fast & Secure</span>
    </motion.div>
  );
}

export default function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="page">
      {/* Animated background */}
      <BackgroundDots />

      {/* Cursor spotlight effect */}
      <motion.div
        className="cursor-spotlight"
        animate={{
          x: mousePosition.x - 150,
          y: mousePosition.y - 150,
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 200,
          mass: 0.5,
        }}
      />

      {/* Navbar */}
      <motion.nav
        className="navbar"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div
          className="navbar-brand"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <motion.img
            src={AvailLogo}
            alt="Avail"
            className="navbar-logo"
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          />
          <div className="navbar-divider" />
          <span className="navbar-title">Nexus Fast Bridge</span>
        </motion.div>
        <FloatingBadge />
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        className="hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="hero-content">
          <AnimatedTitle text="Select your destination" />
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            Bridge assets across chains with Avail&apos;s unified infrastructure.
            Fast, secure, and seamless cross-chain transfers.
          </motion.p>

          {/* Decorative animated elements */}
          <motion.div
            className="hero-decoration"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <motion.div
              className="decoration-ring"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="decoration-ring decoration-ring-2"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="footer-content">
          <motion.span
            className="footer-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Powered by
          </motion.span>
          <motion.a
            href="https://availproject.org"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            whileHover={{
              scale: 1.05,
              y: -2,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <img src={AvailLogo} alt="Avail" className="footer-logo" />
            <motion.div
              animate={{ rotate: [0, 0, 360] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut",
              }}
            >
              <ExternalLink size={12} />
            </motion.div>
          </motion.a>
        </div>
      </motion.footer>
    </div>
  );
}
