export type TransactionStatus =
  | "idle"
  | "preview"
  | "awaiting-approval"
  | "executing"
  | "success"
  | "error";

export type GenericStep<TStep> = {
  id: number;
  completed: boolean;
  step: TStep;
};

interface StepLike {
  type?: unknown;
  typeID?: unknown;
}

/**
 * Normalizes a step to a stable key. Prefers typeID, then type, otherwise JSON.
 */
export function getStepKey(step: unknown): string {
  if (!step) {
    return "";
  }

  const stepLike = step as StepLike;

  if (typeof stepLike.typeID === "string" && stepLike.typeID.length > 0) {
    return stepLike.typeID;
  }
  if (typeof stepLike.type === "string" && stepLike.type.length > 0) {
    return stepLike.type;
  }
  try {
    return JSON.stringify(step);
  } catch {
    return String(step);
  }
}
