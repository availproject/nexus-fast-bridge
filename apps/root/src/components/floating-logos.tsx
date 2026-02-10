import { TOKEN_IMAGES } from "@/lib/constant";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const animationRef = useRef<number | null>(null);
  const [, forceUpdate] = useState({});

  // Initialize floating logos
  useEffect(() => {
    const tokenSymbols = Object.keys(TOKEN_IMAGES);
    const logos: FloatingLogoData[] = [];
    let id = 0;

    // Add token logos
    const shuffledTokens = [
      ...tokenSymbols,
      ...tokenSymbols,
      ...tokenSymbols,
    ].sort(() => Math.random() - 0.5);
    shuffledTokens.forEach((symbol) => {
      logos.push({
        id: id++,
        x: Math.random() * 110 - 15,
        y: Math.random() * 110 - 20,
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
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[1] hidden overflow-hidden md:block"
    >
      {logosRef.current.map((logo) => (
        <motion.div
          key={logo.id}
          className={`pointer-events-none absolute overflow-hidden rounded-full transition-transform duration-100 linear will-change-[transform,left,top] motion-reduce:hidden ${
            logo.type === "chain" ? "grayscale-[30%]" : "grayscale-[50%]"
          }`}
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
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default FloatingLogos;
