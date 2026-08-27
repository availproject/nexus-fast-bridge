export type IntentProgressLeg = {
  sourceIndex: number;
  status: "created" | "deposited" | "fulfilled" | "expired";
  txHash?: string;
  txExplorerUrl?: string;
  protocolExplorerUrl?: string;
  error?: string;
};

export const mergeExpectedIntentLegs = (
  sourceCount: number,
  reportedLegs: IntentProgressLeg[]
): IntentProgressLeg[] =>
  Array.from(
    { length: Math.max(sourceCount, reportedLegs.length) },
    (_, sourceIndex) =>
      reportedLegs.find((leg) => leg.sourceIndex === sourceIndex) ?? {
        sourceIndex,
        status: "created",
      }
  );

export const markIntentLegsFulfilled = (
  sourceCount: number,
  reportedLegs: IntentProgressLeg[]
): IntentProgressLeg[] =>
  mergeExpectedIntentLegs(sourceCount, reportedLegs).map((leg) => ({
    ...leg,
    error: undefined,
    status: "fulfilled",
  }));
