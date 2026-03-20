/**
 * Chain Transfer Limit Tests
 *
 * Guards against chain-specific transfer limits leaking across chains.
 * Each chain app (apps/{chain}/src/runtime.ts) exports a chainFeatures object
 * with maxBridgeAmount (default USD limit) and an optional
 * maxBridgeAmountByDestinationChainId (per-destination overrides).
 *
 * Currently only MegaETH has a destination override (MegaETH -> MegaETH: 5000).
 * All other chains should use the default limit (550) with no overrides.
 *
 * When adding a new chain or override, update the corresponding test to assert
 * the exact shape and entry count (see the MegaETH tests as a template).
 */

import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import { describe, expect, it } from "vitest";
import { chainFeatures as citreaFeatures } from "../apps/citrea/src/runtime";
import { chainFeatures as megaethFeatures } from "../apps/megaeth/src/runtime";
import { chainFeatures as monadFeatures } from "../apps/monad/src/runtime";

describe("chain transfer limits", () => {
  describe("MegaETH", () => {
    // The default transfer limit when no destination-specific override matches
    it("has default maxBridgeAmount of 550", () => {
      expect(megaethFeatures.maxBridgeAmount).toBe(550);
    });

    // Checks that the MegaETH destination override is set to the correct value
    it("has a destination override only for MegaETH chain of 5000", () => {
      expect(megaethFeatures.maxBridgeAmountByDestinationChainId).toEqual({
        [SUPPORTED_CHAINS.MEGAETH]: 5000,
      });
    });

    // Ensures no additional destination overrides have been added
    it("has exactly one destination override entry", () => {
      const keys = Object.keys(
        megaethFeatures.maxBridgeAmountByDestinationChainId ?? {}
      );
      expect(keys).toHaveLength(1);
    });
  });

  describe("Monad", () => {
    // The default transfer limit applied to all Monad transfers
    it("has default maxBridgeAmount of 550", () => {
      expect(monadFeatures.maxBridgeAmount).toBe(550);
    });

    // Monad should not have any destination-specific overrides.
    // If Monad gets its own override, update this to assert the exact shape + entry count.
    it("has no destination overrides", () => {
      expect(monadFeatures.maxBridgeAmountByDestinationChainId).toBeUndefined();
    });
  });

  describe("Citrea", () => {
    // The default transfer limit applied to all Citrea transfers
    it("has default maxBridgeAmount of 550", () => {
      expect(citreaFeatures.maxBridgeAmount).toBe(550);
    });

    // Citrea should not have any destination-specific overrides.
    // If Citrea gets its own override, update this to assert the exact shape + entry count.
    it("has no destination overrides", () => {
      expect(
        citreaFeatures.maxBridgeAmountByDestinationChainId
      ).toBeUndefined();
    });
  });
});
