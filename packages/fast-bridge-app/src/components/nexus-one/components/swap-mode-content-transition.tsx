import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import type { SwapType } from "../types";

interface SwapModeContentTransitionProps {
  children: ReactNode;
  mode: SwapType;
}

export function SwapModeContentTransition({
  children,
  mode,
}: SwapModeContentTransitionProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    const updateHeight = () => {
      setContentHeight(Math.ceil(content.getBoundingClientRect().height));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [mode]);

  return (
    <div
      style={{
        height: contentHeight === null ? "auto" : `${contentHeight}px`,
        overflow: "hidden",
        transition: "height 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        width: "100%",
        willChange: "height",
      }}
    >
      <div
        className="animate-in fade-in duration-200"
        key={mode}
        ref={contentRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "7px",
          width: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}
