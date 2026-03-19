import type {
  BridgeStepType,
  NexusNetwork,
  NexusSDK,
  OnAllowanceHookData,
  OnIntentHookData,
  UserAsset,
} from "@avail-project/nexus-core";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { type Address, isAddress } from "viem";
import type { TransactionStatus } from "../tx/types";
import { useTransactionSteps } from "../tx/use-transaction-steps";
import type {
  SourceCoverageState,
  TransactionFlowExecutor,
  TransactionFlowInputs,
  TransactionFlowPrefill,
  TransactionFlowType,
} from "../types/transaction-flow";
import {
  buildInitialInputs,
  clampAmountToMax,
  formatAmountForDisplay,
  getCoverageDecimals,
  MAX_AMOUNT_DEBOUNCE_MS,
} from "../utils/transaction-flow";
import { useDebouncedCallback } from "./use-debounced-callback";
import { useNexusError } from "./use-nexus-error";
import { usePolling } from "./use-polling";
import { useStopwatch } from "./use-stopwatch";
import { useTransactionExecution } from "./use-transaction-execution";
import { useUsdMaxAmount } from "./use-usd-max-amount";

interface BaseTransactionFlowProps {
  allowance: RefObject<OnAllowanceHookData | null>;
  bridgableBalance: UserAsset[] | null;
  denyIntentOnReset?: boolean;
  executeTransaction: TransactionFlowExecutor;
  fetchBalance: () => Promise<void>;
  intent: RefObject<OnIntentHookData | null>;
  isSourceMenuOpen?: boolean;
  mapUsdmToUsdcBalance?: boolean;
  maxAmount?: string | number;
  maxAmountByDestinationChainId?: Record<number, number>;
  network: NexusNetwork;
  nexusSDK: NexusSDK | null;
  notifyHistoryRefresh?: () => void;
  onComplete?: (explorerUrl?: string) => void | Promise<void>;
  onError?: (message: string) => void;
  onStart?: () => void;
  prefill?: TransactionFlowPrefill;
  type: TransactionFlowType;
}

export interface UseTransactionFlowProps extends BaseTransactionFlowProps {
  connectedAddress?: Address;
}

interface State {
  inputs: TransactionFlowInputs;
  status: TransactionStatus;
}

type AllowanceStepState = "not-required" | "pending" | "completed";

type Action =
  | { type: "setInputs"; payload: Partial<TransactionFlowInputs> }
  | { type: "resetInputs" }
  | { type: "setStatus"; payload: TransactionStatus };

export function useTransactionFlow(props: UseTransactionFlowProps) {
  const {
    type,
    network,
    nexusSDK,
    intent,
    bridgableBalance,
    prefill,
    onComplete,
    onStart,
    onError,
    fetchBalance,
    allowance,
    maxAmount,
    maxAmountByDestinationChainId,
    isSourceMenuOpen = false,
    notifyHistoryRefresh,
    mapUsdmToUsdcBalance = false,
    denyIntentOnReset = true,
    executeTransaction,
  } = props;

  const connectedAddress = props.connectedAddress;
  const operationName = type === "bridge" ? "bridge" : "transfer";
  const handleNexusError = useNexusError();
  const initialState: State = {
    inputs: buildInitialInputs({ type, network, connectedAddress, prefill }),
    status: "idle",
  };

  function reducer(state: State, action: Action): State {
    switch (action.type) {
      case "setInputs":
        return { ...state, inputs: { ...state.inputs, ...action.payload } };
      case "resetInputs":
        return {
          ...state,
          inputs: buildInitialInputs({
            type,
            network,
            connectedAddress,
            prefill,
          }),
        };
      case "setStatus":
        if (state.status === action.payload) {
          return state;
        }
        return { ...state, status: action.payload };
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState);
  const inputs = state.inputs;
  const setInputs = (
    next: TransactionFlowInputs | Partial<TransactionFlowInputs>
  ) => {
    const payload = next as Partial<TransactionFlowInputs>;
    const hasActualChange = Object.entries(payload).some(
      ([key, value]) =>
        state.inputs[key as keyof TransactionFlowInputs] !== value
    );
    if (!hasActualChange) {
      return;
    }
    dispatch({
      type: "setInputs",
      payload,
    });
  };

  const loading = state.status === "executing";
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
  const previousConnectedAddressRef = useRef<Address | undefined>(
    connectedAddress
  );
  const previousSelectedTokenRef = useRef(inputs?.token);
  const lastInvalidationKeyRef = useRef<string>("");
  const maxAmountRequestIdRef = useRef(0);
  const [selectedSourceChains, setSelectedSourceChains] = useState<
    number[] | null
  >(null);
  const [selectedSourcesMaxAmount, setSelectedSourcesMaxAmount] = useState<
    string | null
  >(null);
  const [appliedSourceSelectionKey, setAppliedSourceSelectionKey] =
    useState("ALL");
  const [allowanceStepState, setAllowanceStepState] =
    useState<AllowanceStepState>("not-required");
  const [allowanceApprovalsRequired, setAllowanceApprovalsRequired] =
    useState(0);
  const [allowanceApprovalsCompleted, setAllowanceApprovalsCompleted] =
    useState(0);
  const {
    steps,
    onStepsList,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<BridgeStepType>();
  // Resolve the USD dollar limit for the current destination chain.
  // maxAmount and maxAmountByDestinationChainId values are treated as USD.
  const usdLimitForDest = useMemo(() => {
    if (
      maxAmountByDestinationChainId &&
      inputs?.chain !== undefined &&
      inputs?.chain !== null
    ) {
      const override = maxAmountByDestinationChainId[inputs.chain];
      if (override !== undefined) {
        return override;
      }
    }
    if (maxAmount === undefined || maxAmount === null) {
      return undefined;
    }
    const parsed = Number(maxAmount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [maxAmount, maxAmountByDestinationChainId, inputs?.chain]);

  // Convert the USD limit to a token-unit string using live pricing.
  // For stablecoins (USDC/USDT/USDM) this is 1:1; for ETH it fetches the
  // current price from Binance (with CoinGecko fallback).
  const configuredMaxAmount = useUsdMaxAmount(usdLimitForDest, inputs?.token);

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidRecipient =
      Boolean(inputs?.recipient) && isAddress(inputs.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidRecipient;
  }, [inputs]);

  const filteredBridgableBalance = useMemo(() => {
    return bridgableBalance?.find((bal) =>
      inputs?.token === "USDM" && mapUsdmToUsdcBalance
        ? bal?.symbol === "USDC"
        : bal?.symbol === inputs?.token
    );
  }, [bridgableBalance, inputs?.token, mapUsdmToUsdcBalance]);

  const availableSources = useMemo(() => {
    const breakdown = filteredBridgableBalance?.breakdown ?? [];
    const destinationChainId = inputs?.chain;
    const nonZero = breakdown.filter((source) => {
      if (Number.parseFloat(source.balance ?? "0") <= 0) {
        return false;
      }
      if (typeof destinationChainId === "number") {
        return source.chain.id !== destinationChainId;
      }
      return true;
    });
    const decimals = filteredBridgableBalance?.decimals;
    if (!nexusSDK || typeof decimals !== "number") {
      return nonZero.sort(
        (a, b) => Number.parseFloat(b.balance) - Number.parseFloat(a.balance)
      );
    }
    return nonZero.sort((a, b) => {
      try {
        const aRaw = nexusSDK.utils.parseUnits(a.balance ?? "0", decimals);
        const bRaw = nexusSDK.utils.parseUnits(b.balance ?? "0", decimals);
        if (aRaw === bRaw) {
          return 0;
        }
        return aRaw > bRaw ? -1 : 1;
      } catch {
        return Number.parseFloat(b.balance) - Number.parseFloat(a.balance);
      }
    });
  }, [
    inputs?.chain,
    filteredBridgableBalance?.breakdown,
    filteredBridgableBalance?.decimals,
    nexusSDK,
  ]);

  const allAvailableSourceChainIds = useMemo(
    () => availableSources.map((source) => source.chain.id),
    [availableSources]
  );

  const effectiveSelectedSourceChains = useMemo(() => {
    if (selectedSourceChains && selectedSourceChains.length > 0) {
      const availableSet = new Set(allAvailableSourceChainIds);
      const filteredSelection = selectedSourceChains.filter((id) =>
        availableSet.has(id)
      );
      if (filteredSelection.length > 0) {
        return filteredSelection;
      }
    }
    return allAvailableSourceChainIds;
  }, [selectedSourceChains, allAvailableSourceChainIds]);

  const sourceChainsForSdk =
    effectiveSelectedSourceChains.length > 0
      ? effectiveSelectedSourceChains
      : undefined;

  const sourceSelectionKey = useMemo(() => {
    if (allAvailableSourceChainIds.length === 0) {
      return "NONE";
    }
    if (!selectedSourceChains || selectedSourceChains.length === 0) {
      return "ALL";
    }
    return [...effectiveSelectedSourceChains].sort((a, b) => a - b).join("|");
  }, [
    allAvailableSourceChainIds.length,
    effectiveSelectedSourceChains,
    selectedSourceChains,
  ]);
  const hasPendingSourceSelectionChanges =
    sourceSelectionKey !== appliedSourceSelectionKey;
  const intentSourceSpendAmount = intent.current?.intent?.sourcesTotal;

  const getMaxForCurrentSelection = useCallback(async () => {
    if (!(nexusSDK && inputs?.token && inputs?.chain)) {
      return undefined;
    }
    const maxBalAvailable = await nexusSDK.calculateMaxForBridge({
      token: inputs.token,
      toChainId: inputs.chain,
      recipient: inputs.recipient,
      sourceChains: sourceChainsForSdk,
    });
    if (!maxBalAvailable?.amount) {
      return "0";
    }
    return clampAmountToMax({
      amount: maxBalAvailable.amount,
      maxAmount: configuredMaxAmount,
      nexusSDK,
      token: inputs.token,
      chainId: inputs.chain,
    });
  }, [
    configuredMaxAmount,
    inputs?.chain,
    inputs?.recipient,
    inputs?.token,
    nexusSDK,
    sourceChainsForSdk,
  ]);

  const toggleSourceChain = useCallback(
    (chainId: number) => {
      setSelectedSourceChains((prev) => {
        if (allAvailableSourceChainIds.length === 0) {
          return prev;
        }
        const current =
          prev && prev.length > 0 ? prev : allAvailableSourceChainIds;
        const next = current.includes(chainId)
          ? current.filter((id) => id !== chainId)
          : [...current, chainId];
        if (next.length === 0) {
          return current;
        }
        const isAllSelected =
          next.length === allAvailableSourceChainIds.length &&
          allAvailableSourceChainIds.every((id) => next.includes(id));
        return isAllSelected ? null : next;
      });
    },
    [allAvailableSourceChainIds]
  );

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Computes source-coverage state from SDK intent, selected chains, and fallbacks.
  const sourceSelection = useMemo(() => {
    const amount =
      intentSourceSpendAmount?.trim() ?? inputs?.amount?.trim() ?? "";
    const decimals = getCoverageDecimals({
      type,
      token: inputs?.token,
      chainId: inputs?.chain,
      fallback: filteredBridgableBalance?.decimals,
    });
    const selectedChainSet = new Set(effectiveSelectedSourceChains);
    const selectedTotalRaw =
      !nexusSDK || typeof decimals !== "number"
        ? BigInt(0)
        : availableSources.reduce((sum, source) => {
            if (!selectedChainSet.has(source.chain.id)) {
              return sum;
            }
            try {
              return (
                sum + nexusSDK.utils.parseUnits(source.balance ?? "0", decimals)
              );
            } catch {
              return sum;
            }
          }, BigInt(0));
    const selectedTotal =
      !nexusSDK || typeof decimals !== "number"
        ? "0"
        : formatAmountForDisplay(selectedTotalRaw, decimals, nexusSDK);
    const baseSelection = {
      selectedTotal,
      requiredTotal: amount || "0",
      requiredSafetyTotal: amount || "0",
      missingToProceed: "0",
      missingToSafety: "0",
      coverageState: "healthy" as SourceCoverageState,
      coverageToSafetyPercent: 100,
      isBelowRequired: false,
      isBelowSafetyBuffer: false,
    };

    if (!(nexusSDK && inputs?.token && inputs?.chain && amount)) {
      return baseSelection;
    }

    try {
      const requiredRaw = nexusSDK.convertTokenReadableAmountToBigInt(
        amount,
        inputs.token,
        inputs.chain
      );
      if (requiredRaw <= BigInt(0)) {
        return baseSelection;
      }

      const missingToProceedRaw =
        selectedTotalRaw >= requiredRaw
          ? BigInt(0)
          : requiredRaw - selectedTotalRaw;
      const missingToSafetyRaw = missingToProceedRaw;

      const coverageState: SourceCoverageState =
        selectedTotalRaw < requiredRaw ? "error" : "healthy";

      let coverageBasisPoints = 10_000;
      if (requiredRaw > BigInt(0) && selectedTotalRaw < requiredRaw) {
        coverageBasisPoints = Number(
          (selectedTotalRaw * BigInt(10_000)) / requiredRaw
        );
      }

      return {
        selectedTotal,
        requiredTotal: amount,
        requiredSafetyTotal: amount,
        missingToProceed: formatAmountForDisplay(
          missingToProceedRaw,
          decimals,
          nexusSDK
        ),
        missingToSafety: formatAmountForDisplay(
          missingToSafetyRaw,
          decimals,
          nexusSDK
        ),
        coverageState,
        coverageToSafetyPercent: coverageBasisPoints / 100,
        isBelowRequired: coverageState === "error",
        isBelowSafetyBuffer: coverageState === "error",
      };
    } catch {
      return baseSelection;
    }
  }, [
    type,
    filteredBridgableBalance?.decimals,
    nexusSDK,
    inputs?.chain,
    inputs?.amount,
    inputs?.token,
    intentSourceSpendAmount,
    availableSources,
    effectiveSelectedSourceChains,
  ]);

  const hasPendingAllowanceApproval = Boolean(allowance.current);
  const registerAllowanceUserApproval = useCallback(() => {
    setAllowanceApprovalsCompleted((previousCompleted) => {
      const requiredCount = Math.max(1, allowanceApprovalsRequired);
      if (previousCompleted >= requiredCount) {
        return previousCompleted;
      }
      return previousCompleted + 1;
    });
  }, [allowanceApprovalsRequired]);

  const stopwatch = useStopwatch({ intervalMs: 100 });
  const setStatus = useCallback(
    (status: TransactionStatus) =>
      dispatch({ type: "setStatus", payload: status }),
    []
  );

  const resetInputs = useCallback(() => {
    dispatch({ type: "resetInputs" });
  }, []);

  const {
    refreshIntent,
    handleTransaction,
    startTransaction,
    commitAmount,
    reset,
    invalidatePendingExecution,
  } = useTransactionExecution({
    operationName,
    nexusSDK,
    intent,
    allowance,
    inputs,
    configuredMaxAmount,
    allAvailableSourceChainIds,
    sourceChainsForSdk,
    sourceSelectionKey,
    sourceSelection,
    loading,
    txError,
    areInputsValid,
    executeTransaction,
    getMaxForCurrentSelection,
    onStepsList,
    onStepComplete,
    resetSteps,
    setStatus,
    resetInputs,
    setRefreshing,
    setIsDialogOpen,
    setTxError,
    setLastExplorerUrl,
    setSelectedSourceChains,
    setAppliedSourceSelectionKey,
    stopwatch,
    handleNexusError,
    onStart,
    onComplete,
    onError,
    onAllowanceUserApproval: registerAllowanceUserApproval,
    fetchBalance,
    notifyHistoryRefresh,
    denyIntentOnReset,
  });

  usePolling(
    Boolean(intent.current) &&
      !isDialogOpen &&
      !isSourceMenuOpen &&
      !hasPendingSourceSelectionChanges,
    async () => {
      await refreshIntent();
    },
    15_000
  );

  const debouncedRefreshMaxForSelection = useDebouncedCallback(
    async (requestId: number) => {
      try {
        const maxForCurrentSelection = await getMaxForCurrentSelection();
        if (requestId !== maxAmountRequestIdRef.current) {
          return;
        }
        setSelectedSourcesMaxAmount(maxForCurrentSelection ?? "0");
      } catch (error) {
        if (requestId !== maxAmountRequestIdRef.current) {
          return;
        }
        console.error("Unable to calculate max for selected sources:", error);
        setSelectedSourcesMaxAmount("0");
      }
    },
    MAX_AMOUNT_DEBOUNCE_MS
  );

  useEffect(() => {
    debouncedRefreshMaxForSelection.cancel();
    if (!(nexusSDK && inputs?.token && inputs?.chain)) {
      maxAmountRequestIdRef.current += 1;
      setSelectedSourcesMaxAmount(null);
      return;
    }
    if (allAvailableSourceChainIds.length === 0) {
      maxAmountRequestIdRef.current += 1;
      setSelectedSourcesMaxAmount("0");
      return;
    }
    const requestId = ++maxAmountRequestIdRef.current;
    debouncedRefreshMaxForSelection(requestId);
  }, [
    allAvailableSourceChainIds.length,
    debouncedRefreshMaxForSelection,
    inputs?.chain,
    inputs?.token,
    nexusSDK,
  ]);

  useEffect(() => {
    if (type !== "bridge" || !connectedAddress) {
      return;
    }
    const hasLockedPrefillRecipient = Boolean(
      prefill?.recipient && prefill.recipient !== connectedAddress
    );
    const previousConnectedAddress = previousConnectedAddressRef.current;
    if (!previousConnectedAddress) {
      previousConnectedAddressRef.current = connectedAddress;
      if (!(hasLockedPrefillRecipient || inputs?.recipient)) {
        dispatch({
          type: "setInputs",
          payload: { recipient: connectedAddress },
        });
      }
      return;
    }
    if (connectedAddress === previousConnectedAddress) {
      return;
    }
    previousConnectedAddressRef.current = connectedAddress;
    if (hasLockedPrefillRecipient) {
      return;
    }
    if (!inputs?.recipient || inputs.recipient === previousConnectedAddress) {
      dispatch({ type: "setInputs", payload: { recipient: connectedAddress } });
    }
  }, [type, connectedAddress, inputs?.recipient, prefill?.recipient]);

  useEffect(() => {
    if (state.status === "success") {
      return;
    }
    const hasInputs = Boolean(
      inputs?.amount || inputs?.chain || inputs?.recipient || inputs?.token
    );
    if (!(hasInputs || intent.current)) {
      lastInvalidationKeyRef.current = "";
      return;
    }
    const invalidationKey = [
      inputs?.amount ?? "",
      inputs?.chain ?? "",
      inputs?.recipient ?? "",
      inputs?.token ?? "",
      intent.current ? "intent" : "no-intent",
    ].join("|");
    if (lastInvalidationKeyRef.current === invalidationKey) {
      return;
    }
    lastInvalidationKeyRef.current = invalidationKey;
    invalidatePendingExecution({ forceResetUI: !areInputsValid });
  }, [
    inputs?.amount,
    inputs?.chain,
    inputs?.recipient,
    inputs?.token,
    intent,
    invalidatePendingExecution,
    areInputsValid,
    state.status,
  ]);

  useEffect(() => {
    if (previousSelectedTokenRef.current === inputs?.token) {
      return;
    }
    previousSelectedTokenRef.current = inputs?.token;
    setSelectedSourceChains(null);
  }, [inputs?.token]);

  useEffect(() => {
    if (!hasPendingAllowanceApproval) {
      return;
    }
    const requiredCount = Math.max(1, allowance.current?.sources?.length ?? 1);
    setAllowanceApprovalsRequired(requiredCount);
    setAllowanceApprovalsCompleted(0);
    setAllowanceStepState("pending");
  }, [allowance, hasPendingAllowanceApproval]);

  useEffect(() => {
    if (allowanceStepState !== "pending") {
      return;
    }
    const requiredCount = Math.max(1, allowanceApprovalsRequired);
    if (allowanceApprovalsCompleted >= requiredCount) {
      setAllowanceStepState("completed");
    }
  }, [
    allowanceApprovalsCompleted,
    allowanceApprovalsRequired,
    allowanceStepState,
  ]);

  useEffect(() => {
    if (!isDialogOpen && state.status === "idle") {
      setAllowanceStepState("not-required");
      setAllowanceApprovalsRequired(0);
      setAllowanceApprovalsCompleted(0);
    }
  }, [isDialogOpen, state.status]);

  useEffect(() => {
    if (!isDialogOpen) {
      stopwatch.stop();
      stopwatch.reset();
      if (state.status === "success" || state.status === "error") {
        resetSteps();
        setLastExplorerUrl("");
        setStatus("idle");
      }
    }
  }, [
    isDialogOpen,
    resetSteps,
    setStatus,
    state.status,
    stopwatch.reset,
    stopwatch.stop,
  ]);

  useEffect(() => {
    if (txError) {
      setTxError(null);
    }
  }, [txError]);

  return {
    inputs,
    setInputs,
    timer: stopwatch.seconds,
    setIsDialogOpen,
    setTxError,
    loading,
    refreshing,
    isDialogOpen,
    txError,
    handleTransaction,
    reset,
    filteredBridgableBalance,
    startTransaction,
    commitAmount,
    lastExplorerUrl,
    steps,
    status: state.status,
    availableSources,
    selectedSourceChains: effectiveSelectedSourceChains,
    toggleSourceChain,
    isSourceSelectionInsufficient: sourceSelection.isBelowRequired,
    isSourceSelectionBelowSafetyBuffer: sourceSelection.isBelowSafetyBuffer,
    isSourceSelectionReadyForAccept:
      sourceSelection.coverageState === "healthy",
    sourceCoverageState: sourceSelection.coverageState,
    sourceCoveragePercent: sourceSelection.coverageToSafetyPercent,
    missingToProceed: sourceSelection.missingToProceed,
    missingToSafety: sourceSelection.missingToSafety,
    selectedTotal: sourceSelection.selectedTotal,
    requiredTotal: sourceSelection.requiredTotal,
    requiredSafetyTotal: sourceSelection.requiredSafetyTotal,
    maxAvailableAmount: selectedSourcesMaxAmount ?? undefined,
    isInputsValid: areInputsValid,
    allowanceStepState,
  };
}
