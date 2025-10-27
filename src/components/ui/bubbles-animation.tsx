"use client";

import React, { useEffect, useRef } from "react";

/**
 * BubbleAnimation
 * Minimal React component that implements ONLY the floating bubble animation
 * from the referenced CodePen. Modified to render oblong (wider) bubbles.
 */
export default function BubbleAnimation({
  bubbleColor = "rgb(33, 150, 243)",
  durationMs = 2000,
  width = "max(500px, 50vw)", // wider
  height = "max(200px, 20vw)", // shorter
}) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = mediaQuery.matches;

    const timeouts = new Set<number>();

    const animateBubble = (x: number) => {
      if (reduced) return;
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.style.left = `${x}px`;
      bubble.style.backgroundColor = bubbleColor;
      bubble.style.width = width;
      bubble.style.height = height;
      wrapper.appendChild(bubble);
      const to = window.setTimeout(() => {
        bubble.remove();
        timeouts.delete(to);
      }, durationMs);
      timeouts.add(to);
    };

    const handleMove = (e: MouseEvent) => animateBubble(e.clientX);
    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      timeouts.forEach((id) => window.clearTimeout(id));
      timeouts.clear();
      Array.from(wrapper.children).forEach((el) => el.remove());
    };
  }, [bubbleColor, durationMs, width, height]);

  return (
    <div>
      {/* Animation layer only */}
      <div id="bubble-wrapper" ref={wrapperRef} aria-hidden="true" />

      {/* Minimal styles for animation only */}
      <style>{`
        @keyframes wave {
          from, to { transform: translate(-50%, 0%); }
          50% { transform: translate(-50%, -20%); }
        }
        #bubble-wrapper {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .bubble {
          position: absolute;
          top: 100%;
          left: 50%;
          border-radius: 50% / 60%; /* creates oblong shape */
          animation: wave 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion) {
          .bubble { animation: none; display: none; }
        }
      `}</style>
    </div>
  );
}

