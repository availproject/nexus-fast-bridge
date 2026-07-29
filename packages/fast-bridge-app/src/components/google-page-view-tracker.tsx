"use client";

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { reportGooglePageView } from "@/lib/google-tag";
import { trackSignozEvent } from "@/lib/signoz";

export function GooglePageViewTracker() {
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    trackSignozEvent("fastbridge.page.viewed", {
      "page.has_hash": Boolean(location.hash),
      "page.path": location.pathname,
      "page.query_keys":
        new URLSearchParams(location.search).size > 0
          ? Array.from(new URLSearchParams(location.search).keys()).sort()
          : undefined,
    });

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
