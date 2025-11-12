"use client";
import React from "react";
import { Card, CardContent } from "../ui/card";
import ChainSelect from "./components/chain-select";
import TokenSelect from "./components/token-select";
import { Button } from "../ui/button";
import { LoaderPinwheel } from "lucide-react";
import { useNexus } from "../nexus/NexusProvider";
import ReceipientAddress from "./components/receipient-address";
import AmountInput from "./components/amount-input";
import FeeBreakdown from "./components/fee-breakdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import TransactionProgress from "./components/transaction-progress";
import AllowanceModal from "./components/allowance-modal";
import useBridge from "./hooks/useBridge";
import SourceBreakdown from "./components/source-breakdown";
import type { UserAsset, SUPPORTED_TOKENS } from "@avail-project/nexus-core";
import { type Address } from "viem";
import config from "../../../config";
import BalanceBreakdown from "./components/balance-breakdown";

interface FastBridgeProps {
  connectedAddress: Address;
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
}

const FastBridge: React.FC<FastBridgeProps> = ({
  connectedAddress,
  onComplete,
  prefill,
}) => {
  const {
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    allowance,
    setAllowance,
    network,
  } = useNexus();

  const {
    inputs,
    setInputs,
    timer,
    loading,
    refreshing,
    isDialogOpen,
    txError,
    setTxError,
    reset,
    filteredUnifiedBalance,
    startTransaction,
    setIsDialogOpen,
    stopTimer,
    commitAmount,
    lastExplorerUrl,
    steps,
  } = useBridge({
    prefill,
    network: network ?? "mainnet",
    connectedAddress,
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    setAllowance,
    onComplete,
  });

  const allCompleted = steps?.length > 0 && steps.every((s) => s.completed);
  React.useEffect(() => {
    if (allCompleted) {
      stopTimer();
    }
  }, [allCompleted, stopTimer]);

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full">
        <ChainSelect
          selectedChain={inputs?.chain}
          handleSelect={(chain) =>
            setInputs({
              ...inputs,
              chain,
            })
          }
          label="To"
        />
        <TokenSelect
          selectedChain={inputs?.chain}
          selectedToken={inputs?.token}
          handleTokenSelect={(token) => setInputs({ ...inputs, token })}
        />
        <AmountInput
          amount={inputs?.amount}
          onChange={(amount) => setInputs({ ...inputs, amount })}
          unifiedBalance={filteredUnifiedBalance}
          onCommit={() => commitAmount()}
          disabled={refreshing || !!prefill?.amount}
          inputs={inputs}
        />
        <BalanceBreakdown assetBalances={filteredUnifiedBalance as UserAsset} />
        <ReceipientAddress
          address={inputs?.recipient}
          onChange={(address) =>
            setInputs({ ...inputs, recipient: address as `0x${string}` })
          }
        />
        <hr className="my-4" />
        {intent?.intent && (
          <>
            <SourceBreakdown
              intent={intent?.intent}
              tokenSymbol={filteredUnifiedBalance?.symbol as SUPPORTED_TOKENS}
            />
            <div className="w-full flex items-start justify-between gap-x-4">
              <p className="text-base font-light">You receive</p>
              <div className="flex flex-col gap-y-1 min-w-fit">
                <p className="text-base font-light text-right">
                  {intent?.intent?.destination?.amount}{" "}
                  {filteredUnifiedBalance?.symbol}
                </p>
                <p className="text-sm font-light text-right">
                  on {intent?.intent?.destination?.chainName}
                </p>
              </div>
            </div>
            <FeeBreakdown intent={intent?.intent} />
          </>
        )}

        {/* Show loading state while fetching intent */}
        {loading ||
          (!intent?.intent &&
            inputs?.chain &&
            inputs?.token &&
            inputs?.amount &&
            parseFloat(inputs?.amount || "0") > 0 &&
            inputs?.recipient &&
            filteredUnifiedBalance &&
            parseFloat(inputs?.amount || "0") <=
              parseFloat(filteredUnifiedBalance.balance || "0") && (
              <div className="flex items-center justify-center gap-2 py-4">
                <LoaderPinwheel className="animate-spin size-5" />
                <span className="text-base text-muted-foreground">
                  Fetching bridge details...
                </span>
              </div>
            ))}

        {/* Show amount exceeds balance message */}
        {!intent?.intent &&
          inputs?.chain &&
          inputs?.token &&
          inputs?.amount &&
          parseFloat(inputs?.amount || "0") > 0 &&
          inputs?.recipient &&
          filteredUnifiedBalance &&
          parseFloat(inputs?.amount || "0") >
            parseFloat(filteredUnifiedBalance.balance || "0") && (
            <div className="text-center py-4">
              <p className="text-base text-red-600">
                Amount exceeds available balance. Please enter a valid amount to
                see bridge details.
              </p>
            </div>
          )}

        {/* Show form completion message when form is incomplete */}
        {!intent?.intent &&
          (!inputs?.chain ||
            !inputs?.token ||
            !inputs?.amount ||
            parseFloat(inputs?.amount || "0") <= 0 ||
            !inputs?.recipient) && (
            <div className="text-center py-4">
              <p className="text-base text-muted-foreground">
                Complete the form above to see bridge details
              </p>
            </div>
          )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {intent && (
            <div className="w-full flex items-center gap-x-2 justify-between">
              <Button
                variant={"outline"}
                size={"lg"}
                onClick={reset}
                className="w-1/2 text-base font-semibold"
              >
                Cancel
              </Button>
              <DialogTrigger asChild>
                <Button
                  size={"lg"}
                  onClick={startTransaction}
                  className="w-1/2 text-base font-semibold"
                  disabled={refreshing}
                  style={{
                    backgroundColor: config.primaryColor,
                    color: config.secondaryColor,
                  }}
                >
                  {refreshing ? "Refreshing..." : "Accept"}
                </Button>
              </DialogTrigger>
            </div>
          )}
          <DialogContent>
            <DialogHeader className="sr-only">
              <DialogTitle>Transaction Progress</DialogTitle>
            </DialogHeader>
            <TransactionProgress
              timer={timer}
              steps={steps}
              viewIntentUrl={lastExplorerUrl}
              operationType={"bridge"}
            />
          </DialogContent>
        </Dialog>
        {allowance && (
          <AllowanceModal
            allowanceModal={allowance}
            setAllowanceModal={setAllowance}
            callback={startTransaction}
            onCloseCallback={reset}
          />
        )}

        {txError && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start justify-between gap-x-3">
            <span className="flex-1">{txError}</span>
            <Button
              type="button"
              size={"icon"}
              variant={"ghost"}
              onClick={() => setTxError(null)}
              className="text-red-700/80 hover:text-red-900 focus:outline-none"
              aria-label="Dismiss error"
            >
              ×
            </Button>
          </div>
        )}

        {/* Powered by Avail */}
        <div className="w-full flex items-center gap-x-1 justify-center">
          <p className="text-sm font-light" style={{ color: "#666666" }}>
            Powered by
          </p>
          <a
            href="https://availproject.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/avail_logo.svg"
              alt="Avail Logo"
              className="w-16 h-auto"
              style={{ opacity: 0.5 }}
            />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default FastBridge;
