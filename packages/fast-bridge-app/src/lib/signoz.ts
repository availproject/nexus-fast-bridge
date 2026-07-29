import {
  type AnyValue,
  type AnyValueMap,
  type Logger,
  logs,
  SeverityNumber,
} from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";

const CLIENT_ID_STORAGE_KEY = "nexus-client-id";
const LOGGER_NAME = "nexus-v2-telemetry-logger";
const SERVICE_NAME = "nexus-sdk-v2-logs";
const SIGNOZ_LOGS_URL = "https://otel2.avail.so/v1/logs";
const SIGNOZ_HEADERS = { "x-otlp-force-fetch": "1" } as const;

const MAX_ARRAY_LENGTH = 32;
const MAX_DEPTH = 4;
const MAX_PENDING_LOGS = 250;
const MAX_STRING_LENGTH = 2000;
const MAX_TEXT_LENGTH = 160;
const REDACTED = "[redacted]";
const DEPTH_OVERFLOW = "[depth>4]";
const HEX_REDACT_LENGTH = 12;
const LONG_HEX_PATTERN = /^0x[0-9a-f]+$/i;
const URL_SUFFIX_PATTERN = /[?#]/u;
const TELEMETRY_DIAGNOSTIC_PATTERN =
  /opentelemetry|otlp|signoz|telemetry (?:export|init)/i;

const SENSITIVE_KEYS = new Set([
  "accesstoken",
  "apikey",
  "authorization",
  "cookie",
  "idtoken",
  "mnemonic",
  "password",
  "privatekey",
  "refreshtoken",
  "secret",
  "secretkey",
  "signature",
  "signatures",
]);
const HEX_BLOB_KEYS = new Set(["abi", "bytecode", "calldata", "data"]);

type SignozEventAttributes = Record<string, unknown>;

interface PendingLog {
  attributes: AnyValueMap;
  body: string;
  severityNumber: SeverityNumber;
  severityText: string;
}

interface SignozInitializationOptions {
  network?: string;
}

let initInFlight: Promise<void> | null = null;
let instrumentationInstalled = false;
let loggerProvider: LoggerProvider | null = null;
let telemetryLogger: Logger | null = null;
let sessionId = "";
const pendingLogs: PendingLog[] = [];

const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

const bytesToHex = (bytes: Uint8Array): string => {
  let hex = "0x";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
};

const generateIdentifier = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

const getOrGenerateClientId = (): string => {
  try {
    const existingClientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existingClientId) {
      return existingClientId;
    }

    const clientId = generateIdentifier();
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
    return clientId;
  } catch {
    return generateIdentifier();
  }
};

const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = generateIdentifier();
  }
  return sessionId;
};

const truncateString = (
  value: string,
  maxLength = MAX_STRING_LENGTH
): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const truncateHex = (value: string): string =>
  `${value.slice(0, 6)}…${value.slice(-4)}`;

const isLongHex = (value: unknown): value is string =>
  typeof value === "string" &&
  LONG_HEX_PATTERN.test(value) &&
  value.length > HEX_REDACT_LENGTH;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const looksLikeProvider = (value: object): boolean =>
  ("request" in value &&
    typeof (value as { request: unknown }).request === "function") ||
  ("send" in value && typeof (value as { send: unknown }).send === "function");

const shouldDropValue = (value: unknown): boolean => {
  if (typeof value === "function") {
    return true;
  }
  if (value instanceof Promise || value instanceof WeakMap) {
    return true;
  }
  if (value instanceof WeakSet) {
    return true;
  }
  return (
    typeof value === "object" && value !== null && looksLikeProvider(value)
  );
};

const sanitizeArray = (value: unknown[], depth: number): unknown[] => {
  const values = value
    .slice(0, MAX_ARRAY_LENGTH)
    .map((item) => sanitizeSignozValue(item, depth + 1));
  if (value.length > MAX_ARRAY_LENGTH) {
    values.push(`…(${value.length - MAX_ARRAY_LENGTH} more)`);
  }
  return values;
};

const sanitizeRecord = (
  value: Record<string, unknown>,
  depth: number
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(normalizedKey)) {
      sanitized[key] = REDACTED;
      continue;
    }
    if (HEX_BLOB_KEYS.has(normalizedKey) && isLongHex(rawValue)) {
      sanitized[key] = `[hex:${rawValue.length}B]`;
      continue;
    }
    if (!shouldDropValue(rawValue)) {
      sanitized[key] = sanitizeSignozValue(rawValue, depth + 1);
    }
  }
  return sanitized;
};

export const sanitizeSignozValue = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) {
    return DEPTH_OVERFLOW;
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "string") {
    return isLongHex(value) ? truncateHex(value) : truncateString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Error) {
    return {
      message: truncateString(value.message),
      name: value.name || "Error",
      stack: value.stack?.split("\n").slice(0, 5).join("\n"),
    };
  }
  if (shouldDropValue(value)) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return sanitizeArray(value, depth);
  }
  if (isRecord(value)) {
    return sanitizeRecord(value, depth);
  }
  return truncateString(String(value));
};

const safeStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === "bigint") {
        return nestedValue.toString();
      }
      if (typeof nestedValue === "object" && nestedValue !== null) {
        if (seen.has(nestedValue)) {
          return "[Circular]";
        }
        seen.add(nestedValue);
      }
      return nestedValue;
    });
  } catch {
    return String(value);
  }
};

const toAttributeValue = (value: unknown): AnyValue | undefined => {
  const sanitized = sanitizeSignozValue(value);
  if (sanitized === undefined) {
    return undefined;
  }
  if (
    sanitized === null ||
    typeof sanitized === "string" ||
    typeof sanitized === "number" ||
    typeof sanitized === "boolean"
  ) {
    return sanitized;
  }
  return safeStringify(sanitized);
};

const getPagePath = (): string =>
  typeof window === "undefined" ? "" : window.location.pathname;

const normalizeAttributes = (
  attributes: SignozEventAttributes = {}
): AnyValueMap => {
  const normalized: AnyValueMap = {
    "app.name": "nexus-fastbridge",
    "fastbridge.session.id": getSessionId(),
    "page.path": getPagePath(),
  };

  for (const [key, value] of Object.entries(attributes)) {
    const attributeValue = toAttributeValue(value);
    if (attributeValue !== undefined) {
      normalized[key] = attributeValue;
    }
  }

  return normalized;
};

const emitLog = (log: PendingLog): void => {
  if (!telemetryLogger) {
    if (pendingLogs.length >= MAX_PENDING_LOGS) {
      pendingLogs.shift();
    }
    pendingLogs.push(log);
    return;
  }

  try {
    telemetryLogger.emit(log);
  } catch (error) {
    originalConsoleError(
      "Fastbridge SigNoz log emission failed without affecting the app.",
      error
    );
  }
};

const severityText = (severityNumber: SeverityNumber): string => {
  if (severityNumber >= SeverityNumber.ERROR) {
    return "ERROR";
  }
  if (severityNumber >= SeverityNumber.WARN) {
    return "WARN";
  }
  if (severityNumber >= SeverityNumber.INFO) {
    return "INFO";
  }
  return "DEBUG";
};

export const trackSignozEvent = (
  body: string,
  attributes: SignozEventAttributes = {},
  severityNumber = SeverityNumber.INFO
): void => {
  emitLog({
    attributes: normalizeAttributes({
      "event.name": body,
      ...attributes,
    }),
    body,
    severityNumber,
    severityText: severityText(severityNumber),
  });
};

const getErrorAttributes = (error: unknown): SignozEventAttributes => {
  if (error instanceof Error) {
    const errorWithMetadata = error as Error & {
      category?: unknown;
      code?: unknown;
      context?: unknown;
      details?: unknown;
    };
    return {
      "error.category": errorWithMetadata.category,
      "error.code": errorWithMetadata.code,
      "error.context": errorWithMetadata.context,
      "error.details": errorWithMetadata.details,
      "error.message": error.message,
      "error.name": error.name || "Error",
      "error.stack": error.stack?.split("\n").slice(0, 5).join("\n"),
    };
  }

  return {
    "error.message": String(error),
    "error.name": "Error",
  };
};

export const trackSignozError = (
  operation: string,
  error: unknown,
  attributes: SignozEventAttributes = {}
): void => {
  trackSignozEvent(
    "fastbridge.operation.failed",
    {
      operation,
      ...getErrorAttributes(error),
      ...attributes,
    },
    SeverityNumber.ERROR
  );
};

export const trackNexusSdkEvent = (
  event: unknown,
  attributes: SignozEventAttributes = {}
): void => {
  const eventRecord = isRecord(event) ? event : {};
  const eventState = String(eventRecord.state ?? "").toLowerCase();
  const severity =
    eventState === "failed" || eventState === "error"
      ? SeverityNumber.ERROR
      : SeverityNumber.INFO;

  trackSignozEvent(
    "fastbridge.nexus.event",
    {
      "nexus.event.raw": event,
      "nexus.event.state": eventRecord.state,
      "nexus.event.status": eventRecord.status,
      "nexus.event.step_type": eventRecord.stepType,
      "nexus.event.type": eventRecord.type,
      ...attributes,
    },
    severity
  );
};

const sanitizeUrl = (value: string): string => {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(URL_SUFFIX_PATTERN)[0] ?? value;
  }
};

const getEventElement = (event: Event): Element | null => {
  const pathElement = event
    .composedPath()
    .find((item) => item instanceof Element);
  if (pathElement instanceof Element) {
    return pathElement;
  }
  return event.target instanceof Element ? event.target : null;
};

const getInteractiveElement = (event: Event): HTMLElement | null => {
  const element = getEventElement(event);
  if (!element) {
    return null;
  }
  const interactive = element.closest<HTMLElement>(
    "button, a, input, select, textarea, [role='button'], [role='link'], [role='tab'], [role='menuitem']"
  );
  return interactive ?? (element instanceof HTMLElement ? element : null);
};

const getElementAttributes = (
  element: HTMLElement | null
): SignozEventAttributes => {
  if (!element) {
    return {};
  }

  const input = element instanceof HTMLInputElement ? element : null;
  const anchor = element instanceof HTMLAnchorElement ? element : null;
  const text = truncateString(
    (element.getAttribute("aria-label") || element.textContent || "")
      .replace(/\s+/gu, " ")
      .trim(),
    MAX_TEXT_LENGTH
  );

  return {
    "ui.aria_label": element.getAttribute("aria-label"),
    "ui.checked": input?.checked,
    "ui.href": anchor?.href ? sanitizeUrl(anchor.href) : undefined,
    "ui.id": element.id || undefined,
    "ui.name": element.getAttribute("name"),
    "ui.role": element.getAttribute("role"),
    "ui.tag": element.tagName.toLowerCase(),
    "ui.test_id": element.getAttribute("data-testid"),
    "ui.text": text || undefined,
    "ui.type": element.getAttribute("type"),
  };
};

const shouldIgnoreConsoleArguments = (args: unknown[]): boolean =>
  TELEMETRY_DIAGNOSTIC_PATTERN.test(
    args
      .slice(0, 2)
      .map((value) => (typeof value === "string" ? value : ""))
      .join(" ")
  );

const installConsoleTracking = (): void => {
  console.warn = (...args: unknown[]): void => {
    originalConsoleWarn(...args);
    if (!shouldIgnoreConsoleArguments(args)) {
      trackSignozEvent(
        "fastbridge.console.warn",
        { "console.arguments": args },
        SeverityNumber.WARN
      );
    }
  };

  console.error = (...args: unknown[]): void => {
    originalConsoleError(...args);
    if (!shouldIgnoreConsoleArguments(args)) {
      trackSignozEvent(
        "fastbridge.console.error",
        { "console.arguments": args },
        SeverityNumber.ERROR
      );
    }
  };
};

const installUiTracking = (): void => {
  document.addEventListener(
    "click",
    (event) => {
      trackSignozEvent("fastbridge.ui.click", {
        "event.category": "ui",
        ...getElementAttributes(getInteractiveElement(event)),
      });
    },
    true
  );

  document.addEventListener(
    "change",
    (event) => {
      trackSignozEvent("fastbridge.ui.change", {
        "event.category": "ui",
        ...getElementAttributes(getInteractiveElement(event)),
      });
    },
    true
  );

  document.addEventListener(
    "submit",
    (event) => {
      const form = getEventElement(event);
      trackSignozEvent("fastbridge.ui.submit", {
        "event.category": "ui",
        ...getElementAttributes(form instanceof HTMLElement ? form : null),
      });
    },
    true
  );
};

const installErrorTracking = (): void => {
  window.addEventListener(
    "error",
    (event) => {
      if (event.error) {
        trackSignozError("window.error", event.error, {
          "error.filename": event.filename
            ? sanitizeUrl(event.filename)
            : undefined,
          "error.lineno": event.lineno,
          "error.colno": event.colno,
        });
        return;
      }

      const element = getEventElement(event);
      trackSignozEvent(
        "fastbridge.resource.failed",
        {
          "error.message": event.message || "Resource failed to load",
          "resource.url":
            element instanceof HTMLImageElement ||
            element instanceof HTMLScriptElement
              ? sanitizeUrl(element.src)
              : undefined,
          "ui.tag": element?.tagName.toLowerCase(),
        },
        SeverityNumber.ERROR
      );
    },
    true
  );

  window.addEventListener("unhandledrejection", (event) => {
    trackSignozError("window.unhandledrejection", event.reason);
  });
};

const isSignozResource = (name: string): boolean =>
  name.startsWith(SIGNOZ_LOGS_URL);

const installPerformanceTracking = (): void => {
  if (typeof PerformanceObserver === "undefined") {
    return;
  }

  try {
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType !== "resource") {
          continue;
        }
        const resourceEntry = entry as PerformanceResourceTiming;
        if (isSignozResource(resourceEntry.name)) {
          continue;
        }

        const resourceWithStatus =
          resourceEntry as PerformanceResourceTiming & {
            responseStatus?: number;
          };
        const status = resourceWithStatus.responseStatus;
        const severity =
          typeof status === "number" && status >= 400
            ? SeverityNumber.ERROR
            : SeverityNumber.INFO;
        trackSignozEvent(
          "fastbridge.network.request",
          {
            "http.response.status_code": status,
            "network.protocol": resourceEntry.nextHopProtocol,
            "network.request.duration_ms": Math.round(resourceEntry.duration),
            "network.request.initiator": resourceEntry.initiatorType,
            "network.request.url": sanitizeUrl(resourceEntry.name),
            "network.response.decoded_body_size": resourceEntry.decodedBodySize,
            "network.response.encoded_body_size": resourceEntry.encodedBodySize,
            "network.response.transfer_size": resourceEntry.transferSize,
          },
          severity
        );
      }
    });
    resourceObserver.observe({ buffered: true, type: "resource" });
  } catch (error) {
    originalConsoleWarn(
      "Fastbridge resource timing tracking unavailable.",
      error
    );
  }

  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackSignozEvent(
          "fastbridge.performance.long_task",
          {
            "performance.duration_ms": Math.round(entry.duration),
            "performance.entry_type": entry.entryType,
            "performance.name": entry.name,
            "performance.start_time_ms": Math.round(entry.startTime),
          },
          SeverityNumber.WARN
        );
      }
    });
    longTaskObserver.observe({ buffered: true, type: "longtask" });
  } catch {
    // Some browsers do not expose long-task entries.
  }
};

const installLifecycleTracking = (): void => {
  document.addEventListener("visibilitychange", () => {
    trackSignozEvent("fastbridge.document.visibility_changed", {
      "document.visibility_state": document.visibilityState,
    });
    if (document.visibilityState === "hidden") {
      flushSignoz().catch(() => undefined);
    }
  });

  window.addEventListener("pagehide", (event) => {
    trackSignozEvent("fastbridge.session.ended", {
      "session.persisted": event.persisted,
    });
    flushSignoz().catch(() => undefined);
  });
};

const installGlobalInstrumentation = (): void => {
  if (instrumentationInstalled) {
    return;
  }
  instrumentationInstalled = true;
  installConsoleTracking();
  installUiTracking();
  installErrorTracking();
  installPerformanceTracking();
  installLifecycleTracking();
};

const drainPendingLogs = (): void => {
  const logsToEmit = pendingLogs.splice(0);
  for (const pendingLog of logsToEmit) {
    emitLog(pendingLog);
  }
};

export const initializeSignoz = (
  options: SignozInitializationOptions = {}
): Promise<void> => {
  installGlobalInstrumentation();
  if (telemetryLogger) {
    return Promise.resolve();
  }
  if (initInFlight) {
    return initInFlight;
  }

  initInFlight = Promise.resolve().then(() => {
    try {
      loggerProvider = new LoggerProvider({
        resource: resourceFromAttributes({
          "service.name": SERVICE_NAME,
          "client.id": getOrGenerateClientId(),
          origin: window.origin,
          host: window.location.host,
          hostname: window.location.host,
          network: options.network ?? "mainnet",
          "app.name": "nexus-fastbridge",
        }),
        processors: [
          new BatchLogRecordProcessor(
            new OTLPLogExporter({
              url: SIGNOZ_LOGS_URL,
              headers: SIGNOZ_HEADERS,
            })
          ),
        ],
      });
      logs.setGlobalLoggerProvider(loggerProvider);
      telemetryLogger = logs.getLogger(LOGGER_NAME);
      drainPendingLogs();
      trackSignozEvent("fastbridge.app.initialized", {
        "telemetry.collector": SIGNOZ_LOGS_URL,
      });
    } catch (error) {
      loggerProvider = null;
      telemetryLogger = null;
      initInFlight = null;
      originalConsoleError(
        "Fastbridge SigNoz initialization failed; the app will continue.",
        error
      );
    }
  });

  return initInFlight;
};

export const flushSignoz = async (): Promise<void> => {
  if (!loggerProvider) {
    return;
  }
  try {
    await loggerProvider.forceFlush();
  } catch (error) {
    originalConsoleWarn(
      "Fastbridge SigNoz flush failed without affecting the app.",
      error
    );
  }
};
