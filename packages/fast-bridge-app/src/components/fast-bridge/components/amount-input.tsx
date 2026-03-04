import { SUPPORTED_CHAINS, type UserAsset } from "@avail-project/nexus-core";
import { chainFeatures } from "@fastbridge/runtime";
import { LoaderCircle } from "lucide-react";
import {
  type FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SHORT_CHAIN_NAME } from "../../common/utils/constant";
import {
  clampAmountToMax,
  normalizeMaxAmount,
} from "../../common/utils/transaction-flow";
import { useNexus } from "../../nexus/nexus-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import type { FastBridgeState } from "../hooks/use-bridge";

interface AmountInputProps {
  amount?: string;
  bridgableBalance?: UserAsset;
  disabled?: boolean;
  inputs: FastBridgeState;
  maxAmount?: string | number;
  maxAvailableAmount?: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  showBalanceDetails?: boolean;
}

const AmountInput: FC<AmountInputProps> = ({
  amount,
  onChange,
  bridgableBalance,
  onCommit,
  disabled,
  inputs,
  showBalanceDetails = true,
  maxAmount,
  maxAvailableAmount,
}) => {
  const { nexusSDK, loading } = useNexus();
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showBalanceDivider = showBalanceDetails && Boolean(bridgableBalance);
  const [maxVal, setMaxVal] = useState("0");
  const balanceSymbol =
    (bridgableBalance as { displaySymbol?: string } | undefined)
      ?.displaySymbol ?? bridgableBalance?.symbol;
  const normalizedMaxAmount = useMemo(
    () => normalizeMaxAmount(maxAmount),
    [maxAmount]
  );

  const applyMaxCap = useCallback(
    (value: string) => {
      if (!(nexusSDK && inputs?.token && inputs?.chain)) {
        return value;
      }
      return clampAmountToMax({
        amount: value,
        maxAmount: normalizedMaxAmount,
        nexusSDK,
        token: inputs.token,
        chainId: inputs.chain,
      });
    },
    [inputs?.chain, inputs?.token, nexusSDK, normalizedMaxAmount]
  );

  const scheduleCommit = (val: string) => {
    if (!onCommit || disabled) {
      return;
    }
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
    }
    commitTimerRef.current = setTimeout(() => {
      onCommit(val);
    }, 800);
  };

  const getMaxVal = useCallback(async () => {
    if (maxAvailableAmount !== undefined) {
      return applyMaxCap(maxAvailableAmount);
    }
    if (!(showBalanceDetails && nexusSDK && inputs)) {
      return;
    }
    const maxBalAvailable = await nexusSDK.calculateMaxForBridge({
      token: inputs.token,
      toChainId: inputs.chain,
      recipient: inputs.recipient,
    });
    if (!maxBalAvailable) {
      return;
    }
    return applyMaxCap(maxBalAvailable.amount);
  }, [applyMaxCap, inputs, maxAvailableAmount, nexusSDK, showBalanceDetails]);

  const onMaxClick = async () => {
    if (!showBalanceDetails) {
      return;
    }
    if (maxAvailableAmount !== undefined) {
      const capped = applyMaxCap(maxAvailableAmount);
      onChange(capped);
      onCommit?.(capped);
      return;
    }
    if (!(nexusSDK && inputs)) {
      return;
    }
    const maxBalAvailable = await nexusSDK.calculateMaxForBridge({
      token: inputs.token,
      toChainId: inputs.chain,
      recipient: inputs.recipient,
    });
    if (!maxBalAvailable) {
      return;
    }
    const capped = applyMaxCap(maxBalAvailable.amount);
    onChange(capped);
    onCommit?.(capped);
  };

  useEffect(() => {
    const initMaxVal = async () => {
      const value = await getMaxVal();
      setMaxVal(value ?? "0");
    };
    initMaxVal().catch((error) => {
      console.error("Failed to initialize max bridge amount:", error);
    });
  }, [getMaxVal]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-y-2 pb-2">
      <div className="flex w-full flex-col gap-y-2 rounded-lg border border-border sm:flex-row">
        <Input
          aria-invalid={Boolean(amount) && Number.isNaN(Number(amount))}
          className="h-12! w-full rounded-r-none border-none bg-transparent px-3 py-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={disabled}
          inputMode="decimal"
          onChange={(e) => {
            let next = e.target.value.replaceAll(/[^0-9.]/g, "");
            const parts = next.split(".");
            if (parts.length > 2) {
              next = `${parts[0]}.${parts.slice(1).join("")}`;
            }
            if (next === ".") {
              next = "0.";
            }
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
          placeholder="Enter Amount"
          type="text"
          value={amount ?? ""}
        />
        <div
          className={`justify-end-safe flex w-fit items-center gap-x-2 px-2 sm:gap-x-4 ${
            showBalanceDivider ? "border-border border-l" : ""
          }`}
        >
          {showBalanceDetails && bridgableBalance && (
            <p className="min-w-max font-medium text-base">
              {chainFeatures.amountInputUseCalculatedMaxHeader
                ? nexusSDK?.utils?.formatTokenBalance(maxVal, {
                    symbol: balanceSymbol,
                    decimals: bridgableBalance?.decimals,
                  })
                : nexusSDK?.utils?.formatTokenBalance(
                    bridgableBalance?.balance,
                    {
                      symbol: balanceSymbol,
                      decimals: bridgableBalance?.decimals,
                    }
                  )}
            </p>
          )}
          {showBalanceDetails && loading && !bridgableBalance && (
            <LoaderCircle className="size-4 animate-spin" />
          )}
          {showBalanceDetails && (
            <Button
              className="px-0 font-medium"
              disabled={disabled}
              onClick={onMaxClick}
              size={"sm"}
              variant={"ghost"}
            >
              MAX
            </Button>
          )}
        </div>
      </div>
      {showBalanceDetails && (
        <Accordion className="w-full" collapsible type="single">
          <AccordionItem value="balance-breakdown">
            <AccordionTrigger
              className="mt-2 w-fit cursor-pointer items-center justify-end gap-x-0.5 py-0 font-normal text-sm"
              hideChevron={false}
            >
              View Balance Breakdown
            </AccordionTrigger>
            <AccordionContent className="mt-4 rounded-lg bg-muted pb-0">
              <div className="space-y-1 py-2">
                {bridgableBalance?.breakdown.map((chain) => {
                  if (Number.parseFloat(chain.balance) === 0) {
                    return null;
                  }
                  if (
                    chainFeatures.hideMegaethSourceForUsdm &&
                    bridgableBalance.symbol === "USDM" &&
                    chain.chain.id === SUPPORTED_CHAINS.MEGAETH
                  ) {
                    return null;
                  }
                  const sourceBalanceSymbol = chain.symbol ?? balanceSymbol;
                  return (
                    <Fragment key={chain.chain.id}>
                      <div
                        className="flex items-center justify-between rounded-md px-2 py-1"
                        style={{
                          opacity:
                            chainFeatures.amountInputShowDestinationBadge &&
                            chain.chain.id === inputs.chain
                              ? 0.4
                              : 1,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6">
                            <img
                              alt={chain.chain.name}
                              className="rounded-full"
                              decoding="async"
                              height="20"
                              loading="lazy"
                              sizes="100%"
                              src={chain?.chain?.logo}
                              width="20"
                            />
                          </div>
                          <span className="hidden font-light text-sm sm:block">
                            {SHORT_CHAIN_NAME[chain.chain.id]}
                          </span>
                          {chainFeatures.amountInputShowDestinationBadge &&
                            chain.chain.id === inputs.chain && (
                              <div
                                className="rounded-[10px] px-2 py-1 font-semibold text-[10px] uppercase"
                                style={{ background: "rgba(0, 0, 0, 0.2)" }}
                              >
                                Destination
                              </div>
                            )}
                        </div>
                        <p className="text-right font-light text-sm">
                          {nexusSDK?.utils?.formatTokenBalance(chain.balance, {
                            symbol: sourceBalanceSymbol,
                            decimals: bridgableBalance?.decimals,
                          })}
                        </p>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};

export default AmountInput;
