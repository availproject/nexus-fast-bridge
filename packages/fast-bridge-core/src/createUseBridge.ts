import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from "react";
import { isAddress, type Address } from "viem";
import type {
  BridgeableAsset,
  EvmAddress,
  IntentLike,
  MutableRefLike,
  NexusBridgeClient,
} from "@fastbridge/nexus-adapter-contract";

export type TransactionStatus = "idle" | "executing" | "success" | "error";

export interface FastBridgeState<
  TChain extends number = number,
  TToken extends string = string,
> {
  chain: TChain;
  token: TToken;
  amount?: string;
  recipient?: EvmAddress;
}

interface BridgeState<TChain extends number, TToken extends string> {
  inputs: FastBridgeState<TChain, TToken>;
  status: TransactionStatus;
}

type BridgeAction<TChain extends number, TToken extends string> =
  | { type: "setInputs"; payload: Partial<FastBridgeState<TChain, TToken>> }
  | { type: "resetInputs" }
  | { type: "setStatus"; payload: TransactionStatus };

interface BridgeSubmitEventProps<
  TChain extends number = number,
  TToken extends string = string,
> {
  chain: TChain;
  chainName: string;
  tokenSymbol: TToken;
  amount: string;
  fast_bridge: string;
}

interface StopwatchHandle {
  seconds: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

interface TransactionStepsHandle<TStep, TRenderedStep> {
  steps: TRenderedStep[];
  onStepsList: (list: TStep[]) => void;
  onStepComplete: (step: TStep) => void;
  reset: () => void;
}

interface BridgeConfig<TChain extends number, TToken extends string> {
  chainId: TChain;
  defaultToken: TToken;
  maxBridgeAmount: number;
  fastBridgeTag: string;
  logStepEvents: boolean;
}

interface BridgeEventsConfig {
  stepsList: string;
  stepComplete: string;
  intentHashSignedStepType: string;
}

interface CreateUseBridgeDeps<
  TChain extends number,
  TToken extends string,
  TStep extends { type?: string },
  TRenderedStep,
> {
  bridgeConfig: BridgeConfig<TChain, TToken>;
  events: BridgeEventsConfig;
  allowedTokens: ReadonlyArray<TToken>;
  shortChainName: Record<number, string>;
  trackBridgeSubmit: (
    properties: BridgeSubmitEventProps<TChain, TToken>,
  ) => void;
  useStopwatch: (options?: { intervalMs?: number }) => StopwatchHandle;
  usePolling: (
    enabled: boolean,
    fn: () => Promise<void> | void,
    intervalMs: number,
  ) => void;
  useNexusError: () => (error: unknown) => { message: string };
  useTransactionSteps: () => TransactionStepsHandle<TStep, TRenderedStep>;
}

interface BridgePrefill {
  token: string;
  chainId: number;
  amount?: string;
  recipient?: Address;
}

export interface UseBridgeProps<
  TChain extends number,
  TToken extends string,
  TStep extends { type?: string },
  TNexusSDK extends NexusBridgeClient<TChain, TToken, TStep>,
  TIntent extends IntentLike,
  TAllowance,
> {
  connectedAddress: Address;
  nexusSDK: TNexusSDK | null;
  intent: RefObject<TIntent | null>;
  allowance: RefObject<TAllowance | null>;
  bridgableBalance: Array<BridgeableAsset<TToken>> | null;
  prefill?: BridgePrefill;
  onComplete?: () => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  fetchBalance: () => Promise<void>;
}

function sanitizeAmount(raw?: string): string | undefined {
  if (!raw) return undefined;
  const sanitized = raw.trim();
  if (!sanitized || sanitized === "." || !/^\d*\.?\d*$/u.test(sanitized)) {
    return undefined;
  }
  const parsed = Number.parseFloat(sanitized);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 1e9) {
    return undefined;
  }
  return sanitized;
}

function toWritableRef<T>(ref: RefObject<T | null>): MutableRefLike<T> {
  return ref as unknown as MutableRefLike<T>;
}

export function createUseBridge<
  TChain extends number,
  TToken extends string,
  TStep extends { type?: string },
  TNexusSDK extends NexusBridgeClient<TChain, TToken, TStep>,
  TIntent extends IntentLike,
  TAllowance,
  TRenderedStep extends {
    id: number;
    completed: boolean;
    step: TStep;
  } = {
    id: number;
    completed: boolean;
    step: TStep;
  },
>({
  bridgeConfig,
  events,
  allowedTokens,
  shortChainName,
  trackBridgeSubmit,
  useStopwatch,
  usePolling,
  useNexusError,
  useTransactionSteps,
}: CreateUseBridgeDeps<TChain, TToken, TStep, TRenderedStep>) {
  const allowedTokenSet = new Set(
    allowedTokens.map((token) => token.toUpperCase() as TToken),
  );

  const buildInitialInputs = (
    connectedAddress: Address,
    prefill?: BridgePrefill,
  ): FastBridgeState<TChain, TToken> => {
    const normalizedToken = prefill?.token
      ? (prefill.token.toUpperCase() as TToken)
      : undefined;

    const validToken =
      normalizedToken && allowedTokenSet.has(normalizedToken)
        ? normalizedToken
        : bridgeConfig.defaultToken;

    const validRecipient =
      prefill?.recipient && isAddress(prefill.recipient)
        ? (prefill.recipient as EvmAddress)
        : (connectedAddress as EvmAddress);

    return {
      chain: bridgeConfig.chainId,
      token: validToken,
      amount: sanitizeAmount(prefill?.amount),
      recipient: validRecipient,
    };
  };

  return ({
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
  }: UseBridgeProps<
    TChain,
    TToken,
    TStep,
    TNexusSDK,
    TIntent,
    TAllowance
  >) => {
    const handleNexusError = useNexusError();

    const initialState: BridgeState<TChain, TToken> = {
      inputs: buildInitialInputs(connectedAddress, prefill),
      status: "idle",
    };

    function reducer(
      state: BridgeState<TChain, TToken>,
      action: BridgeAction<TChain, TToken>,
    ): BridgeState<TChain, TToken> {
      switch (action.type) {
        case "setInputs":
          return {
            ...state,
            inputs: { ...state.inputs, ...action.payload },
          };
        case "resetInputs":
          return {
            ...state,
            inputs: buildInitialInputs(connectedAddress, prefill),
          };
        case "setStatus":
          return {
            ...state,
            status: action.payload,
          };
        default:
          return state;
      }
    }

    const [state, dispatch] = useReducer(reducer, initialState);
    const inputs = state.inputs;

    const setInputs = (
      next: FastBridgeState<TChain, TToken> | Partial<FastBridgeState<TChain, TToken>>,
    ) => {
      dispatch({
        type: "setInputs",
        payload: next as Partial<FastBridgeState<TChain, TToken>>,
      });
    };

    const loading = state.status === "executing";
    const [refreshing, setRefreshing] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [txError, setTxError] = useState<string | null>(null);
    const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
    const commitLockRef = useRef(false);

    const {
      steps,
      onStepsList,
      onStepComplete,
      reset: resetSteps,
    } = useTransactionSteps();

    const stopwatch = useStopwatch({ intervalMs: 100 });

    const areInputsValid = useMemo(() => {
      const hasToken = inputs.token !== undefined && inputs.token !== null;
      const hasChain = inputs.chain !== undefined && inputs.chain !== null;
      const hasAmount = Boolean(inputs.amount) && Number(inputs.amount) > 0;
      const hasValidRecipient =
        Boolean(inputs.recipient) && isAddress(inputs.recipient as string);

      return hasToken && hasChain && hasAmount && hasValidRecipient;
    }, [inputs]);

    const reset = () => {
      toWritableRef(intent).current?.deny();
      toWritableRef(intent).current = null;
      toWritableRef(allowance).current = null;
      dispatch({ type: "resetInputs" });
      dispatch({ type: "setStatus", payload: "idle" });
      setRefreshing(false);
      stopwatch.stop();
      stopwatch.reset();
      resetSteps();
    };

    const onSuccess = async () => {
      stopwatch.stop();
      dispatch({ type: "setStatus", payload: "success" });
      onComplete?.();
      toWritableRef(intent).current = null;
      toWritableRef(allowance).current = null;
      dispatch({ type: "resetInputs" });
      setRefreshing(false);
      await fetchBalance();
    };

    const handleTransaction = async () => {
      if (!inputs.amount || !inputs.recipient || !inputs.chain || !inputs.token) {
        console.error("Missing required inputs");
        return;
      }

      dispatch({ type: "setStatus", payload: "executing" });
      setTxError(null);
      onStart?.();

      trackBridgeSubmit({
        chain: inputs.chain,
        chainName: shortChainName[inputs.chain] || `Chain ${inputs.chain}`,
        tokenSymbol: inputs.token,
        amount: inputs.amount,
        fast_bridge: bridgeConfig.fastBridgeTag,
      });

      try {
        if (!nexusSDK) {
          throw new Error("Nexus SDK not initialized");
        }

        const formattedAmount = nexusSDK.convertTokenReadableAmountToBigInt(
          inputs.amount,
          inputs.token,
          inputs.chain,
        );

        setLastExplorerUrl("");

        const bridgeTxn = await nexusSDK.bridge(
          {
            token: inputs.token,
            amount: formattedAmount,
            toChainId: inputs.chain,
            recipient: (inputs.recipient ?? connectedAddress) as EvmAddress,
          },
          {
            onEvent: (event) => {
              if (event.name === events.stepsList) {
                const list = Array.isArray(event.args)
                  ? (event.args as TStep[])
                  : [];
                onStepsList(list);
              }

              if (event.name === events.stepComplete) {
                const step = event.args as TStep;

                if (bridgeConfig.logStepEvents) {
                  console.log("STEP_EVENT", event);
                }

                if (step?.type === events.intentHashSignedStepType) {
                  stopwatch.start();
                }
                onStepComplete(step);
              }
            },
          },
        );

        if (!bridgeTxn) {
          throw new Error("Transaction rejected by user");
        }

        setLastExplorerUrl(bridgeTxn.explorerUrl);
        await onSuccess();
      } catch (error) {
        const { message } = handleNexusError(error);
        toWritableRef(intent).current?.deny();
        toWritableRef(intent).current = null;
        toWritableRef(allowance).current = null;
        setTxError(message);
        onError?.(message);
        setIsDialogOpen(false);
        dispatch({ type: "setStatus", payload: "error" });
      }
    };

    const refreshIntent = async () => {
      setRefreshing(true);
      try {
        await toWritableRef(intent).current?.refresh([]);
      } catch (error) {
        console.error("Transaction failed:", error);
      } finally {
        setRefreshing(false);
      }
    };

    const startTransaction = () => {
      toWritableRef(intent).current?.allow();
      setIsDialogOpen(true);
      setTxError(null);
    };

    const commitAmount = async () => {
      if (commitLockRef.current) return;
      if (!toWritableRef(intent).current || loading || txError || !areInputsValid) {
        return;
      }

      if (inputs.amount) {
        const amountStr = inputs.amount.trim();
        if (!amountStr) return;

        const amount = Number.parseFloat(amountStr);
        if (Number.isNaN(amount) || amount <= 0) return;

        if (amount > bridgeConfig.maxBridgeAmount) {
          setTxError("Amount entered exceeds maximum limit");
          return;
        }
      }

      commitLockRef.current = true;
      try {
        await handleTransaction();
      } finally {
        commitLockRef.current = false;
      }
    };

    const filteredBridgableBalance = useMemo(() => {
      return bridgableBalance?.find((bal) => bal?.symbol === inputs.token);
    }, [bridgableBalance, inputs.token]);

    usePolling(Boolean(toWritableRef(intent).current) && !isDialogOpen, refreshIntent, 15000);

    useEffect(() => {
      if (toWritableRef(intent).current) {
        toWritableRef(intent).current?.deny();
        toWritableRef(intent).current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputs]);

    useEffect(() => {
      if (!isDialogOpen) {
        stopwatch.stop();
        stopwatch.reset();

        if (state.status === "success" || state.status === "error") {
          resetSteps();
          setLastExplorerUrl("");
          dispatch({ type: "setStatus", payload: "idle" });
        }
      }
    }, [isDialogOpen, resetSteps, state.status, stopwatch]);

    useEffect(() => {
      if (txError) {
        setTxError(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputs]);

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
      maxBridgeAmount: bridgeConfig.maxBridgeAmount,
    };
  };
}
