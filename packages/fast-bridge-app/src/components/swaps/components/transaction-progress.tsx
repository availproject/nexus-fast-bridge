import { type FC, useMemo } from "react";
import type { BridgeStepType, SwapStepType } from "../../common";
import { StepFlow } from "./step-flow";

export type DisplayStep = {
  id: string;
  label: string;
  completed: boolean;
  failed?: boolean;
  explorerUrl?: string | null;
};
type ProgressStep = BridgeStepType | SwapStepType;

interface TokenSource {
  chainLogo: string;
  symbol: string;
  tokenLogo: string;
}

interface TransactionProgressProps {
  depositOpportunityName?: string;
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
  isTransferMode?: boolean;
  sourceLogos: {
    token: string;
    chain: string;
  };
  sourceSymbol: string;
  sources?: TokenSource[];
  steps: Array<{ id: number; completed: boolean; step: ProgressStep }>;
}

const STEP_TYPES = {
  INTENT_VERIFICATION: [
    "SOURCE_SWAP",
    "EOA_TO_EPHEMERAL_TRANSFER",
    "BRIDGE_DEPOSIT",
    "BRIDGE_INTENT_SUBMISSION",
  ],
  SOURCE_STEP_TYPES: [
    "SOURCE_SWAP",
    "EOA_TO_EPHEMERAL_TRANSFER",
    "BRIDGE_DEPOSIT",
    "BRIDGE_INTENT_SUBMISSION",
  ],
  SOURCE_TRANSACTION: ["SOURCE_SWAP", "BRIDGE_DEPOSIT"],
  DESTINATION_STEP_TYPES: ["BRIDGE_FILL", "DESTINATION_SWAP"],
  TRANSACTION_COMPLETE: ["BRIDGE_FILL", "DESTINATION_SWAP"],
};

const TransactionProgress: FC<TransactionProgressProps> = ({
  steps,
  explorerUrls,
  sourceSymbol,
  destinationSymbol,
  sourceLogos,
  destinationLogos,
  hasMultipleSources,
  sources,
  isTransferMode,
  depositOpportunityName,
}) => {
  const { effectiveSteps, currentIndex, allCompleted } = useMemo(() => {
    const completedTypes = new Set<string | undefined>(
      steps?.filter((s) => s?.completed).map((s) => s?.step?.type)
    );
    // Consider only steps that were actually emitted by the SDK (ignore pre-seeded placeholders)
    const eventfulTypes = new Set<string | undefined>(
      steps
        ?.filter((s) => {
          const st = s?.step ?? {};
          return (
            "explorerURL" in st || "chain" in st || "completed" in st // present when event args were merged into step
          );
        })
        .map((s) => s?.step?.type)
    );
    const hasAny = (types: string[]) =>
      types.some((t) => completedTypes.has(t));
    const sawAny = (types: string[]) => types.some((t) => eventfulTypes.has(t));

    // Mark overall completion ONLY when the SDK reports SWAP_COMPLETE
    const baseDone = hasAny(STEP_TYPES.TRANSACTION_COMPLETE);

    // Collected on sources requires destination relayer to pick it up or full completion
    const collectedOnSources =
      hasAny(STEP_TYPES.DESTINATION_STEP_TYPES) || baseDone;

    // Filled on destination requires full on-chain swap completion
    const filledOnDestination = baseDone;

    const intentVerified =
      hasAny(STEP_TYPES.INTENT_VERIFICATION) ||
      sawAny(STEP_TYPES.SOURCE_STEP_TYPES) ||
      sawAny(STEP_TYPES.DESTINATION_STEP_TYPES) ||
      collectedOnSources ||
      filledOnDestination;

    const displaySteps: DisplayStep[] = [
      { id: "intent", label: "Intent verified", completed: intentVerified },
      {
        id: "collected",
        label: "Collected on sources",
        completed: collectedOnSources,
        explorerUrl: explorerUrls.sourceExplorerUrl,
      },
      {
        id: "filled",
        label: "Filled on destination",
        completed: filledOnDestination,
        explorerUrl: explorerUrls.destinationExplorerUrl,
      },
    ];
    if (isTransferMode) {
      displaySteps.push({
        id: "transfer",
        label: "Sent to recipient",
        completed: baseDone,
        explorerUrl: explorerUrls.destinationExplorerUrl,
      });
    }

    if (depositOpportunityName) {
      displaySteps.push({
        id: "deposit",
        label: `Deposit on ${depositOpportunityName}`,
        completed: baseDone, // swapAndExecute handles execution automatically
        failed: false, // You could parse failed state from SDK here if needed, but keeping simple for now
        explorerUrl: explorerUrls.destinationExplorerUrl, // Use destination Tx hash for deposit trace
      });
    }

    const done = baseDone;
    const current = displaySteps.findIndex(
      (st) => !(st.completed || st.failed)
    );
    return {
      effectiveSteps: displaySteps,
      currentIndex: current,
      allCompleted: done,
    };
  }, [
    steps,
    isTransferMode,
    depositOpportunityName,
    explorerUrls.sourceExplorerUrl,
    explorerUrls.destinationExplorerUrl,
  ]);

  return (
    <div className="w-full flex flex-col items-start">
      <StepFlow
        allCompleted={allCompleted}
        currentIndex={currentIndex}
        destinationLogos={destinationLogos}
        destinationSymbol={destinationSymbol}
        explorerUrls={explorerUrls}
        hasMultipleSources={hasMultipleSources}
        sourceLogos={sourceLogos}
        sourceSymbol={sourceSymbol}
        sources={sources}
        steps={effectiveSteps}
        totalSteps={effectiveSteps.length}
      />
    </div>
  );
};

export default TransactionProgress;
