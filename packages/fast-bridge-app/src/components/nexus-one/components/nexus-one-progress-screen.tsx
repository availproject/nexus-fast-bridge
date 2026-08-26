// biome-ignore-all lint: NexusOne registry component from shadcn registry.

"use client";

import Decimal from "decimal.js";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import type {
  BridgeStepType,
  SwapStepType,
} from "../../common/types/transaction-flow";
import { getShortChainName } from "../../common/utils/constant";
import {
  type NexusOneDepositMetadata,
  type NexusOneMode,
  type SwapType,
} from "../types";
import { resolveTokenVisuals } from "../utils/token-visuals";
import { type SwapTokenOption } from "./swap-asset-selector";
import { type SwapIntentData } from "./swap-intent-preview";

type ProgressSdkStep = SwapStepType | BridgeStepType;

type ProgressStep = {
  id: number;
  completed: boolean;
  step: ProgressSdkStep;
};

export type NexusOneProgressEvent = {
  id: string;
  name: string;
  completed: boolean;
  event?: unknown;
  step?: ProgressSdkStep;
  steps?: ProgressSdkStep[];
  rawSteps?: unknown[];
  planType?: "plan_preview" | "plan_confirmed";
};

interface NexusOneProgressScreenProps {
  failedStep?: ProgressSdkStep | null;
  fromAmountUsd?: string;
  fromTokens?: SwapTokenOption[];
  intentData?: SwapIntentData | null;
  mode: NexusOneMode;
  opportunity?: NexusOneDepositMetadata;
  progressEvents?: NexusOneProgressEvent[];
  rawSteps?: unknown[];
  recipientAddress?: string;
  steps?: ProgressStep[];
  swapBalances?: unknown[] | null;
  swapType?: SwapType;
  toAmount?: string;
  toAmountUsd?: string;
  toToken?: SwapTokenOption;
  totalFeeUsd?: string;
}

const fontFamily = '"Geist", var(--font-geist-sans), system-ui, sans-serif';
const primary = "var(--foreground-primary, #161615)";
const muted = "var(--foreground-muted, #848483)";
const border = "var(--border-default, #E8E8E7)";
const brand = "var(--foreground-brand, #006BF4)";
const danger = "var(--foreground-negative, #E92C2C)";

const parseDecimal = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (Decimal.isDecimal(value)) return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return undefined;
  }
  try {
    const parsed = new Decimal(cleaned);
    return parsed.isFinite() ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const formatDecimal = (value: unknown, decimals = 2) =>
  (parseDecimal(value) ?? new Decimal(0)).toDecimalPlaces(decimals).toFixed();

const formatUsd = (value: unknown) => `$${formatDecimal(value, 2)}`;

const unique = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter(Boolean) as string[]));

const isNativeProgressSourceAddress = (address?: string) => {
  const normalizedAddress = (address ?? "").toLowerCase();
  return (
    !normalizedAddress ||
    normalizedAddress === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    normalizedAddress === "0x0000000000000000000000000000000000000000"
  );
};

const formatSymbolSummary = (symbols: string[]) => {
  if (symbols.length <= 2) return symbols.join(", ");
  return `${symbols.slice(0, 2).join(", ")} and ${symbols.length - 2} others`;
};

const getStepType = (step?: ProgressSdkStep) =>
  String((step as any)?.type ?? (step as any)?.typeID ?? "").toUpperCase();

type ProgressStatusId =
  | "approveTokens"
  | "swapTokens"
  | "receiveToken"
  | "action";

type ProgressStatusState =
  | "default"
  | "preapproval"
  | "inProgress"
  | "completed"
  | "error";

type ProgressStatusRow = {
  id: ProgressStatusId;
  label: string;
  description?: string;
  state: ProgressStatusState;
};

const PROGRESS_EVENT_NAMES = {
  BRIDGE_PLAN_LIST: "bridge_plan_list",
  BRIDGE_PLAN_PROGRESS: "bridge_plan_progress",
  SWAP_PLAN_LIST: "swap_plan_list",
  SWAP_PLAN_PROGRESS: "swap_plan_progress",
  INTENT_STATUS: "intent_status",
} as const;

type BetterIntentLegStatus = {
  sourceIndex: number;
  status: "created" | "deposited" | "fulfilled" | "expired";
  error?: string;
};

type BetterIntentStatusEvent = {
  status: "created" | "deposited" | "fulfilled" | "expired";
  legs: BetterIntentLegStatus[];
};

const getLatestIntentStatus = (
  events: NexusOneProgressEvent[]
): BetterIntentStatusEvent | undefined => {
  const event = [...events]
    .reverse()
    .find((candidate) => candidate.name === PROGRESS_EVENT_NAMES.INTENT_STATUS)
    ?.event as BetterIntentStatusEvent | undefined;
  return event && Array.isArray(event.legs) ? event : undefined;
};

const didAllIntentLegsReachDeposit = (events: NexusOneProgressEvent[]) =>
  events.some((candidate) => {
    if (candidate.name !== PROGRESS_EVENT_NAMES.INTENT_STATUS) return false;
    const statusEvent = candidate.event as BetterIntentStatusEvent | undefined;
    return (
      Array.isArray(statusEvent?.legs) &&
      statusEvent.legs.length > 0 &&
      statusEvent.legs.every(
        (leg) => leg.status === "deposited" || leg.status === "fulfilled"
      )
    );
  });

type ProgressListEventName =
  | typeof PROGRESS_EVENT_NAMES.BRIDGE_PLAN_LIST
  | typeof PROGRESS_EVENT_NAMES.SWAP_PLAN_LIST;

const STATUS_ORDER: ProgressStatusId[] = [
  "approveTokens",
  "swapTokens",
  "receiveToken",
  "action",
];

const SWAP_APPROVAL_TYPES = [
  "ALLOWANCE",
  "ALLOWANCE_APPROVAL",
  "ERC20_APPROVAL",
];

const BETTER_INTENT_PROCESSING_TYPES = [
  "NATIVE_TRANSACTION",
  "INTENT_SIGNATURE",
  "INTENT_SUBMISSION",
];

const BETTER_INTENT_RECEIVE_TYPES = ["INTENT_FULFILLMENT"];

const getBetterIntentFailureLabel = (step?: ProgressSdkStep | null) => {
  const type = getStepType(step ?? undefined);
  if (type.includes("ERC20_APPROVAL")) return "Token approval failed";
  if (type.includes("NATIVE_TRANSACTION")) {
    return "Source transaction failed";
  }
  if (type.includes("INTENT_SIGNATURE")) return "Intent signature failed";
  if (type.includes("INTENT_SUBMISSION")) return "Intent submission failed";
  if (type.includes("INTENT_FULFILLMENT")) {
    return "Intent fulfillment failed";
  }
  return undefined;
};

const REFUND_ELIGIBLE_SWAP_TYPES = [
  "BRIDGE_INTENT_SUBMISSION",
  "BRIDGE_DEPOSIT",
];

const DESTINATION_SWAP_TYPES = [
  "DESTINATION_SWAP",
  "DESTINATION_SWAP_BATCH_TX",
  "DESTINATION_SWAP_HASH",
];
const BRIDGE_FILL_RECEIVE_TYPES = ["BRIDGE_FILL"];

const isNativeAddress = (address?: string) => {
  if (!address) return true;
  const lower = address.toLowerCase();
  return (
    lower === "0x0000000000000000000000000000000000000000" ||
    lower === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    lower === "0x" ||
    lower === ""
  );
};

const isNativeSourceSwapStep = (step?: ProgressSdkStep) => {
  if (!step) return false;
  const type = getStepType(step);
  const rawType = String(
    (step as any)?.rawType ??
      (step as any)?.type ??
      (step as any)?.stepType ??
      ""
  ).toLowerCase();
  const isSourceSwap =
    type.includes("SOURCE_SWAP") || rawType === "source_swap";
  if (!isSourceSwap) return false;

  const swaps = getStepSwaps(step);
  if (swaps.length > 0) {
    return swaps.some((s) => isNativeAddress(s?.input?.contractAddress));
  }
  const contractAddress =
    (step as any)?.contractAddress ??
    (step as any)?.asset?.contractAddress ??
    (step as any)?.token?.contractAddress;
  return isNativeAddress(contractAddress);
};

const isApprovalStep = (step?: ProgressSdkStep) => {
  if (!step) return false;
  if (stepMatches(step, SWAP_APPROVAL_TYPES)) return true;
  const rawType = String(
    (step as any)?.rawType ??
      (step as any)?.type ??
      (step as any)?.stepType ??
      ""
  ).toLowerCase();
  const type = getStepType(step);
  if (type.includes("SOURCE_SWAP") || rawType === "source_swap") {
    return true;
  }
  return isNativeSourceSwapStep(step);
};

const getStatusForStep = (
  step: ProgressSdkStep | undefined,
  mode: NexusOneMode,
  hasTransferAction = false
): ProgressStatusId | null => {
  if (isApprovalStep(step)) {
    return "approveTokens";
  }

  const type = getStepType(step);

  if (
    type === "APPROVAL" ||
    type === "TRANSACTION_SENT" ||
    type === "TRANSACTION_CONFIRMED"
  ) {
    return mode === "swap" && !hasTransferAction ? null : "action";
  }

  if (type.includes("SWAP_START")) {
    return "swapTokens";
  }

  if (BETTER_INTENT_PROCESSING_TYPES.some((token) => type.includes(token))) {
    return "swapTokens";
  }

  if (BETTER_INTENT_RECEIVE_TYPES.some((token) => type.includes(token))) {
    return "receiveToken";
  }

  if (
    type.includes("SOURCE_SWAP") ||
    type.includes("SOURCE_BATCH") ||
    type.includes("SWAP_SOURCE") ||
    type.includes("BRIDGE_DEPOSIT") ||
    type.includes("BRIDGE_FILL") ||
    type.includes("BRIDGE_INTENT_SUBMISSION") ||
    type.includes("SWAP_COMPLETE") ||
    type.includes("SWAP_SKIPPED")
  ) {
    return "swapTokens";
  }

  if (type.includes("DESTINATION_SWAP") || type.includes("DESTINATION_BATCH")) {
    return "receiveToken";
  }

  return null;
};

const stepMatches = (step: ProgressSdkStep | undefined, tokens: string[]) => {
  const type = getStepType(step);
  return tokens.some((token) => type.includes(token));
};

const hasCompletedType = (
  events: NexusOneProgressEvent[],
  steps: ProgressStep[],
  tokens: string[]
) => {
  const completedEvent = events.some(
    (event) => event.completed && stepMatches(event.step, tokens)
  );
  if (completedEvent) return true;

  return steps.some((item) => item.completed && stepMatches(item.step, tokens));
};

const hasStepType = (
  events: NexusOneProgressEvent[],
  steps: ProgressStep[],
  tokens: string[]
) =>
  events.some(
    (event) =>
      stepMatches(event.step, tokens) ||
      (event.steps ?? []).some((step) => stepMatches(step, tokens))
  ) || steps.some((item) => stepMatches(item.step, tokens));

const hasEventType = (events: NexusOneProgressEvent[], tokens: string[]) =>
  events.some(
    (event) =>
      stepMatches(event.step, tokens) ||
      (event.steps ?? []).some((step) => stepMatches(step, tokens))
  );

const hasProgressEventType = (
  events: NexusOneProgressEvent[],
  tokens: string[]
) =>
  events.some(
    (event) =>
      (event.name === PROGRESS_EVENT_NAMES.BRIDGE_PLAN_PROGRESS ||
        event.name === PROGRESS_EVENT_NAMES.SWAP_PLAN_PROGRESS) &&
      stepMatches(event.step, tokens)
  );

const getListedSteps = (
  events: NexusOneProgressEvent[],
  eventName: ProgressListEventName
) => {
  const listEvent = [...events]
    .reverse()
    .find(
      (event) => event.name === eventName && (event.steps?.length ?? 0) > 0
    );
  return listEvent?.steps ?? [];
};

const countListedSteps = (steps: ProgressSdkStep[], tokens: string[]) =>
  steps.filter((step) => stepMatches(step, tokens)).length;

type ApprovalUnit = {
  symbol?: string;
};

const getStepSwaps = (step?: ProgressSdkStep) => {
  const swaps = (step as any)?.swaps;
  return Array.isArray(swaps) ? swaps : [];
};

const getApprovalUnitsForStep = (step?: ProgressSdkStep): ApprovalUnit[] => {
  if (!isApprovalStep(step)) return [];

  const swaps = getStepSwaps(step);
  if (swaps.length > 0) {
    return swaps.map((swap) => ({
      symbol:
        typeof swap?.input?.symbol === "string" ? swap.input.symbol : undefined,
    }));
  }

  const amountSymbol = (step as any)?.amount?.symbol;
  const tokenSymbol = (step as any)?.token?.symbol;
  const assetSymbol = (step as any)?.asset?.symbol;
  const directSymbol = (step as any)?.symbol;
  const symbol =
    (typeof amountSymbol === "string" && amountSymbol) ||
    (typeof tokenSymbol === "string" && tokenSymbol) ||
    (typeof assetSymbol === "string" && assetSymbol) ||
    (typeof directSymbol === "string" && directSymbol) ||
    undefined;

  return [{ symbol }];
};

const countApprovalUnits = (steps: ProgressSdkStep[]) =>
  steps.reduce((sum, step) => sum + getApprovalUnitsForStep(step).length, 0);

const APPROVAL_FINAL_STATES = new Set([
  "completed",
  "confirmed",
  "success",
  "submitted",
  "tx_sent",
]);

const isApprovalEventCompleted = (event: NexusOneProgressEvent) => {
  if (event.completed) return true;
  const rawState = String(
    (event as any)?.rawEvent?.state ??
      (event.step as any)?.state ??
      (event.event as any)?.state ??
      (event as any)?.state ??
      ""
  ).toLowerCase();
  return APPROVAL_FINAL_STATES.has(rawState);
};

const countCompletedApprovalUnitsFromEvents = (
  events: NexusOneProgressEvent[]
) => {
  const completedIds = new Set<string>();
  let count = 0;

  for (const event of events) {
    if (
      event.name !== PROGRESS_EVENT_NAMES.SWAP_PLAN_PROGRESS ||
      !isApprovalEventCompleted(event)
    ) {
      continue;
    }
    const stepId = String(
      (event.step as any)?.id ??
        (event.step as any)?.stepId ??
        (event.step as any)?.typeID ??
        (event as any)?.rawEvent?.step?.id ??
        ""
    );
    if (stepId) {
      if (completedIds.has(stepId)) continue;
      completedIds.add(stepId);
    }
    const units = getApprovalUnitsForStep(event.step);
    count += units.length > 0 ? units.length : 1;
  }

  return count;
};

const isRawApprovalStep = (step: any) => {
  if (!step) return false;
  const type = String(
    step.type ?? step.rawType ?? step.stepType ?? ""
  ).toLowerCase();
  const id = String(step.id ?? step.stepId ?? "").toLowerCase();
  return (
    type === "allowance" ||
    type === "allowance_approval" ||
    type === "erc20_approval" ||
    type === "approval" ||
    type === "source_swap" ||
    id.startsWith("allowance") ||
    id.startsWith("approval") ||
    id.startsWith("source_swap")
  );
};

const isExecutionEventCompleted = (event: NexusOneProgressEvent) => {
  if (event.completed) return true;
  const rawState = String(
    (event as any)?.rawEvent?.state ??
      (event.step as any)?.state ??
      (event.event as any)?.state ??
      (event as any)?.state ??
      ""
  ).toLowerCase();
  return (
    rawState === "confirmed" ||
    rawState === "completed" ||
    rawState === "success"
  );
};

const isEventMatchingRawStep = (
  event: NexusOneProgressEvent,
  rawStep: any,
  _rawStepIndex?: number
) => {
  if (!rawStep) return false;
  const rawEvent = event.event as any;
  const eventStep = event.step as any;

  const eventStepId = String(
    eventStep?.id ??
      eventStep?.stepId ??
      eventStep?.typeID ??
      rawEvent?.id ??
      rawEvent?.step?.id ??
      ""
  ).toLowerCase();
  const rawStepId = String(
    rawStep?.id ?? rawStep?.stepId ?? rawStep?.typeID ?? ""
  ).toLowerCase();

  if (rawStepId && eventStepId) {
    if (
      rawStepId === eventStepId ||
      eventStepId.includes(rawStepId) ||
      rawStepId.includes(eventStepId)
    ) {
      return true;
    }
  }

  const rawType = String(rawStep?.type ?? rawStep?.rawType ?? "").toLowerCase();
  const eventType = String(
    rawEvent?.stepType ?? eventStep?.rawType ?? eventStep?.type ?? ""
  ).toLowerCase();

  const normalizeType = (t: string) =>
    t
      .replace(/^allowance_approval$/, "allowance")
      .replace(/^approval$/, "allowance")
      .replace(/_/g, "");

  if (normalizeType(rawType) !== normalizeType(eventType)) {
    return false;
  }

  const rawChainId = rawStep?.chain?.id ?? rawStep?.chainId;
  const eventChainId =
    eventStep?.chain?.id ?? eventStep?.chainId ?? rawEvent?.chainId;

  if (
    rawChainId &&
    eventChainId &&
    Number(rawChainId) !== Number(eventChainId)
  ) {
    return false;
  }

  return true;
};

const getRawStepsFromEvents = (events: NexusOneProgressEvent[]): any[] => {
  const confirmedEvent = [...events]
    .reverse()
    .find(
      (e) =>
        (e.name === PROGRESS_EVENT_NAMES.SWAP_PLAN_LIST ||
          e.name === PROGRESS_EVENT_NAMES.BRIDGE_PLAN_LIST) &&
        e.planType === "plan_confirmed" &&
        Array.isArray(e.rawSteps) &&
        e.rawSteps.length > 0
    );
  if (confirmedEvent?.rawSteps) return confirmedEvent.rawSteps;

  const anyListEvent = [...events]
    .reverse()
    .find(
      (e) =>
        (e.name === PROGRESS_EVENT_NAMES.SWAP_PLAN_LIST ||
          e.name === PROGRESS_EVENT_NAMES.BRIDGE_PLAN_LIST) &&
        Array.isArray(e.rawSteps) &&
        e.rawSteps.length > 0
    );
  if (anyListEvent?.rawSteps) return anyListEvent.rawSteps;

  const listWithSteps = [...events]
    .reverse()
    .find(
      (e) =>
        (e.name === PROGRESS_EVENT_NAMES.SWAP_PLAN_LIST ||
          e.name === PROGRESS_EVENT_NAMES.BRIDGE_PLAN_LIST) &&
        Array.isArray(e.steps) &&
        e.steps.length > 0
    );
  return listWithSteps?.steps ?? [];
};

const getRawStepSymbol = (step: any) => {
  const symbol =
    step?.token?.symbol ??
    step?.asset?.symbol ??
    step?.amount?.symbol ??
    step?.symbol;
  if (typeof symbol === "string" && symbol) return symbol;
  const swaps = Array.isArray(step?.swaps) ? step.swaps : [];
  if (swaps.length > 0 && typeof swaps[0]?.input?.symbol === "string") {
    return swaps[0].input.symbol;
  }
  return undefined;
};

const getActiveApprovalProgressEvent = (events: NexusOneProgressEvent[]) =>
  [...events]
    .reverse()
    .find(
      (event) =>
        event.name === PROGRESS_EVENT_NAMES.SWAP_PLAN_PROGRESS &&
        !isApprovalEventCompleted(event) &&
        getApprovalUnitsForStep(event.step).length > 0
    );

const getApprovalSymbolFromProgressEvent = (event?: NexusOneProgressEvent) => {
  const units = getApprovalUnitsForStep(event?.step);
  if (units.length === 0) return undefined;
  return units[0]?.symbol;
};

const buildStatusRows = ({
  events,
  failedStep,
  mode,
  rawSteps: rawStepsProp,
  steps,
  approvalTotalCount,
  context,
}: {
  events: NexusOneProgressEvent[];
  failedStep?: ProgressSdkStep | null;
  isExactOut?: boolean;
  mode: NexusOneMode;
  rawSteps?: unknown[];
  steps: ProgressStep[];
  approvalTotalCount?: number | null;
  context: {
    destinationChain?: string;
    destinationSymbol?: string;
    opportunityName?: string;
    recipientAddress?: string;
  };
}): ProgressStatusRow[] => {
  const destinationSymbol = context.destinationSymbol || "token";
  const destinationChain = context.destinationChain || "destination";
  const opportunityName = context.opportunityName || "app";

  const effectiveRawSteps: any[] =
    (Array.isArray(rawStepsProp) && rawStepsProp.length > 0
      ? rawStepsProp
      : undefined) ?? getRawStepsFromEvents(events);

  const fallbackSteps = steps.map((item) => item.step);
  const rawApprovalSteps = effectiveRawSteps.filter(isRawApprovalStep);

  const totalApprovals =
    approvalTotalCount ??
    (rawApprovalSteps.length > 0
      ? rawApprovalSteps.length
      : Math.max(
          countApprovalUnits(fallbackSteps),
          countCompletedApprovalUnitsFromEvents(events)
        ));

  const refundEligibleFailure =
    failedStep !== null &&
    failedStep !== undefined &&
    stepMatches(failedStep, REFUND_ELIGIBLE_SWAP_TYPES);

  const failedStatus = failedStep
    ? getStatusForStep(failedStep, mode, false)
    : null;
  const betterIntentFailureLabel = getBetterIntentFailureLabel(failedStep);

  // Track completed approvals
  let completedApprovalsCount = 0;
  if (rawApprovalSteps.length > 0) {
    for (let i = 0; i < rawApprovalSteps.length; i++) {
      const isDone = events.some((event) => {
        if (
          event.name !== PROGRESS_EVENT_NAMES.SWAP_PLAN_PROGRESS &&
          event.name !== PROGRESS_EVENT_NAMES.BRIDGE_PLAN_PROGRESS
        ) {
          return false;
        }
        if (!isApprovalEventCompleted(event)) return false;
        return isEventMatchingRawStep(event, rawApprovalSteps[i], i);
      });
      if (isDone) completedApprovalsCount++;
    }
  }
  const eventApprovalCount = countCompletedApprovalUnitsFromEvents(events);
  completedApprovalsCount = Math.max(
    completedApprovalsCount,
    eventApprovalCount
  );
  if (totalApprovals > 0) {
    completedApprovalsCount = Math.min(totalApprovals, completedApprovalsCount);
  }

  const allApprovalsDone =
    totalApprovals === 0 || completedApprovalsCount >= totalApprovals;

  const intentStatus = getLatestIntentStatus(events);
  const intentLegs = intentStatus?.legs ?? [];
  const hasIntentLegs = intentLegs.length > 0;
  const hasFailedIntentLeg = intentLegs.some(
    (leg) => leg.status === "expired" || Boolean(leg.error)
  );
  const allIntentLegsDeposited =
    hasIntentLegs &&
    intentLegs.every(
      (leg) => leg.status === "deposited" || leg.status === "fulfilled"
    );
  const intentLegsReachedDeposit =
    allIntentLegsDeposited || didAllIntentLegsReachDeposit(events);
  const allIntentLegsFulfilled =
    (hasIntentLegs && intentLegs.every((leg) => leg.status === "fulfilled")) ||
    intentStatus?.status === "fulfilled";
  const isBetterIntentPlan = effectiveRawSteps.some((step) =>
    [
      "erc20_approval",
      "native_transaction",
      "intent_signature",
      "intent_submission",
      "intent_fulfillment",
    ].includes(String(step?.type ?? step?.rawType ?? "").toLowerCase())
  );

  // Track 2nd-to-last step and last step in rawSteps
  const totalRawSteps = effectiveRawSteps.length;
  const secondLastStepIndex = totalRawSteps >= 2 ? totalRawSteps - 2 : 0;
  const lastStepIndex = totalRawSteps >= 1 ? totalRawSteps - 1 : 0;
  const secondLastStep =
    totalRawSteps > 0 ? effectiveRawSteps[secondLastStepIndex] : null;
  const lastStep = totalRawSteps > 0 ? effectiveRawSteps[lastStepIndex] : null;

  const isStepDone = (step: any, index: number) => {
    if (!step) return false;
    return events.some((event) => {
      if (
        event.name !== PROGRESS_EVENT_NAMES.SWAP_PLAN_PROGRESS &&
        event.name !== PROGRESS_EVENT_NAMES.BRIDGE_PLAN_PROGRESS
      ) {
        return false;
      }
      if (!isExecutionEventCompleted(event)) return false;
      return isEventMatchingRawStep(event, step, index);
    });
  };

  const swapCompleteEvent = hasCompletedType(events, steps, [
    "SWAP_COMPLETE",
    "SWAP_SKIPPED",
  ]);
  const betterIntentSubmissionCompleted = hasCompletedType(events, steps, [
    "INTENT_SUBMISSION",
  ]);
  const betterIntentFulfillmentCompleted = hasCompletedType(events, steps, [
    "INTENT_FULFILLMENT",
  ]);

  const isLastStepCompleted =
    betterIntentFulfillmentCompleted ||
    swapCompleteEvent ||
    (lastStep ? isStepDone(lastStep, lastStepIndex) : false);

  const isSecondLastStepCompleted =
    betterIntentSubmissionCompleted ||
    betterIntentFulfillmentCompleted ||
    isLastStepCompleted ||
    (secondLastStep
      ? isStepDone(secondLastStep, secondLastStepIndex)
      : false) ||
    (totalRawSteps === 0 &&
      hasCompletedType(events, steps, [
        "DESTINATION_SWAP",
        "BRIDGE_FILL",
        "SWAP_COMPLETE",
      ]));

  const rows: ProgressStatusRow[] = [];

  // --- 1. APPROVAL STEP ---
  if (totalApprovals > 0) {
    let approveState: ProgressStatusState = "default";
    if (failedStatus === "approveTokens") {
      approveState = "error";
    } else if (allApprovalsDone) {
      approveState = "completed";
    } else {
      approveState = "preapproval";
    }

    const currentApprovalStep =
      rawApprovalSteps[
        Math.min(
          completedApprovalsCount,
          Math.max(0, rawApprovalSteps.length - 1)
        )
      ];
    const currentApprovalSymbol =
      getApprovalSymbolFromProgressEvent(
        getActiveApprovalProgressEvent(events)
      ) ?? getRawStepSymbol(currentApprovalStep);

    rows.push({
      id: "approveTokens",
      state: approveState,
      description:
        approveState === "preapproval"
          ? currentApprovalSymbol
            ? `Approve ${currentApprovalSymbol} in wallet`
            : "Approve in wallet"
          : undefined,
      label:
        approveState === "completed"
          ? isBetterIntentPlan
            ? `Approved tokens (${totalApprovals} of ${totalApprovals})`
            : `Approved Swaps (${totalApprovals} of ${totalApprovals})`
          : approveState === "error"
            ? "Approval failed"
            : isBetterIntentPlan
              ? `Approve tokens (${completedApprovalsCount + 1} of ${totalApprovals})`
              : `Approve Swaps (${completedApprovalsCount + 1} of ${totalApprovals})`,
    });
  }

  // --- 2. SWAPS IN PROGRESS STEP ---
  let swapState: ProgressStatusState = "default";
  if (
    failedStatus === "swapTokens" ||
    (hasFailedIntentLeg && !intentLegsReachedDeposit)
  ) {
    swapState = "error";
  } else if (
    intentLegsReachedDeposit ||
    (!isBetterIntentPlan && isSecondLastStepCompleted)
  ) {
    swapState = "completed";
  } else if (allApprovalsDone) {
    swapState = "inProgress";
  } else {
    swapState = "default";
  }

  rows.push({
    id: "swapTokens",
    state: swapState,
    label:
      swapState === "completed"
        ? isBetterIntentPlan
          ? "Transfer submitted"
          : "Swaps completed"
        : swapState === "error"
          ? (betterIntentFailureLabel ??
            (isBetterIntentPlan
              ? "Source transfer failed"
              : refundEligibleFailure
                ? "Swap failed. Refund initiated"
                : "Swap failed"))
          : swapState === "inProgress"
            ? isBetterIntentPlan
              ? "Processing transfer"
              : "Swaps in progress"
            : isBetterIntentPlan
              ? "Process transfer"
              : "Swap tokens",
  });

  // --- 3. RECEIVING TOKEN STEP ---
  let receiveState: ProgressStatusState = "default";
  if (
    failedStatus === "receiveToken" ||
    (hasFailedIntentLeg && intentLegsReachedDeposit)
  ) {
    receiveState = "error";
  } else if (
    allIntentLegsFulfilled ||
    (!isBetterIntentPlan && isLastStepCompleted)
  ) {
    receiveState = "completed";
  } else if (
    intentLegsReachedDeposit ||
    (!isBetterIntentPlan && isSecondLastStepCompleted)
  ) {
    receiveState = "inProgress";
  } else {
    receiveState = "default";
  }

  rows.push({
    id: "receiveToken",
    state: receiveState,
    label:
      receiveState === "completed"
        ? `Received ${destinationSymbol} on ${destinationChain}`
        : receiveState === "error"
          ? (betterIntentFailureLabel ??
            (isBetterIntentPlan
              ? "Transfer fulfillment failed"
              : refundEligibleFailure
                ? "Destination swap failed. Refund initiated."
                : "Destination swap failed."))
          : receiveState === "inProgress"
            ? `Receiving ${destinationSymbol} on ${destinationChain}`
            : `Receive ${destinationSymbol} on ${destinationChain}`,
  });

  // If mode === "deposit", show deposit action step ONLY after receive is completed
  if (mode === "deposit") {
    const transactionSent = hasCompletedType(events, steps, [
      "TRANSACTION_SENT",
    ]);
    const transactionConfirmed = hasCompletedType(events, steps, [
      "TRANSACTION_CONFIRMED",
    ]);
    let depositState: ProgressStatusState = "default";
    if (failedStatus === "action") {
      depositState = "error";
    } else if (transactionConfirmed) {
      depositState = "completed";
    } else if (transactionSent) {
      depositState = "inProgress";
    } else if (isLastStepCompleted) {
      depositState = "preapproval";
    }

    rows.push({
      id: "action",
      state: depositState,
      description:
        depositState === "preapproval" ? "Approve in wallet" : undefined,
      label:
        depositState === "completed"
          ? `${destinationSymbol} deposited to ${opportunityName}`
          : depositState === "inProgress"
            ? `Depositing ${destinationSymbol} to ${opportunityName}`
            : depositState === "error"
              ? "Deposit failed. Funds are in your wallet."
              : depositState === "preapproval"
                ? `Approve Deposit of ${destinationSymbol} to ${opportunityName}`
                : `Deposit ${destinationSymbol} to ${opportunityName}`,
    });
  }

  return rows;
};

function MiniLogo({
  src,
  label,
  size,
  style,
}: {
  src?: string;
  label?: string;
  size: number;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (!failed && src) {
    return (
      <img
        alt={label || ""}
        onError={() => setFailed(true)}
        src={src}
        style={{
          background: "#FFFFFE",
          borderRadius: "999px",
          height: size,
          objectFit: "cover",
          width: size,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      style={{
        alignItems: "center",
        background: "#E8F0FF",
        borderRadius: "999px",
        color: brand,
        display: "inline-flex",
        fontFamily,
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 700,
        height: size,
        justifyContent: "center",
        width: size,
        ...style,
      }}
    >
      {(label || "?").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

function TokenLogoPair({
  tokenLogo,
  chainLogo,
  tokenSymbol,
  chainName,
}: {
  tokenLogo?: string;
  chainLogo?: string;
  tokenSymbol?: string;
  chainName?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexShrink: 0,
        height: 31,
        position: "relative",
        width: 31,
      }}
    >
      <MiniLogo label={tokenSymbol} size={31} src={tokenLogo} />
      {chainLogo && (
        <MiniLogo
          label={chainName}
          size={13}
          src={chainLogo}
          style={{
            bottom: -1,
            outline: "1px solid #FFFFFE",
            position: "absolute",
            right: -1,
          }}
        />
      )}
    </span>
  );
}

export function NexusOneProgressScreen({
  fromTokens = [],
  toToken,
  fromAmountUsd,
  toAmount,
  toAmountUsd,
  totalFeeUsd,
  intentData,
  mode,
  opportunity,
  steps,
  progressEvents = [],
  failedStep,
  rawSteps,
  recipientAddress,
  swapBalances,
  swapType,
}: NexusOneProgressScreenProps) {
  const isExactOutDisplayFlow =
    mode === "deposit" || mode === "send" || swapType === "exactOut";
  const isSwapExactOutDisplayFlow = mode === "swap" && swapType === "exactOut";
  const intentDestination = intentData?.destination;
  const isDestinationSource = ({
    chainId,
    contractAddress,
    symbol,
  }: {
    chainId?: number;
    contractAddress?: string;
    symbol?: string;
  }) => {
    if (!isSwapExactOutDisplayFlow) return false;

    const destinationChainId = intentDestination?.chain.id ?? toToken?.chainId;
    if (!chainId || chainId !== destinationChainId) return false;

    const destinationTokenAddress =
      intentDestination?.token.contractAddress ?? toToken?.contractAddress;
    const sourceAddress = contractAddress?.toLowerCase();
    const normalizedDestinationAddress = destinationTokenAddress?.toLowerCase();
    if (
      sourceAddress &&
      normalizedDestinationAddress &&
      sourceAddress === normalizedDestinationAddress
    ) {
      return true;
    }
    if (
      isNativeProgressSourceAddress(contractAddress) &&
      isNativeProgressSourceAddress(destinationTokenAddress)
    ) {
      return true;
    }

    const destinationSymbol =
      intentDestination?.token.symbol ?? toToken?.symbol;
    return Boolean(
      (!sourceAddress || !normalizedDestinationAddress) &&
        symbol &&
        destinationSymbol &&
        symbol.toUpperCase() === destinationSymbol.toUpperCase()
    );
  };
  const intentSources = (intentData?.sources ?? []).filter(
    (source) =>
      !isDestinationSource({
        chainId: source.chain.id,
        contractAddress: source.token.contractAddress,
        symbol: source.token.symbol,
      })
  );
  const eligibleFromTokens = fromTokens.filter(
    (token) =>
      !isDestinationSource({
        chainId: token.chainId,
        contractAddress: token.contractAddress,
        symbol: token.symbol,
      })
  );
  const destinationSourceToken = eligibleFromTokens.find((token) => {
    const destinationChainId = intentDestination?.chain.id ?? toToken?.chainId;
    const destinationTokenAddress = (
      intentDestination?.token.contractAddress ??
      toToken?.contractAddress ??
      ""
    ).toLowerCase();
    const tokenAmount =
      parseDecimal(token.userAmount) ?? parseDecimal(token.balance);

    return (
      destinationChainId !== undefined &&
      destinationTokenAddress !== "" &&
      token.chainId === destinationChainId &&
      token.contractAddress.toLowerCase() === destinationTokenAddress &&
      Boolean(tokenAmount && tokenAmount.gt(0))
    );
  });
  const sourceSymbols = unique([
    ...(destinationSourceToken ? [destinationSourceToken.symbol] : []),
    ...(intentSources.length > 0
      ? intentSources.map((source) => source.token.symbol)
      : eligibleFromTokens.map((token) => token.symbol)),
  ]);
  const intentSourceUsd =
    intentSources.length > 0
      ? intentSources.reduce(
          (sum, source) => sum.plus(parseDecimal(source.value) ?? 0),
          new Decimal(0)
        )
      : parseDecimal(fromAmountUsd);
  const requestedDestinationAmount = parseDecimal(toAmount);
  const quotedDestinationAmount = parseDecimal(intentDestination?.amount);
  const destinationBalanceAmount = parseDecimal(toToken?.balance);
  const requestedDestinationUsd = parseDecimal(toAmountUsd);
  const destinationUsdRate =
    requestedDestinationAmount &&
    requestedDestinationAmount.gt(0) &&
    requestedDestinationUsd &&
    requestedDestinationUsd.gt(0)
      ? requestedDestinationUsd.div(requestedDestinationAmount)
      : quotedDestinationAmount &&
          quotedDestinationAmount.gt(0) &&
          intentDestination?.value
        ? (parseDecimal(intentDestination.value) ?? new Decimal(0)).div(
            quotedDestinationAmount
          )
        : undefined;
  const destinationCoverageUsd =
    isExactOutDisplayFlow &&
    !isSwapExactOutDisplayFlow &&
    requestedDestinationAmount &&
    requestedDestinationAmount.gt(0) &&
    quotedDestinationAmount &&
    requestedDestinationAmount.gt(quotedDestinationAmount) &&
    destinationBalanceAmount &&
    destinationBalanceAmount.gt(0) &&
    destinationUsdRate &&
    destinationUsdRate.gt(0)
      ? Decimal.min(
          requestedDestinationAmount.minus(quotedDestinationAmount),
          destinationBalanceAmount
        ).mul(destinationUsdRate)
      : undefined;
  const quotedDestinationUsd = parseDecimal(intentDestination?.value);
  const feeUsd = parseDecimal(totalFeeUsd);
  const sourceUsd = isExactOutDisplayFlow
    ? [
        destinationCoverageUsd !== undefined
          ? (intentSourceUsd ?? new Decimal(0)).plus(destinationCoverageUsd)
          : intentSourceUsd,
        requestedDestinationUsd,
        requestedDestinationUsd &&
        requestedDestinationUsd.gt(0) &&
        intentSourceUsd &&
        intentSourceUsd.gt(0) &&
        quotedDestinationUsd &&
        quotedDestinationUsd.gt(0)
          ? requestedDestinationUsd.plus(
              Decimal.max(intentSourceUsd.minus(quotedDestinationUsd), 0)
            )
          : undefined,
        requestedDestinationUsd &&
        requestedDestinationUsd.gt(0) &&
        feeUsd &&
        feeUsd.gt(0)
          ? requestedDestinationUsd.plus(feeUsd)
          : undefined,
      ]
        .filter((value): value is Decimal => Boolean(value && value.gt(0)))
        .reduce<Decimal | undefined>(
          (max, value) => (!max || value.gt(max) ? value : max),
          undefined
        )
    : intentSourceUsd;
  const destinationAmount =
    isExactOutDisplayFlow && toAmount
      ? toAmount
      : (intentDestination?.amount ?? toAmount ?? "0");
  const destinationSymbol =
    intentDestination?.token.symbol ||
    toToken?.symbol ||
    opportunity?.tokenSymbol ||
    "";
  const destinationVisuals = resolveTokenVisuals(
    {
      chainId: intentDestination?.chain.id ?? toToken?.chainId,
      chainLogo: intentDestination?.chain.logo || toToken?.chainLogo,
      chainName: intentDestination?.chain.name || toToken?.chainName,
      contractAddress:
        intentDestination?.token.contractAddress ?? toToken?.contractAddress,
      decimals: intentDestination?.token.decimals ?? toToken?.decimals,
      name: toToken?.name,
      symbol: destinationSymbol,
      tokenLogo: (intentDestination?.token as any)?.logo || toToken?.logo,
    },
    {
      balanceAssets: swapBalances as any,
      tokens: toToken ? [toToken, ...eligibleFromTokens] : eligibleFromTokens,
    }
  );
  const destinationChainName = getShortChainName(
    intentDestination?.chain.id ?? toToken?.chainId,
    destinationVisuals.chainName ||
      intentDestination?.chain.name ||
      toToken?.chainName ||
      ""
  );
  const destinationChain =
    mode === "deposit"
      ? opportunity?.title || opportunity?.protocol || destinationChainName
      : destinationChainName;
  const effectiveRawSteps =
    (Array.isArray(rawSteps) && rawSteps.length > 0 ? rawSteps : undefined) ??
    getRawStepsFromEvents(progressEvents);
  const rawApprovalSteps = effectiveRawSteps.filter(isRawApprovalStep);
  const seededApprovalTotal = countApprovalUnits(
    (steps ?? []).map((item) => item.step)
  );
  const completedApprovalEventTotal =
    countCompletedApprovalUnitsFromEvents(progressEvents);
  const computedApprovalTotal =
    rawApprovalSteps.length > 0
      ? rawApprovalSteps.length
      : Math.max(seededApprovalTotal, completedApprovalEventTotal);
  const [lockedApprovalTotal, setLockedApprovalTotal] = useState<number | null>(
    null
  );
  const approvalTotalCount =
    lockedApprovalTotal ??
    (computedApprovalTotal > 0 ? computedApprovalTotal : null);

  useEffect(() => {
    if (progressEvents.length === 0) {
      setLockedApprovalTotal(null);
      return;
    }
    if (lockedApprovalTotal !== null || computedApprovalTotal <= 0) return;
    setLockedApprovalTotal(computedApprovalTotal);
  }, [computedApprovalTotal, lockedApprovalTotal, progressEvents.length]);

  const statusRows = buildStatusRows({
    events: progressEvents,
    failedStep,
    isExactOut: swapType === "exactOut",
    mode,
    rawSteps,
    steps: steps ?? [],
    approvalTotalCount,
    context: {
      destinationChain: destinationChainName || destinationChain,
      destinationSymbol,
      opportunityName: opportunity?.title || opportunity?.protocol,
      recipientAddress,
    },
  });
  const [stepsExpanded, setStepsExpanded] = useState(true);
  const activeRow =
    statusRows.find(
      (row) => row.state === "preapproval" || row.state === "inProgress"
    ) ??
    statusRows.find((row) => row.state === "error") ??
    statusRows.find((row) => row.state === "default") ??
    statusRows[statusRows.length - 1];
  const visibleRows = stepsExpanded ? statusRows : activeRow ? [activeRow] : [];
  const canExpand = statusRows.length > 1;
  const getRowHeight = (row: ProgressStatusRow) => (row.description ? 64 : 52);
  const collapsedStatusHeight = activeRow ? getRowHeight(activeRow) : 52;
  const expandedStatusHeight = statusRows.reduce(
    (sum, row) => sum + getRowHeight(row),
    0
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#FFFFFE",
          border: "1px solid #F5F5F5",
          borderRadius: "24px 24px 12px 12px",
          boxSizing: "border-box",
          minHeight: "312px",
          padding: "17px 15px 14px",
          width: "100%",
        }}
      >
        <div
          style={{
            color: muted,
            fontFamily,
            fontSize: "13px",
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          {formatSymbolSummary(sourceSymbols)}
        </div>
        <div
          style={{
            color: primary,
            fontFamily,
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: "0.02em",
            lineHeight: "30px",
            marginTop: "4px",
            textAlign: "center",
          }}
        >
          {formatUsd(sourceUsd)}
        </div>

        <img
          alt=""
          aria-hidden="true"
          src="https://files.availproject.org/nexus-elements/nexus-one/progress-grid.gif"
          style={{
            display: "block",
            flexShrink: 0,
            height: "167px",
            margin: "14px auto 12px",
            maxWidth: "382px",
            objectFit: "cover",
            objectPosition: "center",
            width: "100%",
          }}
        />

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              alignItems: "center",
              color: primary,
              display: "flex",
              fontFamily,
              fontSize: "22px",
              fontWeight: 600,
              gap: "8px",
              lineHeight: "30px",
            }}
          >
            <TokenLogoPair
              chainLogo={destinationVisuals.chainLogo}
              chainName={destinationChain}
              tokenLogo={destinationVisuals.tokenLogo}
              tokenSymbol={destinationSymbol}
            />
            <span>{formatDecimal(destinationAmount, 8)}</span>
            <span>{destinationSymbol}</span>
          </div>
          {destinationChain && (
            <div
              style={{
                color: muted,
                fontFamily,
                fontSize: "13px",
                lineHeight: "18px",
              }}
            >
              on {destinationChain}
            </div>
          )}
        </div>
      </div>

      <div
        aria-live="polite"
        style={{
          background: "#FFFFFE",
          border: "1px solid #F5F5F5",
          borderRadius: "12px 12px 24px 24px",
          boxSizing: "border-box",
          overflow: "hidden",
          transition: "box-shadow 220ms ease, border-color 220ms ease",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateRows: "1fr",
            maxHeight: stepsExpanded
              ? `${Math.max(52, expandedStatusHeight)}px`
              : `${collapsedStatusHeight}px`,
            overflow: "hidden",
            transition: "max-height 220ms ease",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {visibleRows.map((row, index) => {
              const isCompleted = row.state === "completed";
              const isError = row.state === "error";
              const isDefault = row.state === "default";
              const isLoading =
                row.state === "preapproval" || row.state === "inProgress";
              const hasDescription = Boolean(row.description);
              const rowColor = isDefault ? muted : isError ? danger : primary;

              return (
                <button
                  key={row.id}
                  onClick={() => {
                    if (canExpand) setStepsExpanded((current) => !current);
                  }}
                  style={{
                    alignItems: hasDescription ? "flex-start" : "center",
                    appearance: "none",
                    background: "transparent",
                    border: "0",
                    borderTop:
                      index > 0 && stepsExpanded ? `1px solid ${border}` : "0",
                    boxSizing: "border-box",
                    color: rowColor,
                    cursor: canExpand ? "pointer" : "default",
                    display: "flex",
                    fontFamily,
                    fontSize: "14px",
                    fontWeight: 400,
                    gap: "12px",
                    minHeight: `${getRowHeight(row)}px`,
                    padding: "14px 16px",
                    textAlign: "left",
                    transition:
                      "color 220ms ease, min-height 220ms ease, opacity 220ms ease",
                    width: "100%",
                  }}
                  type="button"
                >
                  {isCompleted || isError ? (
                    <span
                      style={{
                        alignItems: "center",
                        background: isError ? danger : brand,
                        borderRadius: "999px",
                        color: "#FFFFFE",
                        display: "inline-flex",
                        height: "22px",
                        justifyContent: "center",
                        width: "22px",
                      }}
                    >
                      {isError ? (
                        <X style={{ height: 13, width: 13 }} />
                      ) : (
                        <Check style={{ height: 14, width: 14 }} />
                      )}
                    </span>
                  ) : isDefault ? (
                    <span
                      style={{
                        background: "#FFFFFE",
                        border: `2px solid ${border}`,
                        borderRadius: "999px",
                        boxSizing: "border-box",
                        display: "inline-flex",
                        height: "22px",
                        width: "22px",
                      }}
                    />
                  ) : (
                    <Loader2
                      className="animate-spin"
                      style={{ color: brand, height: 22, width: 22 }}
                    />
                  )}
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      lineHeight: "18px",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: rowColor,
                        fontWeight: isLoading ? 600 : 400,
                      }}
                    >
                      {row.label}
                    </span>
                    {row.description && (
                      <span
                        style={{
                          color: isLoading ? brand : muted,
                          fontSize: "12px",
                          fontStyle: "italic",
                          fontWeight: 400,
                          lineHeight: "16px",
                        }}
                      >
                        {row.description}
                      </span>
                    )}
                  </span>
                  {canExpand && index === 0 && (
                    <ChevronDown
                      style={{
                        color: muted,
                        flexShrink: 0,
                        height: 14,
                        marginLeft: "auto",
                        marginTop: hasDescription ? 2 : 0,
                        transform: stepsExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 220ms ease",
                        width: 14,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
