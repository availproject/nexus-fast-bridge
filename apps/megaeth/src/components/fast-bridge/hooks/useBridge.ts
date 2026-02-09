import {
  type BridgeStepType,
  NEXUS_EVENTS,
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  // SUPPORTED_CHAINS,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
  type UserAsset,
} from "@avail-project/nexus-core";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useReducer,
  type RefObject,
} from "react";
import { type Address, isAddress } from "viem";
import {
  useStopwatch,
  usePolling,
  useNexusError,
  useTransactionSteps,
  type TransactionStatus,
} from "../../common";
import config from "../../../../config";
import { trackBridgeSubmit } from "../../../lib/posthog";
import { SHORT_CHAIN_NAME } from "../../common/utils/constant";

export interface FastBridgeState {
  chain: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
  amount?: string;
  recipient?: `0x${string}`;
}

const ALLOWED_TOKENS = new Set([
  "USDC",
  "USDT",
  "USDM",
]) as Set<SUPPORTED_TOKENS>;

interface UseBridgeProps {
  network: NexusNetwork;
  connectedAddress?: Address;
  nexusSDK: NexusSDK | null;
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  bridgableBalance: UserAsset[] | null;
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  fetchBalance: () => Promise<void>;
}

type BridgeState = {
  inputs: FastBridgeState;
  status: TransactionStatus;
};

type Action =
  | { type: "setInputs"; payload: Partial<FastBridgeState> }
  | { type: "resetInputs" }
  | { type: "setStatus"; payload: TransactionStatus };

const buildInitialInputs = (
  connectedAddress?: Address,
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  },
): FastBridgeState => {
  const validToken =
    prefill?.token &&
      ALLOWED_TOKENS.has(prefill.token.toUpperCase() as SUPPORTED_TOKENS)
      ? (prefill.token.toUpperCase() as SUPPORTED_TOKENS)
      : config.nexusPrimaryToken || "USDC";

  const validAmount = prefill?.amount
    ? (() => {
      const sanitized = prefill.amount.trim();
      if (!sanitized || sanitized === "." || !/^\d*\.?\d*$/.test(sanitized))
        return undefined;
      const num = Number.parseFloat(sanitized);
      return Number.isNaN(num) || num <= 0 || num > 1e9
        ? undefined
        : sanitized;
    })()
    : undefined;

  const validRecipient =
    prefill?.recipient && isAddress(prefill.recipient)
      ? (prefill.recipient as `0x${string}`)
      : connectedAddress;

  return {
    chain: config.chainId as SUPPORTED_CHAINS_IDS,
    token: validToken as SUPPORTED_TOKENS,
    amount: validAmount,
    recipient: validRecipient,
  };
};

const useBridge = ({
  connectedAddress,
  nexusSDK,
  intent,
  bridgableBalance,
  prefill,
  onComplete,
  onStart,
  onError,
  fetchBalance,
  allowance,
}: UseBridgeProps) => {
  const handleNexusError = useNexusError();
  const initialState: BridgeState = {
    inputs: buildInitialInputs(connectedAddress, prefill),
    status: "idle",
  };
  function reducer(state: BridgeState, action: Action): BridgeState {
    switch (action.type) {
      case "setInputs":
        return { ...state, inputs: { ...state.inputs, ...action.payload } };
      case "resetInputs":
        return {
          ...state,
          inputs: buildInitialInputs(connectedAddress, prefill),
        };
      case "setStatus":
        return { ...state, status: action.payload };
      default:
        return state;
    }
  }
  const [state, dispatch] = useReducer(reducer, initialState);
  const inputs = state.inputs;
  const setInputs = (next: FastBridgeState | Partial<FastBridgeState>) => {
    dispatch({ type: "setInputs", payload: next as Partial<FastBridgeState> });
  };

  const loading = state.status === "executing";
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
  const commitLockRef = useRef<boolean>(false);
  const txnIdRef = useRef(0);
  const {
    steps,
    onStepsList,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<BridgeStepType>();

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidrecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidrecipient;
  }, [inputs]);

  const handleTransaction = async () => {
    const currentTxnId = ++txnIdRef.current;
    if (!inputs.amount) {
      setTxError("Amount is required");
      return;
    }
    if (Number(inputs.amount) === 0) {
      setTxError("Amount should be greater than 0");
      return;
    }
    if (
      !inputs?.amount ||
      !inputs?.recipient ||
      !inputs?.chain ||
      !inputs?.token
    ) {
      console.error("Missing required inputs");
      return;
    }

    if (Number(inputs.amount) > 5000) {
      setTxError("Amount exceeds maximum limit of 5000");
      return;
    }
    dispatch({ type: "setStatus", payload: "executing" });
    setTxError(null);
    onStart?.();

    // Track bridge submit event with PostHog
    trackBridgeSubmit({
      chain: inputs.chain,
      chainName: SHORT_CHAIN_NAME[inputs.chain] || `Chain ${inputs.chain}`,
      tokenSymbol: inputs.token,
      amount: inputs.amount,
      fast_bridge: "megaeth",
    });

    try {
      if (!nexusSDK) {
        throw new Error("Nexus SDK not initialized");
      }
      const formattedAmount = nexusSDK.convertTokenReadableAmountToBigInt(
        inputs?.amount,
        inputs?.token,
        inputs?.chain,
      );
      setLastExplorerUrl("");
      const bridgeTxn = await nexusSDK.bridge(
        {
          token: inputs?.token,
          amount: formattedAmount,
          toChainId: inputs?.chain,
          recipient: inputs?.recipient,
        },
        {
          onEvent: (event) => {
            if (currentTxnId !== txnIdRef.current) return;
            if (event.name === NEXUS_EVENTS.STEPS_LIST) {
              const list = Array.isArray(event.args) ? event.args : [];
              onStepsList(list);
            }
            if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              console.log("STEP_EVENT", event);
              if (event.args.type === "INTENT_HASH_SIGNED") {
                stopwatch.start();
              }
              onStepComplete(event.args);
            }
          },
        },
      );
      if (currentTxnId !== txnIdRef.current) return;

      if (!bridgeTxn) {
        throw new Error("Something went wrong, please try again");
      }
      if (bridgeTxn) {
        setLastExplorerUrl(bridgeTxn.explorerUrl);
        await onSuccess();
      }
    } catch (error) {
      if (currentTxnId !== txnIdRef.current) return;
      const { message } = handleNexusError(error);
      intent.current?.deny();
      intent.current = null;
      allowance.current = null;
      console.log("NEXUS-ERROR-MESSAGE", message)
      if (!(message.toLowerCase().includes("rejected") && message.toLowerCase().includes("user"))) {
        setTxError(message);
        onError?.(message);
      }
      setIsDialogOpen(false);
      dispatch({ type: "setStatus", payload: "error" });
    }
  };

  const onSuccess = async () => {
    // Close dialog and stop timer on success
    stopwatch.stop();
    dispatch({ type: "setStatus", payload: "success" });
    onComplete?.();
    intent.current = null;
    allowance.current = null;
    dispatch({ type: "resetInputs" });
    setRefreshing(false);
    await fetchBalance();
  };

  const filteredBridgableBalance = useMemo(() => {
    return bridgableBalance?.find((bal) => inputs.token === 'USDM' ? bal?.symbol === 'USDC' : bal?.symbol === inputs?.token);
  }, [bridgableBalance, inputs?.token]);

  const refreshIntent = async () => {
    setRefreshing(true);
    try {
      await intent.current?.refresh([]);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    intent.current?.deny();
    intent.current = null;
    allowance.current = null;
    dispatch({ type: "resetInputs" });
    dispatch({ type: "setStatus", payload: "idle" });
    setRefreshing(false);
    stopwatch.stop();
    stopwatch.reset();
    resetSteps();
  };

  const startTransaction = () => {
    // Reset timer for a fresh run
    intent.current?.allow();
    setIsDialogOpen(true);
    setTxError(null);
  };

  const commitAmount = async () => {
    if (commitLockRef.current) return;
    if (loading || txError || !areInputsValid) return;

    // Validate amount before proceeding
    if (inputs?.amount) {
      const amountStr = inputs.amount.trim();
      if (!amountStr) return;

      const amount = Number.parseFloat(amountStr);
      if (Number.isNaN(amount) || amount <= 0) return;
    }

    commitLockRef.current = true;
    try {
      await handleTransaction();
    } finally {
      commitLockRef.current = false;
    }
  };

  usePolling(Boolean(intent.current) && !isDialogOpen, refreshIntent, 15000);

  const stopwatch = useStopwatch({ intervalMs: 100 });

  useEffect(() => {
    if (intent.current) {
      // intent.current.deny();
      intent.current = null;
    }
  }, [inputs]);

  useEffect(() => {
    if (!isDialogOpen) {
      stopwatch.stop();
      stopwatch.reset();
      // Reset all transaction state when dialog closes
      if (state.status === "success" || state.status === "error") {
        resetSteps();
        setLastExplorerUrl("");
        dispatch({ type: "setStatus", payload: "idle" });
      }
    }
  }, [isDialogOpen, stopwatch, state.status]);

  useEffect(() => {
    if (txError) {
      setTxError(null);
    }
  }, [inputs]);

  useEffect(() => {
    if (connectedAddress && !inputs?.recipient) {
      setInputs({ recipient: connectedAddress as `0x${string}` });
    }
  }, [connectedAddress, inputs?.recipient]);

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
    areInputsValid,
  };
};

export default useBridge;
