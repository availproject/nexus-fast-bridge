"use client";
import {
  CHAIN_METADATA,
  formatTokenBalance,
  type SUPPORTED_CHAINS_IDS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { Link2, Search, X } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { SHORT_CHAIN_NAME, usdFormatter } from "../../common";
import { Button } from "../../ui/button";
import { DialogClose } from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../../ui/select";
import { DESTINATION_SWAP_TOKENS } from "../config/destination";
import type { DestinationTokenInfo } from "../hooks/useSwaps";
import { TokenIcon } from "./token-icon";

interface DestinationAssetSelectProps {
  onSelect: (
    chainId: SUPPORTED_CHAINS_IDS,
    token: DestinationTokenInfo
  ) => void;
  swapBalance: UserAsset[] | null;
}

const DestinationAssetSelect: FC<DestinationAssetSelectProps> = ({
  swapBalance,
  onSelect,
}) => {
  const [tempChain, setTempChain] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get all tokens from all chains with their chain info
  const allTokens: DestinationTokenInfo[] = useMemo(() => {
    const tokens: DestinationTokenInfo[] = [];
    for (const [chainId, chainTokens] of DESTINATION_SWAP_TOKENS.entries()) {
      for (const token of chainTokens) {
        tokens.push({
          ...token,
          chainId,
        });
      }
    }
    return tokens.map((token) => {
      const balance = swapBalance
        ?.flatMap((asset) => asset.breakdown ?? [])
        ?.find(
          (chain) =>
            chain.symbol.toUpperCase() === token.symbol.toUpperCase() &&
            chain.chain?.id === token.chainId
        );
      return {
        ...token,
        balance: formatTokenBalance(balance?.balance ?? "0", {
          symbol: balance?.symbol ?? token.symbol,
          decimals: balance?.decimals ?? 0,
        }),
        balanceInFiat: usdFormatter.format(balance?.balanceInFiat ?? 0),
      };
    });
  }, [swapBalance]);

  // Only show chains that have tokens
  const chainsWithTokens = useMemo(() => {
    return Array.from(DESTINATION_SWAP_TOKENS.keys());
  }, []);

  // Filter tokens by selected chain and search query
  const displayedTokens: DestinationTokenInfo[] = useMemo(() => {
    let filtered = allTokens;

    // Filter by chain
    if (tempChain) {
      filtered = filtered.filter((t) => t.chainId === tempChain);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.symbol.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          t.tokenAddress.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tempChain, allTokens, searchQuery]);

  const handlePick = (tok: DestinationTokenInfo) => {
    const chainId = tempChain ?? tok.chainId;
    if (!chainId) {
      return;
    }
    onSelect(chainId as SUPPORTED_CHAINS_IDS, tok);
  };

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-y-3">
        <Select
          onValueChange={(value) => {
            const matchedChain = chainsWithTokens.find(
              (chain) => String(chain) === value
            );
            if (matchedChain) {
              setTempChain(matchedChain);
            }
          }}
          value={tempChain ? CHAIN_METADATA[tempChain].name : ""}
        >
          <div className="flex w-full bg-input/30 px-2 py-1.5">
            <div className="flex w-full items-center justify-between gap-x-2">
              <Search className="size-5 opacity-65" />
              <input
                className="w-full bg-transparent font-medium text-base text-foreground proportional-nums placeholder-muted-foreground outline-none transition-all duration-150 disabled:opacity-80"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tokens..."
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="rounded-full p-0.5 transition-colors hover:bg-muted"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X className="size-4 opacity-65" />
                </button>
              )}
            </div>
            <SelectTrigger className="cursor-pointer rounded-full border-none bg-transparent!">
              {tempChain ? (
                <img
                  alt={CHAIN_METADATA[tempChain].name}
                  className="size-6 rounded-full"
                  height={24}
                  src={CHAIN_METADATA[tempChain].logo}
                  width={24}
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full border border-border">
                  <Link2 className="size-4" />
                </div>
              )}
            </SelectTrigger>
          </div>
          <SelectContent>
            <SelectGroup>
              {chainsWithTokens.map((c) => (
                <SelectItem key={c} value={String(c)}>
                  <div className="flex items-center justify-between gap-x-2">
                    <img
                      alt={CHAIN_METADATA[c].name}
                      className="size-5 rounded-full"
                      height={20}
                      src={CHAIN_METADATA[c].logo}
                      width={20}
                    />
                    <span className="text-sm">{CHAIN_METADATA[c].name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-sm">
          {tempChain
            ? `Tokens on ${SHORT_CHAIN_NAME[tempChain]}`
            : "All Tokens"}
        </p>
        <div className="no-scrollbar max-h-80 overflow-y-auto rounded-md px-2">
          <div className="no-scrollbar flex w-full flex-col items-center gap-y-4 sm:items-start">
            {displayedTokens.length > 0 ? (
              displayedTokens.map((t) => (
                <DialogClose asChild key={`${t.tokenAddress}-${t.chainId}`}>
                  <Button
                    className="flex h-max w-full items-center justify-between gap-x-2 rounded p-2"
                    onClick={() => handlePick(t)}
                    variant={"ghost"}
                  >
                    <div className="flex items-center gap-x-2">
                      {t.symbol ? (
                        <div className="relative">
                          <TokenIcon
                            chainLogo={CHAIN_METADATA[t.chainId ?? 1]?.logo}
                            className="rounded-full border border-border"
                            symbol={t.symbol}
                            tokenLogo={t.logo}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-base text-foreground">{t.balance}</p>
                      <p className="text-muted-foreground text-sm">
                        {t.balanceInFiat}
                      </p>
                    </div>
                  </Button>
                </DialogClose>
              ))
            ) : (
              <p className="text-muted-foreground text-xs">No Tokens Found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationAssetSelect;
