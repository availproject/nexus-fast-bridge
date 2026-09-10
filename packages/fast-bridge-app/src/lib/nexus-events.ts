import { asRecord } from "./error-safety";

export function isIntentHookDenial(error: unknown): boolean {
  const record = asRecord(error);
  // Nexus 2.4.1 still rejects swap hooks with these exact plain Error messages.
  return (
    record.code === "user_action/intent_hook_denied" ||
    record.code === "USER_DENIED_INTENT" ||
    record.message === "User denied swap intent" ||
    record.message === "User rejected the intent."
  );
}
