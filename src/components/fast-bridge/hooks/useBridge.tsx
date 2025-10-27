import {
  NexusSDK,
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

interface FastBridgeState {
  chain: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
  amount?: string;
  recipient?: `0x${string}`;
}

interface UseBridgeProps {
  connectedAddress: Address;
  nexusSDK: NexusSDK | null;
  intent: OnIntentHookData | null;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  unifiedBalance: UserAsset[] | null;
}

const useBridge = ({
  connectedAddress,
  nexusSDK,
  intent,
  setIntent,
  setAllowance,
  unifiedBalance,
}: UseBridgeProps) => {
  const { fetchUnifiedBalance } = useNexus();
  const [inputs, setInputs] = useState<FastBridgeState>({
    chain: config.chainId as SUPPORTED_CHAINS_IDS,
    token: config.nexusPrimaryToken as SUPPORTED_TOKENS,
    amount: undefined,
    recipient: connectedAddress,
  });

  const [timer, setTimer] = useState(0);
  const [startTxn, setStartTxn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidRecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidRecipient;
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
  }, [connectedAddress, setIntent, setAllowance, fetchUnifiedBalance]);

  const handleTransaction = async () => {
    if (processingRef.current) return;
    if (
      !inputs?.amount ||
      !inputs?.recipient ||
      !inputs?.chain ||
      !inputs?.token
    ) {
      console.error("Missing required inputs");
      return;
    }
    processingRef.current = true;
    setLoading(true);
    setTxError(null);
    try {
      if (inputs?.recipient !== connectedAddress) {
        // Transfer
        const transferTxn = await nexusSDK?.transfer({
          token: inputs?.token,
          amount: inputs?.amount,
          chainId: inputs?.chain,
          recipient: inputs?.recipient,
        });
        if (!transferTxn?.success) {
          throw new Error(transferTxn?.error || "Transaction rejected by user");
        }
        if (transferTxn?.success) {
          console.log("Transfer transaction successful");
          console.log(
            "Transfer transaction explorer",
            transferTxn?.explorerUrl
          );
          await onSuccess();
        }
        return;
      }
      // Bridge
      const bridgeTxn = await nexusSDK?.bridge({
        token: inputs?.token,
        amount: inputs?.amount,
        chainId: inputs?.chain,
      });
      if (!bridgeTxn?.success) {
        throw new Error(bridgeTxn?.error || "Transaction rejected by user");
      }
      if (bridgeTxn?.success) {
        console.log("Bridge transaction successful");
        console.log("Bridge transaction explorer", bridgeTxn?.explorerUrl);
        await onSuccess();
      }
    } catch (error) {
      console.error("Transaction failed:", (error as Error)?.message);
      if (!(error as Error)?.message?.includes("User rejected the request")) {
        setTxError((error as Error)?.message || "Transaction failed");
      }
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      setStartTxn(false);
      processingRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.filter((bal) => bal?.symbol === inputs?.token)[0];
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
    if (intent && !processingRef.current) {
      intent.deny();
      setIntent(null);
    }
  }, [inputs, intent, setIntent]);

  useEffect(() => {
    if (intent || loading || !areInputsValid || txError || processingRef.current) return;
    const timeout = setTimeout(() => {
      void handleTransaction();
    }, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, areInputsValid, intent, loading, txError]);

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
  };
};

export default useBridge;
