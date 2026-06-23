import {
  Atom,
  CircleCheck,
  CircleX,
  SquareArrowOutUpRight,
} from "lucide-react";
import { type FC, Fragment, memo } from "react";
import { cn } from "@/lib/utils";
import { StackedTokenIcons } from "./stacked-token-icons";
import { TokenIcon } from "./token-icon";
import type { DisplayStep } from "./transaction-progress";

interface TokenSource {
  chainLogo: string;
  symbol: string;
  tokenLogo: string;
}

interface StepFlowProps {
  allCompleted: boolean;
  currentIndex: number;
  destinationLogos: {
    token: string;
    chain: string;
  };
  destinationSymbol: string;
  explorerUrls: {
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  };
  hasMultipleSources?: boolean;
  sourceLogos: {
    token: string;
    chain: string;
  };
  sourceSymbol: string;
  sources?: TokenSource[];
  steps: DisplayStep[];
  totalSteps: number;
}

interface StepItemProps {
  allCompleted: boolean;
  explorerUrl: string | null;
  hasMultipleSources?: boolean;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isFailed: boolean;
  logos: {
    token: string;
    chain: string;
  };
  sources?: TokenSource[];
  step: DisplayStep;
  symbol: string;
  totalSteps: number;
}

const StepItem: FC<StepItemProps> = memo(
  ({
    step,
    isCompleted,
    isCurrent,
    isFailed,
    logos,
    symbol,
    totalSteps,
    index,
    explorerUrl,
    allCompleted,
    hasMultipleSources,
    sources,
  }) => {
    const isSecondLast = index === totalSteps - 2;

    // Determine opacity based on step state
    const getOpacity = () => {
      if (allCompleted) {
        return "opacity-100";
      }
      if (isCompleted) {
        return "opacity-100";
      }
      if (isCurrent) {
        return "opacity-100";
      }
      return "opacity-50";
    };

    // Render the appropriate icon based on state
    const renderIcon = () => {
      if (isSecondLast) {
        return <Atom className="size-4 animate-spin" />;
      }
      if (hasMultipleSources && sources && sources.length > 0) {
        return <StackedTokenIcons maxDisplay={3} size="sm" sources={sources} />;
      }
      return (
        <TokenIcon
          chainLogo={logos.chain}
          className="w-full h-full object-cover"
          size="sm"
          symbol={symbol}
          tokenLogo={logos.token}
        />
      );
    };

    return (
      <div
        className={cn(
          "flex gap-x-4 items-center rounded-lg w-full py-1 transition-opacity duration-300",
          getOpacity()
        )}
      >
        {/* Left Indicator */}
        {isFailed ? (
          <div className="w-6 h-6 min-w-6 min-h-6 shrink-0 flex items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <span className="w-2 h-2 min-w-[8px] min-h-[8px] rounded-full bg-red-500" />
          </div>
        ) : isCurrent ? (
          <div className="w-6 h-6 min-w-6 min-h-6 shrink-0 flex items-center justify-center rounded-full bg-chart-1/20 animate-pulse">
            <span className="w-2.5 h-2.5 min-w-[10px] min-h-[10px] rounded-full bg-chart-1" />
          </div>
        ) : isCompleted ? (
          <div className="w-6 h-6 min-w-6 min-h-6 shrink-0 flex items-center justify-center rounded-full bg-chart-1/10">
            <span className="w-2 h-2 min-w-[8px] min-h-[8px] rounded-full bg-chart-1" />
          </div>
        ) : (
          <div className="w-6 h-6 min-w-6 min-h-6 shrink-0 flex items-center justify-center rounded-full">
            <span className="w-2 h-2 min-w-[8px] min-h-[8px] rounded-full bg-muted-foreground/50" />
          </div>
        )}

        {/* Content */}
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col items-start gap-y-0.5">
            <h3
              className={cn(
                "font-medium text-sm transition-colors duration-300",
                isFailed
                  ? "text-red-500"
                  : isCompleted || isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground"
              )}
            >
              {step.label}
            </h3>
            {explorerUrl &&
              (isCompleted || isFailed) &&
              (isSecondLast || index === totalSteps - 1 || isFailed) && (
                <a
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-x-1 transition-colors"
                  href={explorerUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <SquareArrowOutUpRight className="size-3" /> View Transaction
                </a>
              )}
          </div>

          {/* Right Actions */}
          {isCurrent && !isCompleted && !isFailed && (
            <p className="text-xs text-muted-foreground">
              Step {index + 1} of {totalSteps}
            </p>
          )}
          {isCompleted && !isFailed && (
            <CircleCheck className="size-5 shrink-0 text-chart-1" />
          )}
          {isFailed && <CircleX className="size-5 shrink-0 text-red-500" />}
        </div>
      </div>
    );
  }
);

StepItem.displayName = "StepItem";

export const StepFlow: FC<StepFlowProps> = memo(
  ({
    steps,
    currentIndex,
    totalSteps,
    sourceSymbol,
    destinationSymbol,
    sourceLogos,
    destinationLogos,
    explorerUrls,
    allCompleted,
    hasMultipleSources,
    sources,
  }) => {
    return (
      <div className="flex flex-col gap-y-0 w-full">
        {steps.map((step, index) => {
          const isCompleted = !!step.completed;
          const isFailed = !!step.failed;
          const isCurrent =
            currentIndex === -1 ? false : index === currentIndex;
          const isLast = index === steps.length - 1;
          const url =
            step.explorerUrl ??
            (isLast
              ? explorerUrls.destinationExplorerUrl
              : index === steps.length - 2
                ? explorerUrls.sourceExplorerUrl
                : null);

          // For source steps (not the last step), pass multiple sources info
          const isSourceStep = !isLast;
          const showMultipleSources = isSourceStep && hasMultipleSources;

          return (
            <Fragment key={step.id}>
              <StepItem
                allCompleted={allCompleted}
                explorerUrl={url}
                hasMultipleSources={showMultipleSources}
                index={index}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                isFailed={isFailed}
                logos={isLast ? destinationLogos : sourceLogos}
                sources={showMultipleSources ? sources : undefined}
                step={step}
                symbol={isLast ? destinationSymbol : sourceSymbol}
                totalSteps={totalSteps}
              />

              {!isLast && (
                <div className="flex w-max ml-[11px]">
                  <div
                    className={cn(
                      "w-0.5 h-5 border border-dashed transition-colors duration-300",
                      isCompleted ? "border-chart-1/50" : "border-border"
                    )}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    );
  }
);

StepFlow.displayName = "StepFlow";
