import type {
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { useMemo } from "react";
import { useRuntime } from "@/providers/runtime-context";
import { useNexus } from "../../nexus/nexus-provider";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface TokenSelectProps {
  disabled?: boolean;
  handleTokenSelect: (token: SUPPORTED_TOKENS) => void;
  isTestnet?: boolean;
  label?: string;
  selectedChain: SUPPORTED_CHAINS_IDS;
  selectedToken?: SUPPORTED_TOKENS;
}

const TokenSelect = ({
  selectedToken,
  selectedChain,
  handleTokenSelect,
  isTestnet = false,
  disabled = false,
  label,
}: TokenSelectProps) => {
  const { chainFeatures } = useRuntime();
  const { supportedChainsAndTokens } = useNexus();
  const tokenData = useMemo(() => {
    const data = supportedChainsAndTokens
      ?.filter((chain) => chain.id === selectedChain)
      .flatMap((chain) => chain.tokens);
    const denyList = chainFeatures.tokenDenyListByChainId?.[selectedChain];
    if (!denyList?.length) {
      return data;
    }
    return data?.filter((token) => !denyList.includes(token.symbol));
  }, [
    selectedChain,
    supportedChainsAndTokens,
    chainFeatures.tokenDenyListByChainId,
  ]);

  const selectedTokenData = tokenData?.find((token) => {
    return token.symbol === selectedToken;
  });

  return (
    <Select
      onValueChange={(value) =>
        !disabled && handleTokenSelect(value as SUPPORTED_TOKENS)
      }
      value={selectedToken}
    >
      <div className="flex flex-col items-start gap-y-1">
        {label && <Label className="font-semibold text-sm">{label}</Label>}
        <SelectTrigger
          className="h-12! w-full font-light text-base"
          disabled={disabled}
        >
          <SelectValue className="w-full" placeholder="Select a token">
            {selectedChain && selectedTokenData && (
              <div className="flex w-full items-center gap-x-2">
                <img
                  alt={selectedTokenData?.symbol}
                  className="rounded-full"
                  height={24}
                  src={selectedTokenData?.logo}
                  width={24}
                />
                {selectedToken}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
      </div>

      <SelectContent>
        <SelectGroup>
          {tokenData?.map((token) => (
            <SelectItem key={token.symbol} value={token.symbol}>
              <div className="my-1 flex items-center gap-x-2">
                <img
                  alt={token.symbol}
                  className="rounded-full"
                  height={24}
                  src={token.logo}
                  width={24}
                />
                <div className="flex flex-col">
                  <span>
                    {isTestnet ? `${token.symbol} (Testnet)` : token.symbol}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default TokenSelect;
