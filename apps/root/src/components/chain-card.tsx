import { ArrowRight } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { chains } from "../chains";

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
      className="h-full"
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
        <a
          href={chain.basePath}
          className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--card-background)] p-5 text-inherit no-underline [transform-style:preserve-3d] transition-[transform,box-shadow,border-color] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--blue-300)] hover:shadow-[0_20px_50px_-12px_hsla(214,92%,48%,0.2),0_8px_24px_-8px_hsla(0,0%,0%,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)] md:min-h-[200px] md:p-6"
        >
          {/* Animated border glow */}
          <motion.div
            className="pointer-events-none absolute -inset-[2px] rounded-[14px] border-2 border-[var(--blue-400)] opacity-0"
            animate={{
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          />

          <div className="flex flex-1 items-start gap-4 md:gap-5">
            {/* Chain Logo with bounce animation */}
            <motion.div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--background-secondary)] p-2.5 transition-[background-color,border-color,transform] duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:border-[var(--blue-200)] group-hover:bg-[var(--background-tertiary)] md:h-[72px] md:w-[72px] md:p-3"
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
                  className="h-full w-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded text-[28px] font-bold"
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
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <motion.h3
                className="m-0 text-lg font-semibold tracking-[-0.01em] text-[var(--foreground-primary)] [font-family:var(--font-display)] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] md:text-xl"
                animate={{
                  x: isHovered ? 4 : 0,
                }}
                transition={{ duration: 0.2 }}
              >
                {chain.name}
              </motion.h3>
              {chain.description && (
                <motion.p
                  className="m-0 text-sm font-normal leading-[1.5] text-[var(--foreground-secondary)] transition-opacity duration-200"
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
          <div className="mt-5 flex items-center justify-between border-t border-[var(--border-default)] pt-4">
            <motion.span
              className="inline-flex items-center rounded px-2.5 py-1.5 text-xs font-medium text-[var(--foreground-muted)] [font-family:var(--font-mono)]"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--button-primary-background)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-foreground)] transition-[background-color,transform,gap] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:bg-[var(--blue-600)]"
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
                <ArrowRight size={14} />
              </motion.div>
            </motion.div>
          </div>
        </a>
      </motion.div>
    </motion.div>
  );
}
export default ChainCard;
