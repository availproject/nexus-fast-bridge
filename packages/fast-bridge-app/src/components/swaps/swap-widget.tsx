"use client";

import { ArrowDownUp, Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";
import { useNexus } from "../nexus/nexus-provider";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import DestinationContainer from "./components/destination-container";
import SourceContainer from "./components/source-container";
import ViewTransaction from "./components/view-transaction";
import useHover from "./hooks/useHover";
import useSwaps, { type SwapInputs } from "./hooks/useSwaps";

function SwapWidget({
  onComplete,
  onStart,
  onError,
}: Readonly<{
  onComplete?: (amount?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
}>) {
  const sourceContainer = useRef<HTMLDivElement | null>(null);
  const destinationContainer = useRef<HTMLDivElement | null>(null);
  const { nexusSDK, swapIntent, swapBalance, fetchSwapBalance, getFiatValue } =
    useNexus();
  const {
    status,
    inputs,
    swapMode,
    setSwapMode,
    txError,
    setInputs,
    setTxError,
    steps,
    reset,
    explorerUrls,
    availableBalance,
    availableStables,
    formatBalance,
    destinationBalance,
    continueSwap,
    exactOutSourceOptions,
    exactOutSelectedKeys,
    toggleExactOutSource,
    isExactOutSourceSelectionDirty,
    updatingExactOutSources,
  } = useSwaps({
    nexusSDK,
    swapIntent,
    swapBalance,
    fetchBalance: fetchSwapBalance,
    onComplete,
    onStart,
    onError,
  });
  const sourceHovered = useHover(sourceContainer);
  const destinationHovered = useHover(destinationContainer);

  const handleInputSwitch = useCallback(() => {
    swapIntent.current?.deny();
    swapIntent.current = null;

    // Always reset to exactIn mode and clear amounts when switching
    setSwapMode("exactIn");

    if (!(inputs?.fromToken && inputs?.toToken)) {
      const switched: SwapInputs = {
        fromChainID: inputs.toChainID,
        toChainID: inputs.fromChainID,
        fromToken: undefined,
        toToken: undefined,
        fromAmount: undefined,
        toAmount: undefined,
      };
      setInputs(switched);
      return;
    }
    const isValidSource = swapBalance?.some((asset) =>
      (asset.breakdown ?? []).some(
        (entry) =>
          entry.chain?.id === inputs.toChainID &&
          entry.contractAddress.toLowerCase() ===
            inputs.toToken?.tokenAddress?.toLowerCase()
      )
    );
    if (!isValidSource) {
      const switched: SwapInputs = {
        fromChainID: inputs.toChainID,
        toToken: {
          tokenAddress: inputs.fromToken?.contractAddress,
          decimals: inputs.fromToken?.decimals,
          symbol: inputs.fromToken?.symbol,
          name: inputs.fromToken?.name,
          logo: inputs.fromToken?.logo,
        },
        fromToken: undefined,
        toChainID: inputs.fromChainID,
        fromAmount: undefined,
        toAmount: undefined,
      };
      setInputs(switched);
      return;
    }
    const switched: SwapInputs = {
      fromToken: {
        contractAddress: inputs.toToken?.tokenAddress,
        decimals: inputs.toToken?.decimals,
        symbol: inputs.toToken?.symbol,
        name: inputs.toToken?.name,
        logo: inputs.toToken?.logo,
      },
      fromChainID: inputs.toChainID,
      toToken: {
        tokenAddress: inputs.fromToken?.contractAddress,
        decimals: inputs.fromToken?.decimals,
        symbol: inputs.fromToken?.symbol,
        name: inputs.fromToken?.name,
        logo: inputs.fromToken?.logo,
      },
      toChainID: inputs.fromChainID,
      fromAmount: undefined,
      toAmount: undefined,
    };
    setInputs(switched);
  }, [inputs, swapIntent, swapBalance, setSwapMode, setInputs]);

  const buttonIcons = useMemo(() => {
    if (status === "simulating") {
      return <Loader2 className="animate-spin size5" />;
    }
    return swapMode === "exactIn" ? (
      <ArrowDownUp className="size-5" />
    ) : (
      <RefreshCcw className="size-5" />
    );
  }, [status, swapMode]);

  return (
    <>
      <div className="w-full max-w-md bg-background/40 rounded-2xl px-2.5 py-2 sm:p-6 border border-border">
        <div className="flex flex-col items-center w-full relative">
          <div
            className="flex flex-col gap-y-3 w-full rounded-2xl"
            ref={sourceContainer}
          >
            <SourceContainer
              availableBalance={availableBalance}
              formatBalance={formatBalance}
              getFiatValue={getFiatValue}
              inputs={inputs}
              setInputs={setInputs}
              setSwapMode={setSwapMode}
              setTxError={setTxError}
              sourceHovered={sourceHovered}
              status={status}
              swapBalance={swapBalance}
              swapIntent={swapIntent}
              swapMode={swapMode}
            />
          </div>

          {/* Swap arrow / mode toggle */}
          <Button
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            disabled={status === "simulating" || status === "swapping"}
            onClick={handleInputSwitch}
            size={"icon-lg"}
            title="Toggle between exact in and exact out"
            variant={"secondary"}
          >
            {buttonIcons}
          </Button>
          <Separator />

          {/* Buy section */}
          <div
            className="flex flex-col gap-y-3 w-full rounded-2xl"
            ref={destinationContainer}
          >
            <DestinationContainer
              availableStables={availableStables}
              destinationBalance={destinationBalance}
              destinationHovered={destinationHovered}
              formatBalance={formatBalance}
              getFiatValue={getFiatValue}
              inputs={inputs}
              setInputs={setInputs}
              setSwapMode={setSwapMode}
              status={status}
              swapBalance={swapBalance}
              swapIntent={swapIntent}
              swapMode={swapMode}
            />
          </div>
        </div>
        {status === "error" && (
          <p className="text-destructive text-sm">{txError}</p>
        )}
      </div>

      {status !== "idle" && (
        <ViewTransaction
          continueSwap={continueSwap}
          exactOutSelectedKeys={exactOutSelectedKeys}
          exactOutSourceOptions={exactOutSourceOptions}
          explorerUrls={explorerUrls}
          getFiatValue={getFiatValue}
          isExactOutSourceSelectionDirty={isExactOutSourceSelectionDirty}
          reset={reset}
          status={status}
          steps={steps}
          swapIntent={swapIntent}
          swapMode={swapMode}
          toggleExactOutSource={toggleExactOutSource}
          txError={txError}
          updatingExactOutSources={updatingExactOutSources}
        />
      )}
    </>
  );
}

export default SwapWidget;
