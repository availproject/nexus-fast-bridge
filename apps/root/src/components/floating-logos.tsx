import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TOKEN_IMAGES } from "@/lib/constant";

interface FloatingLogoData {
  homeX?: number;
  homeY?: number;
  id: number;
  imageUrl: string;
  name: string;
  size: number;
  type: "chain" | "token";
  vx: number;
  vy: number;
  x: number;
  y: number;
}

const CURSOR_RADIUS = 60;
const REPEL_FORCE = 2;
const FRICTION = 0.96;
const MAX_SPEED = 0.8;
const RETURN_FORCE = 0.005;
const MIN_LOGO_BOUNDARY = 5;
const MAX_LOGO_BOUNDARY = 95;
const BOUNDARY_PUSH = 0.02;

const setLogoHomePosition = (logo: FloatingLogoData) => {
  if (logo.homeX === undefined) {
    logo.homeX = logo.x;
  }
  if (logo.homeY === undefined) {
    logo.homeY = logo.y;
  }
};

const applyCursorRepel = (
  logo: FloatingLogoData,
  mousePosition: { x: number; y: number },
  width: number,
  height: number
) => {
  const logoPx = (logo.x / 100) * width;
  const logoPy = (logo.y / 100) * height;
  const dx = logoPx - mousePosition.x;
  const dy = logoPy - mousePosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const influenceRadius = CURSOR_RADIUS + logo.size / 2;

  if (distance >= influenceRadius || distance === 0) {
    return;
  }

  const force = (influenceRadius - distance) / influenceRadius;
  const angle = Math.atan2(dy, dx);
  logo.vx += Math.cos(angle) * force * REPEL_FORCE;
  logo.vy += Math.sin(angle) * force * REPEL_FORCE;
};

const applyAmbientDrift = (
  logo: FloatingLogoData,
  index: number,
  time: number
) => {
  const noiseX = Math.sin(time + index * 2) * Math.cos(time * 0.7 + index);
  const noiseY =
    Math.cos(time * 0.8 + index * 1.5) * Math.sin(time * 0.6 + index * 0.8);
  const jitter = (Math.random() - 0.5) * 0.03;

  logo.vx += noiseX * 0.008 + jitter;
  logo.vy += noiseY * 0.008 + jitter;
};

const applyReturnForce = (logo: FloatingLogoData) => {
  const homeDx = (logo.homeX ?? logo.x) - logo.x;
  const homeDy = (logo.homeY ?? logo.y) - logo.y;
  logo.vx += homeDx * RETURN_FORCE;
  logo.vy += homeDy * RETURN_FORCE;
};

const applyVelocity = (
  logo: FloatingLogoData,
  width: number,
  height: number
) => {
  logo.x += (logo.vx / width) * 100;
  logo.y += (logo.vy / height) * 100;
};

const applyFriction = (logo: FloatingLogoData) => {
  logo.vx *= FRICTION;
  logo.vy *= FRICTION;
};

const clampLogoSpeed = (logo: FloatingLogoData) => {
  const speed = Math.sqrt(logo.vx * logo.vx + logo.vy * logo.vy);
  if (speed <= MAX_SPEED) {
    return;
  }

  logo.vx = (logo.vx / speed) * MAX_SPEED;
  logo.vy = (logo.vy / speed) * MAX_SPEED;
};

const applyBoundaryForce = (logo: FloatingLogoData) => {
  if (logo.x < MIN_LOGO_BOUNDARY) {
    logo.vx += BOUNDARY_PUSH;
  }
  if (logo.x > MAX_LOGO_BOUNDARY) {
    logo.vx -= BOUNDARY_PUSH;
  }
  if (logo.y < MIN_LOGO_BOUNDARY) {
    logo.vy += BOUNDARY_PUSH;
  }
  if (logo.y > MAX_LOGO_BOUNDARY) {
    logo.vy -= BOUNDARY_PUSH;
  }
};

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
    for (const symbol of shuffledTokens) {
      logos.push({
        id,
        x: Math.random() * 110 - 15,
        y: Math.random() * 110 - 20,
        size: 24 + Math.random() * 28, // 24-52px, slightly smaller than chains
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        imageUrl: TOKEN_IMAGES[symbol],
        name: symbol,
        type: "token",
      });
      id += 1;
    }

    logosRef.current = logos;
    forceUpdate({});
  }, []);

  // Animation loop with cursor collision and gentle random movement
  const animate = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const logos = logosRef.current;
    const time = Date.now() * 0.0005;

    for (const [index, logo] of logos.entries()) {
      setLogoHomePosition(logo);
      applyCursorRepel(logo, mousePosition, rect.width, rect.height);
      applyAmbientDrift(logo, index, time);
      applyReturnForce(logo);
      applyVelocity(logo, rect.width, rect.height);
      applyFriction(logo);
      clampLogoSpeed(logo);
      applyBoundaryForce(logo);
    }

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
      className="pointer-events-none absolute inset-0 z-[1] hidden overflow-hidden md:block"
      ref={containerRef}
    >
      {logosRef.current.map((logo) => (
        <motion.div
          animate={{ opacity: 0.6, scale: 1 }}
          className={`linear pointer-events-none absolute overflow-hidden rounded-full transition-transform duration-100 will-change-[transform,left,top] motion-reduce:hidden ${
            logo.type === "chain" ? "grayscale-[30%]" : "grayscale-[50%]"
          }`}
          initial={{ opacity: 0, scale: 0 }}
          key={logo.id}
          style={{
            left: `${logo.x}%`,
            top: `${logo.y}%`,
            width: logo.size,
            height: logo.size,
          }}
          transition={{ duration: 0.5, delay: Math.random() * 0.5 }}
        >
          <img
            alt={logo.name}
            className="h-full w-full object-cover"
            height={Math.round(logo.size)}
            src={logo.imageUrl}
            width={Math.round(logo.size)}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default FloatingLogos;
