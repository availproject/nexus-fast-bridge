import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EXTERNAL_URL_PATTERN = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

export function withBasePath(url: string | null | undefined): string {
  if (!url) {
    return "";
  }
  if (
    EXTERNAL_URL_PATTERN.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedUrl = url.startsWith("/") ? url.slice(1) : url;

  return `${normalizedBase}${normalizedUrl}`;
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_BASE_URL}${path}`;
}
