import { Atom, CircleCheck, SquareArrowOutUpRight } from "lucide-react";
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
          className="h-full w-full object-cover"
          size="sm"
          symbol={symbol}
          tokenLogo={logos.token}
        />
      );
    };

    return (
      <div
        className={cn(
          "flex w-full items-center gap-x-4 rounded-lg py-1 transition-opacity duration-300",
          getOpacity()
        )}
      >
        {/* Left Indicator */}
        {isCurrent ? (
          <div className="relative rounded-full">
            <div
              className={cn(
                "flex animate-pulse items-center justify-center rounded-full ring-2 ring-chart-1 ring-offset-2 ring-offset-background transition-all duration-300",
                hasMultipleSources ? "min-w-max px-1" : "size-6"
              )}
            >
              {renderIcon()}
            </div>
          </div>
        ) : isCompleted ? (
          <div className="flex size-6 items-center justify-center rounded-full bg-chart-1/10">
            <span className="size-2 rounded-full bg-chart-1" />
          </div>
        ) : (
          <div className="flex size-6 items-center justify-center rounded-full">
            <span className="size-2 rounded-full bg-muted-foreground/50" />
          </div>
        )}

        {/* Content */}
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col items-start gap-y-0.5">
            <h3
              className={cn(
                "font-medium text-sm transition-colors duration-300",
                isCompleted || isCurrent
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </h3>
            {explorerUrl &&
              isCompleted &&
              (isSecondLast || index === totalSteps - 1) && (
                <a
                  className="inline-flex items-center gap-x-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                  href={explorerUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <SquareArrowOutUpRight className="size-3" /> View Transaction
                </a>
              )}
          </div>

          {/* Right Actions */}
          {isCurrent && !isCompleted && (
            <p className="text-muted-foreground text-xs">
              Step {index + 1} of {totalSteps}
            </p>
          )}
          {isCompleted && <CircleCheck className="size-5 text-chart-1" />}
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
      <div className="flex w-full flex-col gap-y-0">
        {steps.map((step, index) => {
          const isCompleted = !!step.completed;
          const isCurrent =
            currentIndex === -1 ? false : index === currentIndex;
          const isLast = index === steps.length - 1;
          const url = isLast
            ? explorerUrls.destinationExplorerUrl
            : index === steps.length - 2
              ? explorerUrls.sourceExplorerUrl
              : null;

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
                logos={isLast ? destinationLogos : sourceLogos}
                sources={showMultipleSources ? sources : undefined}
                step={step}
                symbol={isLast ? destinationSymbol : sourceSymbol}
                totalSteps={totalSteps}
              />

              {!isLast && (
                <div className="ml-[11px] flex w-max">
                  <div
                    className={cn(
                      "h-5 w-0.5 border border-dashed transition-colors duration-300",
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
