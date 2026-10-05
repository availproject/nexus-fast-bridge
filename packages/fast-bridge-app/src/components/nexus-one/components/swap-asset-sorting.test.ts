import assert from "node:assert/strict";
import test from "node:test";
import {
  type SortableTokenOption,
  sortTokensWithBalancesFirst,
} from "../utils/token-sorting.ts";

test("sortTokensWithBalancesFirst implements 3-tier sorting: verified > unverified > 0 balance", () => {
  const tokens: SortableTokenOption[] = [
    {
      balance: "0",
      balanceInFiat: "$0.00",
      chainId: 1,
      chainName: "Ethereum",
      hasBalance: false,
      name: "Zero Balance Token B",
      symbol: "ZB",
      verified: true,
    },
    {
      balance: "50",
      balanceInFiat: "$50.00",
      chainId: 1,
      chainName: "Ethereum",
      hasBalance: true,
      name: "Verified Token 50",
      symbol: "V50",
      verified: true,
    },
    {
      balance: "200",
      balanceInFiat: "$200.00",
      chainId: 1,
      chainName: "Ethereum",
      hasBalance: true,
      name: "Unverified Token 200",
      symbol: "U200",
      verified: false,
    },
    {
      balance: "100",
      balanceInFiat: "$100.00",
      chainId: 1,
      chainName: "Ethereum",
      hasBalance: true,
      name: "Verified Token 100",
      symbol: "V100",
      verified: true,
    },
    {
      balance: "15",
      balanceInFiat: "$15.00",
      chainId: 1,
      chainName: "Ethereum",
      hasBalance: true,
      name: "Unverified Token 15",
      symbol: "U15",
      verified: false,
    },
    {
      balance: "0",
      balanceInFiat: "$0.00",
      chainId: 1,
      chainName: "Ethereum",
      hasBalance: false,
      name: "Zero Balance Token A",
      symbol: "ZA",
      verified: false,
    },
  ];

  const sorted = sortTokensWithBalancesFirst(tokens);
  const symbols = sorted.map((t) => t.symbol);

  // Expected 3-tier sort:
  // Tier 0 (Verified balances descending by USD): V100 ($100), V50 ($50)
  // Tier 1 (Unverified balances descending by USD): U200 ($200), U15 ($15)
  // Tier 2 (0-balance tokens by name): ZA, ZB
  assert.deepEqual(symbols, ["V100", "V50", "U200", "U15", "ZA", "ZB"]);
});
