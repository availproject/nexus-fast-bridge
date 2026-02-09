"use client";
import { useCallback, useEffect, useRef } from "react";

// Fluffey SVG natural dimensions
const SVG_WIDTH = 148;
const SVG_HEIGHT = 419;

// Rendered display size
const DISPLAY_WIDTH = 300;
const SCALE = DISPLAY_WIDTH / SVG_WIDTH;
const DISPLAY_HEIGHT = Math.round(SVG_HEIGHT * SCALE);

// Eye centers in SVG coordinate space (derived from the path data)
const LEFT_EYE = { x: 43, y: 186.5 };
const RIGHT_EYE = { x: 104.5, y: 186.25 };

// Iris display size and movement constraints
const IRIS_SIZE = 45;
const MAX_MOVE_X = 20;
const MAX_MOVE_Y = 10;

export default function FluffeyMascot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftIrisRef = useRef<HTMLImageElement>(null);
  const rightIrisRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (
        !containerRef.current ||
        !leftIrisRef.current ||
        !rightIrisRef.current
      )
        return;

      const rect = containerRef.current.getBoundingClientRect();

      // Midpoint between both eyes in viewport coordinates
      const eyeMidX = rect.left + ((LEFT_EYE.x + RIGHT_EYE.x) / 2) * SCALE;
      const eyeMidY = rect.top + ((LEFT_EYE.y + RIGHT_EYE.y) / 2) * SCALE;

      const dx = e.clientX - eyeMidX;
      const dy = e.clientY - eyeMidY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) return;

      // Ramp factor: gradually increase with distance, max out far away
      const factor = Math.min(dist / 300, 1);
      const offsetX = (dx / dist) * MAX_MOVE_X * factor;
      const offsetY = (dy / dist) * MAX_MOVE_Y * factor;

      const transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
      leftIrisRef.current.style.transform = transform;
      rightIrisRef.current.style.transform = transform;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  const leftIrisPos = {
    left: LEFT_EYE.x * SCALE - IRIS_SIZE / 2,
    top: LEFT_EYE.y * SCALE - IRIS_SIZE / 2,
  };
  const rightIrisPos = {
    left: RIGHT_EYE.x * SCALE - IRIS_SIZE / 2,
    top: RIGHT_EYE.y * SCALE - IRIS_SIZE / 2,
  };

  return (
    <div
      className="fluffey-wrapper fixed bottom-0 left-20 z-1 pointer-events-none hidden md:block"
      style={{ width: DISPLAY_WIDTH, transformOrigin: "bottom left" }}
    >
      <div
        ref={containerRef}
        className="relative"
        style={{
          animation: "fluffyPopUp 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {/* Irises behind Fluffey — visible through transparent eye holes */}
        <img
          ref={leftIrisRef}
          src="https://files.availproject.org/fastbridge/megaeth/Iris.svg"
          alt=""
          className="absolute"
          style={{
            width: IRIS_SIZE,
            height: IRIS_SIZE,
            left: leftIrisPos.left,
            top: leftIrisPos.top,
            zIndex: 1,
          }}
        />
        <img
          ref={rightIrisRef}
          src="https://files.availproject.org/fastbridge/megaeth/Iris.svg"
          alt=""
          className="absolute"
          style={{
            width: IRIS_SIZE,
            height: IRIS_SIZE,
            left: rightIrisPos.left,
            top: rightIrisPos.top,
            zIndex: 1,
          }}
        />
        {/* Fluffey body on top — eye holes are transparent cutouts */}
        <img
          src="https://files.availproject.org/fastbridge/megaeth/Fluffey.svg"
          alt="Fluffey"
          className="relative w-full h-full"
          style={{ zIndex: 2 }}
          draggable={false}
        />
      </div>
    </div>
  );
}
