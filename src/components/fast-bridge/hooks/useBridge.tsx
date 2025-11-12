import {
  NEXUS_EVENTS,
  NexusSDK,
  SUPPORTED_CHAINS,
  type BridgeStepType,
  type NexusNetwork,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Address, isAddress } from "viem";
import { useNexus } from "../../nexus/NexusProvider";
import config from "../../../../config";

export interface FastBridgeState {
  chain: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
  amount?: string;
  recipient?: `0x${string}`;
}

interface UseBridgeProps {
  network: NexusNetwork;
  connectedAddress: Address;
  nexusSDK: NexusSDK | null;
  intent: OnIntentHookData | null;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  unifiedBalance: UserAsset[] | null;
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
}

const buildInitialInputs = (
  network: NexusNetwork,
  connectedAddress: Address,
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  }
): FastBridgeState => {
  console.log("prefill", prefill);
  return {
    chain: config.chainId as SUPPORTED_CHAINS_IDS,
    token: (prefill?.token as SUPPORTED_TOKENS) ?? "USDC",
    amount: prefill?.amount ?? undefined,
    recipient: (prefill?.recipient as `0x${string}`) ?? connectedAddress,
  };
};

const useBridge = ({
  connectedAddress,
  nexusSDK,
  intent,
  setIntent,
  setAllowance,
  unifiedBalance,
  network,
  prefill,
  onComplete,
}: UseBridgeProps) => {
  const { fetchUnifiedBalance, handleNexusError } = useNexus();
  const [inputs, setInputs] = useState<FastBridgeState>(() =>
    buildInitialInputs(network, connectedAddress, prefill)
  );

  const [timer, setTimer] = useState(0);
  const [startTxn, setStartTxn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const commitLockRef = useRef<boolean>(false);
  const [steps, setSteps] = useState<
    Array<{ id: number; completed: boolean; step: BridgeStepType }>
  >([]);

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidrecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidrecipient;
  }, [inputs]);

  const onSuccess = useCallback(async () => {
    // Close dialog and stop timer on success
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStartTxn(false);
    setIntent(null);
    setAllowance(null);
    setInputs({
      chain: config.chainId as SUPPORTED_CHAINS_IDS,
      token: config.nexusPrimaryToken as SUPPORTED_TOKENS,
      amount: undefined,
      recipient: connectedAddress,
    });

    setRefreshing(false);
    await fetchUnifiedBalance();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onComplete?.();
    setStartTxn(false);
    setIntent(null);
    setAllowance(null);
    setInputs(buildInitialInputs(network, connectedAddress, prefill));
    setRefreshing(false);
    await fetchUnifiedBalance();
  }, [connectedAddress, setIntent, setAllowance, fetchUnifiedBalance]);

  // const handleTransaction = async () => {
  //   if (processingRef.current) return;
  //   if (
  //     !inputs?.amount ||
  //     !inputs?.recipient ||
  //     !inputs?.chain ||
  //     !inputs?.token
  //   ) {
  //     console.error("Missing required inputs");
  //     return;
  //   }
  //   processingRef.current = true;
  //   setLoading(true);
  //   setTxError(null);
  //   try {
  //     if (inputs?.recipient !== connectedAddress) {
  //       // Transfer
  //       const transferTxn = await nexusSDK?.bridgeAndTransfer({
  //         token: inputs?.token,
  //         amount: inputs?.amount,
  //         toChainId: inputs?.chain,
  //         recipient: inputs?.recipient,
  //       });
  //       if (!transferTxn) {
  //         throw new Error("Transaction rejected by user");
  //       }
  //       if (transferTxn) {
  //         console.log("Transfer transaction successful");
  //         console.log(
  //           "Transfer transaction explorer",
  //           transferTxn?.explorerUrl
  //         );
  //         await onSuccess();
  //       }
  //       return;
  //     }
  //     // Bridge
  //     const bridgeTxn = await nexusSDK?.bridge({
  //       token: inputs?.token,
  //       amount: inputs?.amount,
  //       toChainId: inputs?.chain,
  //     });
  //     if (!bridgeTxn) {
  //       throw new Error("Transaction rejected by user");
  //     }
  //     if (bridgeTxn) {
  //       console.log("Bridge transaction successful");
  //       console.log("Bridge transaction explorer", bridgeTxn?.explorerUrl);
  //       await onSuccess();
  //     }
  //   } catch (error) {
  //     console.error("Transaction failed:", (error as Error)?.message);
  //     if (!(error as Error)?.message?.includes("User rejected the request")) {
  //       setTxError((error as Error)?.message || "Transaction failed");
  //     }
  //     setIsDialogOpen(false);
  //   } finally {
  //     setLoading(false);
  //     setStartTxn(false);
  //     processingRef.current = false;
  //     if (timerRef.current) {
  //       clearInterval(timerRef.current);
  //       timerRef.current = null;
  //     }
  //   }
  // };

  const handleTransaction = async () => {
    if (
      !inputs?.amount ||
      !inputs?.recipient ||
      !inputs?.chain ||
      !inputs?.token
    ) {
      console.error("Missing required inputs");
      return;
    }
    setLoading(true);
    setTxError(null);
    try {
      if (inputs?.recipient !== connectedAddress) {
        // Transfer
        const transferTxn = await nexusSDK?.bridgeAndTransfer(
          {
            token: inputs?.token,
            amount: inputs?.amount,
            toChainId: inputs?.chain,
            recipient: inputs?.recipient,
          },
          {
            onEvent: (event) => {
              if (event.name === NEXUS_EVENTS.STEPS_LIST) {
                const list = Array.isArray(event.args) ? event.args : [];
                setSteps((prev) => {
                  const completedTypes = new Set(
                    prev
                      .filter((s) => s.completed)
                      .map((s) => s.step?.typeID ?? "")
                  );
                  return list.map((step, index) => ({
                    id: index,
                    completed: completedTypes.has(step?.typeID ?? ""),
                    step,
                  }));
                });
              }
              if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
                const step = event.args;
                setSteps((prev) =>
                  prev.map((s) =>
                    s?.step?.typeID === step?.typeID
                      ? { ...s, completed: true }
                      : s
                  )
                );
              }
            },
          }
        );
        if (!transferTxn) {
          throw new Error("Transaction rejected by user");
        }
        if (transferTxn) {
          setLastExplorerUrl(transferTxn.explorerUrl);
          await onSuccess();
        }
        return;
      }
      // Bridge
      const bridgeTxn = await nexusSDK?.bridge(
        {
          token: inputs?.token,
          amount: inputs?.amount,
          toChainId: inputs?.chain,
        },
        {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.STEPS_LIST) {
              const list = Array.isArray(event.args) ? event.args : [];
              setSteps((prev) => {
                const completedTypes = new Set(
                  prev
                    .filter((s) => s.completed)
                    .map((s) => s.step?.typeID ?? "")
                );
                return list.map((step, index) => ({
                  id: index,
                  completed: completedTypes.has(step?.typeID ?? ""),
                  step,
                }));
              });
            }
            if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              const step = event.args;
              setSteps((prev) =>
                prev.map((s) =>
                  s.step && s.step.typeID === step?.typeID
                    ? { ...s, completed: true }
                    : s
                )
              );
            }
          },
        }
      );
      if (!bridgeTxn) {
        throw new Error("Transaction rejected by user");
      }
      if (bridgeTxn) {
        setLastExplorerUrl(bridgeTxn.explorerUrl);
        await onSuccess();
      }
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      setStartTxn(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.find((bal) => bal?.symbol === inputs?.token);
  }, [unifiedBalance, inputs?.token]);

  const refreshIntent = useCallback(async () => {
    setRefreshing(true);
    try {
      await intent?.refresh([]);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [intent]);

  const reset = () => {
    intent?.deny();
    setIntent(null);
    setAllowance(null);
    setInputs({
      chain: config.chainId as SUPPORTED_CHAINS_IDS,
      token: config.nexusPrimaryToken as SUPPORTED_TOKENS,
      amount: undefined,
      recipient: connectedAddress,
    });
    setStartTxn(false);
    setRefreshing(false);
  };

  const startTransaction = () => {
    // Reset timer for a fresh run
    setTimer(0);
    setStartTxn(true);
    intent?.allow();
    setIsDialogOpen(true);
    setTxError(null);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (intent) {
      interval = setInterval(refreshIntent, 5000);
    }
    return () => {
      clearInterval(interval);
    };
  }, [intent, refreshIntent]);

  useEffect(() => {
    if (startTxn) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 0.1);
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTxn]);

  useEffect(() => {
    if (intent && !commitLockRef.current) {
      intent.deny();
      setIntent(null);
    }
  }, [inputs]);

  useEffect(() => {
    if (
      intent ||
      loading ||
      !areInputsValid ||
      txError ||
      commitLockRef.current
    )
      return;
    const timeout = setTimeout(() => {
      void handleTransaction();
    }, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, areInputsValid, intent, loading, txError, commitLockRef]);

  // Stop timer when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStartTxn(false);
    }
  }, [isDialogOpen]);

  // Dismiss error upon any input edit to allow re-attempt
  useEffect(() => {
    if (txError) {
      setTxError(null);
    }
  }, [inputs, txError]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStartTxn(false);
  };
  const commitAmount = async () => {
    if (commitLockRef.current) return;
    if (intent || loading || txError || !areInputsValid) return;
    commitLockRef.current = true;
    try {
      await handleTransaction();
    } finally {
      commitLockRef.current = false;
    }
  };

  return {
    inputs,
    setInputs,
    timer,
    setIsDialogOpen,
    setTxError,
    refreshing,
    isDialogOpen,
    txError,
    handleTransaction,
    reset,
    filteredUnifiedBalance,
    startTransaction,
    stopTimer,
    commitAmount,
    lastExplorerUrl,
    steps,
    loading,
  };
};

export default useBridge;
