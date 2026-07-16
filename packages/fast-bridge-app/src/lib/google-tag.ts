const GOOGLE_TAG_ID = "AW-17965318713";
const CONNECT_WALLET_CONVERSION_ID = `${GOOGLE_TAG_ID}/XXyLCKT5oZscELmExPZC`;

type GoogleTagFunction = (
  command: "event" | "config",
  eventName: string,
  params?: Record<string, unknown>
) => void;

interface GoogleTagWindow extends Window {
  gtag?: GoogleTagFunction;
  gtag_report_conversion?: (url?: string) => boolean;
}

export function reportConnectWalletConversion(): void {
  if (typeof window === "undefined") {
    return;
  }

  const googleTagWindow = window as GoogleTagWindow;
  if (typeof googleTagWindow.gtag_report_conversion === "function") {
    googleTagWindow.gtag_report_conversion();
    return;
  }

  if (typeof googleTagWindow.gtag === "function") {
    googleTagWindow.gtag("event", "conversion", {
      send_to: CONNECT_WALLET_CONVERSION_ID,
    });
  }
}

export function reportGooglePageView(pagePath: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const googleTagWindow = window as GoogleTagWindow;
  if (typeof googleTagWindow.gtag !== "function") {
    return;
  }

  googleTagWindow.gtag("config", GOOGLE_TAG_ID, {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: document.title,
  });
}
