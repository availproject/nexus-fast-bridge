// biome-ignore lint/performance/noBarrelFile: compatibility alias must preserve viem/actions exports.
export * from "../../../../node_modules/viem/_esm/actions/index.js";

export function sendCallsSync(): never {
  throw new Error("sendCallsSync is not available in the installed viem build");
}

export function sendTransactionSync(): never {
  throw new Error(
    "sendTransactionSync is not available in the installed viem build"
  );
}

export function writeContractSync(): never {
  throw new Error(
    "writeContractSync is not available in the installed viem build"
  );
}
