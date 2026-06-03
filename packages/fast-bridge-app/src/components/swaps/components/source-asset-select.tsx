"use client";
import {
  CHAIN_METADATA,
  formatTokenBalance,
  type SUPPORTED_CHAINS_IDS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { Link2, Loader2, Search, X } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { SHORT_CHAIN_NAME } from "../../common";
import { useNexus } from "../../nexus/nexus-provider";
import { Button } from "../../ui/button";
import { DialogClose } from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../../ui/select";
import { TOKEN_IMAGES } from "../config/destination";
import type { SourceTokenInfo } from "../hooks/useSwaps";
import { TokenIcon } from "./token-icon";

interface SourceAssetSelectProps {
  onSelect: (chainId: SUPPORTED_CHAINS_IDS, token: SourceTokenInfo) => void;
  swapBalance: UserAsset[] | null;
}

type AssetBreakdownWithOptionalIcon = UserAsset["breakdown"][number] & {
  icon?: string;
};

const SourceAssetSelect: FC<SourceAssetSelectProps> = ({
  onSelect,
  swapBalance,
}) => {
  const { swapSupportedChainsAndTokens, nexusSDK } = useNexus();
  const [tempChain, setTempChain] = useState<{
    id: number;
    logo: string;
    name: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get all tokens from swapBalance with their chain info
  const allTokens: SourceTokenInfo[] = useMemo(() => {
    if (!swapBalance) {
      return [];
    }
    const tokens: SourceTokenInfo[] = [];

    for (const asset of swapBalance) {
      if (!asset?.breakdown?.length) {
        continue;
      }
      for (const breakdown of asset.breakdown) {
        if (Number.parseFloat(breakdown.balance) <= 0) {
          continue;
        }
        const tokenSymbol = breakdown.symbol;
        const normalizedTokenSymbol = tokenSymbol.toUpperCase();
        const breakdownIcon = (breakdown as AssetBreakdownWithOptionalIcon)
          .icon;
        const tokenLogo =
          breakdownIcon ||
          TOKEN_IMAGES[tokenSymbol] ||
          TOKEN_IMAGES[normalizedTokenSymbol] ||
          asset.icon ||
          "";

        tokens.push({
          contractAddress: breakdown.contractAddress,
          decimals: breakdown.decimals ?? asset.decimals,
          logo: tokenLogo,
          name: tokenSymbol,
          symbol: tokenSymbol,
          balance: formatTokenBalance(breakdown?.balance, {
            symbol: tokenSymbol,
            decimals: breakdown.decimals ?? asset.decimals,
          }),
          balanceInFiat: `$${breakdown.balanceInFiat}`,
          chainId: breakdown.chain?.id,
        });
      }
    }

    // Dedupe by contractAddress + chainId
    const unique = new Map<string, SourceTokenInfo>();
    for (const t of tokens) {
      const key = `${t.contractAddress.toLowerCase()}-${t.chainId}`;
      unique.set(key, t);
    }
    return Array.from(unique.values());
  }, [swapBalance, nexusSDK]);

  // Only show chains that have tokens with balance
  const chainsWithTokens = useMemo(() => {
    if (!(swapSupportedChainsAndTokens && allTokens.length)) {
      return [];
    }
    const chainIdsWithTokens = new Set(allTokens.map((t) => t.chainId));
    return swapSupportedChainsAndTokens.filter((c: any) =>
      chainIdsWithTokens.has(c.id)
    );
  }, [swapSupportedChainsAndTokens, allTokens]);

  // Filter tokens by selected chain and search query
  const displayedTokens: SourceTokenInfo[] = useMemo(() => {
    let filtered = allTokens;

    // Filter by chain
    if (tempChain) {
      filtered = filtered.filter((t) => t.chainId === tempChain.id);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.symbol.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          t.contractAddress.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tempChain, allTokens, searchQuery]);

  const handlePick = (tok: SourceTokenInfo) => {
    const chainId = tempChain?.id ?? tok.chainId;
    if (!chainId) {
      return;
    }
    onSelect(chainId as SUPPORTED_CHAINS_IDS, tok);
  };

  if (!swapBalance) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-3">
        <p className="text-muted-foreground text-sm">
          Fetching swappable assets
        </p>
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-y-3">
      <Select
        onValueChange={(value) => {
          const matchedChain = chainsWithTokens.find(
            (chain: any) => chain.name === value
          );
          if (matchedChain) {
            setTempChain(matchedChain);
          }
        }}
        value={tempChain?.name}
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
                alt={tempChain?.name}
                className="size-6 rounded-full"
                height={24}
                src={tempChain?.logo}
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
            {chainsWithTokens.map((c: any) => (
              <SelectItem key={c.id} value={c.name}>
                <div className="flex items-center justify-between gap-x-2">
                  <img
                    alt={c.name}
                    className="size-5 rounded-full"
                    height={20}
                    src={c.logo}
                    width={20}
                  />
                  <span className="text-sm">{c.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <p className="text-sm">
        {tempChain?.id
          ? `Tokens on ${SHORT_CHAIN_NAME[tempChain.id]}`
          : "All Tokens"}
      </p>
      <div className="no-scrollbar max-h-80 overflow-y-auto rounded-md">
        <div className="no-scrollbar flex w-full flex-col items-center gap-y-4 sm:items-start">
          {displayedTokens.length > 0 ? (
            displayedTokens.map((t) => (
              <DialogClose asChild key={`${t.contractAddress}-${t.chainId}`}>
                <Button
                  className="flex h-max w-full items-center justify-between gap-x-2 rounded p-2"
                  onClick={() => handlePick(t)}
                  variant={"ghost"}
                >
                  <div className="flex items-center gap-x-4">
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
  );
};

export default SourceAssetSelect;
