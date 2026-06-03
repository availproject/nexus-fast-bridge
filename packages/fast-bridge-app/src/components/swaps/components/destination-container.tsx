import {
  CHAIN_METADATA,
  type OnSwapIntentHookData,
  type SUPPORTED_CHAINS_IDS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { ChevronDown } from "lucide-react";
import React, { type RefObject, useMemo } from "react";
import { cn } from "@/lib/utils";
import { usdFormatter } from "../../common";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { TOKEN_IMAGES } from "../config/destination";
import type {
  SwapInputs,
  SwapMode,
  TransactionStatus,
} from "../hooks/useSwaps";
import AmountInput from "./amount-input";
import DestinationAssetSelect from "./destination-asset-select";
import { TokenIcon } from "./token-icon";

interface DestinationContainerProps {
  availableStables: UserAsset[];
  destinationBalance?: UserAsset["breakdown"][0];
  destinationHovered: boolean;
  formatBalance: (
    balance?: string | number,
    symbol?: string,
    decimals?: number
  ) => string | undefined;
  getFiatValue: (amount: number, token: string) => number;
  inputs: SwapInputs;
  setInputs: (inputs: Partial<SwapInputs>) => void;
  setSwapMode: (mode: SwapMode) => void;
  status: TransactionStatus;
  swapBalance: UserAsset[] | null;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  swapMode: SwapMode;
}

type AssetBreakdownWithOptionalIcon = UserAsset["breakdown"][number] & {
  icon?: string;
};

const DestinationContainer: React.FC<DestinationContainerProps> = ({
  destinationHovered,
  inputs,
  swapIntent,
  destinationBalance,
  swapBalance,
  availableStables,
  swapMode,
  status,
  setInputs,
  setSwapMode,
  getFiatValue,
  formatBalance,
}) => {
  // In exactOut mode, show user's input; in exactIn mode, show calculated destination
  const displayedAmount =
    swapMode === "exactOut"
      ? (inputs.toAmount ?? "")
      : (formatBalance(
          swapIntent?.current?.intent?.destination?.amount,
          swapIntent?.current?.intent?.destination?.token?.symbol,
          swapIntent?.current?.intent?.destination?.token?.decimals
        ) ?? "");

  const quickPickTokens = useMemo(
    () =>
      availableStables
        .map((token) => {
          const breakdown =
            token.breakdown?.find(
              (entry) => Number.parseFloat(entry.balance ?? "0") > 0
            ) ?? token.breakdown?.[0];
          if (!breakdown) {
            return null;
          }
          return { token, breakdown };
        })
        .filter(
          (
            item
          ): item is {
            token: UserAsset;
            breakdown: UserAsset["breakdown"][number];
          } => item !== null
        ),
    [availableStables]
  );

  return (
    <div className="flex w-full flex-col items-center gap-y-4 rounded-xl bg-background">
      <div className="flex w-full items-center justify-between">
        <Label className="font-medium text-foreground text-lg">Buy</Label>
        {!(inputs?.toToken && inputs?.toChainID) && (
          <div
            className={cn(
              "flex w-full justify-end gap-x-2 transition-all duration-150 ease-out",
              destinationHovered
                ? "translate-y-0 opacity-100"
                : "-translate-y-1 opacity-0"
            )}
          >
            {quickPickTokens.map(({ token, breakdown }) => (
              <Button
                className="rounded-full bg-transparent hover:-translate-y-1 hover:object-scale-down"
                key={`${breakdown.symbol}-${breakdown.chain.id}-${breakdown.contractAddress}`}
                onClick={() => {
                  const normalizedSymbol = breakdown.symbol.toUpperCase();
                  const breakdownIcon = (
                    breakdown as AssetBreakdownWithOptionalIcon
                  ).icon;
                  const tokenLogo =
                    breakdownIcon ||
                    TOKEN_IMAGES[breakdown.symbol] ||
                    TOKEN_IMAGES[normalizedSymbol] ||
                    token.icon ||
                    "";
                  setInputs({
                    ...inputs,
                    toToken: {
                      tokenAddress: breakdown.contractAddress,
                      decimals: breakdown.decimals ?? token.decimals,
                      logo: tokenLogo,
                      name: breakdown.symbol,
                      symbol: breakdown.symbol,
                    },
                    toChainID: breakdown.chain.id as SUPPORTED_CHAINS_IDS,
                  });
                }}
                size={"icon-sm"}
                variant={"secondary"}
              >
                <TokenIcon
                  chainLogo={breakdown.chain.logo}
                  size="sm"
                  symbol={breakdown.symbol}
                  tokenLogo={
                    (breakdown as AssetBreakdownWithOptionalIcon).icon ||
                    TOKEN_IMAGES[breakdown.symbol] ||
                    TOKEN_IMAGES[breakdown.symbol.toUpperCase()] ||
                    token.icon ||
                    ""
                  }
                />
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="flex w-full items-center justify-between gap-x-4">
        <AmountInput
          amount={displayedAmount}
          disabled={status === "simulating" || status === "swapping"}
          onChange={(val) => {
            setSwapMode("exactOut");
            setInputs({ toAmount: val, fromAmount: undefined });
          }}
        />
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex min-w-max cursor-pointer items-center gap-x-3 rounded-full border border-border bg-card/50 p-1 transition-colors hover:bg-card-foreground/10">
              <TokenIcon
                chainLogo={
                  inputs?.toChainID
                    ? CHAIN_METADATA[inputs?.toChainID]?.logo
                    : undefined
                }
                size="lg"
                symbol={inputs?.toToken?.symbol}
                tokenLogo={inputs?.toToken?.logo}
              />
              <span className="font-medium">{inputs?.toToken?.symbol}</span>
              <ChevronDown className="mr-1" size={16} />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md!">
            <DialogHeader>
              <DialogTitle>Select Destination</DialogTitle>
            </DialogHeader>
            <DestinationAssetSelect
              onSelect={(toChainID, toToken) =>
                setInputs({ ...inputs, toChainID, toToken })
              }
              swapBalance={swapBalance}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex w-full items-center justify-between gap-x-4">
        {swapIntent?.current?.intent?.destination?.amount && inputs?.toToken ? (
          <span className="text-accent-foreground text-sm">
            {usdFormatter.format(
              getFiatValue(
                Number.parseFloat(
                  swapIntent?.current?.intent?.destination?.amount
                ),
                inputs.toToken?.symbol
              )
            )}
          </span>
        ) : (
          <span className="h-5" />
        )}
        {inputs?.toToken ? (
          <span className="text-muted-foreground text-sm">
            {formatBalance(
              destinationBalance?.balance,
              inputs?.toToken?.symbol,
              destinationBalance?.decimals
            ) ?? ""}
          </span>
        ) : (
          <span className="h-5" />
        )}
      </div>
    </div>
  );
};

export default DestinationContainer;
