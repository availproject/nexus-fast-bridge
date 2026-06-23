import type { SwapStepType } from "../types/transaction-flow";
import type { GenericStep } from "./types";
import { getStepKey } from "./types";

/**
 * Predefined expected steps for swaps to seed UI before events arrive.
 * Kept here to avoid duplication across exact-in and exact-out hooks.
 */
export const SWAP_EXPECTED_STEPS: SwapStepType[] = [
  {
    type: "SOURCE_SWAP",
    typeID: "SOURCE_SWAP",
  } as SwapStepType,
  {
    type: "EOA_TO_EPHEMERAL_TRANSFER",
    typeID: "EOA_TO_EPHEMERAL_TRANSFER",
  } as SwapStepType,
  {
    type: "BRIDGE_DEPOSIT",
    typeID: "BRIDGE_DEPOSIT",
  } as SwapStepType,
  {
    type: "BRIDGE_INTENT_SUBMISSION",
    typeID: "BRIDGE_INTENT_SUBMISSION",
  } as SwapStepType,
  {
    type: "BRIDGE_FILL",
    typeID: "BRIDGE_FILL",
  } as SwapStepType,
  {
    type: "DESTINATION_SWAP",
    typeID: "DESTINATION_SWAP",
  } as SwapStepType,
];

export function seedSteps<T>(expected: T[]): GenericStep<T>[] {
  return expected.map((st, index) => ({
    id: index,
    completed: false,
    step: st,
  }));
}

export function computeAllCompleted<T>(steps: GenericStep<T>[]): boolean {
  return steps.length > 0 && steps.every((s) => s.completed);
}

/**
 * Replace the current list of steps with a new list, preserving completion
 * for any steps that were already marked completed (matched by key).
 */
export function mergeStepsList<T>(
  prev: GenericStep<T>[],
  list: T[]
): GenericStep<T>[] {
  const completedKeys = new Set<string>();
  for (const prevStep of prev) {
    if (prevStep.completed) {
      completedKeys.add(getStepKey(prevStep.step));
    }
  }
  const next: GenericStep<T>[] = [];
  for (let index = 0; index < list.length; index++) {
    const step = list[index];
    const key = getStepKey(step);
    next.push({
      id: index,
      completed: completedKeys.has(key),
      step,
    });
  }
  return next;
}

/**
 * Mark a step complete in-place; if the step doesn't yet exist, append it.
 */
export function mergeStepComplete<T>(
  prev: GenericStep<T>[],
  step: T
): GenericStep<T>[] {
  const key = getStepKey(step);
  const updated: GenericStep<T>[] = [];
  let found = false;
  for (const s of prev) {
    if (getStepKey(s.step) === key) {
      updated.push({ ...s, completed: true, step: { ...s.step, ...step } });
      found = true;
    } else {
      updated.push(s);
    }
  }
  if (!found) {
    updated.push({
      id: updated.length,
      completed: true,
      step,
    });
  }
  return updated;
}
