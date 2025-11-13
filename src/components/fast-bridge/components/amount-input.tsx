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

  return (
    <div className="w-full flex border border-border rounded-lg gap-y-2">
      <Input
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
        className="w-full border-none bg-transparent rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none py-6 px-3"
        aria-invalid={Boolean(amount) && Number.isNaN(Number(amount))}
        disabled={disabled}
      />
      <div className="flex items-center justify-end-safe gap-x-4 w-fit px-2 border-l border-border">
        <div className="flex items-center gap-x-3 min-w-max">
          {unifiedBalance && (
            <p className="text-base font-light">
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
