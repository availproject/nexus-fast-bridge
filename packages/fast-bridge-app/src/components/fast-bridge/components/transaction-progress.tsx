import type { BridgeStepType, SwapStepType } from "@avail-project/nexus-core";
import {
  Check,
  Circle,
  LoaderPinwheel,
  SquareArrowOutUpRight,
} from "lucide-react";
import { type FC, memo, useMemo } from "react";
import { Button } from "../../ui/button";

type ProgressStep = BridgeStepType | SwapStepType;

interface TransactionProgressProps {
  completed?: boolean;
  operationType?: string;
  steps: Array<{ id: number; completed: boolean; step: ProgressStep }>;
  timer: number;
  viewIntentUrl?: string;
}

const getOperationText = (type: string) => {
  switch (type) {
    case "bridge":
      return "Transaction";
    case "transfer":
      return "Transferring";
    case "bridgeAndExecute":
      return "Bridge & Execute";
    case "swap":
      return "Swapping";
    default:
      return "Processing";
  }
};

type DisplayStep = { id: string; label: string; completed: boolean };

const StepList: FC<{ steps: DisplayStep[]; currentIndex: number }> = memo(
  ({ steps, currentIndex }) => {
    return (
      <div className="mt-6 w-full space-y-6">
        {steps.map((s, idx) => {
          const isCompleted = !!s.completed;
          const isCurrent = currentIndex === -1 ? false : idx === currentIndex;

          let rightIcon = <Circle className="size-5 text-muted-foreground" />;
          if (isCompleted) {
            rightIcon = <Check className="size-5 text-green-600" />;
          } else if (isCurrent) {
            rightIcon = (
              <LoaderPinwheel className="size-5 animate-spin text-muted-foreground" />
            );
          }

          return (
            <div
              className="flex w-full items-center justify-between"
              key={s.id}
            >
              <div className="flex items-center gap-x-3">
                <span className="font-semibold text-base">{s.label}</span>
              </div>
              {rightIcon}
            </div>
          );
        })}
      </div>
    );
  }
);
StepList.displayName = "StepList";

const TransactionProgress: FC<TransactionProgressProps> = ({
  timer,
  steps,
  viewIntentUrl,
  operationType = "bridge",
  completed = false,
}) => {
  const totalSteps = Array.isArray(steps) ? steps.length : 0;
  const completedSteps = Array.isArray(steps)
    ? steps.reduce((acc, s) => acc + (s?.completed ? 1 : 0), 0)
    : 0;
  const rawPercent = totalSteps > 0 ? completedSteps / totalSteps : 0;
  const percent = completed ? 1 : rawPercent;
  const allCompleted = completed || percent >= 1;
  const opText = getOperationText(operationType);
  const headerText = allCompleted
    ? `${opText} Completed`
    : `${opText} In Progress...`;
  const ctaText = allCompleted ? "View Explorer" : "View Intent";

  const { effectiveSteps, currentIndex } = useMemo(() => {
    const milestones = [
      "Intent verified",
      "Collected on sources",
      "Filled on destination",
    ];
    const thresholds = milestones.map(
      (_, idx) => (idx + 1) / milestones.length
    );
    const displaySteps: DisplayStep[] = milestones.map((label, idx) => ({
      id: `M${idx}`,
      label,
      completed: idx === 0 ? timer > 0 : percent >= thresholds[idx],
    }));
    const current = displaySteps.findIndex((st) => !st.completed);
    return { effectiveSteps: displaySteps, currentIndex: current };
  }, [percent, timer]);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex flex-col items-center gap-y-3">
        {allCompleted ? (
          <Check className="size-6 text-green-600" />
        ) : (
          <LoaderPinwheel className="size-6 animate-spin" />
        )}
        <p>{headerText}</p>
        <div className="flex w-full items-center justify-center">
          <span className="font-nexus-primary font-semibold text-2xl text-nexus-black">
            {Math.floor(timer)}
          </span>
          <span className="font-nexus-primary font-semibold text-base text-nexus-black">
            .
          </span>
          <span className="font-nexus-primary font-semibold text-base text-nexus-muted-secondary">
            {String(Math.floor((timer % 1) * 1000)).padStart(3, "0")}s
          </span>
        </div>
      </div>

      <StepList currentIndex={currentIndex} steps={effectiveSteps} />

      {viewIntentUrl && (
        <Button asChild className="mt-8" variant="outline">
          <a href={viewIntentUrl} rel="noreferrer" target="_blank">
            {ctaText}
            <SquareArrowOutUpRight className="size-4" />
          </a>
        </Button>
      )}
    </div>
  );
};

export default TransactionProgress;
