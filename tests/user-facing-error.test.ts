import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useNexusError } from "../packages/fast-bridge-app/src/components/common/hooks/use-nexus-error";
import { StatusAlert } from "../packages/fast-bridge-app/src/components/nexus-one/components/status-alerts";
import { safeText } from "../packages/fast-bridge-app/src/lib/error-safety";
import {
  getReceiptErrorMessage,
  getUserFacingError,
  TRANSACTION_STATUS_MESSAGE,
} from "../packages/fast-bridge-app/src/lib/user-facing-error";

const patterns = {
  usableBalance: /usable balance/,
  reduceAmount: /Reduce the amount/,
  technicalBalance: /0x|Internal/,
  slippage: /slippage limit/,
  balanceLoading: /load your balances/,
  walletDeclined: /declined the request/,
  noBalance: /No balance/,
  sensitiveValues: /A1b2|5678|person@example|rpc\.example|key-123|ABC/,
  longPayload: /aB9_/,
  credentials: /abc|def|ghi/,
  declined: /declined/,
  networkFee: /network fee/,
  connection: /Check your connection/,
  route: /different token or chain/,
  unsupportedStatus: /pending|refund|funds are safe/i,
  emDash: /\u2014|\u2013/,
  alertRole: /role="alert"/,
  tokenUnsupported: /Token not supported/,
  chooseToken: /choose USDC/,
  sensitiveAlert: /A1b2|45678|\u2014/,
};

const wallet = "0xA1b2C3d4E5f60718293A4b5C6d7E8f9012345678";
const fallback = "Refresh your balances and try again.";

test("serialized SDK errors translate into a specific reason and recovery action", () => {
  const balanceError = getUserFacingError({
    code: "validation/insufficient_balance",
    message: `Internal error: token balance for ${wallet}`,
  });
  assert.match(balanceError, patterns.usableBalance);
  assert.match(balanceError, patterns.reduceAmount);
  assert.doesNotMatch(balanceError, patterns.technicalBalance);
  assert.match(
    getUserFacingError({ code: "execution/slippage_exceeded" }),
    patterns.slippage
  );
  assert.match(
    getUserFacingError({ code: "backend/balances_fetch_failed" }),
    patterns.balanceLoading
  );
});

test("nested wallet denial takes precedence over its operation wrapper", () => {
  const error = {
    code: "execution/approval_tx_send_failed",
    message: "Approval failed",
    cause: { code: 4001, message: "User rejected request" },
  };
  assert.match(getUserFacingError(error), patterns.walletDeclined);
  assert.match(
    getUserFacingError({ data: { originalError: error } }),
    patterns.walletDeclined
  );
});

test("a specific nested SDK cause explains a broader operation failure", () => {
  assert.match(
    getUserFacingError({
      code: "execution/exec_tx_send_failed",
      cause: { code: "execution/slippage_exceeded" },
    }),
    patterns.slippage
  );
});

test("unknown SDK codes preserve readable token and amount explanations", () => {
  assert.equal(
    getUserFacingError({
      code: "validation/new_constraint",
      message: "Token not supported for this route. Choose USDC.",
    }),
    "Token not supported for this route. Choose USDC."
  );
  assert.equal(
    getUserFacingError(new Error("Enter at least 5 USDC to cover fees.")),
    "Enter at least 5 USDC to cover fees."
  );
});

test("provider summaries discard request bodies, stack traces, and library versions", () => {
  const message = `The amount exceeds the transfer limit.\nRequest Arguments:\nfrom: ${wallet}\nsignature ${"a".repeat(130)}\nVersion: viem@2.47.12`;
  assert.equal(
    getUserFacingError(new Error(message)),
    "The amount exceeds the transfer limit."
  );
  assert.equal(
    getUserFacingError({
      shortMessage: "This route is temporarily unavailable.",
      message: "Internal error",
    }),
    "This route is temporarily unavailable."
  );
  assert.equal(
    getUserFacingError(
      "Error: Transfer limit reached.\n    at execute (/src/app.ts:3)"
    ),
    "Transfer limit reached."
  );
});

test("sensitive values are excluded even from otherwise readable prose", () => {
  const message = getUserFacingError(
    `No balance for ${wallet}. Contact person@example.org or https://rpc.example.org/key-123?secret=ABC.`
  );
  assert.match(message, patterns.noBalance);
  assert.doesNotMatch(message, patterns.sensitiveValues);
  assert.doesNotMatch(
    getUserFacingError(`Signing failed for ${"aB9_".repeat(20)}`),
    patterns.longPayload
  );
});

test("secret assignments and seed material never reach the UI", () => {
  for (const message of [
    'signature="very sensitive signed content"',
    "private_key: abc123",
    "Seed phrase: twelve words with wallet access",
    "seed_phrase: synthetic test words",
    "passphrase: synthetic test words",
    "mnemonic failed: apple orange banana",
    "Authorization: Bearer abc123",
    "api_key=abc123",
    "password='very sensitive value'",
    "signedMessage: a message granting access",
    "calldata: 123456789",
  ]) {
    assert.equal(getUserFacingError(message, fallback), fallback);
  }
});

test("text sanitization retains normal token prose and redacts explicit secrets", () => {
  assert.equal(
    safeText("Token not supported. Please approve the token allowance."),
    "Token not supported. Please approve the token allowance."
  );
  for (const secret of [
    'api_key="abc def ghi"',
    '"token": "abc def ghi"',
    "authorization: Bearer abc.def.ghi",
    "signature=abcdefghijk",
    "password='abc def ghi'",
  ]) {
    assert.doesNotMatch(safeText(secret), patterns.credentials);
  }
});

test("plain wallet, gas, network, and route errors get actionable wording", () => {
  assert.match(
    getUserFacingError(new Error("User denied transaction signature")),
    patterns.declined
  );
  assert.match(
    getUserFacingError("insufficient funds for gas * price + value"),
    patterns.networkFee
  );
  assert.match(
    getUserFacingError(new TypeError("Failed to fetch")),
    patterns.connection
  );
  assert.match(getUserFacingError("No swap route found"), patterns.route);
});

test("unknown values, technical errors, and cycles use a contextual fallback", () => {
  const cyclic: { cause?: unknown; message: string } = {
    message: "Internal error",
  };
  cyclic.cause = cyclic;
  for (const error of [
    null,
    undefined,
    {},
    cyclic,
    new TypeError("Cannot read properties of undefined"),
    "Request failed with status code 500",
    '{"payload":"secret"}',
  ]) {
    assert.equal(getUserFacingError(error, fallback), fallback);
  }
  assert.equal(getUserFacingError({ code: "constructor" }, fallback), fallback);
});

test("receipt reasons survive generic stage headlines and serialized history", () => {
  const receipt = JSON.parse(
    JSON.stringify({
      error:
        "The amount exceeds the daily transfer limit. Try a smaller amount.",
      failureMessage: "Deposit failed",
      failureDescription: "Transaction failed",
    })
  );
  assert.equal(getReceiptErrorMessage(receipt), receipt.error);
  assert.equal(
    getReceiptErrorMessage({
      error: "Transaction failed",
      failureDescription: "Token not supported on this chain.",
    }),
    "Token not supported on this chain."
  );
  assert.equal(
    getReceiptErrorMessage({ failureMessage: "Swap failed" }),
    TRANSACTION_STATUS_MESSAGE
  );
});

test("timeouts do not assert a pending transfer or a refund", () => {
  for (const code of [
    "execution/tx_receipt_wait_timeout",
    "backend/fulfilment_wait_timeout",
  ]) {
    assert.equal(getUserFacingError({ code }), TRANSACTION_STATUS_MESSAGE);
  }
  assert.equal(
    getReceiptErrorMessage({
      error: "Transaction timed out",
      failureMessage: "Timed Out",
    }),
    TRANSACTION_STATUS_MESSAGE
  );
  assert.doesNotMatch(TRANSACTION_STATUS_MESSAGE, patterns.unsupportedStatus);
});

test("formatting is stable across state, history, and render boundaries and removes em dashes", () => {
  const message = getUserFacingError(
    "The quote expired\u2014refresh it and try again."
  );
  assert.equal(message, "The quote expired. refresh it and try again.");
  assert.equal(getUserFacingError(getUserFacingError(message)), message);
  assert.doesNotMatch(message, patterns.emDash);
});

test("legacy Nexus error handler also accepts serialized errors", () => {
  const handleError = useNexusError();
  const result = handleError({
    code: "execution/slippage_exceeded",
    message: "Execution failed",
  });
  assert.equal(result.code, "execution/slippage_exceeded");
  assert.match(result.message, patterns.slippage);
});

test("inline alerts render the sanitized reason with accessible error semantics", () => {
  const markup = renderToStaticMarkup(
    createElement(StatusAlert, {
      type: "error",
      message: `Token not supported for ${wallet}\u2014choose USDC.`,
    })
  );
  assert.match(markup, patterns.alertRole);
  assert.match(markup, patterns.tokenUnsupported);
  assert.match(markup, patterns.chooseToken);
  assert.doesNotMatch(markup, patterns.sensitiveAlert);
});
