export const resolveUsdLimitForDestination = ({
  defaultMaxAmount,
  destinationChainId,
  maxAmountByDestinationChainId,
}: {
  defaultMaxAmount?: string | number;
  destinationChainId?: number | null;
  maxAmountByDestinationChainId?: Record<number, number>;
}): number | undefined => {
  if (
    maxAmountByDestinationChainId &&
    destinationChainId !== undefined &&
    destinationChainId !== null
  ) {
    const override = maxAmountByDestinationChainId[destinationChainId];
    if (override !== undefined) {
      return override;
    }
  }

  if (defaultMaxAmount === undefined || defaultMaxAmount === null) {
    return undefined;
  }

  const parsedMaxAmount = Number(defaultMaxAmount);
  return Number.isFinite(parsedMaxAmount) && parsedMaxAmount > 0
    ? parsedMaxAmount
    : undefined;
};
