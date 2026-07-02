"use client";

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { reportGooglePageView } from "@/lib/google-tag";

export function GooglePageViewTracker() {
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    if (previousPathRef.current === null) {
      previousPathRef.current = nextPath;
      return;
    }

    if (previousPathRef.current === nextPath) {
      return;
    }

    previousPathRef.current = nextPath;
    reportGooglePageView(nextPath);
  }, [location.hash, location.pathname, location.search]);

  return null;
}
