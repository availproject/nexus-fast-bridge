import { type FC, useEffect, useRef, useMemo } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { type UserAsset } from "@avail-project/nexus-core";
import { useNexus } from "../../nexus/NexusProvider";
import { type FastBridgeState } from "../hooks/useBridge";

interface AmountInputProps {
  amount?: string;
  onChange: (value: string) => void;
  unifiedBalance?: UserAsset;
  onCommit?: (value: string) => void;
  disabled?: boolean;
  inputs: FastBridgeState;
}

const AmountInput: FC<AmountInputProps> = ({
  amount,
  onChange,
  unifiedBalance,
  onCommit,
  disabled,
  inputs,
}) => {
  const { nexusSDK } = useNexus();
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wasFocusedRef = useRef<boolean>(false);
  const cursorPositionRef = useRef<number | null>(null);
  const prevDisabledRef = useRef<boolean>(disabled ?? false);
  const shouldRestoreFocusRef = useRef<boolean>(false);
  const restoreFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate adjusted balance (unified balance minus balance on destination chain)
  const adjustedBalance = useMemo(() => {
    if (!unifiedBalance?.balance || !inputs?.chain) {
      return unifiedBalance?.balance || "0";
    }

    // Find the balance already on the destination chain
    let balanceOnDestinationChain = "0";
    if (unifiedBalance?.breakdown) {
      const destinationBalance = unifiedBalance.breakdown.find(
        (balance) => balance.chain.id === inputs.chain
      );
      if (destinationBalance) {
        balanceOnDestinationChain = destinationBalance.balance || "0";
      }
    }

    // Calculate unified balance minus balance on destination chain
    const unifiedBal = Number.parseFloat(unifiedBalance.balance || "0");
    const destBal = Number.parseFloat(balanceOnDestinationChain);
    const adjusted = Math.max(0, unifiedBal - destBal);

    return adjusted.toFixed(6);
  }, [unifiedBalance, inputs?.chain]);

  const scheduleCommit = (val: string) => {
    if (!onCommit || disabled) return;
    
    // Don't schedule commit for invalid amounts (0, 0., etc.)
    const trimmedVal = val.trim();
    if (trimmedVal) {
      const parsedAmount = Number.parseFloat(trimmedVal);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        // Clear any pending commit for invalid amounts
        if (commitTimerRef.current) {
          clearTimeout(commitTimerRef.current);
          commitTimerRef.current = null;
        }
        return;
      }
    }
    
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      onCommit(val);
    }, 800);
  };

  const onMaxClick = async () => {
    if (!nexusSDK || !inputs) return;
    const maxBalAvailable = await nexusSDK?.calculateMaxForBridge({
      token: inputs?.token,
      toChainId: inputs?.chain,
      recipient: inputs?.recipient,
    });
    if (!maxBalAvailable) return;
    onChange(maxBalAvailable.amount);
    onCommit?.(maxBalAvailable.amount);
  };

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
    };
  }, []);

  // Preserve focus when disabled state changes (e.g., during intent refresh)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      prevDisabledRef.current = disabled ?? false;
      return;
    }

    const wasDisabled = prevDisabledRef.current;
    const isDisabled = disabled ?? false;

    // Store focus state and cursor position when input is about to become disabled
    if (wasDisabled === false && isDisabled === true && document.activeElement === input) {
      wasFocusedRef.current = true;
      cursorPositionRef.current = input.selectionStart;
      shouldRestoreFocusRef.current = true;
    }

    // Restore focus when input becomes enabled again after being disabled
    if (wasDisabled === true && isDisabled === false && shouldRestoreFocusRef.current) {
      // Clear any existing restore timeout
      if (restoreFocusTimeoutRef.current) {
        clearTimeout(restoreFocusTimeoutRef.current);
      }
      
      // Use requestAnimationFrame to ensure DOM is updated after disabled state changes
      restoreFocusTimeoutRef.current = setTimeout(() => {
        if (input && document.activeElement !== input && shouldRestoreFocusRef.current) {
          input.focus();
          // Restore cursor position if we have it
          if (cursorPositionRef.current !== null) {
            // Adjust cursor position if input value changed
            const currentLength = input.value.length;
            const savedPosition = cursorPositionRef.current;
            const newPosition = Math.min(savedPosition, currentLength);
            input.setSelectionRange(newPosition, newPosition);
          }
        }
        restoreFocusTimeoutRef.current = null;
      }, 10);
    }

    prevDisabledRef.current = isDisabled;
    
    return () => {
      if (restoreFocusTimeoutRef.current) {
        clearTimeout(restoreFocusTimeoutRef.current);
        restoreFocusTimeoutRef.current = null;
      }
    };
  }, [disabled]);

  // Also check and restore focus after any render if we should restore it
  useEffect(() => {
    const input = inputRef.current;
    if (!input || !shouldRestoreFocusRef.current) return;
    
    // Check if focus was lost unexpectedly (not disabled, but not focused)
    if (!disabled && document.activeElement !== input) {
      // Use a small delay to allow other effects to complete
      const timeoutId = setTimeout(() => {
        if (input && document.activeElement !== input && shouldRestoreFocusRef.current && !disabled) {
          input.focus();
          if (cursorPositionRef.current !== null) {
            const currentLength = input.value.length;
            const savedPosition = cursorPositionRef.current;
            const newPosition = Math.min(savedPosition, currentLength);
            input.setSelectionRange(newPosition, newPosition);
          }
        }
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  });

  return (
    <div className="w-full flex border border-border rounded-lg gap-y-2">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={amount ?? ""}
        placeholder="Enter Amount"
        onChange={(e) => {
          let next = e.target.value.replaceAll(/[^0-9.]/g, "");
          const parts = next.split(".");
          if (parts.length > 2) next = parts[0] + "." + parts.slice(1).join("");
          if (next === ".") next = "0.";
          onChange(next);
          scheduleCommit(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (commitTimerRef.current) {
              clearTimeout(commitTimerRef.current);
              commitTimerRef.current = null;
            }
            onCommit?.(amount ?? "");
          }
        }}
        onFocus={(e) => {
          // Store cursor position on focus
          cursorPositionRef.current = e.target.selectionStart;
          // If we're restoring focus, keep the flag until we're sure it's restored
          if (!shouldRestoreFocusRef.current) {
            wasFocusedRef.current = true;
          }
        }}
        onBlur={(e) => {
          // Only clear focus tracking if input is not disabled (user intentionally blurred)
          // If disabled, we want to restore focus when it becomes enabled
          if (!disabled) {
            // Check if blur was due to disabled state or user action
            // If the next active element is not another input/button, it's likely user action
            const nextActive = e.relatedTarget;
            if (!nextActive || (nextActive.tagName !== 'INPUT' && nextActive.tagName !== 'BUTTON')) {
              shouldRestoreFocusRef.current = false;
              wasFocusedRef.current = false;
              cursorPositionRef.current = null;
            }
          }
        }}
        className="w-full border-none bg-transparent rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none py-6 px-3"
        aria-invalid={Boolean(amount) && Number.isNaN(Number(amount))}
        disabled={disabled}
      />
      <div className="flex items-center justify-end-safe gap-x-4 w-fit px-2 border-l border-border">
        <div className="flex items-center gap-x-3 min-w-max">
          {unifiedBalance && (
            <p className="text-base font-medium">
              {adjustedBalance}{" "}
              {unifiedBalance?.symbol}
            </p>
          )}
          <Button
            size={"sm"}
            variant={"ghost"}
            onClick={onMaxClick}
            className="px-0"
            disabled={disabled}
          >
            Max
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AmountInput;
