import {
  CHAIN_METADATA,
  type OnSwapIntentHookData,
  type UserAsset,
} from "@avail-project/nexus-core";
import { ChevronDown } from "lucide-react";
import type React from "react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { computeAmountFromFraction, usdFormatter } from "../../common";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import type {
  SwapInputs,
  SwapMode,
  TransactionStatus,
} from "../hooks/useSwaps";
import AmountInput from "./amount-input";
import SourceAssetSelect from "./source-asset-select";
import { TokenIcon } from "./token-icon";

const RANGE_OPTIONS = [
  {
    label: "25%",
    value: 0.25,
  },
  {
    label: "50%",
    value: 0.5,
  },
  {
    label: "75%",
    value: 0.75,
  },
  {
    label: "MAX",
    value: 1,
  },
];

const SAFETY_MARGIN = 0.05;

interface SourceContainerProps {
  availableBalance?: UserAsset["breakdown"][0];
  formatBalance: (
    balance?: string | number,
    symbol?: string,
    decimals?: number
  ) => string | undefined;
  getFiatValue: (amount: number, token: string) => number;
  inputs: SwapInputs;
  setInputs: (inputs: Partial<SwapInputs>) => void;
  setSwapMode: (mode: SwapMode) => void;
  setTxError: (error: string | null) => void;
  sourceHovered: boolean;
  status: TransactionStatus;
  swapBalance: UserAsset[] | null;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  swapMode: SwapMode;
}

const SourceContainer: React.FC<SourceContainerProps> = ({
  status,
  sourceHovered,
  inputs,
  availableBalance,
  swapBalance,
  swapMode,
  swapIntent,
  setInputs,
  setSwapMode,
  setTxError,
  getFiatValue,
  formatBalance,
}) => {
  const isExactOut = swapMode === "exactOut";

  // In exactIn mode, show user's input; in exactOut mode, show calculated source from intent
  const displayedAmount =
    swapMode === "exactIn"
      ? (inputs.fromAmount ?? "")
      : (formatBalance(
          swapIntent?.current?.intent?.sources?.[0]?.amount,
          swapIntent?.current?.intent?.sources?.[0]?.token?.symbol,
          swapIntent?.current?.intent?.sources?.[0]?.token?.decimals
        ) ?? "");

  const isDisabled =
    isExactOut || status === "simulating" || status === "swapping";

  // Render exact-out read-only view
  if (isExactOut) {
    return (
      <div className="flex h-[134px] w-full flex-col items-center gap-y-4 rounded-xl bg-background">
        <div className="flex w-full items-center justify-between">
          <Label className="font-medium text-foreground text-lg">Sell</Label>
        </div>
        <div className="flex w-full items-center justify-center py-4">
          <p className="text-center text-muted-foreground text-sm">
            Enter destination token, chain and amount.
            <br />
            We&apos;ll calculate the best sources for you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-y-4 rounded-xl bg-background">
      <div className="flex w-full items-center justify-between">
        <Label className="font-medium text-foreground text-lg">Sell</Label>
        <div
          className={cn(
            "flex w-full justify-end gap-x-2 transition-all duration-150 ease-out",
            sourceHovered
              ? "translate-y-0 opacity-100"
              : "-translate-y-1 opacity-0"
          )}
        >
          {RANGE_OPTIONS.map((option) => (
            <Button
              className="rounded-full px-5 py-1.5 hover:-translate-y-1 hover:object-scale-down"
              disabled={!(inputs.fromChainID && inputs.fromToken)}
              key={option.label}
              onClick={() => {
                if (!inputs.fromToken) {
                  return 0;
                }
                setSwapMode("exactIn");
                const amount = computeAmountFromFraction(
                  availableBalance?.balance ?? "0",
                  option.value,
                  inputs?.fromToken?.decimals,
                  SAFETY_MARGIN
                );
                setInputs({ fromAmount: amount, toAmount: undefined });
              }}
              size={"icon-sm"}
              variant={"secondary"}
            >
              <p className="font-medium text-xs">{option.label}</p>
            </Button>
          ))}
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-x-4">
        <AmountInput
          amount={displayedAmount}
          disabled={isDisabled}
          onChange={(val) => {
            if (availableBalance?.balance) {
              const parsedAvailableBalance = Number.parseFloat(
                availableBalance?.balance
              );
              const parsedVal = Number.parseFloat(val);
              if (parsedVal > parsedAvailableBalance) {
                setTxError("Insufficient Balance");
                return;
              }
            }
            setSwapMode("exactIn");
            setInputs({ fromAmount: val, toAmount: undefined });
          }}
        />

        <Dialog>
          <DialogTrigger asChild>
            <div
              className={cn(
                "flex min-w-max cursor-pointer items-center gap-x-3 rounded-full border border-border bg-card/50 p-1 transition-colors hover:bg-card-foreground/10",
                isDisabled ? "pointer-events-none select-none opacity-50" : ""
              )}
            >
              <TokenIcon
                chainLogo={
                  inputs?.fromChainID
                    ? CHAIN_METADATA[inputs?.fromChainID]?.logo
                    : undefined
                }
                size="lg"
                symbol={inputs?.fromToken?.symbol}
                tokenLogo={inputs?.fromToken?.logo}
              />
              <span className="font-medium">{inputs?.fromToken?.symbol}</span>
              <ChevronDown className="mr-1" size={16} />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md!">
            <DialogHeader>
              <DialogTitle>Select a Token</DialogTitle>
            </DialogHeader>
            <SourceAssetSelect
              onSelect={(fromChainID, fromToken) =>
                setInputs({ ...inputs, fromChainID, fromToken })
              }
              swapBalance={swapBalance}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex w-full items-center justify-between gap-x-4">
        {inputs.fromAmount && inputs?.fromToken ? (
          <span className="text-accent-foreground text-sm">
            {usdFormatter.format(
              getFiatValue(
                Number.parseFloat(inputs.fromAmount),
                inputs.fromToken?.symbol
              )
            )}
          </span>
        ) : (
          <span className="h-5" />
        )}

        <span className="text-muted-foreground text-sm">
          {formatBalance(
            availableBalance?.balance ?? "0",
            inputs?.fromToken?.symbol,
            availableBalance?.decimals
          )}
        </span>
      </div>
    </div>
  );
};

export default SourceContainer;
