"use client";
import type {
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import Decimal from "decimal.js";
import { CheckCircle2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import { useWalletClient } from "wagmi";
import { getChainSlugById } from "@/config/chain-settings";
import { persistToken, useRuntime } from "@/providers/runtime-context";
import { useNexus } from "../nexus/nexus-provider";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import ViewHistory from "../view-history/view-history";
import AllowanceModal from "./components/allowance-modal";
import AmountInput from "./components/amount-input";
import ChainSelect from "./components/chain-select";
import FeeBreakdown from "./components/fee-breakdown";
import FluffeyMascot from "./components/fluffey-mascot";
import RecipientAddress from "./components/recipient-address";
import SourceBreakdown from "./components/source-breakdown";
import TokenSelect from "./components/token-select";
import TransactionProgress from "./components/transaction-progress";
import useBridge from "./hooks/use-bridge";

const TRAILING_ZEROES_REGEX = /\.?0+$/;

const formatMockNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    return "--";
  }
  const fixed = value.toFixed(6);
  return fixed.replace(TRAILING_ZEROES_REGEX, "");
};

const formatWithToken = (value: string, token?: string) => {
  if (!token) {
    return value;
  }
  return `${value} ${token}`.trim();
};

const getDisplayTokenSymbol = (
  tokenSymbol: string | undefined,
  mapUsdmToUsdc: boolean
) => {
  if (!tokenSymbol) {
    return "Unknown";
  }
  if (mapUsdmToUsdc && tokenSymbol.toUpperCase() === "USDM") {
    return "USDC";
  }
  return tokenSymbol;
};

const getPrimaryButtonLabel = ({
  isLoading,
  isConnected,
  isSdkReady,
  isInputsValid,
  hasError,
}: {
  hasError: boolean;
  isLoading: boolean;
  isConnected: boolean;
  isInputsValid: boolean;
  isSdkReady: boolean;
}) => {
  if (!isConnected) {
    return "Connect Wallet";
  }
  if (!isSdkReady) {
    return "Initializing...";
  }
  if (!isInputsValid) {
    return "Bridge";
  }
  if (isLoading) {
    return "Fetching intent...";
  }
  return hasError ? "Retry" : "Bridge";
};

interface FastBridgeProps {
  connectedAddress?: Address;
  isWalletConnected?: boolean;
  mockIntent?: {
    totalAmount?: string;
    receiveAmount?: string;
    totalGas?: string;
  };
  onComplete?: () => void;
  onConnectWallet?: () => void;
  onError?: (message: string) => void;
  onStart?: () => void;
  prefill?: {
    token: SUPPORTED_TOKENS;
    chainId: SUPPORTED_CHAINS_IDS;
    amount?: string;
    recipient?: Address;
  };
}

interface BridgeSuccessToastData {
  amountReceived: string;
  amountSpent: string;
  asset: string;
  destination: string;
  sources: string;
  totalFees: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This component coordinates bridge form state, SDK lifecycle, and transaction UI in one view.
function FastBridge({
  connectedAddress,
  isWalletConnected,
  onConnectWallet,
  mockIntent,
  onComplete,
  onStart,
  onError,
  prefill,
}: FastBridgeProps) {
  const { chainFeatures, brandButton, setChain, appConfig } = useRuntime();
  const maxBridgeAmount = chainFeatures.maxBridgeAmount;
  const mapUsdmToUsdc = chainFeatures.mapUsdmDisplaySymbolToUsdc ?? false;
  const postBridgeWatchAsset = chainFeatures.postBridgeWatchAsset;

  const {
    nexusSDK,
    intent,
    bridgableBalance,
    allowance,
    network,
    fetchBridgableBalance,
  } = useNexus();
  const { data: walletClient } = useWalletClient();
  const [historyRefreshNonce, setHistoryRefreshNonce] = useState(0);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);

  const buildBridgeSuccessToastData =
    useCallback((): BridgeSuccessToastData => {
      const currentIntent = intent.current?.intent;
      const sourcesText =
        currentIntent?.sources && currentIntent.sources.length > 0
          ? currentIntent.sources.map((source) => source.chainName).join(", ")
          : "N/A";
      const destination = currentIntent?.destination?.chainName ?? "Unknown";
      const tokenSymbol = currentIntent?.token?.symbol;
      const displaySymbol = getDisplayTokenSymbol(tokenSymbol, mapUsdmToUsdc);
      const asset = tokenSymbol ?? "Unknown";
      const amountSpent = currentIntent?.sourcesTotal
        ? new Decimal(currentIntent.sourcesTotal).toFixed()
        : "NaN";
      const amountReceived = currentIntent?.destination?.amount
        ? new Decimal(currentIntent.destination.amount).toFixed()
        : "NaN";
      const totalFees = currentIntent?.fees?.total
        ? new Decimal(currentIntent.fees.total).toFixed()
        : "NaN";

      return {
        sources: sourcesText,
        destination,
        asset,
        amountSpent: `${amountSpent} ${displaySymbol}`,
        amountReceived: `${amountReceived} ${asset}`,
        totalFees: `${totalFees} ${displaySymbol}`,
      };
    }, [intent]);

  const runPostBridgeWalletAction = useCallback(async () => {
    const destinationChainId = Number(
      intent.current?.intent?.destination?.chainID
    );
    const tokenSymbol = intent.current?.intent?.token?.symbol;
    if (
      !postBridgeWatchAsset ||
      tokenSymbol?.toUpperCase() !==
        postBridgeWatchAsset.tokenSymbol.toUpperCase() ||
      destinationChainId !== postBridgeWatchAsset.destinationChainId
    ) {
      return;
    }
    try {
      const currentChainId = await walletClient?.getChainId?.();
      if (
        currentChainId &&
        currentChainId !== postBridgeWatchAsset.destinationChainId
      ) {
        await walletClient?.switchChain?.({
          id: postBridgeWatchAsset.destinationChainId,
        });
      }
      await walletClient?.watchAsset?.({
        type: "ERC20",
        options: {
          address: postBridgeWatchAsset.walletAsset.address as Address,
          symbol: postBridgeWatchAsset.walletAsset.symbol,
          decimals: postBridgeWatchAsset.walletAsset.decimals,
          image: postBridgeWatchAsset.walletAsset.image,
        },
      });
    } catch (error) {
      console.error("Failed to add token to wallet:", error);
    }
  }, [intent, walletClient, postBridgeWatchAsset]);

  const showBridgeSuccessToast = useCallback((data: BridgeSuccessToastData) => {
    toast.success(
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-green-500" />
          <span className="font-semibold">Bridge Successful!</span>
        </div>
        <div className="flex flex-col gap-1.5 text-muted-foreground text-sm">
          <div>
            <span className="font-medium">Source(s):</span> {data.sources}
          </div>
          <div>
            <span className="font-medium">Destination:</span> {data.destination}
          </div>
          <div>
            <span className="font-medium">Asset:</span> {data.asset}
          </div>
          <div>
            <span className="font-medium">Amount Spent:</span>{" "}
            {data.amountSpent}
          </div>
          <div>
            <span className="font-medium">Amount Received:</span>{" "}
            {data.amountReceived}
          </div>
          <div>
            <span className="font-medium">Total Fees:</span> {data.totalFees}
          </div>
        </div>
      </div>,
      {
        duration: Number.POSITIVE_INFINITY,
        closeButton: true,
        icon: null,
      }
    );
  }, []);

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
    allowanceStepState,
  } = useBridge({
    prefill,
    network: network ?? "mainnet",
    connectedAddress,
    nexusSDK,
    intent,
    bridgableBalance,
    allowance,
    onComplete: () => {
      const toastData = buildBridgeSuccessToastData();
      showBridgeSuccessToast(toastData);
      if (onComplete) {
        onComplete();
      }
      setHistoryRefreshNonce((prev) => prev + 1);
      runPostBridgeWalletAction().catch((error) => {
        console.error("Post-bridge wallet action failed:", error);
      });
    },
    onStart,
    onError: (message) => {
      toast.error(message);
      if (onError) {
        onError(message);
      }
    },
    fetchBalance: fetchBridgableBalance,
    maxAmount: maxBridgeAmount,
    isSourceMenuOpen,
  });
  const isConnected = isWalletConnected ?? Boolean(connectedAddress);
  const isSdkReady = Boolean(nexusSDK);
  const showSdkDetails = isSdkReady;
  const autoIntentTriggered = useRef(false);
  const lastAutoIntentKeyRef = useRef("");
  const autoIntentKey = useMemo(
    () =>
      [
        inputs?.amount ?? "",
        inputs?.chain ?? "",
        inputs?.token ?? "",
        inputs?.recipient ?? "",
      ].join("|"),
    [inputs?.amount, inputs?.chain, inputs?.token, inputs?.recipient]
  );

  useEffect(() => {
    if (lastAutoIntentKeyRef.current === autoIntentKey) {
      return;
    }
    lastAutoIntentKeyRef.current = autoIntentKey;
    autoIntentTriggered.current = false;
  }, [autoIntentKey]);

  const receiveSymbol =
    intent?.current?.intent?.token.symbol ?? filteredBridgableBalance?.symbol;
  const amountValue = useMemo(() => {
    if (!inputs?.amount) {
      return null;
    }
    const parsed = Number.parseFloat(inputs.amount);
    return Number.isFinite(parsed) ? parsed : null;
  }, [inputs?.amount]);

  const hasValidAmount = useMemo(() => {
    if (amountValue === null) {
      return false;
    }
    return amountValue > 0;
  }, [amountValue]);

  const tokenSuffix =
    inputs?.token ?? filteredBridgableBalance?.symbol ?? "USDC";

  const mockPreview = useMemo(() => {
    if (!hasValidAmount || amountValue === null) {
      return null;
    }
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
        tokenSuffix
      ),
      totalGas: formatWithToken(formatMockNumber(totalGas), tokenSuffix),
    };
  }, [amountValue, hasValidAmount, mockIntent, tokenSuffix]);

  const showMockPreview = !isConnected && hasValidAmount && mockPreview;

  const runHandleTransaction = useCallback(() => {
    handleTransaction().catch((error) => {
      console.error("Failed to handle transaction:", error);
    });
  }, [handleTransaction]);

  const runCommitAmount = useCallback(() => {
    commitAmount().catch((error) => {
      console.error("Failed to commit amount:", error);
    });
  }, [commitAmount]);

  useEffect(() => {
    if (!intent.current?.intent) {
      setIsSourceMenuOpen(false);
    }
  }, [intent.current?.intent]);

  useEffect(() => {
    if (!(isConnected && isSdkReady)) {
      return;
    }
    if (
      !(inputs?.amount && inputs?.chain && inputs?.token && inputs?.recipient)
    ) {
      return;
    }
    if (!isInputsValid) {
      return;
    }
    // Wait for balance hydration before attempting auto intent creation.
    if (!bridgableBalance) {
      return;
    }
    if (availableSources.length === 0) {
      return;
    }
    if (intent.current) {
      return;
    }
    // Removed if (status !== "idle" || txError) and if (loading) checks to allow overlapping fetches
    if (autoIntentTriggered.current) {
      return;
    }
    autoIntentTriggered.current = true;
    runHandleTransaction();
  }, [
    availableSources.length,
    bridgableBalance,
    inputs?.amount,
    inputs?.chain,
    inputs?.recipient,
    inputs?.token,
    isInputsValid,
    intent,
    isConnected,
    isSdkReady,
    runHandleTransaction,
  ]);
  const hasStatusError = status === "error" || Boolean(txError);
  const primaryButtonLabel = getPrimaryButtonLabel({
    isLoading: loading,
    isConnected,
    isSdkReady,
    isInputsValid,
    hasError: hasStatusError,
  });
  const handlePrimaryButtonClick = () => {
    if (!isConnected) {
      if (
        chainFeatures.enableGtagOnConnectWallet &&
        typeof window !== "undefined" &&
        // @ts-expect-error - gtag_report_conversion is conditionally added by a global script
        typeof window.gtag_report_conversion === "function"
      ) {
        // @ts-expect-error - expected injected global method
        window.gtag_report_conversion(window.location.href);
      }
      if (onConnectWallet) {
        onConnectWallet();
      } else {
        toast.error("Wallet connection not available");
      }
      return;
    }
    if (!isSdkReady) {
      toast.info("Please wait, SDK is still initializing...");
      return;
    }
    if (isInputsValid) {
      runHandleTransaction();
      return;
    }
    toast.error("Please enter a valid amount and recipient address");
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-y-4">
      {chainFeatures.showFluffeyMascot && <FluffeyMascot />}

      {/* mascot — cross-fades smoothly when the URL changes */}
      <AnimatePresence mode="wait">
        {appConfig.mascotImageUrl && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none fixed right-0 bottom-0 left-0 z-10 flex w-full justify-center"
            exit={{ opacity: 0, y: 16 }}
            initial={{ opacity: 0, y: 16 }}
            key={appConfig.mascotImageUrl}
            style={{ willChange: "opacity, transform" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div>
              <img
                alt="Mascot"
                className="h-full w-full object-contain"
                height={400}
                src={appConfig.mascotImageUrl}
                width={550}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* {chainFeatures.showPromoBanner && (
        <div
          className="relative z-10 flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-primary shadow-sm"
          style={{
            background:
              "linear-gradient(180deg, #F5AF94 0%, #FF8AA8 70%, #90D79F 75%, #7EAAD4 100%)",
          }}
        >
          <div className="flex items-center gap-x-3">
            <img
              alt="Promo mascot"
              className="-my-5 flex w-10 shrink-0 items-center justify-center"
              height={112}
              src={
                chainFeatures.promoBannerImageUrl ??
                "https://files.availproject.org/fastbridge/megaeth/megaeth-mascot-1.png"
              }
              style={{ aspectRatio: "5/14" }}
              width={40}
            />
            <p className="font-medium text-sm">
              <EncryptedText
                charset="AEFHIJKLNPRSTUXYabcdefghijklmnopqrstuvwxyz"
                encryptedClassName="text-primary"
                flipDelayMs={25}
                revealDelayMs={50}
                revealedClassName="text-primary"
                text={
                  chainFeatures.promoBannerLine1 ??
                  "Zero solver and protocol fees when bridging to MegaETH."
                }
              />
              <br />
              <EncryptedText
                charset="AEFHIJKLNPRSTUXYabcdefghijklmnopqrstuvwxyz"
                encryptedClassName="text-primary"
                flipDelayMs={25}
                revealDelayMs={50}
                revealedClassName="text-primary"
                text={
                  chainFeatures.promoBannerLine2 ??
                  "48h window. Don't fade anon."
                }
              />
            </p>
          </div>
        </div>
      )} */}
      <Card className="relative z-10 w-full">
        <CardContent className="relative flex w-full flex-col gap-y-4 px-2 sm:px-6">
          {showSdkDetails && (
            <ViewHistory
              className="absolute -top-2 right-3"
              refreshNonce={historyRefreshNonce}
            />
          )}
          <ChainSelect
            disabled={!!prefill?.chainId}
            handleSelect={(chainId) => {
              const slug = getChainSlugById(chainId);
              if (slug) {
                setChain(slug);
              } else {
                setInputs({ ...inputs, chain: chainId });
              }
            }}
            label="To"
            selectedChain={inputs?.chain}
          />
          <TokenSelect
            disabled={!!prefill?.token}
            handleTokenSelect={(token) => {
              persistToken(token);
              setInputs({ ...inputs, token });
            }}
            selectedChain={inputs?.chain}
            selectedToken={inputs?.token}
          />
          <AmountInput
            amount={inputs?.amount}
            bridgableBalance={filteredBridgableBalance}
            disabled={refreshing || !!prefill?.amount}
            inputs={inputs}
            maxAmount={maxBridgeAmount}
            maxAvailableAmount={maxAvailableAmount}
            onChange={(amount) => setInputs({ ...inputs, amount })}
            onCommit={runCommitAmount}
            showBalanceDetails={showSdkDetails}
          />
          <RecipientAddress
            address={inputs?.recipient}
            disabled={!!prefill?.recipient}
            onChange={(address) =>
              setInputs({ ...inputs, recipient: address as `0x${string}` })
            }
          />
          {showMockPreview && (
            <div className="w-full space-y-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="font-light text-base">You spend</p>
                <p className="font-light text-base">
                  {mockPreview?.totalAmount}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-light text-base">You receive</p>
                <p className="font-light text-base">
                  {mockPreview?.receiveAmount}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-light text-base">Total gas</p>
                <p className="font-light text-base">{mockPreview?.totalGas}</p>
              </div>
            </div>
          )}

          {showSdkDetails && intent?.current?.intent && (
            <>
              <SourceBreakdown
                availableSources={availableSources}
                intent={intent?.current?.intent}
                isLoading={refreshing}
                isSourceSelectionInsufficient={isSourceSelectionInsufficient}
                missingToProceed={missingToProceed}
                missingToSafety={missingToSafety}
                onSourceMenuOpenChange={setIsSourceMenuOpen}
                onToggleSourceChain={toggleSourceChain}
                requiredSafetyTotal={requiredSafetyTotal}
                requiredTotal={requiredTotal}
                selectedSourceChains={selectedSourceChains}
                selectedTotal={selectedTotal}
                sourceCoveragePercent={sourceCoveragePercent}
                sourceCoverageState={sourceCoverageState}
                tokenSymbol={
                  filteredBridgableBalance?.symbol as SUPPORTED_TOKENS
                }
              />

              <div className="flex w-full items-start justify-between gap-x-4">
                <p className="font-light text-base">You receive</p>
                <div className="flex min-w-fit flex-col gap-y-1">
                  {refreshing ? (
                    <Skeleton className="h-5 w-28" />
                  ) : (
                    <p className="text-right font-light text-base">
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
                    <p className="text-right font-light text-sm">
                      on {intent?.current?.intent?.destination?.chainName}
                    </p>
                  )}
                </div>
              </div>
              <FeeBreakdown
                intent={intent?.current?.intent}
                isLoading={refreshing}
                tokenSymbol={
                  filteredBridgableBalance?.symbol as SUPPORTED_TOKENS
                }
              />
            </>
          )}

          {!intent.current && (
            <Button
              disabled={
                isConnected
                  ? !(
                      inputs?.amount &&
                      inputs?.recipient &&
                      inputs?.chain &&
                      inputs?.token
                    ) ||
                    loading ||
                    Number(inputs?.amount) > maxBridgeAmount
                  : false
              }
              onClick={handlePrimaryButtonClick}
              style={{
                backgroundColor: brandButton.bg,
                color: brandButton.fg,
                transition:
                  "background-color 0.5s ease-in-out, color 0.3s ease-in-out",
              }}
            >
              {primaryButtonLabel}
            </Button>
          )}

          <Dialog
            onOpenChange={(open) => {
              if (loading) {
                return;
              }
              setIsDialogOpen(open);
            }}
            open={isDialogOpen}
          >
            {intent.current && !isDialogOpen && (
              <div className="flex w-full items-center justify-between gap-x-2">
                <Button
                  className="w-1/2"
                  onClick={reset}
                  variant={"destructive"}
                >
                  Deny
                </Button>
                <DialogTrigger asChild>
                  <Button
                    className="w-1/2"
                    disabled={refreshing || !isSourceSelectionReadyForAccept}
                    onClick={startTransaction}
                    style={{
                      backgroundColor: brandButton.bg,
                      color: brandButton.fg,
                      transition:
                        "background-color 0.5s ease-in-out, color 0.3s ease-in-out",
                    }}
                  >
                    {refreshing ? "Refreshing..." : "Accept"}
                  </Button>
                </DialogTrigger>
              </div>
            )}

            <DialogContent
              showCloseButton={chainFeatures.dialogShowCloseButton}
            >
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
                  allowanceStepState={allowanceStepState}
                  completed={status === "success"}
                  operationType={"bridge"}
                  steps={steps}
                  timer={timer}
                  viewIntentUrl={lastExplorerUrl}
                />
              )}
            </DialogContent>
          </Dialog>

          {txError && (
            <div className="mt-3 flex w-full items-start justify-between gap-x-3 rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-destructive-foreground text-sm">
              <span className="w-full flex-1">{txError}</span>
              <Button
                aria-label="Dismiss error"
                className="text-destructive-foreground/80 hover:text-destructive-foreground focus:outline-none"
                onClick={() => {
                  reset();
                  setTxError(null);
                }}
                size={"icon"}
                type="button"
                variant={"ghost"}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FastBridge;
