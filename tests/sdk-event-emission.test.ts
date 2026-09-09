import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExecuteResult } from "@avail-project/nexus-core";
// The test plugin exports the actual mappers from the installed SDK bundle.
import { bridgeEmitter, swapEmitter } from "@fastbridge-test/nexus-sdk";
import {
  createSdkEventHandler,
  executeWithAppEvents,
  type FastBridgeOperationEvent,
  isIntentHookDenial,
  isPlanStepComplete,
  normalizePlanStep,
} from "../packages/fast-bridge-app/src/lib/nexus-events";

const chain = { id: 8453, name: "Base", logo: "" };
const wallet = `0x${"a".repeat(40)}` as const;
const token = { symbol: "USDC", contractAddress: wallet, decimals: 6 };
const asset = { ...token, amount: "1", amountRaw: 1000000n };
const txHash = `0x${"b".repeat(64)}` as const;
const requestHash = `0x${"c".repeat(64)}` as const;
const explorerUrl = `https://example.com/tx/${txHash}`;

function setup() {
  const events: FastBridgeOperationEvent[] = [];
  const onEvent = createSdkEventHandler((event) => {
    events.push(event);
  });
  return {
    events,
    onEvent,
    progress: () => events.filter((event) => event.type === "plan_progress"),
  };
}

const bridgePlan = (submissionMode: "local_wallet" | "middleware") => ({
  steps: [
    {
      type: "allowance_approval",
      id: "approval",
      chain,
      token,
      spender: wallet,
      requiredAmount: "1",
      requiredAmountRaw: "1000000",
    },
    { type: "request_signing", id: "request_signing" },
    { type: "request_submission", id: "request_submission" },
    {
      type: "vault_deposit",
      id: "deposit",
      chain,
      asset,
      assetType: submissionMode === "middleware" ? "erc20" : "native",
      submissionMode,
    },
    { type: "bridge_fill", id: "fill", chain, asset },
  ],
});

const swapSteps = [
  {
    type: "source_swap",
    id: "source",
    chain,
    walletPath: "safe",
    swaps: [{ input: asset, output: asset }],
  },
  { type: "eoa_to_ephemeral_transfer", id: "funding", chain, asset },
  { type: "bridge_deposit", id: "deposit", chain, asset },
  { type: "bridge_intent_submission", id: "intent" },
  { type: "bridge_fill", id: "fill", chain, asset },
  {
    type: "destination_swap",
    id: "destination",
    chain,
    walletPath: "safe",
    swaps: [{ input: asset, output: asset }],
  },
];
const statesByStep = {
  source_swap: [
    "wallet_prompted",
    "started",
    "submitted",
    "confirmed",
    "failed",
  ],
  eoa_to_ephemeral_transfer: [
    "wallet_prompted",
    "submitted",
    "confirmed",
    "failed",
  ],
  bridge_deposit: ["started", "submitted", "confirmed", "failed"],
  bridge_intent_submission: ["started", "completed", "failed"],
  bridge_fill: ["waiting", "completed", "failed"],
  destination_swap: [
    "wallet_prompted",
    "started",
    "submitted",
    "confirmed",
    "failed",
  ],
};

test("installed bridge emitter forwards preview, confirmed allowances, signing, deposit and fill", () => {
  const h = setup();
  const sdk = bridgeEmitter(h.onEvent);
  const preview = bridgePlan("middleware");
  const confirmed = preview;
  sdk.emitStatus("intent_building");
  sdk.emitPlanPreview(preview);
  sdk.emitPlanConfirmed(confirmed);
  sdk.emitAllowanceProgress({
    chainId: chain.id,
    tokenAddress: wallet,
    state: "confirmed",
    approvedAmount: "1",
    approvedAmountRaw: "1000000",
    txHash,
    explorerUrl,
  });
  for (const state of ["wallet_prompted", "completed"]) {
    sdk.emitExecutionProgress({
      stepType: "request_signing",
      state,
      intentRequestHash: requestHash,
    });
  }
  sdk.emitExecutionProgress({
    stepType: "request_submission",
    state: "completed",
    intentRequestHash: requestHash,
    explorerUrl,
  });
  for (const state of ["submitted", "confirmed"]) {
    sdk.emitExecutionProgress({
      stepType: "vault_deposit",
      state,
      chainId: chain.id,
      tokenAddress: wallet,
      txHash,
      explorerUrl,
    });
  }
  for (const state of ["waiting", "completed"]) {
    sdk.emitExecutionProgress({
      stepType: "bridge_fill",
      state,
      intentRequestHash: requestHash,
    });
  }
  sdk.emitStatus("completed");
  assert.deepEqual(
    h.events
      .filter((e) => e.type === "plan_preview" || e.type === "plan_confirmed")
      .map((e) => e.plan),
    [preview, confirmed]
  );
  const progress = h.progress();
  assert.equal(progress[0].stepType, "allowance_approval");
  assert.equal(progress.at(-1)?.stepType, "bridge_fill");
  assert.equal(progress.at(-1)?.state, "completed");
  const deposit = progress.find(
    (e) => e.stepType === "vault_deposit" && e.state === "submitted"
  );
  assert.ok(deposit);
  assert.equal(deposit.step.chain.id, chain.id);
  assert.equal(deposit.txHash, txHash);
  assert.equal(isPlanStepComplete(deposit.state), false);
});

for (const [stepType, states] of Object.entries(statesByStep)) {
  test(`installed swap emitter preserves every ${stepType} state through the UI adapter`, () => {
    const h = setup();
    const sdk = swapEmitter(h.onEvent);
    const plan = {
      hasBridge: true,
      hasDestinationSwap: true,
      steps: swapSteps,
    };
    sdk.emitPlanPreview(plan);
    sdk.emitPlanConfirmed(plan);
    for (const state of states) {
      sdk.emitExecutionProgress({
        stepType,
        state,
        chainId: chain.id,
        txHash,
        explorerUrl,
        intentRequestHash: requestHash,
        error: "Test failure",
      });
    }
    assert.deepEqual(
      h.progress().map((e) => e.state),
      states
    );
    for (const event of h.progress()) {
      const uiStep = normalizePlanStep(
        event.step,
        event.stepType,
        event.state,
        isPlanStepComplete(event.state)
      );
      assert.equal(uiStep.typeID, event.step.id);
      assert.equal(
        uiStep.completed,
        ["confirmed", "completed"].includes(event.state)
      );
      assert.equal(uiStep.type, stepType.toUpperCase());
    }
    const failed = h.progress().at(-1);
    assert.ok(failed && "error" in failed);
    assert.equal(failed.error, "Test failure");
  });
}

test("confirmed plans replace allowance metadata from previews", () => {
  const h = setup();
  const sdk = swapEmitter(h.onEvent);
  const preview = {
    hasBridge: false,
    hasDestinationSwap: false,
    steps: swapSteps,
  };
  const confirmed = {
    ...preview,
    steps: [
      {
        type: "allowance_approval",
        id: "final-approval",
        chain,
        token,
        spender: wallet,
        requiredAmount: "2",
        requiredAmountRaw: "2000000",
      },
      ...swapSteps,
    ],
  };
  sdk.emitPlanPreview(preview);
  sdk.emitPlanConfirmed(confirmed);
  const event = h.events.at(-1);
  assert.ok(event?.type === "plan_confirmed");
  const steps = event.plan.steps.map((step) =>
    normalizePlanStep(step, step.type, undefined, false)
  );
  assert.equal(steps[0].typeID, "final-approval");
  assert.equal(steps[0].type, "APPROVAL");
});

test("an SDK retry can revisit a wallet prompt without losing progress", () => {
  const h = setup();
  const sdk = swapEmitter(h.onEvent);
  sdk.emitPlanConfirmed({
    hasBridge: false,
    hasDestinationSwap: false,
    steps: swapSteps,
  });
  const states = [
    "wallet_prompted",
    "submitted",
    "wallet_prompted",
    "confirmed",
  ];
  for (const state of states) {
    sdk.emitExecutionProgress({
      stepType: "source_swap",
      chainId: chain.id,
      state,
      txHash,
      explorerUrl,
    });
  }
  assert.deepEqual(
    h.progress().map((e) => e.state),
    states
  );
});

test("SDK callback errors and reporting errors cannot abort an in-flight operation", () => {
  const error = new Error("UI crashed");
  const unsafe = swapEmitter(() => {
    throw error;
  });
  assert.throws(
    () => unsafe.emitStatus("route_building"),
    (caught) => caught === error
  );
  const errors: unknown[] = [];
  const safe = swapEmitter(
    createSdkEventHandler(
      () => {
        throw error;
      },
      (caught) => {
        errors.push(caught);
        throw new Error("Reporter crashed");
      }
    )
  );
  assert.doesNotThrow(() => safe.emitStatus("route_building"));
  assert.deepEqual(errors, [error]);
});

test("only exact SDK hook denials bypass operation failure handling", () => {
  for (const message of [
    "User denied swap intent",
    "User rejected the intent.",
  ]) {
    assert.equal(isIntentHookDenial(new Error(message)), true);
  }
  assert.equal(
    isIntentHookDenial({ code: "user_action/intent_hook_denied" }),
    true
  );
  assert.equal(
    isIntentHookDenial(new Error("Backend reports: User denied swap intent")),
    false
  );
  assert.equal(
    isIntentHookDenial({ code: "user_action/intent_signature_denied" }),
    false
  );
});

test("standalone execute reports submission evidence without inventing wallet prompts or exposing calldata", async () => {
  const h = setup();
  const result = {
    chainId: chain.id,
    execute: { txHash, txExplorerUrl: explorerUrl },
  } satisfies ExecuteResult;
  const returned = await executeWithAppEvents(
    { execute: async () => result },
    { toChainId: chain.id, to: wallet, data: "0x1234" },
    h.onEvent
  );
  assert.equal(returned, result);
  assert.deepEqual(
    h.progress().map((e) => e.state),
    ["started", "submitted"]
  );
  const event = h.progress()[1];
  assert.ok("eventSource" in event);
  assert.equal(event.eventSource, "app_execute_fallback");
  assert.ok(!JSON.stringify(h.events).includes(wallet));
  assert.ok(!JSON.stringify(h.events).includes("0x1234"));
});

test("execute errors preserve only public hash and readable reason, then rethrow the same error", async () => {
  const h = setup();
  const error = {
    code: "execution/tx_receipt_wait_timeout",
    message: "Timed out",
    details: { txHash, signature: "SECRET", to: wallet },
  };
  await assert.rejects(
    executeWithAppEvents(
      { execute: () => Promise.reject(error) },
      { toChainId: chain.id, to: wallet },
      h.onEvent
    ),
    (caught) => caught === error
  );
  const event = h.progress().at(-1);
  assert.ok(event && "txHash" in event);
  assert.equal(event.txHash, txHash);
  assert.equal(event.state, "failed");
  assert.ok(!JSON.stringify(h.events).includes("SECRET"));
  assert.ok(!JSON.stringify(h.events).includes(wallet));
});

test("confirmed execute result survives a throwing UI callback", async () => {
  const result = {
    chainId: chain.id,
    execute: {
      txHash,
      txExplorerUrl: explorerUrl,
      receipt: { status: "success" },
    },
  } as ExecuteResult;
  const h = setup();
  const params = { toChainId: chain.id, to: wallet, waitForReceipt: true };
  await executeWithAppEvents(
    { execute: async () => result },
    params,
    h.onEvent
  );
  assert.equal(h.progress().at(-1)?.state, "confirmed");
  const returned = await executeWithAppEvents(
    { execute: async () => result },
    params,
    () => {
      throw new Error("UI crashed");
    }
  );
  assert.equal(returned, result);
});
