export type TransactionStatus =
  | "idle"
  | "preview"
  | "awaiting-approval"
  | "executing"
  | "success"
  | "error";

export interface GenericStep<TStep> {
  completed: boolean;
  id: number;
  step: TStep;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Normalizes a step to a stable key. Prefers typeID, then type, otherwise JSON.
 */
export function getStepKey(step: unknown): string {
  if (!step) {
    return "";
  }
  if (
    isRecord(step) &&
    typeof step.typeID === "string" &&
    step.typeID.length > 0
  ) {
    return step.typeID;
  }
  if (isRecord(step) && typeof step.type === "string" && step.type.length > 0) {
    return step.type;
  }
  try {
    return JSON.stringify(step);
  } catch {
    return String(step);
  }
}
