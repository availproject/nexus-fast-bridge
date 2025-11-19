"use client";
import React from "react";
import { Card, CardContent } from "../ui/card";
import ChainSelect from "./components/chain-select";
import TokenSelect from "./components/token-select";
import { Button } from "../ui/button";
import { LoaderPinwheel, CheckCircle2 } from "lucide-react";
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
import { toast } from "sonner";

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
    supportedChainsAndTokens,
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
    successDataRef,
    explorerUrlRef,
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
  const hasCompletionStep = React.useMemo(() => {
    return steps.some(
      (s) => {
        const stepType = s.step?.type as unknown as string;
        return (
          s.completed &&
          (stepType === "INTENT_FULFILLED" || stepType === "TRANSACTION_CONFIRMED")
        );
      }
    );
  }, [steps]);

  const hasShownSuccessToastRef = React.useRef(false);

  React.useEffect(() => {
    if (allCompleted) {
      stopTimer();
    }
  }, [allCompleted, stopTimer]);

  // Reset toast flag when new transaction starts
  React.useEffect(() => {
    if (steps.length === 0) {
      hasShownSuccessToastRef.current = false;
    }
  }, [steps.length]);

  // Show success toast when bridge completes
  React.useEffect(() => {
    // Check if bridge is completed (either via completion step or all steps completed)
    const isCompleted = hasCompletionStep || allCompleted;
    const hasData = !!successDataRef.current;
    const shouldShow = isCompleted && hasData && !hasShownSuccessToastRef.current;
    
    if (shouldShow) {
      // Use a small delay to ensure explorer URL is available
      // This handles the case where the completion step fires before the URL is set
      const timeoutId = setTimeout(() => {
        hasShownSuccessToastRef.current = true;
        const data = successDataRef.current;
        
        // Clear intent after capturing data for toast (if we have access to setIntent)
        // Note: We'll need to pass setIntent to the hook or clear it elsewhere
        
        // Helper to format amounts
        const formatAmount = (amount: string | number | undefined): string => {
          if (!amount) return "0";
          const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
          if (Number.isNaN(num)) return String(amount);
          const str = num.toString();
          if (str.includes(".")) {
            return str.replace(/\.?0+$/, "");
          }
          return str;
        };

        const tokenSymbol = data?.token?.symbol || "";
        const sources = data?.sources || [];
        const sourcesText = sources.length > 0
          ? sources.map((s: any) => s.chainName).join(", ")
          : "N/A";
        const destinationText = data?.destination?.chainName || "Unknown";
        const amountSpent = sources.length > 0
          ? sources.reduce((sum: number, s: any) => sum + Number.parseFloat(s.amount || "0"), 0)
          : 0;
        const amountReceived = formatAmount(data?.destination?.amount);
        const totalFees = formatAmount(data?.fees?.total);

        // Get explorer URL from multiple sources - check all possibilities
        // The URL might be in the data ref, the explorerUrlRef, or the lastExplorerUrl state
        // Check in order: data ref (most reliable), then explorerUrlRef, then lastExplorerUrl state
        let explorerUrl: string | null = null;
        
        if (data?.explorerUrl && typeof data.explorerUrl === "string" && data.explorerUrl.trim() !== "") {
          explorerUrl = data.explorerUrl;
        } else if (explorerUrlRef.current && typeof explorerUrlRef.current === "string" && explorerUrlRef.current.trim() !== "") {
          explorerUrl = explorerUrlRef.current;
          // Also update successDataRef with the URL for consistency
          if (successDataRef.current) {
            successDataRef.current.explorerUrl = explorerUrlRef.current;
          }
        } else if (lastExplorerUrl && typeof lastExplorerUrl === "string" && lastExplorerUrl.trim() !== "") {
          explorerUrl = lastExplorerUrl;
          // Also update successDataRef with the URL for consistency
          if (successDataRef.current) {
            successDataRef.current.explorerUrl = lastExplorerUrl;
          }
        }
        
        // Debug: Log URL availability
        console.log("Explorer URL check:", {
          dataExplorerUrl: data?.explorerUrl,
          explorerUrlRef: explorerUrlRef.current,
          lastExplorerUrl,
          finalExplorerUrl: explorerUrl,
        });
        
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
                <span className="font-medium">Destination:</span> {destinationText}
              </div>
              <div>
                <span className="font-medium">Asset:</span> {tokenSymbol}
              </div>
              <div>
                <span className="font-medium">Amount Spent:</span> {formatAmount(amountSpent)} {tokenSymbol}
              </div>
              <div>
                <span className="font-medium">Amount Received:</span> {amountReceived} {tokenSymbol}
              </div>
              <div>
                <span className="font-medium">Total Fees:</span> {totalFees} {tokenSymbol}
              </div>
              {explorerUrl ? (
                <div className="mt-2 pt-2 border-t">
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View Intent on Explorer
                  </a>
                </div>
              ) : null}
            </div>
          </div>,
          {
            duration: Infinity, // Stay until dismissed
            closeButton: true,
            icon: null, // Remove default icon since we're adding our own
          }
        );
      }, 100); // Small delay to ensure URL is available
      
      return () => clearTimeout(timeoutId);
    }
  }, [hasCompletionStep, allCompleted, steps, lastExplorerUrl]);

  // Helper function to determine if transaction is in progress
  const isTransactionInProgress = React.useMemo(() => {
    if (steps.length === 0) return false; // No steps = not started
    if (txError) return false; // Error = not in progress
    
    // Check if transaction is completed
    const hasCompletionStep = steps.some(
      (s) => {
        const stepType = s.step?.type as unknown as string;
        return (
          s.completed &&
          (stepType === "INTENT_FULFILLED" || stepType === "TRANSACTION_CONFIRMED")
        );
      }
    );
    const allStepsCompleted = steps.length > 0 && steps.every((s) => s.completed);
    const isCompleted = hasCompletionStep || allStepsCompleted;
    
    // In progress if steps exist but not completed
    return !isCompleted;
  }, [steps, txError]);

  // Calculate adjusted balance (unified balance minus balance on destination chain)
  const adjustedBalance = React.useMemo(() => {
    if (!filteredUnifiedBalance?.balance || !inputs?.chain) {
      return filteredUnifiedBalance?.balance || "0";
    }

    // Find the balance already on the destination chain
    let balanceOnDestinationChain = "0";
    if (filteredUnifiedBalance?.breakdown) {
      const destinationBalance = filteredUnifiedBalance.breakdown.find(
        (balance) => balance.chain.id === inputs.chain
      );
      if (destinationBalance) {
        balanceOnDestinationChain = destinationBalance.balance || "0";
      }
    }

    // Calculate unified balance minus balance on destination chain
    const unifiedBal = Number.parseFloat(filteredUnifiedBalance.balance || "0");
    const destBal = Number.parseFloat(balanceOnDestinationChain);
    const adjusted = Math.max(0, unifiedBal - destBal);

    return adjusted.toString();
  }, [filteredUnifiedBalance, inputs?.chain]);

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full">
        <ChainSelect
          selectedChain={inputs?.chain}
          handleSelect={(chain) => {
            // Get tokens supported on the new chain
            const newChainTokens = supportedChainsAndTokens?.find(
              (c) => c.id === chain
            )?.tokens;
            
            // Check if current token is supported on the new chain
            const isCurrentTokenSupported = newChainTokens?.some(
              (token) => token.symbol === inputs?.token
            );
            
            // Determine the token to use
            let newToken: SUPPORTED_TOKENS | undefined = inputs?.token;
            
            if (!isCurrentTokenSupported) {
              // Current token not supported - select a default token
              if (newChainTokens && newChainTokens.length > 0) {
                // Prefer USDC if available, otherwise use the first token
                const usdcToken = newChainTokens.find((t) => t.symbol === "USDC");
                newToken = (usdcToken?.symbol as SUPPORTED_TOKENS) ?? (newChainTokens[0]?.symbol as SUPPORTED_TOKENS);
              } else {
                // No tokens available on new chain - clear token selection
                newToken = undefined;
              }
            }
            
            setInputs((prev) => ({
              ...prev,
              chain,
              token: newToken,
            }));
          }}
          label={
            <>
              <span className="md:hidden">Fast Bridge to</span>
              <span className="hidden md:inline">To</span>
            </>
          }
        />
        <TokenSelect
          selectedChain={inputs?.chain}
          selectedToken={inputs?.token}
          handleTokenSelect={(token) => setInputs((prev) => ({ ...prev, token }))}
        />
        <AmountInput
          amount={inputs?.amount}
          onChange={(amount) => setInputs((prev) => ({ ...prev, amount }))}
          unifiedBalance={filteredUnifiedBalance}
          onCommit={() => commitAmount()}
          disabled={!!prefill?.amount}
          inputs={inputs}
        />
        <BalanceBreakdown assetBalances={filteredUnifiedBalance as UserAsset} />
        <ReceipientAddress
          address={inputs?.recipient}
          onChange={(address) =>
            setInputs((prev) => ({ ...prev, recipient: address as `0x${string}` }))
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
                  {(() => {
                    const amount = intent?.intent?.destination?.amount;
                    if (!amount) return "0";
                    const num = Number.parseFloat(String(amount));
                    if (Number.isNaN(num)) return String(amount);
                    const str = num.toString();
                    // Only remove trailing zeros if there's a decimal point
                    if (str.includes(".")) {
                      return str.replace(/\.?0+$/, "");
                    }
                    return str;
                  })()}{" "}
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
        {(() => {
          const getBridgeLimit = (tokenSymbol?: string): number => {
            // Only enforce limits in testnet
            if (network !== "testnet") return Infinity;
            
            if (!tokenSymbol) return Infinity;
            const upperSymbol = tokenSymbol.toUpperCase();
            if (upperSymbol === "ETH") return 0.1;
            if (upperSymbol === "USDC" || upperSymbol === "USDT") return 200;
            return Infinity;
          };

          const amount = parseFloat(inputs?.amount || "0");
          const limit = getBridgeLimit(filteredUnifiedBalance?.symbol);
          const exceedsLimit = amount > limit;
          const exceedsBalance = amount > parseFloat(adjustedBalance || "0");

          // Check if we should show loading (only if amount is within limits)
          const shouldShowLoading = loading || (
            !intent?.intent &&
            inputs?.chain &&
            inputs?.token &&
            inputs?.amount &&
            amount > 0 &&
            inputs?.recipient &&
            filteredUnifiedBalance &&
            !exceedsLimit &&
            !exceedsBalance
          );
          
          // Also check if intent exists but is missing required data
          const intentIncomplete = intent?.intent && (
            !intent.intent.destination?.amount ||
            !intent.intent.destination?.chainName ||
            !intent.intent.sources ||
            intent.intent.sources.length === 0 ||
            !intent.intent.fees?.total
          );
          
          return (shouldShowLoading || intentIncomplete) && (
            <div className="flex items-center justify-center gap-2 py-4">
              <LoaderPinwheel className="animate-spin size-5" />
              <span className="text-base text-muted-foreground">
                Fetching bridge details...
              </span>
            </div>
          );
        })()}

        {/* Helper function to get bridge limit */}
        {(() => {
          const getBridgeLimit = (tokenSymbol?: string): number => {
            // Only enforce limits in testnet
            if (network !== "testnet") return Infinity;
            
            if (!tokenSymbol) return Infinity;
            const upperSymbol = tokenSymbol.toUpperCase();
            if (upperSymbol === "ETH") return 0.1;
            if (upperSymbol === "USDC" || upperSymbol === "USDT") return 200;
            return Infinity;
          };

          const amount = parseFloat(inputs?.amount || "0");
          const limit = getBridgeLimit(filteredUnifiedBalance?.symbol);
          const exceedsLimit = amount > limit;
          const exceedsBalance = amount > parseFloat(adjustedBalance || "0");

          // Show bridge limit exceeded message (higher priority)
          if (
            !intent?.intent &&
            inputs?.chain &&
            inputs?.token &&
            inputs?.amount &&
            amount > 0 &&
            inputs?.recipient &&
            filteredUnifiedBalance &&
            exceedsLimit
          ) {
            return (
              <div className="text-center py-4">
                <p className="text-base text-red-600">
                  Maximum bridge limit exceeded. You can bridge up to {limit} {filteredUnifiedBalance.symbol} at a time.
                </p>
              </div>
            );
          }

          // Show amount exceeds balance message
          if (
            !intent?.intent &&
            inputs?.chain &&
            inputs?.token &&
            inputs?.amount &&
            amount > 0 &&
            inputs?.recipient &&
            filteredUnifiedBalance &&
            exceedsBalance
          ) {
            return (
              <div className="text-center py-4">
                <p className="text-base text-red-600">
                  Amount exceeds available balance. Please enter a valid amount to
                  see bridge details.
                </p>
              </div>
            );
          }

          return null;
        })()}

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
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            // Only allow closing if transaction is not in progress
            // If user is trying to close (open = false) and transaction is in progress, prevent it
            if (isTransactionInProgress && !open) {
              return; // Prevent closing when in progress
            }
            setIsDialogOpen(open);
          }}
        >
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
          <DialogContent
            showCloseButton={!isTransactionInProgress}
            onInteractOutside={(e) => {
              // Prevent closing by clicking outside when transaction is in progress
              if (isTransactionInProgress) {
                e.preventDefault();
              }
            }}
          >
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
        <div className="flex w-full items-center gap-x-1 justify-center">
          <p className="text-xs md:text-sm font-light" style={{ color: "#666666" }}>
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
              className="w-12 md:w-16 h-auto"
              style={{ opacity: 0.5 }}
            />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default FastBridge;
