import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStatusRows,
  type NexusOneProgressEvent,
} from "../packages/fast-bridge-app/src/components/nexus-one/components/nexus-one-progress-screen";

const chain = { id: 8453, name: "Base", logo: "" };
const source = {
  id: "source_swap:8453",
  type: "source_swap",
  chain,
  asset: { symbol: "ETH" },
};
const anotherSource = {
  ...source,
  id: "source_swap:1",
  chain: { id: 1, name: "Ethereum", logo: "" },
};
const fill = { id: "fill", type: "bridge_fill", chain };
const destination = { id: "destination", type: "destination_swap", chain };
const rawSteps = [source, anotherSource, fill, destination];

function event(step: typeof fill, state: string): NexusOneProgressEvent {
  const completed = ["confirmed", "completed", "success"].includes(state);
  return {
    id: `${step.id}:${state}`,
    name: "swap_plan_progress",
    completed,
    step: {
      ...step,
      type: step.type.toUpperCase(),
      typeID: step.id,
      rawType: step.type,
      completed,
    } as NexusOneProgressEvent["step"],
    event: { type: "plan_progress", stepType: step.type, state, step },
  };
}

const rows = (
  events: NexusOneProgressEvent[],
  failedStep?: NexusOneProgressEvent["step"]
) =>
  buildStatusRows({
    events,
    failedStep,
    rawSteps,
    mode: "swap",
    steps: [],
    context: { destinationChain: "Base", destinationSymbol: "ETH" },
  });

test("wallet prompts wait for approval and submissions advance the original counter", () => {
  const prompted = rows([event(source, "wallet_prompted")]);
  assert.equal(prompted[0].state, "preapproval");
  assert.equal(prompted[0].label, "Approve Swaps (1 of 2)");
  const submitted = rows([event(source, "submitted")]);
  assert.equal(submitted[0].label, "Approve Swaps (2 of 2)");
  const bothSubmitted = rows([
    event(source, "submitted"),
    event(anotherSource, "submitted"),
  ]);
  assert.equal(bothSubmitted[0].state, "completed");
  assert.equal(bothSubmitted[0].label, "Approved Swaps (2 of 2)");
  assert.equal(bothSubmitted[1].state, "inProgress");
  assert.equal(bothSubmitted[2].state, "default");
});

test("confirmation does not count the same wallet action twice", () => {
  const result = rows([event(source, "submitted"), event(source, "confirmed")]);
  assert.equal(result[0].state, "preapproval");
  assert.equal(result[0].label, "Approve Swaps (2 of 2)");
});

test("the original tx_sent and success states advance approvals", () => {
  const result = rows([
    event(source, "tx_sent"),
    event(anotherSource, "success"),
  ]);
  assert.equal(result[0].state, "completed");
  assert.equal(result[1].state, "inProgress");
});

test("wrapped SDK step IDs retain the original matching behavior", () => {
  const wrappedDestination = {
    ...destination,
    id: `plan:${destination.id}:transaction`,
  };
  const result = rows([event(wrappedDestination, "confirmed")]);
  assert.equal(
    result.find((row) => row.id === "receiveToken")?.state,
    "completed"
  );
});

test("source wallet failures retain the approval failure row", () => {
  const failure = event(source, "failed");
  const result = rows([failure], failure.step);
  assert.equal(result[0].state, "error");
  assert.equal(result[0].label, "Approval failed");
});

test("bridge completion waits for destination confirmation before showing receipt", () => {
  const events = [
    event(source, "submitted"),
    event(anotherSource, "submitted"),
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
