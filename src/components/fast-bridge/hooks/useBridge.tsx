import {
  NEXUS_EVENTS,
  NexusSDK,
  TOKEN_METADATA,
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
  connectedAddress: Address,
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  }
): FastBridgeState => {
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
    buildInitialInputs(connectedAddress, prefill)
  );

  const [timer, setTimer] = useState(0);
  const [startTxn, setStartTxn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
  const explorerUrlRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const commitLockRef = useRef<boolean>(false);
  const inputsRef = useRef<FastBridgeState>(inputs);
  const denyingDueToInvalidInputRef = useRef<boolean>(false);
  const intentRef = useRef(intent);
  const successDataRef = useRef<{
    sources: any[];
    destination: any;
    token: any;
    fees: any;
    explorerUrl?: string;
  } | null>(null);
  const [steps, setSteps] = useState<
    Array<{ id: number; completed: boolean; step: BridgeStepType }>
  >([]);
  
  // Keep intentRef in sync with intent
  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    // More robust amount validation - check that it's a valid number > 0
    const amountValue = inputs?.amount?.trim();
    const parsedAmount = amountValue ? Number.parseFloat(amountValue) : 0;
    const hasAmount = Boolean(amountValue) && !Number.isNaN(parsedAmount) && parsedAmount > 0;
    const hasValidrecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidrecipient;
  }, [inputs]);

  const onSuccess = useCallback(async () => {
    // Intent data should already be captured in startTransaction before this is called
    // But DON'T clear intent yet - wait until completion step is detected
    // This ensures the intent data is still available when STEP_COMPLETE fires
    
    // Close dialog and stop timer on success
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStartTxn(false);
    // DON'T clear intent here - wait for completion step
    // setIntent(null);
    setAllowance(null);
    setRefreshing(false);

    await fetchUnifiedBalance();
    onComplete?.();

    // Reset inputs after balance fetch, but preserve recipient address
    setInputs((prev) => {
      const initialInputs = buildInitialInputs(connectedAddress, prefill);
      return {
        ...initialInputs,
        recipient: prev?.recipient ?? initialInputs.recipient, // Keep current recipient if it exists
      };
    });
  }, [
    connectedAddress,
    setIntent,
    setAllowance,
    fetchUnifiedBalance,
    network,
    prefill,
    onComplete,
  ]);

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

  const handleTransaction = useCallback(async () => {
    // Starting a new intent fetch/transaction - reset any previous progress steps
    setSteps([]);
    
    // Intent data should already be captured in startTransaction
    // This is just a fallback in case it wasn't captured earlier
    if (!successDataRef.current) {
      const currentIntent = intentRef.current;
      if (currentIntent?.intent) {
        successDataRef.current = {
          sources: currentIntent.intent.sources || [],
          destination: currentIntent.intent.destination || null,
          token: currentIntent.intent.token || null,
          fees: currentIntent.intent.fees || null,
        };
      }
    }
    // Use ref to get the latest inputs value to avoid stale closures
    const currentInputs = inputsRef.current;
      if (
      !currentInputs?.amount ||
      !currentInputs?.recipient ||
      !currentInputs?.chain ||
      !currentInputs?.token ||
      commitLockRef.current
    ) {
      return;
    }
    commitLockRef.current = true;
    setLoading(true);
    setTxError(null);
    try {
      // Ensure we capture intent data before starting bridge
      if (intent?.intent && !successDataRef.current) {
        successDataRef.current = {
          sources: intent.intent.sources || [],
          destination: intent.intent.destination,
          token: intent.intent.token,
          fees: intent.intent.fees,
        };
      }

      // Bridge
      const bridgeTxn = await nexusSDK?.bridge(
        {
          token: currentInputs?.token,
          amount: nexusSDK.convertTokenReadableAmountToBigInt(currentInputs?.amount ?? "0", currentInputs?.token, currentInputs?.chain),
          toChainId: currentInputs?.chain,
          recipient: currentInputs?.recipient,
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
                const stepType = step?.type as unknown as string;
                
                // Check if this is a completion step and ensure we have intent data
                if ((stepType === "INTENT_FULFILLED" || stepType === "TRANSACTION_CONFIRMED")) {
                  // Try to capture intent data - check multiple sources
                  if (!successDataRef.current) {
                    // First try: from current intent (if still available)
                    if (intent?.intent) {
                      successDataRef.current = {
                        sources: intent.intent.sources || [],
                        destination: intent.intent.destination,
                        token: intent.intent.token,
                        fees: intent.intent.fees,
                      };
                    } 
                    // Fallback: use inputs to reconstruct basic info (won't have full details)
                    else if (currentInputs) {
                      successDataRef.current = {
                        sources: [],
                        destination: { chainName: "Unknown", amount: "0" },
                        token: { symbol: currentInputs.token || "Unknown" },
                        fees: { total: "0" },
                      };
                    }
                  }
                  
                  // Ensure explorerUrl is preserved/updated if available
                  // Check all possible sources and use the first available one
                  if (successDataRef.current) {
                    let url = successDataRef.current.explorerUrl;
                    if (!url || url.trim() === "") {
                      url = explorerUrlRef.current;
                    }
                    if (!url || url.trim() === "") {
                      url = lastExplorerUrl;
                    }
                    if (url && url.trim() !== "") {
                      successDataRef.current.explorerUrl = url;
                      // Also update the refs for consistency
                      explorerUrlRef.current = url;
                      setLastExplorerUrl(url);
                    }
                  }
                  
                  // Force a re-render by updating steps (this will trigger the toast check)
                  setSteps((prev) => {
                    const updated = prev.map((s) =>
                      s.step && s.step.typeID === step?.typeID
                        ? { ...s, completed: true }
                        : s
                    );
                    
                    // Clear intent now that we've captured the data
                    if (intent) {
                      setIntent(null);
                    }
                    
                    return updated;
                  });
                } else {
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.step && s.step.typeID === step?.typeID
                        ? { ...s, completed: true }
                        : s
                    )
                  );
                }
              }
            },
        }
      );
      if (!bridgeTxn) {
        throw new Error("Transaction rejected by user");
      }
      if (bridgeTxn) {
        // Debug: Log what bridgeTxn contains
        console.log("bridgeTxn object:", bridgeTxn);
        console.log("bridgeTxn.explorerUrl:", (bridgeTxn as any).explorerUrl);
        console.log("bridgeTxn keys:", Object.keys(bridgeTxn || {}));
        
        const explorerUrl = (bridgeTxn as any).explorerUrl || "";
        // Always set the URL if available, even if empty string
        setLastExplorerUrl(explorerUrl);
        explorerUrlRef.current = explorerUrl;
        
        // Also store in successDataRef for toast (ensure it exists first)
        if (!successDataRef.current) {
          // Create a minimal ref if it doesn't exist yet
          successDataRef.current = {
            sources: [],
            destination: null,
            token: null,
            fees: null,
          };
        }
        // Store explorerUrl in successDataRef - always update it here since this is after bridgeTxn resolves
        successDataRef.current.explorerUrl = explorerUrl || undefined;
        
        console.log("Setting explorerUrl in successDataRef:", explorerUrl);
        console.log("successDataRef.current after setting:", successDataRef.current);
        
        await onSuccess();
      }
      // Don't set loading to false here - wait for intent to be populated
      // Loading will be cleared when intent?.intent becomes available
    } catch (error) {
      // Don't set error if we're denying due to invalid input (user is just editing)
      if (denyingDueToInvalidInputRef.current) {
        setTxError(null);
        setIsDialogOpen(false);
        setLoading(false);
        return;
      }
      const { message } = handleNexusError(error);
      // Don't show "User rejected" errors when denying due to invalid input
      if (message && message.includes("User rejected") && denyingDueToInvalidInputRef.current) {
        setTxError(null);
      } else {
        setTxError(message);
      }
      setIsDialogOpen(false);
      setLoading(false);
    } finally {
      setStartTxn(false);
      commitLockRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [connectedAddress, nexusSDK, onSuccess, handleNexusError]);

  // Keep inputsRef in sync with inputs state
  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.find((bal) => bal?.symbol === inputs?.token);
  }, [unifiedBalance, inputs?.token]);

  // Calculate adjusted balance (unified balance minus balance on destination chain)
  const adjustedBalance = useMemo(() => {
    if (!filteredUnifiedBalance?.balance || !inputs?.chain) {
      return "0";
    }

    // Find the balance already on the destination chain
    let balanceOnDestinationChain = "0";
    if (filteredUnifiedBalance?.breakdown) {
      const destinationBalance = filteredUnifiedBalance.breakdown.find(
        (balance) => balance.chain.id === inputs.chain
      );
      if (destinationBalance) {
        balanceOnDestinationChain = destinationBalance.balance || "0";
      }
    }

    // Calculate unified balance minus balance on destination chain
    const unifiedBal = Number.parseFloat(filteredUnifiedBalance.balance || "0");
    const destBal = Number.parseFloat(balanceOnDestinationChain);
    const adjusted = Math.max(0, unifiedBal - destBal);

    return adjusted.toString();
  }, [filteredUnifiedBalance, inputs?.chain]);

  const refreshIntent = useCallback(async () => {
    setRefreshing(true);
    try {
      await intent?.refresh([]);
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  }, [intent]);

  const reset = useCallback(() => {
    intent?.deny();
    setIntent(null);
    setAllowance(null);
    // Preserve current recipient when resetting (don't reset to connectedAddress)
    setInputs((prev) => {
      const initialInputs = buildInitialInputs(connectedAddress, prefill);
      return {
        ...initialInputs,
        recipient: prev?.recipient ?? initialInputs.recipient, // Keep current recipient if it exists
      };
    });
    setStartTxn(false);
    setRefreshing(false);
    // Reset steps when form is reset
    setSteps([]);
  }, [connectedAddress, prefill, intent]);

  const startTransaction = () => {
    // Capture intent data IMMEDIATELY when user clicks Accept (before anything else)
    // This is the earliest and most reliable point to capture the data
    if (intent?.intent) {
      successDataRef.current = {
        sources: intent.intent.sources || [],
        destination: intent.intent.destination || null,
        token: intent.intent.token || null,
        fees: intent.intent.fees || null,
      };
    }
    
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
    // Deny intent only when user edits inputs; avoid denying on intent updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (!intent) return;
    // Reset commit lock when inputs change to allow new intent to be fetched
    if (commitLockRef.current) {
      commitLockRef.current = false;
    }
    // Allow intent to be denied even if loading, so user can edit inputs at any time
    // Only prevent denial if we're actually submitting a transaction (startTxn is true)
    if (loading && startTxn) return;
    // Reset loading if we're just fetching an intent (not submitting)
    if (loading && !startTxn) {
      setLoading(false);
    }
    
    // Set flag to ignore errors when denying due to input changes
    // We always deny silently when inputs change (user is editing, not rejecting)
    denyingDueToInvalidInputRef.current = true;
    
    // Clear any existing errors when inputs change (user is editing, not rejecting)
    setTxError(null);
    
    try {
      intent.deny();
    } catch (error) {
      // Silently ignore errors when denying due to input changes
      // This is normal behavior when user edits the form
    }
    setIntent(null);
    
    // Reset flag after a short delay to allow any async error callbacks to be ignored
    setTimeout(() => {
      denyingDueToInvalidInputRef.current = false;
    }, 100);
  }, [inputs, startTxn]);

  // Clear loading state when intent details become fully available
  // Check for all required properties to ensure intent is complete
  useEffect(() => {
    if (loading && intent?.intent) {
      // Verify that intent has all the necessary data before clearing loading
      const hasDestination = intent.intent.destination?.amount && intent.intent.destination?.chainName;
      const hasSources = intent.intent.sources && intent.intent.sources.length > 0;
      const hasFees = intent.intent.fees?.total;
      
      // Only clear loading if all required data is present
      if (hasDestination && hasSources && hasFees) {
        setLoading(false);
      }
    }
  }, [loading, intent?.intent]);

  // Get bridge limit based on token type (only enforced in testnet)
  const getBridgeLimit = useCallback((tokenSymbol?: string): number => {
    // Only enforce limits in testnet
    if (network !== "testnet") return Infinity;
    
    if (!tokenSymbol) return Infinity;
    const upperSymbol = tokenSymbol.toUpperCase();
    if (upperSymbol === "ETH") return 0.1;
    if (upperSymbol === "USDC" || upperSymbol === "USDT") return 200;
    return Infinity; // No limit for other tokens
  }, [network]);

  useEffect(() => {
    // First check amount validity - this must happen before areInputsValid check
    // to prevent fetching intent for "0.", "0", etc.
    if (inputs?.amount) {
      const amountStr = inputs.amount.trim();
      // Don't proceed if amount is empty or just whitespace
      if (!amountStr) {
        return;
      }
      
      const amount = Number.parseFloat(amountStr);
      // Don't proceed if amount is zero, negative, or invalid (catches "0.", "0", "0.0", etc.)
      if (Number.isNaN(amount) || amount <= 0) {
        return;
      }
      
      // Check if amount exceeds bridge limit
      if (filteredUnifiedBalance) {
        const limit = getBridgeLimit(filteredUnifiedBalance.symbol);
        if (amount > limit) {
          // Don't fetch intent if amount exceeds bridge limit
          return;
        }
      }
      
      // Check if amount exceeds adjusted balance before fetching intent
      if (filteredUnifiedBalance) {
        const adjusted = Number.parseFloat(adjustedBalance || "0");
        if (amount > adjusted) {
          // Don't fetch intent if amount exceeds available balance
          return;
        }
      }
    }
    
    // Now check other conditions
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
  }, [inputs, areInputsValid, intent, loading, txError, handleTransaction, adjustedBalance, filteredUnifiedBalance, getBridgeLimit]);

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
  }, [inputs]);
  
  // Also clear error when amount becomes invalid (0, 0., etc.) - runs after inputs change
  useEffect(() => {
    // Check if amount is invalid
    const isAmountInvalid = inputs?.amount ? (() => {
      const amountStr = inputs.amount?.trim();
      if (!amountStr) return true;
      const amount = Number.parseFloat(amountStr);
      return Number.isNaN(amount) || amount <= 0;
    })() : false;
    
    // Clear error if amount is invalid (user is just editing, not rejecting)
    if (isAmountInvalid && txError) {
      setTxError(null);
    }
  }, [inputs?.amount, txError]);

  // Clear amount field when steps start (transaction has been accepted)
  const hasClearedAmountRef = useRef<boolean>(false);
  useEffect(() => {
    // When steps appear and dialog is open, clear the amount field
    if (steps.length > 0 && isDialogOpen && !hasClearedAmountRef.current) {
      setInputs((prev) => ({ ...prev, amount: undefined }));
      hasClearedAmountRef.current = true;
    }
    // Reset the flag when dialog closes or steps are cleared
    if ((!isDialogOpen || steps.length === 0) && hasClearedAmountRef.current) {
      hasClearedAmountRef.current = false;
    }
  }, [steps.length, isDialogOpen]);

  // Reset form when amount becomes empty
  const prevAmountRef = useRef<string | undefined>(inputs?.amount);
  useEffect(() => {
    const prevAmount = prevAmountRef.current;
    const currentAmount = inputs?.amount;
    
    // If amount was previously set (not undefined/empty) and is now empty, reset the form
    const wasNonEmpty = prevAmount && prevAmount.trim() !== "";
    const isEmpty = !currentAmount || currentAmount.trim() === "";
    
    if (wasNonEmpty && isEmpty) {
      // If steps are active (transaction in progress), just clear intent details without denying
      if (steps.length > 0) {
        setIntent(null);
        setAllowance(null);
        // Don't deny intent or reset inputs fully - let transaction continue
        prevAmountRef.current = undefined;
      } else {
        // Normal reset when no transaction is in progress
        reset();
        // Update ref to the reset value to prevent infinite loop
        const resetInputs = buildInitialInputs(connectedAddress, prefill);
        prevAmountRef.current = resetInputs.amount;
      }
    } else {
      prevAmountRef.current = currentAmount;
    }
  }, [inputs?.amount, reset, connectedAddress, prefill, steps.length]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStartTxn(false);
  }, []);
  const commitAmount = useCallback(async () => {
    if (intent || loading || txError || !areInputsValid) return;
    
    // Validate amount before proceeding (same checks as in useEffect)
    if (inputs?.amount) {
      const amountStr = inputs.amount.trim();
      if (!amountStr) return;
      
      const amount = Number.parseFloat(amountStr);
      if (Number.isNaN(amount) || amount <= 0) return;
      
      // Check if amount exceeds bridge limit
      if (filteredUnifiedBalance) {
        const limit = getBridgeLimit(filteredUnifiedBalance.symbol);
        if (amount > limit) return;
      }
      
      // Check if amount exceeds adjusted balance
      if (filteredUnifiedBalance) {
        const adjusted = Number.parseFloat(adjustedBalance || "0");
        if (amount > adjusted) return;
      }
    }
    
    await handleTransaction();
  }, [intent, loading, txError, areInputsValid, handleTransaction, inputs?.amount, filteredUnifiedBalance, adjustedBalance, getBridgeLimit]);

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
    successDataRef,
    explorerUrlRef,
  };
};

export default useBridge;
