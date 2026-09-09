import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStatusRows,
  type NexusOneProgressEvent,
} from "../packages/fast-bridge-app/src/components/nexus-one/components/nexus-one-progress-screen";
import {
  isPlanStepComplete,
  normalizePlanStep,
} from "../packages/fast-bridge-app/src/lib/nexus-events";

const chain = { id: 8453, name: "Base", logo: "" };
const approval = {
  id: "approval:1",
  type: "allowance_approval",
  chain,
  token: { symbol: "USDC" },
};
const anotherApproval = {
  ...approval,
  id: "approval:10",
  token: { symbol: "USDT" },
};
const fill = { id: "fill", type: "bridge_fill", chain };
const destination = { id: "destination", type: "destination_swap", chain };
const rawSteps = [approval, anotherApproval, fill, destination];

function event(step: typeof fill, state: string): NexusOneProgressEvent {
  return {
    id: `${step.id}:${state}`,
    name: "swap_plan_progress",
    completed: isPlanStepComplete(state),
    step: normalizePlanStep(step, step.type, state, isPlanStepComplete(state)),
    event: { type: "plan_progress", stepType: step.type, state, step },
  };
}

const rows = (events: NexusOneProgressEvent[], failedStep?: typeof approval) =>
  buildStatusRows({
    events,
    failedStep: failedStep
      ? normalizePlanStep(failedStep, failedStep.type, "failed", false)
      : undefined,
    rawSteps,
    mode: "swap",
    steps: [],
    context: { destinationChain: "Base", destinationSymbol: "ETH" },
  });

test("broadcast approval remains incomplete until confirmation", () => {
  const submitted = rows([event(approval, "submitted")]);
  assert.equal(submitted[0].state, "preapproval");
  assert.equal(submitted[0].label, "Approve Swaps (1 of 2)");
  const confirmed = rows([
    event(approval, "submitted"),
    event(approval, "confirmed"),
  ]);
  assert.equal(confirmed[0].label, "Approve Swaps (2 of 2)");
});

test("similar step IDs on the same chain cannot complete each other's approvals", () => {
  const result = rows([event(anotherApproval, "confirmed")]);
  assert.equal(result[0].state, "preapproval");
  assert.equal(result[0].label, "Approve Swaps (2 of 2)");
});

test("bridge fill and destination events do not increment approval counts", () => {
  const result = rows([
    event(fill, "completed"),
    event(destination, "confirmed"),
  ]);
  assert.equal(result[0].state, "preapproval");
  assert.equal(result[0].label, "Approve Swaps (1 of 2)");
});

test("a failed SDK allowance is shown as an approval failure", () => {
  const result = rows([event(approval, "failed")], approval);
  assert.equal(result[0].state, "error");
  assert.equal(result[0].label, "Approval failed");
});

test("bridge completion does not mark destination swap received before confirmation", () => {
  const events = [
    event(approval, "confirmed"),
    event(anotherApproval, "confirmed"),
    event(fill, "completed"),
    event(destination, "submitted"),
  ];
  assert.equal(
    rows(events).find((row) => row.id === "receiveToken")?.state,
    "inProgress"
  );
  assert.equal(
    rows([...events, event(destination, "confirmed")]).find(
      (row) => row.id === "receiveToken"
    )?.state,
    "completed"
  );
});
