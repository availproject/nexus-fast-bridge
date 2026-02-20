"use client";
import { useCallback, useEffect, useRef } from "react";

// Fluffey SVG natural dimensions
const SVG_WIDTH = 148;

// Rendered display size
const DISPLAY_WIDTH = 300;
const SCALE = DISPLAY_WIDTH / SVG_WIDTH;

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
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (
        !(containerRef.current && leftIrisRef.current && rightIrisRef.current)
      ) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();

      // Midpoint between both eyes in viewport coordinates
      const eyeMidX = rect.left + ((LEFT_EYE.x + RIGHT_EYE.x) / 2) * SCALE;
      const eyeMidY = rect.top + ((LEFT_EYE.y + RIGHT_EYE.y) / 2) * SCALE;

      const dx = e.clientX - eyeMidX;
      const dy = e.clientY - eyeMidY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) {
        return;
      }

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
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
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
      className="fluffey-wrapper pointer-events-none fixed bottom-0 z-10"
      style={{ width: DISPLAY_WIDTH }}
    >
      <div
        className="relative"
        ref={containerRef}
        style={{
          animation: "fluffyPopUp 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {/* Irises behind Fluffey — visible through transparent eye holes */}
        <img
          alt=""
          className="absolute"
          height={IRIS_SIZE}
          ref={leftIrisRef}
          src="https://files.availproject.org/fastbridge/megaeth/Iris.svg"
          style={{
            width: IRIS_SIZE,
            height: IRIS_SIZE,
            left: leftIrisPos.left,
            top: leftIrisPos.top,
            zIndex: 1,
          }}
          width={IRIS_SIZE}
        />
        <img
          alt=""
          className="absolute"
          height={IRIS_SIZE}
          ref={rightIrisRef}
          src="https://files.availproject.org/fastbridge/megaeth/Iris.svg"
          style={{
            width: IRIS_SIZE,
            height: IRIS_SIZE,
            left: rightIrisPos.left,
            top: rightIrisPos.top,
            zIndex: 1,
          }}
          width={IRIS_SIZE}
        />
        {/* Fluffey body on top — eye holes are transparent cutouts */}
        <img
          alt="Fluffey"
          className="relative h-full w-full"
          draggable={false}
          height={DISPLAY_WIDTH}
          src="https://files.availproject.org/fastbridge/megaeth/Fluffey.svg"
          style={{ zIndex: 2 }}
          width={DISPLAY_WIDTH}
        />
      </div>
    </div>
  );
}
