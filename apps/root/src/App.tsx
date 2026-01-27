import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight, ExternalLink, Sparkles, Zap, Target } from "lucide-react";
import { chains } from "./chains";
import AvailLogo from "/avail_logo.svg";

// Token images mapping
const TOKEN_IMAGES: Record<string, string> = {
  USDC: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
  USDT: "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
  "USD₮0":
    "https://coin-images.coingecko.com/coins/images/35023/large/USDT.png",
  WETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880",
  USDS: "https://assets.coingecko.com/coins/images/39926/standard/usds.webp?1726666683",
  SOPH: "https://assets.coingecko.com/coins/images/38680/large/sophon_logo_200.png",
  KAIA: "https://assets.coingecko.com/asset_platforms/images/9672/large/kaia.png",
  BNB: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  ETH: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
  POL: "https://coin-images.coingecko.com/coins/images/32440/standard/polygon.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png",
  FUEL: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  HYPE: "https://assets.coingecko.com/asset_platforms/images/243/large/hyperliquid.png",
  DAI: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png?1696509996",
  UNI: "https://coin-images.coingecko.com/coins/images/12504/large/uni.jpg?1696512319",
  AAVE: "https://coin-images.coingecko.com/coins/images/12645/large/AAVE.png?1696512452",
  LDO: "https://coin-images.coingecko.com/coins/images/13573/large/Lido_DAO.png?1696513326",
  PEPE: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776",
  OP: "https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png?1696524385",
  ZRO: "https://coin-images.coingecko.com/coins/images/28206/large/ftxG9_TJ_400x400.jpeg?1696527208",
  OM: "https://assets.coingecko.com/coins/images/12151/standard/OM_Token.png?1696511991",
  KAITO:
    "https://assets.coingecko.com/coins/images/54411/standard/Qm4DW488_400x400.jpg",
};

// Floating logo with collision physics
interface FloatingLogoData {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  imageUrl: string;
  name: string;
  type: "chain" | "token";
  homeX?: number;
  homeY?: number;
}

function FloatingLogos({
  mousePosition,
}: {
  mousePosition: { x: number; y: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<FloatingLogoData[]>([]);
  const animationRef = useRef<number>();
  const [, forceUpdate] = useState({});

  // Initialize floating logos
  useEffect(() => {
    const tokenSymbols = Object.keys(TOKEN_IMAGES);
    const logos: FloatingLogoData[] = [];
    let id = 0;

    // Add token logos
    const shuffledTokens = [...tokenSymbols, ...tokenSymbols].sort(
      () => Math.random() - 0.5,
    );
    shuffledTokens.forEach((symbol, index) => {
      logos.push({
        id: id++,
        x: Math.random() * 110 - 5,
        y: Math.random() * 110 - 15,
        size: 24 + Math.random() * 28, // 24-52px, slightly smaller than chains
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        imageUrl: TOKEN_IMAGES[symbol],
        name: symbol,
        type: "token",
      });
    });

    logosRef.current = logos;
    forceUpdate({});
  }, []);

  // Animation loop with cursor collision and gentle random movement
  const animate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const logos = logosRef.current;
    const cursorRadius = 60;
    const repelForce = 2;
    const friction = 0.96;
    const maxSpeed = 0.8;
    const returnForce = 0.005;
    const time = Date.now() * 0.0005;

    logos.forEach((logo, index) => {
      // Store original position as "home"
      if (logo.homeX === undefined) logo.homeX = logo.x;
      if (logo.homeY === undefined) logo.homeY = logo.y;

      // Convert percentage to pixels for collision
      const logoPx = (logo.x / 100) * rect.width;
      const logoPy = (logo.y / 100) * rect.height;

      // Calculate distance to cursor
      const dx = logoPx - mousePosition.x;
      const dy = logoPy - mousePosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Cursor collision/repulsion (gentler)
      if (distance < cursorRadius + logo.size / 2 && distance > 0) {
        const force =
          (cursorRadius + logo.size / 2 - distance) /
          (cursorRadius + logo.size / 2);
        const angle = Math.atan2(dy, dx);
        logo.vx += Math.cos(angle) * force * repelForce;
        logo.vy += Math.sin(angle) * force * repelForce;
      }

      // Gentle drift movement - very slow and subtle
      const noiseX = Math.sin(time + index * 2) * Math.cos(time * 0.7 + index);
      const noiseY =
        Math.cos(time * 0.8 + index * 1.5) * Math.sin(time * 0.6 + index * 0.8);

      // Minimal random jitter
      const jitter = (Math.random() - 0.5) * 0.03;

      logo.vx += noiseX * 0.008 + jitter;
      logo.vy += noiseY * 0.008 + jitter;

      // Gentle return-to-home force (keeps logos in view)
      const homeDx = logo.homeX - logo.x;
      const homeDy = logo.homeY - logo.y;
      logo.vx += homeDx * returnForce;
      logo.vy += homeDy * returnForce;

      // Apply velocity
      logo.x += (logo.vx / rect.width) * 100;
      logo.y += (logo.vy / rect.height) * 100;

      // Apply friction
      logo.vx *= friction;
      logo.vy *= friction;

      // Clamp speed
      const speed = Math.sqrt(logo.vx * logo.vx + logo.vy * logo.vy);
      if (speed > maxSpeed) {
        logo.vx = (logo.vx / speed) * maxSpeed;
        logo.vy = (logo.vy / speed) * maxSpeed;
      }

      // Soft boundary constraints (gentle push back instead of bounce)
      if (logo.x < 5) {
        logo.vx += 0.02;
      }
      if (logo.x > 95) {
        logo.vx -= 0.02;
      }
      if (logo.y < 5) {
        logo.vy += 0.02;
      }
      if (logo.y > 95) {
        logo.vy -= 0.02;
      }
    });

    forceUpdate({});
    animationRef.current = requestAnimationFrame(animate);
  }, [mousePosition]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <div ref={containerRef} className="floating-logos-container">
      {logosRef.current.map((logo) => (
        <motion.div
          key={logo.id}
          className={`floating-logo ${logo.type}`}
          style={{
            left: `${logo.x}%`,
            top: `${logo.y}%`,
            width: logo.size,
            height: logo.size,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 0.5, delay: Math.random() * 0.5 }}
        >
          <img
            src={logo.imageUrl}
            alt={logo.name}
            className="floating-logo-img"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </motion.div>
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
  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [8, -8]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-8, 8]),
    springConfig,
  );

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
    <h1 className="hero-title bg-white!">
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 30, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.2 + index * 0.04,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ display: "inline-block" }}
          whileHover={{
            scale: 1.2,
            rotate: [0, -5, 5, 0],
            color: "var(--foreground-brand)",
          }}
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
      <Sparkles size={14} />
      <span>Fast & Secure</span>
    </motion.div>
  );
}

export default function App() {
  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="page">
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
          <img src={AvailLogo} alt="Avail" className="navbar-logo" />
          <div className="navbar-divider" />
          <span className="navbar-title">Nexus Fast Bridge</span>
        </motion.div>
        <FloatingBadge />
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Floating logos background */}
        <FloatingLogos mousePosition={mousePosition} />

        <div className="hero-content">
          <AnimatedTitle text="Select your destination" />

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Bridge assets across chains with Avail&apos;s unified
            infrastructure. Fast, secure, and seamless cross-chain transfers.
          </motion.p>

          {/* Quick stats */}
          <motion.div
            className="hero-stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="stat-item">
              <Zap size={16} className="stat-icon" />
              <span className="stat-text">Lightning Fast</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <Target size={16} className="stat-icon" />
              <span className="stat-text">Precise Routing</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Chain Grid */}
      <main className="chain-section">
        <div className="chain-grid">
          {chains.map((chain, index) => {
            if (chain.name === "MegaETH") {
              return null;
            }
            return <ChainCard key={chain.slug} chain={chain} index={index} />;
          })}
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
            <ExternalLink size={12} />
          </motion.a>
        </div>
      </motion.footer>
    </div>
  );
}
