const HEX_PATTERN = /\b(?:0x)?[0-9a-f]{40,}\b/gi;
const URL_PATTERN = /https?:\/\/[^\s"<>]+/gi;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;
const SECRET_MATERIAL =
  /\b(?:mnemonic|seed[ _-]?phrase|private[ _-]?key|passphrase)\b/i;
const LONG_ENCODED_VALUE = /\b[A-Za-z0-9+/_=-]{48,}\b/g;
const TECHNICAL_PAYLOAD =
  /(?:\b(?:request (?:body|arguments)|transaction arguments|params\.raw|options\.raw|calldata)\s*[:=]|\{\s*["'])/i;
const BEARER_PATTERN = /\bbearer\s+[a-z0-9._~+/=-]+/gi;
const SECRET_PATTERN =
  /\b(?:authorization|api[_ -]?key|(?:(?:access|refresh|auth|session)[_ -]?)?token|secret|signature|signed[ _-]?message|password|credential)["']?\s*[:=][\s\S]*/gi;

export const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

export function safeText(value: string): string {
  // Never expose secret material in a user-facing error.
  if (SECRET_MATERIAL.test(value)) {
    return "[redacted]";
  }
  return value
    .split(TECHNICAL_PAYLOAD, 1)[0]
    .replace(URL_PATTERN, "[url]")
    .replace(HEX_PATTERN, "[hex]")
    .replace(EMAIL_PATTERN, "[email]")
    .replace(BEARER_PATTERN, "[redacted]")
    .replace(SECRET_PATTERN, "[redacted]")
    .replace(LONG_ENCODED_VALUE, "[redacted]")
    .slice(0, 1000);
}
