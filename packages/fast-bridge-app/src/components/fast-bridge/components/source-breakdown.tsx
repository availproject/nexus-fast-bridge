import {
  formatTokenBalance,
  type ReadableIntent,
  type SUPPORTED_TOKENS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { chainFeatures } from "@fastbridge/runtime";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Checkbox } from "../../ui/checkbox";
import { Skeleton } from "../../ui/skeleton";

type SourceCoverageState = "healthy" | "warning" | "error";

interface SourceBreakdownProps {
  availableSources: UserAsset["breakdown"];
  intent?: ReadableIntent;
  isLoading?: boolean;
  isSourceSelectionInsufficient?: boolean;
  missingToProceed?: string;
  missingToSafety?: string;
  onSourceMenuOpenChange?: (open: boolean) => void;
  onToggleSourceChain: (chainId: number) => void;
  requiredSafetyTotal?: string;
  requiredTotal?: string;
  selectedSourceChains: number[];
  selectedTotal?: string;
  sourceCoveragePercent?: number;
  sourceCoverageState?: SourceCoverageState;
  tokenSymbol: SUPPORTED_TOKENS;
}

function getCoverageToneClass(coverageState: SourceCoverageState): string {
  if (coverageState === "error") {
    return "text-rose-500";
  }
  if (coverageState === "warning") {
    return "text-amber-500";
  }
  return "text-emerald-500";
}

function getCoverageSurfaceClass(coverageState: SourceCoverageState): string {
  if (coverageState === "error") {
    return "text-rose-950 dark:text-rose-200";
  }
  if (coverageState === "warning") {
    return "text-amber-950 dark:text-amber-200";
  }
  return "text-emerald-950 dark:text-emerald-200";
}

const SourceBreakdown = ({
  intent,
  tokenSymbol,
  isLoading = false,
  availableSources,
  selectedSourceChains,
  onToggleSourceChain,
  onSourceMenuOpenChange,
  isSourceSelectionInsufficient = false,
  sourceCoverageState = "healthy",
  sourceCoveragePercent = 100,
  missingToProceed,
  selectedTotal,
  requiredTotal,
  requiredSafetyTotal,
}: SourceBreakdownProps) => {
  const displayTokenSymbol =
    chainFeatures.mapUsdmDisplaySymbolToUsdc &&
    intent?.token?.symbol?.toUpperCase() === "USDM"
      ? "USDC"
      : tokenSymbol;
  const normalizedCoverage = Math.max(0, Math.min(100, sourceCoveragePercent));
  const progressRadius = 16;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset =
    progressCircumference - (normalizedCoverage / 100) * progressCircumference;
  const showCoverageFeedback = Boolean(
    selectedTotal && requiredTotal && requiredSafetyTotal
  );
  const shouldShowProceedMessage =
    sourceCoverageState === "error" &&
    Number.parseFloat(missingToProceed ?? "0") > 0;

  const coverageToneClass = getCoverageToneClass(sourceCoverageState);
  const coverageSurfaceClass = getCoverageSurfaceClass(sourceCoverageState);
  const hasSingleSelectedSource = selectedSourceChains.length <= 1;
  const canToggleAllSources = availableSources.length > 1;
  const allSourcesActionLabel = hasSingleSelectedSource
    ? "Select all"
    : "Deselect all";

  const handleAllSourcesAction = () => {
    if (!canToggleAllSources) {
      return;
    }

    if (hasSingleSelectedSource) {
      const selectedSet = new Set(selectedSourceChains);
      for (const source of availableSources) {
        if (!selectedSet.has(source.chain.id)) {
          onToggleSourceChain(source.chain.id);
        }
      }
      return;
    }

    const [, ...chainsToDeselect] = selectedSourceChains;
    for (const chainId of chainsToDeselect) {
      onToggleSourceChain(chainId);
    }
  };

  return (
    <Accordion
      className="w-full"
      collapsible
      onValueChange={(value) => onSourceMenuOpenChange?.(value === "sources")}
      type="single"
    >
      <AccordionItem value="sources">
        <div className="flex w-full items-start justify-between gap-x-4">
          {isLoading ? (
            <>
              <div className="flex min-w-fit flex-col items-start gap-y-1">
                <p className="font-light text-base">You Spend</p>
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="flex min-w-fit flex-col items-end gap-y-1">
                <Skeleton className="h-5 w-24" />
                <div className="w-fit">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </>
          ) : (
            intent?.sources && (
              <>
                <div className="flex min-w-fit flex-col items-start gap-y-1">
                  <p className="font-light text-base">You Spend</p>
                  <p className="font-light text-sm">
                    {`${displayTokenSymbol} on ${
                      intent?.sources?.length
                    } ${intent?.sources?.length > 1 ? "chains" : "chain"}`}
                  </p>
                </div>

                <div className="flex min-w-fit flex-col items-end gap-y-1">
                  <p className="font-light text-base">
                    {formatTokenBalance(intent?.sourcesTotal, {
                      symbol: displayTokenSymbol,
                      decimals: intent?.token?.decimals,
                    })}
                  </p>
                  <AccordionTrigger
                    className="items-center gap-x-1 py-0"
                    containerClassName="w-fit"
                    hideChevron={false}
                  >
                    <p className="font-light text-sm">View Sources</p>
                  </AccordionTrigger>
                </div>
              </>
            )
          )}
        </div>
        {!isLoading && (
          <AccordionContent className="my-4 w-full rounded-lg bg-muted px-4 py-2 pb-0">
            {showCoverageFeedback && (
              <div
                className={cn(
                  "mb-3 rounded-md py-2 text-sm",
                  coverageSurfaceClass
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0">
                    <svg
                      aria-hidden="true"
                      className="size-12 -rotate-90"
                      viewBox="0 0 48 48"
                    >
                      <circle
                        className="text-muted-foreground/30"
                        cx="24"
                        cy="24"
                        fill="none"
                        r={progressRadius}
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <circle
                        className={coverageToneClass}
                        cx="24"
                        cy="24"
                        fill="none"
                        r={progressRadius}
                        stroke="currentColor"
                        strokeDasharray={progressCircumference}
                        strokeDashoffset={progressOffset}
                        strokeLinecap="round"
                        strokeWidth="4"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center p-1 font-medium text-[10px]">
                      {Math.round(normalizedCoverage)}%
                    </span>
                  </div>

                  <div className="flex flex-col gap-y-0.5">
                    <p className="font-medium">
                      Available on selected chains:{" "}
                      <span className="font-semibold">
                        {formatTokenBalance(
                          Number.parseFloat(selectedTotal ?? "0"),
                          {
                            symbol: displayTokenSymbol,
                            decimals: intent?.token?.decimals,
                          }
                        )}
                      </span>
                    </p>
                    <p className="font-medium">
                      Required for this transaction:{" "}
                      <span className="font-semibold">
                        {formatTokenBalance(
                          Number.parseFloat(requiredSafetyTotal ?? "0"),
                          {
                            symbol: displayTokenSymbol,
                            decimals: intent?.token?.decimals,
                          }
                        )}
                      </span>
                    </p>
                    {shouldShowProceedMessage && (
                      <p>
                        Need{" "}
                        <span className="font-semibold">
                          {missingToProceed} {displayTokenSymbol}
                        </span>{" "}
                        more on selected chains to continue.
                      </p>
                    )}
                    {!isSourceSelectionInsufficient &&
                      sourceCoverageState === "healthy" && (
                        <p>
                          You&apos;re all set. We&apos;ll only use what&apos;s
                          needed from these selected chains.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            {availableSources.length === 0 ? (
              <p className="py-2 text-muted-foreground text-sm">
                No source balances available for this token.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-y-3">
                <div className="flex w-full items-center justify-start">
                  <button
                    className={cn(
                      "font-light text-muted-foreground text-xs underline-offset-2",
                      canToggleAllSources
                        ? "cursor-pointer hover:underline"
                        : "cursor-not-allowed opacity-60"
                    )}
                    disabled={!canToggleAllSources}
                    onClick={handleAllSourcesAction}
                    type="button"
                  >
                    {allSourcesActionLabel}
                  </button>
                </div>

                {availableSources.map((source) => {
                  const chainId = source.chain.id;
                  const isSelected = selectedSourceChains.includes(chainId);
                  const isLastSelected = isSelected
                    ? selectedSourceChains.length === 1
                    : false;
                  const sourceDisplaySymbol = source.symbol;
                  const willUseAmount = intent?.sources?.find(
                    (s) => s.chainID === chainId
                  )?.amount;
                  const toggleSourceChain = () => {
                    if (isLastSelected) {
                      return;
                    }
                    onToggleSourceChain(chainId);
                  };
                  return (
                    <div
                      className="flex w-full items-center gap-x-2"
                      key={chainId}
                    >
                      <Checkbox
                        aria-label={`Select ${source.chain.name} as a source`}
                        checked={isSelected}
                        disabled={isLastSelected}
                        onCheckedChange={toggleSourceChain}
                      />

                      <button
                        className={cn(
                          "flex w-full select-none items-center justify-between gap-x-2 text-left",
                          isLastSelected
                            ? "cursor-not-allowed opacity-80"
                            : "cursor-pointer"
                        )}
                        disabled={isLastSelected}
                        onClick={toggleSourceChain}
                        type="button"
                      >
                        <div className="flex items-center gap-x-2">
                          <img
                            alt={source.chain.name}
                            className="rounded-full"
                            height={20}
                            src={source.chain.logo}
                            width={20}
                          />
                          <p className="font-light text-base">
                            {source.chain.name}
                          </p>
                        </div>

                        <div className="flex min-w-fit flex-col items-end gap-y-0.5">
                          <p className="font-light text-base">
                            {formatTokenBalance(source.balance, {
                              symbol: sourceDisplaySymbol,
                              decimals: source.decimals,
                            })}
                          </p>
                          {willUseAmount && (
                            <p className="text-muted-foreground text-xs">
                              Estimated to use:{" "}
                              {formatTokenBalance(willUseAmount, {
                                symbol: sourceDisplaySymbol,
                                decimals: intent?.token?.decimals,
                              })}
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {availableSources.length > 0 && (
              <div className="mt-3 space-y-1 text-muted-foreground text-xs">
                <p>Keep at least 1 chain selected.</p>
              </div>
            )}
          </AccordionContent>
        )}
      </AccordionItem>
    </Accordion>
  );
};

export default SourceBreakdown;
