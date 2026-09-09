import type {
  BridgeAndExecuteEvent,
  BridgeEvent,
  ExecuteParams,
  ExecuteResult,
  NexusClient,
  SwapAndExecuteEvent,
  SwapEvent,
} from "@avail-project/nexus-core";
import type {
  BridgeStepType,
  SwapStepType,
} from "../components/common/types/transaction-flow";
import { asRecord } from "./error-safety";
import {
  getUserFacingError,
  TRANSACTION_STATUS_MESSAGE,
} from "./user-facing-error";

interface AppExecuteEvent {
  error?: string;
  eventSource: "app_execute_fallback";
  explorerUrl?: string;
  state: "started" | "submitted" | "confirmed" | "failed";
  step: {
    id: string;
    type: "execute_transaction";
    chain: { id: number };
  };
  stepType: "execute_transaction";
  txHash?: string;
  type: "plan_progress";
}

export type FastBridgeOperationEvent =
  | BridgeEvent
  | SwapEvent
  | BridgeAndExecuteEvent
  | SwapAndExecuteEvent
  | AppExecuteEvent;

/** Swap emitters in Nexus 2.4.1 propagate callback exceptions into execution. */
export function createSdkEventHandler<Event = FastBridgeOperationEvent>(
  updateUi: (event: Event) => void,
  onHandlerError?: (error: unknown) => void
): (event: Event) => void {
  return (event) => {
    try {
      updateUi(event);
    } catch (error) {
      // A rendering callback must not interrupt an in-flight wallet operation.
      try {
        onHandlerError?.(error);
      } catch {
        // Error reporting must not change the SDK result either.
      }
    }
  };
}

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

const TRANSACTION_HASH = /^0x[0-9a-f]{64}$/i;

/**
 * Standalone execute() has onEvent<never> and emits no progress in Nexus 2.4.1.
 * Report only facts available at the app boundary; never invent wallet prompts
 * or an earlier broadcast timestamp. Keep the original result/error unchanged.
 */
export async function executeWithAppEvents(
  sdk: Pick<NexusClient, "execute">,
  params: ExecuteParams,
  onEvent: (event: FastBridgeOperationEvent) => void
): Promise<ExecuteResult> {
  const emit = createSdkEventHandler(onEvent);
  const base = {
    type: "plan_progress",
    stepType: "execute_transaction",
    eventSource: "app_execute_fallback",
    step: {
      id: `app_execute_transaction:${params.toChainId}`,
      type: "execute_transaction",
      chain: { id: params.toChainId },
    },
  } as const;
  emit({ ...base, state: "started" });
  try {
    const result = await sdk.execute(params);
    emit({
      ...base,
      state: result.execute.receipt ? "confirmed" : "submitted",
      txHash: result.execute.txHash,
      explorerUrl: result.execute.txExplorerUrl,
    });
    return result;
  } catch (error) {
    const { txHash } = asRecord(asRecord(error).details);
    emit({
      ...base,
      state: "failed",
      txHash:
        typeof txHash === "string" && TRANSACTION_HASH.test(txHash)
          ? txHash
          : undefined,
      error: getUserFacingError(error, TRANSACTION_STATUS_MESSAGE),
    });
    throw error;
  }
}

export const isPlanStepComplete = (state: unknown): boolean =>
  state === "confirmed" || state === "completed";

const normalizePlanStepType = (stepType: unknown, state?: unknown) => {
  const normalized = String(stepType ?? "").toLowerCase();
  const normalizedState = String(state ?? "").toLowerCase();

  if (normalized === "execute_transaction") {
    return normalizedState === "confirmed" || normalizedState === "completed"
      ? "TRANSACTION_CONFIRMED"
      : "TRANSACTION_SENT";
  }

  const mapped: Record<string, string> = {
    allowance_approval: "APPROVAL",
    bridge_deposit: "BRIDGE_DEPOSIT",
    bridge_fill: "BRIDGE_FILL",
    bridge_intent_submission: "BRIDGE_INTENT_SUBMISSION",
    destination_swap: "DESTINATION_SWAP",
    eoa_to_ephemeral_transfer: "EOA_TO_EPHEMERAL_TRANSFER",
    execute_approval: "APPROVAL",
    request_signing: "REQUEST_SIGNING",
    request_submission: "REQUEST_SUBMISSION",
    source_swap: "SOURCE_SWAP",
    vault_deposit: "BRIDGE_DEPOSIT",
  };

  return mapped[normalized] ?? normalized.toUpperCase();
};

export const normalizePlanStep = (
  stepLike: unknown,
  fallbackStepType?: unknown,
  state?: unknown,
  completed?: boolean
): SwapStepType | BridgeStepType => {
  const source = asRecord(stepLike);
  const rawStepType = fallbackStepType ?? source.stepType ?? source.type;
  const progressType = normalizePlanStepType(
    rawStepType ?? source.typeID,
    state
  );
  const progressKey =
    source.id ?? source.stepId ?? source.typeID ?? progressType;

  return {
    ...source,
    completed,
    rawType: rawStepType,
    type: progressType,
    typeID: String(progressKey),
  } as SwapStepType | BridgeStepType;
};
