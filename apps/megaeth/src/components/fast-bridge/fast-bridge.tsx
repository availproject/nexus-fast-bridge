"use client";
import { type FC } from "react";
import { Card, CardContent } from "../ui/card";
import ChainSelect from "./components/chain-select";
import TokenSelect from "./components/token-select";
import { Button } from "../ui/button";
import { LoaderPinwheel, X, CheckCircle2 } from "lucide-react";
import { useNexus } from "../nexus/NexusProvider";
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
import {
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { type Address } from "viem";
import { Skeleton } from "../ui/skeleton";
import RecipientAddress from "./components/recipient-address";
import ViewHistory from "../view-history/view-history";
import { toast } from "sonner";

interface FastBridgeProps {
  connectedAddress: Address;
  prefill?: {
    token: SUPPORTED_TOKENS;
    chainId: SUPPORTED_CHAINS_IDS;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
  onStart?: () => void;
  onError?: (message: string) => void;
}

const FastBridge: FC<FastBridgeProps> = ({
  connectedAddress,
  onComplete,
  onStart,
  onError,
  prefill,
}) => {
  const {
    nexusSDK,
    intent,
    bridgableBalance,
    allowance,
    network,
    fetchBridgableBalance,
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
    handleTransaction,
    reset,
    filteredBridgableBalance,
    startTransaction,
    setIsDialogOpen,
    commitAmount,
    lastExplorerUrl,
    steps,
    status,
  } = useBridge({
    prefill,
    network: network ?? "mainnet",
    connectedAddress,
    nexusSDK,
    intent,
    bridgableBalance,
    allowance,
    onComplete: () => {
      if (onComplete) {
        onComplete();
      }
      const sourcesText =
        intent.current?.intent?.sources?.length &&
        intent.current?.intent.sources.length > 0
          ? intent.current.intent.sources.map((s) => s.chainName).join(", ")
          : "N/A";
      toast.success(
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-green-500" />
            <span className="font-semibold">Bridge Successful!</span>
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Source(s):</span> {sourcesText}
            </div>
            <div>
              <span className="font-medium">Destination:</span>{" "}
              {intent.current?.intent?.destination?.chainName || "Unknown"}
            </div>
            <div>
              <span className="font-medium">Asset:</span>{" "}
              {intent.current?.intent?.token.symbol || "Unknown"}
            </div>
            <div>
              <span className="font-medium">Amount Spent:</span>{" "}
              {intent.current?.intent?.sourcesTotal?.toString() || "NaN"}{" "}
              {intent.current?.intent?.token.symbol || "Unknown"}
            </div>
            <div>
              <span className="font-medium">Amount Received:</span>{" "}
              {intent.current?.intent?.destination?.amount?.toString() || "NaN"}{" "}
              {intent.current?.intent?.token.symbol || "Unknown"}
            </div>
            <div>
              <span className="font-medium">Total Fees:</span>{" "}
              {intent.current?.intent?.fees.total?.toString() || "NaN"}{" "}
              {intent.current?.intent?.token.symbol || "Unknown"}
            </div>
            {lastExplorerUrl ? (
              <div className="mt-2 pt-2 border-t">
                <a
                  href={lastExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  View on Explorer
                </a>
              </div>
            ) : null}
          </div>
        </div>,
        {
          duration: Infinity, // Stay until dismissed
          closeButton: true,
          icon: null, // Remove default icon since we're adding our own
        },
      );
    },
    onStart,
    onError: (message) => {
      toast.error(message);
      if (onError) {
        onError(message);
      }
    },
    fetchBalance: fetchBridgableBalance,
  });
  const receiveSymbol =
    intent?.current?.intent?.token.symbol ??
    // @ts-expect-error - not possible
    intent?.current?.intent?.token.displaySymbol ??
    filteredBridgableBalance?.symbol;
  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full px-2 sm:px-6 relative">
        <ViewHistory className="absolute -top-2 right-3" />
        <ChainSelect
          selectedChain={inputs?.chain}
          handleSelect={(chain) =>
            setInputs({
              ...inputs,
              chain,
            })
          }
          label="To"
          disabled={!!prefill?.chainId}
        />
        <TokenSelect
          selectedChain={inputs?.chain}
          selectedToken={inputs?.token}
          handleTokenSelect={(token) => setInputs({ ...inputs, token })}
          disabled={!!prefill?.token}
        />
        <AmountInput
          amount={inputs?.amount}
          onChange={(amount) => setInputs({ ...inputs, amount })}
          bridgableBalance={filteredBridgableBalance}
          onCommit={() => void commitAmount()}
          disabled={refreshing || !!prefill?.amount}
          inputs={inputs}
        />
        <RecipientAddress
          address={inputs?.recipient}
          onChange={(address) =>
            setInputs({ ...inputs, recipient: address as `0x${string}` })
          }
          disabled={!!prefill?.recipient}
        />
        {intent?.current?.intent && (
          <>
            <SourceBreakdown
              intent={intent?.current?.intent}
              tokenSymbol={filteredBridgableBalance?.symbol as SUPPORTED_TOKENS}
              isLoading={refreshing}
            />

            <div className="w-full flex items-start justify-between gap-x-4">
              <p className="text-base font-light">You receive</p>
              <div className="flex flex-col gap-y-1 min-w-fit">
                {refreshing ? (
                  <Skeleton className="h-5 w-28" />
                ) : (
                  <p className="text-base font-light text-right">
                    {`${
                      connectedAddress === inputs?.recipient
                        ? intent?.current?.intent?.destination?.amount
                        : inputs.amount
                    } ${receiveSymbol}`}
                  </p>
                )}
                {refreshing ? (
                  <Skeleton className="h-4 w-36" />
                ) : (
                  <p className="text-sm font-light text-right">
                    on {intent?.current?.intent?.destination?.chainName}
                  </p>
                )}
              </div>
            </div>
            <FeeBreakdown
              intent={intent?.current?.intent}
              isLoading={refreshing}
            />
          </>
        )}

        {!intent.current && (
          <Button
            onClick={handleTransaction}
            disabled={
              !inputs?.amount ||
              !inputs?.recipient ||
              !inputs?.chain ||
              !inputs?.token ||
              loading
            }
          >
            {loading ? (
              <LoaderPinwheel className="animate-spin size-5" />
            ) : (
              "Bridge"
            )}
          </Button>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (loading) return;
            setIsDialogOpen(open);
          }}
        >
          {intent.current && !isDialogOpen && (
            <div className="w-full flex items-center gap-x-2 justify-between">
              <Button variant={"destructive"} onClick={reset} className="w-1/2">
                Deny
              </Button>
              <DialogTrigger asChild>
                <Button
                  onClick={startTransaction}
                  className="w-1/2"
                  disabled={refreshing}
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
            {allowance.current ? (
              <AllowanceModal
                allowance={allowance}
                callback={startTransaction}
                onCloseCallback={reset}
              />
            ) : (
              <TransactionProgress
                timer={timer}
                steps={steps}
                viewIntentUrl={lastExplorerUrl}
                operationType={"bridge"}
                completed={status === "success"}
              />
            )}
          </DialogContent>
        </Dialog>

        {txError && (
          <div className="rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-sm text-destructive-foreground flex items-start justify-between gap-x-3 mt-3 w-full max-w-md">
            <span className="flex-1 w-full truncate">{txError}</span>
            <Button
              type="button"
              size={"icon"}
              variant={"ghost"}
              onClick={() => {
                reset();
                setTxError(null);
              }}
              className="text-destructive-foreground/80 hover:text-destructive-foreground focus:outline-none"
              aria-label="Dismiss error"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FastBridge;
