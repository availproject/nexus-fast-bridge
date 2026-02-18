"use client";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import ChainSelect from "./components/chain-select";
import TokenSelect from "./components/token-select";
import { Button } from "../ui/button";
import { X, CheckCircle2 } from "lucide-react";
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
import Decimal from "decimal.js";

interface FastBridgeProps {
  connectedAddress?: Address;
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
  mockIntent?: {
    totalAmount?: string;
    receiveAmount?: string;
    totalGas?: string;
  };
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
  isWalletConnected,
  onConnectWallet,
  mockIntent,
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
  const [historyRefreshNonce, setHistoryRefreshNonce] = useState(0);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);

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
    availableSources,
    selectedSourceChains,
    toggleSourceChain,
    isSourceSelectionInsufficient,
    isSourceSelectionReadyForAccept,
    sourceCoverageState,
    sourceCoveragePercent,
    missingToProceed,
    missingToSafety,
    selectedTotal,
    requiredTotal,
    requiredSafetyTotal,
    maxAvailableAmount,
    isInputsValid,
  } = useBridge({
    prefill,
    network: network ?? "mainnet",
    connectedAddress,
    nexusSDK,
    intent,
    bridgableBalance,
    allowance,
    onComplete: async (explorerUrl?: string) => {
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
              {intent.current?.intent?.sourcesTotal
                ? new Decimal(intent.current?.intent?.sourcesTotal).toFixed()
                : "NaN"}{" "}
              {intent.current?.intent?.token.symbol || "Unknown"}
            </div>
            <div>
              <span className="font-medium">Amount Received:</span>{" "}
              {intent.current?.intent?.destination?.amount
                ? new Decimal(
                    intent.current?.intent?.destination?.amount,
                  ).toFixed()
                : "NaN"}{" "}
              {intent.current?.intent?.token.symbol || "Unknown"}
            </div>
            <div>
              <span className="font-medium">Total Fees:</span>{" "}
              {intent.current?.intent?.fees.total
                ? new Decimal(intent.current?.intent?.fees.total).toFixed()
                : "NaN"}{" "}
              {intent.current?.intent?.token.symbol || "Unknown"}
            </div>
            {explorerUrl ? (
              <div className="mt-2 pt-2 border-t">
                <a
                  href={explorerUrl}
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
      setHistoryRefreshNonce((prev) => prev + 1);
    },
    onStart,
    onError: (message) => {
      toast.error(message);
      if (onError) {
        onError(message);
      }
    },
    fetchBalance: fetchBridgableBalance,
    maxAmount: 550,
    isSourceMenuOpen,
  });
  const isConnected = isWalletConnected ?? Boolean(connectedAddress);
  const isSdkReady = Boolean(nexusSDK);
  const showSdkDetails = isSdkReady;
  const receiveSymbol =
    intent?.current?.intent?.token.symbol ??
    intent?.current?.intent?.token.displaySymbol ??
    filteredBridgableBalance?.symbol;

  const amountValue = useMemo(() => {
    if (!inputs?.amount) return null;
    const parsed = Number.parseFloat(inputs.amount);
    return Number.isFinite(parsed) ? parsed : null;
  }, [inputs?.amount]);

  const hasValidAmount = useMemo(() => {
    if (amountValue === null) return false;
    return amountValue > 0;
  }, [amountValue]);

  const formatMockNumber = (value: number) => {
    if (!Number.isFinite(value)) return "--";
    const fixed = value.toFixed(6);
    return fixed.replace(/\.?0+$/, "");
  };

  const formatWithToken = (value: string, token?: string) => {
    if (!token) return value;
    return `${value} ${token}`.trim();
  };

  const tokenSuffix =
    inputs?.token ?? filteredBridgableBalance?.symbol ?? "USDC";

  const mockPreview = useMemo(() => {
    if (!hasValidAmount || amountValue === null) return null;
    if (mockIntent) {
      return {
        totalAmount: mockIntent.totalAmount ?? "--",
        receiveAmount: mockIntent.receiveAmount ?? "--",
        totalGas: mockIntent.totalGas ?? "--",
      };
    }
    const totalGas = amountValue * 0.001;
    const totalAmount = amountValue + totalGas;
    return {
      totalAmount: formatWithToken(formatMockNumber(totalAmount), tokenSuffix),
      receiveAmount: formatWithToken(
        formatMockNumber(amountValue),
        tokenSuffix,
      ),
      totalGas: formatWithToken(formatMockNumber(totalGas), tokenSuffix),
    };
  }, [amountValue, hasValidAmount, mockIntent, tokenSuffix]);

  const showMockPreview = !isConnected && hasValidAmount && mockPreview;
  const autoIntentTriggered = useRef(false);

  useEffect(() => {
    autoIntentTriggered.current = false;
  }, [inputs?.amount, inputs?.chain, inputs?.token, inputs?.recipient]);

  useEffect(() => {
    if (!intent.current?.intent) {
      setIsSourceMenuOpen(false);
    }
  }, [intent.current?.intent]);

  useEffect(() => {
    if (!isConnected || !isSdkReady) return;
    if (!isInputsValid) return;
    if (intent.current) return;
    if (loading) return;
    if (autoIntentTriggered.current) return;
    autoIntentTriggered.current = true;
    void handleTransaction();
  }, [
    isInputsValid,
    handleTransaction,
    intent,
    isConnected,
    isSdkReady,
    loading,
  ]);
  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full px-2 sm:px-6 relative">
        {showSdkDetails && (
          <ViewHistory
            className="absolute -top-2 right-3"
            refreshNonce={historyRefreshNonce}
          />
        )}
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
          showBalanceDetails={showSdkDetails}
          maxAmount={550}
          maxAvailableAmount={maxAvailableAmount}
        />
        <RecipientAddress
          address={inputs?.recipient}
          onChange={(address) =>
            setInputs({ ...inputs, recipient: address as `0x${string}` })
          }
          disabled={!!prefill?.recipient}
        />
        {showMockPreview && (
          <div className="w-full rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-light">You spend</p>
              <p className="text-base font-light">{mockPreview?.totalAmount}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-base font-light">You receive</p>
              <p className="text-base font-light">
                {mockPreview?.receiveAmount}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-base font-light">Total gas</p>
              <p className="text-base font-light">{mockPreview?.totalGas}</p>
            </div>
          </div>
        )}

        {showSdkDetails && intent?.current?.intent && (
          <>
            <SourceBreakdown
              intent={intent?.current?.intent}
              tokenSymbol={filteredBridgableBalance?.symbol as SUPPORTED_TOKENS}
              isLoading={refreshing}
              availableSources={availableSources}
              selectedSourceChains={selectedSourceChains}
              onToggleSourceChain={toggleSourceChain}
              onSourceMenuOpenChange={setIsSourceMenuOpen}
              isSourceSelectionInsufficient={isSourceSelectionInsufficient}
              sourceCoverageState={sourceCoverageState}
              sourceCoveragePercent={sourceCoveragePercent}
              missingToProceed={missingToProceed}
              missingToSafety={missingToSafety}
              selectedTotal={selectedTotal}
              requiredTotal={requiredTotal}
              requiredSafetyTotal={requiredSafetyTotal}
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
              tokenSymbol={filteredBridgableBalance?.symbol as SUPPORTED_TOKENS}
            />
          </>
        )}

        {!intent.current && (
          <Button
            onClick={() => {
              if (!isConnected) {
                if (onConnectWallet) {
                  onConnectWallet();
                } else {
                  toast.error("Wallet connection not available");
                }
              } else if (!isSdkReady) {
                toast.info("Please wait, SDK is still initializing...");
              } else if (!isInputsValid) {
                toast.error(
                  "Please enter a valid amount and recipient address",
                );
              } else {
                // Connected, SDK ready, inputs valid - trigger transaction
                void handleTransaction();
              }
            }}
            disabled={
              !isConnected
                ? false
                : !inputs?.amount ||
                  !inputs?.recipient ||
                  !inputs?.chain ||
                  !inputs?.token ||
                  loading ||
                  Number(inputs?.amount) > 550
            }
          >
            {!isConnected
              ? "Connect Wallet"
              : !isSdkReady
                ? "Initializing..."
                : !isInputsValid
                  ? "Bridge"
                  : status === "error" || txError
                    ? "Retry"
                    : "Fetching intent..."}
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
                  disabled={refreshing || !isSourceSelectionReadyForAccept}
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
          <div className="rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-sm text-destructive-foreground flex items-start justify-between gap-x-3 mt-3 w-full">
            <span className="flex-1 w-full">{txError}</span>
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
