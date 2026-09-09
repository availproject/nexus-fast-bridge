import { asRecord } from "@/lib/error-safety";
import { getUserFacingError } from "@/lib/user-facing-error";

function handler(error: unknown) {
  const record = asRecord(error);
  return {
    code: String(record.code ?? "unexpected_error"),
    message: getUserFacingError(error),
    context: record.context,
    details: record.details,
  };
}

export function useNexusError() {
  return handler;
}
